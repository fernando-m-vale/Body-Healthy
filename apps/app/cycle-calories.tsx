import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { upsertCalorieLog, listCalorieLogs } from "../src/api/calorie-logs";
import { getCurrentCycle } from "../src/api/dashboard";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { toIsoNoonUtc } from "../src/lib/format-date";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const TODAY = new Date();
const TODAY_ISO = toIsoNoonUtc(TODAY);

function todayLabel(): string {
  return `Hoje, ${TODAY.getDate()} de ${MONTHS_LONG[TODAY.getMonth()]}`;
}

function timeLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface SessionMeal {
  id: string;
  name: string;
  time: string;
  kcal: number;
}

// Tela — Registro de calorias (mockups.html, classe .s5). Spec 06, RF22:
// DailyCalorieLog só guarda um total agregado por dia (upsert por logDate),
// sem nome/horário por refeição — "sem detalhamento de alimento, sem foto"
// (spec, seção 7). O "+ Adicionar refeição" do mockup continua existindo
// como forma incremental de somar ao total, mas nome/horário de cada
// refeição só existem nesta lista local da sessão atual (nunca persistem
// individualmente) — decisão confirmada no planejamento desta tarefa.
export default function CycleCaloriesScreen() {
  const { token } = useAuth();
  const [baseTotal, setBaseTotal] = useState(0);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number | null>(null);
  const [sessionMeals, setSessionMeals] = useState<SessionMeal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealKcal, setMealKcal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([listCalorieLogs(token), getCurrentCycle(token).catch(() => null)])
      .then(([logs, currentCycle]) => {
        const todayLog = logs.find((l) => new Date(l.logDate).toISOString().slice(0, 10) === TODAY_ISO.slice(0, 10));
        if (todayLog) {
          setBaseTotal(todayLog.caloriesConsumed ?? 0);
          setDailyCalorieGoal(todayLog.dailyCalorieGoal);
        } else if (currentCycle) {
          setDailyCalorieGoal(currentCycle.dailyCalorieGoal);
        }
      })
      .catch(() => {
        // Não bloqueia a tela — só não pré-preenche.
      })
      .finally(() => setLoaded(true));
  }, [token]);

  const total = useMemo(
    () => baseTotal + sessionMeals.reduce((sum, m) => sum + m.kcal, 0),
    [baseTotal, sessionMeals],
  );
  const remaining = dailyCalorieGoal != null ? dailyCalorieGoal - total : null;
  const barPercent = dailyCalorieGoal != null && dailyCalorieGoal > 0 ? Math.min(100, (total / dailyCalorieGoal) * 100) : 0;
  const isOverGoal = remaining != null && remaining < 0;

  function openModal() {
    setMealName("");
    setMealKcal("");
    setError(null);
    setModalVisible(true);
  }

  async function handleAddMeal() {
    if (!token) return;
    const kcalValue = Number(mealKcal.trim().replace(",", "."));
    if (!mealName.trim()) {
      setError("Dê um nome pra refeição.");
      return;
    }
    if (!mealKcal.trim() || Number.isNaN(kcalValue) || kcalValue < 0) {
      setError("Informe um valor de calorias válido.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const newTotal = total + Math.round(kcalValue);
      await upsertCalorieLog(token, { logDate: TODAY_ISO, caloriesConsumed: newTotal });
      setSessionMeals((prev) => [
        ...prev,
        { id: `${Date.now()}`, name: mealName.trim(), time: timeLabel(new Date()), kcal: Math.round(kcalValue) },
      ]);
      setModalVisible(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackButton />
        <Text style={typography.h2}>Registro de calorias</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateLabel}>{todayLabel()}</Text>

        {loaded ? (
          <View style={styles.calCard}>
            <Text style={styles.calNum}>
              {total.toLocaleString("pt-BR")} <Text style={styles.calUnit}>kcal</Text>
            </Text>
            {dailyCalorieGoal != null ? (
              <>
                <Text style={styles.calOf}>de {dailyCalorieGoal.toLocaleString("pt-BR")} kcal · meta do ciclo</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, isOverGoal && styles.barFillOver, { width: `${barPercent}%` }]} />
                </View>
                <Text style={[styles.calRemaining, isOverGoal && styles.calRemainingOver]}>
                  {isOverGoal
                    ? `${Math.abs(remaining ?? 0).toLocaleString("pt-BR")} kcal acima da meta hoje`
                    : `${(remaining ?? 0).toLocaleString("pt-BR")} kcal restantes hoje`}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable style={styles.addBtn} onPress={openModal}>
          <Text style={styles.addBtnText}>+ Adicionar refeição</Text>
        </Pressable>

        {sessionMeals.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Adicionado nesta sessão</Text>
            <Text style={styles.sectionNote}>
              Nome e horário aparecem só enquanto esta tela estiver aberta — o que fica salvo é o total do dia.
            </Text>
            {sessionMeals.map((meal) => (
              <View key={meal.id} style={styles.mealRow}>
                <View>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <Text style={styles.mealKcal}>{meal.kcal.toLocaleString("pt-BR")} kcal</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.disclaimer}>
          Estimativa informativa com base no seu ciclo atual — não é orientação nutricional individualizada.
        </Text>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Adicionar refeição</Text>

            <Text style={typography.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={mealName}
              onChangeText={setMealName}
              placeholder="Ex.: Almoço"
              placeholderTextColor={colors.muted}
            />

            <Text style={[typography.label, styles.fieldSpacing]}>Calorias</Text>
            <View style={styles.kcalInputWrap}>
              <TextInput
                style={styles.kcalInput}
                value={mealKcal}
                onChangeText={setMealKcal}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.kcalUnit}>kcal</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.sheetBottom}>
              <Button label="Adicionar" onPress={handleAddMeal} loading={saving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  top: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 4,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 22,
  },
  dateLabel: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 18,
  },
  calCard: {
    backgroundColor: colors.pulse,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 18,
  },
  calNum: {
    fontFamily: fontFamily.displayBold,
    fontSize: 34,
    color: colors.base,
  },
  calUnit: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
  },
  calOf: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: "#FFE1D6",
    marginTop: 2,
  },
  barTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: radii.pill,
    marginTop: 16,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.base,
    borderRadius: radii.pill,
  },
  // Acima da meta (Spec 06, decisão registrada no planejamento desta
  // tarefa): barra e texto ganham contraste com --ink em vez de introduzir
  // uma segunda cor de atenção competindo com Pulse na mesma tela.
  barFillOver: {
    backgroundColor: colors.ink,
  },
  calRemaining: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: "#FFE1D6",
    marginTop: 10,
  },
  calRemainingOver: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.base,
  },
  addBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
    backgroundColor: colors.base,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 18,
  },
  addBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.pulseDark,
  },
  sectionTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  sectionNote: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mealName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  mealTime: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  mealKcal: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  disclaimer: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.5,
    marginTop: 18,
    marginBottom: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 31, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 16,
  },
  input: {
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
  },
  fieldSpacing: {
    marginTop: 2,
  },
  kcalInputWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  kcalInput: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 20,
    color: colors.ink,
    width: 100,
    padding: 0,
  },
  kcalUnit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 4,
  },
  sheetBottom: {
    marginTop: 20,
  },
});
