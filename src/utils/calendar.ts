import { CARDS_DB } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';

// Format date to ICS format (YYYYMMDD or YYYYMMDDTHHMMSS)
const formatICSDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}T090000`;
};

// Format standard UTC timestamp for creation/updates (DTSTAMP)
const formatICSDateTimeUTC = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const downloadICSFile = (ownedCards: OwnedCardInstance[]) => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity//CC Benefits Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const now = new Date();

  ownedCards.forEach((cardInstance) => {
    // Retrieve the static card template to get its benefits
    const template = CARDS_DB.find((t) => t.id === cardInstance.templateId);
    if (!template) return;

    template.benefits.forEach((benefit) => {
      // Ensure unique UID per instance
      const uid = `${cardInstance.id}-${benefit.id}@cc-benefits-tracker`;
      const title = `💳 Use ${cardInstance.customName} - ${benefit.name}`;
      
      let rrule = '';
      let dtstart: Date;
      let description = `${benefit.description} (Value: $${benefit.value})`;

      if (benefit.resetPeriod === 'monthly') {
        // Start reminder on the 25th of the current/next month, recurring monthly
        dtstart = new Date(now.getFullYear(), now.getMonth(), 25);
        if (dtstart < now) {
          // If 25th of this month has already passed, start next month
          dtstart.setMonth(dtstart.getMonth() + 1);
        }
        rrule = 'RRULE:FREQ=MONTHLY';
      } else if (benefit.resetPeriod === 'semi-annual') {
        // Reminders on June 20th and Dec 20th
        dtstart = new Date(now.getFullYear(), now.getMonth() < 5 ? 5 : 11, 20);
        rrule = 'RRULE:FREQ=MONTHLY;INTERVAL=6';
      } else if (benefit.resetPeriod === 'annual-calendar') {
        // Dec 15th every year
        dtstart = new Date(now.getFullYear(), 11, 15);
        rrule = 'RRULE:FREQ=YEARLY';
      } else {
        // annual-anniversary
        const anniversaryMonth = parseInt(cardInstance.anniversaryMonth, 10); // 1-12
        
        // Reminder is set 10 days before the anniversary month ends
        dtstart = new Date(now.getFullYear(), anniversaryMonth - 1, 20);
        if (dtstart < now) {
          dtstart.setFullYear(dtstart.getFullYear() + 1);
        }
        rrule = 'RRULE:FREQ=YEARLY';
      }

      const dtstartStr = formatICSDate(dtstart);
      const dtend = new Date(dtstart.getTime() + 60 * 60 * 1000); // 1 hr duration
      const dtendStr = formatICSDate(dtend);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDateTimeUTC(new Date())}`,
        `DTSTART:${dtstartStr}`,
        `DTEND:${dtendStr}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        rrule,
        'END:VEVENT'
      );
    });
  });

  icsContent.push('END:VCALENDAR');

  // Create and download the file
  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'credit_card_benefits_reminders.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
