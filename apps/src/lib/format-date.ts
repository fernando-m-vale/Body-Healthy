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

// Serializa uma data local como meio-dia UTC — evita que o fuso horário
// jogue a data pro dia anterior/seguinte ao converter pra ISO (usado em
// qualquer campo "dia" enviado ao backend: medição de bioimpedância,
// weekStartDate do check-in).
export function toIsoNoonUtc(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

// Segunda-feira da semana corrente, à meia-noite local, em ISO — usado como
// weekStartDate do check-in semanal (Spec 06, modelo WeeklyCheckIn). Domingo
// (getDay()===0) conta como 6 dias depois da última segunda.
export function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday;
}
