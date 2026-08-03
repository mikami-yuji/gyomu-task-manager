import { describe, it, expect } from 'vitest';
import {
  getAllRequests,
  createRequest,
  updateRequest,
  getNotificationSettings,
  getMemberMasters,
  saveMemberMasters,
} from '../src/lib/storage';

describe('ストレージ層の動作テスト', () => {
  it('既存の依頼一覧を取得できること', () => {
    const requests = getAllRequests();
    expect(Array.isArray(requests)).toBe(true);
  });

  it('新規依頼が正常に保存され、新フォーマットID (YYYY/MM/DD-001) が生成されること', () => {
    const newReq = createRequest({
      category: 'estimate_request',
      title: 'テスト見積依頼',
      requesterName: '仲',
      requesterDept: 'sales',
      customerName: 'テスト顧客',
      customerCode: '99999',
      desiredDeliveryDate: '2026-08-20',
      details: '詳細メッセージ',
    });

    expect(newReq.id).toMatch(/^\d{4}\/\d{2}\/\d{2}-\d{3}$/);
    expect(newReq.requesterName).toBe('仲');

    const all = getAllRequests();
    const found = all.find(r => r.id === newReq.id);
    expect(found).toBeDefined();
  });

  it('依頼のステータスおよび担当者を更新できること', () => {
    const requests = getAllRequests();
    if (requests.length > 0) {
      const targetId = requests[0].id;

      const updated = updateRequest(targetId, {
        status: 'answered',
        assigneeName: '吉田',
        responseContent: '回答済みメッセージ',
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('answered');
      expect(updated?.assigneeName).toBe('吉田');
    }
  });

  it('通知設定一覧が正常に取得できること', () => {
    const settings = getNotificationSettings();
    expect(Array.isArray(settings)).toBe(true);
  });

  it('担当者マスターの追加・保存ができること', () => {
    const initialMasters = getMemberMasters();
    expect(Array.isArray(initialMasters.sales)).toBe(true);

    // テスト後に元の状態に戻す
    const testMasters = {
      sales: [...initialMasters.sales, 'テスト一時人物'],
      ccr: [...initialMasters.ccr],
      gyomu: [...initialMasters.gyomu],
    };
    saveMemberMasters(testMasters);

    const reLoaded = getMemberMasters();
    expect(reLoaded.sales).toContain('テスト一時人物');

    // クリーンアップ
    saveMemberMasters(initialMasters);
  });
});
