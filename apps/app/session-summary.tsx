import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Tela — Sessão concluída (resumo pós-treino) (mockups.html, label "Sessão
// concluída (resumo pós-treino)"). Spec 09 v5/v6, seção 5.8: mostrado ao
// tocar "Concluir" na sessão ao vivo, em vez de só fechar a tela. Todo o
// cálculo já vem pronto via parâmetros de rota (session/[id].tsx calcula em
// memória ao finalizar) — sem chamada nova aqui.
export default function SessionSummaryScreen() {
  const { day, durationSeconds, setsCompleted, totalWeightKg } = useLocalSearchParams<{
    day: string;
    durationSeconds: string;
    setsCompleted: string;
    totalWeightKg: string;
  }>();

  const dayTitle = day && day.length > 0 ? day : "Sessão livre";
  const duration = formatDuration(Number(durationSeconds) || 0);
  const totalWeight = Number(totalWeightKg) || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.checkBadge}>
          <Text style={styles.checkBadgeText}>✓</Text>
        </View>
        <Text style={typography.h2}>Sessão concluída</Text>
        <Text style={styles.dayTitle}>{dayTitle}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>Duração</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{setsCompleted ?? "0"}</Text>
            <Text style={styles.statLabel}>Séries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalWeight.toLocaleString("pt-BR")} kg</Text>
            <Text style={styles.statLabel}>Peso total</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <Button label="Voltar ao início" onPress={() => router.replace("/home")} />
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
    paddingHorizontal: 26,
    paddingTop: 26,
  },
  checkBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.vitalTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  checkBadgeText: {
    fontSize: 22,
    color: colors.vital,
  },
  dayTitle: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  bottom: {
    paddingHorizontal: 26,
    paddingBottom: 26,
  },
});
