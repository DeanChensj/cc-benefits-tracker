import { lazy, Suspense } from 'react';
import { useCardStore } from '../store/useCardStore';
import { ZenModal } from './ZenModal';
import { Cloud } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { CARDS_DB } from '../data/cards.db';

import { ConfirmationModal } from './ConfirmationModal';

// Lazy load modals
const CalendarSyncModal = lazy(() => import('./CalendarSyncModal').then(m => ({ default: m.CalendarSyncModal })));
const CreateCardModal = lazy(() => import('./CreateCardModal').then(m => ({ default: m.CreateCardModal })));
const AddOfferModal = lazy(() => import('./AddOfferModal').then(m => ({ default: m.AddOfferModal })));
const DeleteConfirmModal = lazy(() => import('./DeleteConfirmModal').then(m => ({ default: m.DeleteConfirmModal })));
const SavingsWrappedModal = lazy(() => import('./SavingsWrappedModal').then(m => ({ default: m.SavingsWrappedModal })));
const EditCardModal = lazy(() => import('./EditCardModal').then(m => ({ default: m.EditCardModal })));
const EditAwardModal = lazy(() => import('./EditAwardModal').then(m => ({ default: m.EditAwardModal })));
const CreateAwardModal = lazy(() => import('./CreateAwardModal').then(m => ({ default: m.CreateAwardModal })));
const SettingsModal = lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));

interface ModalsContainerProps {
  activeModal: 'sync' | 'create-card' | 'create-award' | 'wrapped' | 'disconnect-gdrive' | 'wipe' | 'settings' | 'sync-conflict' | null;
  setActiveModal: (modal: 'sync' | 'create-card' | 'create-award' | 'wrapped' | 'disconnect-gdrive' | 'wipe' | 'settings' | 'sync-conflict' | null) => void;
  addOfferInstanceId: string | null;
  setAddOfferInstanceId: (id: string | null) => void;
  deleteCardInstanceId: string | null;
  setDeleteCardInstanceId: (id: string | null) => void;
  deleteAwardId: string | null;
  setDeleteAwardId: (id: string | null) => void;
  activeEditInstanceId: string | null;
  setActiveEditInstanceId: (id: string | null) => void;
  activeEditAwardId: string | null;
  setActiveEditAwardId: (id: string | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  handleAddCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  getLocalDateString: (date?: Date) => string;
  handleConfirmRemoveCard: () => void;
  handleConfirmDisconnectGoogleDrive: () => void;
  resolvedValue: number;
  expiredValue: number;
  securedSUBs: number;
  handleLinkGoogleDrive: () => Promise<void>;
  handleDisconnectGoogleDrive: () => void;
  resolveSyncConflict: (choice: 'local' | 'cloud') => Promise<void>;
}

export function ModalsContainer({
  activeModal,
  setActiveModal,
  addOfferInstanceId,
  setAddOfferInstanceId,
  deleteCardInstanceId,
  setDeleteCardInstanceId,
  deleteAwardId,
  setDeleteAwardId,
  activeEditInstanceId,
  setActiveEditInstanceId,
  activeEditAwardId,
  setActiveEditAwardId,
  showToast,
  handleAddCustomCard,
  getLocalDateString,
  handleConfirmRemoveCard,
  handleConfirmDisconnectGoogleDrive,
  resolvedValue,
  expiredValue,
  securedSUBs,
  handleLinkGoogleDrive,
  handleDisconnectGoogleDrive,
  resolveSyncConflict
}: ModalsContainerProps) {
  const {
    theme,
    language,
    ownedCards,
    loyaltyAwards,
    logs,
    deleteLoyaltyAward,
    resetAll,
    updateCardMultipliers,
    updateCardPointCurrency,
    updateWelcomeOffer,
    setCardOpenDate,
    renameCard,
    addInstanceOffer
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const addOfferCard = ownedCards.find((c) => c.id === addOfferInstanceId);
  const activeEditInstance = ownedCards.find((c) => c.id === activeEditInstanceId) || null;
  const activeEditAward = loyaltyAwards.find((a) => a.id === activeEditAwardId) || null;

  return (
    <>
      <Suspense fallback={null}>
        {/* Calendar Sync Modal */}
        <CalendarSyncModal 
          isOpen={activeModal === 'sync'} 
          onClose={() => setActiveModal(null)} 
          ownedCards={ownedCards}
          logs={logs}
          loyaltyAwards={loyaltyAwards}
          theme={theme}
        />

        {/* Create Custom Card Modal */}
        <CreateCardModal 
          isOpen={activeModal === 'create-card'} 
          onClose={() => setActiveModal(null)} 
          theme={theme}
          addCustomCard={handleAddCustomCard}
          getLocalDateString={getLocalDateString}
        />

        {/* Add Custom Offer Modal */}
        <AddOfferModal
          isOpen={!!addOfferInstanceId}
          cardName={addOfferCard ? (addOfferCard.templateId === 'custom' ? addOfferCard.customName : (CARDS_DB.find((t) => t.id === addOfferCard.templateId)?.name || 'Card')) : 'Card'}
          onClose={() => setAddOfferInstanceId(null)}
          onAdd={(offer) => {
            if (addOfferInstanceId) {
              addInstanceOffer(addOfferInstanceId, offer);
            }
          }}
          theme={theme}
          showToast={showToast}
        />

        {/* Custom Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={!!deleteCardInstanceId}
          cardName={ownedCards.find((c) => c.id === deleteCardInstanceId)?.customName || 'Card'}
          onConfirm={handleConfirmRemoveCard}
          onCancel={() => setDeleteCardInstanceId(null)}
          theme={theme}
        />

        {/* Standalone Loyalty Voucher Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deleteAwardId}
          title={language === 'zh' ? '确定注销并删除此房券/卡券吗？' : 'Delete Standalone Voucher?'}
          message={language === 'zh' ? '此操作为永久操作，将把卡券从钱包和日历提醒中彻底抹除，且无法撤销。' : 'Are you sure you want to delete this loyalty award voucher? This action is permanent and cannot be undone.'}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          onConfirm={() => {
            if (deleteAwardId) {
              deleteLoyaltyAward(deleteAwardId);
              setDeleteAwardId(null);
              showToast(t('toastVoucherDeleted'), 'error');
            }
          }}
          onCancel={() => setDeleteAwardId(null)}
          theme={theme}
          type="danger"
        />

        {/* Google Drive Disconnect Confirmation Modal */}
        <ConfirmationModal
          isOpen={activeModal === 'disconnect-gdrive'}
          title={language === 'zh' ? '断开与 Google Drive 的云同步连接？' : 'Disconnect Google Drive?'}
          message={language === 'zh' ? '确定要断开与云端的连接吗？您的本地数据会完好保存，但自动云备份将停止。' : 'Are you sure you want to disconnect and unlink Google Drive? Your local data will remain intact, but automated cloud synchronization will cease.'}
          confirmText={language === 'zh' ? '确认断开' : 'Disconnect'}
          cancelText={t('cancel')}
          onConfirm={handleConfirmDisconnectGoogleDrive}
          onCancel={() => setActiveModal(null)}
          theme={theme}
          type="warning"
        />

        {/* Wipe App Data Confirmation Modal */}
        <ConfirmationModal
          isOpen={activeModal === 'wipe'}
          title={language === 'zh' ? '🚨 确定要清空并全盘重置应用数据吗？' : 'Wipe All App Data?'}
          message={language === 'zh' ? '警告：此操作将永久抹除您的全部卡包组合、自定义福利和历史打卡日志。本操作不可逆！' : 'Are you absolutely sure you want to reset all card instances and checklist logs? This action is permanent and cannot be undone.'}
          confirmText={language === 'zh' ? '全盘抹除数据' : 'Wipe Data'}
          cancelText={language === 'zh' ? '保留卡包数据' : 'Keep Data'}
          onConfirm={() => {
            resetAll();
            setActiveModal(null);
            showToast(t('toastDataWiped'), 'warning');
          }}
          onCancel={() => setActiveModal(null)}
          theme={theme}
          type="danger"
        />
      </Suspense>

      <Suspense fallback={null}>
        {/* Standalone Loyalty Award Vouchers Constructor Modal */}
        <CreateAwardModal
          isOpen={activeModal === 'create-award'}
          onClose={() => setActiveModal(null)}
          themeClass={themeClass}
        />

        {/* Premium Savings Wrapped Poster Modal */}
        <SavingsWrappedModal
          isOpen={activeModal === 'wrapped'}
          onClose={() => setActiveModal(null)}
          ownedCards={ownedCards}
          loyaltyAwards={loyaltyAwards}
          resolvedValue={resolvedValue}
          expiredValue={expiredValue}
          securedSUBs={securedSUBs}
          themeClass={themeClass}
          theme={theme}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={activeModal === 'settings'}
          onClose={() => setActiveModal(null)}
          onOpenCalendarExport={() => setActiveModal('sync')}
          onOpenWipeModal={() => setActiveModal('wipe')}
          handleLinkGoogleDrive={handleLinkGoogleDrive}
          handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
        />

        {/* Sync Conflict Modal */}
        <ZenModal
          isOpen={activeModal === 'sync-conflict'}
          onClose={() => setActiveModal(null)}
          theme={theme}
          title={t('syncConflictTitle')}
          icon={<Cloud className="w-4 h-4 text-amber-500" />}
          maxWidthClass="max-w-md"
        >
          <div className="p-4 space-y-4">
            <p className={`text-xs leading-relaxed ${themeClass('text-slate-300', 'text-slate-600')}`}>
              {t('syncConflictDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={async () => {
                  await resolveSyncConflict('cloud');
                  setActiveModal(null);
                }}
                className="flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer bg-gradient-to-tr from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500"
              >
                {t('keepCloudBtn')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resolveSyncConflict('local');
                  setActiveModal(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer ${
                  themeClass('bg-slate-800 hover:bg-slate-700 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                }`}
              >
                {t('keepLocalBtn')}
              </button>
            </div>
          </div>
        </ZenModal>
      </Suspense>

      <Suspense fallback={null}>
        <EditCardModal
          key={activeEditInstanceId || 'none'}
          isOpen={!!activeEditInstanceId}
          instance={activeEditInstance}
          onClose={() => setActiveEditInstanceId(null)}
          updateCardMultipliers={updateCardMultipliers}
          updateCardPointCurrency={updateCardPointCurrency}
          updateWelcomeOffer={updateWelcomeOffer}
          setCardOpenDate={setCardOpenDate}
          renameCard={renameCard}
          themeClass={themeClass}
          theme={theme}
        />

        <EditAwardModal
          isOpen={!!activeEditAwardId}
          award={activeEditAward}
          onClose={() => setActiveEditAwardId(null)}
          themeClass={themeClass}
        />
      </Suspense>
    </>
  );
}
