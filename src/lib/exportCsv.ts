import { BusinessRequest } from '@/types/request';

/**
 * 依頼リストをExcel対応のCSV文字列に変換してブラウザでダウンロードする関数
 */
export function exportRequestsToCsv(requests: BusinessRequest[], filename = 'gyomu_requests.csv'): void {
  const headers = [
    '依頼番号',
    '依頼種別',
    '件名',
    '発信者',
    '発信部署',
    '業務担当者',
    '得意先名',
    '得意先コード',
    '希望納期',
    'ステータス',
    '工場名',
    '工場コード',
    '仕入入荷予定日',
    '入荷数量',
    '受注番号',
    '業務課回答内容',
    '受付日時',
    '完了日時',
  ];

  const escapeCsv = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const getCategoryName = (cat: string) => {
    if (cat === 'delivery_check') return '欠品/納期問合せ';
    if (cat === 'estimate_request') return '見積依頼';
    if (cat === 'sample_request' || cat === 'work_order') return '仕掛手配';
    return 'その他';
  };

  const getStatusName = (st: string) => {
    if (st === 'answered' || st === 'completed') return '回答済み';
    if (st === 'in_progress') return '確認中';
    if (st === 'on_hold') return '保留';
    return '未対応';
  };

  const rows = requests.map(r => {
    return [
      escapeCsv(r.id),
      escapeCsv(getCategoryName(r.category)),
      escapeCsv(r.title),
      escapeCsv(r.requesterName),
      escapeCsv(r.requesterDept === 'sales' ? '営業' : 'CCR'),
      escapeCsv(r.assigneeName || ''),
      escapeCsv(r.customerName || ''),
      escapeCsv(r.customerCode || ''),
      escapeCsv(r.desiredDeliveryDate || ''),
      escapeCsv(getStatusName(r.status)),
      escapeCsv(r.estimateResponse?.factoryName || r.factoryName || ''),
      escapeCsv(r.estimateResponse?.factoryCode || r.factoryCode || ''),
      escapeCsv(r.scheduledPurchaseDate || ''),
      escapeCsv(r.incomingQuantity || ''),
      escapeCsv(r.orderNumber || ''),
      escapeCsv(r.responseContent || ''),
      escapeCsv(r.createdAt ? r.createdAt.substring(0, 19).replace('T', ' ') : ''),
      escapeCsv(r.completedAt ? r.completedAt.substring(0, 19).replace('T', ' ') : ''),
    ].join(',');
  });

  // UTF-8 BOM を付与してExcelでの日本語文字化けを防止
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
