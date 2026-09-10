import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { DateField } from "../src/components/DateField";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { ChipRow } from "../src/components/Chip";
import { upsertProfile, type ActivityLevel, type BiologicalSexForCalc, type UpsertProfileBody } from "../src/api/profile";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

const TODAY = new Date();
const MIN_BIRTH_DATE = new Date(TODAY.getFullYear() - 120, TODAY.getMonth(), TODAY.getDate());

// Ancora no meio-dia UTC do dia local escolhido, evita o dia virar por causa
// do fuso ao serializar (mesmo cuidado que existia no parsing manual antes).
function toIsoNoonUtc(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

const SEX_OPTIONS: { value: BiologicalSexForCalc; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentario", label: "Sedentário" },
  { value: "leve", label: "Leve" },
  { value: "moderado", label: "Moderado" },
  { value: "intenso", label: "Intenso" },
  { value: "muito_intenso", label: "Muito intenso" },
];

// Tela 3 — Perfil básico (mockups.html, classe .s10). Spec 00, seção 5 passo
// 3: todos os campos puláveis, upsert por userId.
export default function ProfileScreen() {
  const { token } = useAuth();
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [sex, setSex] = useState<BiologicalSexForCalc | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(body: UpsertProfileBody) {
    if (!token) {
      setError("Sessão expirada. Volte e entre novamente.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await upsertProfile(token, body);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    const trimmedHeight = heightCm.trim();
    if (trimmedHeight) {
      const parsedHeight = Number(trimmedHeight.replace(",", "."));
      if (Number.isNaN(parsedHeight)) {
        setError("Altura inválida.");
        return;
      }
    }

    submit({
      heightCm: trimmedHeight ? Number(trimmedHeight.replace(",", ".")) : null,
      birthDate: birthDate ? toIsoNoonUtc(birthDate) : null,
      biologicalSexForCalc: sex,
      activityLevel,
    });
  }

  function handleSkip() {
    submit({});
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={typography.h2}>Seu perfil</Text>
        <Text style={[typography.bodySmall, styles.sub]}>
          Ajuda a calcular sua meta calórica — você pode pular
        </Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <NumberField label="Altura" value={heightCm} onChangeText={setHeightCm} unit="cm" placeholder="178" />
            </View>
            <View style={styles.rowField}>
              <DateField
                label="Nascimento"
                value={birthDate}
                onChange={setBirthDate}
                format="short"
                maximumDate={TODAY}
                minimumDate={MIN_BIRTH_DATE}
              />
            </View>
          </View>

          <Text style={[typography.label, styles.sectionLabel]}>Sexo biológico</Text>
          <SegmentedControl options={SEX_OPTIONS} value={sex} onChange={setSex} />
          <Text style={styles.note}>
            Usado só na fórmula de estimativa calórica — não é campo de identidade de gênero.
          </Text>

          <Text style={typography.label}>Nível de atividade</Text>
          <View style={styles.activityRow}>
            <ChipRow options={ACTIVITY_OPTIONS} value={activityLevel} onChange={setActivityLevel} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.bottom}>
          <Button label="Continuar" onPress={handleContinue} loading={loading} />
          <Button label="Pular por enquanto" variant="link" onPress={handleSkip} disabled={loading} />
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
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
  },
  sub: {
    marginBottom: 22,
  },
  scroll: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
  },
  note: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.5,
    marginTop: 8,
    marginBottom: 22,
  },
  activityRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 14,
  },
  bottom: {
    paddingTop: 14,
  },
});
