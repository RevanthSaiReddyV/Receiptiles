import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string }> {
  const client = getClient();
  if (!client) {
    console.log("[SMS] Twilio not configured, would send to", to, ":", body);
    return { success: false };
  }

  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
  });

  return { success: true, sid: message.sid };
}
