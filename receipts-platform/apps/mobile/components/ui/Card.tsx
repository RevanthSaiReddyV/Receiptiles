import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  variant?: "default" | "elevated" | "outlined";
  padding?: number;
}

export function Card({
  children,
  variant = "default",
  padding = 16,
  style,
  ...props
}: CardProps) {
  const variants = {
    default: {
      backgroundColor: "#ffffff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#f3f4f6",
    },
    elevated: {
      backgroundColor: "#ffffff",
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    outlined: {
      backgroundColor: "#ffffff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },
  };

  return (
    <View style={[variants[variant], { padding }, style]} {...props}>
      {children}
    </View>
  );
}
