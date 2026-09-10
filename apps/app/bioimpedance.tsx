import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { DateField } from "../src/components/DateField";
import { NumberField } from "../src/components/NumberField";
import { TextField } from "../src/components/TextField";
import { createEntry, listEntries, type BioimpedanceEntry } from "../src/api/bioimpedance";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { toIsoNoonUtc } from "../src/lib/format-date";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

const TODAY = new Date();

function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isNaN(value) ? null : value;
}

function daysAgoLabel(measuredAt: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(measuredAt).getTime()) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

// Tela — Bioimpedância (mockups.html, classe .s12). Spec 03, seção 5: escrita
// síncrona, sem pipeline assíncrono. Escopo desta tarefa é só o registro
// (POST /bioimpedance) — editar/excluir/listar não têm mockup próprio,
// ficam pra quando o Dashboard (Spec 07) ou uma tarefa própria definir essas
// telas (decisão registrada no planejamento). extraMetrics fica de fora por
// enquanto pelo mesmo motivo (schema livre, sem UI de referência).
export default function BioimpedanceScreen() {
  const { token } = useAuth();
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [leanMassKg, setLeanMassKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState<Date | null>(TODAY);
  const [deviceName, setDeviceName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastMeasure, setLastMeasure] = useState<BioimpedanceEntry | null>(null);

  useEffect(() => {
    if (!token) return;
    listEntries(token)
      .then((entries) => {
        const withWeight = entries.filter((entry) => entry.weightKg != null);
        if (withWeight.length === 0) return;
        const mostRecent = withWeight.reduce((latest, entry) =>
          new Date(entry.measuredAt) > new Date(latest.measuredAt) ? entry : latest,
        );
        setLastMeasure(mostRecent);
      })
      .catch(() => {
        // Não bloqueia a tela por causa disso — é só um contexto informativo.
      });
  }, [token]);

  async function handleSave() {
    if (!token) {
      setError("Sessão expirada. Volte e entre novamente.");
      return;
    }
    if (!measuredAt) {
      setError("Informe a data da medição.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createEntry(token, {
        measuredAt: toIsoNoonUtc(measuredAt),
        weightKg: parseNumber(weightKg),
        bodyFatPercent: parseNumber(bodyFatPercent),
        leanMassKg: parseNumber(leanMassKg),
        deviceName: deviceName.trim() || null,
        notes: notes.trim() || null,
      });
      Alert.alert("Registro salvo", "Sua bioimpedância foi registrada com sucesso.", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o registro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BackButton />
        <Text style={typography.h2}>Bioimpedância</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <NumberField label="Peso" value={weightKg} onChangeText={setWeightKg} unit="kg" placeholder="84,2" />
            </View>
            <View style={styles.rowField}>
              <NumberField
                label="% Gordura"
                value={bodyFatPercent}
                onChangeText={setBodyFatPercent}
                unit="%"
                placeholder="17,8"
              />
            </View>
          </View>

          <View style={[styles.row, styles.rowSpacing]}>
            <View style={styles.rowField}>
              <NumberField
                label="Massa magra"
                value={leanMassKg}
                onChangeText={setLeanMassKg}
                unit="kg"
                placeholder="69,2"
              />
            </View>
            <View style={styles.rowField}>
              <DateField label="Data da medição" value={measuredAt} onChange={setMeasuredAt} format="short" maximumDate={TODAY} />
            </View>
          </View>

          {lastMeasure ? (
            <View style={styles.lastMeasure}>
              <Text style={styles.lastMeasureText}>
                Última medição: <Text style={styles.lastMeasureBold}>{lastMeasure.weightKg} kg</Text> ·{" "}
                {daysAgoLabel(lastMeasure.measuredAt)}
              </Text>
            </View>
          ) : null}

          <TextField
            label="Aparelho (opcional)"
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Ex.: InBody 270"
          />
          <TextField label="Observações (opcional)" value={notes} onChangeText={setNotes} multiline />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Por que pedimos: </Text>
              sua composição corporal ajuda a personalizar seu objetivo de treino e a acompanhar sua evolução ao
              longo do tempo. Não fazemos diagnóstico nem análise médica a partir desse dado.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <Button label="Salvar registro" onPress={handleSave} loading={loading} />
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowSpacing: {
    marginTop: 16,
  },
  rowField: {
    flex: 1,
  },
  lastMeasure: {
    backgroundColor: colors.mist,
    borderRadius: radii.field,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 22,
    marginBottom: 4,
  },
  lastMeasureText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
  },
  lastMeasureBold: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.ink,
  },
  infoBox: {
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 20,
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
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 16,
  },
});
