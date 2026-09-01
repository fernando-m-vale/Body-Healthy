import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme/tokens";

// Réplica exata do SVG decorativo da tela "Onboarding" em mockups.html
// (linha de pulso com um ponto de destaque em Pulse).
export function PulseIllustration() {
  return (
    <Svg width={220} height={60} viewBox="0 0 220 60" fill="none">
      <Path
        d="M0 30 L50 30 L62 8 L76 52 L90 20 L100 30 L220 30"
        stroke={colors.vital}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={76} cy={52} r={4} fill={colors.pulse} />
    </Svg>
  );
}
