import nodemailer from 'nodemailer';
import { BusinessRequest, NotificationSetting } from '@/types/request';
import { getAllNotificationSettings } from '@/lib/storage';

/** メール送信オプション型 */
export type MailOption = {
  to: string;
  subject: string;
  html: string;
};

/**
 * SMTPトランスポーターの初期化
 */
function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    // SMTP設定がない場合は開発ログのみを出力
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

/**
 * メールを安全に送信する関数（設定がない場合やエラー発生時はログ出力のみ）
 * @param options 送信オプション
 */
export async function sendEmailSafe(options: MailOption): Promise<boolean> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('[MAIL SIMULATION] メール送信シミュレーション:', options);
      return true;
    }

    const from = process.env.SMTP_FROM || 'gyomu-tool@example.com';
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error('メール送信失敗:', error);
    return false;
  }
}

/**
 * 新規依頼作成時のメール通知を送信する関数
 * @param request 新規作成された業務課依頼データ
 */
export async function notifyNewRequestCreated(request: BusinessRequest): Promise<void> {
  const settings = getAllNotificationSettings();
  // 依頼者または設定済みユーザーへの送信アドレス特定
  const targetEmails = settings
    .filter(s => s.notifyOnCreate && s.email)
    .map(s => s.email);

  if (targetEmails.length === 0) return;

  const categoryLabel = request.category === 'delivery_check' ? '納期確認' :
                        request.category === 'estimate_request' ? '見積依頼' :
                        request.category === 'sample_request' ? 'サンプル手配' : 'その他';

  const subject = `【業務課依頼】新規受付: [${categoryLabel}] ${request.title} (${request.id})`;
  const html = `
    <h2>業務課への新規依頼が登録されました</h2>
    <p><strong>依頼番号:</strong> ${request.id}</p>
    <p><strong>カテゴリ:</strong> ${categoryLabel}</p>
    <p><strong>件名:</strong> ${request.title}</p>
    <p><strong>依頼者:</strong> ${request.requesterName} (${request.requesterDept.toUpperCase()})</p>
    <p><strong>得意先:</strong> ${request.customerName || '未指定'}</p>
    <p><strong>希望納期:</strong> ${request.desiredDeliveryDate}</p>
    <hr>
    <p><strong>依頼内容:</strong></p>
    <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${request.details}</pre>
  `;

  await sendEmailSafe({
    to: targetEmails.join(','),
    subject,
    html,
  });
}

/**
 * 依頼回答・ステータス更新時のメール通知を送信する関数
 * @param request 更新された業務課依頼データ
 */
export async function notifyRequestUpdated(request: BusinessRequest): Promise<void> {
  const settings = getAllNotificationSettings();
  const targetEmails = settings
    .filter(s => (request.status === 'answered' ? (s.notifyOnAnswer || s.notifyOnComplete) : s.notifyOnAnswer) && s.email)
    .map(s => s.email);

  if (targetEmails.length === 0) return;

  const statusLabel = request.status === 'answered' ? '回答済み' :
                      request.status === 'in_progress' ? '確認中' : '更新';

  const subject = `【業務課依頼】[${statusLabel}] ${request.title} (${request.id})`;
  const html = `
    <h2>依頼の進捗ステータスが更新されました</h2>
    <p><strong>依頼番号:</strong> ${request.id}</p>
    <p><strong>件名:</strong> ${request.title}</p>
    <p><strong>現在のステータス:</strong> ${statusLabel}</p>
    <p><strong>業務課担当者:</strong> ${request.assigneeName || '未割り当て'}</p>
    ${request.orderNumber ? `<p><strong>関連/受注番号:</strong> ${request.orderNumber}</p>` : ''}
    <hr>
    <p><strong>業務課からの回答内容:</strong></p>
    <pre style="background: #eef9ff; padding: 10px; border-radius: 5px; border-left: 4px solid #0284c7;">${request.responseContent || 'なし'}</pre>
  `;

  await sendEmailSafe({
    to: targetEmails.join(','),
    subject,
    html,
  });
}
