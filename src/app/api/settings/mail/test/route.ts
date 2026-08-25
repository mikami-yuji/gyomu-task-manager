import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { settings, testEmail } = await req.json();

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json({ success: false, error: '有効なテスト送信先メールアドレスを入力してください' }, { status: 400 });
    }

    if (!settings.host) {
      return NextResponse.json({ success: false, error: 'SMTPサーバー（ホスト名）を入力してください' }, { status: 400 });
    }

    const transportConfig: nodemailer.TransportOptions = {
      host: settings.host,
      port: settings.port || 587,
      secure: settings.port === 465,
      requireTLS: (settings.port || 587) === 587,
      auth: (settings.useAuth !== false && settings.user && settings.pass)
        ? { user: settings.user, pass: settings.pass }
        : undefined,
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
    } as unknown as nodemailer.TransportOptions;

    const transporter = nodemailer.createTransport(transportConfig);

    // テストメール送信
    const from = settings.fromEmail
      ? `"${settings.fromName || '業務課システム'}" <${settings.fromEmail}>`
      : (settings.user || 'gyomu-desk@example.com');

    await transporter.sendMail({
      from,
      to: testEmail,
      subject: '【テスト通知】業務課タスク管理システム メール送信テスト',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #0284c7; border-radius: 8px; max-width: 600px;">
          <h3 style="color: #0284c7; margin-top: 0;">🎉 メール送信テスト成功</h3>
          <p>このメールは、業務課タスク管理システムからの接続テストメールです。</p>
          <p>Outlook / SMTP サーバーへの接続および送信が正常に確認できました。</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
          <p style="font-size: 12px; color: #64748b;">送信日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `${testEmail} 宛てにテストメールを送信しました！` });
  } catch (error: unknown) {
    const err = error as Error & { code?: string; response?: string; responseCode?: number };
    console.error('テストメール送信エラー:', err);

    let friendlyMessage = err.message || '接続または認証に失敗しました';

    if (err.message && err.message.includes('530 5.7.57')) {
      friendlyMessage = '【Outlook認証エラー (530 5.7.57)】Microsoft 365の認証が必要です。「ユーザー認証を使用する」にチェックを入れ、メールアドレスとパスワードを入力してください。';
    } else if (err.code === 'EAUTH' || err.responseCode === 535) {
      friendlyMessage = '【認証エラー (535)】ユーザー名またはパスワードが正しくありません。パスワードを再入力してください。';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET') {
      friendlyMessage = '【接続タイムアウト】SMTPサーバーに接続できませんでした。ポート番号(587/25)をご確認ください。';
    } else if (err.code === 'ENOTFOUND') {
      friendlyMessage = '【サーバーが見つかりません (ENOTFOUND)】指定されたSMTPサーバー名（ホスト）が存在しません。';
    } else if (err.code === 'ECONNREFUSED') {
      friendlyMessage = '【接続拒否 (ECONNREFUSED)】ポート番号が閉じられています。ポート番号をご確認ください。';
    }

    return NextResponse.json({
      success: false,
      error: `送信失敗: ${friendlyMessage}`,
      rawError: err.message,
    }, { status: 200 });
  }
}
