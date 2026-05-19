import { PostHog } from "posthog-node";

let posthogServer: PostHog | null = null;

export function getPostHog(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null;
  if (!posthogServer) {
    posthogServer = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return posthogServer;
}

export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture({ distinctId: userId, event, properties });
}
