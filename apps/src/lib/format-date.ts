const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "15 jan 2026" — usado na Linha do tempo de prescrições e em qualquer
// lista de data curta sem o peso de um DateField.
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "31 ago" — sem ano, usado em eyebrows/contexto onde o ano é óbvio (ex.:
// "Ciclo iniciado em 31 ago", Spec 05).
export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
