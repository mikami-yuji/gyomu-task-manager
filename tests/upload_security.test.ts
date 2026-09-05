import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as uploadPost } from '@/app/api/upload/route';
import { PATCH as requestPatch } from '@/app/api/requests/[...id]/route';
import { createRequest, saveRequests } from '@/lib/storage';

describe('セキュリティ強化テスト (アップロード拡張子ホワイトリスト & 上長承認PIN)', () => {
  beforeEach(() => {
    saveRequests([]);
  });

  describe('ファイルアップロード拡張子制限', () => {
    it('禁止された拡張子 (.exe) のアップロードが 400 エラーで拒否されること', async () => {
      const formData = new FormData();
      const fakeExe = new File(['binary dummy content'], 'malicious.exe', { type: 'application/x-msdownload' });
      formData.append('files', fakeExe);

      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('許可されていないファイル形式');
    });

    it('禁止されたスクリプト (.bat / .vbs) のアップロードが拒否されること', async () => {
      const formData = new FormData();
      const fakeBat = new File(['@echo off'], 'script.bat', { type: 'text/plain' });
      formData.append('files', fakeBat);

      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
    });

    it('許可された拡張子 (.pdf) のアップロードが成功すること', async () => {
      const formData = new FormData();
      const validPdf = new File(['%PDF-1.4 dummy pdf'], 'specification.pdf', { type: 'application/pdf' });
      formData.append('files', validPdf);

      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].name).toBe('specification.pdf');
    });
  });

  describe('上長承認PINコード認証', () => {
    it('暗証番号（PIN）なしでの上長承認は 403 Forbidden になること', async () => {
      const created = createRequest({
        category: 'sample_request',
        title: '承認PINテスト案件',
        requesterName: '見上',
        requesterDept: 'sales',
        customerName: '顧客A',
        desiredDeliveryDate: '2026-09-30',
        details: '仕掛手配',
      });

      const req = new NextRequest(`http://localhost:3000/api/requests/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approverName: '営業上長',
          // approvalPin なし
        }),
      });

      const res = await requestPatch(req, { params: Promise.resolve({ id: created.id }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain('暗証番号（PIN）が正しくありません');
    });

    it('誤ったPINでの上長承認は 403 Forbidden になること', async () => {
      const created = createRequest({
        category: 'sample_request',
        title: '誤ったPINテスト',
        requesterName: '見上',
        requesterDept: 'sales',
        customerName: '顧客A',
        desiredDeliveryDate: '2026-09-30',
        details: '仕掛手配',
      });

      const req = new NextRequest(`http://localhost:3000/api/requests/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approverName: '営業上長',
          approvalPin: '9999', // 不正なPIN
        }),
      });

      const res = await requestPatch(req, { params: Promise.resolve({ id: created.id }) });
      expect(res.status).toBe(403);
    });

    it('正しいPIN（1234）での上長承認が 200 OK で成功すること', async () => {
      const created = createRequest({
        category: 'sample_request',
        title: '正しいPINテスト',
        requesterName: '見上',
        requesterDept: 'sales',
        customerName: '顧客A',
        desiredDeliveryDate: '2026-09-30',
        details: '仕掛手配',
      });

      const req = new NextRequest(`http://localhost:3000/api/requests/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approverName: '営業上長',
          approvalPin: '1234', // 正しいPIN
        }),
      });

      const res = await requestPatch(req, { params: Promise.resolve({ id: created.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.approvalStatus).toBe('approved');
      expect(json.data.approverName).toBe('営業上長');
    });
  });
});
