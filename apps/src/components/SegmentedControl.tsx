import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { fontFamily } from "../theme/typography";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

// Padrão .seg do sistema-visual.md (tela "Perfil básico" — sexo biológico).
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              index < options.length - 1 && styles.optionBorder,
              active && styles.optionActive,
            ]}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    overflow: "hidden",
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  optionBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  optionActive: {
    backgroundColor: colors.vital,
  },
  optionText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },
  optionTextActive: {
    color: colors.base,
  },
});
