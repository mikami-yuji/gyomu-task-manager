'use client';

import React from 'react';
import {
  X,
  Printer,
  Calendar,
  User,
  Building2,
  FileText,
  CheckCircle2,
  MessageSquare,
  Box,
  Hash,
  Truck,
  Calculator,
  Building,
  Clock,
  Layers,
  Paperclip,
} from 'lucide-react';
import { BusinessRequest } from '@/types/request';

type RequestDetailModalProps = {
  requestItem: BusinessRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenResponseModal?: (item: BusinessRequest) => void;
};

/**
 * 依頼詳細 伝票・帳票ビュー モーダルコンポーネント
 * 紙の伝票・帳票レイアウトを踏襲し、A4印刷（window.print）にも完全最適化
 */
export function RequestDetailModal({
  requestItem,
  isOpen,
  onClose,
  onOpenResponseModal,
}: RequestDetailModalProps): React.JSX.Element | null {
  if (!isOpen || !requestItem) return null;

  const categoryLabel =
    requestItem.category === 'delivery_check' ? '欠品/納期問合せ' :
    requestItem.category === 'estimate_request' ? '見積依頼' :
    requestItem.category === 'sample_request' ? 'サンプル手配' : 'その他依頼';

  const isAnswered = requestItem.status === 'answered' || (requestItem.status as string) === 'completed';
  const isInProgress = requestItem.status === 'in_progress';
  const isOnHold = requestItem.status === 'on_hold';

  const statusStampText = isAnswered ? '回答済' : isInProgress ? '確認中' : isOnHold ? '保留' : '未着手';
  const statusStampColor = isAnswered
    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/70'
    : isInProgress
    ? 'border-sky-600 text-sky-700 bg-sky-50/70'
    : isOnHold
    ? 'border-slate-500 text-slate-600 bg-slate-50/70'
    : 'border-amber-600 text-amber-700 bg-amber-50/70';

  const est = requestItem.estimateDetails;
  const res = requestItem.estimateResponse;
  const requestedPackageType = est?.packageType || '単袋';
  const unitLabel = requestedPackageType === 'ロール' ? 'm' : '枚';

  // 印刷ハンドラー
  const handlePrint = (): void => {
    window.print();
  };

  const formattedCreatedAt = new Date(requestItem.createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in modal-container">
      {/* モーダル背景（印刷時は非表示） */}
      <div className="modal-overlay-bg absolute inset-0 -z-10" onClick={onClose} />

      {/* 伝票コンテナ */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-300 flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible print:shadow-none print:border-none printable-voucher">
        {/* モーダル操作バー（画面用 / 印刷時は非表示） */}
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

        {/* 帳票本体エリア */}
        <div className="p-6 sm:p-8 overflow-y-auto print:overflow-visible print:p-0 space-y-5 bg-white text-slate-900">
          {/* 帳票ヘッダー (タイトル・発行日・認印エリア) */}
          <div className="border-b-2 border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-wider text-slate-900">業務課 依頼・回答伝票</h1>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded">
                    {categoryLabel}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2 font-mono">
                  <p><strong>伝票番号:</strong> {requestItem.id}</p>
                  <p><strong>発行日:</strong> {formattedCreatedAt}</p>
                  {requestItem.orderNumber && (
                    <p><strong>受注番号:</strong> {requestItem.orderNumber}</p>
                  )}
                </div>
              </div>

              {/* 認印・ステータス印鑑エリア */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* ステータス印 */}
                <div className={`w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center font-bold rotate-[-6deg] shadow-sm shrink-0 ${statusStampColor}`}>
                  <span className="text-[10px] tracking-tighter">ステータス</span>
                  <span className="text-xs font-black">{statusStampText}</span>
                </div>

                {/* 依頼者印 */}
                <div className="w-16 h-16 border border-slate-400 rounded bg-slate-50 flex flex-col text-[10px] text-center overflow-hidden shrink-0">
                  <span className="bg-slate-200 py-0.5 font-bold text-slate-700 border-b border-slate-300">依頼者</span>
                  <div className="flex-1 flex items-center justify-center font-bold text-slate-900 px-1 truncate">
                    {requestItem.requesterName || '-'}
                  </div>
                </div>

                {/* 業務担当印 */}
                <div className="w-16 h-16 border border-slate-400 rounded bg-slate-50 flex flex-col text-[10px] text-center overflow-hidden shrink-0">
                  <span className="bg-sky-100 py-0.5 font-bold text-sky-800 border-b border-slate-300">業務担当</span>
                  <div className="flex-1 flex items-center justify-center font-bold text-sky-950 px-1 truncate">
                    {requestItem.assigneeName || (isAnswered ? '業務課' : '未定')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 依頼件名 */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
            <span className="text-[11px] font-bold text-slate-500 block">■ 依頼件名</span>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{requestItem.title}</p>
          </div>

          {/* 基本情報グリッド（伝票罫線テーブル風） */}
          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
              <div className="p-2 border-r border-slate-300">発信部署 / 発信者</div>
              <div className="p-2 border-r border-slate-300 sm:border-r">得意先名 (CD)</div>
              <div className="p-2 border-r border-slate-300">希望納期</div>
              <div className="p-2">指定工場 / 工場CD</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-white text-slate-800 font-medium">
              <div className="p-2.5 border-r border-slate-300 border-b sm:border-b-0 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0 no-print" />
                <span>
                  {requestItem.requesterDept === 'sales' ? '営業部' : 'CCR部'} / <strong>{requestItem.requesterName}</strong>
                </span>
              </div>
              <div className="p-2.5 border-r border-slate-300 border-b sm:border-b-0 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 no-print" />
                <span className="font-bold text-slate-900">
                  {requestItem.customerName || '未指定'}
                  {requestItem.customerCode ? ` (${requestItem.customerCode})` : ''}
                </span>
              </div>
              <div className="p-2.5 border-r border-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0 no-print" />
                <strong className="text-amber-800 font-mono text-sm">{requestItem.desiredDeliveryDate || '未指定'}</strong>
              </div>
              <div className="p-2.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 no-print" />
                <span>
                  {requestItem.factoryName || res?.factoryName || '指定なし'}
                  {(requestItem.factoryCode || res?.factoryCode) ? ` (${requestItem.factoryCode || res?.factoryCode})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 見積依頼仕様フォーマット情報 */}
          {requestItem.category === 'estimate_request' && est && (
            <div className="border border-indigo-300 rounded-lg overflow-hidden bg-indigo-50/40">
              <div className="bg-indigo-100/90 px-3 py-1.5 border-b border-indigo-300 text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-indigo-700 no-print" />
                <span>【見積依頼 仕様項目】</span>
              </div>

              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white p-2 rounded border border-indigo-200">
                  <span className="text-slate-500 block text-[10px]">容量</span>
                  <strong className="text-slate-900">{est.capacity || '-'}</strong>
                </div>

                <div className="bg-white p-2 rounded border border-indigo-200">
                  <span className="text-slate-500 block text-[10px]">数量 / ロット</span>
                  <strong className="text-slate-900">{est.quantity || '-'}</strong>
                </div>

                <div className="bg-white p-2 rounded border border-indigo-200">
                  <span className="text-slate-500 block text-[10px]">サイズ (幅×ピッチ)</span>
                  <strong className="text-slate-900">{est.packageSize || '-'}</strong>
                </div>

                <div className="bg-white p-2 rounded border border-indigo-200">
                  <span className="text-slate-500 block text-[10px]">形態 (単袋/ロール)</span>
                  <strong className="text-slate-900">{est.packageForm || est.packageType || '-'}</strong>
                </div>

                <div className="bg-white p-2 rounded border border-indigo-200 sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">構成 / 材質</span>
                  <strong className="text-slate-900">{est.structure || est.material || '-'}</strong>
                </div>

                <div className="bg-white p-2 rounded border border-indigo-200">
                  <span className="text-slate-500 block text-[10px]">色数</span>
                  <strong className="text-slate-900">{est.colorCount || '-'}</strong>
                </div>

                <div className="bg-white p-2 rounded border border-indigo-200">
                  <span className="text-slate-500 block text-[10px]">脱酸素剤使用</span>
                  <strong className="text-slate-900">{est.deoxidizer || '-'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 欠品商品明細テーブル */}
          {requestItem.category === 'delivery_check' && requestItem.products && requestItem.products.length > 0 && (
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-sky-700 no-print" />
                <span>【欠品・納期問合せ 商品明細】</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-200 w-24">カタログ№</th>
                    <th className="p-2 border-r border-slate-200 w-24">容量(kg)</th>
                    <th className="p-2 border-r border-slate-200">商品名</th>
                    <th className="p-2 text-right w-28">必要数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {requestItem.products.map(p => (
                    <tr key={p.id} className="bg-white">
                      <td className="p-2 font-mono text-slate-600 border-r border-slate-200">{p.catalogNumber || '-'}</td>
                      <td className="p-2 text-slate-600 border-r border-slate-200">{p.weightKg ? `${p.weightKg} kg` : '-'}</td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{p.productName}</td>
                      <td className="p-2 text-right font-bold text-sky-900 font-mono">
                        {p.quantity} {p.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 依頼内容・特記事項 */}
          {requestItem.details && (
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500 no-print" />
                <span>【依頼内容・特記事項・備考】</span>
              </div>
              <div className="p-3 bg-white text-xs leading-relaxed whitespace-pre-wrap text-slate-800 min-h-[50px]">
                {requestItem.details}
              </div>
            </div>
          )}

          {/* 業務課・仕入グループ 回答欄 (返信伝票部分) */}
          <div className="border-2 border-sky-600 rounded-xl overflow-hidden bg-sky-50/50 shadow-sm">
            <div className="bg-sky-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 tracking-wider">
                <MessageSquare className="w-4 h-4 no-print" />
                業務課・仕入グループ 回答欄
              </span>
              <span className="bg-sky-700 px-2.5 py-0.5 rounded text-[11px] font-normal">
                回答担当者: <strong className="font-bold">{requestItem.assigneeName || '未割り当て'}</strong>
              </span>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* 欠品問合せの仕入回答情報 */}
              {requestItem.category === 'delivery_check' && (requestItem.scheduledPurchaseDate || requestItem.incomingQuantity) && (
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-700 shrink-0 no-print" />
                    <div>
                      <span className="text-amber-800 text-[10px] block font-bold">仕入・入荷予定日</span>
                      <strong className="text-amber-950 font-mono text-sm">{requestItem.scheduledPurchaseDate || '未定'}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-amber-700 shrink-0 no-print" />
                    <div>
                      <span className="text-amber-800 text-[10px] block font-bold">入荷予定数量</span>
                      <strong className="text-amber-950 font-mono text-sm">{requestItem.incomingQuantity || '未定'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 見積依頼の計算結果・ロット別単価一覧 */}
              {requestItem.category === 'estimate_request' && res && (
                <div className="p-3 bg-white border border-indigo-200 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between border-b border-indigo-100 pb-1.5 gap-2">
                    <span className="font-bold text-indigo-950 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600 no-print" />
                      見積回答詳細
                    </span>
                    {(res.factoryName || res.factoryCode) && (
                      <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                        見積工場: <strong className="text-indigo-900">{res.factoryName || '-'}</strong>
                        {res.factoryCode && ` (${res.factoryCode})`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-800">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">グラビア版代 (掛け合わせなし)</span>
                      <strong className="text-indigo-950 font-mono text-sm">{res.gravurePlateCost || '未入力'}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">カラー版代 (掛け合わせあり)</span>
                      <strong className="text-indigo-950 font-mono text-sm">{res.colorPlateCost || '未入力'}</strong>
                    </div>
                  </div>

                  {/* ロット別単価・納期目安一覧 */}
                  {res.lots && res.lots.length > 0 ? (
                    <div className="pt-2 border-t border-indigo-100 space-y-2">
                      <span className="font-bold text-indigo-950 block text-[11px]">■ ロット別単価 ＆ 納期目安</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {res.lots.map(lot => {
                          const quantityDisplay = lot.lotName ? `${lot.lotName}${lot.lotName.includes('m') || lot.lotName.includes('枚') || lot.lotName.includes('ロット') ? '' : ` ${unitLabel}`}` : '数量未入力';
                          return (
                            <div key={lot.id} className="bg-slate-50 p-2.5 rounded border border-indigo-200 space-y-1">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                <span className="font-bold text-indigo-900 font-mono">
                                  数量: {quantityDisplay}
                                </span>
                                {lot.deliveryDate && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded text-[10px]">
                                    納期目安: {lot.deliveryDate}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] space-y-0.5 font-mono pt-1">
                                {requestedPackageType === 'ロール' ? (
                                  <>
                                    <p>ロール単価: <strong className="text-indigo-950 text-xs">{lot.priceRoll || '-'}</strong></p>
                                    {lot.priceBag && <p className="text-slate-500">単袋単価: <span>{lot.priceBag}</span></p>}
                                  </>
                                ) : (
                                  <>
                                    <p>単袋単価: <strong className="text-indigo-950 text-xs">{lot.priceBag || '-'}</strong></p>
                                    {lot.priceRoll && <p className="text-slate-500">ロール単価: <span>{lot.priceRoll}</span></p>}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-100">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-bold text-indigo-900 block mb-0.5">4,000mロット</span>
                        <p>単袋: <strong className="text-slate-900 font-mono">{res.price4000Bag || '-'}</strong></p>
                        <p>ロール: <strong className="text-slate-900 font-mono">{res.price4000Roll || '-'}</strong></p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-bold text-indigo-900 block mb-0.5">2,000mロット</span>
                        <p>単袋: <strong className="text-slate-900 font-mono">{res.price2000Bag || '-'}</strong></p>
                        <p>ロール: <strong className="text-slate-900 font-mono">{res.price2000Roll || '-'}</strong></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 回答コメント本文 */}
              <div className="bg-white p-3.5 rounded-lg border border-sky-200">
                <span className="text-[10px] font-bold text-sky-800 block mb-1">■ 業務課・仕入G コメント</span>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-900 min-h-[40px]">
                  {requestItem.responseContent || (isAnswered ? '回答内容はありません。' : '現在確認中です。回答までしばらくお待ちください。')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* モーダルフッター（画面用 / 印刷時は非表示） */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 no-print print:hidden shrink-0">
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
