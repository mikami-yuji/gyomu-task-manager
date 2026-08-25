import nodemailer from 'nodemailer';
import { BusinessRequest } from '@/types/request';
import { getAllNotificationSettings, getSmtpSettings, getMemberMasters } from '@/lib/storage';

/** メール送信オプション型 */
export type MailOption = {
  to: string;
  subject: string;
  html: string;
};

/**
 * SMTPトランスポーターの初期化（画面設定または環境変数を参照）
 */
function createTransporter(): { transporter: nodemailer.Transporter | null; from: string } {
  const smtp = getSmtpSettings();

  // 1. 画面設定が有効な場合
  if (smtp.enabled && smtp.host) {
    const from = smtp.fromEmail
      ? `"${smtp.fromName || '業務課タスク管理'}" <${smtp.fromEmail}>`
      : 'gyomu-desk@example.com';

    const transportConfig: nodemailer.TransportOptions = {
      host: smtp.host,
      port: smtp.port || 587,
      secure: smtp.port === 465,
      requireTLS: smtp.port === 587,
      auth: (smtp.useAuth !== false && smtp.user && smtp.pass)
        ? { user: smtp.user, pass: smtp.pass }
        : undefined,
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false, // 社内自己署名証明書・社内リレーでも安全に接続
      },
    } as unknown as nodemailer.TransportOptions;

    return {
      transporter: nodemailer.createTransport(transportConfig),
      from,
    };
  }

  // 2. 環境変数 (.env) が設定されている場合
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host) {
    const from = process.env.SMTP_FROM || 'gyomu-desk@example.com';
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
        tls: { rejectUnauthorized: false },
      }),
      from,
    };
  }

  // 3. SMTP未設定の場合
  return { transporter: null, from: 'gyomu-desk@example.com' };
}

/**
 * メールを安全に送信する関数（設定がない場合やエラー発生時はログ出力のみ）
 */
export async function sendEmailSafe(options: MailOption): Promise<{ success: boolean; message?: string }> {
  try {
    const { transporter, from } = createTransporter();
    if (!transporter) {
      console.log('[MAIL SIMULATION] メール送信シミュレーション (SMTP未設定):', options);
      return { success: true, message: 'SMTP未設定のためシミュレーション送信されました' };
    }

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log('[MAIL SENT] メール送信完了:', info.messageId, '宛先:', options.to);
    return { success: true, message: 'メールが正常に送信されました' };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('メール送信失敗:', err);
    return { success: false, message: err.message || 'メール送信エラー' };
  }
}

/**
 * 新規依頼作成時のメール通知を送信する関数
 */
export async function notifyNewRequestCreated(request: BusinessRequest): Promise<void> {
  const smtp = getSmtpSettings();
  if (smtp.enabled && smtp.notifyOnCreate === false) return;

  const notifSettings = getAllNotificationSettings();
  const masters = getMemberMasters();
  const emails = new Set<string>();

  // 業務課メンバー全員の登録メールアドレスを追加
  (masters.gyomu || []).forEach(name => {
    const em = masters.memberEmails?.[name];
    if (em && em.includes('@')) emails.add(em);
  });

  // 通知設定で新規通知ONのアドレスを追加
  notifSettings
    .filter(s => s.notifyOnCreate && s.email && s.email.includes('@'))
    .forEach(s => emails.add(s.email));

  if (emails.size === 0) return;

  const categoryLabel = request.category === 'delivery_check' ? '納期確認' :
                        request.category === 'estimate_request' ? '見積依頼' :
                        (request.category === 'sample_request' || request.category === 'work_order') ? '仕掛手配' : 'その他';

  const subject = `【業務課依頼 受付】[${categoryLabel}] ${request.title} (${request.id})`;
  const html = `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 6px;">
        業務課への新規依頼が登録されました
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr><td style="padding: 6px 10px; font-weight: bold; background: #f1f5f9; width: 140px; border: 1px solid #cbd5e1;">依頼番号</td><td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${request.id}</td></tr>
        <tr><td style="padding: 6px 10px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1;">カテゴリ</td><td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${categoryLabel}</td></tr>
        <tr><td style="padding: 6px 10px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1;">件名</td><td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${request.title}</td></tr>
        <tr><td style="padding: 6px 10px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1;">発信者</td><td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${request.requesterName} (${request.requesterDept === 'sales' ? '営業部' : 'CCR部'})</td></tr>
        <tr><td style="padding: 6px 10px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1;">得意先名</td><td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${request.customerName || '未指定'}${request.customerCode ? ` (CD: ${request.customerCode})` : ''}</td></tr>
        <tr><td style="padding: 6px 10px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1;">希望納期</td><td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #b45309;">${request.desiredDeliveryDate}</td></tr>
      </table>

      ${request.products && request.products.length > 0 ? `
        <h4 style="margin-top: 20px; color: #1e293b;">【商品明細】</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="border: 1px solid #cbd5e1; padding: 6px;">カタログ№</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px;">容量</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px;">商品名</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px;">数量</th>
            </tr>
          </thead>
          <tbody>
            ${request.products.map(p => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace;">${p.catalogNumber || '-'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">${p.weightKg ? `${p.weightKg}kg` : '-'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${p.productName}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; color: #0369a1;">${p.quantity} ${p.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${request.details ? `
        <h4 style="margin-top: 20px; color: #1e293b;">【特記事項・備考】</h4>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 13px;">${request.details}</div>
      ` : ''}
    </div>
  `;

  await sendEmailSafe({
    to: Array.from(emails).join(','),
    subject,
    html,
  });
}

/**
 * 依頼回答・ステータス更新時のメール通知を送信する関数
 */
export async function notifyRequestUpdated(request: BusinessRequest): Promise<void> {
  const smtp = getSmtpSettings();
  if (smtp.enabled && smtp.notifyOnAnswer === false) return;

  const notifSettings = getAllNotificationSettings();
  const masters = getMemberMasters();
  const emails = new Set<string>();

  // 依頼者本人のメールアドレスを特定して追加
  if (request.requesterName) {
    const em = masters.memberEmails?.[request.requesterName];
    if (em && em.includes('@')) emails.add(em);
  }

  // 通知設定のアドレスを追加
  notifSettings
    .filter(s => (request.status === 'answered' ? (s.notifyOnAnswer || s.notifyOnComplete) : s.notifyOnAnswer) && s.email && s.email.includes('@'))
    .forEach(s => emails.add(s.email));

  if (emails.size === 0) return;

  const statusLabel = request.status === 'answered' ? '回答済み' :
                      request.status === 'in_progress' ? '確認中' : '進捗更新';

  const subject = `【業務課回答: ${statusLabel}】${request.title} (${request.id})`;
  const html = `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 6px;">
        依頼の回答・進捗ステータスが更新されました
      </h2>
      <p><strong>依頼番号:</strong> ${request.id}</p>
      <p><strong>件名:</strong> ${request.title}</p>
      <p><strong>現在のステータス:</strong> <span style="font-weight: bold; color: #059669;">${statusLabel}</span></p>
      <p><strong>業務課担当者:</strong> ${request.assigneeName || '業務課'}</p>
      ${request.scheduledPurchaseDate ? `<p><strong>仕入/入荷予定日:</strong> <span style="font-weight: bold; color: #b45309;">${request.scheduledPurchaseDate}</span></p>` : ''}
      ${request.incomingQuantity ? `<p><strong>入荷数量:</strong> ${request.incomingQuantity}</p>` : ''}
      ${request.orderNumber ? `<p><strong>関連受注番号:</strong> ${request.orderNumber}</p>` : ''}
      
      <div style="margin-top: 20px;">
        <h4 style="color: #0284c7; margin-bottom: 6px;">【業務課からの回答内容】</h4>
        <div style="background: #eef9ff; padding: 12px; border-radius: 6px; border-left: 4px solid #0284c7; white-space: pre-wrap; font-size: 13px;">
          ${request.responseContent || '回答内容の登録はありません'}
        </div>
      </div>
    </div>
  `;

  await sendEmailSafe({
    to: Array.from(emails).join(','),
    subject,
    html,
  });
}

/**
 * 上長承認完了時のメール通知
 */
export async function notifyRequestApproved(request: BusinessRequest): Promise<void> {
  const smtp = getSmtpSettings();
  if (smtp.enabled && smtp.notifyOnApproval === false) return;

  const masters = getMemberMasters();
  const emails = new Set<string>();

  // 業務課メンバー
  (masters.gyomu || []).forEach(name => {
    const em = masters.memberEmails?.[name];
    if (em && em.includes('@')) emails.add(em);
  });

  // 依頼者
  if (request.requesterName) {
    const em = masters.memberEmails?.[request.requesterName];
    if (em && em.includes('@')) emails.add(em);
  }

  if (emails.size === 0) return;

  const subject = `【上長承認完了】[仕掛手配] ${request.title} (${request.id})`;
  const html = `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #be123c; border-bottom: 2px solid #be123c; padding-bottom: 6px;">
        仕掛手配の上長承認が完了しました
      </h2>
      <p><strong>依頼番号:</strong> ${request.id}</p>
      <p><strong>件名:</strong> ${request.title}</p>
      <p><strong>承認者:</strong> <strong>${request.approverName || '上長'}</strong></p>
      <p><strong>承認日時:</strong> ${new Date(request.approvedAt || '').toLocaleString('ja-JP')}</p>
      <p style="margin-top: 15px; color: #475569;">※上長の承認が完了したため、業務課にて手配を進めてください。</p>
    </div>
  `;

  await sendEmailSafe({
    to: Array.from(emails).join(','),
    subject,
    html,
  });
}
