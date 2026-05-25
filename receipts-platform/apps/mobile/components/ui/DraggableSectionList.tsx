import React, { memo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const ITEM_HEIGHT = 56;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Section {
  key: string;
  label: string;
  emoji: string;
}

interface DraggableSectionListProps {
  sections: Section[];
  onReorder: (newOrder: string[]) => void;
  onClose: () => void;
}

export const DraggableSectionList = memo(function DraggableSectionList({
  sections,
  onReorder,
  onClose,
}: DraggableSectionListProps) {
  const [order, setOrder] = useState(sections);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newOrder = [...order];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setOrder(newOrder);
    },
    [order]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === order.length - 1) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newOrder = [...order];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setOrder(newOrder);
    },
    [order]
  );

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onReorder(order.map((s) => s.key));
    onClose();
  }, [order, onReorder, onClose]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customize Home</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#6B6A65" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Drag sections to reorder your home screen
      </Text>

      <View style={styles.list}>
        {order.map((section, index) => (
          <View key={section.key} style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.emoji}>{section.emoji}</Text>
              <Text style={styles.label}>{section.label}</Text>
            </View>
            <View style={styles.itemRight}>
              <TouchableOpacity
                onPress={() => handleMoveUp(index)}
                disabled={index === 0}
                style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={index === 0 ? "#EBEAE4" : "#4A5D4E"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveDown(index)}
                disabled={index === order.length - 1}
                style={[
                  styles.arrowButton,
                  index === order.length - 1 && styles.arrowDisabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={index === order.length - 1 ? "#EBEAE4" : "#4A5D4E"}
                />
              </TouchableOpacity>
              <View style={styles.gripIcon}>
                <Ionicons name="menu" size={18} color="#A0AFAA" />
              </View>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={handleSave} style={styles.saveButton} activeOpacity={0.8}>
        <Text style={styles.saveText}>Save Order</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: "#242D28",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1A",
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F7F6F2",
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    color: "#82907A",
    marginTop: 6,
    marginBottom: 20,
  },
  list: {
    gap: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: ITEM_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FAFAF8",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1C1C1A",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  arrowButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  gripIcon: {
    marginLeft: 4,
    opacity: 0.5,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#242D28",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
