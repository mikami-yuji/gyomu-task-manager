import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getMastersApi, POST as saveMastersApi } from '../src/app/api/settings/masters/route';
import { GET as getNotificationsApi, POST as saveNotificationsApi } from '../src/app/api/settings/notifications/route';
import { getMemberMasters, saveMemberMasters, getNotificationSettings, saveNotificationSettings } from '../src/lib/storage';
import { MemberMaster, NotificationSetting } from '../src/types/request';

describe('APIルート: /api/settings/masters のテスト', () => {
  let originalMasters: MemberMaster;

  beforeAll(() => {
    originalMasters = getMemberMasters();
  });

  afterAll(() => {
    saveMemberMasters(originalMasters);
  });

  it('GET でマスター一覧が取得できること', async () => {
    const res = await getMastersApi();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.sales)).toBe(true);
  });

  it('POST でマスター一覧が更新できること', async () => {
    const updatedPayload = {
      sales: [...originalMasters.sales, 'テスト一時営業'],
      ccr: [...originalMasters.ccr],
      gyomu: [...originalMasters.gyomu],
    };

    const req = new NextRequest('http://localhost:3000/api/settings/masters', {
      method: 'POST',
      body: JSON.stringify(updatedPayload),
    });

    const res = await saveMastersApi(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.sales).toContain('テスト一時営業');
  });
});

describe('APIルート: /api/settings/notifications のテスト', () => {
  let originalNotifications: NotificationSetting[];

  beforeAll(() => {
    originalNotifications = getNotificationSettings();
  });

  afterAll(() => {
    saveNotificationSettings(originalNotifications);
  });

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
        department: 'sales' as const,
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

