import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { getExam, type ExamDetail, type ExamStatus } from "../../src/api/exams";
import { useAuth } from "../../src/auth/auth-context";
import { colors } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

const POLL_INTERVAL_MS = 3000;
const SLOW_WARNING_MS = 45000;

function useSpinAnimation() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  return spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
}

// Tela — Status de processamento (mockups.html, classe .s15). Spec 01,
// seção 4 passos 2-4: acompanha "uploaded" → "processing" →
// "pending_confirmation"/"failed". Sem mecanismo de tempo real definido na
// spec — poll fixo de 3s (decisão registrada no planejamento desta tarefa).
export default function ExamStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const rotation = useSpinAnimation();

  useEffect(() => {
    if (!token || !id) return;

    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getExam(token!, id!);
        if (cancelled) return;
        setExam(result);
        setError(null);

        if (result.status === "pending_confirmation") {
          router.replace(`/exam-confirm/${id}`);
          return;
        }
        if (result.status === "failed") {
          return;
        }
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setError("Não foi possível checar o status agora. Tentando de novo...");
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    const slowTimer = setTimeout(() => setSlow(true), SLOW_WARNING_MS);

    return () => {
      cancelled = true;
      clearTimeout(pollTimeout);
      clearTimeout(slowTimer);
    };
  }, [id, token]);

  const status: ExamStatus | null = exam?.status ?? null;

  if (status === "failed") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={typography.h2}>Não conseguimos processar</Text>
          <Text style={[typography.bodySmall, styles.failText]}>
            Algo deu errado na extração dos marcadores. Você pode tentar enviar de novo.
          </Text>
          <Button label="Tentar novamente" onPress={() => router.replace("/exam-upload")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View style={[styles.ring, { transform: [{ rotate: rotation }] }]} />
        <Text style={styles.title}>Analisando seu exame</Text>
        <Text style={styles.body}>Isso pode levar alguns minutos. A gente te avisa assim que terminar.</Text>
        {slow ? <Text style={styles.slowText}>Isso está demorando mais que o normal — ainda estamos tentando.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.steps}>
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, status !== "processing" && styles.stepDotPending]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, styles.stepDotPending]} />
        </View>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 6,
    borderColor: colors.mist,
    borderTopColor: colors.vital,
    marginBottom: 26,
  },
  title: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 13 * 1.5,
    marginBottom: 12,
  },
  slowText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 12,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 12,
    color: colors.pulseDark,
    textAlign: "center",
    marginBottom: 12,
  },
  steps: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.vital,
  },
  stepDotPending: {
    backgroundColor: colors.line,
  },
  stepLine: {
    width: 26,
    height: 1,
    backgroundColor: colors.line,
  },
  failText: {
    marginTop: 8,
    marginBottom: 24,
  },
});
