const SCOPES = "https://www.googleapis.com/auth/calendar.events";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

let gapiReady = false;
let tokenClient = null;
let accessToken = null;
let gcalColorId = "10"; // Basil (verde escuro) — padrão

export function setGcalColorId(id) { gcalColorId = id; }

export function getAccessToken() { return accessToken; }

export async function initGoogleCalendar(clientId, onTokenChange) {
  if (!clientId) return;

  await new Promise((resolve) => {
    const checkGapi = setInterval(() => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        clearInterval(checkGapi);
        resolve();
      }
    }, 200);
  });

  await new Promise((resolve) => window.gapi.load("client", resolve));
  await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
  gapiReady = true;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) { accessToken = null; onTokenChange(null); return; }
      accessToken = resp.access_token;
      window.gapi.client.setToken({ access_token: accessToken });
      onTokenChange(accessToken);
    },
  });
}

export function requestGoogleToken() {
  if (!tokenClient) return;
  tokenClient.requestAccessToken({ prompt: "" });
}

export function revokeGoogleToken(onDone) {
  if (!accessToken) { onDone?.(); return; }
  window.google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = null;
    window.gapi.client.setToken(null);
    onDone?.();
  });
}

function addHoras(data, horario, horas) {
  const [h, m] = horario.split(":").map(Number);
  let totalMin = h * 60 + m + horas * 60;
  const diasExtra = Math.floor(totalMin / (24 * 60));
  totalMin = totalMin % (24 * 60);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  if (diasExtra === 0) return { data, horario: `${hh}:${mm}` };
  const d = new Date(data + "T12:00:00");
  d.setDate(d.getDate() + diasExtra);
  return { data: d.toISOString().slice(0, 10), horario: `${hh}:${mm}` };
}

function buildEventBody(show, artista, colorId) {
  const fim = addHoras(show.data, show.horario, 3);
  // Monta string ISO diretamente com offset -03:00 para evitar conversão errada de timezone
  const startDT = `${show.data}T${show.horario}:00-03:00`;
  const endDT   = `${fim.data}T${fim.horario}:00-03:00`;

  return {
    summary: `🎵 ${artista.nome}`,
    description: [
      `Artista: ${artista.nome}`,
      `Gênero: ${artista.generosLabel ?? ""}`,
      `Formação: ${artista.integrantes ?? 1} integrante(s)`,
      `Cachê: R$ ${Number(show.cache ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      show.observacoes ? `Obs: ${show.observacoes}` : "",
      `Contato: ${artista.contato ?? ""}`,
    ].filter(Boolean).join("\n"),
    location: "Bar Pé Sujo",
    start: { dateTime: startDT, timeZone: "America/Sao_Paulo" },
    end:   { dateTime: endDT,   timeZone: "America/Sao_Paulo" },
    colorId: colorId ?? gcalColorId,
  };
}

export async function criarEventoCalendar(show, artista, calendarId = "primary", colorId) {
  if (!gapiReady || !accessToken) throw new Error("Google Calendar não autenticado");
  const body = buildEventBody(show, artista, colorId);
  const resp = await window.gapi.client.calendar.events.insert({
    calendarId,
    resource: body,
  });
  return resp.result.id;
}

export async function atualizarEventoCalendar(eventId, show, artista, calendarId = "primary", colorId) {
  if (!gapiReady || !accessToken) throw new Error("Google Calendar não autenticado");
  const body = buildEventBody(show, artista, colorId);
  const resp = await window.gapi.client.calendar.events.update({
    calendarId,
    eventId,
    resource: body,
  });
  return resp.result.id;
}

export async function deletarEventoCalendar(eventId, calendarId = "primary") {
  if (!gapiReady || !accessToken) return;
  await window.gapi.client.calendar.events.delete({ calendarId, eventId });
}

export async function listarCalendarios() {
  if (!gapiReady || !accessToken) return [];
  const resp = await window.gapi.client.calendar.calendarList.list();
  return resp.result.items ?? [];
}
