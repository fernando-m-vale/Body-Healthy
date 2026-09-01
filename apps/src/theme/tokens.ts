// Transcrito 1:1 de docs/04-design/sistema-visual.md (seção 3 — Cor).
// Fonte da verdade é o documento; qualquer mudança de cor/token começa lá,
// nunca direto no código.
export const colors = {
  ink: "#12181F",
  base: "#FFFFFF",
  vital: "#0EA97A",
  vitalDark: "#085041",
  pulse: "#FF5D3A",
  pulseDark: "#8A2E17",
  mist: "#F1F5F3",
  line: "#DDE3E0",
  muted: "#6B7570",
  // Tons usados nos badges de categoria (seção 5 do guia)
  vitalTint: "#E4F5EE",
  pulseTint: "#FFEAE3",
} as const;

export const radii = {
  pill: 100,
  card: 20,
  cardSmall: 14,
  field: 12,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;
