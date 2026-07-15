import { useState, useEffect } from "react";
import { fbSet, fbGetOne } from "../firebase";
import { initGoogleCalendar, requestGoogleToken, revokeGoogleToken, listarCalendarios, setGcalColorId } from "../googleCalendar";
import { IconCheck, IconX, IconRefresh, IconLink } from "../icons";
import { TERMO_TEXTO } from "./CadastroPublico";

export default function ConfigGeral({ onGcalChange }) {
  const [config, setConfig] = useState(null);
  const [gcalClientId, setGcalClientId] = useState("");
  const [gcalColorId, setGcalColorIdState] = useState("10");
  const [gcalId, setGcalId] = useState("primary");
  const [calendarios, setCalendarios] = useState([]);
  const [gcalConectado, setGcalConectado] = useState(false);
  const [gcalIniciando, setGcalIniciando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [termoTexto, setTermoTexto] = useState("");
  const [salvoTermo, setSalvoTermo] = useState(false);

  useEffect(() => {
    fbGetOne("bandas_config", "geral").then(c => {
      if (!c) return;
      setConfig(c);
      setGcalClientId(c.gcalClientId ?? "");
      setGcalId(c.gcalId ?? "primary");
      const colorId = c.gcalColorId ?? "10";
      setGcalColorIdState(colorId);
      setGcalColorId(colorId);
    });
    fbGetOne("bandas_config", "termos").then(t => {
      setTermoTexto(t?.texto ?? TERMO_TEXTO);
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
    const dados = { gcalClientId, gcalId, gcalColorId };
    setGcalColorId(gcalColorId);
    await fbSet("bandas_config", "geral", dados);
    setConfig(dados);
    setSalvo(true);
    onGcalChange?.({ conectado: gcalConectado, gcalId });
    setTimeout(() => setSalvo(false), 2000);
  }

  async function salvarTermo() {
    await fbSet("bandas_config", "termos", { texto: termoTexto });
    setSalvoTermo(true);
    setTimeout(() => setSalvoTermo(false), 2000);
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
          <summary style={{ color: "var(--text2)", fontSize: 12, cursor: "pointer", userSelect: "none" }}>
            📋 Passo a passo: Como conectar ao Google Calendar
          </summary>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>

            {[
              {
                n: 1, title: "Acesse o Google Cloud Console",
                body: <>Abra <strong>console.cloud.google.com</strong> e faça login com a conta Google que será usada para os eventos do bar.</>
              },
              {
                n: 2, title: "Crie um projeto",
                body: <>No topo da página, clique em <strong>"Selecionar projeto" → "Novo projeto"</strong>. Dê o nome <em>"Pé Sujo Bandas"</em> e clique em <strong>Criar</strong>. Aguarde alguns segundos e selecione o projeto recém-criado.</>
              },
              {
                n: 3, title: "Ative a Google Calendar API",
                body: <>No menu lateral, vá em <strong>APIs e serviços → Biblioteca</strong>. Pesquise por <em>"Google Calendar API"</em>, clique nela e depois em <strong>Ativar</strong>.</>
              },
              {
                n: 4, title: "Configure a tela de consentimento OAuth",
                body: <>Vá em <strong>APIs e serviços → Tela de consentimento OAuth</strong>. Escolha <strong>Externo</strong> e clique em Criar. Preencha apenas o <em>Nome do app</em> (ex: Pé Sujo Bandas) e o <em>E-mail de suporte</em>. Clique em <strong>Salvar e continuar</strong> nas próximas telas sem alterar nada.</>
              },
              {
                n: 5, title: "Crie as credenciais OAuth",
                body: <>Vá em <strong>APIs e serviços → Credenciais</strong>. Clique em <strong>"Criar credenciais" → "ID do cliente OAuth"</strong>. Em <em>Tipo de aplicativo</em>, selecione <strong>Aplicativo da Web</strong>. Dê um nome (ex: "Pé Sujo Web").</>
              },
              {
                n: 6, title: "Adicione a URL autorizada",
                body: <>Em <strong>Origens JavaScript autorizadas</strong>, clique em <em>"Adicionar URI"</em> e cole a URL do seu site no Vercel (ex: <code style={{ background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>https://pesujo-bandas.vercel.app</code>). Se tiver domínio próprio, adicione também. Clique em <strong>Criar</strong>.</>
              },
              {
                n: 7, title: "Copie o Client ID",
                body: <>Uma janela exibirá o <strong>Client ID</strong> — um código terminado em <em>.apps.googleusercontent.com</em>. Copie-o e cole no campo acima.</>
              },
              {
                n: 8, title: "Adicione seu e-mail como usuário de teste",
                body: <>Volte em <strong>Tela de consentimento OAuth → Usuários de teste</strong> e adicione o e-mail da conta Google que vai autorizar o calendário. Isso é necessário enquanto o app estiver em modo de teste.</>
              },
              {
                n: 9, title: "Salve e conecte aqui mesmo nesta tela",
                body: <>
                  Role esta página para cima até o campo <strong>"OAuth Client ID (Google Cloud)"</strong>.<br />
                  Cole o código copiado no passo anterior (termina em <em>.apps.googleusercontent.com</em>).<br />
                  Clique em <strong>"Salvar configurações"</strong> e logo em seguida em <strong>"Conectar Google Calendar"</strong>.<br />
                  Uma janela pop-up do Google abrirá pedindo autorização — clique na sua conta e permita o acesso.<br />
                  Após autorizar, o botão sumirá e aparecerá <em>"Google Calendar conectado"</em> em verde. Pronto!
                </>
              },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                  background: "var(--primary)33", color: "var(--primary-light)",
                  fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{n}</span>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65 }}>
                  <strong style={{ color: "var(--text)", display: "block", marginBottom: 2 }}>{title}</strong>
                  {body}
                </div>
              </div>
            ))}

            <div style={{ background: "var(--warning)15", border: "1px solid var(--warning)44", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "var(--text2)", lineHeight: 1.6, marginTop: 4 }}>
              ⚠️ <strong>Importante:</strong> a janela de autorização do Google pode exibir um aviso de "app não verificado". Clique em <em>"Avançado" → "Acessar Pé Sujo Bandas (não seguro)"</em> para prosseguir — isso é normal para apps internos ainda não publicados na Google.
            </div>

          </div>
        </details>
      </section>

      {/* Termo de Convivência */}
      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 4 }}>📋 Termo de Convivência</h3>
        <p style={{ color: "var(--text2)", fontSize: 12, marginBottom: 12 }}>
          Texto exibido no formulário de cadastro de artistas. O artista deve aceitar antes de enviar.
        </p>
        <textarea
          value={termoTexto}
          onChange={e => setTermoTexto(e.target.value)}
          rows={16}
          style={{ ...inputStyle, resize: "vertical", fontSize: 12, lineHeight: 1.7, fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={salvarTermo} style={btnPrimary}>
            {salvoTermo ? <><IconCheck size={13} /> Salvo!</> : "Salvar termo"}
          </button>
        </div>
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
