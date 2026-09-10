import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../src/components/BackButton";
import { listEntries, type PrescriptionCategory, type PrescriptionEntry } from "../src/api/prescriptions";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { formatShortDate } from "../src/lib/format-date";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

function datesLabel(entry: PrescriptionEntry): string {
  if (!entry.endDate) {
    return `Em uso contínuo desde ${formatShortDate(entry.startDate)}`;
  }
  return `${formatShortDate(entry.startDate)} — ${formatShortDate(entry.endDate)}`;
}

const CATEGORY_LABEL: Record<PrescriptionCategory, string> = {
  medicacao: "Medicação",
  hormonio: "Hormônio",
  suplemento: "Suplemento",
};

// Categoria "suplemento" usa a cor padrão (Vital); "medicacao" e "hormonio"
// usam a variação de atenção (Pulse) — decisão registrada no planejamento
// desta tarefa (mockup só mostrava exemplo de medicação, hormônio não
// aparecia em nenhum exemplo).
function isAttentionCategory(category: PrescriptionCategory): boolean {
  return category === "medicacao" || category === "hormonio";
}

// Tela — Linha do tempo de prescrições (mockups.html, label "Linha do tempo
// de prescrições"). Spec 04, seção 6 passo 3: cada leitura gera log de
// auditoria no backend, transparente ao app.
export default function PrescriptionsScreen() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<PrescriptionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listEntries(token)
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar."));
  }, [token]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackButton />
        <View style={styles.topRow}>
          <Text style={typography.h2}>Prescrições</Text>
          <Pressable
            style={styles.fab}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            onPress={() => router.push("/prescriptions-new")}
          >
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {entries && entries.length === 0 ? (
          <Text style={styles.empty}>
            Nenhuma prescrição registrada ainda. Toque em "+" pra adicionar a primeira.
          </Text>
        ) : null}

        {entries?.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.name}>{entry.name}</Text>
              <View style={[styles.badge, isAttentionCategory(entry.category) && styles.badgeAttention]}>
                <Text style={[styles.badgeText, isAttentionCategory(entry.category) && styles.badgeTextAttention]}>
                  {CATEGORY_LABEL[entry.category]}
                </Text>
              </View>
            </View>
            <Text style={styles.dates}>{datesLabel(entry)}</Text>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.disclaimer}>Contexto histórico apenas — nunca usamos isso pra sugerir ajuste de dose.</Text>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fab: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.vital,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 18,
    color: colors.base,
    marginTop: -1,
  },
  list: {
    flex: 1,
    paddingHorizontal: 22,
  },
  empty: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 40,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  name: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  badge: {
    backgroundColor: colors.vitalTint,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  badgeAttention: {
    backgroundColor: colors.pulseTint,
  },
  badgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.vitalDark,
  },
  badgeTextAttention: {
    color: colors.pulseDark,
  },
  dates: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
  },
  disclaimer: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.5,
    textAlign: "center",
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 14,
    textAlign: "center",
  },
});
