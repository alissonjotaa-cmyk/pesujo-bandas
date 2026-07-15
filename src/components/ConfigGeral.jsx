import { useState, useEffect } from "react";
import { fbSet, fbGetOne } from "../firebase";
import { IconCheck } from "../icons";
import { TERMO_TEXTO } from "./CadastroPublico";

export default function ConfigGeral() {
  const [termoTexto, setTermoTexto] = useState("");
  const [salvoTermo, setSalvoTermo] = useState(false);

  useEffect(() => {
    fbGetOne("bandas_config", "termos").then(t => {
      setTermoTexto(t?.texto ?? TERMO_TEXTO);
    });
  }, []);

  async function salvarTermo() {
    await fbSet("bandas_config", "termos", { texto: termoTexto });
    setSalvoTermo(true);
    setTimeout(() => setSalvoTermo(false), 2000);
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>⚙️ Configurações</h2>

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
          Gestão de contratações musicais integrada ao Firebase.<br />
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
