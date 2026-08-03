import { FactoryMasterItem } from '@/types/request';

/**
 * 営業担当者マスターリスト
 */
export const SALES_PERSONS = [
  '仲',
  '堀川',
  '山下雄',
  '山下（和）',
  '山下（尚）',
  '山本',
  '広報　小林',
  '木村（寿）',
  '木村（拓）',
  '松本',
  '森田',
  '沖本',
  '片山',
  '菅原',
  '見上',
] as const;

/**
 * CCR担当者マスターリスト
 */
export const CCR_PERSONS = [
  '増田',
  '小河',
  '小西',
  '斎藤',
  '津田',
  '田中',
  '田邉',
  '米原',
  '辻本',
] as const;

/**
 * 業務課担当者マスターリスト (役職なし)
 */
export const GYOMU_PERSONS = [
  '十川',
  '吉田',
  '三浦',
  '榮',
  '玉里',
  '藤井',
] as const;

/**
 * 見積依頼専用 納品形態ドロップダウンマスター（単袋 / ロール）
 */
export const PACKAGE_TYPE_OPTIONS = [
  '単袋',
  'ロール',
] as const;

/**
 * 見積依頼専用 窓の有無ドロップダウンマスター
 */
export const WINDOW_OPTION_OPTIONS = [
  '窓なし',
  '窓あり',
] as const;

/**
 * 見積依頼専用 シール形状・仕様タイプ ドロップダウンマスター
 */
export const PACKAGE_FORM_OPTIONS = [
  'チューブ【微細孔】',
  '三方シール【微細孔】',
  '【ＰＵＫ】三方直線シール',
  '四方 ｼｰﾙ(ｶﾞｾﾞｯﾄ 袋 )ﾁｬｯｸ なし',
  '四方 ｼｰﾙ(ｶﾞｾﾞｯﾄ 袋 )ﾁｬｯｸ あり',
  '合掌ガゼット袋（背貼り）',
  '背貼り袋',
  'S-ZIP',
  '【ＳＳ】四角 Rｶｯﾄ あり ｻｲﾄﾞ5MM',
  '【ＳＳ】四角 Rｶｯﾄ なし ｻｲﾄﾞ5MM',
  'その他 (直接入力)',
] as const;

export const FACTORY_MASTERS: FactoryMasterItem[] = [
  { name: 'Sugano', code: '221' },
  { name: '大和グラビア', code: '554' },
  { name: 'タニーパック', code: '285' },
  { name: '日進', code: '273' },
  { name: '三和工業', code: '171' },
  { name: '西岡製袋', code: '195' },
  { name: '大倉工業', code: '101' },
  { name: '東和グラビア', code: '542' },
  { name: 'CKK', code: '198' },
  { name: '昭和パックス', code: '194' },
  { name: 'シコー', code: '552' },
  { name: 'チューエツ', code: '262' },
  { name: 'ユニード', code: '264' },
  { name: '熊谷', code: '267' },
  { name: '三共ポリエチレン', code: '555' },
  { name: '星野', code: '257' },
  { name: '山葉印刷', code: '556' },
  { name: '福助', code: '104' },
  { name: 'OSP(大阪シーリング)', code: '161' },
  { name: 'NissiNSeaL', code: '283' },
  { name: '丸新グラビア', code: '276' },
];

/**
 * ステータス設定統一（回答済みをグリーン/emeraldにし、完了を撤去）
 */
export const STATUS_CONFIG = {
  pending: {
    label: '未着手',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300',
    cardBorder: 'border-amber-200',
    cardText: 'text-amber-700',
    cardBg: 'bg-amber-50 text-amber-600',
  },
  in_progress: {
    label: '確認中',
    badgeStyle: 'bg-sky-100 text-sky-800 border-sky-300',
    cardBorder: 'border-sky-200',
    cardText: 'text-sky-700',
    cardBg: 'bg-sky-50 text-sky-600',
  },
  answered: {
    label: '回答済み',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cardBorder: 'border-emerald-200',
    cardText: 'text-emerald-700',
    cardBg: 'bg-emerald-50 text-emerald-600',
  },
  on_hold: {
    label: '保留',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300',
    cardBorder: 'border-slate-200',
    cardText: 'text-slate-700',
    cardBg: 'bg-slate-50 text-slate-600',
  },
} as const;
