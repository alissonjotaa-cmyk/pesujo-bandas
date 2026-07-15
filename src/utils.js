export function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatarMoeda(v) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

export function primeiroDiaSemana(ano, mes) {
  return new Date(ano, mes, 1).getDay();
}
