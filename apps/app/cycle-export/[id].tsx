import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../../src/components/BackButton";
import { getCycle, exportWorkoutCsv, type CycleDetail } from "../../src/api/cycles";
import { exportAndShareCsv } from "../../src/lib/export-workout";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { colors, radii } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fileNameFor(cycle: CycleDetail): string {
  const date = new Date(cycle.createdAt);
  return `treino-ciclo-${date.getDate()}${MONTHS[date.getMonth()]}.csv`;
}

// Nome de arquivo usado na exportação em si (diferente do exibido no card,
// que é só cosmético) — inclui hora:minuto do momento da exportação. Um
// nome fixo por ciclo (fileNameFor) fez apps de destino (Arquivos, Drive,
// planilha) mostrarem uma cópia em cache de uma exportação anterior em vez
// de reler o conteúdo novo depois de editar exercício ou regenerar — sem
// bug no backend nem na escrita do arquivo (confirmado via teste direto),
// o problema era só colisão de nome. Timestamp garante que cada exportação
// seja sempre um arquivo "novo" pro app de destino.
function exportFileNameFor(cycle: CycleDetail): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const date = new Date(cycle.createdAt);
  return `treino-ciclo-${date.getDate()}${MONTHS[date.getMonth()]}-${hh}${mm}${ss}.csv`;
}

// Tela — Exportação do treino (mockups.html, classe .s19). Spec 05, seção
// 7: formato genérico, sem app de terceiros específico. "Baixar" e
// "Compartilhar" abrem a mesma folha nativa de compartilhamento — não há
// "baixar direto" distinto em mobile (decisão registrada no planejamento
// desta tarefa).
export default function CycleExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    getCycle(token, id)
      .then(setCycle)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar o ciclo."));
  }, [id, token]);

  async function handleExport() {
    if (!token || !id || !cycle) return;
    setError(null);
    setExporting(true);
    try {
      const csv = await exportWorkoutCsv(token, id);
      await exportAndShareCsv(csv, exportFileNameFor(cycle));
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Não foi possível exportar. Tente novamente.");
      Alert.alert("Erro", "Não foi possível exportar o treino. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }

  if (error && !cycle) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cycle || !cycle.workoutPlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dayCount = new Set(cycle.workoutPlan.exercises.map((e) => e.dayLabel)).size;
  const exerciseCount = cycle.workoutPlan.exercises.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BackButton />
        <Text style={typography.h2}>Exportar treino</Text>

        <View style={styles.fileCard}>
          <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>CSV</Text>
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{fileNameFor(cycle)}</Text>
            <Text style={styles.fileSub}>
              {dayCount} dias · {exerciseCount} exercícios
            </Text>
          </View>
        </View>

        <Pressable style={styles.shareRow} onPress={handleExport} disabled={exporting}>
          <Text style={styles.shareLabel}>Baixar arquivo</Text>
          <Text style={styles.shareIcon}>↓</Text>
        </Pressable>
        <Pressable style={styles.shareRow} onPress={handleExport} disabled={exporting}>
          <Text style={styles.shareLabel}>Compartilhar</Text>
          <Text style={styles.shareIcon}>↗</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.note}>
          Formato genérico — use no Hevy, Strong, ou qualquer app de treino de sua escolha.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centeredText: {
    textAlign: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.mist,
    borderRadius: radii.card,
    padding: 20,
    marginTop: 22,
    marginBottom: 24,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.vital,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconText: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 11,
    color: colors.base,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: colors.ink,
  },
  fileSub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  shareLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  shareIcon: {
    fontSize: 16,
    color: colors.muted,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 16,
    textAlign: "center",
  },
  note: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.5,
    textAlign: "center",
    marginTop: 18,
  },
});
