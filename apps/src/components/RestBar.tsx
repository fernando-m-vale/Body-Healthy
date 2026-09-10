import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RestTimerState } from "../lib/rest-timer";
import { colors, radii } from "../theme/tokens";
import { fontFamily } from "../theme/typography";

interface RestBarProps {
  state: RestTimerState;
  onSkip: () => void;
}

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Barra de descanso — persistente, não-bloqueante (sistema-visual.md seção 5,
// Spec 09). Ancorada na base da tela, nunca cobre nem trava o resto —
// substitui a ideia inicial de bottom sheet bloqueante (decisão do
// Fernando, 08/09/2026). Indicador de expandir é só visual nesta primeira
// versão (sem conteúdo expandido definido na spec ainda — decisão
// registrada no planejamento desta tarefa).
export function RestBar({ state, onSkip }: RestBarProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <Text style={styles.count}>{formatMmSs(state.remainingSeconds)}</Text>
        <View style={styles.info}>
          <Text style={styles.label}>Descanso</Text>
          <Text style={styles.exercise} numberOfLines={1}>
            Próxima: {state.exerciseName} · série {state.nextSetNumber}
          </Text>
        </View>
        <Text style={styles.expand}>⌃</Text>
        <Pressable style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipText}>Pular</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    margin: 14,
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#12181F",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 10,
  },
  count: {
    fontFamily: fontFamily.displayBold,
    fontSize: 19,
    color: colors.pulse,
    minWidth: 46,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#B7C4BE",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  exercise: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.base,
    marginTop: 1,
  },
  expand: {
    color: "#B7C4BE",
    fontSize: 14,
    paddingHorizontal: 2,
  },
  skipBtn: {
    backgroundColor: colors.vital,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  skipText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.base,
  },
});
