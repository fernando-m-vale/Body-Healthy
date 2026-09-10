import { colors } from "./tokens";

// Nomes de família exatamente como os pacotes @expo-google-fonts exportam —
// carregados em app/_layout.tsx via useFonts. Pesos conforme sistema-visual.md
// seção 4: Space Grotesk 500-700 (display), Inter 400-600 (corpo).
export const fontFamily = {
  displayMedium: "SpaceGrotesk_500Medium",
  displaySemiBold: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
} as const;

export const typography = {
  h1: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 34,
    lineHeight: 34 * 1.12,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  h2: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    color: colors.ink,
  },
  wordmark: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 15 * 1.55,
    color: colors.muted,
  },
  bodySmall: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.muted,
  },
  // Corpo de texto explicativo maior — usado em blocos como o de
  // Consentimento (.s6-body no mockup: 14px/1.65). Não confundir com
  // `body` (15px, hero) nem `bodySmall` (13px, densidade de lista/legenda)
  // — cada um espelha um tamanho real e distinto do mockup, não uma escala
  // genérica.
  bodyRelaxed: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 14 * 1.65,
    color: colors.muted,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  buttonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.base,
  },
  link: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },
} as const;
