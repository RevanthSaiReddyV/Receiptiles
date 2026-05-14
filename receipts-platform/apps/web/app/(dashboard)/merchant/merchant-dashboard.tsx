"use client";

import { useState, useEffect } from "react";

interface AppInfo {
  id: string;
  name: string;
  partnerId: string;
  tier: string;
  receipts30d: number;
  requests: number;
}

interface Props {
  apps: AppInfo[];
}

export function MerchantDashboard({ apps }: Props) {
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(apps[0] ?? null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [period, setPeriod] = useState("30d");
  const [metric, setMetric] = useState("overview");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedApp) return;
    setLoading(true);
    fetch(`/api/merchant/analytics?period=${period}&metric=${metric}`, {
      headers: { "X-Merchant-Key": selectedApp.partnerId },
    })
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedApp, period, metric]);

  if (apps.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center mt-20">
        <div className="text-5xl mb-4">📊</div>
        <h1 className="text-2xl font-extrabold mb-2">Merchant Analytics</h1>
        <p className="text-neutral-500 mb-6">
          See how customers interact with your business. Create a Data API key in the Developer Portal to get started.
        </p>
        <a href="/developers" className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-xl font-semibold text-sm">
          Go to Developer Portal
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Merchant Analytics</h1>
          <p className="text-neutral-500 text-sm mt-1">Customer insights powered by the Universal Receipts Network</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "1y"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                period === p ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* App Selector */}
      {apps.length > 1 && (
        <div className="flex gap-2 mb-6">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                selectedApp?.id === app.id
                  ? "bg-neutral-900 text-white"
                  : "bg-white border border-neutral-200 text-neutral-600"
              }`}
            >
              {app.name}
            </button>
          ))}
        </div>
      )}

      {/* Metric Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { key: "overview", label: "Overview" },
          { key: "customers", label: "Customers" },
          { key: "items", label: "Top Items" },
          { key: "timing", label: "Peak Times" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMetric(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              metric === tab.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-neutral-400">Loading analytics...</div>
      ) : analytics ? (
        <div className="space-y-6">
          {metric === "overview" && analytics.summary && (
            <>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "Revenue", value: `$${analytics.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                  { label: "Transactions", value: analytics.summary.transactionCount.toLocaleString() },
                  { label: "Customers", value: analytics.summary.uniqueCustomers.toLocaleString() },
                  { label: "Avg Order", value: `$${analytics.summary.avgOrderValue.toFixed(2)}` },
                  { label: "Repeat Rate", value: `${analytics.summary.repeatRate.toFixed(1)}%` },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl p-4 border border-neutral-100">
                    <p className="text-2xl font-extrabold">{stat.value}</p>
                    <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue Timeline */}
              {analytics.revenueTimeline?.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-neutral-100">
                  <h3 className="font-bold mb-4">Revenue Timeline</h3>
                  <div className="h-40 flex items-end gap-1">
                    {analytics.revenueTimeline.map((day: any) => {
                      const maxRevenue = Math.max(...analytics.revenueTimeline.map((d: any) => d.amount));
                      const height = maxRevenue > 0 ? (day.amount / maxRevenue) * 100 : 0;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 bg-neutral-900 rounded-t-sm min-h-[2px] hover:bg-emerald-600 transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${day.date}: $${day.amount.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {metric === "customers" && analytics.segments && (
            <>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "New", value: analytics.segments.newCustomers, color: "bg-blue-100 text-blue-700" },
                  { label: "Returning", value: analytics.segments.returning, color: "bg-emerald-100 text-emerald-700" },
                  { label: "Loyal", value: analytics.segments.loyal, color: "bg-purple-100 text-purple-700" },
                  { label: "VIP", value: analytics.segments.vip, color: "bg-amber-100 text-amber-700" },
                ].map((seg) => (
                  <div key={seg.label} className="bg-white rounded-xl p-5 border border-neutral-100">
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${seg.color}`}>
                      {seg.label}
                    </div>
                    <p className="text-3xl font-extrabold">{seg.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-6 border border-neutral-100">
                <h3 className="font-bold mb-3">Visit Frequency</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.frequencyDistribution ?? {}).map(([bucket, count]) => {
                    const max = Math.max(...Object.values(analytics.frequencyDistribution ?? {}).map(Number));
                    const pct = max > 0 ? (Number(count) / max) * 100 : 0;
                    return (
                      <div key={bucket} className="flex items-center gap-3">
                        <span className="text-sm text-neutral-500 w-12">{bucket}</span>
                        <div className="flex-1 h-6 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">{String(count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-neutral-100">
                <p className="text-sm text-neutral-500">Avg Customer Lifetime Value</p>
                <p className="text-3xl font-extrabold mt-1">
                  ${(analytics.avgLifetimeValue ?? 0).toFixed(2)}
                </p>
              </div>
            </>
          )}

          {metric === "items" && analytics.topItems && (
            <div className="bg-white rounded-xl p-6 border border-neutral-100">
              <h3 className="font-bold mb-4">Top Selling Items</h3>
              <div className="space-y-3">
                {analytics.topItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                    <span className="text-sm font-bold text-neutral-400 w-6">#{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-neutral-700">{item.name}</span>
                    <span className="text-xs text-neutral-400">{item.quantity} sold</span>
                    <span className="text-sm font-bold">${item.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metric === "timing" && analytics.peakHours && (
            <>
              <div className="bg-white rounded-xl p-6 border border-neutral-100">
                <h3 className="font-bold mb-4">Hourly Distribution</h3>
                <div className="h-32 flex items-end gap-0.5">
                  {analytics.peakHours.map((h: any) => {
                    const max = Math.max(...analytics.peakHours.map((x: any) => x.count));
                    const pct = max > 0 ? (h.count / max) * 100 : 0;
                    return (
                      <div
                        key={h.hour}
                        className="flex-1 bg-neutral-200 rounded-t-sm hover:bg-emerald-500 transition-colors min-h-[2px]"
                        style={{ height: `${pct}%` }}
                        title={`${h.hour}:00 - ${h.count} orders`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-neutral-400">12am</span>
                  <span className="text-xs text-neutral-400">6am</span>
                  <span className="text-xs text-neutral-400">12pm</span>
                  <span className="text-xs text-neutral-400">6pm</span>
                  <span className="text-xs text-neutral-400">11pm</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-100">
                <h3 className="font-bold mb-4">Daily Distribution</h3>
                <div className="grid grid-cols-7 gap-2">
                  {analytics.peakDays.map((d: any) => {
                    const max = Math.max(...analytics.peakDays.map((x: any) => x.count));
                    const intensity = max > 0 ? d.count / max : 0;
                    return (
                      <div key={d.day} className="text-center">
                        <div
                          className="w-full aspect-square rounded-lg mb-1"
                          style={{ backgroundColor: `rgba(0,0,0,${0.05 + intensity * 0.85})` }}
                        />
                        <span className="text-xs text-neutral-500">{d.day}</span>
                        <p className="text-xs font-bold">{d.count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
