'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  AlertCircle,
  Calendar,
  PackageCheck,
  Calculator,
  Building,
  UserCheck,
  Plus,
  Trash2,
  FileText,
  Copy,
  Check,
  Box,
  Layers,
} from 'lucide-react';
import { BusinessRequest, RequestStatus, EstimateResponse, EstimateLotItem, FactoryMasterItem } from '@/types/request';
import { GYOMU_PERSONS, FACTORY_MASTERS, STATUS_CONFIG } from '@/lib/constants';
import { getSavedUserProfile } from '@/lib/user';

type RequestResponseModalProps = {
  requestItem: BusinessRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function RequestResponseModal({
  requestItem,
  isOpen,
  onClose,
  onSuccess,
}: RequestResponseModalProps): React.JSX.Element | null {
  const [status, setStatus] = useState<RequestStatus>('in_progress');
  const [assigneeName, setAssigneeName] = useState<string>(GYOMU_PERSONS[0]);
  const [gyomuMembers, setGyomuMembers] = useState<string[]>([...GYOMU_PERSONS]);
  const [factoryList, setFactoryList] = useState<FactoryMasterItem[]>([...FACTORY_MASTERS]);
  const [scheduledPurchaseDate, setScheduledPurchaseDate] = useState<string>('');
  const [incomingQuantity, setIncomingQuantity] = useState<string>('');
  const [responseContent, setResponseContent] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');

  // コピー状態表示
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // 見積回答用状態（はじめはロット1のみ）
  const [gravurePlateCost, setGravurePlateCost] = useState<string>('');
  const [colorPlateCost, setColorPlateCost] = useState<string>('');
  const [selectedFactoryName, setSelectedFactoryName] = useState<string>('');
  const [factoryCode, setFactoryCode] = useState<string>('');
  const [lots, setLots] = useState<EstimateLotItem[]>([
    { id: '1', lotName: '', priceBag: '', priceRoll: '', deliveryDate: '' },
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    fetch('/api/settings/masters')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          if (json.data.gyomu && json.data.gyomu.length > 0) {
            setGyomuMembers(json.data.gyomu);
          }
          if (json.data.factories && json.data.factories.length > 0) {
            setFactoryList(json.data.factories);
          }
        }
      })
      .catch(err => console.error('業務マスター取得エラー:', err));
  }, []);

  useEffect(() => {
    if (requestItem) {
      const st = requestItem.status === ('completed' as any) ? 'answered' : (requestItem.status || 'in_progress');
      setStatus(st);

      const savedUser = getSavedUserProfile();
      // 初期値として依頼時に指定された工場・担当者があればそのまま反映。なければログイン中の業務課担当者
      const initFactoryName = requestItem.estimateResponse?.factoryName || requestItem.factoryName || '';
      const initFactoryCode = requestItem.estimateResponse?.factoryCode || requestItem.factoryCode || '';
      const initAssignee = requestItem.assigneeName || (savedUser?.dept === 'gyomu' ? savedUser.name : gyomuMembers[0] || GYOMU_PERSONS[0]);

      setSelectedFactoryName(initFactoryName);
      setFactoryCode(initFactoryCode);
      setAssigneeName(initAssignee);

      setScheduledPurchaseDate(requestItem.scheduledPurchaseDate || '');
      setIncomingQuantity(requestItem.incomingQuantity || '');
      setResponseContent(requestItem.responseContent || '');
      setOrderNumber(requestItem.orderNumber || '');

      if (requestItem.estimateResponse) {
        const er = requestItem.estimateResponse;
        setGravurePlateCost(er.gravurePlateCost || '');
        setColorPlateCost(er.colorPlateCost || '');

        if (er.lots && er.lots.length > 0) {
          setLots(er.lots);
        } else {
          // 旧データ互換
          const defaultLotName = requestItem.estimateDetails?.quantity || '';
          setLots([
            { id: '1', lotName: er.price4000Bag ? '4000' : defaultLotName, priceBag: er.price4000Bag || '', priceRoll: er.price4000Roll || '', deliveryDate: '' },
          ]);
        }
      } else {
        setGravurePlateCost('');
        setColorPlateCost('');
        const defaultLotName = requestItem.estimateDetails?.quantity || '';
        setLots([
          { id: '1', lotName: defaultLotName, priceBag: '', priceRoll: '', deliveryDate: '' },
        ]);
      }
    }
  }, [requestItem, gyomuMembers]);

  if (!isOpen || !requestItem) return null;

  // フォーム内での意図しない Enter キーによる送信・モーダル終了を防止
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>): void => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  // ① 工場名選択時：工場コード ＆ 担当業務員を自動記載
  const handleFactorySelect = (factoryNameStr: string): void => {
    setSelectedFactoryName(factoryNameStr);
    const matched = factoryList.find(f => f.name === factoryNameStr);
    if (matched) {
      setFactoryCode(matched.code || '');
      if (matched.defaultAssignee) {
        setAssigneeName(matched.defaultAssignee);
      }
    } else if (!factoryNameStr) {
      setFactoryCode('');
    }
  };

  // ② 工場コード変更時：工場名 ＆ 担当業務員を自動記載
  const handleFactoryCodeChange = (codeStr: string): void => {
    setFactoryCode(codeStr);
    const matched = factoryList.find(f => f.code === codeStr || f.code.toLowerCase() === codeStr.toLowerCase());
    if (matched) {
      setSelectedFactoryName(matched.name);
      if (matched.defaultAssignee) {
        setAssigneeName(matched.defaultAssignee);
      }
    }
  };

  // ③ 業務担当者変更時：該当工場があれば工場名・工場コードを連動
  const handleAssigneeChange = (personName: string): void => {
    setAssigneeName(personName);
    if (personName) {
      const assignedFactories = factoryList.filter(f => f.defaultAssignee === personName);
      if (assignedFactories.length === 1) {
        setSelectedFactoryName(assignedFactories[0].name);
        setFactoryCode(assignedFactories[0].code);
      } else if (assignedFactories.length > 1) {
        const currentIsAssigned = assignedFactories.some(f => f.name === selectedFactoryName);
        if (!currentIsAssigned) {
          setSelectedFactoryName('');
          setFactoryCode('');
        }
      }
    }
  };

  // 選択された業務担当者の受持ち工場
  const filteredFactories = assigneeName
    ? factoryList.filter(f => f.defaultAssignee === assigneeName)
    : [];

  // 依頼の納品区分（ロール / 単袋）
  const requestedPackageType = requestItem.estimateDetails?.packageType || '単袋';
  const isRollPrimary = requestedPackageType === 'ロール';
  const est = requestItem.estimateDetails;

  // 工場依頼用テキストの生成＆クリップボードコピー
  const handleCopyFactoryText = (): void => {
    const lines: string[] = [];
    const catLabel =
      requestItem.category === 'estimate_request' ? '【見積依頼】' :
      requestItem.category === 'delivery_check' ? '【欠品納期問合せ】' :
      (requestItem.category === 'sample_request' || requestItem.category === 'work_order') ? '【仕掛手配】' : '【業務依頼】';

    lines.push(`■ 業務依頼内容 (${catLabel})`);
    lines.push(`依頼番号: ${requestItem.id}`);
    lines.push(`件名: ${requestItem.title}`);
    lines.push(`回答希望日: ${requestItem.desiredDeliveryDate}`);
    lines.push(`発信者: ${requestItem.requesterName} (${requestItem.requesterDept === 'sales' ? '営業' : 'CCR'})`);
    if (requestItem.customerName) {
      lines.push(`得意先名: ${requestItem.customerName}${requestItem.customerCode ? ` (CD: ${requestItem.customerCode})` : ''}`);
    }
    if (selectedFactoryName || factoryCode) {
      lines.push(`指定工場: ${selectedFactoryName || '未指定'}${factoryCode ? ` (CD: ${factoryCode})` : ''}`);
    }
    if (assigneeName) {
      lines.push(`業務担当: ${assigneeName}`);
    }

    if (requestItem.category === 'estimate_request' && est) {
      lines.push('');
      lines.push('【仕様詳細】');
      if (est.capacity) lines.push(`・容量: ${est.capacity}`);
      if (est.quantity) lines.push(`・希望ロット: ${est.quantity}`);
      if (est.packageSize) lines.push(`・サイズ: ${est.packageSize}`);
      if (est.packageForm) lines.push(`・形態・仕様: ${est.packageForm}`);
      if (est.structure || est.material) lines.push(`・構成/材質: ${est.structure || est.material}`);
      if (est.colorCount) lines.push(`・色数: ${est.colorCount}`);
      if (est.deoxidizer) lines.push(`・脱酸素剤: ${est.deoxidizer}`);
    }

    const isWorkOrder = requestItem.category === 'sample_request' || requestItem.category === 'work_order';

    if (isWorkOrder) {
      lines.push(`上長承認: ${requestItem.approvalStatus === 'approved' ? `承認済 (${requestItem.approverName || '上長'})` : '未承認（承認待ち）'}`);
    }

    if (requestItem.products && requestItem.products.length > 0) {
      lines.push('');
      lines.push(isWorkOrder ? '【仕掛手配 商品明細】' : '【欠品商品明細】');
      requestItem.products.forEach(p => {
        const catNo = p.catalogNumber ? `カタログ№:${p.catalogNumber} / ` : '';
        const wKg = p.weightKg ? `容量:${p.weightKg}kg / ` : '';
        lines.push(`・${catNo}${wKg}${p.productName} (数量: ${p.quantity}${p.unit})`);
      });
    }

    if (requestItem.details) {
      lines.push('');
      lines.push('【特記事項・備考】');
      lines.push(requestItem.details);
    }

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ロット追加
  const handleAddLot = (): void => {
    setLots(prev => [
      ...prev,
      { id: Date.now().toString(), lotName: '', priceBag: '', priceRoll: '', deliveryDate: '' },
    ]);
  };

  // ロット削除
  const handleRemoveLot = (id: string): void => {
    if (lots.length <= 1) return;
    setLots(prev => prev.filter(l => l.id !== id));
  };

  // ロット項目変更
  const handleLotChange = (id: string, field: keyof EstimateLotItem, value: string): void => {
    setLots(prev =>
      prev.map(l => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const estimateResponse: EstimateResponse | undefined =
        requestItem.category === 'estimate_request'
          ? {
              gravurePlateCost,
              colorPlateCost,
              factoryName: selectedFactoryName,
              factoryCode,
              lots: lots.filter(l => l.lotName.trim() !== '' || l.priceBag || l.priceRoll || l.deliveryDate),
            }
          : undefined;

      const res = await fetch(`/api/requests/${encodeURIComponent(requestItem.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          assigneeName,
          factoryName: selectedFactoryName || undefined,
          factoryCode: factoryCode || undefined,
          scheduledPurchaseDate: requestItem.category === 'delivery_check' ? scheduledPurchaseDate : undefined,
          incomingQuantity: requestItem.category === 'delivery_check' ? incomingQuantity : undefined,
          estimateResponse,
          responseContent,
          orderNumber,
        }),
      });

      if (!res.ok) {
        let errText = '更新に失敗しました';
        try {
          const errJson = await res.json();
          errText = errJson.error || errText;
        } catch {
          errText = `サーバーエラー (${res.status})`;
        }
        setErrorMsg(errText);
        return;
      }

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(json.error || '更新に失敗しました');
      }
    } catch (err) {
      console.error('依頼回答エラー:', err);
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
        {/* ヘッダー */}
        <div className="px-6 py-4 bg-sky-700 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-sky-200">{requestItem.id}</span>
            <h2 className="text-lg font-bold truncate max-w-md">{requestItem.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sky-200 hover:text-white hover:bg-sky-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム (onKeyDownでEnter送信をブロック) */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* ステータス選択 (信号機カラー) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              進捗ステータス <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'pending', label: '🔴 未対応', bg: STATUS_CONFIG.pending.badgeStyle },
                { key: 'in_progress', label: '🟡 確認中', bg: STATUS_CONFIG.in_progress.badgeStyle },
                { key: 'answered', label: '🟢 回答済み', bg: STATUS_CONFIG.answered.badgeStyle },
                { key: 'on_hold', label: '⚪ 保留', bg: STATUS_CONFIG.on_hold.badgeStyle },
              ].map(st => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatus(st.key as RequestStatus)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    status === st.key
                      ? `${st.bg} ring-2 ring-sky-500 shadow-sm scale-95`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* 工場名・工場コード・業務担当者の3相互連動入力エリア */}
          <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                工場 ＆ 業務担当者連携
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* 業務担当者 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  業務担当者
                </label>
                <select
                  value={assigneeName}
                  onChange={e => handleAssigneeChange(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {gyomuMembers.map(person => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              {/* 製造工場名（担当者に絞り込まれたリスト ＋ 全工場リスト） */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">製造工場名</label>
                <select
                  value={selectedFactoryName}
                  onChange={e => handleFactorySelect(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- 工場を選択 --</option>
                  {filteredFactories.length > 0 && (
                    <optgroup label={`【${assigneeName} 担当工場】`}>
                      {filteredFactories.map(f => (
                        <option key={`assigned-${f.name}`} value={f.name}>
                          ★ {f.name} (CD: {f.code})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={assigneeName ? "【すべての工場】" : "【工場一覧】"}>
                    {factoryList.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name} (CD: {f.code})
                      </option>
                    ))}
                  </optgroup>
                  <option value="その他">その他</option>
                </select>
              </div>

              {/* 工場コード */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">工場コード</label>
                <input
                  type="text"
                  value={factoryCode}
                  onChange={e => handleFactoryCodeChange(e.target.value)}
                  placeholder="例: 221 / 554"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 受注番号 / 関連番号 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              受注番号 / 関連番号
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="例: ORD-2026-9901"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>

          {/* 常時表示：依頼内容確認 ＆ 工場依頼用コピーボタン */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            {/* ヘッダー ＆ コピーボタン */}
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                依頼内容・仕様
              </span>

              {/* 工場依頼コピペ用ボタン */}
              <button
                type="button"
                onClick={handleCopyFactoryText}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
                title="クリックして工場用依頼テキストをコピー"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>コピー完了！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>依頼内容をコピー (工場連絡用)</span>
                  </>
                )}
              </button>
            </div>

            {/* 常時表示コンテンツ */}
            <div className="p-3.5 space-y-3 text-xs text-slate-800">
              {/* 基本発信情報 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <div>
                  <span className="text-slate-400 block text-[10px]">発信者</span>
                  <strong className="text-slate-800">
                    {requestItem.requesterName} ({requestItem.requesterDept === 'sales' ? '営業' : 'CCR'})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">得意先 (CD)</span>
                  <strong className="text-slate-800">
                    {requestItem.customerName || '未指定'}
                    {requestItem.customerCode ? ` (${requestItem.customerCode})` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">回答希望日</span>
                  <strong className="text-amber-700">{requestItem.desiredDeliveryDate}</strong>
                </div>
              </div>

              {/* 見積仕様詳細 */}
              {requestItem.category === 'estimate_request' && est && (
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1.5">
                  <span className="font-bold text-indigo-900 flex items-center gap-1 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    見積依頼 仕様フォーマット
                  </span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <p><span className="text-slate-500">容量:</span> <strong>{est.capacity || '-'}</strong></p>
                    <p><span className="text-slate-500">数量/ロット:</span> <strong>{est.quantity || '-'}</strong></p>
                    <p><span className="text-slate-500">サイズ:</span> <strong>{est.packageSize || '-'}</strong></p>
                    <p><span className="text-slate-500">形態:</span> <strong>{est.packageForm || '-'}</strong></p>
                    <p><span className="text-slate-500">構成/材質:</span> <strong>{est.structure || est.material || '-'}</strong></p>
                    <p><span className="text-slate-500">色数:</span> <strong>{est.colorCount || '-'}</strong></p>
                    <p className="col-span-2"><span className="text-slate-500">脱酸素剤:</span> <strong>{est.deoxidizer || '-'}</strong></p>
                  </div>
                </div>
              )}

              {/* 欠品明細リスト */}
              {requestItem.category === 'delivery_check' && requestItem.products && requestItem.products.length > 0 && (
                <div className="space-y-1">
                  <span className="font-bold text-sky-900 flex items-center gap-1 text-[11px]">
                    <Box className="w-3.5 h-3.5 text-sky-600" />
                    欠品商品明細
                  </span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="p-1.5">商品名</th>
                          <th className="p-1.5 text-right">必要数量</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requestItem.products.map(p => (
                          <tr key={p.id}>
                            <td className="p-1.5 font-bold text-slate-800">{p.productName}</td>
                            <td className="p-1.5 text-right font-mono text-sky-800">{p.quantity} {p.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 特記事項・備考 */}
              {requestItem.details && (
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold mb-0.5">特記事項・備考</span>
                  <p className="p-2 bg-white border border-slate-200 rounded-lg text-[11px] whitespace-pre-wrap leading-relaxed">
                    {requestItem.details}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 見積依頼回答専用フォーマット */}
          {requestItem.category === 'estimate_request' && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  業務記入（見積計算結果フォーマット）
                </p>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  依頼タイプ: {requestedPackageType}
                </span>
              </div>

              {/* 版代入力 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">グラビア版（掛け合わせなし）</label>
                  <input
                    type="text"
                    value={gravurePlateCost}
                    onChange={e => setGravurePlateCost(e.target.value)}
                    placeholder="例: 180,000 円"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">カラー版（掛け合わせあり）</label>
                  <input
                    type="text"
                    value={colorPlateCost}
                    onChange={e => setColorPlateCost(e.target.value)}
                    placeholder="例: 220,000 円"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* 動的複数ロット回答入力エリア */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">■ ロット別単価 ＆ 納期目安</span>
                  <button
                    type="button"
                    onClick={handleAddLot}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ロット回答を追加
                  </button>
                </div>

                <div className="space-y-3">
                  {lots.map((lot, index) => (
                    <div key={lot.id} className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2 text-xs shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900">ロット {index + 1}</span>
                        {lots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLot(lot.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="このロット回答を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* 依頼タイプがロール/単袋によって該当単価欄のみを3列グリッドで表示 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 数量（数値のみ） */}
                        <div>
                          <span className="text-slate-500 block mb-0.5 font-bold">
                            数量 <span className="text-[10px] font-normal text-slate-400">({isRollPrimary ? 'm' : '枚'})</span>
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={lot.lotName}
                            onChange={e => handleLotChange(lot.id, 'lotName', e.target.value)}
                            placeholder={isRollPrimary ? "例: 4000" : "例: 2000"}
                            className="w-full p-1.5 border border-slate-300 rounded font-bold text-slate-800 font-mono"
                          />
                        </div>

                        {/* 依頼が「ロール」の場合は「ロール単価」のみ、それ以外(単袋)は「単袋単価」のみ表示 */}
                        {isRollPrimary ? (
                          <div>
                            <span className="text-indigo-900 font-bold block mb-0.5">ロール (円/m)</span>
                            <input
                              type="text"
                              value={lot.priceRoll || ''}
                              onChange={e => handleLotChange(lot.id, 'priceRoll', e.target.value)}
                              placeholder="例: 14.2 円/m"
                              className="w-full p-1.5 border border-indigo-300 bg-indigo-50/30 rounded font-semibold text-slate-800"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="text-indigo-900 font-bold block mb-0.5">単袋 (円/枚)</span>
                            <input
                              type="text"
                              value={lot.priceBag || ''}
                              onChange={e => handleLotChange(lot.id, 'priceBag', e.target.value)}
                              placeholder="例: 28.5 円/枚"
                              className="w-full p-1.5 border border-indigo-300 bg-indigo-50/30 rounded font-semibold text-slate-800"
                            />
                          </div>
                        )}

                        {/* 納期目安 (手配後) */}
                        <div>
                          <span className="text-amber-800 font-bold block mb-0.5">納期目安 (手配後)</span>
                          <input
                            type="text"
                            value={lot.deliveryDate || ''}
                            onChange={e => handleLotChange(lot.id, 'deliveryDate', e.target.value)}
                            placeholder="例: 手配後約3週間"
                            className="w-full p-1.5 border border-amber-300 bg-amber-50/50 rounded font-semibold text-amber-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 欠品納期問合せ専用フォーマット */}
          {requestItem.category === 'delivery_check' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-amber-600" />
                仕入回答記入項目
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    仕入・入荷予定日
                  </label>
                  <input
                    type="date"
                    value={scheduledPurchaseDate}
                    onChange={e => setScheduledPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    入荷予定数量 / 単位
                  </label>
                  <input
                    type="text"
                    value={incomingQuantity}
                    onChange={e => setIncomingQuantity(e.target.value)}
                    placeholder="例: 600枚 / 全数"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 回答・連絡コメント */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              業務課からの回答・連絡コメント (相手に通知されます)
            </label>
            <textarea
              rows={3}
              value={responseContent}
              onChange={e => setResponseContent(e.target.value)}
              placeholder="例: 見積計算が完了いたしました。条件をご確認の上、ご不明点があればご連絡ください。"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* フッターアクション */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl shadow flex items-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" />
              回答・更新を保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
