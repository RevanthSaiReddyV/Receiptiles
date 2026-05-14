import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { ProgressRing } from "../../components/ui/ProgressRing";

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  progress: number;
  remaining: number;
  dailyBudget: number;
  isOverBudget: boolean;
}

interface Summary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  progress: number;
  period: string;
}

const CATEGORY_OPTIONS = [
  "Dining",
  "Groceries",
  "Gas",
  "Shopping",
  "Travel",
  "Entertainment",
  "Streaming",
  "Transit",
  "Drugstores",
  "Fitness",
  "Utilities",
  "Phone",
  "Internet",
  "Insurance",
  "Other",
];

const CATEGORY_EMOJI: Record<string, string> = {
  Dining: "🍽️",
  Groceries: "🛒",
  Gas: "⛽",
  Shopping: "🛍️",
  Travel: "✈️",
  Entertainment: "🎬",
  Streaming: "📺",
  Transit: "🚗",
  Drugstores: "💊",
  Fitness: "💪",
  Utilities: "💡",
  Phone: "📱",
  Internet: "🌐",
  Insurance: "🛡️",
  Other: "📦",
};

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ budgets: Budget[]; summary: Summary }>(
        "/api/mobile/budgets"
      );
      setBudgets(data.budgets);
      setSummary(data.summary);
    } catch (e) {
      console.error("Budget load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!newCategory || !newLimit) {
      Alert.alert("Error", "Select a category and enter a limit.");
      return;
    }
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert("Error", "Enter a valid dollar amount.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/mobile/budgets", {
        method: "POST",
        body: JSON.stringify({ category: newCategory, monthlyLimit: limit }),
      });
      setShowAdd(false);
      setNewCategory("");
      setNewLimit("");
      load();
    } catch {
      Alert.alert("Error", "Failed to create budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert("Remove Budget", `Remove ${budget.category} budget?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/mobile/budgets", {
              method: "DELETE",
              body: JSON.stringify({ category: budget.category }),
            });
            load();
          } catch {
            Alert.alert("Error", "Failed to delete budget.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>Budgets</Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={{ backgroundColor: "#171717", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Overall Summary */}
        {summary && summary.totalBudget > 0 && (
          <Card variant="elevated" style={{ marginTop: 20, alignItems: "center" }}>
            <ProgressRing
              progress={summary.progress}
              size={140}
              strokeWidth={12}
              label={`$${summary.totalSpent.toFixed(0)}`}
              sublabel={`of $${summary.totalBudget.toFixed(0)}`}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 16 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#6b7280" }}>Remaining</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#10b981" }}>
                  ${summary.totalRemaining.toFixed(0)}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#6b7280" }}>Daily limit</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
                  ${(summary.totalRemaining / Math.max(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(), 1)).toFixed(0)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Budget Cards */}
        <View style={{ marginTop: 24, gap: 12 }}>
          {budgets.map((budget) => (
            <TouchableOpacity key={budget.id} onLongPress={() => handleDelete(budget)}>
              <Card variant="outlined">
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>
                      {CATEGORY_EMOJI[budget.category] || "📦"}
                    </Text>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#171717" }}>
                        {budget.category}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                        ${budget.spent.toFixed(2)} of ${budget.monthlyLimit.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: budget.isOverBudget ? "#ef4444" : "#10b981",
                      }}
                    >
                      {budget.isOverBudget
                        ? `-$${(budget.spent - budget.monthlyLimit).toFixed(0)}`
                        : `$${budget.remaining.toFixed(0)}`}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                      {budget.isOverBudget ? "over" : "left"}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginTop: 12 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "#f3f4f6",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.min(budget.progress * 100, 100)}%`,
                        backgroundColor: budget.isOverBudget
                          ? "#ef4444"
                          : budget.progress > 0.8
                          ? "#f59e0b"
                          : "#10b981",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                  {budget.dailyBudget > 0 && !budget.isOverBudget && (
                    <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                      ${budget.dailyBudget.toFixed(0)}/day safe to spend
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {budgets.length === 0 && (
          <Card variant="outlined" style={{ marginTop: 20, alignItems: "center", padding: 32 }}>
            <Text style={{ fontSize: 32 }}>📊</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#171717", marginTop: 12 }}>
              No budgets yet
            </Text>
            <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4, textAlign: "center" }}>
              Set spending limits for categories to track your progress automatically.
            </Text>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={{ marginTop: 16, backgroundColor: "#171717", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Create First Budget</Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>

      {/* Add Budget Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#fafafa", padding: 20, paddingTop: 60 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "800" }}>New Budget</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={{ color: "#6b7280", fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 24 }}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {CATEGORY_OPTIONS.filter(
              (cat) => !budgets.some((b) => b.category === cat)
            ).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setNewCategory(cat)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: newCategory === cat ? "#171717" : "#fff",
                  borderWidth: 1,
                  borderColor: newCategory === cat ? "#171717" : "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    color: newCategory === cat ? "#fff" : "#374151",
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {CATEGORY_EMOJI[cat]} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 24 }}>Monthly Limit</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#171717" }}>$</Text>
            <TextInput
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="decimal-pad"
              placeholder="0"
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#171717",
                marginLeft: 4,
                flex: 1,
              }}
            />
          </View>

          {/* Quick presets */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {["100", "200", "300", "500"].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setNewLimit(val)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: newLimit === val ? "#171717" : "#f3f4f6",
                }}
              >
                <Text
                  style={{
                    color: newLimit === val ? "#fff" : "#374151",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  ${val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            disabled={saving || !newCategory || !newLimit}
            style={{
              marginTop: 32,
              backgroundColor: "#171717",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              opacity: saving || !newCategory || !newLimit ? 0.5 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {saving ? "Creating..." : "Create Budget"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}
