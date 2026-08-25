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
      auth: (settings.useAuth !== false && settings.user && settings.pass)
        ? { user: settings.user, pass: settings.pass }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    } as unknown as nodemailer.TransportOptions;

    const transporter = nodemailer.createTransport(transportConfig);

    // 接続検証
    await transporter.verify();

    // テストメール送信
    const from = settings.fromEmail
      ? `"${settings.fromName || '業務課システム'}" <${settings.fromEmail}>`
      : 'gyomu-desk@example.com';

    await transporter.sendMail({
      from,
      to: testEmail,
      subject: '【テスト通知】業務課タスク管理システム メール送信テスト',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #0284c7; border-radius: 8px; max-width: 600px;">
          <h3 style="color: #0284c7; margin-top: 0;">🎉 メール送信テスト成功</h3>
          <p>このメールは、業務課タスク管理システムからの接続テストメールです。</p>
          <p>Outlook 2021 / SMTP サーバーへの接続および送信が正常に確認できました。</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
          <p style="font-size: 12px; color: #64748b;">送信日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `${testEmail} 宛てにテストメールを送信しました！` });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('テストメール送信エラー:', err);
    return NextResponse.json({
      success: false,
      error: `送信失敗: ${err.message || '接続または認証に失敗しました'}`,
    }, { status: 500 });
  }
}
