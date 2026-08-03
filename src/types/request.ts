// 型定義はsrc/typesに集約（user_globalルール25）

/** 依頼カテゴリ */
export type RequestCategory = 'delivery_check' | 'estimate_request' | 'sample_request' | 'other';

/** 依頼ステータス (完了を廃止し「回答済み」に一本化) */
export type RequestStatus = 'pending' | 'in_progress' | 'answered' | 'on_hold';

/** 部署 (営業 / CCR のみ) */
export type Department = 'sales' | 'ccr';

/** 添付ファイル情報 */
export type AttachmentFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

/** 商品明細（欠品納期問合せ用） */
export type ProductItem = {
  id: string;
  catalogNumber?: string; // カタログ№
  weightKg?: string;      // 容量・重量 (kg)
  productName: string;   // 商品名
  quantity: string;      // 必要数量
  unit: string;          // 単位 (枚 / m)
};

/** 見積依頼専用 入力詳細 */
export type EstimateDetails = {
  capacity?: string;      // 容量
  quantity?: string;      // 数量
  packageSize?: string;   // サイズ（幅×ピッチ）
  packageType?: string;   // ロール/単袋
  packageForm?: string;   // シール形状・仕様タイプ
  windowOption?: string;  // 窓の有無 (窓あり / 窓なし)
  structure?: string;     // 構成
  material?: string;      // 材質
  colorCount?: string;    // 色数
  deoxidizer?: string;    // 脱酸素剤使用の有無（真空の場合のみ）
};

/** ロット別見積回答アイテム */
export type EstimateLotItem = {
  id: string;
  lotName: string;         // 数量・ロット名 (数値または指定名)
  priceBag?: string;       // 単袋 (円/枚)
  priceRoll?: string;      // ロール (円/m)
  deliveryDate?: string;   // 納期目安 (手配後)
};

/** 見積依頼専用 業務回答詳細 */
export type EstimateResponse = {
  gravurePlateCost?: string; // グラビア版（掛け合わせなし）
  colorPlateCost?: string;   // カラー版（掛け合わせあり）
  price4000Bag?: string;     // 互換用
  price4000Roll?: string;
  price2000Bag?: string;
  price2000Roll?: string;
  lots?: EstimateLotItem[];  // 動的複数ロット回答リスト
  factoryName?: string;      // 工場名
  factoryCode?: string;      // 工場コード
};

/** 業務課依頼データモデル */
export type BusinessRequest = {
  id: string; // 依頼番号 (例: GYM-20260803-001)
  category: RequestCategory;
  title: string;
  requesterName: string;
  requesterDept: Department;
  issuerName?: string;
  customerName: string;
  customerCode?: string; // 得意先CD
  desiredDeliveryDate: string; // 希望納期 YYYY-MM-DD
  details: string;
  products?: ProductItem[]; // 欠品商品明細リスト
  estimateDetails?: EstimateDetails; // 見積依頼用詳細項目
  attachments: AttachmentFile[];
  status: RequestStatus;
  assigneeName?: string; // 業務課/仕入担当者
  scheduledPurchaseDate?: string; // 仕入予定日 / 入荷予定日
  incomingQuantity?: string; // 入荷数量
  estimateResponse?: EstimateResponse; // 見積回答（業務記入）
  responseContent?: string; // 業務課・仕入Gからの回答コメント
  orderNumber?: string; // 受注番号
  completedAt?: string; // 完了日時 ISO文字列
  createdAt: string; // 作成日時 ISO文字列
  updatedAt: string; // 更新日時 ISO文字列
};

/** 新規依頼作成パラメータ */
export type CreateRequestInput = {
  category: RequestCategory;
  title: string;
  requesterName: string;
  requesterDept: Department;
  issuerName?: string;
  customerName: string;
  customerCode?: string;
  desiredDeliveryDate: string;
  details: string;
  products?: ProductItem[];
  estimateDetails?: EstimateDetails;
  attachments?: AttachmentFile[];
};

/** 依頼更新パラメータ */
export type UpdateRequestInput = {
  status?: RequestStatus;
  assigneeName?: string;
  scheduledPurchaseDate?: string;
  incomingQuantity?: string;
  estimateResponse?: EstimateResponse;
  responseContent?: string;
  orderNumber?: string;
  desiredDeliveryDate?: string;
  details?: string;
};

/** 担当者別通知メール設定 */
export type NotificationSetting = {
  id: string;
  name: string;
  department: Department;
  email: string;
  notifyOnCreate: boolean;
  notifyOnAnswer: boolean;
  notifyOnComplete: boolean;
};

/** 工場マスター項目（工場別に担当業務員を割り当て可能） */
export type FactoryMasterItem = {
  name: string;
  code: string;
  defaultAssignee?: string; // 工場別の担当業務員名
};

/** マスターリスト（営業・CCR・業務課・工場・個人別メール） */
export type MemberMaster = {
  sales: string[];
  ccr: string[];
  gyomu: string[];
  factories?: FactoryMasterItem[];
  memberEmails?: Record<string, string>; // 個人別メールアドレス設定
};
