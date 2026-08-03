import { NextRequest, NextResponse } from 'next/server';
import { getAllRequests, saveNewRequest } from '@/lib/storage';
import { validateAndSanitizeCreateInput } from '@/lib/validation';
import { notifyNewRequestCreated } from '@/lib/mailer';

/**
 * 依頼一覧取得 API (GET)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const requests = getAllRequests();
    return NextResponse.json({ success: true, data: requests }, { status: 200 });
  } catch (error) {
    console.error('GET /api/requests エラー:', error);
    return NextResponse.json(
      { success: false, error: '依頼一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 新規依頼登録 API (POST)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedInput = validateAndSanitizeCreateInput(body);
    const newRequest = saveNewRequest(validatedInput);

    // 非同期でメール通知を送信（失敗してもレスポンスは返す）
    notifyNewRequestCreated(newRequest).catch(err => {
      console.error('メール送信失敗(非同期):', err);
    });

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error) {
    console.error('POST /api/requests エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '依頼の保存に失敗しました';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
