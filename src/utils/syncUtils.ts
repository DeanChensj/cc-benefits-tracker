import { findSyncFile, uploadSyncFile, downloadSyncFile } from './gdrive';
import type { OwnedCardInstance, CardStore, RemoteSyncData } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';
import type { LogEntry } from './logUtils';
import { deobfuscateKey } from './cryptoUtils';
import { getYearFromPlainKey } from './storeHelpers';

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
      
      await uploadSyncFile(activeToken, fileId, { 
        ownedCards: storeState.ownedCards, 
        logs: storeState.logs, 
        loyaltyAwards: storeState.loyaltyAwards,
        deletedCardIds: storeState.deletedCardIds || [],
        deletedAwardIds: storeState.deletedAwardIds || [],
        walletLastModified: storeState.walletLastModified || Date.now()
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
