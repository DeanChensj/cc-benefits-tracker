import type { CardTemplate } from '../data/cards.db';

// Format date to ICS format (YYYYMMDD or YYYYMMDDTHHMMSS)
const formatICSDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}T090000`;
};

export const downloadICSFile = (ownedCards: CardTemplate[], cardAnniversaries: Record<string, string>) => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity//CC Benefits Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const now = new Date();

  ownedCards.forEach((card) => {
    card.benefits.forEach((benefit) => {
      const uid = `${card.id}-${benefit.id}@cc-benefits-tracker`;
      const title = `💳 Use ${card.name} - ${benefit.name}`;
      
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
        const anniversaryMonthStr = cardAnniversaries[card.id] || '01';
        const anniversaryMonth = parseInt(anniversaryMonthStr, 10); // 1-12
        
        // Reminder is set 10 days before the anniversary month ends
        // Anniversary month is indexed 1-12, so to set to the 20th of the anniversary month:
        dtstart = new Date(now.getFullYear(), anniversaryMonth - 1, 20);
        if (dtstart < now) {
          dtstart.setFullYear(dtstart.getFullYear() + 1);
        }
        rrule = 'RRULE:FREQ=YEARLY';
      }

      const dtstartStr = formatICSDate(dtstart);
      // End of event is 1 hour later
      const dtend = new Date(dtstart.getTime() + 60 * 60 * 1000);
      const dtendStr = formatICSDate(dtend);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDate(new Date())}Z`,
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
