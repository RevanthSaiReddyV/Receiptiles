import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { CreditCard } from "../../components/ui/CreditCard";
import { MerchantIcon } from "../../components/ui/MerchantIcon";
import { ProgressRing } from "../../components/ui/ProgressRing";

interface RewardsSummary {
  totalRewardsEarned: number;
  totalMissedRewards: number;
  cardsCount: number;
  monthlyTransactions: number;
}

interface CategoryRec {
  category: string;
  bestCardName: string | null;
  rate: number;
  rewardType: string;
}

interface MissedReward {
  receiptId: string;
  merchant: string;
  total: number;
  recommendation: {
    cardName: string;
    rewardRate: number;
    estimatedReward: number;
    reason: string;
  };
}

interface SignupBonus {
  id: string;
  cardName: string;
  targetSpend: number;
  currentSpend: number;
  bonusValue: string;
  progress: number;
  remaining: number;
  daysLeft: number;
  dailyNeeded: number;
}

interface CardReward {
  cardId: string;
  cardName: string;
  earned: number;
  count: number;
}

interface UserCard {
  id: string;
  name: string;
  last4: string;
  network: string;
  issuer: string | null;
}

export default function RewardsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [categoryRecs, setCategoryRecs] = useState<CategoryRec[]>([]);
  const [missedRewards, setMissedRewards] = useState<MissedReward[]>([]);
  const [signupBonuses, setSignupBonuses] = useState<SignupBonus[]>([]);
  const [cardRewards, setCardRewards] = useState<CardReward[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);

  const load = useCallback(async () => {
    try {
      const [rewardsRes, cardsRes] = await Promise.allSettled([
        api<{
          summary: RewardsSummary;
          bestCardPerCategory: CategoryRec[];
          missedRewards: MissedReward[];
          signupBonuses: SignupBonus[];
          cardRewards: CardReward[];
        }>("/api/mobile/rewards"),
        api<{ cards: UserCard[] }>("/api/mobile/cards"),
      ]);

      if (rewardsRes.status === "fulfilled") {
        setSummary(rewardsRes.value.summary);
        setCategoryRecs(rewardsRes.value.bestCardPerCategory.filter((r) => r.bestCardName));
        setMissedRewards(rewardsRes.value.missedRewards);
        setSignupBonuses(rewardsRes.value.signupBonuses);
        setCardRewards(rewardsRes.value.cardRewards);
      }

      if (cardsRes.status === "fulfilled") {
        setCards(cardsRes.value.cards);
      }
    } catch (e) {
      console.error("Rewards load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

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
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>Rewards</Text>
          <TouchableOpacity onPress={() => router.push("/cards")}>
            <Text style={{ color: "#2563eb", fontWeight: "600", fontSize: 14 }}>
              Manage Cards
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rewards Summary */}
        {summary && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Card variant="elevated" style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}>Earned</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#10b981", marginTop: 4 }}>
                ${summary.totalRewardsEarned.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>this month</Text>
            </Card>
            <Card variant="elevated" style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}>Missed</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#ef4444", marginTop: 4 }}>
                ${summary.totalMissedRewards.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>wrong card used</Text>
            </Card>
          </View>
        )}

        {/* Signup Bonus Tracker */}
        {signupBonuses.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
              Signup Bonus Progress
            </Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {signupBonuses.map((bonus) => (
                <Card key={bonus.id} variant="outlined">
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#171717" }}>
                        {bonus.cardName}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        Earn {bonus.bonusValue}
                      </Text>
                    </View>
                    <ProgressRing
                      progress={bonus.progress}
                      size={56}
                      strokeWidth={5}
                      label={`${Math.round(bonus.progress * 100)}%`}
                    />
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <View style={{ height: 5, backgroundColor: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                      <View
                        style={{
                          height: "100%",
                          width: `${Math.min(bonus.progress * 100, 100)}%`,
                          backgroundColor: "#2563eb",
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>
                        ${bonus.currentSpend.toFixed(0)} / ${bonus.targetSpend.toFixed(0)}
                      </Text>
                      <Text style={{ fontSize: 11, color: bonus.daysLeft < 14 ? "#ef4444" : "#6b7280" }}>
                        {bonus.daysLeft} days left • ${bonus.dailyNeeded}/day
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Best Card Per Category — The Optimizer Grid */}
        {categoryRecs.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
              Which Card to Use
            </Text>
            <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              Optimal card for each spending category
            </Text>
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {categoryRecs.map((rec) => (
                <Card
                  key={rec.category}
                  variant="outlined"
                  padding={12}
                  style={{ width: "47%" }}
                >
                  <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
                    {rec.category}
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: "700", color: "#171717", marginTop: 6 }}
                    numberOfLines={2}
                  >
                    {rec.bestCardName}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#10b981" }}>
                      {rec.rate}%
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>
                      {rec.rewardType}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Missed Rewards Feed */}
        {missedRewards.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
              Missed Rewards
            </Text>
            <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              You could have earned more with a different card
            </Text>
            <Card variant="outlined" padding={0} style={{ marginTop: 12, overflow: "hidden" }}>
              {missedRewards.slice(0, 5).map((missed, idx) => (
                <View
                  key={missed.receiptId}
                  style={{
                    padding: 14,
                    borderBottomWidth: idx < Math.min(missedRewards.length, 5) - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MerchantIcon name={missed.merchant} size={34} />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#171717" }}>
                          {missed.merchant}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#6b7280" }}>
                          Use {missed.recommendation.cardName}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#ef4444" }}>
                        -${missed.recommendation.estimatedReward.toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#9ca3af" }}>missed</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Card Performance This Month */}
        {cardRewards.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
              Card Performance
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {cardRewards.map((cr) => (
                <Card key={cr.cardId} variant="outlined" padding={12}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#171717" }}>
                        {cr.cardName}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        {cr.count} transactions
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#10b981" }}>
                      +${cr.earned.toFixed(2)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {cards.length === 0 && (
          <Card variant="outlined" style={{ marginTop: 24, alignItems: "center", padding: 32 }}>
            <Text style={{ fontSize: 32 }}>💳</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#171717", marginTop: 12 }}>
              Add your cards
            </Text>
            <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4, textAlign: "center" }}>
              Add your credit cards to see which one to use for every purchase and never miss rewards.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/cards")}
              style={{ marginTop: 16, backgroundColor: "#171717", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Add Cards</Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
