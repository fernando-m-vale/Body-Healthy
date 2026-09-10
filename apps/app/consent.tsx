import { useState } from "react";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { acceptConsent } from "../src/api/consent";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

// Tela 2 — Consentimento LGPD (mockups.html, classe .s6). Spec 00, seção 9:
// única tela de todo o produto que pode bloquear o fluxo — sem consentimento
// não há base legal pra tratar dado de saúde. Texto jurídico final ainda
// pendente de revisão regulatória (spec, seção 6); o texto abaixo é o mesmo
// do mockup, provisório.
export default function ConsentScreen() {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (!token) {
      setError("Sessão expirada. Volte e entre novamente.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await acceptConsent(token);
      router.replace("/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar o consentimento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Antes de continuar</Text>
          </View>
          <Text style={typography.h2}>Seus dados de saúde, com cuidado.</Text>
          <View style={styles.body}>
            <Text style={typography.bodyRelaxed}>
              Exame, bioimpedância e prescrição são <Text style={styles.bold}>dados sensíveis</Text>, protegidos pela
              LGPD. Usamos isso só pra montar o seu plano de treino e nutrição — nada mais.
            </Text>
            <Text style={[typography.bodyRelaxed, styles.paragraphSpacing]}>
              Você pode <Text style={styles.bold}>revogar esse consentimento a qualquer momento</Text> nas
              configurações, sem perder acesso à conta.
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View>
          <Button label="Concordo e continuo" onPress={handleAccept} loading={loading} />
          <Button
            label="Ler o texto completo"
            variant="link"
            onPress={() =>
              Alert.alert(
                "Texto completo",
                "O texto jurídico final do consentimento ainda está em revisão regulatória e será disponibilizado aqui em breve.",
              )
            }
          />
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
    paddingTop: 28,
    paddingBottom: 24,
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: colors.pulseTint,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  tagText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.pulseDark,
  },
  body: {
    marginTop: 14,
  },
  paragraphSpacing: {
    marginTop: 14,
  },
  bold: {
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
