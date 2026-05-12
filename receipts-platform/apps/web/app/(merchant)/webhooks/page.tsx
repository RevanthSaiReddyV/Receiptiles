import { db } from '@receipts/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Merchant Webhooks Page
 * Configure webhook endpoints and view event history.
 */
export default async function WebhooksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Get recent webhook events for merchant's devices
  const devices = await db.device.findMany({
    where: { merchantConnection: { userId: session.user.id } },
    select: { id: true },
  });
  const deviceIds = devices.map(d => d.id);

  const recentEvents = await db.webhookEvent.findMany({
    where: {
      OR: [
        { deviceId: { in: deviceIds.length > 0 ? deviceIds : ['__none__'] } },
        { provider: { in: ['square', 'toast', 'shopify'] } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://receipts.app';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Webhooks</h1>
        <p className="text-neutral-600 mt-1">
          Configure POS system integrations and view event history
        </p>
      </div>

      {/* Webhook Endpoints */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Webhook URLs</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Configure these URLs in your POS provider&apos;s webhook settings:
        </p>

        <div className="space-y-4">
          <WebhookEndpoint
            provider="Square"
            url={`${baseUrl}/api/webhooks/square`}
            events={['payment.completed']}
            status="active"
          />
          <WebhookEndpoint
            provider="Toast"
            url={`${baseUrl}/api/webhooks/toast`}
            events={['ORDER_PAID', 'ORDER_CLOSED']}
            status="active"
          />
          <WebhookEndpoint
            provider="Shopify"
            url={`${baseUrl}/api/webhooks/shopify`}
            events={['orders/paid']}
            status="active"
          />
        </div>
      </div>

      {/* Custom Webhook (future) */}
      <div className="bg-neutral-50 rounded-xl border border-dashed border-neutral-300 p-6 mb-6">
        <h2 className="text-lg font-semibold text-neutral-700">Custom Webhook</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Send receipts from any system using our universal webhook format.
        </p>
        <code className="mt-3 block text-xs bg-white rounded-lg px-4 py-3 font-mono text-neutral-700 border border-neutral-200">
          POST {baseUrl}/api/webhooks/custom
        </code>
        <p className="text-xs text-neutral-400 mt-2">Coming soon</p>
      </div>

      {/* Event History */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent Events</h2>

        {recentEvents.length === 0 ? (
          <p className="text-neutral-500 text-sm">No webhook events received yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Provider</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Event</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">ID</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map(event => (
                  <tr key={event.id} className="border-b border-neutral-100">
                    <td className="py-2 px-3 text-neutral-600">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="capitalize font-medium">{event.provider}</span>
                    </td>
                    <td className="py-2 px-3 text-neutral-600">{event.eventType}</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-neutral-400">
                      {event.externalId?.slice(0, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookEndpoint({
  provider,
  url,
  events,
  status,
}: {
  provider: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-neutral-900">{provider}</h3>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
          }`}>
            {status}
          </span>
        </div>
        <code className="text-xs text-neutral-500 font-mono mt-1 block">{url}</code>
        <p className="text-xs text-neutral-400 mt-1">
          Events: {events.join(', ')}
        </p>
      </div>
      <button className="text-sm text-neutral-600 hover:text-neutral-900">
        Copy URL
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PROCESSED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  const style = styles[status as keyof typeof styles] || 'bg-neutral-100 text-neutral-600';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
