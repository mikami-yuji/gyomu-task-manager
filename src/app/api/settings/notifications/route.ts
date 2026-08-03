import { NextRequest, NextResponse } from 'next/server';
import { getAllNotificationSettings, saveNotificationSettings } from '@/lib/storage';
import { NotificationSetting } from '@/types/request';

/**
 * 通知設定一覧取得 API (GET)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const settings = getAllNotificationSettings();
    return NextResponse.json({ success: true, data: settings }, { status: 200 });
  } catch (error) {
    console.error('GET /api/settings/notifications エラー:', error);
    return NextResponse.json({ success: false, error: '通知設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * 通知設定更新 API (POST)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as NotificationSetting[];
    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: '無効なデータ形式です' }, { status: 400 });
    }
    saveNotificationSettings(body);
    return NextResponse.json({ success: true, data: body }, { status: 200 });
  } catch (error) {
    console.error('POST /api/settings/notifications エラー:', error);
    return NextResponse.json({ success: false, error: '通知設定の保存に失敗しました' }, { status: 500 });
  }
}
