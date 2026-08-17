import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getMastersApi, POST as saveMastersApi } from '../src/app/api/settings/masters/route';
import { GET as getNotificationsApi, POST as saveNotificationsApi } from '../src/app/api/settings/notifications/route';

describe('APIルート: /api/settings/masters のテスト', () => {
  it('GET でマスター一覧が取得できること', async () => {
    const res = await getMastersApi();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.sales)).toBe(true);
  });

  it('POST でマスター一覧が更新できること', async () => {
    const updatedPayload = {
      sales: ['仲', '見上', 'テスト営業'],
      ccr: ['田中', '佐藤'],
      gyomu: ['吉田', '高野'],
    };

    const req = new NextRequest('http://localhost:3000/api/settings/masters', {
      method: 'POST',
      body: JSON.stringify(updatedPayload),
    });

    const res = await saveMastersApi(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.sales).toContain('テスト営業');
  });
});

describe('APIルート: /api/settings/notifications のテスト', () => {
  it('GET で通知設定一覧が取得できること', async () => {
    const res = await getNotificationsApi();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('POST で通知設定一覧が更新できること', async () => {
    const newSettings = [
      {
        id: 'test-notif',
        name: 'テスト通知',
        department: 'sales',
        email: 'test@example.com',
        notifyOnCreate: true,
        notifyOnAnswer: true,
        notifyOnComplete: true,
      },
    ];

    const req = new NextRequest('http://localhost:3000/api/settings/notifications', {
      method: 'POST',
      body: JSON.stringify(newSettings),
    });

    const res = await saveNotificationsApi(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });
});
