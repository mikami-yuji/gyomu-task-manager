import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyNewRequestCreated, notifyRequestUpdated, sendEmailSafe } from '../src/lib/mailer';
import { BusinessRequest } from '../src/types/request';

describe('メール通知機能のテスト', () => {
  const dummyRequest: BusinessRequest = {
    id: '2026/08/17-001',
    category: 'delivery_check',
    title: '納期至急確認',
    requesterName: '見上',
    requesterDept: 'sales',
    customerName: 'サンプル株式会社',
    customerCode: '12345',
    desiredDeliveryDate: '2026-08-20',
    details: '至急納期の確認をお願いします。',
    status: 'pending',
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('SMTP未設定環境でもエラーなくシミュレーションログが出力され成功すること', async () => {
    const result = await sendEmailSafe({
      to: 'test@example.com',
      subject: 'テスト件名',
      html: '<p>テスト本文</p>',
    });

    expect(result).toBe(true);
  });

  it('新規依頼登録時の通知関数が例外を投げずに完了すること', async () => {
    await expect(notifyNewRequestCreated(dummyRequest)).resolves.not.toThrow();
  });

  it('依頼更新・回答時の通知関数が例外を投げずに完了すること', async () => {
    const updatedRequest: BusinessRequest = {
      ...dummyRequest,
      status: 'answered',
      assigneeName: '吉田',
      responseContent: '8月20日発送可能です。',
    };

    await expect(notifyRequestUpdated(updatedRequest)).resolves.not.toThrow();
  });
});
