import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

export interface ActionSheetOption {
  key: string;
  icon: string;
  title: string;
  subtitle?: string;
  variant?: "default" | "warn";
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

// Padrão .sheet do sistema-visual.md — decisão contextual de poucas
// opções (2-3), nunca formulário. Reaproveitado pra escolher a origem do
// arquivo na dropzone de upload (câmera vs. documento).
export function ActionSheet({ visible, title, options, onClose }: ActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.key}
              style={styles.option}
              onPress={() => {
                onClose();
                option.onPress();
              }}
            >
              <View style={[styles.iconCircle, option.variant === "warn" && styles.iconCircleWarn]}>
                <Text style={[styles.iconText, option.variant === "warn" && styles.iconTextWarn]}>{option.icon}</Text>
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                {option.subtitle ? <Text style={styles.optionSubtitle}>{option.subtitle}</Text> : null}
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 31, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleWarn: {
    backgroundColor: colors.pulseTint,
  },
  iconText: {
    fontSize: 16,
    color: colors.ink,
  },
  iconTextWarn: {
    color: colors.pulseDark,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  optionSubtitle: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
});
