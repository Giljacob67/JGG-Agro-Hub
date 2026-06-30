/**
 * Email integration service using Resend API.
 *
 * Configure with environment variable:
 * - RESEND_API_KEY: Your Resend API key
 * - SMTP_FROM: Sender email (must be verified in Resend)
 */

import { Resend } from "resend";

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
  createdAt: string;
  folder?: string;
}

// ── Configuration ──────────────────────────────────────────────────

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.SMTP_FROM || "noreply@jgggroup.com.br";
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Check if email is configured.
 */
export function isEmailConfigured(): boolean {
  return getResendClient() !== null;
}

/**
 * Send an email via Resend API.
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY não configurado" };
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao enviar email",
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sanitizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return escapeHtml(url);
  return "#";
}

/**
 * Send a notification email about CRM events (lead created, task due, etc.)
 */
export async function sendCrmNotification(options: {
  to: string | string[];
  event: string;
  title: string;
  description: string;
  url?: string;
}): Promise<{ success: boolean; error?: string }> {
  const safeEvent = escapeHtml(options.event);
  const safeTitle = escapeHtml(options.title);
  const safeDescription = escapeHtml(options.description);
  const safeUrl = options.url ? sanitizeUrl(options.url) : undefined;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">JGG Agro Hub</h1>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">${safeEvent}</p>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="margin: 0 0 12px; font-size: 16px; color: #1a1a2e;">${safeTitle}</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 14px; line-height: 1.5;">${safeDescription}</p>
        ${safeUrl ? `<a href="${safeUrl}" style="display: inline-block; background: #1a1a2e; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">Ver detalhes</a>` : ""}
      </div>
      <div style="padding: 12px 20px; text-align: center; font-size: 11px; color: #6c757d;">
        JGG Agro Hub — CRM Jurídico Agrícola
      </div>
    </div>
  `;

  return sendEmail({
    to: options.to,
    subject: `[JGG Agro] ${options.event}: ${options.title}`,
    text: `${options.event}: ${options.title}\n${options.description}\n${options.url || ""}`,
    html,
  });
}

/**
 * Get email configuration status (without secrets).
 */
export function getEmailStatus(): {
  configured: boolean;
  provider: string;
} {
  const resend = getResendClient();
  return {
    configured: resend !== null,
    provider: resend ? "Resend" : "Nenhum",
  };
}

/**
 * Fetch emails (stub - Resend doesn't support IMAP).
 */
export async function fetchEmails(options?: {
  folder?: string;
  limit?: number;
  since?: string;
}): Promise<EmailMessage[]> {
  // Resend is send-only; for inbox you'd need a separate IMAP provider
  void options;
  return [];
}

/**
 * Get email folders (stub).
 */
export async function getEmailFolders(): Promise<string[]> {
  return ["INBOX", "Sent", "Drafts", "Trash"];
}
