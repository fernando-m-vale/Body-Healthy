import { router } from "expo-router";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/tokens";

interface BackButtonProps {
  style?: StyleProp<ViewStyle>;
}

// sistema-visual.md, seção 5 (v3): ícone de seta 24×24, sempre dentro de uma
// área de toque mínima de 44×44 (iOS HIG / Material Design) — o ícone
// visual pode ser menor que a área de toque, mas a área de toque nunca é.
// Componente único, reaproveitado em todo header com navegação de volta.
export function BackButton({ style }: BackButtonProps) {
  return (
    <Pressable onPress={() => router.back()} style={[styles.touchArea, style]}>
      <Text style={styles.icon}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    width: 44,
    height: 44,
    marginLeft: -10,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 24,
    height: 24,
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    color: colors.ink,
  },
});
