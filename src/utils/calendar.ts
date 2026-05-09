import { CARDS_DB, AWARD_TEMPLATES } from '../data/cards.db';
import type { Benefit, LoyaltyAward } from '../data/cards.db';
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

export const downloadICSFile = (ownedCards: OwnedCardInstance[], loyaltyAwards?: LoyaltyAward[]) => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity//CC Benefits Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const now = new Date();

  ownedCards.forEach((cardInstance) => {
    let benefits: Benefit[] = [];

    if (cardInstance.templateId === 'custom') {
      benefits = cardInstance.customBenefits || [];
    } else {
      const template = CARDS_DB.find((t) => t.id === cardInstance.templateId);
      if (template) {
        benefits = template.benefits;
      }
    }

    benefits.forEach((benefit) => {
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
      } else if (benefit.resetPeriod === 'fixed') {
        const exp = new Date((benefit.expirationDate ? benefit.expirationDate + 'T00:00:00' : null) || now);
        // Set alert 10 days before expiration Date
        dtstart = new Date(exp.getTime() - 10 * 24 * 60 * 60 * 1000);
        rrule = '';
      } else {
        // annual-anniversary
        const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
        const annivMonth = openDate.getMonth(); // 0-11
        const annivDay = openDate.getDate(); // 1-31

        // Target anniversary date in the current calendar year
        const annivThisYear = new Date(now.getFullYear(), annivMonth, annivDay);
        dtstart = new Date(annivThisYear.getTime() - 10 * 24 * 60 * 60 * 1000);

        if (dtstart < now) {
          // If the reminder date this year has already passed, schedule for next year
          const annivNextYear = new Date(now.getFullYear() + 1, annivMonth, annivDay);
          dtstart = new Date(annivNextYear.getTime() - 10 * 24 * 60 * 60 * 1000);
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

  // Integrate standalone loyalty awards into active calendar events subscription cleanly
  (loyaltyAwards || []).forEach((award) => {
    if (award.usedQuantity === award.quantity || !award.expirationDate) return;

    const isCustom = award.templateId === 'custom';
    const info = isCustom ? {
      name: award.customName || 'Custom Voucher',
      brand: award.customBrand || 'Other',
      value: award.customValue || 0
    } : AWARD_TEMPLATES[award.templateId];

    const uid = `${award.id}@cc-benefits-tracker`;
    const title = `🎁 Expiring: ${info.name} (${award.quantity}x)`;
    const exp = new Date(award.expirationDate + 'T00:00:00');
    
    // Set alert 10 days before expiration date
    const dtstart = new Date(exp.getTime() - 10 * 24 * 60 * 60 * 1000);
    const dtstartStr = formatICSDate(dtstart);
    const dtend = new Date(dtstart.getTime() + 60 * 60 * 1000); // 1 hr duration
    const dtendStr = formatICSDate(dtend);
    
    const description = `${award.notes || 'Standalone card voucher.'} (Total value: $${info.value * award.quantity})`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDateTimeUTC(new Date())}`,
      `DTSTART:${dtstartStr}`,
      `DTEND:${dtendStr}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT'
    );
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
