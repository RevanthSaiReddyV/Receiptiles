import React, { memo, useCallback } from "react";
import { RefreshControl, ScrollView, ScrollViewProps, StyleSheet } from "react-native";

interface PullToRefreshWrapperProps extends ScrollViewProps {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

export const PullToRefreshWrapper = memo(function PullToRefreshWrapper({
  refreshing,
  onRefresh,
  children,
  style,
  ...props
}: PullToRefreshWrapperProps) {
  return (
    <ScrollView
      style={[styles.container, style]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4A5D4E"
          colors={["#4A5D4E"]}
          progressBackgroundColor="#FFFFFF"
        />
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F2",
  },
});
