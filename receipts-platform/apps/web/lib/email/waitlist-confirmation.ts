import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Receiptiles <onboarding@resend.dev>";

function buildWaitlistConfirmationHtml(remaining: number): string {
  const spotNumber = 100 - remaining;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Receiptiles</title>
</head>
<body style="margin:0;padding:0;background:#F7F6F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:#242D28;border-radius:24px 24px 0 0;padding:48px 40px;text-align:center;">
      <div style="display:inline-block;background:rgba(123,232,153,0.12);border:1px solid rgba(123,232,153,0.25);border-radius:100px;padding:6px 16px;margin-bottom:24px;">
        <span style="color:#7BE899;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Founding Tester #${spotNumber}</span>
      </div>
      <h1 style="margin:0;font-size:32px;font-weight:800;color:#F7F6F2;letter-spacing:-0.5px;line-height:1.2;">
        You're in.
      </h1>
      <p style="margin:12px 0 0;color:#A0AFAA;font-size:15px;line-height:1.5;">
        Welcome to the Receiptiles founding beta program.
      </p>
    </div>

    <!-- Body -->
    <div style="background:#FFFFFF;padding:40px;border-left:1px solid #EBEAE4;border-right:1px solid #EBEAE4;">

      <p style="margin:0 0 20px;font-size:15px;color:#1C1C1A;line-height:1.7;">
        You've secured spot <strong>#${spotNumber}</strong> out of 100 exclusive founding tester positions. Only <strong>${remaining}</strong> spots remain.
      </p>

      <p style="margin:0 0 28px;font-size:15px;color:#1C1C1A;line-height:1.7;">
        As a founding tester, here's what you unlock:
      </p>

      <!-- Benefits -->
      <div style="background:#F7F6F2;border-radius:16px;padding:24px;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 12px;vertical-align:top;width:24px;">
              <span style="color:#7BE899;font-size:16px;">&#10003;</span>
            </td>
            <td style="padding:10px 12px;font-size:14px;color:#1C1C1A;line-height:1.5;">
              <strong>Free Hardware</strong> &mdash; Receiptiles NFC adapter shipped to you at no cost
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;vertical-align:top;width:24px;">
              <span style="color:#7BE899;font-size:16px;">&#10003;</span>
            </td>
            <td style="padding:10px 12px;font-size:14px;color:#1C1C1A;line-height:1.5;">
              <strong>Lifetime Analytics</strong> &mdash; Free dashboard access for all your stores, forever
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;vertical-align:top;width:24px;">
              <span style="color:#7BE899;font-size:16px;">&#10003;</span>
            </td>
            <td style="padding:10px 12px;font-size:14px;color:#1C1C1A;line-height:1.5;">
              <strong>Direct Access</strong> &mdash; Private channel with our engineering team
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;vertical-align:top;width:24px;">
              <span style="color:#7BE899;font-size:16px;">&#10003;</span>
            </td>
            <td style="padding:10px 12px;font-size:14px;color:#1C1C1A;line-height:1.5;">
              <strong>Founding Badge</strong> &mdash; Permanent premium status on all digital receipts
            </td>
          </tr>
        </table>
      </div>

      <!-- What happens next -->
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1C1C1A;">What happens next?</h2>

      <div style="border-left:3px solid #7BE899;padding-left:20px;margin-bottom:28px;">
        <p style="margin:0 0 12px;font-size:14px;color:#4A5D4E;line-height:1.6;">
          <strong style="color:#1C1C1A;">1. Summer 2026</strong> &mdash; We'll reach out with hardware shipping details and onboarding instructions.
        </p>
        <p style="margin:0 0 12px;font-size:14px;color:#4A5D4E;line-height:1.6;">
          <strong style="color:#1C1C1A;">2. Setup in 2 minutes</strong> &mdash; Plug the adapter into your existing register printer slot. Done.
        </p>
        <p style="margin:0;font-size:14px;color:#4A5D4E;line-height:1.6;">
          <strong style="color:#1C1C1A;">3. Instant digital receipts</strong> &mdash; Customers tap their phone, receipt appears in their wallet.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;padding:12px 0;">
        <a href="https://receiptiles.com/#impact" style="display:inline-block;background:#242D28;color:#F7F6F2;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:100px;">
          See Our Impact &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F7F6F2;border-radius:0 0 24px 24px;border:1px solid #EBEAE4;border-top:none;padding:28px 40px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#82907A;">
        Eliminating 12.4M trees worth of paper receipts, one tap at a time.
      </p>
      <p style="margin:0;font-size:11px;color:#A0AFAA;">
        &copy; 2026 Receiptiles &middot; All rights reserved
      </p>
    </div>

  </div>
</body>
</html>`;
}

export async function sendWaitlistConfirmationEmail(
  email: string,
  remaining: number
): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `You're in! Founding spot secured - Receiptiles`,
      html: buildWaitlistConfirmationHtml(remaining),
    });
  } catch (err) {
    // Don't let email failure block the waitlist signup
    console.error("[waitlist-email] Failed to send confirmation:", err);
  }
}
