import React, { useMemo } from "react";
import { Text, ActivityIndicator, View } from "react-native";
import { MotiPressable } from "moti/interactions";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost" | "accent" | "danger";
  className?: string; // extra container classes
  textClassName?: string; // optional extra text classes
}

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  className = "",
  textClassName = "",
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Note: put ALL tailwind layout/bg styles on the inner View (NativeWind reliable)
  const containerClasses = useMemo(() => {
    switch (variant) {
        case "primary":
            return "bg-primary dark:bg-primary-dark border-transparent";
        case "accent":
            return "bg-accent dark:bg-accent-dark border-transparent";
        case "danger":
            return "bg-red-600 border-transparent";
        case "outline":
            return "bg-transparent border-2 border-primary dark:border-primary-light";
        case "ghost":
            return "bg-transparent border-transparent";
        default:
            return "bg-primary border-transparent";
        }

  }, [variant]);

  const textClasses = useMemo(() => {
    switch (variant) {
        case "primary":
        case "accent":
        case "danger":
            return "text-white font-bold";
        case "outline":
            return "text-primary dark:text-primary-light font-bold";
        case "ghost":
            return "text-gray-600 dark:text-gray-300 font-medium";
        default:
            return "text-white font-bold";
        }

  }, [variant]);

  return (
    <MotiPressable
      onPress={onPress}
      disabled={isDisabled}
      // Use style for sizing so it never collapses even if className is ignored
      style={{ width: "100%" }}
      animate={({ pressed }) => {
        "worklet";
        return {
          scale: pressed ? 0.96 : 1,
          opacity: isDisabled ? 0.5 : 1,
        };
      }}
      transition={{ type: "timing", duration: 100 }}
    >
      <View
        className={[
          // fixed height gives consistent tap target across the app
          "h-12 w-full px-6 rounded-xl flex-row items-center justify-center border",
          containerClasses,
          className,
        ].join(" ")}
      >
        {loading ? (
          <ActivityIndicator
            // keep your old behavior
            color={variant === "outline" ? "#4F46E5" : "white"}
          />
        ) : (
          <Text className={["text-lg", textClasses, textClassName].join(" ")}>
            {title}
          </Text>
        )}
      </View>
    </MotiPressable>
  );
}
