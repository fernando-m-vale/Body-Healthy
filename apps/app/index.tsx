import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { PulseIllustration } from "../src/components/PulseIllustration";
import { colors, radii, spacing } from "../src/theme/tokens";
import { typography } from "../src/theme/typography";

// Tela 1 — Boas-vindas / cadastro (mockups.html, classe .s1).
// O botão "Continuar com Google" fica visível e desabilitado — sem
// credenciais OAuth do Google Cloud ainda (decisão registrada no
// planejamento desta tarefa; mesmo princípio já usado em Specs de backend).
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Text style={typography.wordmark}>body healthy</Text>
          <View style={styles.hero}>
            <Text style={typography.h1}>Sua saúde{"\n"}tem um plano.</Text>
            <Text style={[typography.body, styles.heroText]}>
              Conecta seus exames a um plano de treino e nutrição que evolui com você, ciclo a ciclo.
            </Text>
          </View>
          <View style={styles.pulseCard}>
            <PulseIllustration />
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Criar conta" onPress={() => router.push("/signup")} />
          <Button
            label="Continuar com Google"
            variant="secondary"
            disabled
            style={styles.googleButton}
          />
          <Button label="Já tenho conta" variant="link" onPress={() => router.push("/login")} />
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
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 28,
  },
  hero: {
    marginTop: 36,
  },
  heroText: {
    maxWidth: 260,
  },
  pulseCard: {
    marginTop: spacing.xl + spacing.xs,
    backgroundColor: colors.mist,
    borderRadius: radii.card,
    paddingVertical: 22,
    paddingHorizontal: 20,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: 0,
  },
  googleButton: {
    marginTop: spacing.sm,
  },
});
