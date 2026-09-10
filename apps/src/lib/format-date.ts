const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "15 jan 2026" — usado na Linha do tempo de prescrições e em qualquer
// lista de data curta sem o peso de um DateField.
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
