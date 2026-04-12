import nodemailer from 'nodemailer';
import logger from '../utils/logger';

/**
 * EmailService - メール送信サービス
 *
 * Nodemailerを使用してメール送信を行う。
 * 環境変数でSMTP設定を行い、Gmail、Mailhog、その他SMTPサーバーに対応する。
 */
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // SMTP設定を環境変数から取得
    const smtpHost = process.env.SMTP_HOST || 'localhost';
    const smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true'; // SSL/TLS使用
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
    });
  }

  /**
   * メールテンプレートに変数を埋め込む
   *
   * @param template - テンプレート文字列
   * @param variables - 置換する変数のマップ
   * @returns 変数が置換されたテンプレート
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  /**
   * パスワードリセットメールを送信する
   *
   * @param to - 送信先メールアドレス
   * @param resetLink - パスワードリセット用URL
   * @param locale - ロケール（'en' | 'ja'）
   */
  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    locale: 'en' | 'ja' = 'en',
  ): Promise<void> {
    const templates = this.getPasswordResetTemplates(locale);
    const expiryMinutes = '60';

    const htmlBody = this.replaceVariables(templates.html, {
      resetLink,
      expiryMinutes,
    });
    const textBody = this.replaceVariables(templates.text, {
      resetLink,
      expiryMinutes,
    });

    const fromEmail = process.env.EMAIL_FROM || 'noreply@plaledger.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'PlaLedger';

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: templates.subject,
        text: textBody,
        html: htmlBody,
      });

      logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send password reset email', {
        to,
        error: error instanceof Error ? error.message : String(error),
      });
      // メール送信失敗でもエラーをスローしない（セキュリティ上、メールアドレスの存在を漏らさない）
    }
  }

  /**
   * パスワードリセットメールのテンプレートを取得する
   *
   * @param locale - ロケール
   * @returns メールテンプレート（件名、HTML、テキスト）
   */
  private getPasswordResetTemplates(locale: 'en' | 'ja'): {
    subject: string;
    html: string;
    text: string;
  } {
    if (locale === 'ja') {
      return {
        subject: 'パスワード再設定のお知らせ - PlaLedger',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>パスワード再設定</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1976d2;">パスワード再設定のお知らせ</h2>
    <p>こんにちは、</p>
    <p>パスワードの再設定リクエストを受け付けました。以下のリンクをクリックして手続きを進めてください：</p>
    <p style="margin: 20px 0;">
      <a href="{{resetLink}}" style="background-color: #1976d2; color: white; padding: 12px 24px;
      text-decoration: none; border-radius: 4px; display: inline-block;">パスワードを再設定する</a>
    </p>
    <p>このリンクは<strong>{{expiryMinutes}}分間</strong>有効です。</p>
    <p>このリクエストに心当たりがない場合は、このメールを無視してください。</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">
      PlaLedger - 事業計画書作成プラットフォーム
    </p>
  </div>
</body>
</html>
        `,
        text: `
パスワード再設定のお知らせ

こんにちは、

パスワードの再設定リクエストを受け付けました。以下のリンクをクリックして手続きを進めてください：

{{resetLink}}

このリンクは{{expiryMinutes}}分間有効です。

このリクエストに心当たりがない場合は、このメールを無視してください。

---
PlaLedger - 事業計画書作成プラットフォーム
        `,
      };
    }

    // 英語版（デフォルト）
    return {
      subject: 'Password Reset Request - PlaLedger',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1976d2;">Password Reset Request</h2>
    <p>Hello,</p>
    <p>You requested to reset your password. Click the link below to proceed:</p>
    <p style="margin: 20px 0;">
      <a href="{{resetLink}}" style="background-color: #1976d2; color: white; padding: 12px 24px;
      text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
    </p>
    <p>This link will expire in <strong>{{expiryMinutes}} minutes</strong>.</p>
    <p>If you did not request this, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">
      PlaLedger - Business Plan Creation Platform
    </p>
  </div>
</body>
</html>
      `,
      text: `
Password Reset Request

Hello,

You requested to reset your password. Click the link below to proceed:

{{resetLink}}

This link will expire in {{expiryMinutes}} minutes.

If you did not request this, please ignore this email.

---
PlaLedger - Business Plan Creation Platform
      `,
    };
  }
}

export default new EmailService();
