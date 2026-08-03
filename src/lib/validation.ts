import { z } from 'zod';
import { CreateRequestInput, UpdateRequestInput } from '@/types/request';

/**
 * 危険な文字をエスケープしてHTMLインジェクションを防止する関数
 * @param input サニタイズ対象の文字列
 * @returns サニタイズ後の文字列
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

const productItemSchema = z.object({
  id: z.string(),
  catalogNumber: z.string().optional(),
  weightKg: z.string().optional(),
  productName: z.string().min(1, '商品名は必須です'),
  quantity: z.string().default('1'),
  unit: z.string().default('枚'),
});

const estimateDetailsSchema = z.object({
  capacity: z.string().optional(),
  quantity: z.string().optional(),
  packageSize: z.string().optional(),
  packageForm: z.string().optional(),
  structure: z.string().optional(),
  material: z.string().optional(),
  colorCount: z.string().optional(),
  deoxidizer: z.string().optional(),
});

const estimateLotItemSchema = z.object({
  id: z.string(),
  lotName: z.string(),
  priceBag: z.string().optional(),
  priceRoll: z.string().optional(),
  deliveryDate: z.string().optional(),
});

const estimateResponseSchema = z.object({
  gravurePlateCost: z.string().optional(),
  colorPlateCost: z.string().optional(),
  price4000Bag: z.string().optional(),
  price4000Roll: z.string().optional(),
  price2000Bag: z.string().optional(),
  price2000Roll: z.string().optional(),
  factoryName: z.string().optional(),
  factoryCode: z.string().optional(),
  lots: z.array(estimateLotItemSchema).optional(),
});

const createRequestSchema = z.object({
  category: z.enum(['delivery_check', 'estimate_request', 'sample_request', 'other']),
  title: z.string().min(1, '件名は必須です').max(100, '件名は100文字以内で入力してください'),
  requesterName: z.string().min(1, '依頼者名は必須です').max(50, '依頼者名は50文字以内で入力してください'),
  requesterDept: z.enum(['sales', 'ccr']),
  issuerName: z.string().max(50).optional(),
  customerName: z.string().max(100).default(''),
  customerCode: z.string().max(50).optional(),
  factoryName: z.string().max(100).optional(),
  factoryCode: z.string().max(50).optional(),
  assigneeName: z.string().max(50).optional(),
  desiredDeliveryDate: z.string().min(1, '希望納期は必須です'),
  details: z.string().max(1000).default(''),
  products: z.array(productItemSchema).optional(),
  estimateDetails: estimateDetailsSchema.optional(),
});

const updateRequestSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'answered', 'on_hold']).optional(),
  assigneeName: z.string().max(50).optional(),
  factoryName: z.string().max(100).optional(),
  factoryCode: z.string().max(50).optional(),
  scheduledPurchaseDate: z.string().optional(),
  incomingQuantity: z.string().optional(),
  estimateResponse: estimateResponseSchema.optional(),
  responseContent: z.string().max(1000).optional(),
  orderNumber: z.string().max(50).optional(),
  desiredDeliveryDate: z.string().optional(),
  details: z.string().max(1000).optional(),
});

export function validateAndSanitizeCreateInput(rawData: unknown): CreateRequestInput {
  const parsed = createRequestSchema.parse(rawData);
  return {
    category: parsed.category,
    title: sanitizeInput(parsed.title),
    requesterName: sanitizeInput(parsed.requesterName),
    requesterDept: parsed.requesterDept,
    issuerName: parsed.issuerName ? sanitizeInput(parsed.issuerName) : undefined,
    customerName: sanitizeInput(parsed.customerName),
    customerCode: parsed.customerCode ? sanitizeInput(parsed.customerCode) : undefined,
    factoryName: parsed.factoryName ? sanitizeInput(parsed.factoryName) : undefined,
    factoryCode: parsed.factoryCode ? sanitizeInput(parsed.factoryCode) : undefined,
    assigneeName: parsed.assigneeName ? sanitizeInput(parsed.assigneeName) : undefined,
    desiredDeliveryDate: parsed.desiredDeliveryDate,
    details: sanitizeInput(parsed.details),
    products: parsed.products
      ? parsed.products.map(p => ({
          id: p.id,
          catalogNumber: p.catalogNumber ? sanitizeInput(p.catalogNumber) : undefined,
          weightKg: p.weightKg ? sanitizeInput(p.weightKg) : undefined,
          productName: sanitizeInput(p.productName),
          quantity: sanitizeInput(p.quantity),
          unit: sanitizeInput(p.unit),
        }))
      : undefined,
    estimateDetails: parsed.estimateDetails
      ? {
          capacity: parsed.estimateDetails.capacity ? sanitizeInput(parsed.estimateDetails.capacity) : undefined,
          quantity: parsed.estimateDetails.quantity ? sanitizeInput(parsed.estimateDetails.quantity) : undefined,
          packageSize: parsed.estimateDetails.packageSize ? sanitizeInput(parsed.estimateDetails.packageSize) : undefined,
          packageForm: parsed.estimateDetails.packageForm ? sanitizeInput(parsed.estimateDetails.packageForm) : undefined,
          structure: parsed.estimateDetails.structure ? sanitizeInput(parsed.estimateDetails.structure) : undefined,
          material: parsed.estimateDetails.material ? sanitizeInput(parsed.estimateDetails.material) : undefined,
          colorCount: parsed.estimateDetails.colorCount ? sanitizeInput(parsed.estimateDetails.colorCount) : undefined,
          deoxidizer: parsed.estimateDetails.deoxidizer ? sanitizeInput(parsed.estimateDetails.deoxidizer) : undefined,
        }
      : undefined,
  };
}

export function validateAndSanitizeUpdateInput(rawData: unknown): UpdateRequestInput {
  const parsed = updateRequestSchema.parse(rawData);
  return {
    status: parsed.status,
    assigneeName: parsed.assigneeName ? sanitizeInput(parsed.assigneeName) : undefined,
    factoryName: parsed.factoryName ? sanitizeInput(parsed.factoryName) : undefined,
    factoryCode: parsed.factoryCode ? sanitizeInput(parsed.factoryCode) : undefined,
    scheduledPurchaseDate: parsed.scheduledPurchaseDate ? sanitizeInput(parsed.scheduledPurchaseDate) : undefined,
    incomingQuantity: parsed.incomingQuantity ? sanitizeInput(parsed.incomingQuantity) : undefined,
    estimateResponse: parsed.estimateResponse
      ? {
          gravurePlateCost: parsed.estimateResponse.gravurePlateCost ? sanitizeInput(parsed.estimateResponse.gravurePlateCost) : undefined,
          colorPlateCost: parsed.estimateResponse.colorPlateCost ? sanitizeInput(parsed.estimateResponse.colorPlateCost) : undefined,
          price4000Bag: parsed.estimateResponse.price4000Bag ? sanitizeInput(parsed.estimateResponse.price4000Bag) : undefined,
          price4000Roll: parsed.estimateResponse.price4000Roll ? sanitizeInput(parsed.estimateResponse.price4000Roll) : undefined,
          price2000Bag: parsed.estimateResponse.price2000Bag ? sanitizeInput(parsed.estimateResponse.price2000Bag) : undefined,
          price2000Roll: parsed.estimateResponse.price2000Roll ? sanitizeInput(parsed.estimateResponse.price2000Roll) : undefined,
          factoryName: parsed.estimateResponse.factoryName ? sanitizeInput(parsed.estimateResponse.factoryName) : undefined,
          factoryCode: parsed.estimateResponse.factoryCode ? sanitizeInput(parsed.estimateResponse.factoryCode) : undefined,
          lots: parsed.estimateResponse.lots
            ? parsed.estimateResponse.lots.map(l => ({
                id: l.id,
                lotName: sanitizeInput(l.lotName),
                priceBag: l.priceBag ? sanitizeInput(l.priceBag) : undefined,
                priceRoll: l.priceRoll ? sanitizeInput(l.priceRoll) : undefined,
                deliveryDate: l.deliveryDate ? sanitizeInput(l.deliveryDate) : undefined,
              }))
            : undefined,
        }
      : undefined,
    responseContent: parsed.responseContent ? sanitizeInput(parsed.responseContent) : undefined,
    orderNumber: parsed.orderNumber ? sanitizeInput(parsed.orderNumber) : undefined,
    desiredDeliveryDate: parsed.desiredDeliveryDate,
    details: parsed.details ? sanitizeInput(parsed.details) : undefined,
  };
}
