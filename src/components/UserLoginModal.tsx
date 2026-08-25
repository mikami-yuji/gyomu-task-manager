'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Check, Building2, UserCheck, ShieldCheck, LogOut } from 'lucide-react';
import { UserProfile, UserDepartment, getSavedUserProfile, saveUserProfile, clearUserProfile } from '@/lib/user';
import { SALES_PERSONS, CCR_PERSONS, GYOMU_PERSONS } from '@/lib/constants';
import { MemberMaster } from '@/types/request';

type UserLoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUserSelected?: (profile: UserProfile | null) => void;
};

export function UserLoginModal({ isOpen, onClose, onUserSelected }: UserLoginModalProps): React.JSX.Element | null {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedDept, setSelectedDept] = useState<UserDepartment>('sales');
  const [masters, setMasters] = useState<MemberMaster>({
    sales: [...SALES_PERSONS],
    ccr: [...CCR_PERSONS],
    gyomu: [...GYOMU_PERSONS],
    factories: [],
    memberEmails: {},
  });

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedUserProfile();
      setCurrentUser(saved);
      if (saved) {
        setSelectedDept(saved.dept);
      }
      // 最新マスター取得
      fetch('/api/settings/masters')
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            setMasters(prev => ({
              ...prev,
              sales: json.data.sales || prev.sales,
              ccr: json.data.ccr || prev.ccr,
              gyomu: json.data.gyomu || prev.gyomu,
              memberEmails: json.data.memberEmails || {},
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (name: string, dept: UserDepartment) => {
    const email = masters.memberEmails?.[name] || '';
    const profile: UserProfile = { name, dept, email };
    saveUserProfile(profile);
    setCurrentUser(profile);
    if (onUserSelected) onUserSelected(profile);
    onClose();
  };

  const handleLogout = () => {
    clearUserProfile();
    setCurrentUser(null);
    if (onUserSelected) onUserSelected(null);
    onClose();
  };

  const memberList =
    selectedDept === 'sales' ? masters.sales :
    selectedDept === 'ccr' ? masters.ccr : masters.gyomu;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <User className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">ログインユーザー設定</h3>
                <p className="text-xs text-sky-200/80">このPCで利用する担当者を選択してください</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 現在のログイン状況 */}
          {currentUser && (
            <div className="mt-4 p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs text-sky-100">現在:</span>
                <span className="text-sm font-black text-white">{currentUser.name}</span>
                <span className="text-[11px] px-2 py-0.5 bg-sky-900/60 rounded-lg text-sky-200">
                  {currentUser.dept === 'sales' ? '営業' : currentUser.dept === 'ccr' ? 'CCR' : '業務課'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-200 hover:text-white flex items-center gap-1 font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                解除
              </button>
            </div>
          )}
        </div>

        {/* 部署タブ */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedDept('sales')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                selectedDept === 'sales'
                  ? 'bg-white text-sky-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              営業部
            </button>
            <button
              type="button"
              onClick={() => setSelectedDept('ccr')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                selectedDept === 'ccr'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CCR部
            </button>
            <button
              type="button"
              onClick={() => setSelectedDept('gyomu')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                selectedDept === 'gyomu'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              業務課
            </button>
          </div>

          {/* メンバーボタン一覧 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">
              あなたのお名前をタップしてください
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
              {memberList.map(name => {
                const isSelected = currentUser?.name === name && currentUser?.dept === selectedDept;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(name, selectedDept)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500 text-sky-950 font-black shadow-sm ring-2 ring-sky-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <span className="text-sm truncate">{name}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>※ 設定はブラウザに自動記憶されます</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
