export const GENEROS = {
  voz_violao: { label: "Voz e Violão", cor: "#06b6d4" },
  pop_rock:   { label: "Pop Rock",     cor: "#8b5cf6" },
  sertanejo:  { label: "Sertanejo",    cor: "#f59e0b" },
  forro:      { label: "Forró",        cor: "#f97316" },
  axe:        { label: "Axé",          cor: "#ec4899" },
  samba:      { label: "Samba",        cor: "#10b981" },
  pagode:     { label: "Pagode",       cor: "#84cc16" },
  mpb:        { label: "MPB",          cor: "#3b82f6" },
  outro:      { label: "Outro",        cor: "#6b7280" },
};

// Regras por dia da semana (0=Dom, 1=Seg, ... 6=Sáb)
export const REGRAS_DIA = {
  0: {
    nome: "Domingo",
    slots: ["13:00"],
    generos: ["voz_violao"],
    minIntegrantes: 1,
    maxIntegrantes: 1,
    descricao: "Voz e Violão",
  },
  1: {
    nome: "Segunda",
    slots: ["19:30"],
    generos: ["voz_violao", "pop_rock", "sertanejo", "forro", "axe", "samba", "pagode", "mpb", "outro"],
    minIntegrantes: null,
    maxIntegrantes: null,
    descricao: "Segunda-feira",
  },
  2: {
    nome: "Terça",
    slots: ["19:30"],
    generos: ["voz_violao"],
    minIntegrantes: 1,
    maxIntegrantes: 1,
    descricao: "Voz e Violão",
  },
  3: {
    nome: "Quarta",
    slots: ["19:30"],
    generos: ["pop_rock"],
    minIntegrantes: null,
    maxIntegrantes: null,
    descricao: "Pop Rock",
  },
  4: {
    nome: "Quinta",
    slots: ["19:30"],
    generos: ["sertanejo", "forro"],
    minIntegrantes: 1,
    maxIntegrantes: 3,
    descricao: "Sertanejo / Forró (até 3 integrantes)",
  },
  5: {
    nome: "Sexta",
    slots: ["16:30", "20:00"],
    generos: ["axe", "sertanejo", "forro", "samba", "pagode"],
    minIntegrantes: 2,
    maxIntegrantes: 4,
    descricao: "Axé / Sertanejo / Forró / Samba (2–4 integrantes)",
  },
  6: {
    nome: "Sábado",
    slots: ["16:30", "20:00"],
    generos: ["axe", "sertanejo", "forro", "samba", "pagode"],
    minIntegrantes: 2,
    maxIntegrantes: 4,
    descricao: "Axé / Sertanejo / Forró / Samba (2–4 integrantes)",
  },
};

// Retorna as formações do artista, com compatibilidade com dados antigos (campo integrantes)
export function getFormacoes(artista) {
  if (artista.formacoes?.length) return artista.formacoes;
  return [{ integrantes: artista.integrantes ?? 1, nome: "" }];
}

export function artistaElegivelParaDia(artista, diaSemana) {
  const regra = REGRAS_DIA[diaSemana];
  if (!regra || regra.fechado) return false;

  const generosOk = artista.generos?.some(g => regra.generos?.includes(g));
  if (!generosOk) return false;

  // Elegível se QUALQUER formação se encaixa na regra do dia
  const formacoes = getFormacoes(artista);
  return formacoes.some(f => {
    const n = f.integrantes ?? 1;
    if (regra.minIntegrantes !== null && n < regra.minIntegrantes) return false;
    if (regra.maxIntegrantes !== null && n > regra.maxIntegrantes) return false;
    return true;
  });
}

export function artistasElegiveisParaSlot(artistas, data) {
  const d = new Date(data + "T12:00:00");
  const diaSemana = d.getDay();
  return artistas.filter(a => artistaElegivelParaDia(a, diaSemana));
}

export function NOME_DIA(diaSemana) {
  return REGRAS_DIA[diaSemana]?.nome ?? "";
}

export const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];
