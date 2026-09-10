import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./Button";
import { colors } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

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

interface ProcessingStatusScreenProps {
  status: string | null;
  error: string | null;
  slow: boolean;
  title: string;
  bodyText: string;
  failedTitle: string;
  failedText: string;
  onRetry: () => void;
  // Nome do status intermediário que acende a segunda bolinha dos passos
  // (ex.: "processing" em exame/laudo). Domínios sem status intermediário
  // (ex.: ciclo, "generating" direto pra "generated") podem omitir — a
  // segunda bolinha só não acende nunca, sem quebrar nada.
  activeStatus?: string;
}

// Tela de status compartilhada — mockups.html classe .s15. Reaproveitada
// tal qual entre exame e laudo de imagem (Specs 01/02, mesmo padrão de
// upload/pipeline assíncrono). Estado (status/erro/slow) vem de fora
// (useStatusPolling); esta tela só é apresentação.
export function ProcessingStatusScreen({
  status,
  error,
  slow,
  title,
  bodyText,
  failedTitle,
  failedText,
  onRetry,
  activeStatus = "processing",
}: ProcessingStatusScreenProps) {
  const rotation = useSpinAnimation();

  if (status === "failed") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={typography.h2}>{failedTitle}</Text>
          <Text style={[typography.bodySmall, styles.failText]}>{failedText}</Text>
          <Button label="Tentar novamente" onPress={onRetry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View style={[styles.ring, { transform: [{ rotate: rotation }] }]} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{bodyText}</Text>
        {slow ? <Text style={styles.slowText}>Isso está demorando mais que o normal — ainda estamos tentando.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.steps}>
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, status !== activeStatus && styles.stepDotPending]} />
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
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 12,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
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
