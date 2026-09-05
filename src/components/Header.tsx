import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  PlusCircle,
  Bell,
  Clock,
  ShieldCheck,
  Type,
  Radio,
  User,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, getSavedUserProfile } from '@/lib/user';
import { UserLoginModal } from '@/components/UserLoginModal';

type HeaderProps = {
  onOpenNotifications?: () => void;
  isAutoRefreshing?: boolean;
};

/**
 * アプリケーション共通ヘッダーコンポーネント
 */
export function Header({ onOpenNotifications, isAutoRefreshing = true }: HeaderProps): React.JSX.Element {
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);

  const updateUserState = () => {
    setCurrentUser(getSavedUserProfile());
  };

  useEffect(() => {
    // ログインユーザー復元
    updateUserState();

    // ユーザー変更イベントのリスナー
    window.addEventListener('gyomu_user_changed', updateUserState);

    // 保存済みの文字サイズ設定を復元
    const saved = localStorage.getItem('gyomu_font_size');
    if (saved === 'large' || saved === 'normal') {
      setFontSize(saved);
      document.documentElement.setAttribute('data-font-size', saved);
    }

    return () => {
      window.removeEventListener('gyomu_user_changed', updateUserState);
    };
  }, []);

  const toggleFontSize = (): void => {
    const nextSize = fontSize === 'normal' ? 'large' : 'normal';
    setFontSize(nextSize);
    localStorage.setItem('gyomu_font_size', nextSize);
    document.documentElement.setAttribute('data-font-size', nextSize);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-r from-sky-800 via-sky-700 to-indigo-800 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ロゴ・タイトル */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all backdrop-blur-sm">
                  <ClipboardList className="w-6 h-6 text-sky-200" />
                </div>
                <div>
                  <span className="text-lg font-extrabold tracking-wide text-white flex items-center gap-1.5">
                    業務課依頼管理ポータル
                  </span>
                  <p className="text-[10px] text-sky-200/80 -mt-0.5">欠品納期問合せ・見積依頼・進捗管理ポータル</p>
                </div>
              </Link>
            </div>

            {/* 右側ナビゲーション＆操作 */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* 自動更新インジケーター */}
              {isAutoRefreshing && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 text-sky-200 text-[11px] font-bold border border-white/10" title="バックグラウンドで30秒ごとに自動更新中">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>自動更新中</span>
                </div>
              )}

              {/* 文字サイズ切替ボタン（現場の視認性重視） */}
              <button
                type="button"
                onClick={toggleFontSize}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                  fontSize === 'large'
                    ? 'bg-amber-300 text-slate-900 border-amber-400 shadow-sm'
                    : 'bg-white/10 text-sky-100 border-white/20 hover:bg-white/20'
                }`}
                title="文字サイズを切り替えます（標準 / 大）"
              >
                <Type className="w-3.5 h-3.5" />
                <span>文字: {fontSize === 'large' ? '大' : '標準'}</span>
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Clock className="w-4 h-4 text-sky-300" />
                進捗一覧
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                管理画面
              </Link>

              <Link
                href="/request/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-sky-900 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-sm hover:shadow active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-sky-950" />
                新規依頼登録
              </Link>

              {/* 👤 ログインユーザー切り替えボタン */}
              <button
                type="button"
                onClick={() => setIsUserModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                  currentUser
                    ? 'bg-white/15 text-white border-white/30 hover:bg-white/25 hover:border-white/50'
                    : 'bg-sky-400/30 text-sky-100 border-sky-300/40 hover:bg-sky-400/40 animate-pulse'
                }`}
                title="クリックしてログイン担当者を切り替えます"
              >
                <User className="w-3.5 h-3.5 text-sky-200" />
                {currentUser ? (
                  <span className="flex items-center gap-1">
                    <span className="font-extrabold">{currentUser.name}</span>
                    <span className="text-[10px] text-sky-200 font-normal">
                      ({currentUser.dept === 'sales' ? '営業' : currentUser.dept === 'ccr' ? 'CCR' : '業務'})
                    </span>
                    <ChevronDown className="w-3 h-3 text-sky-300" />
                  </span>
                ) : (
                  <span>ログイン設定</span>
                )}
              </button>

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="p-2 rounded-xl text-sky-100 hover:text-white hover:bg-white/10 transition-colors relative"
                  title="通知メール設定"
                >
                  <Bell className="w-5 h-5 text-sky-200" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ユーザー設定モーダル */}
      <UserLoginModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onUserSelected={(profile) => setCurrentUser(profile)}
      />
    </>
  );
}
