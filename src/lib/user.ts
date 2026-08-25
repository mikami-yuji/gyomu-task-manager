'use client';

export type UserDepartment = 'sales' | 'ccr' | 'gyomu';

export type UserProfile = {
  name: string;
  dept: UserDepartment;
  email?: string;
};

const STORAGE_KEY = 'gyomu_current_user_profile';

/**
 * 現在ログイン中のユーザープロフィールを取得
 */
export function getSavedUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * ログインユーザープロフィールをローカルに保存（次回自動ログイン）
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    // 変更イベントを発火させて同一タブ内のコンポーネントに通知
    window.dispatchEvent(new Event('gyomu_user_changed'));
  } catch (e) {
    console.error('Failed to save user profile', e);
  }
}

/**
 * ログアウト（登録解除）
 */
export function clearUserProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('gyomu_user_changed'));
  } catch (e) {
    console.error('Failed to clear user profile', e);
  }
}
