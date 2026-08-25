import { NextResponse } from 'next/server';
import { getSmtpSettings, saveSmtpSettings } from '@/lib/storage';

export async function GET() {
  try {
    const settings = getSmtpSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('SMTP設定取得APIエラー:', error);
    return NextResponse.json({ success: false, error: '設定取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    saveSmtpSettings(body);
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('SMTP設定保存APIエラー:', error);
    return NextResponse.json({ success: false, error: '設定保存に失敗しました' }, { status: 500 });
  }
}
