import { NextRequest, NextResponse } from 'next/server';
import { getRequestById, updateRequest } from '@/lib/storage';
import { validateAndSanitizeUpdateInput } from '@/lib/validation';
import { notifyRequestUpdated } from '@/lib/mailer';

type RouteParams = {
  params: Promise<{ id: string | string[] }>;
};

/**
 * 依頼詳細取得 API (GET)
 * 新フォーマット (YYYY/MM/DD-001) のスラッシュ区切りIDおよび通常IDの双方に対応
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const rawId = Array.isArray(id) ? id.join('/') : id;
    const targetId = decodeURIComponent(rawId);

    const item = getRequestById(targetId);
    if (!item) {
      return NextResponse.json({ success: false, error: '指定された依頼が見つかりません' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item }, { status: 200 });
  } catch (error) {
    console.error('GET /api/requests/[...id] エラー:', error);
    return NextResponse.json({ success: false, error: '依頼データの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * 依頼更新・回答・ステータス変更 API (PATCH)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const rawId = Array.isArray(id) ? id.join('/') : id;
    const targetId = decodeURIComponent(rawId);

    const body = await request.json();
    const validatedInput = validateAndSanitizeUpdateInput(body);

    const updated = updateRequest(targetId, validatedInput);
    if (!updated) {
      return NextResponse.json({ success: false, error: '更新対象の依頼が見つかりません' }, { status: 404 });
    }

    // ステータス更新や回答入力時、非同期でメール通知
    if (validatedInput.status || validatedInput.responseContent) {
      notifyRequestUpdated(updated).catch(err => {
        console.error('メール送信失敗(非同期):', err);
      });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/requests/[...id] エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '依頼の更新に失敗しました';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
