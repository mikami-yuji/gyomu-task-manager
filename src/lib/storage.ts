import fs from 'fs';
import path from 'path';
import { BusinessRequest, CreateRequestInput, UpdateRequestInput, NotificationSetting, MemberMaster } from '@/types/request';
import { SALES_PERSONS, CCR_PERSONS, GYOMU_PERSONS, FACTORY_MASTERS } from '@/lib/constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'requests.json');
const NOTIF_FILE_PATH = path.join(DATA_DIR, 'notifications.json');
const MASTER_FILE_PATH = path.join(DATA_DIR, 'masters.json');

// 初期サンプルデータ (本番・クリーン運用時は空配列)
const INITIAL_REQUESTS: BusinessRequest[] = [];

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

const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * アトミックにJSONファイルを安全に保存する関数
 * 一時ファイルに書き出した後、アトミックにリネームすることで同時書き込みや中断時のファイル破損を防止する
 */
function atomicWriteJsonFile(filePath: string, data: unknown): void {
  ensureDataDirectory();
  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonString, 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup error
      }
    }
    console.error(`ファイル保存エラー (${filePath}):`, error);
    throw error;
  }
}

/**
 * データのバックアップを生成する関数
 */
export function createDataBackup(): string {
  ensureDataDirectory();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFileName = `requests_backup_${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  const requests = getAllRequests();
  fs.writeFileSync(backupPath, JSON.stringify(requests, null, 2), 'utf-8');
  return backupFileName;
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
  try {
    atomicWriteJsonFile(FILE_PATH, requests);
  } catch (error) {
    console.error('依頼データ保存エラー:', error);
  }
}

/**
 * 新規依頼作成（管理番号ルール: YYYY/MM/DD-001）
 */
export function createRequest(input: CreateRequestInput): BusinessRequest {
  const requests = getAllRequests();
  
  const nowObj = new Date();
  const year = nowObj.getFullYear();
  const month = String(nowObj.getMonth() + 1).padStart(2, '0');
  const day = String(nowObj.getDate()).padStart(2, '0');
  
  // 管理番号プレフィックス: YYYY/MM/DD
  const datePrefix = `${year}/${month}/${day}`;
  const legacyPrefix = `${year}${month}${day}`;

  // 本日作成された依頼の数をカウント（新形式 YYYY/MM/DD および旧形式 YYYYMMDD の両方に対応）
  const todayCount = requests.filter(r => r.id.includes(datePrefix) || r.id.includes(legacyPrefix)).length + 1;
  
  // 新管理番号フォーマット: YYYY/MM/DD-001
  const newId = `${datePrefix}-${String(todayCount).padStart(3, '0')}`;

  const now = nowObj.toISOString();

  // 工場名・コードがあれば見積回答初期値にもセット
  const initialEstimateResponse = (input.factoryName || input.factoryCode) ? {
    factoryName: input.factoryName,
    factoryCode: input.factoryCode,
  } : undefined;

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
    assigneeName: input.assigneeName,
    factoryName: input.factoryName,
    factoryCode: input.factoryCode,
    products: input.products,
    estimateDetails: input.estimateDetails,
    estimateResponse: initialEstimateResponse,
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

  // 工場更新時は estimateResponse も統合
  let updatedEstimateResponse = input.estimateResponse !== undefined ? input.estimateResponse : current.estimateResponse;
  if (input.factoryName !== undefined || input.factoryCode !== undefined) {
    updatedEstimateResponse = {
      ...(updatedEstimateResponse || {}),
      factoryName: input.factoryName !== undefined ? input.factoryName : updatedEstimateResponse?.factoryName,
      factoryCode: input.factoryCode !== undefined ? input.factoryCode : updatedEstimateResponse?.factoryCode,
    };
  }

  const updated: BusinessRequest = {
    ...current,
    status: input.status !== undefined ? input.status : current.status,
    assigneeName: input.assigneeName !== undefined ? input.assigneeName : current.assigneeName,
    factoryName: input.factoryName !== undefined ? input.factoryName : current.factoryName,
    factoryCode: input.factoryCode !== undefined ? input.factoryCode : current.factoryCode,
    scheduledPurchaseDate: input.scheduledPurchaseDate !== undefined ? input.scheduledPurchaseDate : current.scheduledPurchaseDate,
    incomingQuantity: input.incomingQuantity !== undefined ? input.incomingQuantity : current.incomingQuantity,
    estimateResponse: updatedEstimateResponse,
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
  try {
    atomicWriteJsonFile(NOTIF_FILE_PATH, settings);
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
  try {
    atomicWriteJsonFile(MASTER_FILE_PATH, masters);
  } catch (error) {
    console.error('マスター保存エラー:', error);
  }
}
