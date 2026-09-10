import { useState } from "react";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { TextField } from "../src/components/TextField";
import { ChipRow } from "../src/components/Chip";
import { DateField } from "../src/components/DateField";
import { Toggle } from "../src/components/Toggle";
import { createEntry, type PrescriptionCategory } from "../src/api/prescriptions";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

const TODAY = new Date();

const CATEGORY_OPTIONS: { value: PrescriptionCategory; label: string }[] = [
  { value: "medicacao", label: "Medicação" },
  { value: "hormonio", label: "Hormônio" },
  { value: "suplemento", label: "Suplemento" },
];

function toIsoNoonUtc(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

// Tela — Nova prescrição (mockups.html, classe .s17). Spec 04, seção 4.1:
// texto de "por que pedimos" completo, sem resumir, com reforço explícito
// de que não há sugestão de dose/ajuste/início/fim — decisão exclusiva do
// médico (critério de aceite, seção 9). Cifragem/log de auditoria são
// transparentes ao app, já implementados e testados no backend.
export default function NewPrescriptionScreen() {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PrescriptionCategory | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [ongoing, setOngoing] = useState(true);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!token) {
      setError("Sessão expirada. Volte e entre novamente.");
      return;
    }
    if (!name.trim()) {
      setError("Informe o nome.");
      return;
    }
    if (!category) {
      setError("Selecione uma categoria.");
      return;
    }
    if (!startDate) {
      setError("Informe a data de início.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createEntry(token, {
        name: name.trim(),
        category,
        startDate: toIsoNoonUtc(startDate),
        endDate: ongoing || !endDate ? null : toIsoNoonUtc(endDate),
        notes: notes.trim() || null,
      });
      Alert.alert("Prescrição salva", "O item foi adicionado à sua linha do tempo.", [
        { text: "OK", onPress: () => router.replace("/prescriptions") },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BackButton />
        <Text style={typography.h2}>Nova prescrição</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Por que pedimos: </Text>
              registrar sua linha do tempo de medicação/hormônio ajuda a contextualizar sua evolução ao longo do
              tempo (ex.: cruzar com mudanças em exames ou bioimpedância) e a personalizar seu plano de ação.
              {"\n\n"}
              <Text style={styles.infoBold}>O que não fazemos: </Text>
              não sugerimos, ajustamos ou avaliamos dose, início ou fim de nenhum item — isso é decisão exclusiva
              do seu médico. Este dado é usado apenas como contexto histórico, nunca como recomendação clínica.
            </Text>
          </View>

          <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Colecalciferol" />

          <Text style={typography.label}>Categoria</Text>
          <View style={styles.chipWrap}>
            <ChipRow options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </View>

          <View style={styles.fieldSpacing}>
            <DateField label="Data de início" value={startDate} onChange={setStartDate} format="long" maximumDate={TODAY} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Em uso contínuo</Text>
            <Toggle value={ongoing} onChange={setOngoing} />
          </View>

          {!ongoing ? (
            <View style={styles.fieldSpacing}>
              <DateField label="Data de término" value={endDate} onChange={setEndDate} format="long" minimumDate={startDate ?? undefined} />
            </View>
          ) : null}

          <View style={styles.fieldSpacing}>
            <TextField label="Observações (opcional)" value={notes} onChangeText={setNotes} multiline />
          </View>

          <Text style={styles.lockNote}>
            Este dado é cifrado — só você tem acesso, e nunca é usado pra sugerir ajuste.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <Button label="Salvar" onPress={handleSave} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
  },
  scroll: {
    flex: 1,
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  infoText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 13 * 1.6,
    color: colors.muted,
  },
  infoBold: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.ink,
  },
  chipWrap: {
    marginTop: 8,
    marginBottom: 18,
  },
  fieldSpacing: {
    marginBottom: 18,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginBottom: 4,
  },
  toggleLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  lockNote: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.5,
    marginTop: 14,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 14,
  },
});
