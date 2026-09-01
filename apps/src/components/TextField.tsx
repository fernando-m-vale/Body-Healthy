import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "../theme/tokens";
import { typography } from "../theme/typography";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

// Padrão .text-field do sistema-visual.md (usado na tela "Nova prescrição") —
// reaproveitado aqui pros formulários de cadastro/login, que não têm mockup
// próprio (decisão registrada no planejamento desta tarefa).
export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.muted}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.pulse,
  },
  errorText: {
    marginTop: spacing.xs,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    color: colors.pulseDark,
  },
});
