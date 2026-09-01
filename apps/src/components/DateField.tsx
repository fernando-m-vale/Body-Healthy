import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Button } from "./Button";
import { colors, radii } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  // Formatos diferentes por tela no próprio mockups.html: Tela 3 (Nascimento)
  // usa curto ("13/12/1984"), Tela 13 (Próximo exame previsto) usa longo
  // ("30 de novembro de 2026") — o componente respeita cada mockup, não
  // impõe um formato único.
  format?: "short" | "long";
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

function formatDate(date: Date, format: "short" | "long"): string {
  if (format === "short") {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

// Padrão .date-field do sistema-visual.md — abre o seletor nativo (diálogo
// no Android, picker inline no iOS), nunca digitação livre. Ver seção 5 do
// guia de design.
export function DateField({
  label,
  value,
  onChange,
  format = "long",
  placeholder = "Selecionar data",
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const [showIosPicker, setShowIosPicker] = useState(false);

  function handlePress() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: "date",
        maximumDate,
        minimumDate,
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) {
            onChange(selectedDate);
          }
        },
      });
      return;
    }
    setShowIosPicker(true);
  }

  return (
    <View>
      <Text style={typography.label}>{label}</Text>
      <Pressable style={styles.field} onPress={handlePress}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDate(value, format) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === "ios" && showIosPicker ? (
        <View style={styles.iosPickerWrap}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onValueChange={(_event, selectedDate) => onChange(selectedDate)}
          />
          <Button label="Concluir" variant="link" onPress={() => setShowIosPicker(false)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  valueText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
  },
  placeholderText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.muted,
  },
  iosPickerWrap: {
    alignItems: "center",
  },
});
