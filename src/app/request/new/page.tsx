'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import {
  Send,
  ArrowLeft,
  Calendar,
  User,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  Package,
  Plus,
  Trash2,
  Box,
  Layers,
} from 'lucide-react';
import { RequestCategory, Department, ProductItem, EstimateDetails } from '@/types/request';
import {
  SALES_PERSONS,
  CCR_PERSONS,
  PACKAGE_TYPE_OPTIONS,
  WINDOW_OPTION_OPTIONS,
  PACKAGE_FORM_OPTIONS,
} from '@/lib/constants';

export default function NewRequestPage(): React.JSX.Element {
  const [category, setCategory] = useState<RequestCategory>('delivery_check');
  const [title, setTitle] = useState<string>('');
  const [requesterName, setRequesterName] = useState<string>('');
  const [requesterDept, setRequesterDept] = useState<Department>('sales');
  const [issuerName, setIssuerName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('');
  const [desiredDeliveryDate, setDesiredDeliveryDate] = useState<string>('');
  const [details, setDetails] = useState<string>('');

  // 動的マスターリスト
  const [salesMembers, setSalesMembers] = useState<string[]>([...SALES_PERSONS]);
  const [ccrMembers, setCcrMembers] = useState<string[]>([...CCR_PERSONS]);
  
  // 欠品商品明細リスト
  const [products, setProducts] = useState<ProductItem[]>([
    { id: '1', catalogNumber: '', weightKg: '', productName: '', quantity: '1', unit: '枚' },
  ]);

  // 見積依頼専用フォーム状態
  const [estimateState, setEstimateState] = useState<EstimateDetails>({
    capacity: '',
    quantity: '',
    packageSize: '',
    packageType: PACKAGE_TYPE_OPTIONS[0],
    windowOption: WINDOW_OPTION_OPTIONS[0],
    packageForm: PACKAGE_FORM_OPTIONS[0],
    structure: '',
    material: '',
    colorCount: '',
    deoxidizer: '無',
  });

  const [customPackageForm, setCustomPackageForm] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    // マスターデータの非同期フェッチ
    fetch('/api/settings/masters')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          if (json.data.sales && json.data.sales.length > 0) setSalesMembers(json.data.sales);
          if (json.data.ccr && json.data.ccr.length > 0) setCcrMembers(json.data.ccr);
          setRequesterName(json.data.sales?.[0] || SALES_PERSONS[0]);
        }
      })
      .catch(err => {
        console.error('マスター取得失敗:', err);
        setRequesterName(SALES_PERSONS[0]);
      });
  }, []);

  const handleDeptChange = (dept: Department): void => {
    setRequesterDept(dept);
    if (dept === 'sales') {
      setRequesterName(salesMembers[0] || '');
    } else {
      setRequesterName(ccrMembers[0] || '');
    }
  };

  const handleCategoryChange = (cat: RequestCategory): void => {
    setCategory(cat);
    if (!title || title.includes('欠品納期問合せ') || title.includes('見積依頼') || title.includes('サンプル手配')) {
      if (cat === 'delivery_check') setTitle('【欠品納期問合せ】');
      else if (cat === 'estimate_request') setTitle('【見積依頼】');
      else if (cat === 'sample_request') setTitle('【サンプル手配】');
      else setTitle('');
    }
  };

  const handleAddProduct = (): void => {
    setProducts(prev => [
      ...prev,
      { id: Date.now().toString(), catalogNumber: '', weightKg: '', productName: '', quantity: '1', unit: '枚' },
    ]);
  };

  const handleRemoveProduct = (id: string): void => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleProductChange = (id: string, field: keyof ProductItem, value: string): void => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // フォーム内での意図しない Enter キーによる送信を防止
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>): void => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const validProducts = category === 'delivery_check'
        ? products.filter(p => p.productName.trim() !== '')
        : undefined;

      const finalFormName = estimateState.packageForm === 'その他 (直接入力)'
        ? customPackageForm || 'その他'
        : estimateState.packageForm;

      const windowText = estimateState.windowOption ? `・${estimateState.windowOption}` : '';
      const combinedForm = `${estimateState.packageType || '単袋'} / ${finalFormName}${windowText}`;

      const finalEstimateDetails = category === 'estimate_request' ? {
        ...estimateState,
        packageForm: combinedForm,
      } : undefined;

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: title || (category === 'estimate_request' ? '【見積依頼】' : '【業務課依頼】'),
          requesterName,
          requesterDept,
          issuerName: issuerName || undefined,
          customerName,
          customerCode: customerCode || undefined,
          desiredDeliveryDate,
          details,
          products: validProducts,
          estimateDetails: finalEstimateDetails,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmittedId(json.data.id);
      } else {
        setErrorMsg(json.error || '依頼の保存に失敗しました');
      }
    } catch (err) {
      console.error('依頼登録通信エラー:', err);
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (): void => {
    setSubmittedId(null);
    setTitle('');
    setRequesterName(salesMembers[0] || '');
    setRequesterDept('sales');
    setCustomerName('');
    setCustomerCode('');
    setDesiredDeliveryDate('');
    setDetails('');
    setProducts([{ id: Date.now().toString(), catalogNumber: '', weightKg: '', productName: '', quantity: '1', unit: '枚' }]);
    setEstimateState({
      capacity: '',
      quantity: '',
      packageSize: '',
      packageType: PACKAGE_TYPE_OPTIONS[0],
      windowOption: WINDOW_OPTION_OPTIONS[0],
      packageForm: PACKAGE_FORM_OPTIONS[0],
      structure: '',
      material: '',
      colorCount: '',
      deoxidizer: '無',
    });
    setCustomPackageForm('');
  };

  const currentMembers = requesterDept === 'sales' ? salesMembers : ccrMembers;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            進捗一覧へ戻る
          </Link>
          <span className="text-xs text-slate-500 font-medium">業務課依頼・見積依頼登録</span>
        </div>

        {submittedId ? (
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200 p-8 text-center animate-fade-in max-w-xl mx-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">依頼の登録が完了しました</h2>
            <p className="text-sm text-slate-600 mb-4">
              業務課の進捗管理画面に即時反映されました。担当者へ通知メールが送信されます。
            </p>
            <div className="inline-block bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 text-base font-mono font-bold text-sky-800 mb-6">
              依頼番号: {submittedId}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow"
              >
                続けて登録する
              </button>
              <Link
                href="/"
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                進捗ビューアで確認する
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-700 to-indigo-800 px-6 py-4 text-white">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-300" />
                業務課への新規依頼登録
              </h1>
              <p className="text-xs text-sky-200 mt-1">
                欠品納期問合せ・見積依頼フォーマットに完全対応しています。
              </p>
            </div>

            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 sm:p-8 space-y-6">
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* 依頼カテゴリ選択 */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  依頼種別（カテゴリ） <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'delivery_check', label: '欠品/納期問合せ', icon: Calendar, desc: '欠品商品の仕入日確認' },
                    { key: 'estimate_request', label: '見積依頼', icon: Calculator, desc: '容量・仕様・ロット別見積' },
                    { key: 'sample_request', label: 'サンプル手配', icon: Package, desc: '見本発送・手配' },
                    { key: 'other', label: 'その他問い合わせ', icon: HelpCircle, desc: '各種業務連絡' },
                  ].map(cat => {
                    const IconComponent = cat.icon;
                    const isSelected = category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => handleCategoryChange(cat.key as RequestCategory)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/20 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span className={`text-sm font-bold ${isSelected ? 'text-sky-900' : 'text-slate-700'}`}>
                            {cat.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{cat.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 件名 */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  件名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例: 【見積依頼】500g アルミチャック袋 2000m/4000m"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>

              {/* 依頼者情報（発信部署 ＆ 営業・CCR動的担当者ドロップダウン） */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    発信部署 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={requesterDept}
                    onChange={e => handleDeptChange(e.target.value as Department)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="sales">営業</option>
                    <option value="ccr">CCR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    発信者 氏名 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <select
                      value={requesterName}
                      onChange={e => setRequesterName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {currentMembers.map(person => (
                        <option key={person} value={person}>
                          {person}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 得意先名 ＆ 得意先CD ＆ 希望納期 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    得意先名
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="例: スズリョーベルックス"
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    得意先CD <span className="text-xs font-normal text-slate-400">（コード）</span>
                  </label>
                  <input
                    type="text"
                    value={customerCode}
                    onChange={e => setCustomerCode(e.target.value)}
                    placeholder="例: 74418"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    回答希望日 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={desiredDeliveryDate}
                    onChange={e => setDesiredDeliveryDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* 【見積依頼専用フォーム】 */}
              {category === 'estimate_request' && (
                <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm border-b border-indigo-200 pb-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <span>見積依頼 仕様詳細フォーマット</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">容量</label>
                      <input
                        type="text"
                        value={estimateState.capacity || ''}
                        onChange={e => setEstimateState({ ...estimateState, capacity: e.target.value })}
                        placeholder="例: 500g / 1kg"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">数量 / ロット</label>
                      <input
                        type="text"
                        value={estimateState.quantity || ''}
                        onChange={e => setEstimateState({ ...estimateState, quantity: e.target.value })}
                        placeholder="例: 2000 / 4000"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">サイズ（幅×ピッチ）</label>
                      <input
                        type="text"
                        value={estimateState.packageSize || ''}
                        onChange={e => setEstimateState({ ...estimateState, packageSize: e.target.value })}
                        placeholder="例: 140mm × 220mm (底G35mm)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">色数</label>
                      <input
                        type="text"
                        value={estimateState.colorCount || ''}
                        onChange={e => setEstimateState({ ...estimateState, colorCount: e.target.value })}
                        placeholder="例: 5色 (グラビア印刷)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* 形態（ロール/単袋 ＆ 窓の有無 ＆ シール形状の3ドロップダウン選択） */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ロール/単袋 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={estimateState.packageType || PACKAGE_TYPE_OPTIONS[0]}
                        onChange={e => setEstimateState({ ...estimateState, packageType: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {PACKAGE_TYPE_OPTIONS.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        窓の有無 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={estimateState.windowOption || WINDOW_OPTION_OPTIONS[0]}
                        onChange={e => setEstimateState({ ...estimateState, windowOption: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {WINDOW_OPTION_OPTIONS.map(win => (
                          <option key={win} value={win}>
                            {win}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        シール形状・仕様 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={estimateState.packageForm || PACKAGE_FORM_OPTIONS[0]}
                        onChange={e => setEstimateState({ ...estimateState, packageForm: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {PACKAGE_FORM_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* その他の場合の直接入力欄 */}
                  {estimateState.packageForm === 'その他 (直接入力)' && (
                    <div>
                      <input
                        type="text"
                        value={customPackageForm}
                        onChange={e => setCustomPackageForm(e.target.value)}
                        placeholder="形状・仕様を入力してください (例: 特殊チャック袋)"
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">構成</label>
                      <input
                        type="text"
                        value={estimateState.structure || ''}
                        onChange={e => setEstimateState({ ...estimateState, structure: e.target.value })}
                        placeholder="例: PET12 / AL7 / LLDPE60"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">材質</label>
                      <input
                        type="text"
                        value={estimateState.material || ''}
                        onChange={e => setEstimateState({ ...estimateState, material: e.target.value })}
                        placeholder="例: アルミチャック袋"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      脱酸素剤使用の有無 <span className="text-[10px] font-normal text-slate-400">（真空の場合のみ記入）</span>
                    </label>
                    <div className="flex gap-4 items-center">
                      {['無', '有 (真空・窒素置換)', 'その他'].map(option => (
                        <label key={option} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="deoxidizer"
                            value={option}
                            checked={estimateState.deoxidizer === option}
                            onChange={e => setEstimateState({ ...estimateState, deoxidizer: e.target.value })}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 欠品商品明細（欠品納期問合せ時） */}
              {category === 'delivery_check' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-sky-600" />
                      欠品商品明細
                    </label>
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      商品行を追加
                    </button>
                  </div>

                  <div className="space-y-2">
                    {products.map(prod => (
                      <div
                        key={prod.id}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={prod.catalogNumber || ''}
                            onChange={e => handleProductChange(prod.id, 'catalogNumber', e.target.value)}
                            placeholder="カタログ№"
                            className="w-full p-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={prod.weightKg || ''}
                            onChange={e => handleProductChange(prod.id, 'weightKg', e.target.value)}
                            placeholder="容量(kg)"
                            className="w-full p-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            required
                            value={prod.productName}
                            onChange={e => handleProductChange(prod.id, 'productName', e.target.value)}
                            placeholder="商品名 (例: 風そよぐ稲 TS)"
                            className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-800"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={prod.quantity}
                            onChange={e => handleProductChange(prod.id, 'quantity', e.target.value)}
                            placeholder="必要数量"
                            className="w-full p-1.5 border border-slate-300 rounded text-right font-mono"
                          />
                        </div>
                        <div className="col-span-1">
                          <select
                            value={prod.unit}
                            onChange={e => handleProductChange(prod.id, 'unit', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-center font-bold"
                          >
                            <option value="枚">枚</option>
                            <option value="m">m</option>
                          </select>
                        </div>
                        <div className="col-span-1 text-center">
                          {products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(prod.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              title="行削除"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 備考・特記事項 */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  その他特記事項・備考
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="例: 特記事項やデザインについての連絡事項があれば入力してください。"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* 送信ボタン */}
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {loading ? '送信中...' : '依頼を登録する'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
