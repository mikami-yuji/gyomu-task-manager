import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getRequests, POST as createRequestApi } from '../src/app/api/requests/route';
import { GET as getRequestByIdApi, PATCH as updateRequestApi } from '../src/app/api/requests/[id]/route';
import { POST as batchUpdateApi } from '../src/app/api/requests/batch/route';

describe('APIルート: /api/requests のテスト', () => {
  it('GET /api/requests で依頼一覧が200で取得できること', async () => {
    const res = await getRequests();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('POST /api/requests で新規依頼が正常に登録できること', async () => {
    const requestBody = {
      category: 'estimate_request',
      title: 'API経由テスト依頼',
      requesterName: '見上',
      requesterDept: 'sales',
      customerName: '株式会社テスト',
      desiredDeliveryDate: '2026-08-31',
      details: 'API登録テストの詳細内容',
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const res = await createRequestApi(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('API経由テスト依頼');
    expect(json.data.id).toBeDefined();
  });

  it('不正なデータ（必須項目不足）でPOSTした場合に400エラーとなること', async () => {
    const invalidBody = {
      category: 'estimate_request',
      // title や requesterName が欠落
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(invalidBody),
    });

    const res = await createRequestApi(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

describe('APIルート: /api/requests/[id] および /batch のテスト', () => {
  it('GET /api/requests/[id] で存在する依頼を取得できること', async () => {
    // まず新規作成
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        category: 'delivery_check',
        title: 'ID取得テスト',
        requesterName: '仲',
        requesterDept: 'sales',
        customerName: '丸三',
        desiredDeliveryDate: '2026-08-25',
        details: '詳細',
      }),
    });
    const createRes = await createRequestApi(createReq);
    const createJson = await createRes.json();
    const targetId = createJson.data.id;

    // 詳細取得
    const dummyReq = new NextRequest(`http://localhost:3000/api/requests/${encodeURIComponent(targetId)}`);
    const res = await getRequestByIdApi(dummyReq, { params: Promise.resolve({ id: targetId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(targetId);
  });

  it('PATCH /api/requests/[id] でステータスを更新できること', async () => {
    // 新規作成
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        category: 'delivery_check',
        title: '更新テスト',
        requesterName: '見上',
        requesterDept: 'sales',
        customerName: '顧客A',
        desiredDeliveryDate: '2026-08-25',
        details: '詳細',
      }),
    });
    const createRes = await createRequestApi(createReq);
    const { data } = await createRes.json();

    // PATCH
    const patchReq = new NextRequest(`http://localhost:3000/api/requests/${encodeURIComponent(data.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'in_progress',
        assigneeName: '高野',
      }),
    });

    const res = await updateRequestApi(patchReq, { params: Promise.resolve({ id: data.id }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('in_progress');
    expect(json.data.assigneeName).toBe('高野');
  });

  it('POST /api/requests/batch で一括更新ができること', async () => {
    // 2件作成
    const createRes1 = await createRequestApi(new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        category: 'delivery_check',
        title: '一括テスト1',
        requesterName: '見上',
        requesterDept: 'sales',
        customerName: '顧客1',
        desiredDeliveryDate: '2026-08-25',
        details: '1',
      }),
    }));
    const resJson1 = await createRes1.json();

    const batchReq = new NextRequest('http://localhost:3000/api/requests/batch', {
      method: 'POST',
      body: JSON.stringify({
        ids: [resJson1.data.id],
        status: 'answered',
        assigneeName: '吉田',
      }),
    });

    const res = await batchUpdateApi(batchReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
  });
});
