import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type Variant = "primary" | "secondary" | "link";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Variantes conforme sistema-visual.md seção 5 — pílula, sem sombra.
export function Button({ label, onPress, variant = "primary", disabled, loading, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === "link") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[styles.linkWrap, style]}>
        <Text style={[typography.link, isDisabled && styles.disabledText]}>{label}</Text>
      </Pressable>
    );
  }

  const isSecondary = variant === "secondary";
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, isSecondary ? styles.secondary : styles.primary, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.ink : colors.base} />
      ) : (
        <Text style={isSecondary ? styles.secondaryText : typography.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.vital,
  },
  secondary: {
    backgroundColor: colors.base,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryText: {
    fontFamily: typography.buttonText.fontFamily,
    fontSize: typography.buttonText.fontSize,
    color: colors.ink,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    opacity: 0.45,
  },
  linkWrap: {
    alignItems: "center",
    marginTop: 14,
    padding: 4,
  },
});
