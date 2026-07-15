import { useState, useEffect } from "react";
import { fbSet, fbGetOne } from "../firebase";
import { initGoogleCalendar, requestGoogleToken, revokeGoogleToken, listarCalendarios } from "../googleCalendar";
import { IconCheck, IconX, IconRefresh, IconLink } from "../icons";

export default function ConfigGeral({ onGcalChange }) {
  const [config, setConfig] = useState(null);
  const [gcalClientId, setGcalClientId] = useState("");
  const [gcalId, setGcalId] = useState("primary");
  const [calendarios, setCalendarios] = useState([]);
  const [gcalConectado, setGcalConectado] = useState(false);
  const [gcalIniciando, setGcalIniciando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    fbGetOne("bandas_config", "geral").then(c => {
      if (!c) return;
      setConfig(c);
      setGcalClientId(c.gcalClientId ?? "");
      setGcalId(c.gcalId ?? "primary");
    });
  }, []);

  async function iniciarGcal() {
    if (!gcalClientId.trim()) return;
    setGcalIniciando(true);
    try {
      await initGoogleCalendar(gcalClientId, async (token) => {
        const conectado = !!token;
        setGcalConectado(conectado);
        onGcalChange?.({ conectado, gcalId });
        if (conectado) {
          const cals = await listarCalendarios();
          setCalendarios(cals);
        }
      });
      requestGoogleToken();
    } catch (e) {
      alert("Erro ao iniciar Google Calendar: " + e.message);
    } finally {
      setGcalIniciando(false);
    }
  }

  async function salvar() {
    const dados = { gcalClientId, gcalId };
    await fbSet("bandas_config", "geral", dados);
    setConfig(dados);
    setSalvo(true);
    onGcalChange?.({ conectado: gcalConectado, gcalId });
    setTimeout(() => setSalvo(false), 2000);
  }

  function desconectar() {
    revokeGoogleToken(() => {
      setGcalConectado(false);
      setCalendarios([]);
      onGcalChange?.({ conectado: false, gcalId });
    });
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>⚙️ Configurações</h2>

      {/* Google Calendar */}
      <section style={card}>
        <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Google Calendar</h3>
        <p style={{ color: "var(--text2)", fontSize: 12, marginBottom: 16 }}>
          Conecte ao Google Calendar para criar eventos automaticamente ao agendar shows.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="OAuth Client ID (Google Cloud)">
            <input
              value={gcalClientId} onChange={e => setGcalClientId(e.target.value)}
              style={inputStyle} placeholder="xxxxxxxxxx.apps.googleusercontent.com"
            />
          </Field>

          {gcalConectado && calendarios.length > 0 && (
            <Field label="Calendário de destino">
              <select value={gcalId} onChange={e => { setGcalId(e.target.value); onGcalChange?.({ conectado: true, gcalId: e.target.value }); }} style={inputStyle}>
                {calendarios.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}
              </select>
            </Field>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!gcalConectado ? (
              <button onClick={iniciarGcal} disabled={gcalIniciando || !gcalClientId.trim()} style={btnPrimary}>
                <IconLink size={14} /> {gcalIniciando ? "Conectando…" : "Conectar Google Calendar"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
                  <IconCheck size={14} /> Google Calendar conectado
                </span>
                <button onClick={desconectar} style={btnDanger}><IconX size={13} /> Desconectar</button>
              </div>
            )}
            <button onClick={salvar} style={btnSecondary}>
              {salvo ? <><IconCheck size={13} /> Salvo!</> : "Salvar configurações"}
            </button>
          </div>
        </div>

        {/* Instruções */}
        <details style={{ marginTop: 20 }}>
          <summary style={{ color: "var(--text2)", fontSize: 12, cursor: "pointer" }}>Como obter o Client ID?</summary>
          <ol style={{ color: "var(--text3)", fontSize: 12, marginTop: 8, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Acesse <strong>console.cloud.google.com</strong></li>
            <li>Crie um projeto (ex: "Pé Sujo Bandas")</li>
            <li>Ative a <strong>Google Calendar API</strong></li>
            <li>Em "Credenciais", crie um <strong>ID do cliente OAuth 2.0</strong> → tipo: <em>Aplicativo da Web</em></li>
            <li>Adicione a URL do Vercel em <strong>Origens JavaScript autorizadas</strong></li>
            <li>Cole o Client ID acima e clique em Salvar + Conectar</li>
          </ol>
        </details>
      </section>

      {/* Sobre */}
      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Sobre o sistema</h3>
        <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.7 }}>
          <strong>Pé Sujo — Bandas v1.0</strong><br />
          Gestão de contratações musicais integrada ao Firebase e Google Calendar.<br />
          Dados armazenados em <code style={{ background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>barpesujo-equipe</code> (Firestore).
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", color: "var(--text2)", fontSize: 12, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };
const inputStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", width: "100%", outline: "none" };
const btnPrimary = { background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const btnSecondary = { background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const btnDanger = { background: "var(--danger)22", color: "var(--danger)", border: "1px solid var(--danger)44", borderRadius: 8, padding: "7px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 };
