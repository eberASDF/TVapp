import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AttendanceStatus, statusLabels } from "./types";

export const colors = {
  bg: "#0b111b",
  panel: "#131d2b",
  card: "#192637",
  border: "#27384a",
  text: "#f2f5f8",
  muted: "#91a2b8",
  teal: "#66e1c3",
  amber: "#f8bb68",
  danger: "#ff929a",
};
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
  preferred = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  preferred?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hasTVPreferredFocus={preferred}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        focused && ui.focused,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[ui.buttonText, secondary && { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  placeholder = "",
  keyboard = "default",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  secure?: boolean;
  placeholder?: string;
  keyboard?: "default" | "email-address" | "number-pad";
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboard}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={ui.input}
      />
    </View>
  );
}
export function Badge({ status }: { status: AttendanceStatus }) {
  const green = status === "a_tiempo";
  return (
    <View
      style={{
        backgroundColor: green ? "#173b35" : "#3a3023",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: green ? colors.teal : colors.amber,
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {statusLabels[status]}
      </Text>
    </View>
  );
}
export function Message({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  if (!text) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{
        color: error ? colors.danger : colors.teal,
        lineHeight: 21,
        fontSize: 14,
      }}
    >
      {text}
    </Text>
  );
}
export const ui = StyleSheet.create({
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.teal,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -1,
  },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    minHeight: 48,
  },
  button: {
    backgroundColor: colors.teal,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    minHeight: 50,
    justifyContent: "center",
  },
  secondary: { backgroundColor: colors.card, borderColor: colors.border },
  focused: { borderColor: "#ffffff", transform: [{ scale: 1.02 }] },
  buttonText: { color: colors.bg, fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 22,
    gap: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
