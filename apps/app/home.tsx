import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { colors } from "../src/theme/tokens";
import { typography } from "../src/theme/typography";

// Placeholder temporário pós-onboarding — o Dashboard de verdade (Spec 07)
// é escopo de uma tarefa futura própria (decisão registrada no planejamento
// da tarefa de onboarding). Esta rota existe só pra os fluxos de upload
// (exame, laudo de imagem) terem um destino/ponto de entrada pra testar,
// sem implementar nada do Dashboard aqui.
export default function HomePlaceholderScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={typography.h2}>Onboarding concluído.</Text>
        <Text style={[typography.body, styles.text]}>
          O dashboard (Spec 07) ainda não foi implementado nesta tarefa. Seu token foi salvo com sucesso.
        </Text>
        <Button label="Enviar exame" onPress={() => router.push("/exam-upload")} style={styles.button} />
        <Button label="Enviar laudo de imagem" onPress={() => router.push("/report-upload")} style={styles.button} />
        <Button label="Registrar bioimpedância" onPress={() => router.push("/bioimpedance")} style={styles.button} />
        <Button label="Prescrições" onPress={() => router.push("/prescriptions")} style={styles.button} />
        <Button label="Novo ciclo (objetivo/plano/treino)" onPress={() => router.push("/cycle-declare")} style={styles.button} />
        <Button label="Check-in semanal" onPress={() => router.push("/cycle-checkin")} style={styles.button} />
        <Button label="Registro de calorias" onPress={() => router.push("/cycle-calories")} style={styles.button} />
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
    paddingHorizontal: 32,
    gap: 12,
  },
  text: {
    textAlign: "center",
  },
  button: {
    marginTop: 16,
  },
});
