import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { TextField } from "../src/components/TextField";
import { signup } from "../src/api/auth";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors } from "../src/theme/tokens";
import { typography } from "../src/theme/typography";

// Formulário de cadastro — sem mockup dedicado em mockups.html (só a tela de
// boas-vindas existe); composto a partir dos componentes do sistema de
// design (TextField no padrão da tela "Nova prescrição", Button), decisão
// registrada no planejamento desta tarefa.
export default function SignupScreen() {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await signup(email.trim(), password);
      await setToken(result.token);
      router.replace("/consent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <BackButton />
          <Text style={typography.h2}>Criar conta</Text>

          <View style={styles.form}>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="voce@exemplo.com"
            />
            <TextField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="Mínimo 8 caracteres"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <View>
          <Button
            label="Criar conta"
            onPress={handleSubmit}
            loading={loading}
            disabled={!email.trim() || password.length < 8}
          />
          <Button label="Já tenho conta" variant="link" onPress={() => router.replace("/login")} />
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
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
  },
  form: {
    marginTop: 20,
  },
  error: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: -4,
    marginBottom: 8,
  },
});
