'use client';

import React, { useState, useEffect } from 'react';
import {
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
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  XCircle,
  Mail,
} from 'lucide-react';
import { BusinessRequest } from '@/types/request';
import { SALES_PERSONS, CCR_PERSONS, GYOMU_PERSONS } from '@/lib/constants';

export type VoucherPreviewProps = {
  requestItem: BusinessRequest | null;
  onOpenResponseModal?: (item: BusinessRequest) => void;
  onRequestUpdated?: (updated: BusinessRequest) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  isModal?: boolean;
};

/**
 * 業務課 依頼・回答伝票プレビューコンポーネント
 * モーダル内および 2ペイン（スプリットビュー）画面で共通利用
 */
export function VoucherPreview({
  requestItem,
  onOpenResponseModal,
  onRequestUpdated,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  currentIndex,
  totalCount,
  isModal = false,
}: VoucherPreviewProps): React.JSX.Element {
  const [isApproving, setIsApproving] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [approvalError, setApprovalError] = useState('');

  if (!requestItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <p className="font-bold text-sm text-slate-600">依頼が選択されていません</p>
        <p className="text-xs text-slate-400 mt-1">左側の一覧をクリックするか、↑ / ↓ キーで選択してください</p>
      </div>
    );
  }

  const categoryLabel =
    requestItem.category === 'delivery_check' ? '欠品/納期問合せ' :
    requestItem.category === 'estimate_request' ? '見積依頼' :
    (requestItem.category === 'sample_request' || requestItem.category === 'work_order') ? '仕掛手配' : 'その他依頼';

  const isAnswered = requestItem.status === 'answered' || (requestItem.status as string) === 'completed';
  const isInProgress = requestItem.status === 'in_progress';
  const isOnHold = requestItem.status === 'on_hold';

  // 信号機カラーのステータス印鑑
  const statusStampText = isAnswered ? '回答済' : isInProgress ? '確認中' : isOnHold ? '保留' : '未対応';
  const statusStampColor = isAnswered
    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/80 shadow-emerald-100'
    : isInProgress
    ? 'border-amber-500 text-amber-800 bg-amber-50/80 shadow-amber-100'
    : isOnHold
    ? 'border-slate-500 text-slate-600 bg-slate-50/80 shadow-slate-100'
    : 'border-rose-600 text-rose-700 bg-rose-50/80 shadow-rose-100';

  // 期限アラート判定
  let deadlineAlert: { isAlert: boolean; isOverdue: boolean; label: string } | null = null;
  if (requestItem.desiredDeliveryDate && !isAnswered) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(requestItem.desiredDeliveryDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      deadlineAlert = { isAlert: true, isOverdue: true, label: `⚠️ 期限超過 (${Math.abs(diffDays)}日遅れ)` };
    } else if (diffDays === 0) {
      deadlineAlert = { isAlert: true, isOverdue: false, label: '⚠️ 本日期限 (至急)' };
    } else if (diffDays === 1) {
      deadlineAlert = { isAlert: true, isOverdue: false, label: '⚠️ 明日期限 (至急)' };
    }
  }

  const isWorkOrder = requestItem.category === 'sample_request' || requestItem.category === 'work_order';
  const isApproved = requestItem.approvalStatus === 'approved';
  const isRejected = requestItem.approvalStatus === 'rejected';
  const isPendingApproval = isWorkOrder && !isApproved && !isRejected;

  const est = requestItem.estimateDetails;
  const res = requestItem.estimateResponse;
  const requestedPackageType = est?.packageType || '単袋';
  const unitLabel = requestedPackageType === 'ロール' ? 'm' : '枚';

  const handlePrint = (): void => {
    window.print();
  };

  // 上長承認実行
  const handleApprove = async (approver: string): Promise<void> => {
    if (!approver.trim()) {
      setApprovalError('承認者名を選択または入力してください');
      return;
    }
    setIsApproving(true);
    setApprovalError('');
    try {
      const nowIso = new Date().toISOString();
      const res = await fetch(`/api/requests/${requestItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approverName: approver.trim(),
          approvedAt: nowIso,
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (onRequestUpdated) onRequestUpdated(json.data);
      } else {
        setApprovalError(json.error || '承認に失敗しました');
      }
    } catch (err) {
      console.error('上長承認エラー:', err);
      setApprovalError('通信エラーが発生しました');
    } finally {
      setIsApproving(false);
    }
  };

  // 承認差戻し
  const handleReject = async (): Promise<void> => {
    if (!confirm('この仕掛手配を「差戻し（未承認）」に戻しますか？')) return;
    setIsApproving(true);
    setApprovalError('');
    try {
      const res = await fetch(`/api/requests/${requestItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'pending',
          approverName: undefined,
          approvedAt: undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (onRequestUpdated) onRequestUpdated(json.data);
      } else {
        setApprovalError(json.error || '解除に失敗しました');
      }
    } catch (err) {
      console.error('上長承認解除エラー:', err);
      setApprovalError('通信エラーが発生しました');
    } finally {
      setIsApproving(false);
    }
  };

  const formattedCreatedAt = new Date(requestItem.createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const formattedApprovedDate = requestItem.approvedAt
    ? new Date(requestItem.approvedAt).toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
      })
    : '';

  return (
    <div className={`bg-white rounded-2xl ${isModal ? '' : 'shadow-sm border border-slate-200'} overflow-hidden flex flex-col printable-voucher`}>
      {/* 2ペイン用ツールバー（ページナビゲーション・印刷ボタン） */}
      {!isModal && (
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">
              {requestItem.id}
            </span>
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-xs text-slate-400 font-mono">
                {currentIndex + 1} / {totalCount} 件
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* 前へ / 次へ ナビゲーション */}
            {(onNavigatePrev || onNavigateNext) && (
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-2">
                <button
                  type="button"
                  onClick={onNavigatePrev}
                  disabled={!hasPrev}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                  title="前の依頼 (↑キー)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                  title="次の依頼 (↓キー)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const subject = encodeURIComponent(`【業務課依頼: ${requestItem.id}】${requestItem.title}`);
                const body = encodeURIComponent(
                  `依頼番号: ${requestItem.id}\n` +
                  `発信者: ${requestItem.requesterName} (${requestItem.requesterDept === 'sales' ? '営業' : 'CCR'})\n` +
                  `得意先: ${requestItem.customerName || '未指定'}\n` +
                  `希望納期: ${requestItem.desiredDeliveryDate}\n` +
                  `件名: ${requestItem.title}\n\n` +
                  `【依頼内容】\n${requestItem.details || ''}\n\n` +
                  (requestItem.responseContent ? `【業務課回答】\n${requestItem.responseContent}\n` : '')
                );
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
              title="Outlook 2021でメール作成画面を開きます"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Outlook</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
              title="A4用紙で綺麗に印刷します"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>印刷 (A4)</span>
            </button>

            {onOpenResponseModal && (
              <button
                type="button"
                onClick={() => onOpenResponseModal(requestItem)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>仕入回答</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 上長認証システム（仕掛手配 専用アクションバー / 画面専用） */}
      {isWorkOrder && (
        <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg ${isApproved ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-950">【上長認証ステータス】</span>
                {isApproved ? (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-black tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    承認済み (承認者: {requestItem.approverName || '上長'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-black tracking-wider animate-pulse">
                    ⚠️ 上長未承認（承認待ち）
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {isApproved
                  ? `承認日時: ${new Date(requestItem.approvedAt || '').toLocaleString('ja-JP')}`
                  : '仕掛手配の実行には上長の認証（承認印）が必要です。'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {approvalError && (
              <span className="text-xs font-bold text-rose-600 mr-1">{approvalError}</span>
            )}

            {!isApproved ? (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedApprover}
                  onChange={e => setSelectedApprover(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- 上長を選択 --</option>
                  <optgroup label="営業上長・担当">
                    {SALES_PERSONS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="CCR上長・担当">
                    {CCR_PERSONS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="業務課">
                    {GYOMU_PERSONS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </optgroup>
                </select>
                <button
                  type="button"
                  disabled={isApproving || !selectedApprover}
                  onClick={() => handleApprove(selectedApprover)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-black shadow transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {isApproving ? '認証中...' : '上長承認する (認証)'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isApproving}
                onClick={handleReject}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                title="承認を取り消して未承認に戻します"
              >
                承認を取り消す
              </button>
            )}
          </div>
        </div>
      )}

      {/* 帳票本体エリア */}
      <div className="p-6 sm:p-7 space-y-5 bg-white text-slate-900 overflow-y-auto print:overflow-visible print:p-0">
        {/* 帳票ヘッダー (タイトル・発行日・認印エリア) */}
        <div className="border-b-2 border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-wider text-slate-900">業務課 依頼・回答伝票</h1>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded">
                  {categoryLabel}
                </span>

                {/* 期限超過・至急アラートバッジ（パルス点滅） */}
                {deadlineAlert && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-sm animate-pulse ${
                      deadlineAlert.isOverdue
                        ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-500/20'
                        : 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-500/20'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {deadlineAlert.label}
                  </span>
                )}
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
              {/* 信号機カラー ステータス印 */}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center font-bold rotate-[-6deg] shadow-sm shrink-0 ${statusStampColor}`}>
                <span className="text-[9px] tracking-tighter">ステータス</span>
                <span className="text-xs font-black">{statusStampText}</span>
              </div>

              {/* 上長承認印 (仕掛手配または承認済み時) */}
              {(isWorkOrder || requestItem.approvalStatus) && (
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center font-bold rotate-[-3deg] shadow-sm shrink-0 ${
                  isApproved
                    ? 'border-rose-600 bg-rose-50/70 text-rose-700'
                    : isRejected
                    ? 'border-slate-500 bg-slate-50 text-slate-600'
                    : 'border-dashed border-rose-400 bg-rose-50/30 text-rose-500'
                }`}>
                  <span className="text-[8px] sm:text-[9px] tracking-tighter border-b border-rose-300 w-4/5 text-center pb-0.5">
                    {isApproved ? '上長承認' : '上長認証'}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black px-1 truncate max-w-full">
                    {isApproved ? (requestItem.approverName || '承認') : '承認待ち'}
                  </span>
                  {isApproved && formattedApprovedDate && (
                    <span className="text-[8px] font-mono leading-none pt-0.5 text-rose-600">
                      {formattedApprovedDate}
                    </span>
                  )}
                </div>
              )}

              {/* 依頼者印 */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 border border-slate-400 rounded bg-slate-50 flex flex-col text-[9px] sm:text-[10px] text-center overflow-hidden shrink-0">
                <span className="bg-slate-200 py-0.5 font-bold text-slate-700 border-b border-slate-300">依頼者</span>
                <div className="flex-1 flex items-center justify-center font-bold text-slate-900 px-1 truncate">
                  {requestItem.requesterName || '-'}
                </div>
              </div>

              {/* 業務担当印 */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 border border-slate-400 rounded bg-slate-50 flex flex-col text-[9px] sm:text-[10px] text-center overflow-hidden shrink-0">
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
          <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">{requestItem.title}</p>
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

            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
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

        {/* 商品明細テーブル（欠品納期問合せ ＆ 仕掛手配共通） */}
        {(requestItem.category === 'delivery_check' || isWorkOrder) && requestItem.products && requestItem.products.length > 0 && (
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-sky-700 no-print" />
                <span>{requestItem.category === 'delivery_check' ? '【欠品・納期問合せ 商品明細】' : '【仕掛手配 商品明細】'}</span>
              </div>
              {isWorkOrder && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isApproved ? `上長承認済 (${requestItem.approverName || '済'})` : '上長承認待ち'}
                </span>
              )}
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
            <div className="p-3 bg-white text-xs leading-relaxed whitespace-pre-wrap text-slate-800 min-h-[40px]">
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
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-900 min-h-[30px]">
                {requestItem.responseContent || (isAnswered ? '回答内容はありません。' : '現在確認中です。回答までしばらくお待ちください。')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
