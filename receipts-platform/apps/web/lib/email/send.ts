import { Resend } from "resend";
import type { z } from "zod";
import type { canonicalReceiptSchema } from "@receipts/shared";

type Receipt = z.infer<typeof canonicalReceiptSchema>;

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "receipts@updates.receiptsvault.com";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function receiptToHtml(receipt: Receipt): string {
  const { merchant, purchase, payment, items } = receipt;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.totalPrice, purchase.currency)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1a1a2e;padding:24px 32px;color:#fff;">
      <h1 style="margin:0;font-size:20px;font-weight:600;">Receipt Processed</h1>
      <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">${formatDate(purchase.purchasedAt)}</p>
    </div>

    <div style="padding:24px 32px;">
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 4px;font-size:18px;color:#1a1a2e;">${merchant.canonicalName}</h2>
        <p style="margin:0;color:#6b7280;font-size:14px;">${merchant.category}${merchant.location ? ` · ${merchant.location}` : ""}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;font-weight:600;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-weight:600;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #1a1a2e;">
        <table style="width:100%;font-size:14px;">
          ${purchase.subtotal > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;">Subtotal</td><td style="text-align:right;">${formatCurrency(purchase.subtotal, purchase.currency)}</td></tr>` : ""}
          ${purchase.tax > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;">Tax</td><td style="text-align:right;">${formatCurrency(purchase.tax, purchase.currency)}</td></tr>` : ""}
          ${purchase.tip > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;">Tip</td><td style="text-align:right;">${formatCurrency(purchase.tip, purchase.currency)}</td></tr>` : ""}
          ${purchase.discount > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;">Discount</td><td style="text-align:right;color:#10b981;">-${formatCurrency(purchase.discount, purchase.currency)}</td></tr>` : ""}
          ${purchase.fees > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;">Fees</td><td style="text-align:right;">${formatCurrency(purchase.fees, purchase.currency)}</td></tr>` : ""}
          <tr><td style="padding:8px 0 0;font-weight:700;font-size:16px;">Total</td><td style="text-align:right;font-weight:700;font-size:16px;">${formatCurrency(purchase.total, purchase.currency)}</td></tr>
        </table>
      </div>

      ${payment.cardLast4 ? `<p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Paid with •••• ${payment.cardLast4}</p>` : ""}
    </div>

    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Automatically processed by Receipts Vault</p>
    </div>
  </div>
</body>
</html>`;
}

function digestToHtml(
  receipts: Receipt[],
  period: { start: string; end: string }
): string {
  const totalSpent = receipts.reduce((sum, r) => sum + r.purchase.total, 0);
  const byCategory = receipts.reduce(
    (acc, r) => {
      const cat = r.merchant.category;
      acc[cat] = (acc[cat] ?? 0) + r.purchase.total;
      return acc;
    },
    {} as Record<string, number>
  );
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const categoryRows = sortedCategories
    .map(
      ([cat, amount]) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${cat}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:500;">${formatCurrency(amount)}</td>
      </tr>`
    )
    .join("");

  const receiptList = receipts
    .slice(0, 20)
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${r.merchant.canonicalName}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;">${formatDate(r.purchase.purchasedAt)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${formatCurrency(r.purchase.total)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1a1a2e;padding:24px 32px;color:#fff;">
      <h1 style="margin:0;font-size:20px;font-weight:600;">Spending Digest</h1>
      <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">${formatDate(period.start)} — ${formatDate(period.end)}</p>
    </div>

    <div style="padding:24px 32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="margin:0;color:#6b7280;font-size:14px;">Total Spent</p>
        <p style="margin:4px 0 0;font-size:32px;font-weight:700;color:#1a1a2e;">${formatCurrency(totalSpent)}</p>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${receipts.length} receipt${receipts.length !== 1 ? "s" : ""}</p>
      </div>

      <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">By Category</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tbody>${categoryRows}</tbody>
      </table>

      <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Recent Transactions</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${receiptList}</tbody>
      </table>
      ${receipts.length > 20 ? `<p style="margin:12px 0 0;font-size:13px;color:#9ca3af;text-align:center;">+ ${receipts.length - 20} more</p>` : ""}
    </div>

    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Receipts Vault — Your spending, organized</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendReceiptEmail(to: string, receipt: Receipt) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Receipt: ${receipt.merchant.canonicalName} — ${formatCurrency(receipt.purchase.total)}`,
    html: receiptToHtml(receipt),
  });
}

export async function sendDigestEmail(
  to: string,
  receipts: Receipt[],
  period: { start: string; end: string }
) {
  if (receipts.length === 0) return;
  const resend = getResend();
  const totalSpent = formatCurrency(
    receipts.reduce((sum, r) => sum + r.purchase.total, 0)
  );
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Spending Digest: ${totalSpent} across ${receipts.length} receipts`,
    html: digestToHtml(receipts, period),
  });
}
