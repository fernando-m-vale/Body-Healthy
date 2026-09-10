import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

export interface MarkerEditState {
  value: string;
  unit: string;
  referenceMin: string;
  referenceMax: string;
}

interface MarkerRowProps {
  name: string;
  edit: MarkerEditState;
  onChange: (patch: Partial<MarkerEditState>) => void;
}

function isOutOfRange(edit: MarkerEditState): boolean {
  const value = Number(edit.value.replace(",", "."));
  const min = edit.referenceMin.trim() ? Number(edit.referenceMin.replace(",", ".")) : null;
  const max = edit.referenceMax.trim() ? Number(edit.referenceMax.replace(",", ".")) : null;
  if (Number.isNaN(value) || (min == null && max == null)) return false;
  if (min != null && value < min) return true;
  if (max != null && value > max) return true;
  return false;
}

function referenceLabel(edit: MarkerEditState): string {
  if (edit.referenceMin.trim() && edit.referenceMax.trim()) {
    return `${edit.referenceMin}–${edit.referenceMax} ${edit.unit}`;
  }
  if (edit.referenceMin.trim()) return `> ${edit.referenceMin} ${edit.unit}`;
  if (edit.referenceMax.trim()) return `< ${edit.referenceMax} ${edit.unit}`;
  return edit.unit;
}

// Linha de marcador editável (mockups.html, .marker-row) — Spec 01, seção 4
// passo 5 (RNF03): nome nunca editável, valor/unidade/faixa editáveis.
// Cor do indicador segue a regra do sistema-visual.md seção 3 (nunca Vital
// aqui): pulse se fora da faixa, mid em qualquer outro caso.
export function MarkerRow({ name, edit, onChange }: MarkerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const outOfRange = isOutOfRange(edit);

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={() => setExpanded((prev) => !prev)}>
        <View style={styles.left}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.ref}>{referenceLabel(edit)}</Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.dot, outOfRange ? styles.dotPulse : styles.dotMid]} />
          <Text style={styles.value}>
            {edit.value} {edit.unit}
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.editArea}>
          <View style={styles.editField}>
            <Text style={typography.label}>Valor</Text>
            <TextInput
              style={styles.input}
              value={edit.value}
              onChangeText={(text) => onChange({ value: text })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.editField}>
            <Text style={typography.label}>Unidade</Text>
            <TextInput style={styles.input} value={edit.unit} onChangeText={(text) => onChange({ unit: text })} />
          </View>
          <View style={styles.editRow}>
            <View style={[styles.editField, styles.editFieldHalf]}>
              <Text style={typography.label}>Faixa mín.</Text>
              <TextInput
                style={styles.input}
                value={edit.referenceMin}
                onChangeText={(text) => onChange({ referenceMin: text })}
                keyboardType="numeric"
                placeholder="—"
              />
            </View>
            <View style={[styles.editField, styles.editFieldHalf]}>
              <Text style={typography.label}>Faixa máx.</Text>
              <TextInput
                style={styles.input}
                value={edit.referenceMax}
                onChangeText={(text) => onChange({ referenceMax: text })}
                keyboardType="numeric"
                placeholder="—"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  left: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  ref: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPulse: {
    backgroundColor: colors.pulse,
  },
  dotMid: {
    backgroundColor: "#C7CCC9",
  },
  value: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  editArea: {
    paddingBottom: 16,
  },
  editRow: {
    flexDirection: "row",
    gap: 10,
  },
  editField: {
    marginBottom: 10,
  },
  editFieldHalf: {
    flex: 1,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
  },
});
