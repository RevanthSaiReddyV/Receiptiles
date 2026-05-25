import { useRemoteConfig, RemoteConfig } from "./remote-config";
import { View } from "react-native";

interface FeatureGateProps {
  flag: keyof RemoteConfig["features"];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ flag, children, fallback }: FeatureGateProps) {
  const { config } = useRemoteConfig();
  if (!config.features[flag]) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}
