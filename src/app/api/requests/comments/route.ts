import { NextRequest, NextResponse } from 'next/server';
import { addRequestComment, getRequestById } from '@/lib/storage';
import { sendMail } from '@/lib/mailer';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { requestId, authorName, authorDept, content, sendEmail } = body;

    if (!requestId || !authorName || !content?.trim()) {
      return NextResponse.json({ success: false, error: '必須項目が不足しています' }, { status: 400 });
    }

    const updated = addRequestComment(requestId, {
      authorName: authorName.trim(),
      authorDept: authorDept || 'sales',
      content: content.trim(),
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: '対象の依頼が見つかりません' }, { status: 404 });
    }

    // コメント通知メール（sendEmailがtrueの場合、または関連担当者へ通知）
    if (sendEmail) {
      const emailContent = `
        <div style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0284c7; color: #ffffff; padding: 14px 20px;">
            <h2 style="margin: 0; font-size: 16px; font-weight: bold;">【社内メモ・コメント追記】${updated.title}</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">依頼番号: ${updated.id} / 投稿者: ${authorName}</p>
          </div>
          <div style="padding: 20px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 13px; white-space: pre-wrap; font-weight: bold;">
              ${content.trim()}
            </div>
            <div style="margin-top: 15px; font-size: 12px; color: #64748b;">
              <p>得意先: ${updated.customerName || '-'} / 発信者: ${updated.requesterName} / 業務担当: ${updated.assigneeName || '未定'}</p>
            </div>
          </div>
        </div>
      `;

      // 非同期で通知
      sendMail({
        to: 'gyomu-desk@asahipac.co.jp',
        subject: `【社内コメント追記】${updated.title} (${updated.id})`,
        html: emailContent,
      }).catch(err => console.error('コメント通知メールエラー:', err));
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error('POST /api/requests/comments エラー:', err);
    return NextResponse.json({ success: false, error: 'コメントの保存に失敗しました' }, { status: 500 });
  }
}
