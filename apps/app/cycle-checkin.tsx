import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { ScaleDots } from "../src/components/ScaleDots";
import { upsertCheckIn, listCheckIns, type WorkoutAdherence } from "../src/api/check-ins";
import { listEntries } from "../src/api/bioimpedance";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { toIsoNoonUtc, getMondayOfCurrentWeek } from "../src/lib/format-date";
import { colors } from "../src/theme/tokens";
import { typography } from "../src/theme/typography";

const ADHERENCE_OPTIONS: { value: WorkoutAdherence; label: string }[] = [
  { value: "completo", label: "Completo" },
  { value: "parcial", label: "Parcial" },
  { value: "nao_realizado", label: "Não fiz" },
];

const WEEK_START_ISO = toIsoNoonUtc(getMondayOfCurrentWeek());

// Tela — Check-in semanal (mockups.html, classe .s9). Spec 06, RF16: upsert
// por weekStartDate, nenhum campo obrigatório além dele. Pré-preenche com o
// check-in da semana atual se já existir — permite corrigir sem criar
// duplicata (decisão de composição, sem mockup pra esse estado).
export default function CycleCheckInScreen() {
  const { token } = useAuth();
  const [weightKg, setWeightKg] = useState("");
  const [workoutAdherence, setWorkoutAdherence] = useState<WorkoutAdherence | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([listCheckIns(token), listEntries(token)])
      .then(([checkIns, bioEntries]) => {
        const current = checkIns.find(
          (c) => new Date(c.weekStartDate).toISOString().slice(0, 10) === WEEK_START_ISO.slice(0, 10),
        );
        if (current) {
          // Check-in desta semana já existe — reflete exatamente o que foi
          // salvo (inclusive peso vazio, se foi salvo assim), sem cair no
          // fallback de peso mais recente abaixo.
          if (current.weightKg != null) setWeightKg(String(current.weightKg));
          setWorkoutAdherence(current.workoutAdherence);
          setEnergyLevel(current.energyLevel);
          setSleepQuality(current.sleepQuality);
          return;
        }

        // Nenhum check-in nesta semana ainda — sugere o peso mais recente
        // conhecido (bioimpedância ou check-in de semana anterior, o que for
        // mais novo), pra só confirmar/ajustar em vez de digitar do zero
        // toda semana (pedido explícito, fora do plano original). Sem
        // nenhum peso anterior, o campo fica vazio.
        const latestCheckInWeight = checkIns
          .filter((c) => c.weightKg != null)
          .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())[0];
        const latestBioWeight = bioEntries
          .filter((e) => e.weightKg != null)
          .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0];

        const candidates: { date: number; weight: number }[] = [];
        if (latestCheckInWeight) {
          candidates.push({ date: new Date(latestCheckInWeight.weekStartDate).getTime(), weight: latestCheckInWeight.weightKg! });
        }
        if (latestBioWeight) {
          candidates.push({ date: new Date(latestBioWeight.measuredAt).getTime(), weight: latestBioWeight.weightKg! });
        }
        if (candidates.length === 0) return;

        const mostRecent = candidates.sort((a, b) => b.date - a.date)[0];
        setWeightKg(String(mostRecent.weight));
      })
      .catch(() => {
        // Não bloqueia a tela — só não pré-preenche.
      });
  }, [token]);

  function parseWeight(): number | null {
    const trimmed = weightKg.trim();
    if (!trimmed) return null;
    const value = Number(trimmed.replace(",", "."));
    return Number.isNaN(value) ? null : value;
  }

  async function handleSave() {
    if (!token) {
      setError("Sessão expirada. Volte e entre novamente.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await upsertCheckIn(token, {
        weekStartDate: WEEK_START_ISO,
        weightKg: parseWeight(),
        workoutAdherence,
        energyLevel,
        sleepQuality,
      });
      Alert.alert("Check-in salvo", "Seu check-in desta semana foi registrado.", [
        { text: "OK", onPress: () => router.replace("/home") },
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
        <Text style={typography.h2}>Check-in da semana</Text>
        <Text style={[typography.bodySmall, styles.sub]}>Leva menos de 1 minuto</Text>

        <View style={styles.field}>
          <NumberField label="Peso hoje" value={weightKg} onChangeText={setWeightKg} unit="kg" />
        </View>

        <View style={styles.field}>
          <Text style={typography.label}>Adesão ao treino</Text>
          <View style={styles.controlSpacing}>
            <SegmentedControl options={ADHERENCE_OPTIONS} value={workoutAdherence} onChange={setWorkoutAdherence} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={typography.label}>Energia</Text>
          <View style={styles.controlSpacing}>
            <ScaleDots value={energyLevel} onChange={setEnergyLevel} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={typography.label}>Qualidade do sono</Text>
          <View style={styles.controlSpacing}>
            <ScaleDots value={sleepQuality} onChange={setSleepQuality} />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.bottom}>
        <Button label="Salvar check-in" onPress={handleSave} loading={loading} />
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
  },
  sub: {
    marginTop: 4,
    marginBottom: 22,
  },
  field: {
    marginBottom: 22,
  },
  controlSpacing: {
    marginTop: 8,
  },
  error: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 8,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
});
