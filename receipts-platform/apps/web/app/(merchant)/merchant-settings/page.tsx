import { db } from '@receipts/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Merchant Settings Page
 * Configure merchant profile, API keys, notification preferences.
 */
export default async function MerchantSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const connections = await db.merchantConnection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  const devices = await db.device.findMany({
    where: { merchantConnection: { userId: session.user.id } },
    select: { id: true, apiKey: true, deviceSerial: true, status: true },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-600 mt-1">Manage your merchant configuration</p>
      </div>

      {/* Merchant Profile */}
      <Section title="Merchant Profile">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Business Name" defaultValue={session.user?.name || ''} />
          <InputField label="Email" defaultValue={session.user?.email || ''} disabled />
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800">
            Save Changes
          </button>
        </div>
      </Section>

      {/* POS Connections */}
      <Section title="POS Connections">
        {connections.length === 0 ? (
          <p className="text-neutral-500 text-sm">No POS systems connected.</p>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="font-medium text-neutral-900 capitalize">{conn.provider}</p>
                  <p className="text-xs text-neutral-500">
                    Connected {new Date(conn.createdAt).toLocaleDateString()}
                    {conn.lastSyncAt && ` • Last sync: ${new Date(conn.lastSyncAt).toLocaleDateString()}`}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  conn.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {conn.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Device API Keys */}
      <Section title="Device API Keys">
        <p className="text-sm text-neutral-600 mb-4">
          Each device receives a unique API key during provisioning. Revoke compromised keys here.
        </p>
        {devices.length === 0 ? (
          <p className="text-neutral-500 text-sm">No devices registered.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Serial</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Key Prefix</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id} className="border-b border-neutral-100">
                    <td className="py-2 px-3 font-mono text-neutral-900">{device.deviceSerial}</td>
                    <td className="py-2 px-3 font-mono text-neutral-600">
                      {device.apiKey.slice(0, 10)}...
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        device.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button className="text-red-600 text-xs hover:text-red-800">
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="space-y-3">
          <ToggleOption
            label="Device offline alerts"
            description="Get notified when a device hasn't checked in for 30 minutes"
            defaultChecked={true}
          />
          <ToggleOption
            label="Daily receipt summary"
            description="Receive a daily email with receipt capture stats"
            defaultChecked={false}
          />
          <ToggleOption
            label="Webhook failures"
            description="Alert when webhook deliveries fail 3+ times"
            defaultChecked={true}
          />
          <ToggleOption
            label="Firmware updates"
            description="Notify when new firmware is available for devices"
            defaultChecked={true}
          />
        </div>
      </Section>

      {/* Danger Zone */}
      <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
        <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        <p className="text-sm text-red-700 mt-1">
          These actions are irreversible. Proceed with caution.
        </p>
        <div className="mt-4 space-y-3">
          <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
            Revoke All Device Keys
          </button>
          <button className="ml-3 px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
            Disconnect All POS Systems
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InputField({ label, defaultValue, disabled }: { label: string; defaultValue: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
      />
    </div>
  );
}

function ToggleOption({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
      />
    </div>
  );
}
