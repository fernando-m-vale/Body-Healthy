import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  placeholder?: string;
}

// Padrão .weight-input do sistema-visual.md (número em destaque + sufixo de
// unidade) — usado no Perfil (altura) e na Bioimpedância (peso, % gordura,
// massa magra). Extraído aqui por se repetir 3x numa única tela.
export function NumberField({ label, value, onChangeText, unit, placeholder }: NumberFieldProps) {
  return (
    <View>
      <Text style={typography.label}>{label}</Text>
      <View style={styles.wrap}>
        <TextInput
          style={styles.value}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  value: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 20,
    color: colors.ink,
    width: 70,
    padding: 0,
  },
  unit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
  },
});
