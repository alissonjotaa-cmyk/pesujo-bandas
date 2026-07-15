import { useState, useRef } from "react";
import { fbSet, fbUploadFoto } from "../firebase";
import { GENEROS, getFormacoes } from "../regras";
import { IconPlus, IconX, IconCheck } from "../icons";
import { nanoid } from "../utils";

const MAX_FORMACOES = 3;
const NUMS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CadastroPublico() {
  const [form, setForm] = useState({
    nome: "", contato: "", instagram: "", pix: "", observacoes: "",
    generos: [],
    formacoes: [{ nome: "", integrantes: 1, cache: "" }],
  });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef();

  function toggleGenero(g) {
    setForm(f => ({
      ...f,
      generos: f.generos.includes(g) ? f.generos.filter(x => x !== g) : [...f.generos, g],
    }));
  }

  function setFormacao(idx, key, val) {
    setForm(f => {
      const fs = [...f.formacoes];
      fs[idx] = { ...fs[idx], [key]: val };
      return { ...f, formacoes: fs };
    });
  }

  function addFormacao() {
    if (form.formacoes.length >= MAX_FORMACOES) return;
    setForm(f => ({ ...f, formacoes: [...f.formacoes, { nome: "", integrantes: 1, cache: "" }] }));
  }

  function removeFormacao(idx) {
    setForm(f => ({ ...f, formacoes: f.formacoes.filter((_, i) => i !== idx) }));
  }

  function onFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErro("Imagem muito grande. Máximo 5 MB."); return; }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setErro("");
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    if (form.generos.length === 0) { setErro("Selecione ao menos um gênero musical."); return; }
    setEnviando(true);
    setErro("");
    try {
      const id = nanoid();
      const formacoes = form.formacoes.map(f => ({
        ...f,
        cache: f.cache !== "" && f.cache != null ? Number(f.cache) : null,
      }));

      let fotoUrl = "";
      let fotoPath = "";
      if (fotoFile) {
        fotoPath = `bandas_artistas/${id}/cartaz`;
        fotoUrl = await fbUploadFoto(fotoPath, fotoFile);
      }

      await fbSet("bandas_artistas", id, {
        id,
        nome: form.nome.trim(),
        contato: form.contato.trim(),
        instagram: form.instagram.trim(),
        pix: form.pix.trim(),
        observacoes: form.observacoes.trim(),
        generos: form.generos,
        formacoes,
        fotoUrl,
        fotoPath,
        status: "pendente",
        cadastradoEm: new Date().toISOString(),
      });

      setEnviado(true);
    } catch (err) {
      setErro("Erro ao enviar. Tente novamente.");
      console.error(err);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎸</div>
            <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Cadastro enviado!</h2>
            <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6 }}>
              Recebemos suas informações. Entraremos em contato em breve para confirmar sua agenda no Bar Pé Sujo!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img src="/logo-pesujo.png" alt="Pé Sujo" style={{ height: 60, objectFit: "contain", marginBottom: 12 }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Cadastro de Artista</h1>
        <p style={{ color: "var(--text2)", fontSize: 13 }}>Bar Pé Sujo — Preencha o formulário para entrar na nossa grade musical</p>
      </div>

      <div style={cardStyle}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Field label="Nome artístico / Banda *">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required style={inputStyle} placeholder="Ex: Banda Forró do Povo" />
          </Field>

          <Field label="WhatsApp / Telefone *">
            <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))}
              required style={inputStyle} placeholder="(79) 99999-9999" />
          </Field>

          <Field label="Instagram">
            <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              style={inputStyle} placeholder="@nomeartista" />
          </Field>

          <Field label="Gêneros musicais *">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {Object.entries(GENEROS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => toggleGenero(k)}
                  style={{
                    border: `1px solid ${form.generos.includes(k) ? v.cor : "var(--border)"}`,
                    background: form.generos.includes(k) ? v.cor + "22" : "transparent",
                    color: form.generos.includes(k) ? v.cor : "var(--text2)",
                    borderRadius: 20, padding: "5px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600,
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Formações (${form.formacoes.length}/${MAX_FORMACOES})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {form.formacoes.map((f, idx) => (
                <div key={idx} style={{ background: "var(--bg2)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={f.nome}
                      onChange={e => setFormacao(idx, "nome", e.target.value)}
                      style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                      placeholder={`Nome (ex: Solo, Dupla, Banda Completa)`}
                    />
                    {form.formacoes.length > 1 && (
                      <button type="button" onClick={() => removeFormacao(idx)}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--danger)", flexShrink: 0 }}>
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>Número de integrantes</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {NUMS.map(n => (
                        <button key={n} type="button" onClick={() => setFormacao(idx, "integrantes", n)}
                          style={{
                            width: 38, height: 34, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14,
                            background: f.integrantes === n ? "var(--primary)" : "var(--bg3)",
                            border: `1px solid ${f.integrantes === n ? "var(--primary)" : "var(--border)"}`,
                            color: f.integrantes === n ? "#fff" : "var(--text2)",
                          }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 12 }}>R$</span>
                    <input
                      type="text" inputMode="decimal"
                      value={f.cache ?? ""}
                      onChange={e => setFormacao(idx, "cache", e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 32, fontSize: 13 }}
                      placeholder="Valor do cachê desta formação"
                    />
                  </div>
                </div>
              ))}
              {form.formacoes.length < MAX_FORMACOES && (
                <button type="button" onClick={addFormacao}
                  style={{ ...btnSecondary, fontSize: 13, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                  <IconPlus size={14} /> Adicionar formação
                </button>
              )}
            </div>
          </Field>

          <Field label="Chave PIX">
            <input value={form.pix} onChange={e => setForm(f => ({ ...f, pix: e.target.value }))}
              style={inputStyle} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          </Field>

          <Field label="Foto / Cartaz">
            {fotoPreview ? (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                <img src={fotoPreview} alt="Cartaz" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
                <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "#fff", display: "flex" }}>
                  <IconX size={13} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ ...inputStyle, cursor: "pointer", padding: "10px 14px", color: "var(--text3)", fontSize: 13, border: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🖼️</span> Selecionar foto ou cartaz
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={onFotoChange} style={{ display: "none" }} />
          </Field>

          <Field label="Observações / Rider técnico">
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Equipamentos necessários, repertório, referências, etc." />
          </Field>

          {erro && (
            <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13 }}>
              {erro}
            </div>
          )}

          <button type="submit" disabled={enviando}
            style={{ ...btnPrimary, padding: "13px", fontSize: 15, opacity: enviando ? 0.7 : 1 }}>
            {enviando ? "Enviando…" : "Enviar cadastro"}
          </button>

          <p style={{ color: "var(--text3)", fontSize: 11, textAlign: "center" }}>
            Seus dados serão analisados pela equipe do Bar Pé Sujo.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", color: "var(--text2)", fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh", background: "var(--bg)",
  padding: "24px 16px 48px",
  display: "flex", flexDirection: "column", alignItems: "center",
};
const cardStyle = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 16, padding: 24, width: "100%", maxWidth: 520,
};
const inputStyle = {
  background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "10px 12px", color: "var(--text)", width: "100%", outline: "none", fontSize: 14,
};
const btnPrimary = {
  background: "var(--primary)", color: "#fff", border: "none",
  borderRadius: 10, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 6, justifyContent: "center", width: "100%",
};
const btnSecondary = {
  background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 8, fontWeight: 600, cursor: "pointer",
};
