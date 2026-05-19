import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms/twilio";
import { SMS_TEMPLATES } from "@/lib/sms/templates";

export async function POST(req: NextRequest) {
  // Verify internal auth via CRON_SECRET header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { to, template, params } = body;

    if (!to || !template) {
      return NextResponse.json(
        { error: "Missing required fields: to, template" },
        { status: 400 }
      );
    }

    // Validate phone number format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use E.164 (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    // Resolve template
    const templateFn =
      SMS_TEMPLATES[template as keyof typeof SMS_TEMPLATES];
    if (!templateFn) {
      return NextResponse.json(
        {
          error: `Unknown template: ${template}. Available: ${Object.keys(SMS_TEMPLATES).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const messageBody = (templateFn as (...args: string[]) => string)(
      ...(Array.isArray(params) ? params : [])
    );

    const result = await sendSMS(to, messageBody);

    if (!result.success) {
      return NextResponse.json(
        { error: "SMS service not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error("[SMS API] Error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
