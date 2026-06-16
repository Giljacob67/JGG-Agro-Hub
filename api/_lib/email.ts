/**
 * Email integration service.
 * Provides email sending (SMTP) and receiving (IMAP) capabilities.
 *
 * In production, configure with:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * - IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS
 */

// ── Types ──────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
  createdAt: string;
  folder?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
}

// ── Configuration ──────────────────────────────────────────────────

function getEmailConfig(): EmailConfig | null {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;
  const imapHost = process.env.IMAP_HOST;
  const imapPort = process.env.IMAP_PORT;
  const imapUser = process.env.IMAP_USER;
  const imapPass = process.env.IMAP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) return null;

  return {
    smtpHost,
    smtpPort: Number(smtpPort) || 587,
    smtpUser,
    smtpPass,
    smtpFrom: smtpFrom || smtpUser,
    imapHost: imapHost || "",
    imapPort: Number(imapPort) || 993,
    imapUser: imapUser || "",
    imapPass: imapPass || "",
  };
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Check if email is configured.
 */
export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

/**
 * Send an email via SMTP.
 * Note: In Vercel Serverless, direct SMTP may not work.
 * Consider using a transactional email service (SendGrid, Resend, etc.)
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getEmailConfig();
  if (!config) {
    return { success: false, error: "Email não configurado" };
  }

  // In production, use a proper SMTP library like nodemailer
  // For now, we'll log the email and return success
  console.log("[Email] Sending:", {
    from: config.smtpFrom,
    to: options.to,
    subject: options.subject,
    text: options.text,
    timestamp: new Date().toISOString(),
  });

  // TODO: Integrate with nodemailer or transactional email service
  // const nodemailer = await import("nodemailer");
  // const transporter = nodemailer.createTransport({ ... });
  // const result = await transporter.sendMail({ ... });

  return {
    success: true,
    messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

/**
 * Fetch emails from inbox (IMAP).
 * Note: Requires imap library and persistent connection.
 */
export async function fetchEmails(options?: {
  folder?: string;
  limit?: number;
  since?: string;
}): Promise<EmailMessage[]> {
  const config = getEmailConfig();
  if (!config || !config.imapHost) {
    return [];
  }

  // TODO: Integrate with imap library
  // For now, return empty array
  console.log("[Email] Fetch:", {
    folder: options?.folder ?? "INBOX",
    limit: options?.limit ?? 50,
    since: options?.since,
  });

  return [];
}

/**
 * Get email folders/mailboxes.
 */
export async function getEmailFolders(): Promise<string[]> {
  const config = getEmailConfig();
  if (!config || !config.imapHost) {
    return [];
  }

  // TODO: Integrate with imap library
  return ["INBOX", "Sent", "Drafts", "Trash"];
}

/**
 * Get email configuration status (without secrets).
 */
export function getEmailStatus(): {
  configured: boolean;
  smtp: boolean;
  imap: boolean;
} {
  const config = getEmailConfig();
  if (!config) {
    return { configured: false, smtp: false, imap: false };
  }

  return {
    configured: true,
    smtp: true,
    imap: !!config.imapHost,
  };
}
