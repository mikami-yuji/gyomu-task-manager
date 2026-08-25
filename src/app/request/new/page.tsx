'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { NotificationModal } from '@/components/NotificationModal';
import { getSavedUserProfile } from '@/lib/user';
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
  Building,
  UserCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { RequestCategory, Department, ProductItem, EstimateDetails, WorkOrderDetails, FactoryMasterItem } from '@/types/request';
import {
  SALES_PERSONS,
  CCR_PERSONS,
  GYOMU_PERSONS,
  FACTORY_MASTERS,
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

  // 工場名・工場コード・業務担当者
  const [factoryName, setFactoryName] = useState<string>('');
  const [factoryCode, setFactoryCode] = useState<string>('');
  const [assigneeName, setAssigneeName] = useState<string>('');

  // 動的マスターリスト
  const [salesMembers, setSalesMembers] = useState<string[]>([...SALES_PERSONS]);
  const [ccrMembers, setCcrMembers] = useState<string[]>([...CCR_PERSONS]);
  const [gyomuMembers, setGyomuMembers] = useState<string[]>([...GYOMU_PERSONS]);
  const [factoryList, setFactoryList] = useState<FactoryMasterItem[]>([...FACTORY_MASTERS]);

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

  // 仕掛手配（商品仕掛依頼書）専用フォーム状態
  const [workOrderState, setWorkOrderState] = useState<WorkOrderDetails>({
    orderDate: new Date().toISOString().split('T')[0],
    desiredDeliveryDate: '',
    customerName: '',
    customerCode: '',
    productNumberWeight: '',
    productName: '',
    finishForm: '',
    quantity: '',
    salesPersonName: '',
    branch: '大阪本社',
    supplierName: '',
  });

  const [customPackageForm, setCustomPackageForm] = useState<string>('');
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState<boolean>(false);

  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  /**
   * 入力内容に応じた件名の自動生成関数
   */
  const computeAutoTitle = (
    cat: RequestCategory,
    custName: string,
    prods: ProductItem[],
    est: EstimateDetails
  ): string => {
    const prefix =
      cat === 'delivery_check' ? '【欠品納期問合せ】' :
      cat === 'estimate_request' ? '【見積依頼】' :
      (cat === 'sample_request' || cat === 'work_order') ? '【仕掛手配】' : '【その他】';

    const firstProd = prods[0];
    const prodParts: string[] = [];

    if (firstProd) {
      if (firstProd.catalogNumber?.trim()) prodParts.push(firstProd.catalogNumber.trim());
      if (firstProd.weightKg?.trim()) {
        const w = firstProd.weightKg.trim();
        prodParts.push(w.toLowerCase().includes('kg') || w.includes('ｋｇ') ? w : `${w}kg`);
      }
      if (firstProd.quantity?.trim()) {
        prodParts.push(`${firstProd.quantity.trim()}${firstProd.unit || ''}`);
      }
    }

    const prodSummary = prodParts.join('-');

    if (cat === 'delivery_check' || cat === 'sample_request' || cat === 'work_order') {
      if (prodSummary) {
        return `${prefix}${custName ? `${custName}様 ` : ''}${prodSummary}${firstProd?.productName ? ` ${firstProd.productName}` : ''}`;
      }
      if (firstProd?.productName?.trim()) {
        return `${prefix}${custName ? `${custName}様 ` : ''}${firstProd.productName.trim()}`;
      }
      return custName ? `${prefix}${custName}様` : prefix;
    }

    if (cat === 'estimate_request') {
      const specParts: string[] = [];
      if (est.capacity?.trim()) specParts.push(est.capacity.trim());
      if (est.packageType) specParts.push(est.packageType);
      if (est.quantity?.trim()) specParts.push(est.quantity.trim());
      const specSummary = specParts.join(' ');

      if (specSummary) {
        return `${prefix}${custName ? `${custName}様 ` : ''}${specSummary}`;
      }
      return custName ? `${prefix}${custName}様 お見積り` : prefix;
    }

    return custName ? `${prefix}${custName}様 連絡事項` : prefix;
  };

  // 入力内容の変更に応じて件名をリアルタイム自動生成（手動で編集していない場合）
  useEffect(() => {
    if (!isTitleManuallyEdited) {
      const auto = computeAutoTitle(category, customerName, products, estimateState);
      setTitle(auto);
    }
  }, [category, customerName, products, estimateState, isTitleManuallyEdited]);

  const handleForceRegenerateTitle = () => {
    const auto = computeAutoTitle(category, customerName, products, estimateState);
    setTitle(auto);
    setIsTitleManuallyEdited(false);
  };

  useEffect(() => {
    const savedUser = getSavedUserProfile();
    if (savedUser) {
      setRequesterName(savedUser.name);
      if (savedUser.dept === 'sales' || savedUser.dept === 'ccr') {
        setRequesterDept(savedUser.dept);
      }
    }

    // マスターデータの非同期フェッチ
    fetch('/api/settings/masters')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          if (json.data.sales && json.data.sales.length > 0) setSalesMembers(json.data.sales);
          if (json.data.ccr && json.data.ccr.length > 0) setCcrMembers(json.data.ccr);
          if (json.data.gyomu && json.data.gyomu.length > 0) setGyomuMembers(json.data.gyomu);
          if (json.data.factories && json.data.factories.length > 0) setFactoryList(json.data.factories);
          
          // ログインユーザーが未設定の場合のみ初期値セット
          if (!savedUser) {
            setRequesterName(json.data.sales?.[0] || SALES_PERSONS[0]);
          }
        }
      })
      .catch(err => {
        console.error('マスター取得失敗:', err);
        if (!savedUser) {
          setRequesterName(SALES_PERSONS[0]);
        }
      });
  }, []);

  // ① 工場名選択時の連動（工場コード ＆ 担当者を記載）
  const handleFactoryNameChange = (name: string): void => {
    setFactoryName(name);
    const matched = factoryList.find(f => f.name === name);
    if (matched) {
      setFactoryCode(matched.code || '');
      if (matched.defaultAssignee) {
        setAssigneeName(matched.defaultAssignee);
      }
    } else if (!name) {
      setFactoryCode('');
    }
  };

  // ② 工場コード入力・選択時の連動（工場名 ＆ 担当者を記載）
  const handleFactoryCodeChange = (code: string): void => {
    setFactoryCode(code);
    const matched = factoryList.find(f => f.code === code || f.code.toLowerCase() === code.toLowerCase());
    if (matched) {
      setFactoryName(matched.name);
      if (matched.defaultAssignee) {
        setAssigneeName(matched.defaultAssignee);
      }
    }
  };

  // ③ 業務担当者選択時のスマート連動（担当の工場リストから自動選択・選択肢絞り込み）
  const handleAssigneeNameChange = (person: string): void => {
    setAssigneeName(person);
    if (person) {
      const assignedFactories = factoryList.filter(f => f.defaultAssignee === person);
      if (assignedFactories.length === 1) {
        // 担当工場が1つの場合はその工場とコードを即座にセット
        setFactoryName(assignedFactories[0].name);
        setFactoryCode(assignedFactories[0].code);
      } else if (assignedFactories.length > 1) {
        // 複数の担当工場がある場合、現在選択中の工場がその中に無ければ未選択にしてドロップダウンから選択させる
        const currentIsAssigned = assignedFactories.some(f => f.name === factoryName);
        if (!currentIsAssigned) {
          setFactoryName('');
          setFactoryCode('');
        }
      }
    }
  };

  // 選択された業務担当者が担当している工場リスト
  const filteredFactories = assigneeName
    ? factoryList.filter(f => f.defaultAssignee === assigneeName)
    : [];

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
    setIsTitleManuallyEdited(false);
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
      const isWorkOrder = category === 'sample_request' || category === 'work_order';

      const validProducts = (category === 'delivery_check' || isWorkOrder)
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
          title: title || (category === 'estimate_request' ? '【見積依頼】' : isWorkOrder ? '【仕掛手配】' : '【業務課依頼】'),
          requesterName,
          requesterDept,
          issuerName: issuerName || undefined,
          customerName,
          customerCode: customerCode || undefined,
          factoryName: factoryName || undefined,
          factoryCode: factoryCode || undefined,
          assigneeName: assigneeName || undefined,
          desiredDeliveryDate,
          details,
          products: validProducts,
          estimateDetails: finalEstimateDetails,
          approvalStatus: isWorkOrder ? 'pending' : undefined,
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
    setIsTitleManuallyEdited(false);
    const savedUser = getSavedUserProfile();
    if (savedUser) {
      setRequesterName(savedUser.name);
      if (savedUser.dept === 'sales' || savedUser.dept === 'ccr') {
        setRequesterDept(savedUser.dept);
      }
    } else {
      setRequesterName(salesMembers[0] || '');
      setRequesterDept('sales');
    }
    setCustomerName('');
    setCustomerCode('');
    setFactoryName('');
    setFactoryCode('');
    setAssigneeName('');
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
      <Header onOpenNotifications={() => setIsNotifModalOpen(true)} />

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
                    { key: 'sample_request', label: '仕掛手配', icon: Package, desc: '商品仕掛依頼書・製造手配' },
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

              {/* 件名（自動生成対応） */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    件名 <span className="text-rose-500">*</span>
                    {!isTitleManuallyEdited && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full border border-sky-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sky-500" />
                        内容から自動生成中
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleForceRegenerateTitle}
                    className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline transition-all"
                    title="入力された商品や得意先名から件名を再生成します"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>内容から再生成</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      setIsTitleManuallyEdited(true);
                    }}
                    placeholder="例: 【欠品納期問合せ】909-5kg-4000m"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ※ 得意先名や商品明細（カタログ№・容量・数量等）を入力すると、件名が自動で分かりやすく組み立てられます（直接手動編集も可能です）。
                </p>
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

              {/* 工場名・工場コード・業務担当者（担当選択で工場ドロップダウンが絞り込み＆連動） */}
              <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-indigo-600" />
                    依頼先工場 ＆ 業務担当者設定 <span className="text-[10px] font-normal text-slate-500">（担当を選ぶと受持ち工場を優先表示）</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* 業務担当者 */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                      業務担当者
                    </label>
                    <select
                      value={assigneeName}
                      onChange={e => handleAssigneeNameChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">-- 全担当者 --</option>
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
                      value={factoryName}
                      onChange={e => handleFactoryNameChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- 工場を選択 --</option>

                      {/* 業務担当者が選ばれている場合、その担当の工場を上に表示 */}
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
                            {f.name} (CD: {f.code}) {f.defaultAssignee ? `[担当:${f.defaultAssignee}]` : ''}
                          </option>
                        ))}
                      </optgroup>
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
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
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

              {/* 仕掛手配選択時の上長認証ステップ案内 */}
              {(category === 'sample_request' || category === 'work_order') && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-3 shadow-sm">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0 mt-0.5">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                      【上長認証システム対象】仕掛手配の承認フロー
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      仕掛手配は登録後、<strong>「上長承認待ち」</strong>として保存されます。上長による確認・承認（認証印の押印）完了後、業務課にて手配が進められます。
                    </p>
                  </div>
                </div>
              )}

              {/* 商品明細（欠品納期問合せ ＆ 仕掛手配時共通） */}
              {(category === 'delivery_check' || category === 'sample_request' || category === 'work_order') && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-sky-600" />
                      {category === 'delivery_check' ? '欠品商品明細' : '手配商品明細（仕掛手配）'}
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

      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />
    </div>
  );
}
