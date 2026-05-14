"use client";

import { useState } from "react";

interface ApiKeyInfo {
  id: string;
  partnerId: string;
  partnerName: string;
  key: string;
  tier: string;
  active: boolean;
  createdAt: string;
  requestCount: number;
}

interface Props {
  apiKeys: ApiKeyInfo[];
  grantCount: number;
}

const API_DOCS = [
  {
    method: "GET",
    path: "/api/data/v1/receipts",
    description: "List receipts with pagination, filtering by date/merchant/category",
    scopes: ["receipts.read"],
  },
  {
    method: "GET",
    path: "/api/data/v1/spending",
    description: "Aggregated spending analytics grouped by category, merchant, or time",
    scopes: ["spending.read"],
  },
  {
    method: "GET",
    path: "/api/data/v1/merchants",
    description: "Merchant intelligence with visit frequency and spend analysis",
    scopes: ["merchants.read"],
  },
  {
    method: "GET",
    path: "/api/data/v1/items",
    description: "Item-level purchase data with price tracking",
    scopes: ["items.read"],
  },
];

const TIERS = [
  { name: "Free", price: "$0/mo", requests: "1,000/day", features: ["Basic receipt data", "30-day history", "Community support"] },
  { name: "Starter", price: "$49/mo", requests: "10,000/day", features: ["Full receipt history", "Spending analytics", "Email support", "Webhooks"] },
  { name: "Growth", price: "$199/mo", requests: "100,000/day", features: ["All data endpoints", "Real-time sync", "Priority support", "Custom scopes"] },
  { name: "Enterprise", price: "Custom", requests: "Unlimited", features: ["Dedicated infrastructure", "SLA guarantee", "Account manager", "Custom integrations"] },
];

export function DeveloperPortal({ apiKeys, grantCount }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "keys" | "docs" | "pricing">("overview");
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newAppName, setNewAppName] = useState("");

  const handleCreateKey = async () => {
    if (!newAppName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/developers/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName: newAppName }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setCreating(false);
      setNewAppName("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-900">Developer Portal</h1>
        <p className="text-neutral-500 mt-1">
          Build on the Universal Receipts Network. Access purchase data with user consent.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-8 w-fit">
        {(["overview", "keys", "docs", "pricing"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === tab ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-neutral-100">
              <p className="text-3xl font-extrabold">{apiKeys.length}</p>
              <p className="text-sm text-neutral-500">API Keys</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-neutral-100">
              <p className="text-3xl font-extrabold">{grantCount}</p>
              <p className="text-sm text-neutral-500">User Grants</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-neutral-100">
              <p className="text-3xl font-extrabold">
                {apiKeys.reduce((sum, k) => sum + k.requestCount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-neutral-500">Total Requests</p>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <h2 className="text-lg font-bold mb-4">Quick Start</h2>
            <div className="bg-neutral-900 rounded-lg p-4 font-mono text-sm text-neutral-100 overflow-x-auto">
              <pre>{`# 1. Get your API key from the Keys tab
# 2. Redirect users to authorize:
GET https://receipts.app/api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &scope=receipts.read spending.read
  &response_type=code
  &state=random_state

# 3. Exchange code for token:
POST https://receipts.app/api/oauth/token
  grant_type=authorization_code
  &code=AUTHORIZATION_CODE
  &client_id=YOUR_CLIENT_ID
  &client_secret=YOUR_SECRET

# 4. Access data:
curl -H "Authorization: Bearer ACCESS_TOKEN" \\
  https://receipts.app/api/data/v1/receipts`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Keys Tab */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          {/* Create New Key */}
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <h2 className="text-lg font-bold mb-4">Create New API Key</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="Your app name (e.g., Budget Tracker)"
                className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                onClick={handleCreateKey}
                disabled={creating || !newAppName.trim()}
                className="px-5 py-2 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Key"}
              </button>
            </div>
          </div>

          {/* Existing Keys */}
          {apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="bg-white rounded-xl p-5 border border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-neutral-900">{key.partnerName}</h3>
                      <p className="text-xs text-neutral-400">
                        Created {new Date(key.createdAt).toLocaleDateString()} · {key.requestCount.toLocaleString()} requests
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      key.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>
                      {key.active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <p className="text-xs text-neutral-500 mb-1">Client ID</p>
                      <p className="font-mono text-xs">{key.partnerId}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <p className="text-xs text-neutral-500 mb-1">Secret</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs">
                          {showSecret === key.id ? key.key : "•".repeat(24)}
                        </p>
                        <button
                          onClick={() => setShowSecret(showSecret === key.id ? null : key.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {showSecret === key.id ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md font-medium capitalize">
                      {key.tier} tier
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 border border-neutral-100 text-center">
              <p className="text-4xl mb-3">🔑</p>
              <p className="text-neutral-500">No API keys yet. Create one above to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Docs Tab */}
      {activeTab === "docs" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <h2 className="text-lg font-bold mb-4">API Endpoints</h2>
            <div className="space-y-4">
              {API_DOCS.map((endpoint) => (
                <div key={endpoint.path} className="border border-neutral-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded">
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-neutral-700">{endpoint.path}</code>
                  </div>
                  <p className="text-sm text-neutral-500">{endpoint.description}</p>
                  <div className="mt-2 flex gap-1">
                    {endpoint.scopes.map((scope) => (
                      <span key={scope} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auth Flow */}
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <h2 className="text-lg font-bold mb-4">Authentication Flow</h2>
            <div className="space-y-3">
              {[
                { step: "1", title: "Redirect to Authorize", desc: "Send users to /api/oauth/authorize with your client_id and requested scopes" },
                { step: "2", title: "User Grants Consent", desc: "User sees what data you're requesting and approves access" },
                { step: "3", title: "Receive Auth Code", desc: "User is redirected back to your redirect_uri with an authorization code" },
                { step: "4", title: "Exchange for Token", desc: "POST to /api/oauth/token with the code and your client_secret" },
                { step: "5", title: "Access Data", desc: "Use the Bearer token to call Data API endpoints" },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-neutral-900">{s.title}</p>
                    <p className="text-sm text-neutral-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scopes */}
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <h2 className="text-lg font-bold mb-4">Available Scopes</h2>
            <div className="space-y-2">
              {[
                { scope: "receipts.read", desc: "Access receipt data including items, totals, and merchants" },
                { scope: "spending.read", desc: "Aggregated spending analytics and trends" },
                { scope: "items.read", desc: "Individual item-level purchase data" },
                { scope: "merchants.read", desc: "Merchant visit history and frequency data" },
                { scope: "profile.read", desc: "Basic wallet profile information" },
              ].map((s) => (
                <div key={s.scope} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                  <code className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono">{s.scope}</code>
                  <p className="text-sm text-neutral-600">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="grid grid-cols-4 gap-4">
          {TIERS.map((tier) => (
            <div key={tier.name} className={`bg-white rounded-xl p-5 border ${
              tier.name === "Growth" ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-100"
            }`}>
              {tier.name === "Growth" && (
                <span className="text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-full font-semibold mb-3 inline-block">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-bold">{tier.name}</h3>
              <p className="text-2xl font-extrabold mt-1">{tier.price}</p>
              <p className="text-xs text-neutral-500 mt-1">{tier.requests} requests</p>
              <ul className="mt-4 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="text-sm text-neutral-600 flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full mt-4 py-2 rounded-lg text-sm font-semibold ${
                tier.name === "Growth"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}>
                {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
