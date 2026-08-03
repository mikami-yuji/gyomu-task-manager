import { NextRequest, NextResponse } from 'next/server';
import { getMemberMasters, saveMemberMasters } from '@/lib/storage';
import { MemberMaster } from '@/types/request';

/**
 * 担当者マスター一覧取得 (GET)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const masters = getMemberMasters();
    return NextResponse.json({ success: true, data: masters }, { status: 200 });
  } catch (error) {
    console.error('GET /api/settings/masters エラー:', error);
    return NextResponse.json({ success: false, error: 'マスターの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * 担当者マスター更新 (POST)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as MemberMaster;
    if (!body || !Array.isArray(body.sales) || !Array.isArray(body.ccr)) {
      return NextResponse.json({ success: false, error: '無効なマスター形式です' }, { status: 400 });
    }

    const updatedMasters: MemberMaster = {
      sales: body.sales.map(s => s.trim()).filter(Boolean),
      ccr: body.ccr.map(c => c.trim()).filter(Boolean),
      gyomu: Array.isArray(body.gyomu) ? body.gyomu.map(g => g.trim()).filter(Boolean) : [],
    };

    saveMemberMasters(updatedMasters);

    return NextResponse.json({ success: true, data: updatedMasters }, { status: 200 });
  } catch (error) {
    console.error('POST /api/settings/masters エラー:', error);
    return NextResponse.json({ success: false, error: 'マスターの保存に失敗しました' }, { status: 500 });
  }
}
