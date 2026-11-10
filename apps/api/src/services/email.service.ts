import nodemailer from "nodemailer";

export class EmailService {
  private readonly transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;

    if (!host || !from) {
      throw new Error("SMTP configuration is incomplete");
    }

    this.from = from;

    this.transporter = nodemailer.createTransport({
      connectionTimeout: 10000,
      socketTimeout: 20000,
      host,
      port,
      secure,
      ...(user && password
        ? {
            auth: {
              user,
              pass: password,
            },
          }
        : {}),
    });
  }

  async sendCustomerMessage(to: string, subject: string, text: string, id: string) {
    await this.transporter.sendMail({ from: this.from, to, subject, text,
      messageId: `<customer-${id}@rasbass.shop>` });
  }

  /** Wysyła plik z eksportem zamówień jako załącznik. */
  async sendOrdersExport(options: {
    to: string;
    subject: string;
    text: string;
    filename: string;
    content: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      attachments: [
        {
          filename: options.filename,
          content: options.content,
          contentType: options.contentType,
        },
      ],
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: "Password reset",
      text: `Use the following password reset token: ${token}`,
    });
  }
}
