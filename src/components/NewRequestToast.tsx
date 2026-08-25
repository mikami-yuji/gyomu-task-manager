'use client';

import React from 'react';
import { Bell, X, ExternalLink, Sparkles } from 'lucide-react';
import { BusinessRequest } from '@/types/request';

type Props = {
  requests: BusinessRequest[];
  onSelect: (req: BusinessRequest) => void;
  onDismiss: () => void;
};

export default function NewRequestToast({ requests, onSelect, onDismiss }: Props): React.JSX.Element | null {
  if (!requests || requests.length === 0) return null;

  const latest = requests[0];
  const moreCount = requests.length - 1;

  const categoryLabel =
    latest.category === 'delivery_check'
      ? '納期確認'
      : latest.category === 'estimate_request'
      ? '見積依頼'
      : (latest.category === 'sample_request' || latest.category === 'work_order')
      ? '仕掛手配'
      : 'その他';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-slide-up sm:max-w-sm">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border-2 border-sky-400 ring-4 ring-sky-500/20 flex flex-col space-y-3 transition-all">
        {/* ヘッダー行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-sky-500 text-white rounded-xl shadow animate-pulse">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-black text-sky-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                新着の依頼が届きました！
              </p>
              <p className="text-[10px] text-slate-300">
                {requests.length === 1 ? '1件の新着依頼' : `${requests.length}件の新しい依頼`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="通知を閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 依頼内容カード（クリックで開く） */}
        <div
          onClick={() => {
            onSelect(latest);
            onDismiss();
          }}
          className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/60 p-3 rounded-xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="text-sky-300 font-bold">{latest.id}</span>
            <span className="px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-800 rounded font-sans text-[10px] font-bold">
              {categoryLabel}
            </span>
          </div>

          <p className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
            {latest.title}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-700/60">
            <span>発信: {latest.requesterName} ({latest.requesterDept === 'sales' ? '営業' : 'CCR'})</span>
            <span className="text-sky-400 font-bold flex items-center gap-1 group-hover:underline text-[10px]">
              伝票を開く
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>

        {moreCount > 0 && (
          <p className="text-[11px] text-slate-400 text-center font-medium">
            他 {moreCount} 件の依頼も更新されました
          </p>
        )}
      </div>
    </div>
  );
}
