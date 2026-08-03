import { describe, it, expect } from 'vitest';
import { sanitizeInput, validateAndSanitizeCreateInput, validateAndSanitizeUpdateInput } from '../src/lib/validation';

describe('入力サニタイズ機能のテスト', () => {
  it('HTMLタグや特殊文字がエスケープされること', () => {
    const dangerousInput = '<script>alert("XSS")</script>&\'"';
    const sanitized = sanitizeInput(dangerousInput);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;&#x27;&quot;');
  });
});

describe('欠品納期問合せ入力バリデーションのテスト', () => {
  it('商品明細および得意先CDを含む入力が正常にサニタイズされること', () => {
    const rawData = {
      category: 'delivery_check',
      title: '欠品納期問合せテスト',
      requesterName: '見上',
      requesterDept: 'sales',
      customerName: '丸三',
      customerCode: '53016',
      desiredDeliveryDate: '2026-08-10',
      details: 'テスト内容',
      products: [
        {
          id: '1',
          catalogNumber: '887',
          weightKg: '5',
          productName: '風そよぐ稲 TS',
          quantity: '600',
          unit: '枚',
        },
      ],
    };

    const validated = validateAndSanitizeCreateInput(rawData);
    expect(validated.category).toBe('delivery_check');
    expect(validated.customerCode).toBe('53016');
    expect(validated.requesterDept).toBe('sales');
    expect(validated.products).toHaveLength(1);
  });
});

describe('見積依頼入力バリデーションのテスト', () => {
  it('見積依頼専用フォーマットの項目が正常に検証・サニタイズされること', () => {
    const rawData = {
      category: 'estimate_request',
      title: '見積依頼テスト',
      requesterName: '田中',
      requesterDept: 'ccr',
      customerName: 'スズリョーベルックス',
      customerCode: '74418',
      desiredDeliveryDate: '2026-08-08',
      details: '特記事項テスト',
      estimateDetails: {
        capacity: '500g',
        quantity: '2000枚',
        packageSize: '140mm×220mm',
        packageForm: '単袋',
        structure: 'PET/AL/LLDPE',
        material: 'アルミ',
        colorCount: '5色',
        deoxidizer: '有 (真空)',
      },
    };

    const validated = validateAndSanitizeCreateInput(rawData);
    expect(validated.category).toBe('estimate_request');
    expect(validated.requesterDept).toBe('ccr');
    expect(validated.estimateDetails?.capacity).toBe('500g');
  });
});
