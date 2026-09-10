import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii } from "../theme/tokens";

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

// Padrão .toggle do sistema-visual.md — pílula 42×24, bolinha 18×18,
// estado ativo = fundo Vital. Ver seção 5 (tabela de componentes). Switch é
// categoria à parte da regra geral de 44×44 (decisão registrada durante a
// tarefa de revisão v4 — nenhum switch nativo ganha wrapper de toque maior
// que o próprio controle); hitSlop generoso em vez de redimensionar.
export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.track, value && styles.trackActive]}
    >
      <View style={[styles.knob, value && styles.knobActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 42,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    justifyContent: "center",
  },
  trackActive: {
    backgroundColor: colors.vital,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.base,
    marginLeft: 3,
  },
  knobActive: {
    marginLeft: 21,
  },
});
