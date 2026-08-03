'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { NotificationModal } from '@/components/NotificationModal';
import { RequestResponseModal } from '@/components/RequestResponseModal';
import { RequestDetailModal } from '@/components/RequestDetailModal';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  Calendar,
  Clock,
  Download,
  Users,
  Tag,
  ArrowUpDown,
  CheckSquare,
  Send,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { BusinessRequest, RequestStatus } from '@/types/request';
import { GYOMU_PERSONS, STATUS_CONFIG } from '@/lib/constants';

export default function AdminDashboardPage(): React.JSX.Element {
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [gyomuMembers, setGyomuMembers] = useState<string[]>([...GYOMU_PERSONS]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // フィルター・絞り込み状態
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 選択中チェックボックス（一括処理用）
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchAssignee, setBatchAssignee] = useState<string>(GYOMU_PERSONS[0]);
  const [batchStatus, setBatchStatus] = useState<RequestStatus>('in_progress');
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  // モーダル状態
  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);
  const [selectedResponseItem, setSelectedResponseItem] = useState<BusinessRequest | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<BusinessRequest | null>(null);

  // データフェッチ
  const fetchRequests = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/requests');
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      } else {
        setErrorMsg(json.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetch('/api/settings/masters')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data && json.data.gyomu && json.data.gyomu.length > 0) {
          setGyomuMembers(json.data.gyomu);
          setBatchAssignee(json.data.gyomu[0]);
        }
      })
      .catch(err => console.error('マスター取得エラー:', err));
  }, []);

  // 担当者一覧の抽出 (gyomuMembers + 実際の依頼データの担当者)
  const assigneeList = useMemo(() => {
    const set = new Set<string>(gyomuMembers);
    requests.forEach(r => {
      if (r.assigneeName) set.add(r.assigneeName);
    });
    return Array.from(set);
  }, [requests, gyomuMembers]);

  // 選択中の担当者で絞り込んだ依頼リスト（カテゴリの件数集計用）
  const assigneeFilteredRequests = useMemo(() => {
    if (selectedAssignee === 'all') return requests;
    return requests.filter(r => r.assigneeName === selectedAssignee);
  }, [requests, selectedAssignee]);

  // フィルタリング処理（テーブル表示用）
  const filteredRequests = useMemo(() => {
    return requests
      .filter(item => {
        // 担当者フィルター
        if (selectedAssignee !== 'all' && item.assigneeName !== selectedAssignee) return false;

        // カテゴリ・ステータス
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
        if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

        // 検索ワード
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = item.id.toLowerCase().includes(q);
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchReq = item.requesterName.toLowerCase().includes(q);
          const matchCust = item.customerName.toLowerCase().includes(q);
          const matchCode = (item.customerCode || '').toLowerCase().includes(q);
          const matchFactoryName = (item.estimateResponse?.factoryName || '').toLowerCase().includes(q);
          const matchFactoryCode = (item.estimateResponse?.factoryCode || '').toLowerCase().includes(q);
          if (!matchId && !matchTitle && !matchReq && !matchCust && !matchCode && !matchFactoryName && !matchFactoryCode) return false;
        }

        // 日付範囲
        if (startDate && item.desiredDeliveryDate < startDate) return false;
        if (endDate && item.desiredDeliveryDate > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') return a.id.localeCompare(b.id);
        return b.id.localeCompare(a.id);
      });
  }, [requests, selectedAssignee, selectedStatus, selectedCategory, searchQuery, startDate, endDate, sortOrder]);

  // 希望納期の期限判定スタイル計算関数
  const getDeliveryDateStyle = (desiredDate: string, status: string) => {
    if (status === 'completed' || status === 'answered') {
      return { style: 'text-slate-600 font-medium', isOverdue: false, isImminent: false };
    }
    if (!desiredDate) {
      return { style: 'text-slate-400', isOverdue: false, isImminent: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(desiredDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // 期限超過（赤色）
      return {
        style: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm',
        isOverdue: true,
        isImminent: false,
        label: `${desiredDate} (超過)`,
      };
    } else if (diffDays === 0 || diffDays === 1) {
      // 当日または1日前（黄色）
      return {
        style: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm',
        isOverdue: false,
        isImminent: true,
        label: diffDays === 0 ? `${desiredDate} (本日)` : `${desiredDate} (明日)`,
      };
    } else {
      // 通常
      return {
        style: 'text-slate-700 font-bold',
        isOverdue: false,
        isImminent: false,
        label: desiredDate,
      };
    }
  };

  // 全選択・個別選択チェックボックス
  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedIds(filteredRequests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string): void => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 一括更新処理実行
  const handleBatchUpdate = async (type: 'assign' | 'status'): Promise<void> => {
    if (selectedIds.length === 0) return;
    setBatchProcessing(true);
    try {
      const payload = {
        ids: selectedIds,
        assigneeName: type === 'assign' ? batchAssignee : undefined,
        status: type === 'status' ? batchStatus : undefined,
      };

      const res = await fetch('/api/requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSelectedIds([]);
        fetchRequests();
      } else {
        alert(json.error || '一括更新に失敗しました');
      }
    } catch (err) {
      console.error('一括更新エラー:', err);
      alert('通信エラーが発生しました');
    } finally {
      setBatchProcessing(false);
    }
  };

  // CSV エクスポート機能
  const handleExportCSV = (): void => {
    if (filteredRequests.length === 0) return;

    const headers = [
      '依頼番号',
      'カテゴリ',
      '件名',
      '発信部署',
      '発信者名',
      '得意先名',
      '工場コード',
      '工場名',
      '得意先コード',
      '希望納期',
      'ステータス',
      '業務担当者',
      '仕入/入荷予定日',
      '入荷予定数量',
      '受注番号',
      '業務回答コメント',
      '登録日時',
    ];

    const rows = filteredRequests.map(r => [
      r.id,
      r.category === 'delivery_check' ? '欠品/納期問合せ' : r.category === 'estimate_request' ? '見積依頼' : 'その他',
      `"${r.title.replace(/"/g, '""')}"`,
      r.requesterDept === 'sales' ? '営業' : 'CCR',
      r.requesterName,
      `"${r.customerName.replace(/"/g, '""')}"`,
      r.estimateResponse?.factoryCode || '',
      `"${(r.estimateResponse?.factoryName || '').replace(/"/g, '""')}"`,
      r.customerCode || '',
      r.desiredDeliveryDate,
      STATUS_CONFIG[r.status]?.label || (r.status as string) === 'completed' ? '回答済み' : r.status,
      r.assigneeName || '',
      r.scheduledPurchaseDate || '',
      r.incomingQuantity || '',
      r.orderNumber || '',
      `"${(r.responseContent || '').replace(/"/g, '""')}"`,
      new Date(r.createdAt).toLocaleString('ja-JP'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gyomu_requests_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header onOpenNotifications={() => setIsNotifModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* タイトルヘッダー */}
        <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              業務課専用 管理ポータル
            </span>
            <h1 className="text-2xl font-black mt-1">進捗管理 ＆ 担当割り当てダッシュボード</h1>
            <p className="text-xs text-slate-300 mt-1">
              業務課の担当者ごとの進捗確認、一括割り当て、回答の追跡管理を行えます。
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              CSVエクスポート
            </button>
            <button
              onClick={fetchRequests}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              title="最新情報に更新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 統計カウンター（回答済みをグリーン化＆完了を撤去） */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">全件</p>
              <p className="text-2xl font-black text-slate-800">{requests.length}</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 font-bold">未着手・対応待ち</p>
              <p className="text-2xl font-black text-amber-700">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-sky-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-800 font-bold">確認中・対応中</p>
              <p className="text-2xl font-black text-sky-700">
                {requests.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-bold">回答済み</p>
              <p className="text-2xl font-black text-emerald-700">
                {requests.filter(r => r.status === 'answered' || (r.status as any) === 'completed').length}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* フィルター＆コントローラー */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          {/* ① 業務担当者選択フィルター */}
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <Users className="w-5 h-5 text-sky-600 shrink-0" />
            <label className="text-xs font-bold text-slate-700 shrink-0">業務担当者:</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedAssignee('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAssignee === 'all'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全員 ({requests.length})
              </button>

              {assigneeList.map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedAssignee(name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedAssignee === name
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {name} ({requests.filter(r => r.assigneeName === name).length})
                </button>
              ))}
            </div>
          </div>

          {/* ② カテゴリ選択フィルター */}
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <Tag className="w-5 h-5 text-sky-600 shrink-0" />
            <label className="text-xs font-bold text-slate-700 shrink-0">カテゴリ:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'すべて', count: assigneeFilteredRequests.length },
                { key: 'delivery_check', label: '欠品/納期問合せ', count: assigneeFilteredRequests.filter(r => r.category === 'delivery_check').length },
                { key: 'estimate_request', label: '見積依頼', count: assigneeFilteredRequests.filter(r => r.category === 'estimate_request').length },
                { key: 'sample_request', label: 'サンプル手配', count: assigneeFilteredRequests.filter(r => r.category === 'sample_request').length },
                { key: 'other', label: 'その他', count: assigneeFilteredRequests.filter(r => r.category === 'other').length },
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* ③ 検索・日付フィルター・ソート */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="依頼番号、件名、得意先CD、工場名、工場コード..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                placeholder="開始日"
              />
              <span className="text-slate-400 text-xs">～</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                placeholder="終了日"
              />
            </div>

            <div className="flex items-center space-x-2 justify-end">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
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
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortOrder === 'desc' ? '降順' : '昇順'}
              </button>
            </div>
          </div>
        </div>

        {/* ④ 一括処理操作バー（チェック時のみ出現） */}
        {selectedIds.length > 0 && (
          <div className="p-4 bg-sky-900 text-white rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center space-x-2 text-xs font-bold">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>選択中: {selectedIds.length}件</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 一括担当者アサイン（セレクトボックスから選択） */}
              <div className="flex items-center space-x-1.5">
                <select
                  value={batchAssignee}
                  onChange={e => setBatchAssignee(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  {gyomuMembers.map(person => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={batchProcessing}
                  onClick={() => handleBatchUpdate('assign')}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-all"
                >
                  業務担当者を一括設定
                </button>
              </div>

              {/* 一括ステータス変更 */}
              <div className="flex items-center space-x-1.5 border-l border-slate-700 pl-3">
                <select
                  value={batchStatus}
                  onChange={e => setBatchStatus(e.target.value as RequestStatus)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  <option value="in_progress">確認中</option>
                  <option value="answered">回答済み</option>
                  <option value="on_hold">保留</option>
                </select>
                <button
                  type="button"
                  disabled={batchProcessing}
                  onClick={() => handleBatchUpdate('status')}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-all"
                >
                  ステータスを一括変更
                </button>
              </div>
            </div>
          </div>
        )}

        {/* データ一覧テーブル */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">データを読み込み中...</div>
        ) : errorMsg ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm text-center">
            {errorMsg}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-base">対象の依頼がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </th>
                  <th className="p-3">依頼番号</th>
                  <th className="p-3">業務担当者</th>
                  <th className="p-3">発信者</th>
                  <th className="p-3">カテゴリ</th>
                  <th className="p-3">件名 / 明細</th>
                  <th className="p-3">工場コード</th>
                  <th className="p-3">工場名</th>
                  <th className="p-3">得意先CD</th>
                  <th className="p-3">希望納期</th>
                  <th className="p-3">ステータス</th>
                  <th className="p-3 text-right">管理操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => {
                  const isSelected = selectedIds.includes(req.id);
                  const stKey = (req.status as string) === 'completed' ? 'answered' : req.status;
                  const stConf = STATUS_CONFIG[stKey] || STATUS_CONFIG.pending;
                  const deliveryStyle = getDeliveryDateStyle(req.desiredDeliveryDate, req.status);

                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/60' : ''
                      }`}
                      onClick={() => setSelectedDetailItem(req)}
                    >
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(req.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </td>

                      <td className="p-3 font-mono font-bold text-sky-800 whitespace-nowrap">
                        {req.id}
                      </td>

                      {/* 業務担当者 */}
                      <td className="p-3 whitespace-nowrap">
                        {req.assigneeName ? (
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            {req.assigneeName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">未割り当て</span>
                        )}
                      </td>

                      {/* 発信者 */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{req.requesterName}</span>
                        <span className="text-[10px] text-slate-400 block font-bold">
                          {req.requesterDept === 'sales' ? '営業' : 'CCR'}
                        </span>
                      </td>

                      {/* カテゴリ */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                          {req.category === 'delivery_check' ? '欠品問合せ' :
                           req.category === 'estimate_request' ? '見積依頼' : 'その他'}
                        </span>
                      </td>

                      {/* 件名 */}
                      <td className="p-3 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{req.title}</p>
                        {req.customerName && (
                          <p className="text-slate-500 text-[11px] truncate">得意先: {req.customerName}</p>
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

                      {/* 得意先CD */}
                      <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                        {req.customerCode || '-'}
                      </td>

                      {/* 希望納期（色付け・アラートハイライト表示） */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={deliveryStyle.style}>
                          {(deliveryStyle.isOverdue || deliveryStyle.isImminent) && (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {deliveryStyle.label || req.desiredDeliveryDate}
                        </span>
                      </td>

                      {/* ステータス */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${stConf.badgeStyle}`}>
                          {stConf.label}
                        </span>
                      </td>

                      {/* 管理操作 */}
                      <td className="p-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedResponseItem(req)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ml-auto shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          回答・編集
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      <RequestDetailModal
        requestItem={selectedDetailItem}
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        onOpenResponseModal={item => setSelectedResponseItem(item)}
      />
    </div>
  );
}
