import { describe, it, expect, beforeEach } from 'vitest';
import { createRequest, updateRequest, OptimisticLockError, getAllRequests, saveRequests } from '@/lib/storage';
import { CreateRequestInput } from '@/types/request';

describe('楽観的排他制御 (同時更新衝突防止) のテスト', () => {
  beforeEach(() => {
    saveRequests([]);
  });

  const mockInput: CreateRequestInput = {
    category: 'delivery_check',
    title: '排他制御テスト案件',
    requesterName: 'テスト営業',
    requesterDept: 'sales',
    customerName: 'テスト株式会社',
    desiredDeliveryDate: '2026-09-30',
    details: '詳細内容',
  };

  it('新規作成時に version: 1 が付与されること', () => {
    const created = createRequest(mockInput);
    expect(created.version).toBe(1);
  });

  it('正常な更新で version が 2 にインクリメントされること', () => {
    const created = createRequest(mockInput);
    const updated = updateRequest(created.id, {
      responseContent: '担当者が回答を入力',
      version: 1,
    });

    expect(updated).not.toBeNull();
    expect(updated?.version).toBe(2);
    expect(updated?.responseContent).toBe('担当者が回答を入力');
  });

  it('古い version を指定した場合に OptimisticLockError がスローされること', () => {
    const created = createRequest(mockInput);

    // 担当者Aが更新 (versionが 1 -> 2 に進む)
    updateRequest(created.id, {
      responseContent: '担当者Aの回答',
      version: 1,
    });

    // 担当者Bが古い version 1 のまま更新しようとすると衝突検知
    expect(() => {
      updateRequest(created.id, {
        responseContent: '担当者Bの回答 (上書き衝突)',
        version: 1,
      });
    }).toThrow(OptimisticLockError);
  });

  it('version を指定しない更新でも後方互換で version がインクリメントされること', () => {
    const created = createRequest(mockInput);
    const updated = updateRequest(created.id, {
      status: 'in_progress',
    });

    expect(updated?.version).toBe(2);
  });
});
