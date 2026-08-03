'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, CheckCircle2, UserPlus, Users, Settings, Building, AtSign, UserCheck } from 'lucide-react';
import { MemberMaster, FactoryMasterItem } from '@/types/request';
import { GYOMU_PERSONS, FACTORY_MASTERS } from '@/lib/constants';

type NotificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationModal({ isOpen, onClose }: NotificationModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'masters' | 'factories'>('masters');
  const [masters, setMasters] = useState<MemberMaster>({
    sales: [],
    ccr: [],
    gyomu: [...GYOMU_PERSONS],
    factories: [...FACTORY_MASTERS],
    memberEmails: {},
  });
  const [activeMasterDept, setActiveMasterDept] = useState<'sales' | 'ccr' | 'gyomu'>('gyomu');
  
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newFactoryName, setNewFactoryName] = useState<string>('');
  const [newFactoryCode, setNewFactoryCode] = useState<string>('');
  const [newFactoryAssignee, setNewFactoryAssignee] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
    }
  }, [isOpen]);

  const fetchMasters = async (): Promise<void> => {
    try {
      const res = await fetch('/api/settings/masters');
      const json = await res.json();
      if (json.success && json.data) {
        setMasters({
          sales: Array.from(new Set(json.data.sales || [])),
          ccr: Array.from(new Set(json.data.ccr || [])),
          gyomu: Array.from(new Set(json.data.gyomu || [...GYOMU_PERSONS])),
          factories: json.data.factories || [...FACTORY_MASTERS],
          memberEmails: json.data.memberEmails || {},
        });
      }
    } catch (err) {
      console.error('マスター取得エラー:', err);
    }
  };

  if (!isOpen) return null;

  // メンバー追加
  const handleAddMember = (): void => {
    if (!newMemberName.trim()) return;
    const name = newMemberName.trim();
    const emails = { ...(masters.memberEmails || {}) };
    if (newMemberEmail.trim()) {
      emails[name] = newMemberEmail.trim();
    }

    if (activeMasterDept === 'sales') {
      if (masters.sales.includes(name)) return;
      setMasters({ ...masters, sales: Array.from(new Set([...masters.sales, name])), memberEmails: emails });
    } else if (activeMasterDept === 'ccr') {
      if (masters.ccr.includes(name)) return;
      setMasters({ ...masters, ccr: Array.from(new Set([...masters.ccr, name])), memberEmails: emails });
    } else {
      if (masters.gyomu.includes(name)) return;
      setMasters({ ...masters, gyomu: Array.from(new Set([...masters.gyomu, name])), memberEmails: emails });
    }
    setNewMemberName('');
    setNewMemberEmail('');
  };

  // メンバーメール変更
  const handleMemberEmailChange = (memberName: string, email: string): void => {
    const updatedEmails = { ...(masters.memberEmails || {}) };
    if (email.trim()) {
      updatedEmails[memberName] = email.trim();
    } else {
      delete updatedEmails[memberName];
    }
    setMasters({ ...masters, memberEmails: updatedEmails });
  };

  // メンバー削除
  const handleRemoveMember = (targetIndex: number): void => {
    let removedName = '';
    let newSales = masters.sales;
    let newCcr = masters.ccr;
    let newGyomu = masters.gyomu;

    if (activeMasterDept === 'sales') {
      removedName = masters.sales[targetIndex];
      newSales = masters.sales.filter((_, idx) => idx !== targetIndex);
    } else if (activeMasterDept === 'ccr') {
      removedName = masters.ccr[targetIndex];
      newCcr = masters.ccr.filter((_, idx) => idx !== targetIndex);
    } else {
      removedName = masters.gyomu[targetIndex];
      newGyomu = masters.gyomu.filter((_, idx) => idx !== targetIndex);
    }

    const updatedEmails = { ...(masters.memberEmails || {}) };
    if (removedName && updatedEmails[removedName]) {
      delete updatedEmails[removedName];
    }

    setMasters({
      ...masters,
      sales: newSales,
      ccr: newCcr,
      gyomu: newGyomu,
      memberEmails: updatedEmails,
    });
  };

  // 工場追加
  const handleAddFactory = (): void => {
    if (!newFactoryName.trim()) return;
    const item: FactoryMasterItem = {
      name: newFactoryName.trim(),
      code: newFactoryCode.trim() || '未設定',
      defaultAssignee: newFactoryAssignee || undefined,
    };
    const currentFactories = masters.factories || [];
    setMasters({
      ...masters,
      factories: [...currentFactories, item],
    });
    setNewFactoryName('');
    setNewFactoryCode('');
    setNewFactoryAssignee('');
  };

  // 工場担当者変更
  const handleFactoryAssigneeChange = (index: number, assigneeName: string): void => {
    const currentFactories = [...(masters.factories || [])];
    currentFactories[index] = {
      ...currentFactories[index],
      defaultAssignee: assigneeName || undefined,
    };
    setMasters({
      ...masters,
      factories: currentFactories,
    });
  };

  // 工場削除
  const handleRemoveFactory = (index: number): void => {
    const currentFactories = masters.factories || [];
    setMasters({
      ...masters,
      factories: currentFactories.filter((_, idx) => idx !== index),
    });
  };

  // マスター保存（担当者名・個人メール・工場共用）
  const handleSaveMasters = async (): Promise<void> => {
    setLoading(true);
    try {
      const cleanedMasters: MemberMaster = {
        sales: Array.from(new Set(masters.sales)),
        ccr: Array.from(new Set(masters.ccr)),
        gyomu: Array.from(new Set(masters.gyomu)),
        factories: masters.factories || [],
        memberEmails: masters.memberEmails || {},
      };
      const res = await fetch('/api/settings/masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedMasters),
      });
      const json = await res.json();
      if (json.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error('マスター保存エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDeptLabel = (dept: 'sales' | 'ccr' | 'gyomu'): string => {
    if (dept === 'sales') return '営業';
    if (dept === 'ccr') return 'CCR';
    return '業務課';
  };

  const currentList =
    activeMasterDept === 'sales' ? masters.sales :
    activeMasterDept === 'ccr' ? masters.ccr : masters.gyomu;

  const factoryList = masters.factories || FACTORY_MASTERS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
        {/* モーダルヘッダー */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold">各種マスター・システム設定</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* タブ切替ナビゲーション */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-1">
          <button
            onClick={() => setActiveTab('masters')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'masters'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            担当者マスター・個人メール設定
          </button>
          <button
            onClick={() => setActiveTab('factories')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'factories'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            工場マスター ＆ 担当者割り当て
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              設定内容を保存しました
            </div>
          )}

          {/* 1. 担当者マスター ＆ 個人メール設定 */}
          {activeTab === 'masters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-600 font-medium">
                  依頼登録や回答画面の選択肢となるメンバーと、各個人の通知用メールアドレスを設定・保存できます。
                </p>

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setActiveMasterDept('gyomu')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeMasterDept === 'gyomu' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    業務課 ({masters.gyomu.length})
                  </button>
                  <button
                    onClick={() => setActiveMasterDept('sales')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeMasterDept === 'sales' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    営業 ({masters.sales.length})
                  </button>
                  <button
                    onClick={() => setActiveMasterDept('ccr')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeMasterDept === 'ccr' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    CCR ({masters.ccr.length})
                  </button>
                </div>
              </div>

              {/* メンバー＆メール追加フォーム */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    placeholder={`${getDeptLabel(activeMasterDept)}担当者の氏名...`}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                  />
                </div>
                <div className="sm:col-span-6">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    placeholder="メールアドレス (例: name@company.co.jp)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-full h-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    追加
                  </button>
                </div>
              </div>

              {/* メンバー・個人メールリスト */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentList.map((name, idx) => {
                  const email = masters.memberEmails?.[name] || '';
                  return (
                    <div
                      key={`${name}-${idx}`}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <AtSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => handleMemberEmailChange(name, e.target.value)}
                          placeholder="個人のメールアドレスを設定..."
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveMasters}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  担当者マスター・個人メールを保存
                </button>
              </div>
            </div>
          )}

          {/* 2. 工場マスター ＆ 業務担当者割り当て */}
          {activeTab === 'factories' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                各製造工場の名称・コードおよび、**担当の業務課メンバー**を割り当てて保存できます。
              </p>

              {/* 工場追加フォーム */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={newFactoryName}
                    onChange={e => setNewFactoryName(e.target.value)}
                    placeholder="工場名 (例: 大和グラビア)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={newFactoryCode}
                    onChange={e => setNewFactoryCode(e.target.value)}
                    placeholder="工場コード (例: 554)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={newFactoryAssignee}
                    onChange={e => setNewFactoryAssignee(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="">-- 担当業務員 --</option>
                    {masters.gyomu.map(person => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddFactory}
                    className="w-full h-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                </div>
              </div>

              {/* 工場 ＆ 担当業務員設定リスト */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {factoryList.map((factory, idx) => (
                  <div
                    key={`${factory.name}-${idx}`}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{factory.name}</span>
                          <span className="text-slate-500 font-mono text-[11px] block">
                            CD: {factory.code}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFactory(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 工場別の担当業務員選択ドロップダウン */}
                    <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-100">
                      <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="text-slate-500 text-[11px] shrink-0 font-bold">担当業務員:</span>
                      <select
                        value={factory.defaultAssignee || ''}
                        onChange={e => handleFactoryAssigneeChange(idx, e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">未割当 (指定なし)</option>
                        {masters.gyomu.map(person => (
                          <option key={person} value={person}>
                            {person}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveMasters}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  工場マスター ＆ 担当者設定を保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
