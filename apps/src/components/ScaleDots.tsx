import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { fontFamily } from "../theme/typography";

interface ScaleDotsProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

// Padrão .scale-row/.scale-dot do sistema-visual.md (Check-in semanal, Spec
// 06) — escala 1-5, estado ativo em Pulse (regra de cor: energia/atenção usa
// Pulse, não Vital). Usado 2x na mesma tela (Energia, Qualidade do sono).
export function ScaleDots({ value, onChange, min = 1, max = 5 }: ScaleDotsProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} onPress={() => onChange(option)} style={[styles.dot, active && styles.dotActive]}>
            <Text style={[styles.dotText, active && styles.dotTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.field,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mist,
  },
  dotActive: {
    backgroundColor: colors.pulse,
  },
  dotText: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 14,
    color: colors.muted,
  },
  dotTextActive: {
    color: colors.base,
  },
});
