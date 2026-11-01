/**
 * Central transactional email templates for Anamur Acil Medikal and Anamur İşitme Merkezi.
 * All HTML is built from escaped strings — never render raw user HTML.
 */

export type EmailTemplateKey =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_PARTIALLY_RECEIVED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_EXPIRED'
  | 'BANK_TRANSFER_PENDING'
  | 'BANK_TRANSFER_APPROVED'
  | 'BANK_TRANSFER_REJECTED'
  | 'PASSWORD_RESET'
  | 'WELCOME'
  | 'ACCOUNT_INVITATION'
  | 'NEW_ORDER'
  | 'PAYMENT_NOTIFICATION'
  | 'LOW_STOCK'
  | 'NEW_CUSTOMER'
  | 'GENERIC';

export type EmailTemplateVars = {
  siteName?: string;
  supportEmail?: string;
  siteUrl?: string;
  customerName?: string;
  orderNumber?: string;
  orderId?: string;
  amount?: string;
  statusLabel?: string;
  trackingUrl?: string;
  trackingNumber?: string;
  resetUrl?: string;
  inviteUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  title?: string;
  message?: string;
  detailLines?: string[];
  productName?: string;
  stockQty?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safe(value: string | undefined, fallback = '—'): string {
  if (!value) return fallback;
  return escapeHtml(value);
}

function buildLayout(input: {
  siteName: string;
  supportEmail: string;
  siteUrl: string;
  title: string;
  messageHtml: string;
  detailRowsHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const brand = escapeHtml(input.siteName);
  const title = escapeHtml(input.title);
  const support = escapeHtml(input.supportEmail);
  const siteUrl = escapeHtml(input.siteUrl);
  const cta =
    input.ctaUrl && input.ctaLabel
      ? `<p style="margin:24px 0 8px;">
          <a href="${escapeHtml(input.ctaUrl)}"
             style="display:inline-block;background:#0b3d2e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;font-size:14px;">
            ${escapeHtml(input.ctaLabel)}
          </a>
        </p>`
      : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5ebe8;">
          <tr>
            <td style="background:#0b3d2e;padding:20px 24px;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">${brand}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0b3d2e;">${title}</h1>
              <div style="font-size:15px;line-height:1.55;color:#333333;">${input.messageHtml}</div>
              ${input.detailRowsHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #eef2f0;">
              <p style="margin:12px 0 4px;">Sorularınız için: <a href="mailto:${support}" style="color:#0b3d2e;">${support}</a></p>
              <p style="margin:4px 0 0;"><a href="${siteUrl}" style="color:#0b3d2e;">${siteUrl}</a></p>
              <p style="margin:12px 0 0;color:#9ca3af;">Bu e-posta ${brand} tarafından otomatik gönderilmiştir.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailsTable(rows: Array<[string, string]>): string {
  if (!rows.length) return '';
  const body = rows
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:6px 0;color:#6b7280;width:40%;vertical-align:top;">${escapeHtml(k)}</td>
          <td style="padding:6px 0;color:#111827;font-weight:600;">${v}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;font-size:14px;">${body}</table>`;
}

function orderDetails(v: EmailTemplateVars): string {
  return detailsTable([
    ['Sipariş No', safe(v.orderNumber)],
    ...(v.amount ? [['Tutar', safe(v.amount)] as [string, string]] : []),
    ...(v.statusLabel
      ? [['Durum', safe(v.statusLabel)] as [string, string]]
      : []),
    ...(v.trackingNumber
      ? [['Takip No', safe(v.trackingNumber)] as [string, string]]
      : []),
  ]);
}

const TEMPLATES: Record<
  EmailTemplateKey,
  (v: EmailTemplateVars) => {
    subject: string;
    title: string;
    message: string;
    ctaLabel?: string;
    ctaUrl?: string;
    details?: string;
  }
> = {
  ORDER_CREATED: (v) => ({
    subject: `Sipariş alındı — ${v.orderNumber ?? ''}`.trim(),
    title: 'Siparişiniz alındı',
    message: `Merhaba ${safe(v.customerName, 'değerli müşterimiz')}, siparişiniz başarıyla oluşturuldu. Ödeme bilgisini onayladıktan sonra hazırlığa başlayacağız.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  ORDER_CONFIRMED: (v) => ({
    subject: `Sipariş onaylandı — ${v.orderNumber ?? ''}`.trim(),
    title: 'Siparişiniz onaylandı',
    message: `Siparişiniz onaylandı ve hazırlık sürecine alındı.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  ORDER_SHIPPED: (v) => ({
    subject: `Sipariş kargoda — ${v.orderNumber ?? ''}`.trim(),
    title: 'Siparişiniz kargoya verildi',
    message: `Siparişiniz kargoya verildi. Takip bilgilerini aşağıda bulabilirsiniz.`,
    details: orderDetails(v),
    ctaLabel: v.trackingUrl ? 'Kargoyu takip et' : 'Siparişi görüntüle',
    ctaUrl: v.trackingUrl || v.ctaUrl,
  }),
  ORDER_DELIVERED: (v) => ({
    subject: `Sipariş teslim edildi — ${v.orderNumber ?? ''}`.trim(),
    title: 'Siparişiniz teslim edildi',
    message: `Siparişiniz teslim edildi. Alışverişiniz için teşekkür ederiz.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  ORDER_CANCELLED: (v) => ({
    subject: `Sipariş iptal edildi — ${v.orderNumber ?? ''}`.trim(),
    title: 'Sipariş iptal edildi',
    message: `Siparişiniz iptal edildi. Sorularınız için destek ekibimizle iletişime geçebilirsiniz.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  PAYMENT_RECEIVED: (v) => ({
    subject: `Ödeme alındı — ${v.orderNumber ?? ''}`.trim(),
    title: 'Ödemeniz alındı',
    message: `Ödemeniz başarıyla alındı.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  PAYMENT_PARTIALLY_RECEIVED: (v) => ({
    subject: `Kısmi ödeme alındı — ${v.orderNumber ?? ''}`.trim(),
    title: 'Kısmi ödeme alındı',
    message: `Siparişiniz için kısmi ödeme kaydedildi.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  PAYMENT_REJECTED: (v) => ({
    subject: `Ödeme reddedildi — ${v.orderNumber ?? ''}`.trim(),
    title: 'Ödeme reddedildi',
    message: `Bildirdiğiniz ödeme reddedildi. Lütfen kontrol edip yeniden deneyin.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  PAYMENT_EXPIRED: (v) => ({
    subject: `Ödeme süresi doldu — ${v.orderNumber ?? ''}`.trim(),
    title: 'Ödeme süresi doldu',
    message: `Siparişiniz için ödeme süresi doldu. Yeniden sipariş oluşturabilirsiniz.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  BANK_TRANSFER_PENDING: (v) => ({
    subject: `Havale bildirimi alındı — ${v.orderNumber ?? ''}`.trim(),
    title: 'Havale bildiriminiz alındı',
    message: `Havale/EFT bildiriminiz alındı. İnceleme sonrası bilgilendirileceksiniz.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  BANK_TRANSFER_APPROVED: (v) => ({
    subject: `Havale onaylandı — ${v.orderNumber ?? ''}`.trim(),
    title: 'Havale onaylandı',
    message: `Havale/EFT bildiriminiz onaylandı.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  BANK_TRANSFER_REJECTED: (v) => ({
    subject: `Havale reddedildi — ${v.orderNumber ?? ''}`.trim(),
    title: 'Havale reddedildi',
    message: `Havale/EFT bildiriminiz reddedildi.`,
    details: orderDetails(v),
    ctaLabel: 'Siparişi görüntüle',
    ctaUrl: v.ctaUrl,
  }),
  PASSWORD_RESET: (v) => ({
    subject: 'Şifre sıfırlama',
    title: 'Şifre sıfırlama',
    message: `Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı sınırlı süre geçerlidir.`,
    ctaLabel: 'Şifreyi sıfırla',
    ctaUrl: v.resetUrl || v.ctaUrl,
  }),
  WELCOME: (v) => ({
    subject: `${v.siteName ?? 'ANAMUR ACİL MEDİKAL'} — Hoş geldiniz`,
    title: 'Hoş geldiniz',
    message:
      `Merhaba ${safe(v.customerName, '')}, hesabınız hazır. Alışverişe başlayabilirsiniz.`.trim(),
    ctaLabel: 'Siteye git',
    ctaUrl: v.ctaUrl || v.siteUrl,
  }),
  ACCOUNT_INVITATION: (v) => ({
    subject: 'Hesap daveti',
    title: 'Hesaba davet edildiniz',
    message:
      `Merhaba ${safe(v.customerName, '')}, size bir hesap daveti gönderildi.`.trim(),
    ctaLabel: 'Daveti kabul et',
    ctaUrl: v.inviteUrl || v.ctaUrl,
  }),
  NEW_ORDER: (v) => ({
    subject: `[Admin] Yeni sipariş — ${v.orderNumber ?? ''}`.trim(),
    title: 'Yeni sipariş',
    message: `Yeni bir sipariş alındı.`,
    details: orderDetails(v),
    ctaLabel: 'Admin paneli',
    ctaUrl: v.ctaUrl,
  }),
  PAYMENT_NOTIFICATION: (v) => ({
    subject: `[Admin] Ödeme bildirimi — ${v.orderNumber ?? ''}`.trim(),
    title: 'Ödeme bildirimi',
    message: `Yeni bir ödeme bildirimi var.`,
    details: orderDetails(v),
    ctaLabel: 'Admin paneli',
    ctaUrl: v.ctaUrl,
  }),
  LOW_STOCK: (v) => ({
    subject: `[Admin] Düşük stok — ${v.productName ?? ''}`.trim(),
    title: 'Düşük stok uyarısı',
    message: `Ürün stoku kritik seviyede.`,
    details: detailsTable([
      ['Ürün', safe(v.productName)],
      ['Stok', safe(v.stockQty)],
    ]),
    ctaLabel: 'Admin paneli',
    ctaUrl: v.ctaUrl,
  }),
  NEW_CUSTOMER: (v) => ({
    subject: `[Admin] Yeni müşteri — ${v.customerName ?? ''}`.trim(),
    title: 'Yeni müşteri',
    message: `Yeni bir müşteri kaydı oluşturuldu.`,
    details: detailsTable([['Müşteri', safe(v.customerName)]]),
    ctaLabel: 'Admin paneli',
    ctaUrl: v.ctaUrl,
  }),
  GENERIC: (v) => ({
    subject: v.title || 'Bildirim',
    title: v.title || 'Bildirim',
    message: safe(v.message, ''),
    details: v.detailLines?.length
      ? detailsTable(
          v.detailLines.map((line) => ['', safe(line)] as [string, string]),
        )
      : undefined,
    ctaLabel: v.ctaLabel,
    ctaUrl: v.ctaUrl,
  }),
};

export function resolveTemplateKey(event: string): EmailTemplateKey {
  const map: Record<string, EmailTemplateKey> = {
    ORDER_CREATED: 'ORDER_CREATED',
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    ORDER_SHIPPED: 'ORDER_SHIPPED',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
    ORDER_CANCELLED: 'ORDER_CANCELLED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_PARTIALLY_RECEIVED: 'PAYMENT_PARTIALLY_RECEIVED',
    PAYMENT_REJECTED: 'PAYMENT_REJECTED',
    PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
    BANK_TRANSFER_PENDING: 'BANK_TRANSFER_PENDING',
    BANK_TRANSFER_APPROVED: 'BANK_TRANSFER_APPROVED',
    BANK_TRANSFER_REJECTED: 'BANK_TRANSFER_REJECTED',
    PASSWORD_RESET: 'PASSWORD_RESET',
    WELCOME: 'WELCOME',
    ACCOUNT_INVITATION: 'ACCOUNT_INVITATION',
    NEW_ORDER: 'NEW_ORDER',
    PAYMENT_NOTIFICATION: 'PAYMENT_NOTIFICATION',
    LOW_STOCK: 'LOW_STOCK',
    NEW_CUSTOMER: 'NEW_CUSTOMER',
  };
  return map[event] ?? 'GENERIC';
}

export function buildTransactionalEmail(
  event: string,
  vars: EmailTemplateVars,
): { subject: string; html: string; text: string } {
  const siteName = vars.siteName || 'ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ';
  const supportEmail = vars.supportEmail || 'info@example.com';
  const siteUrl = vars.siteUrl || 'https://example.com';
  const key = resolveTemplateKey(event);
  const built = TEMPLATES[key]({ ...vars, siteName, supportEmail, siteUrl });

  const html = buildLayout({
    siteName,
    supportEmail,
    siteUrl,
    title: built.title,
    messageHtml: `<p style="margin:0 0 8px;">${built.message}</p>`,
    detailRowsHtml: built.details ?? '',
    ctaUrl: built.ctaUrl,
    ctaLabel: built.ctaLabel,
  });

  const textLines = [
    built.title,
    '',
    built.message.replace(/<[^>]+>/g, ''),
    vars.orderNumber ? `Sipariş No: ${vars.orderNumber}` : '',
    vars.amount ? `Tutar: ${vars.amount}` : '',
    built.ctaUrl ? `Bağlantı: ${built.ctaUrl}` : '',
    '',
    `Destek: ${supportEmail}`,
    siteUrl,
  ].filter(Boolean);

  return {
    subject: built.subject,
    html,
    text: textLines.join('\n'),
  };
}

/** @deprecated Prefer buildTransactionalEmail */
export function buildOrderStatusEmail(input: {
  event: string;
  siteName: string;
  supportEmail: string;
  orderNumber: string;
  statusLabel: string;
  amount?: string;
}): { subject: string; html: string } {
  const built = buildTransactionalEmail(input.event, {
    siteName: input.siteName,
    supportEmail: input.supportEmail,
    orderNumber: input.orderNumber,
    statusLabel: input.statusLabel,
    amount: input.amount,
  });
  return { subject: built.subject, html: built.html };
}

/** Legacy helper used by EmailOutboxService.enqueueOrderEmail */
export function renderOrderEmailHtml(input: {
  customerName: string;
  orderNumber: string;
  status: string;
  totalAmount?: string;
  actionUrl?: string;
  trackingUrl?: string;
  supportEmail?: string;
  websiteUrl?: string;
}): string {
  return buildTransactionalEmail('GENERIC', {
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    statusLabel: input.status,
    amount: input.totalAmount,
    ctaUrl: input.actionUrl,
    trackingUrl: input.trackingUrl,
    supportEmail: input.supportEmail,
    siteUrl: input.websiteUrl,
    title: `Sipariş güncellemesi — ${input.orderNumber}`,
    message: `Merhaba ${input.customerName}, sipariş durumunuz: ${input.status}.`,
  }).html;
}

export function isMarketingEmailEvent(event: string): boolean {
  const upper = event.toUpperCase();
  return (
    upper.startsWith('CAMPAIGN_') ||
    upper === 'CAMPAIGN' ||
    upper === 'MARKETING' ||
    upper.includes('PROMO')
  );
}

/** Critical transactional emails — user cannot opt out of email channel. */
export function isCriticalEmailEvent(event: string): boolean {
  const upper = event.toUpperCase();
  return (
    upper === 'PASSWORD_RESET' ||
    upper === 'ACCOUNT_INVITATION' ||
    upper === 'WELCOME' ||
    upper.includes('SECURITY') ||
    upper === 'SYSTEM'
  );
}
