import { NextRequest, NextResponse } from 'next/server';
import { updateRequest } from '@/lib/storage';
import { RequestStatus } from '@/types/request';

type BatchUpdateRequest = {
  ids: string[];
  status?: RequestStatus;
  assigneeName?: string;
};

/**
 * 依頼一括更新 API (POST)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as BatchUpdateRequest;
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ success: false, error: '対象の依頼IDが選択されていません' }, { status: 400 });
    }

    const updatedItems = [];
    for (const id of body.ids) {
      const updated = updateRequest(id, {
        status: body.status,
        assigneeName: body.assigneeName,
      });
      if (updated) {
        updatedItems.push(updated);
      }
    }

    return NextResponse.json({ success: true, count: updatedItems.length, data: updatedItems }, { status: 200 });
  } catch (error) {
    console.error('POST /api/requests/batch エラー:', error);
    return NextResponse.json({ success: false, error: '一括更新処理に失敗しました' }, { status: 500 });
  }
}
