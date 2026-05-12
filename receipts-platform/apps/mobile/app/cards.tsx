import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useRouter } from "expo-router";

interface UserCard {
  id: string;
  name: string;
  last4: string;
  network: string;
  issuer: string | null;
  isDefault: boolean;
}

export default function CardsScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [network, setNetwork] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const data = await api<{ cards: UserCard[] }>("/api/mobile/cards");
      setCards(data.cards);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !last4 || !network) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (last4.length !== 4 || !/^\d{4}$/.test(last4)) {
      Alert.alert("Error", "Last 4 must be exactly 4 digits.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/mobile/cards", {
        method: "POST",
        body: JSON.stringify({ name, last4, network }),
      });
      setName("");
      setLast4("");
      setNetwork("");
      setShowAdd(false);
      fetchCards();
    } catch {
      Alert.alert("Error", "Failed to add card.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (card: UserCard) => {
    Alert.alert("Remove Card", `Remove ${card.name} (•••• ${card.last4})?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/mobile/cards/${card.id}`, { method: "DELETE" });
            fetchCards();
          } catch {
            Alert.alert("Error", "Failed to remove card.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Cards & Rewards</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "#6b7280" }}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : (
          <>
            {cards.map((card) => (
              <View
                key={card.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", fontSize: 15 }}>
                    {card.name}
                  </Text>
                  <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
                    {card.network} •••• {card.last4}
                    {card.issuer ? ` • ${card.issuer}` : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(card)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    backgroundColor: "#fef2f2",
                  }}
                >
                  <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "600" }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {cards.length === 0 && !showAdd && (
              <Text style={{ color: "#6b7280", marginTop: 24, textAlign: "center" }}>
                No cards added yet. Add your cards to get reward recommendations.
              </Text>
            )}

            {showAdd ? (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  marginTop: 16,
                }}
              >
                <Text style={{ fontWeight: "600", marginBottom: 12 }}>Add Card</Text>
                <TextInput
                  placeholder="Card name (e.g. Chase Sapphire)"
                  value={name}
                  onChangeText={setName}
                  style={inputStyle}
                />
                <TextInput
                  placeholder="Last 4 digits"
                  value={last4}
                  onChangeText={setLast4}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={inputStyle}
                />
                <TextInput
                  placeholder="Network (Visa, Mastercard, Amex)"
                  value={network}
                  onChangeText={setNetwork}
                  style={inputStyle}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={handleAdd}
                    disabled={saving}
                    style={{
                      flex: 1,
                      backgroundColor: "#000",
                      borderRadius: 8,
                      padding: 12,
                      alignItems: "center",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {saving ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowAdd(false)}
                    style={{
                      flex: 1,
                      backgroundColor: "#f3f4f6",
                      borderRadius: 8,
                      padding: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "500" }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAdd(true)}
                style={{
                  backgroundColor: "#000",
                  borderRadius: 10,
                  padding: 14,
                  alignItems: "center",
                  marginTop: 16,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>＋ Add Card</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 8,
  padding: 12,
  marginBottom: 8,
  fontSize: 15,
} as const;
