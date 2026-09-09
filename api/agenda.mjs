// Agenda musical em texto, para o bot do Instagram (Manychat) responder
// "tem música hoje?" — a pergunta mais frequente no direct do bar.
//
// Lê só as coleções espelho públicas (bandas_shows_publico e
// bandas_artistas_publico), então não precisa de service account: o cachê e o
// contato dos artistas vivem nas coleções restritas e nunca passam por aqui.
// Ver auditoria de segurança de 09/09/2026.

const PROJETO = "barpesujo-equipe";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

const GENEROS = {
  pop_rock: "Pop Rock",
  sertanejo: "Sertanejo",
  forro: "Forró",
  axe: "Axé",
  samba: "Samba",
  pagode: "Pagode",
  mpb: "MPB",
  outro: "",           // "Outro" não diz nada ao cliente: melhor omitir
};

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Firestore REST embrulha cada campo em { stringValue: ... }; desembrulha.
function valor(campo) {
  if (!campo) return undefined;
  const [tipo, v] = Object.entries(campo)[0];
  if (tipo === "integerValue") return Number(v);
  if (tipo === "booleanValue") return v;
  return v;
}

async function lerColecao(nome) {
  const docs = [];
  let pageToken = "";
  do {
    const url = `${BASE}/${nome}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Firestore ${nome} respondeu ${resp.status}`);
    const json = await resp.json();
    for (const d of json.documents || []) {
      const campos = Object.fromEntries(
        Object.entries(d.fields || {}).map(([k, v]) => [k, valor(v)])
      );
      docs.push({ id: d.name.split("/").pop(), ...campos });
    }
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return docs;
}

// O bar é em Aracaju e a Vercel roda em UTC: sem isso, depois das 21h a
// função acha que já é amanhã e responde a agenda errada.
function hojeEmAracaju() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function somarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

function diaDaSemana(iso) {
  return DIAS[new Date(`${iso}T12:00:00`).getDay()];
}

function formatarDiaMes(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function descreverShow(s) {
  const genero = GENEROS[s.generoId] || "";
  return genero ? `${s.nome} (${genero}) às ${s.horario}` : `${s.nome} às ${s.horario}`;
}

// "Hoje" / "Amanhã" só valem para hoje e amanhã: para qualquer outra data
// pedida, o cliente precisa ver de que dia estamos falando.
function rotular(data, hoje) {
  if (data === hoje) return { sujeito: "Hoje", frase: "Hoje" };
  if (data === somarDias(hoje, 1)) return { sujeito: "Amanhã", frase: "Amanhã" };
  const nome = diaDaSemana(data);
  const rotulo = `${nome.charAt(0).toUpperCase()}${nome.slice(1)} (${formatarDiaMes(data)})`;
  return { sujeito: rotulo, frase: `Dia ${formatarDiaMes(data)}` };
}

function montarTexto(data, hoje, doDia, proximos) {
  const { sujeito, frase } = rotular(data, hoje);
  if (doDia.length) {
    return [
      `🎶 ${sujeito} tem música ao vivo!`,
      "",
      ...doDia.map(descreverShow),
      "",
      "Te esperamos! 🍻",
    ].join("\n");
  }

  const proximo = proximos[0];
  if (!proximo) {
    return "Ainda não fechamos a próxima programação musical 😕\n\nFica de olho no nosso perfil que a gente anuncia por aqui!";
  }

  const mesmoDia = proximos.filter(s => s.data === proximo.data);
  return [
    `${frase} não tem música ao vivo por aqui 😕`,
    "",
    `Mas o próximo show é ${diaDaSemana(proximo.data)} (${formatarDiaMes(proximo.data)}):`,
    ...mesmoDia.map(descreverShow),
    "",
    "Te esperamos! 🍻",
  ].join("\n");
}

function montarTextoSemana(shows, de) {
  const ate = somarDias(de, 6);
  const janela = shows.filter(s => s.data >= de && s.data <= ate);
  if (!janela.length) {
    return "Ainda não fechamos a programação dos próximos dias 😕\n\nFica de olho no nosso perfil!";
  }
  const linhas = [];
  let ultimaData = "";
  for (const s of janela) {
    if (s.data !== ultimaData) {
      linhas.push(`${diaDaSemana(s.data)} (${formatarDiaMes(s.data)})`);
      ultimaData = s.data;
    }
    linhas.push(`   ${descreverShow(s)}`);
  }
  return ["🎶 Nossa programação dos próximos dias:", "", ...linhas, "", "Te esperamos! 🍻"].join("\n");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  try {
    const [shows, artistas] = await Promise.all([
      lerColecao("bandas_shows_publico"),
      lerColecao("bandas_artistas_publico"),
    ]);

    const nomePorId = new Map(artistas.map(a => [a.id, a.nome]));
    const hoje = hojeEmAracaju();

    // Show cancelado não existe para o cliente. Sem nome de artista também
    // não: preferimos omitir a responder "undefined às 19:30".
    const validos = shows
      .filter(s => s.status !== "cancelado" && s.data && s.horario)
      .map(s => ({ ...s, nome: nomePorId.get(s.artistaId) }))
      .filter(s => s.nome)
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));

    const quando = String(req.query.quando || "hoje").toLowerCase();
    const dataPedida =
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.data || "") ? req.query.data
      : quando === "amanha" || quando === "amanhã" ? somarDias(hoje, 1)
      : hoje;

    let texto;
    if (quando === "semana") {
      texto = montarTextoSemana(validos, hoje);
    } else {
      const doDia = validos.filter(s => s.data === dataPedida);
      const proximos = validos.filter(s => s.data > dataPedida);
      texto = montarTexto(dataPedida, hoje, doDia, proximos);
    }

    const doDia = validos.filter(s => s.data === dataPedida);
    return res.status(200).json({
      ok: true,
      data: dataPedida,
      tem_show: doDia.length > 0,
      texto,
      shows: doDia.map(s => ({
        nome: s.nome,
        genero: GENEROS[s.generoId] || null,
        horario: s.horario,
      })),
    });
  } catch (erro) {
    // O bot não pode ficar mudo: devolve 200 com um texto que faz sentido
    // para o cliente, e o erro fica no log da Vercel.
    console.error("[api/agenda]", erro);
    return res.status(200).json({
      ok: false,
      texto: "Não consegui puxar a programação agora 😕\n\nChama a gente aqui no direct que respondemos na hora!",
      shows: [],
    });
  }
}
