import { findSyncFile, uploadSyncFile, downloadSyncFile } from './gdrive';
import type { OwnedCardInstance, CardStore, RemoteSyncData } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';
import type { LogEntry } from './logUtils';
import { deobfuscateKey } from './cryptoUtils';
import { getYearFromPlainKey } from './storeHelpers';
import type { ActiveBenefit } from '../hooks/useActiveBenefits';

interface GoogleCalendarResource {
  id: string;
  summary: string;
}

// Helper to push updates to Google Drive silently in the background with a 5-second debounce buffer
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export const syncPushToCloud = async (
  token: string | null,
  unusedCards?: OwnedCardInstance[],
  unusedLogs?: Record<string, LogEntry>
) => {
  // Silence ESLint no-unused-vars
  if (unusedCards || unusedLogs) { /* no-op */ }

  const activeToken = token || useCardStore.getState().gdriveToken;
  if (!activeToken) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    try {
      const storeState = useCardStore.getState();
      const fileId = await findSyncFile(activeToken);
      const uploadTime = storeState.walletLastModified || Date.now();
      
      await uploadSyncFile(activeToken, fileId, { 
        ownedCards: storeState.ownedCards, 
        logs: storeState.logs, 
        loyaltyAwards: storeState.loyaltyAwards,
        deletedCardIds: storeState.deletedCardIds || [],
        deletedAwardIds: storeState.deletedAwardIds || [],
        walletLastModified: uploadTime
      });

      // Update local lastSyncTimestamp to prevent false-positive conflicts
      useCardStore.setState({
        lastSyncTimestamp: uploadTime,
        lastSyncedTime: new Date().toLocaleTimeString(),
        syncStatus: 'synced'
      });
      console.log('☁️ [Cloud Sync] Reactively auto-committed fresh state successfully.');
    } catch (err) {
      console.error('Silent background cloud sync failed:', err);
    }
  }, 5000);
};

export const performGDriveSync = async (get: () => CardStore, set: (partial: Partial<CardStore>) => void) => {
  const { gdriveToken, ownedCards, loyaltyAwards, logs, walletLastModified, deletedCardIds, deletedAwardIds } = get();
  if (!gdriveToken) return;

  set({ syncStatus: 'syncing' });
  try {
    const fileId = await findSyncFile(gdriveToken);
    if (!fileId) {
      const dataToUpload = { 
        ownedCards, 
        loyaltyAwards,
        logs, 
        deletedCardIds: deletedCardIds || [],
        deletedAwardIds: deletedAwardIds || [],
        walletLastModified: walletLastModified || Date.now() 
      };
      await uploadSyncFile(gdriveToken, null, dataToUpload);
      set({ 
        syncStatus: 'synced', 
        lastSyncedTime: new Date().toLocaleTimeString() 
      });
    } else {
      const remoteData = (await downloadSyncFile(gdriveToken, fileId)) as RemoteSyncData;
      
      const remoteWalletTime = remoteData.walletLastModified || 0;
      const localWalletTime = walletLastModified || 0;
      const lastSync = get().lastSyncTimestamp || 0;

      // Symmetrical Equal Timestamp Shield: Skip conflicts if dual-device data is already identical
      if (localWalletTime === remoteWalletTime) {
        set({ 
          syncStatus: 'synced',
          lastSyncTimestamp: localWalletTime,
          lastSyncedTime: new Date().toLocaleTimeString()
        });
        return;
      }

      // Conflict Detection: Both sides modified since last sync
      if (localWalletTime > lastSync && remoteWalletTime > lastSync) {
        set({ 
          pendingRemoteData: remoteData,
          syncStatus: 'conflict'
        });
        return;
      }

      const remoteCards = remoteData.ownedCards || [];
      const remoteAwards = remoteData.loyaltyAwards || [];
      const remoteLogs = remoteData.logs || {};

      // 1. Merge Tombstone Deletion Trackers
      const localDeletedCards = deletedCardIds || [];
      const remoteDeletedCards = remoteData.deletedCardIds || [];
      const mergedDeletedCards = Array.from(new Set([...localDeletedCards, ...remoteDeletedCards]));

      const localDeletedAwards = deletedAwardIds || [];
      const remoteDeletedAwards = remoteData.deletedAwardIds || [];
      const mergedDeletedAwards = Array.from(new Set([...localDeletedAwards, ...remoteDeletedAwards]));

      // 2. Instance-level LWW ownedCards Merge (Tombstone Excluded)
      const cardMap = new Map<string, OwnedCardInstance>();
      remoteCards.forEach((c: OwnedCardInstance) => {
        if (!mergedDeletedCards.includes(c.id)) {
          cardMap.set(c.id, c);
        }
      });
      ownedCards.forEach((c: OwnedCardInstance) => {
        if (mergedDeletedCards.includes(c.id)) {
          cardMap.delete(c.id);
          return;
        }
        const existing = cardMap.get(c.id);
        if (!existing) {
          cardMap.set(c.id, c);
        } else {
          const localTime = c.lastModified || 0;
          const remoteTime = existing.lastModified || 0;
          if (localTime > remoteTime) {
            cardMap.set(c.id, c);
          }
        }
      });
      const mergedCards = Array.from(cardMap.values());

      // 3. Instance-level LWW loyaltyAwards Merge (Tombstone Excluded)
      const awardMap = new Map<string, LoyaltyAward>();
      remoteAwards.forEach((a: LoyaltyAward) => {
        if (!mergedDeletedAwards.includes(a.id)) {
          awardMap.set(a.id, a);
        }
      });
      loyaltyAwards.forEach((a: LoyaltyAward) => {
        if (mergedDeletedAwards.includes(a.id)) {
          awardMap.delete(a.id);
          return;
        }
        const existing = awardMap.get(a.id);
        if (!existing) {
          awardMap.set(a.id, a);
        } else {
          const localTime = a.lastModified || 0;
          const remoteTime = existing.lastModified || 0;
          if (localTime > remoteTime) {
            awardMap.set(a.id, a);
          }
        }
      });
      const mergedAwards = Array.from(awardMap.values());

      // 4. LogEntry-level LWW checklist merge
      const mergedLogs = { ...logs };
      const currentYear = new Date().getFullYear();

      Object.entries(remoteLogs).forEach(([key, val]) => {
        const remoteVal = val as LogEntry;
        const plainKey = deobfuscateKey(key);
        const logYear = getYearFromPlainKey(plainKey);
        if (logYear !== null && (currentYear - logYear > 1)) {
          return;
        }

        if (mergedLogs[key] === undefined) {
          mergedLogs[key] = remoteVal;
        } else {
          const localTime = mergedLogs[key].timestamp || 0;
          const remoteTime = remoteVal.timestamp || 0;
          if (remoteTime > localTime) {
            mergedLogs[key] = remoteVal;
          }
        }
      });

      const finalWalletTime = Math.max(localWalletTime, remoteWalletTime);
      const finalMergedData = { 
        ownedCards: mergedCards, 
        deletedCardIds: mergedDeletedCards,
        loyaltyAwards: mergedAwards,
        deletedAwardIds: mergedDeletedAwards,
        logs: mergedLogs, 
        walletLastModified: finalWalletTime 
      };
      await uploadSyncFile(gdriveToken, fileId, finalMergedData);

      set({
        ownedCards: mergedCards,
        deletedCardIds: mergedDeletedCards,
        loyaltyAwards: mergedAwards,
        deletedAwardIds: mergedDeletedAwards,
        logs: mergedLogs,
        walletLastModified: finalWalletTime,
        lastSyncTimestamp: finalWalletTime,
        syncStatus: 'synced',
        lastSyncedTime: new Date().toLocaleTimeString()
      });
    }
  } catch (err) {
    set({ syncStatus: 'error' });
    throw err;
  }
};

// =================================================================
// 📅 Google Calendar Direct REST API Integration Utilities
// =================================================================

// Helper to calculate next day for Google Calendar's exclusive all-day event end dates
const getCalendarNextDay = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

// Helper to dynamically find or create the dedicated PerkFolio Reminders calendar
export const findOrCreatePerkFolioCalendar = async (token: string): Promise<string> => {
  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!listRes.ok) throw new Error('Failed to query Google Calendar list.');
  const listData = await listRes.json();
  const calendars = listData.items || [];
  
  const targetSummary = '💳 PerkFolio Reminders';
  const existing = calendars.find((c: GoogleCalendarResource) => c.summary === targetSummary);
  if (existing) {
    return existing.id;
  }

  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: targetSummary,
      description: 'Dynamic credit card statement credits, quarterly rotating limits, and standalone vouchers reminders synchronized automatically by PerkFolio.cc',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
    })
  });
  
  if (!createRes.ok) throw new Error('Failed to create dedicated Google Calendar.');
  const newCal = await createRes.json();
  return newCal.id;
};

// Helper to perform highly-optimized dynamic delta synchronization for active benefits
export const syncGoogleCalendar = async (
  token: string,
  calendarId: string,
  activeBenefits: ActiveBenefit[],
  calendarEventIds: Record<string, string>,
  updateEventId: (logKey: string, eventId: string | null) => void
) => {
  const eventIds = { ...calendarEventIds };

  // 1. Incremental Sync: Create or Delete events based on active benefits
  for (const ab of activeBenefits) {
    if (!ab.benefit.expirationDate) continue;

    const logKey = ab.logKey;
    const existingEventId = eventIds[logKey];
    const isUsed = ab.isUsed;

    if (isUsed) {
      if (existingEventId) {
        try {
          const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingEventId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (delRes.ok || delRes.status === 404) {
            updateEventId(logKey, null);
            delete eventIds[logKey];
          }
        } catch (err) {
          console.error(`Failed to delete calendar event ${existingEventId} for ${logKey}:`, err);
        }
      }
    } else {
      if (!existingEventId) {
        try {
          const cardName = ab.cardInstance?.customName || 'Standalone Loyalty Award';
          const summary = `💳 [${cardName}] ${ab.benefit.name}`;
          const description = `PerkFolio dynamic credit card check-in alarm.\n\nBenefit: ${ab.benefit.name}\nValue: $${ab.benefit.value}\nReset Cycle: ${ab.benefit.resetPeriod}\nLocal Sync Fingerprint: ${logKey}\n\nResolve this benefit on: https://perkfolio.cc/`;
          
          const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              summary,
              description,
              start: { date: ab.benefit.expirationDate },
              end: { date: getCalendarNextDay(ab.benefit.expirationDate) },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'popup', minutes: 1440 },
                  { method: 'popup', minutes: 2880 }
                ]
              }
            })
          });
          
          if (createRes.ok) {
            const createdEvent = await createRes.json();
            updateEventId(logKey, createdEvent.id);
            eventIds[logKey] = createdEvent.id;
          }
        } catch (err) {
          console.error(`Failed to create calendar event for ${logKey}:`, err);
        }
      }
    }
  }

  // 2. Tombstone Cleanup: Delete orphaned events for cards or vouchers that no longer exist
  const activeKeys = new Set(activeBenefits.map(ab => ab.logKey));
  for (const logKey of Object.keys(eventIds)) {
    if (!activeKeys.has(logKey)) {
      const orphanedEventId = eventIds[logKey];
      if (orphanedEventId) {
        try {
          const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${orphanedEventId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (delRes.ok || delRes.status === 404) {
            updateEventId(logKey, null);
          }
        } catch (err) {
          console.error(`Failed to clean up orphaned calendar event ${orphanedEventId} for ${logKey}:`, err);
        }
      }
    }
  }
};
