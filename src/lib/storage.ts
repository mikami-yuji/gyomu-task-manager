import fs from 'fs';
import path from 'path';
import { BusinessRequest, CreateRequestInput, UpdateRequestInput, NotificationSetting, MemberMaster } from '@/types/request';
import { SALES_PERSONS, CCR_PERSONS, GYOMU_PERSONS, FACTORY_MASTERS } from '@/lib/constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'requests.json');
const NOTIF_FILE_PATH = path.join(DATA_DIR, 'notifications.json');
const MASTER_FILE_PATH = path.join(DATA_DIR, 'masters.json');

// 初期サンプルデータ
const INITIAL_REQUESTS: BusinessRequest[] = [
  {
    id: 'GYM-20260803-001',
    category: 'delivery_check',
    title: '【欠品納期問合せ】風そよぐ稲 TS 5kg',
    requesterName: '見上',
    requesterDept: 'sales',
    customerName: '丸三',
    customerCode: '53016',
    desiredDeliveryDate: '2026-08-10',
    details: 'カタログ№887 5kg 600枚の欠品納期問合せです。',
    products: [
      {
        id: 'p-1',
        catalogNumber: '887',
        weightKg: '5',
        productName: '風そよぐ稲 TS',
        quantity: '600',
        unit: '枚',
      },
    ],
    attachments: [],
    status: 'in_progress',
    assigneeName: '吉田',
    scheduledPurchaseDate: '2026-08-08',
    incomingQuantity: '600枚',
    responseContent: '仕入先に確認中。8月8日入荷予定です。',
    createdAt: '2026-08-03T09:00:00.000Z',
    updatedAt: '2026-08-03T09:30:00.000Z',
  },
  {
    id: 'GYM-20260803-002',
    category: 'estimate_request',
    title: '【見積依頼】500g アルミチャック袋 2000m/4000m',
    requesterName: '増田',
    requesterDept: 'ccr',
    customerName: 'スズリョーベルックス',
    customerCode: '74418',
    desiredDeliveryDate: '2026-08-08',
    details: '添付の仕様で2,000mロットおよび4,000mロットの見積もりをお願いします。',
    estimateDetails: {
      capacity: '500g',
      quantity: '2000 / 4000',
      packageSize: '140mm × 220mm',
      packageForm: '単袋・三方シール・アルミチャック',
      structure: 'PET12 / AL7 / LLDPE60',
      material: 'アルミチャック袋',
      colorCount: '5色 グラビア印刷',
      deoxidizer: '無',
    },
    estimateResponse: {
      gravurePlateCost: '180,000円',
      colorPlateCost: '220,000円',
      price4000Bag: '28.5円/枚',
      price4000Roll: '14.2円/m',
      price2000Bag: '34.0円/枚',
      price2000Roll: '17.0円/m',
      factoryName: 'Sugano',
      factoryCode: '221',
    },
    attachments: [],
    status: 'answered',
    assigneeName: '十川',
    responseContent: '版代およびロット別単価の見積もりを算出いたしました。ご確認ください。',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-03T11:15:00.000Z',
  },
];

const INITIAL_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: 'notif-1',
    name: '営業部 全体通知',
    department: 'sales',
    email: 'sales-all@example.com',
    notifyOnCreate: true,
    notifyOnAnswer: true,
    notifyOnComplete: true,
  },
  {
    id: 'notif-2',
    name: 'CCR部 通知窓口',
    department: 'ccr',
    email: 'ccr-desk@example.com',
    notifyOnCreate: true,
    notifyOnAnswer: true,
    notifyOnComplete: true,
  },
];

const INITIAL_MASTERS: MemberMaster = {
  sales: [...SALES_PERSONS],
  ccr: [...CCR_PERSONS],
  gyomu: [...GYOMU_PERSONS],
  factories: [...FACTORY_MASTERS],
  memberEmails: {},
};

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getAllRequests(): BusinessRequest[] {
  ensureDataDirectory();
  if (!fs.existsSync(FILE_PATH)) {
    saveRequests(INITIAL_REQUESTS);
    return INITIAL_REQUESTS;
  }
  try {
    const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error('依頼データ読み込みエラー:', error);
    return INITIAL_REQUESTS;
  }
}

export function getRequestById(id: string): BusinessRequest | undefined {
  const requests = getAllRequests();
  return requests.find(r => r.id === id);
}

export function saveRequests(requests: BusinessRequest[]): void {
  ensureDataDirectory();
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (error) {
    console.error('依頼データ保存エラー:', error);
  }
}

export function createRequest(input: CreateRequestInput): BusinessRequest {
  const requests = getAllRequests();
  
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayCount = requests.filter(r => r.id.includes(todayStr)).length + 1;
  const newId = `GYM-${todayStr}-${String(todayCount).padStart(3, '0')}`;

  const now = new Date().toISOString();
  const newRequest: BusinessRequest = {
    id: newId,
    category: input.category,
    title: input.title,
    requesterName: input.requesterName,
    requesterDept: input.requesterDept,
    issuerName: input.issuerName,
    customerName: input.customerName,
    customerCode: input.customerCode,
    desiredDeliveryDate: input.desiredDeliveryDate,
    details: input.details,
    products: input.products,
    estimateDetails: input.estimateDetails,
    attachments: input.attachments || [],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  requests.unshift(newRequest);
  saveRequests(requests);
  return newRequest;
}

export const saveNewRequest = createRequest;

export function updateRequest(id: string, input: UpdateRequestInput): BusinessRequest | null {
  const requests = getAllRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const current = requests[index];
  const now = new Date().toISOString();

  const updated: BusinessRequest = {
    ...current,
    status: input.status !== undefined ? input.status : current.status,
    assigneeName: input.assigneeName !== undefined ? input.assigneeName : current.assigneeName,
    scheduledPurchaseDate: input.scheduledPurchaseDate !== undefined ? input.scheduledPurchaseDate : current.scheduledPurchaseDate,
    incomingQuantity: input.incomingQuantity !== undefined ? input.incomingQuantity : current.incomingQuantity,
    estimateResponse: input.estimateResponse !== undefined ? input.estimateResponse : current.estimateResponse,
    responseContent: input.responseContent !== undefined ? input.responseContent : current.responseContent,
    orderNumber: input.orderNumber !== undefined ? input.orderNumber : current.orderNumber,
    desiredDeliveryDate: input.desiredDeliveryDate !== undefined ? input.desiredDeliveryDate : current.desiredDeliveryDate,
    details: input.details !== undefined ? input.details : current.details,
    completedAt: input.status === 'answered' ? now : current.completedAt,
    updatedAt: now,
  };

  requests[index] = updated;
  saveRequests(requests);
  return updated;
}

export function getNotificationSettings(): NotificationSetting[] {
  ensureDataDirectory();
  if (!fs.existsSync(NOTIF_FILE_PATH)) {
    saveNotificationSettings(INITIAL_NOTIFICATIONS);
    return INITIAL_NOTIFICATIONS;
  }
  try {
    const fileData = fs.readFileSync(NOTIF_FILE_PATH, 'utf-8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error('通知設定読み込みエラー:', error);
    return INITIAL_NOTIFICATIONS;
  }
}

export const getAllNotificationSettings = getNotificationSettings;

export function saveNotificationSettings(settings: NotificationSetting[]): void {
  ensureDataDirectory();
  try {
    fs.writeFileSync(NOTIF_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('通知設定保存エラー:', error);
  }
}

export function getMemberMasters(): MemberMaster {
  ensureDataDirectory();
  if (!fs.existsSync(MASTER_FILE_PATH)) {
    saveMemberMasters(INITIAL_MASTERS);
    return INITIAL_MASTERS;
  }
  try {
    const fileData = fs.readFileSync(MASTER_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(fileData);
    return {
      sales: parsed.sales || [...SALES_PERSONS],
      ccr: parsed.ccr || [...CCR_PERSONS],
      gyomu: parsed.gyomu || [...GYOMU_PERSONS],
      factories: parsed.factories || [...FACTORY_MASTERS],
      memberEmails: parsed.memberEmails || {},
    };
  } catch (error) {
    console.error('マスター読み込みエラー:', error);
    return INITIAL_MASTERS;
  }
}

export function saveMemberMasters(masters: MemberMaster): void {
  ensureDataDirectory();
  try {
    fs.writeFileSync(MASTER_FILE_PATH, JSON.stringify(masters, null, 2), 'utf-8');
  } catch (error) {
    console.error('マスター保存エラー:', error);
  }
}
