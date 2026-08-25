import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  UserPlus,
  Users,
  Settings,
  Building,
  AtSign,
  UserCheck,
  Mail,
  Send,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MemberMaster, FactoryMasterItem, SmtpSettings } from '@/types/request';
import { GYOMU_PERSONS, FACTORY_MASTERS } from '@/lib/constants';

type NotificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationModal({ isOpen, onClose }: NotificationModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'masters' | 'factories' | 'mail'>('masters');
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
  
  // SMTPメール設定ステート
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    enabled: true,
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: '',
    fromName: '業務課タスク管理システム',
    useAuth: true,
    notifyOnCreate: true,
    notifyOnAnswer: true,
    notifyOnApproval: true,
  });

  const [testEmail, setTestEmail] = useState<string>('');
  const [isTestingMail, setIsTestingMail] = useState<boolean>(false);
  const [testMailResult, setTestMailResult] = useState<{ success: boolean; message: string } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
      fetchMailSettings();
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

  const fetchMailSettings = async (): Promise<void> => {
    try {
      const res = await fetch('/api/settings/mail');
      const json = await res.json();
      if (json.success && json.data) {
        setSmtpSettings(json.data);
      }
    } catch (err) {
      console.error('メール設定取得エラー:', err);
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

  // メール設定保存
  const handleSaveMailSettings = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });
      const json = await res.json();
      if (json.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error('メール設定保存エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // テストメール送信
  const handleTestMail = async (): Promise<void> => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestMailResult({ success: false, message: '有効なテスト送信先メールアドレスを入力してください' });
      return;
    }
    setIsTestingMail(true);
    setTestMailResult(null);
    try {
      const res = await fetch('/api/settings/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: smtpSettings,
          testEmail: testEmail.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTestMailResult({ success: true, message: json.message || '送信成功！メールボックスをご確認ください。' });
      } else {
        setTestMailResult({ success: false, message: json.error || '送信に失敗しました' });
      }
    } catch (err) {
      setTestMailResult({ success: false, message: '通信エラーが発生しました' });
    } finally {
      setIsTestingMail(false);
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
            type="button"
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
            type="button"
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
          <button
            type="button"
            onClick={() => setActiveTab('mail')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'mail'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4 text-indigo-600" />
            メール通知 (Outlook 2021設定)
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="p-6 max-h-[72vh] overflow-y-auto [scrollbar-gutter:stable] space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              設定内容を保存しました
            </div>
          )}

          {/* 1. 担当者マスター ＆ 個人メール設定 */}
          {activeTab === 'masters' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 font-medium">
                  依頼登録や回答画面の選択肢となるメンバーと、各個人の通知用メールアドレスを設定・保存できます。
                </p>

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveMasterDept('gyomu')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      activeMasterDept === 'gyomu' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    業務課 ({masters.gyomu.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMasterDept('sales')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      activeMasterDept === 'sales' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    営業 ({masters.sales.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMasterDept('ccr')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      activeMasterDept === 'ccr' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    CCR ({masters.ccr.length})
                  </button>
                </div>
              </div>

              {/* メンバー＆メール追加フォーム */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    placeholder={`追加する${getDeptLabel(activeMasterDept)}氏名`}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    placeholder="通知先メールアドレス (任意)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    追加
                  </button>
                </div>
              </div>

              {/* メンバー一覧 ＆ メール設定リスト */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {currentList.map((member, idx) => (
                  <div
                    key={member}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        {member}
                      </span>
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
                        value={masters.memberEmails?.[member] || ''}
                        onChange={e => handleMemberEmailChange(member, e.target.value)}
                        placeholder="通知用メールアドレス"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveMasters}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  担当者マスター ＆ 個人メールを保存
                </button>
              </div>
            </div>
          )}

          {/* 2. 工場マスター ＆ 担当者割り当て設定 */}
          {activeTab === 'factories' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                依頼先工場の登録と、工場ごとに優先される業務課担当者を設定できます。
              </p>

              {/* 工場追加フォーム */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={newFactoryCode}
                    onChange={e => setNewFactoryCode(e.target.value)}
                    placeholder="工場コード (例: 221)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={newFactoryName}
                    onChange={e => setNewFactoryName(e.target.value)}
                    placeholder="工場名 (例: 埼玉工場)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={newFactoryAssignee}
                    onChange={e => setNewFactoryAssignee(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">担当業務員 (任意)</option>
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
                    className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    追加
                  </button>
                </div>
              </div>

              {/* 工場一覧リスト */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {factoryList.map((factory, idx) => (
                  <div
                    key={`${factory.code}-${idx}`}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-indigo-900 rounded font-mono font-black text-[11px]">
                          {factory.code}
                        </span>
                        <span className="font-bold text-slate-800">{factory.name}</span>
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

                    <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-100">
                      <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="text-slate-500 font-bold">担当:</span>
                      <select
                        value={factory.defaultAssignee || ''}
                        onChange={e => handleFactoryAssigneeChange(idx, e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="">未割当</option>
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

          {/* 3. メール通知 ＆ Outlook 2021 接続設定 */}
          {activeTab === 'mail' && (
            <div className="space-y-5">
              {/* 案内バナー */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <Mail className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold text-indigo-900">
                    Outlook 2021 / 社内メールサーバー自動連携設定
                  </p>
                  <p className="text-indigo-800 leading-relaxed">
                    新規依頼の受付時、業務課の回答時、仕掛手配の上長承認完了時に、登録されたメールアドレス宛てへ自動的にメール通知を送信します。
                  </p>
                </div>
              </div>

              {/* プリセット選択 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  かんたん接続プリセット（クリックで一発入力）
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSmtpSettings({
                        ...smtpSettings,
                        host: 'mail.asahipac.co.jp',
                        port: 25,
                        secure: false,
                        useAuth: false,
                        user: '',
                        pass: '',
                        fromEmail: 'mikami@asahipac.co.jp',
                      })
                    }
                    className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-black text-emerald-800 shadow-sm transition-all"
                  >
                    ⭐ アサヒパック社内設定 (mail.asahipac.co.jp / ポート25 / 認証なし)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSmtpSettings({
                        ...smtpSettings,
                        host: 'smtp.office365.com',
                        port: 587,
                        secure: false,
                        useAuth: true,
                      })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all"
                  >
                    Microsoft 365 / Outlook (587)
                  </button>
                </div>
              </div>

              {/* メール送信の有効/無効トグル */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">自動メール通知機能</h4>
                  <p className="text-[11px] text-slate-500">オンにすると各イベント発生時に自動でメールが配信されます</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpSettings.enabled}
                    onChange={e => setSmtpSettings({ ...smtpSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {/* サーバー設定フォーム */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SMTPサーバー名 (ホスト) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={smtpSettings.host}
                    onChange={e => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                    placeholder="例: smtp.office365.com または 社内SMTPホスト"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ポート番号 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={smtpSettings.port}
                    onChange={e => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value, 10) || 587 })}
                    placeholder="587 / 25 / 465"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">送信元メールアドレス</label>
                  <input
                    type="email"
                    value={smtpSettings.fromEmail || ''}
                    onChange={e => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                    placeholder="例: gyomu-desk@company.co.jp"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">差出人表示名</label>
                  <input
                    type="text"
                    value={smtpSettings.fromName || ''}
                    onChange={e => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                    placeholder="例: 業務課タスク管理システム"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* 認証設定 */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={smtpSettings.useAuth !== false}
                      onChange={e => setSmtpSettings({ ...smtpSettings, useAuth: e.target.checked })}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>ユーザー認証（ID / パスワード）を使用する（社内LANリレー等で認証不要の場合はチェックを外してください）</span>
                  </label>

                  {smtpSettings.useAuth !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">ログインユーザー名 / メール</label>
                        <input
                          type="text"
                          value={smtpSettings.user || ''}
                          onChange={e => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                          placeholder="例: your-account@company.co.jp"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">パスワード</label>
                        <input
                          type="password"
                          value={smtpSettings.pass || ''}
                          onChange={e => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 通知トリガー */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900">通知トリガー設定</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={smtpSettings.notifyOnCreate !== false}
                      onChange={e => setSmtpSettings({ ...smtpSettings, notifyOnCreate: e.target.checked })}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>新規依頼受付時</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={smtpSettings.notifyOnAnswer !== false}
                      onChange={e => setSmtpSettings({ ...smtpSettings, notifyOnAnswer: e.target.checked })}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>回答・進捗更新時</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={smtpSettings.notifyOnApproval !== false}
                      onChange={e => setSmtpSettings({ ...smtpSettings, notifyOnApproval: e.target.checked })}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>上長承認完了時</span>
                  </label>
                </div>
              </div>

              {/* 接続テスト送信エリア */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-amber-600" />
                    接続テストメール送信
                  </h4>
                  <span className="text-[11px] text-amber-800">入力中の設定ですぐに送信を試せます</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="テストメールの受信先アドレス (例: your-email@company.co.jp)"
                    className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    disabled={isTestingMail}
                    onClick={handleTestMail}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all shrink-0 flex items-center gap-1.5"
                  >
                    {isTestingMail ? '送信中...' : 'テスト送信'}
                  </button>
                </div>

                {testMailResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                      testMailResult.success
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border border-rose-300 text-rose-800'
                    }`}
                  >
                    {testMailResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testMailResult.message}</span>
                  </div>
                )}
              </div>

              {/* 保存ボタン */}
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveMailSettings}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  メール通知設定を保存
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
