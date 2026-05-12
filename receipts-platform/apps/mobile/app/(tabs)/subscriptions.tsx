import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Subscription {
  id: string;
  merchantName: string;
  amount: number;
  frequency: string;
  status: string;
  confidence: number;
  nextExpectedAt: string | null;
  lastChargeAt: string | null;
  category: string | null;
  alertsEnabled: boolean;
}

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  amount: number | null;
  subscription: {
    merchantName: string;
    amount: number;
    frequency: string;
  };
}

interface Summary {
  activeCount: number;
  monthlyTotal: number;
  annualTotal: number;
  alertCount: number;
}

export default function SubscriptionsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get('/api/mobile/subscriptions', token);
      setSubscriptions(data.subscriptions);
      setAlerts(data.alerts);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/api/mobile/subscriptions', {}, token);
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    await api.patch('/api/mobile/subscriptions', {
      alertId,
      action: 'dismiss',
    }, token);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-5">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-neutral-900">Subscriptions</Text>
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            className="px-3 py-2 bg-neutral-900 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">
              {syncing ? 'Scanning...' : 'Detect'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        {summary && (
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white rounded-xl p-4 border border-neutral-200">
              <Text className="text-neutral-500 text-xs">Monthly</Text>
              <Text className="text-xl font-bold text-neutral-900">
                ${summary.monthlyTotal.toFixed(2)}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4 border border-neutral-200">
              <Text className="text-neutral-500 text-xs">Annual</Text>
              <Text className="text-xl font-bold text-neutral-900">
                ${summary.annualTotal.toFixed(0)}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4 border border-neutral-200">
              <Text className="text-neutral-500 text-xs">Active</Text>
              <Text className="text-xl font-bold text-neutral-900">
                {summary.activeCount}
              </Text>
            </View>
          </View>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-neutral-700 mb-3">Alerts</Text>
            {alerts.map(alert => (
              <View
                key={alert.id}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-medium text-amber-900">{alert.title}</Text>
                    <Text className="text-sm text-amber-700 mt-1">{alert.message}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDismissAlert(alert.id)}
                    className="ml-3 px-2 py-1"
                  >
                    <Text className="text-amber-600 text-xs">Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Subscription List */}
        <Text className="text-sm font-semibold text-neutral-700 mb-3">
          Active Subscriptions
        </Text>

        {subscriptions.length === 0 ? (
          <View className="bg-white rounded-xl border border-neutral-200 p-8 items-center">
            <Text className="text-3xl mb-3">🔄</Text>
            <Text className="text-neutral-900 font-medium">No subscriptions detected</Text>
            <Text className="text-neutral-500 text-sm mt-1 text-center">
              As you add more receipts, we&apos;ll automatically detect recurring charges.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {subscriptions.map(sub => (
              <SubscriptionCard key={sub.id} subscription={sub} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const frequencyLabel: Record<string, string> = {
    WEEKLY: '/wk',
    BIWEEKLY: '/2wk',
    MONTHLY: '/mo',
    QUARTERLY: '/qtr',
    ANNUAL: '/yr',
  };

  const daysUntilRenewal = subscription.nextExpectedAt
    ? Math.ceil(
        (new Date(subscription.nextExpectedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <View className="bg-white rounded-xl border border-neutral-200 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-neutral-900">{subscription.merchantName}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            {subscription.category && (
              <Text className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                {subscription.category}
              </Text>
            )}
            {subscription.confidence < 0.8 && (
              <Text className="text-xs text-amber-600">
                {Math.round(subscription.confidence * 100)}% sure
              </Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className="text-lg font-bold text-neutral-900">
            ${subscription.amount.toFixed(2)}
          </Text>
          <Text className="text-xs text-neutral-500">
            {frequencyLabel[subscription.frequency] || subscription.frequency}
          </Text>
        </View>
      </View>

      {daysUntilRenewal !== null && daysUntilRenewal > 0 && (
        <View className="mt-3 pt-3 border-t border-neutral-100">
          <Text className="text-xs text-neutral-500">
            Renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''} •{' '}
            {new Date(subscription.nextExpectedAt!).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}
