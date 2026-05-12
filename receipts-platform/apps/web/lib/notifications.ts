import { db } from "@receipts/db";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a user via Expo Push Notification service.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  if (!user?.pushToken) return;

  const message: PushMessage = {
    to: user.pushToken,
    title,
    body,
    data,
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(message),
  });
}

/**
 * Notify user about newly imported receipts.
 */
export async function notifyNewReceipts(userId: string, count: number) {
  if (count <= 0) return;

  const body =
    count === 1
      ? "1 new receipt was imported."
      : `${count} new receipts were imported.`;

  await sendPushNotification(userId, "New Receipts", body, {
    screen: "receipts",
  });
}
