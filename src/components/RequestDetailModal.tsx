'use client';

import React from 'react';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';
import { BusinessRequest } from '@/types/request';
import { VoucherPreview } from '@/components/VoucherPreview';

type RequestDetailModalProps = {
  requestItem: BusinessRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenResponseModal?: (item: BusinessRequest) => void;
  onRequestUpdated?: (updated: BusinessRequest) => void;
};

/**
 * 依頼詳細 伝票・帳票モーダルコンポーネント
 */
export function RequestDetailModal({
  requestItem,
  isOpen,
  onClose,
  onOpenResponseModal,
  onRequestUpdated,
}: RequestDetailModalProps): React.JSX.Element | null {
  if (!isOpen || !requestItem) return null;

  const handlePrint = (): void => {
    window.print();
  };

  const categoryLabel =
    requestItem.category === 'delivery_check' ? '欠品/納期問合せ' :
    requestItem.category === 'estimate_request' ? '見積依頼' :
    (requestItem.category === 'sample_request' || requestItem.category === 'work_order') ? '仕掛手配' : 'その他依頼';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in modal-container">
      {/* モーダル背景（印刷時は非表示） */}
      <div className="modal-overlay-bg absolute inset-0 -z-10" onClick={onClose} />

      {/* 伝票モーダル枠 */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-300 flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible print:shadow-none print:border-none printable-voucher">
        {/* 操作バー（画面用 / 印刷時は非表示） */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between no-print print:hidden shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">
              伝票番号: {requestItem.id}
            </span>
            <span className="text-xs font-bold text-slate-300">
              【{categoryLabel}】
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
              title="A4用紙で綺麗に印刷します"
            >
              <Printer className="w-4 h-4" />
              <span>伝票を印刷 (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 伝票本体プレビュー */}
        <div className="overflow-y-auto print:overflow-visible flex-1">
          <VoucherPreview
            requestItem={requestItem}
            isModal={true}
            onOpenResponseModal={onOpenResponseModal}
            onRequestUpdated={onRequestUpdated}
          />
        </div>

        {/* モーダルフッター（画面用 / 印刷時は非表示） */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 no-print print:hidden shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>最終更新: {new Date(requestItem.updatedAt).toLocaleString('ja-JP')}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              印刷 (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              閉じる
            </button>
            {onOpenResponseModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenResponseModal(requestItem);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                仕入回答・ステータス変更
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
