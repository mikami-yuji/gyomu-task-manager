'use client';

import React from 'react';
import { X, Calendar, User, Building2, FileText, CheckCircle2, MessageSquare, Box, Hash, Truck, Calculator, Building } from 'lucide-react';
import { BusinessRequest } from '@/types/request';

type RequestDetailModalProps = {
  requestItem: BusinessRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenResponseModal?: (item: BusinessRequest) => void;
};

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
    requestItem.category === 'sample_request' ? 'サンプル手配' : 'その他';

  const statusBadge =
    requestItem.status === 'answered' || (requestItem.status as any) === 'completed' ? { label: '回答済み', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' } :
    requestItem.status === 'in_progress' ? { label: '確認中', bg: 'bg-sky-100 text-sky-800 border-sky-200' } :
    requestItem.status === 'on_hold' ? { label: '保留', bg: 'bg-slate-100 text-slate-800 border-slate-200' } :
    { label: '未着手', bg: 'bg-amber-100 text-amber-800 border-amber-200' };

  const est = requestItem.estimateDetails;
  const res = requestItem.estimateResponse;
  const requestedPackageType = est?.packageType || '単袋';
  const unitLabel = requestedPackageType === 'ロール' ? 'm' : '枚';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        {/* モーダルヘッダー */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono px-2 py-0.5 bg-slate-700 text-sky-300 rounded">
              {requestItem.id}
            </span>
            <span className={`text-xs px-2.5 py-0.5 font-bold rounded-full border ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-800">
          <div>
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">{categoryLabel}</span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{requestItem.title}</h2>
          </div>

          {/* メタ情報グリッド */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400">発信者</p>
                <p className="font-bold text-slate-800">
                  {requestItem.requesterName} ({requestItem.requesterDept === 'sales' ? '営業' : 'CCR'})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400">得意先 (CD)</p>
                <p className="font-bold text-slate-800">
                  {requestItem.customerName || '未指定'}
                  {requestItem.customerCode ? ` (${requestItem.customerCode})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400">受注番号</p>
                <p className="font-bold text-slate-800 font-mono">{requestItem.orderNumber || '未入力'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-slate-400">希望納期</p>
                <p className="font-bold text-amber-700">{requestItem.desiredDeliveryDate}</p>
              </div>
            </div>
          </div>

          {/* 見積依頼仕様フォーマット表示 */}
          {requestItem.category === 'estimate_request' && est && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 border-b border-indigo-200 pb-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                見積依頼 仕様フォーマット情報
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">容量</span>
                  <strong className="text-slate-900">{est.capacity || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block">数量 / ロット</span>
                  <strong className="text-slate-900">{est.quantity || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block">サイズ (幅×ピッチ)</span>
                  <strong className="text-slate-900">{est.packageSize || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block">形態</span>
                  <strong className="text-slate-900">{est.packageForm || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block">構成 / 材質</span>
                  <strong className="text-slate-900">{est.structure || est.material || '-'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block">色数</span>
                  <strong className="text-slate-900">{est.colorCount || '-'}</strong>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block">脱酸素剤使用の有無</span>
                  <strong className="text-slate-900">{est.deoxidizer || '-'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 欠品商品明細テーブル */}
          {requestItem.category === 'delivery_check' && requestItem.products && requestItem.products.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-sky-600" />
                欠品商品明細
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">カタログ№</th>
                      <th className="p-2.5">容量(kg)</th>
                      <th className="p-2.5">商品名</th>
                      <th className="p-2.5 text-right">必要数量</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requestItem.products.map(p => (
                      <tr key={p.id} className="bg-white">
                        <td className="p-2.5 font-mono text-slate-600">{p.catalogNumber || '-'}</td>
                        <td className="p-2.5 text-slate-600">{p.weightKg ? `${p.weightKg} kg` : '-'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{p.productName}</td>
                        <td className="p-2.5 text-right font-bold text-sky-800 font-mono">
                          {p.quantity} {p.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 依頼・備考内容 */}
          {requestItem.details && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                その他特記事項・備考
              </h3>
              <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {requestItem.details}
              </div>
            </div>
          )}

          {/* 業務課/仕入Gからの回答 */}
          <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-sky-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                業務課回答状況
              </span>
              <span className="text-slate-500 font-normal">
                担当: {requestItem.assigneeName || '未割り当て'}
              </span>
            </h3>

            {/* 見積依頼の業務回答プレビュー */}
            {requestItem.category === 'estimate_request' && res && (
              <div className="p-3 bg-indigo-100/60 border border-indigo-200 rounded-lg text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200/80 pb-1.5">
                  <span className="font-bold text-indigo-900 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                    見積計算結果
                  </span>
                  {(res.factoryName || res.factoryCode) && (
                    <span className="font-semibold text-slate-700 flex items-center gap-1 bg-white px-2.5 py-0.5 rounded border border-indigo-200">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      工場: <strong className="text-indigo-950">{res.factoryName || '-'}</strong>
                      {res.factoryCode && <span className="font-mono text-slate-500"> (CD: {res.factoryCode})</span>}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-800">
                  <div>
                    <span className="text-slate-500 block">グラビア版 (掛け合わせなし)</span>
                    <strong className="text-indigo-950 font-mono">{res.gravurePlateCost || '未入力'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">カラー版 (掛け合わせあり)</span>
                    <strong className="text-indigo-950 font-mono">{res.colorPlateCost || '未入力'}</strong>
                  </div>
                </div>

                {/* 動的複数ロット回答リスト表示 */}
                {res.lots && res.lots.length > 0 ? (
                  <div className="pt-2 border-t border-indigo-200/60 space-y-2">
                    <span className="font-bold text-indigo-950 block text-[11px]">■ ロット別単価 ＆ 納期目安</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {res.lots.map(lot => {
                        const quantityDisplay = lot.lotName ? `${lot.lotName}${lot.lotName.includes('m') || lot.lotName.includes('枚') || lot.lotName.includes('ロット') ? '' : ` ${unitLabel}`}` : '数量未入力';
                        return (
                          <div key={lot.id} className="bg-white p-2.5 rounded-lg border border-indigo-200 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-1">
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
                                  <p>ロール単価: <strong className="text-indigo-900">{lot.priceRoll || '-'}</strong></p>
                                  {lot.priceBag && <p className="text-slate-500">単袋単価: <span>{lot.priceBag}</span></p>}
                                </>
                              ) : (
                                <>
                                  <p>単袋単価: <strong className="text-indigo-900">{lot.priceBag || '-'}</strong></p>
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
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/50">
                    <div className="bg-white/80 p-2 rounded border border-indigo-100">
                      <span className="font-bold text-indigo-900 block mb-0.5">4,000mロット</span>
                      <div className="text-[11px] space-y-0.5 font-mono">
                        <p>単袋: <strong className="text-slate-900">{res.price4000Bag || '-'}</strong></p>
                        <p>ロール: <strong className="text-slate-900">{res.price4000Roll || '-'}</strong></p>
                      </div>
                    </div>

                    <div className="bg-white/80 p-2 rounded border border-indigo-100">
                      <span className="font-bold text-indigo-900 block mb-0.5">2,000mロット</span>
                      <div className="text-[11px] space-y-0.5 font-mono">
                        <p>単袋: <strong className="text-slate-900">{res.price2000Bag || '-'}</strong></p>
                        <p>ロール: <strong className="text-slate-900">{res.price2000Roll || '-'}</strong></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 欠品納期問合せの仕入回答プレビュー */}
            {requestItem.category === 'delivery_check' && (requestItem.scheduledPurchaseDate || requestItem.incomingQuantity) && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-100/50 border border-amber-200/80 rounded-lg text-xs">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-amber-800 text-[11px] block">仕入・入荷予定日</span>
                    <strong className="text-amber-950">{requestItem.scheduledPurchaseDate || '未設定'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-amber-800 text-[11px] block">入荷予定数量</span>
                    <strong className="text-amber-950">{requestItem.incomingQuantity || '未設定'}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-sky-100 whitespace-pre-wrap min-h-[60px]">
              {requestItem.responseContent || 'まだ回答はありません。'}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            登録日: {new Date(requestItem.createdAt).toLocaleString('ja-JP')}
          </span>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
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
                className="px-5 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow transition-all flex items-center gap-1.5"
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
