'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { NotificationModal } from '@/components/NotificationModal';
import { RequestResponseModal } from '@/components/RequestResponseModal';
import { RequestDetailModal } from '@/components/RequestDetailModal';
import { VoucherPreview } from '@/components/VoucherPreview';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  LayoutGrid,
  List,
  Columns,
  RefreshCw,
  Calendar,
  User,
  ArrowUpDown,
  UserCheck,
  AlertTriangle,
  Building2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { BusinessRequest } from '@/types/request';
import { STATUS_CONFIG } from '@/lib/constants';

export default function DashboardPage(): React.JSX.Element {
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // フィルター・検索状態
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequester, setSelectedRequester] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey] = useState<'id' | 'desiredDeliveryDate' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'split' | 'table' | 'cards'>('split');
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number>(0);

  // モーダル状態
  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);
  const [selectedResponseItem, setSelectedResponseItem] = useState<BusinessRequest | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<BusinessRequest | null>(null);

  // データ取得関数
  const fetchRequests = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) {
        throw new Error(`サーバーレスポンスエラー (${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      } else {
        setErrorMsg(json.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      console.error('データフェッチエラー:', err);
      setErrorMsg('通信エラーが発生しました。しばらく待ってから再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 発信者一覧の抽出 (ユニークリスト)
  const requesterList = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => {
      if (r.requesterName) set.add(r.requesterName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [requests]);

  // フィルタリングおよびソート適用
  const filteredRequests = useMemo(() => {
    return requests
      .filter(item => {
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
        if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
        if (selectedRequester !== 'all' && item.requesterName !== selectedRequester) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = item.id.toLowerCase().includes(q);
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchReq = item.requesterName.toLowerCase().includes(q);
          const matchAss = (item.assigneeName || '').toLowerCase().includes(q);
          const matchCust = item.customerName.toLowerCase().includes(q);
          const matchDetails = item.details.toLowerCase().includes(q);
          const matchFactoryName = (item.estimateResponse?.factoryName || '').toLowerCase().includes(q);
          const matchFactoryCode = (item.estimateResponse?.factoryCode || '').toLowerCase().includes(q);
          if (!matchId && !matchTitle && !matchReq && !matchAss && !matchCust && !matchDetails && !matchFactoryName && !matchFactoryCode) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortKey] || '';
        let valB = b[sortKey] || '';
        if (sortOrder === 'asc') return valA.localeCompare(valB);
        return valB.localeCompare(valA);
      });
  }, [requests, selectedCategory, selectedStatus, selectedRequester, searchQuery, sortKey, sortOrder]);

  // 2ペイン表示時のキーボード操作（↑ / ↓ キーで選択依頼を高速切り替え）
  useEffect(() => {
    if (viewMode !== 'split' || isNotifModalOpen || selectedResponseItem || selectedDetailItem) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      // 検索バー等に入力フォーカスがある場合は無視
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedSplitIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedSplitIndex(prev => Math.min(filteredRequests.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, filteredRequests.length, isNotifModalOpen, selectedResponseItem, selectedDetailItem]);

  // フィルタリング結果が変化したときに index が範囲外にならないよう補正
  useEffect(() => {
    if (selectedSplitIndex >= filteredRequests.length && filteredRequests.length > 0) {
      setSelectedSplitIndex(filteredRequests.length - 1);
    }
  }, [filteredRequests.length, selectedSplitIndex]);

  // 希望納期の期限判定スタイル計算関数
  const getDeliveryDateStyle = (desiredDate: string, status: string) => {
    if (status === 'completed' || status === 'answered') {
      return { style: 'text-slate-600 font-medium', isOverdue: false, isImminent: false, label: desiredDate };
    }
    if (!desiredDate) {
      return { style: 'text-slate-400', isOverdue: false, isImminent: false, label: '-' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(desiredDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        style: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm',
        isOverdue: true,
        isImminent: false,
        label: `${desiredDate} (超過)`,
      };
    } else if (diffDays === 0 || diffDays === 1) {
      return {
        style: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm',
        isOverdue: false,
        isImminent: true,
        label: diffDays === 0 ? `${desiredDate} (本日)` : `${desiredDate} (明日)`,
      };
    } else {
      return {
        style: 'text-slate-700 font-bold',
        isOverdue: false,
        isImminent: false,
        label: desiredDate,
      };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 print:hidden">
        {/* 上部サマリーカード */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">全依頼数</p>
              <p className="text-2xl font-black text-slate-800">{requests.length}</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 font-bold">未着手・対応待ち</p>
              <p className="text-2xl font-black text-amber-700">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-sky-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-800 font-bold">確認中・対応中</p>
              <p className="text-2xl font-black text-sky-700">
                {requests.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-bold">回答済み</p>
              <p className="text-2xl font-black text-emerald-700">
                {requests.filter(r => r.status === 'answered' || (r.status as any) === 'completed').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* フィルター＆操作バー */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'すべての依頼' },
                { key: 'delivery_check', label: '欠品/納期問合せ' },
                { key: 'estimate_request', label: '見積依頼' },
                { key: 'sample_request', label: 'サンプル手配' },
                { key: 'other', label: 'その他' },
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchRequests}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                title="最新情報に更新"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === 'split' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="2ペイン表示 (一覧 ＋ 伝票プレビュー)"
                >
                  <Columns className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">2ペイン</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="一覧表テーブル表示"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">表</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="カード表示"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">カード</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="依頼番号、件名、得意先CD、工場名、工場コード..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-2 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />

              {/* 発信者選択ドロップダウン */}
              <select
                value={selectedRequester}
                onChange={e => setSelectedRequester(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">全発信者</option>
                {requesterList.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              {/* ステータス選択ドロップダウン */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">全ステータス</option>
                <option value="pending">未着手</option>
                <option value="in_progress">確認中</option>
                <option value="answered">回答済み</option>
                <option value="on_hold">保留</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                {sortOrder === 'desc' ? '降順' : '昇順'}
              </button>
            </div>
          </div>
        </div>

        {/* 依頼リスト本体 */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">データを読み込み中...</div>
        ) : errorMsg ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm text-center">
            {errorMsg}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-base">該当する依頼が見つかりません</p>
            <p className="text-xs text-slate-400 mt-1">検索条件を変更するか、新しい依頼を登録してください。</p>
          </div>
        ) : viewMode === 'split' ? (
          /* 2ペイン（一覧 ＋ 伝票プレビュー横並び）モード */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左側: 依頼一覧リスト */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-500 pb-1 border-b border-slate-200">
                <span>該当依頼: {filteredRequests.length}件</span>
                <span className="text-sky-600 bg-sky-50 px-2 py-0.5 rounded font-mono">
                  [ ↑ / ↓ キーで選択切替 ]
                </span>
              </div>

              {filteredRequests.map((req, idx) => {
                const isSelected = selectedSplitIndex === idx;
                const categoryBadge =
                  req.category === 'delivery_check' ? 'bg-sky-100 text-sky-800' :
                  req.category === 'estimate_request' ? 'bg-indigo-100 text-indigo-800' :
                  req.category === 'sample_request' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800';

                const stKey = (req.status as string) === 'completed' ? 'answered' : req.status;
                const stConf = STATUS_CONFIG[stKey] || STATUS_CONFIG.pending;
                const deliveryStyle = getDeliveryDateStyle(req.desiredDeliveryDate, req.status);

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedSplitIndex(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/90 shadow-md ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-sky-900">{req.id}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${categoryBadge}`}>
                          {req.category === 'delivery_check' ? '納期' :
                           req.category === 'estimate_request' ? '見積' :
                           req.category === 'sample_request' ? 'サンプル' : '他'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${stConf.badgeStyle}`}>
                        {stConf.label}
                      </span>
                    </div>

                    <div>
                      <p className={`font-bold text-sm line-clamp-1 ${isSelected ? 'text-sky-950' : 'text-slate-900'}`}>
                        {req.title}
                      </p>
                      {req.products && req.products.length > 0 ? (
                        <p className="text-slate-600 font-semibold text-[11px] truncate mt-0.5">
                          明細: {req.products.map(p => p.productName).join(', ')}
                        </p>
                      ) : (
                        <p className="text-slate-500 line-clamp-1 text-[11px] mt-0.5">{req.details}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 truncate max-w-[55%]">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.requesterName}</span>
                        {req.customerName && (
                          <span className="text-slate-400 truncate">({req.customerName})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className={deliveryStyle.style}>{req.desiredDeliveryDate || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 右側: 選択中の伝票プレビュー (Sticky) */}
            <div className="lg:col-span-7 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <VoucherPreview
                requestItem={filteredRequests[selectedSplitIndex] || null}
                currentIndex={selectedSplitIndex}
                totalCount={filteredRequests.length}
                onNavigatePrev={() => setSelectedSplitIndex(prev => Math.max(0, prev - 1))}
                onNavigateNext={() => setSelectedSplitIndex(prev => Math.min(filteredRequests.length - 1, prev + 1))}
                hasPrev={selectedSplitIndex > 0}
                hasNext={selectedSplitIndex < filteredRequests.length - 1}
              />
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-3">依頼番号</th>
                  <th className="p-3">発信者</th>
                  <th className="p-3">業務担当者</th>
                  <th className="p-3">カテゴリ</th>
                  <th className="p-3">件名 / 依頼内容</th>
                  <th className="p-3">工場コード</th>
                  <th className="p-3">工場名</th>
                  <th className="p-3">得意先 (CD)</th>
                  <th className="p-3">希望納期</th>
                  <th className="p-3">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => {
                  const categoryBadge =
                    req.category === 'delivery_check' ? 'bg-sky-100 text-sky-800' :
                    req.category === 'estimate_request' ? 'bg-indigo-100 text-indigo-800' :
                    req.category === 'sample_request' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800';

                  const stKey = (req.status as string) === 'completed' ? 'answered' : req.status;
                  const stConf = STATUS_CONFIG[stKey] || STATUS_CONFIG.pending;
                  const deliveryStyle = getDeliveryDateStyle(req.desiredDeliveryDate, req.status);

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-sky-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDetailItem(req)}
                      title="クリックして回答・詳細を確認"
                    >
                      <td className="p-3 font-mono font-bold text-sky-800 whitespace-nowrap">
                        {req.id}
                      </td>
                      {/* 発信者 (営業 / CCR) */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{req.requesterName}</span>
                        <span className="text-[10px] text-slate-500 block font-bold">
                          {req.requesterDept === 'sales' ? '営業' : 'CCR'}
                        </span>
                      </td>
                      {/* 担当者 */}
                      <td className="p-3 whitespace-nowrap">
                        {req.assigneeName ? (
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            {req.assigneeName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">未割当</span>
                        )}
                      </td>
                      {/* カテゴリ */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${categoryBadge}`}>
                          {req.category === 'delivery_check' ? '欠品問合せ' :
                           req.category === 'estimate_request' ? '見積依頼' :
                           req.category === 'sample_request' ? 'サンプル' : 'その他'}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-bold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                          {req.title}
                        </p>
                        {req.products && req.products.length > 0 ? (
                          <p className="text-sky-700 font-semibold text-[11px] truncate">
                            明細: {req.products.map(p => p.productName).join(', ')}
                          </p>
                        ) : (
                          <p className="text-slate-400 line-clamp-1 text-[11px]">{req.details}</p>
                        )}
                      </td>
                      {/* 工場コード */}
                      <td className="p-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                        {req.estimateResponse?.factoryCode || '-'}
                      </td>
                      {/* 工場名 */}
                      <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                        {req.estimateResponse?.factoryName || '-'}
                      </td>
                      {/* 得意先 (CD) */}
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {req.customerName || '未指定'}
                        {req.customerCode ? <span className="text-[10px] text-slate-400 block font-mono">CD: {req.customerCode}</span> : null}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={deliveryStyle.style}>
                          {(deliveryStyle.isOverdue || deliveryStyle.isImminent) && (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {deliveryStyle.label}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${stConf.badgeStyle}`}>
                          {stConf.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map(req => (
              <div
                key={req.id}
                onClick={() => setSelectedDetailItem(req)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-sky-800">{req.id}</span>
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {req.desiredDeliveryDate}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors line-clamp-1">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{req.details}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{req.requesterName} ({req.requesterDept === 'sales' ? '営業' : 'CCR'})</span>
                  </div>

                  <span className="text-[11px] font-bold text-sky-600 group-hover:underline">
                    詳細・回答を見る →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* モーダル群 */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />

      <RequestResponseModal
        requestItem={selectedResponseItem}
        isOpen={!!selectedResponseItem}
        onClose={() => setSelectedResponseItem(null)}
        onSuccess={fetchRequests}
      />

      {/* ポータル画面では閲覧専用のため onOpenResponseModal を渡さない */}
      <RequestDetailModal
        requestItem={selectedDetailItem}
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
      />
    </div>
  );
}
