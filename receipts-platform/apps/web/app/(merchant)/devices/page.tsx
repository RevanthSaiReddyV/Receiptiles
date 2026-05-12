import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Merchant Devices Page
 * Lists all POS devices registered to this merchant with status indicators.
 */
export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const devices = await prisma.device.findMany({
    where: {
      merchantConnection: {
        userId: session.user.id,
      },
    },
    orderBy: { lastSeenAt: 'desc' },
  });

  const provisionKey = process.env.DEVICE_PROVISION_KEY || 'Not configured';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Devices</h1>
          <p className="text-neutral-600 mt-1">
            Manage your POS receipt interceptors
          </p>
        </div>
        <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
          + Register Device
        </button>
      </div>

      {/* Provisioning Key Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-amber-900">Provisioning Key</h3>
        <p className="text-xs text-amber-700 mt-1">
          Flash this key into new ESP32 devices for auto-registration.
        </p>
        <code className="mt-2 block text-xs bg-amber-100 rounded px-3 py-2 font-mono text-amber-900">
          {provisionKey.slice(0, 8)}...{provisionKey.slice(-4)}
        </code>
      </div>

      {/* Device List */}
      {devices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="text-4xl mb-4">📟</div>
          <h2 className="text-lg font-medium text-neutral-900">No devices registered</h2>
          <p className="text-neutral-500 mt-2 max-w-md mx-auto">
            Connect an ESP32 POS interceptor to start capturing receipts automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {devices.map(device => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device }: { device: any }) {
  const isOnline = device.lastSeenAt &&
    new Date().getTime() - new Date(device.lastSeenAt).getTime() < 10 * 60 * 1000;

  const metadata = (device.metadata as Record<string, any>) || {};

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-neutral-300'}`} />
          <div>
            <h3 className="font-medium text-neutral-900">
              {device.deviceSerial}
            </h3>
            <p className="text-sm text-neutral-500">
              {device.posType} • {device.connectionType}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            device.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            device.status === 'OFFLINE' ? 'bg-neutral-100 text-neutral-600' :
            'bg-red-100 text-red-700'
          }`}>
            {device.status}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-neutral-500">Last Seen</p>
          <p className="font-medium text-neutral-900">
            {device.lastSeenAt
              ? new Date(device.lastSeenAt).toLocaleString()
              : 'Never'}
          </p>
        </div>
        <div>
          <p className="text-neutral-500">Firmware</p>
          <p className="font-medium text-neutral-900">
            {metadata.firmwareVersion || 'Unknown'}
          </p>
        </div>
        <div>
          <p className="text-neutral-500">Free Heap</p>
          <p className="font-medium text-neutral-900">
            {metadata.freeHeap ? `${Math.round(metadata.freeHeap / 1024)}KB` : '—'}
          </p>
        </div>
        <div>
          <p className="text-neutral-500">Uptime</p>
          <p className="font-medium text-neutral-900">
            {metadata.uptimeSeconds
              ? formatUptime(metadata.uptimeSeconds)
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
