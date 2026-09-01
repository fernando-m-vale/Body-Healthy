import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { fontFamily } from "../theme/typography";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface ChipRowProps<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

// Padrão .chip-row / .chip do sistema-visual.md (tela "Perfil básico" —
// nível de atividade). Seleção única.
export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.vital,
    borderColor: colors.vital,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.base,
  },
});
