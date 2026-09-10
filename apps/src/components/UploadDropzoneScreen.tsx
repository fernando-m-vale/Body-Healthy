import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./Button";
import { BackButton } from "./BackButton";
import { ActionSheet } from "./ActionSheet";
import type { PickedDocument } from "../upload/pick-document";
import { colors, radii } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

interface UploadFlowLike {
  selectedFile: PickedDocument | null;
  sheetVisible: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  pickCamera: () => void;
  pickDocument: () => void;
  handleContinue: () => void;
  loading: boolean;
  error: string | null;
}

interface UploadDropzoneScreenProps {
  title: string;
  infoBoldText: string;
  infoText: string;
  formatsText: string;
  flow: UploadFlowLike;
}

// Tela de upload compartilhada — mockups.html classe .s11, reaproveitada
// tal qual pela tela de laudo de imagem (o próprio sistema-visual.md,
// seção 7, já registra "reaproveita tela 4, copy diferente"). Todo o
// estado (arquivo selecionado, sheet, loading, erro) vem de `flow`
// (useUploadFlow), configurado por domínio (exame vs. laudo) por quem
// monta a tela.
//
// Seta de voltar (RF04a — nenhum dado de ingestão é obrigatório, o que
// inclui a decisão de não fazer o upload agora): rota só é alcançada via
// router.push() a partir de app/home.tsx, então sempre há histórico pra
// router.back() voltar. Correção aplicada ao mockups.html também.
export function UploadDropzoneScreen({ title, infoBoldText, infoText, formatsText, flow }: UploadDropzoneScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <BackButton />
          <Text style={typography.h2}>{title}</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTextStyle}>
              <Text style={styles.infoBold}>{infoBoldText}</Text>
              {infoText}
            </Text>
          </View>

          <Pressable style={styles.dropzone} onPress={flow.openSheet}>
            <View style={styles.dropzoneIcon}>
              <Text style={styles.dropzoneIconText}>↑</Text>
            </View>
            {flow.selectedFile ? (
              <>
                <Text style={styles.dropzoneTitle}>{flow.selectedFile.name}</Text>
                <Text style={styles.dropzoneSub}>Toque pra trocar o arquivo</Text>
              </>
            ) : (
              <>
                <Text style={styles.dropzoneTitle}>Tirar foto ou escolher arquivo</Text>
                <Text style={styles.dropzoneSub}>PDF ou imagem, até 20MB</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.formats}>{formatsText}</Text>

          {flow.error ? <Text style={styles.error}>{flow.error}</Text> : null}
        </View>

        <Button label="Continuar" onPress={flow.handleContinue} loading={flow.loading} disabled={!flow.selectedFile} />
      </View>

      <ActionSheet
        visible={flow.sheetVisible}
        title="Como você quer enviar?"
        onClose={flow.closeSheet}
        options={[
          {
            key: "camera",
            icon: "◎",
            title: "Tirar foto",
            subtitle: "Usa a câmera do celular",
            onPress: flow.pickCamera,
          },
          {
            key: "document",
            icon: "↑",
            title: "Escolher arquivo",
            subtitle: "PDF ou imagem já salvos",
            onPress: flow.pickDocument,
          },
        ]}
      />
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
  infoBox: {
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  infoTextStyle: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 13 * 1.6,
    color: colors.muted,
  },
  infoBold: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.ink,
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 38,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  dropzoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dropzoneIconText: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 20,
    color: colors.vital,
  },
  dropzoneTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
    textAlign: "center",
  },
  dropzoneSub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  formats: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 14,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 16,
  },
});
