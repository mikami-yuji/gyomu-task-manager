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
  // テスト実行環境では安全のため実送信をスキップ
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return { transporter: null, from: 'gyomu-desk@asahipac.co.jp' };
  }

  const smtp = getSmtpSettings();

  // 1. 画面設定が有効な場合
  if (smtp.enabled && smtp.host) {
    const from = smtp.fromEmail
      ? `"${smtp.fromName || '業務課タスク管理'}" <${smtp.fromEmail}>`
      : 'gyomu-desk@asahipac.co.jp';

    const transportConfig: nodemailer.TransportOptions = {
      host: smtp.host,
      port: smtp.port || 25,
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
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 25;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host) {
    const from = process.env.SMTP_FROM || 'gyomu-desk@asahipac.co.jp';
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
  return { transporter: null, from: 'gyomu-desk@asahipac.co.jp' };
}

/**
 * メールを安全に送信する関数（設定がない場合やエラー発生時はログ出力のみ）
 */
export async function sendEmailSafe(options: MailOption): Promise<boolean> {
  try {
    const { transporter, from } = createTransporter();
    if (!transporter) {
      console.log('[MAIL SIMULATION] メール送信シミュレーション (SMTP未設定またはテスト環境):', options);
      return true;
    }

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log('[MAIL SENT] メール送信完了:', info.messageId, '宛先:', options.to);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('メール送信失敗:', err);
    return false;
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

  const categoryLabel =
    request.category === 'delivery_check' ? '欠品/納期問合せ' :
    request.category === 'estimate_request' ? '見積依頼' :
    (request.category === 'sample_request' || request.category === 'work_order') ? '仕掛手配' : 'その他依頼';

  const subject = `【業務課受付】[${categoryLabel}] ${request.title} (${request.id})`;
  const html = `
    <div style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; color: #1e293b; line-height: 1.6; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="background-color: #0284c7; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">【新規受付】業務課への依頼が登録されました</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">依頼番号: ${request.id} / 受付日: ${new Date(request.createdAt).toLocaleDateString('ja-JP')}</p>
      </div>

      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; width: 120px; border: 1px solid #e2e8f0;">依頼カテゴリ</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #0284c7;">${categoryLabel}</td>
            <td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; width: 100px; border: 1px solid #e2e8f0;">発信者</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">${request.requesterName} (${request.requesterDept === 'sales' ? '営業部' : 'CCR部'})</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">件名</td>
            <td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 14px;">${request.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">得意先名</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${request.customerName || '未指定'}${request.customerCode ? ` (CD: ${request.customerCode})` : ''}</td>
            <td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">希望納期</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #b45309;">${request.desiredDeliveryDate || '指定なし'}</td>
          </tr>
          ${request.factoryName || request.factoryCode ? `
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">依頼先工場</td>
              <td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0;">${request.factoryName || ''} ${request.factoryCode ? `(工場コード: ${request.factoryCode})` : ''}</td>
            </tr>
          ` : ''}
        </table>

        ${/* 商品明細テーブル */ ''}
        ${request.products && request.products.length > 0 ? `
          <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 20px 0 8px 0; border-left: 4px solid #0284c7; padding-left: 8px;">
            【商品明細】
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="border: 1px solid #cbd5e1; padding: 8px; width: 110px;">カタログ№</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; width: 80px;">容量</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">商品名</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; width: 100px; text-align: right;">数量</th>
              </tr>
            </thead>
            <tbody>
              ${request.products.map(p => `
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; font-family: monospace; font-weight: bold;">${p.catalogNumber || '-'}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px;">${p.weightKg ? `${p.weightKg}kg` : '-'}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${p.productName}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold; color: #0369a1;">${p.quantity} ${p.unit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${/* 見積依頼の仕様詳細 */ ''}
        ${request.estimateDetails ? `
          <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 20px 0 8px 0; border-left: 4px solid #4f46e5; padding-left: 8px;">
            【見積依頼 仕様詳細】
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 10px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; width: 120px;">容量 / 数量</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.estimateDetails.capacity || '-'} / ${request.estimateDetails.quantity || '-'}</td>
              <td style="padding: 6px 10px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; width: 100px;">サイズ</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.estimateDetails.packageSize || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 10px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">形態 / 形状</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.estimateDetails.packageForm || '-'}</td>
              <td style="padding: 6px 10px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">構成 / 材質</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.estimateDetails.structure || '-'} / ${request.estimateDetails.material || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 10px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">色数</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.estimateDetails.colorCount || '-'}</td>
              <td style="padding: 6px 10px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">脱酸素剤</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.estimateDetails.deoxidizer || '-'}</td>
            </tr>
          </table>
        ` : ''}

        ${request.details ? `
          <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 20px 0 8px 0; border-left: 4px solid #64748b; padding-left: 8px;">
            【特記事項・依頼内容】
          </h3>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 6px; white-space: pre-wrap; font-size: 13px; line-height: 1.6;">${request.details}</div>
        ` : ''}
      </div>

      <div style="background: #f1f5f9; padding: 10px 20px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
        ※本メールは業務課タスク管理システムからの自動送信メールです。
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

  const statusLabel =
    request.status === 'answered' ? '回答完了' :
    request.status === 'in_progress' ? '確認中' : '進捗更新';

  const statusColor =
    request.status === 'answered' ? '#059669' :
    request.status === 'in_progress' ? '#d97706' : '#0284c7';

  const subject = `【業務課回答: ${statusLabel}】${request.title} (${request.id})`;
  const html = `
    <div style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; color: #1e293b; line-height: 1.6; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="background-color: ${statusColor}; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">【${statusLabel}】業務課より依頼の回答・進捗が更新されました</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">依頼番号: ${request.id} / 業務担当者: ${request.assigneeName || '業務課'}</p>
      </div>

      <div style="padding: 20px;">
        ${/* 業務課回答ハイライトBOX */ ''}
        <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #166534; display: flex; align-items: center;">
            🟢 業務課からの回答内容
          </h3>
          <div style="font-size: 14px; font-weight: bold; color: #14532d; white-space: pre-wrap; line-height: 1.7;">
            ${request.responseContent || '回答内容の登録はありません'}
          </div>

          ${(request.scheduledPurchaseDate || request.incomingQuantity || request.orderNumber) ? `
            <hr style="border: 0; border-top: 1px dashed #86efac; margin: 12px 0;">
            <div style="font-size: 13px; color: #166534;">
              ${request.scheduledPurchaseDate ? `<p style="margin: 3px 0;"><strong>仕入/入荷予定日:</strong> <span style="font-size: 14px; font-weight: bold; color: #b45309;">${request.scheduledPurchaseDate}</span></p>` : ''}
              ${request.incomingQuantity ? `<p style="margin: 3px 0;"><strong>入荷数量:</strong> <span style="font-weight: bold;">${request.incomingQuantity}</span></p>` : ''}
              ${request.orderNumber ? `<p style="margin: 3px 0;"><strong>関連受注番号:</strong> <span style="font-family: monospace; font-weight: bold;">${request.orderNumber}</span></p>` : ''}
            </div>
          ` : ''}
        </div>

        ${/* 見積回答テーブル */ ''}
        ${request.estimateResponse?.lots && request.estimateResponse.lots.length > 0 ? `
          <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 20px 0 8px 0; border-left: 4px solid #059669; padding-left: 8px;">
            【ロット別 見積回答】
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #ecfdf5; text-align: left;">
                <th style="border: 1px solid #a7f3d0; padding: 8px;">ロット・数量</th>
                <th style="border: 1px solid #a7f3d0; padding: 8px;">単袋単価 (円/枚)</th>
                <th style="border: 1px solid #a7f3d0; padding: 8px;">ロール単価 (円/m)</th>
                <th style="border: 1px solid #a7f3d0; padding: 8px;">納期目安</th>
              </tr>
            </thead>
            <tbody>
              ${request.estimateResponse.lots.map(lot => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: bold;">${lot.lotName || '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: bold; color: #059669;">${lot.priceBag ? `¥${lot.priceBag}` : '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: bold; color: #0284c7;">${lot.priceRoll ? `¥${lot.priceRoll}` : '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">${lot.deliveryDate || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${(request.estimateResponse.gravurePlateCost || request.estimateResponse.colorPlateCost) ? `
            <div style="font-size: 12px; color: #475569; margin-top: -10px; margin-bottom: 15px;">
              ${request.estimateResponse.gravurePlateCost ? `<span>■ グラビア版代: ¥${request.estimateResponse.gravurePlateCost} </span>` : ''}
              ${request.estimateResponse.colorPlateCost ? `<span>■ カラー版代: ¥${request.estimateResponse.colorPlateCost}</span>` : ''}
            </div>
          ` : ''}
        ` : ''}

        ${/* 元の依頼概要 */ ''}
        <h3 style="font-size: 14px; font-weight: bold; color: #475569; margin: 25px 0 8px 0; border-left: 4px solid #94a3b8; padding-left: 8px;">
          【元の依頼内容】
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
          <tr>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; width: 100px; border: 1px solid #e2e8f0;">件名</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${request.title}</td>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; width: 100px; border: 1px solid #e2e8f0;">発信者</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.requesterName} (${request.requesterDept === 'sales' ? '営業' : 'CCR'})</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">得意先</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.customerName || '未指定'}</td>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">希望納期</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${request.desiredDeliveryDate || '-'}</td>
          </tr>
        </table>

        ${request.products && request.products.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="border: 1px solid #e2e8f0; padding: 6px;">カタログ№</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px;">容量</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px;">商品名</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">数量</th>
              </tr>
            </thead>
            <tbody>
              ${request.products.map(p => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 6px; font-family: monospace;">${p.catalogNumber || '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 6px;">${p.weightKg ? `${p.weightKg}kg` : '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: bold;">${p.productName}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">${p.quantity} ${p.unit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>

      <div style="background: #f1f5f9; padding: 10px 20px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
        ※本メールは業務課タスク管理システムからの自動送信メールです。
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

  // 業務課メンバー全員
  (masters.gyomu || []).forEach(name => {
    const em = masters.memberEmails?.[name];
    if (em && em.includes('@')) emails.add(em);
  });

  // 依頼者本人
  if (request.requesterName) {
    const em = masters.memberEmails?.[request.requesterName];
    if (em && em.includes('@')) emails.add(em);
  }

  if (emails.size === 0) return;

  const subject = `【上長承認完了: 手配可】[仕掛手配] ${request.title} (${request.id})`;
  const html = `
    <div style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; color: #1e293b; line-height: 1.6; max-width: 680px; margin: 0 auto; border: 1px solid #fecdd3; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="background-color: #be123c; color: #ffffff; padding: 16px 20px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">【上長承認完了】仕掛手配の承認が完了しました</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">依頼番号: ${request.id} / 承認者: ${request.approverName || '上長'}</p>
      </div>

      <div style="padding: 20px;">
        <div style="background: #fff1f2; border: 2px solid #fda4af; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #9f1239;">
          <p style="margin: 0; font-weight: bold; font-size: 14px;">✅ 上長承認印が押印されました。業務課にて仕掛手配を進めてください。</p>
          <p style="margin: 6px 0 0 0;"><strong>承認者:</strong> ${request.approverName || '上長'} ｜ <strong>承認日時:</strong> ${new Date(request.approvedAt || '').toLocaleString('ja-JP')}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
          <tr>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; width: 100px; border: 1px solid #e2e8f0;">件名</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${request.title}</td>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; width: 100px; border: 1px solid #e2e8f0;">発信者</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.requesterName} (${request.requesterDept === 'sales' ? '営業' : 'CCR'})</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">得意先</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${request.customerName || '未指定'}</td>
            <td style="padding: 6px 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">希望納期</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #b45309;">${request.desiredDeliveryDate || '-'}</td>
          </tr>
        </table>

        ${request.products && request.products.length > 0 ? `
          <h4 style="font-size: 13px; margin: 15px 0 6px 0;">【手配商品明細】</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="border: 1px solid #e2e8f0; padding: 6px;">カタログ№</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px;">容量</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px;">商品名</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">数量</th>
              </tr>
            </thead>
            <tbody>
              ${request.products.map(p => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 6px; font-family: monospace;">${p.catalogNumber || '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 6px;">${p.weightKg ? `${p.weightKg}kg` : '-'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: bold;">${p.productName}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; font-weight: bold; color: #be123c;">${p.quantity} ${p.unit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>

      <div style="background: #f1f5f9; padding: 10px 20px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
        ※本メールは業務課タスク管理システムからの自動送信メールです。
      </div>
    </div>
  `;

  await sendEmailSafe({
    to: Array.from(emails).join(','),
    subject,
    html,
  });
}
