// components/Btn.tsx
import React from "react";
import { Pressable, Text, ViewStyle, PressableProps } from "react-native";
import { theme } from "../lib/theme";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "lg";

type Props = {
  title: string;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
} & Omit<PressableProps, "style">;

export default function Btn({
  title,
  variant = "primary",
  size = "md",
  style,
  disabled,
  ...props
}: Props) {
  const bg =
    variant === "danger" ? theme.danger : variant === "secondary" ? "#eae3d6" : theme.primary;
  const fg =
    variant === "danger"
      ? theme.dangerText
      : variant === "secondary"
      ? theme.primaryText
      : "#ffffff";

  const padV = size === "lg" ? 14 : 10;
  const padH = size === "lg" ? 16 : 14;
  const radius = 10;

  return (
    <Pressable
      android_ripple={{ color: "rgba(0,0,0,0.1)" }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}
