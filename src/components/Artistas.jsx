import { useState, useMemo, useRef } from "react";
import { fbSet, fbDel, fbUploadFoto, fbDeleteFoto } from "../firebase";
import { GENEROS, REGRAS_DIA, MESES, getFormacoes, artistaElegivelParaDia } from "../regras";
import { IconPlus, IconEdit, IconTrash, IconSearch, IconMic, IconPhone, IconCheck, IconX, IconCalendar, IconChevronLeft, IconChevronRight } from "../icons";
import { nanoid, diasNoMes, primeiroDiaSemana } from "../utils";

const MAX_FORMACOES = 3;
const NUMS = [1, 2, 3, 4, 5, 6, 7, 8];

function diasElegiveis(artista) {
  return Object.entries(REGRAS_DIA)
    .filter(([dia]) => artistaElegivelParaDia(artista, Number(dia)))
    .map(([, r]) => r.nome);
}

export default function Artistas({ artistas, shows, onAtualizar, onAgendar }) {
  const [busca, setBusca] = useState("");
  const [filtroGenero, setFiltroGenero] = useState("");
  const [modal, setModal] = useState(null); // null | "novo" | artista
  const [modalAgendar, setModalAgendar] = useState(null); // artista ou null

  const lista = useMemo(() => {
    let r = [...artistas];
    if (busca) r = r.filter(a => a.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.contato?.toLowerCase().includes(busca.toLowerCase()));
    if (filtroGenero) r = r.filter(a => a.generos?.includes(filtroGenero));
    return r.sort((a, b) => a.nome?.localeCompare(b.nome ?? "") ?? 0);
  }, [artistas, busca, filtroGenero]);

  async function salvar(dados) {
    const id = dados.id ?? nanoid();
    await fbSet("bandas_artistas", id, { ...dados, id });
    onAtualizar();
    setModal(null);
  }

  async function aprovar(artista) {
    await fbSet("bandas_artistas", artista.id, { ...artista, status: "ativo" });
    onAtualizar();
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este artista?")) return;
    await fbDel("bandas_artistas", id);
    onAtualizar();
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 900, margin: "0 auto" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>🎤 Artistas</h2>
        <button onClick={() => setModal("novo")} style={btnPrimary}>
          <IconPlus size={16} /> Novo artista
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <IconSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
          <input
            placeholder="Buscar artista ou contato…"
            value={busca} onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30, width: "100%" }}
          />
        </div>
        <select value={filtroGenero} onChange={e => setFiltroGenero(e.target.value)} style={inputStyle}>
          <option value="">Todos os gêneros</option>
          {Object.entries(GENEROS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 48 }}>
          <IconMic size={40} /><p style={{ marginTop: 12 }}>Nenhum artista cadastrado.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {lista.map(a => (
            <ArtistaCard key={a.id} artista={a}
              onEdit={() => setModal(a)}
              onDelete={() => excluir(a.id)}
              onAgendar={() => setModalAgendar(a)}
              onAprovar={() => aprovar(a)}
            />
          ))}
        </div>
      )}

      {modal && (
        <ModalArtista
          artista={modal === "novo" ? null : modal}
          onSalvar={salvar}
          onFechar={() => setModal(null)}
        />
      )}
      {modalAgendar && (
        <ModalAgendarShow
          artista={modalAgendar}
          shows={shows ?? []}
          onFechar={() => setModalAgendar(null)}
          onSalvo={() => { onAtualizar(); setModalAgendar(null); }}
        />
      )}
    </div>
  );
}

function BotaoDownloadFoto({ url, nome }) {
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${nome}.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <button onClick={baixar} disabled={baixando} title="Baixar foto"
      style={{
        position: "absolute", bottom: 8, right: 8,
        background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6,
        padding: "5px 9px", cursor: "pointer", color: "#fff",
        fontSize: 11, fontWeight: 600,
        display: "flex", alignItems: "center", gap: 4,
      }}>
      {baixando ? "…" : "⬇ Baixar foto"}
    </button>
  );
}

function BotaoCopiarPix({ pix }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(pix).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "monospace", wordBreak: "break-all" }}>
        🔑 {pix}
      </span>
      <button onClick={copiar} title="Copiar chave PIX"
        style={{
          flexShrink: 0,
          background: copiado ? "var(--success)22" : "var(--bg3)",
          border: `1px solid ${copiado ? "var(--success)" : "var(--border)"}`,
          borderRadius: 6, padding: "3px 8px", cursor: "pointer",
          color: copiado ? "var(--success)" : "var(--text2)",
          fontSize: 11, display: "flex", alignItems: "center", gap: 4,
          transition: "all 0.15s",
        }}>
        {copiado ? <><IconCheck size={11} /> Copiado</> : "Copiar"}
      </button>
    </div>
  );
}

function ArtistaCard({ artista, onEdit, onDelete, onAgendar, onAprovar }) {
  const dias = diasElegiveis(artista);
  const pendente = artista.status === "pendente";
  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${pendente ? "#f59e0b88" : "var(--border)"}`,
      borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      {/* Badge pendente */}
      {pendente && (
        <div style={{ background: "#f59e0b22", borderBottom: "1px solid #f59e0b44", padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⏳ Cadastro pendente de aprovação</span>
          <button onClick={onAprovar} style={{ background: "#10b98122", border: "1px solid #10b981", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#10b981", cursor: "pointer" }}>
            Aprovar
          </button>
        </div>
      )}
      {/* Cartaz / foto */}
      {artista.fotoUrl && (
        <div style={{ width: "100%", height: 160, overflow: "hidden", position: "relative", background: "var(--bg3)" }}>
          <img src={artista.fotoUrl} alt={artista.nome}
            onError={e => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {/* Fallback quando foto quebra */}
          <div style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 28 }}>🖼️</span>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Foto indisponível</span>
          </div>
          {/* Botão download */}
          <BotaoDownloadFoto url={artista.fotoUrl} nome={artista.nome} />
        </div>
      )}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{artista.nome}</div>
          {artista.contato && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <div style={{ color: "var(--text2)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <IconPhone size={11} /> {artista.contato}
              </div>
              <a
                href={`https://wa.me/55${artista.contato.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  background: "#25d36622", border: "1px solid #25d36655",
                  borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 600,
                  color: "#25d366", textDecoration: "none", display: "flex", alignItems: "center", gap: 3,
                }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.527a.5.5 0 0 0 .609.63l5.975-1.56A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.184-1.433l-.37-.223-3.844 1.004 1.024-3.736-.242-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </a>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <IconBtn onClick={onEdit}><IconEdit size={14} /></IconBtn>
          <IconBtn onClick={onDelete} danger><IconTrash size={14} /></IconBtn>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {artista.generos?.map(g => {
          const gen = GENEROS[g];
          const label = gen?.label ?? (g === "voz_violao" ? null : g);
          if (!label) return null;
          const cor = gen?.cor ?? "#6b7280";
          return (
            <span key={g} style={{
              background: cor + "22", color: cor,
              border: `1px solid ${cor}44`,
              borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
            }}>{label}{artista.outroGenero && g === "outro" ? `: ${artista.outroGenero}` : ""}</span>
          );
        })}
      </div>

      {/* Formações */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {getFormacoes(artista).map((f, i) => (
          <span key={i} style={{
            background: "var(--bg3)", borderRadius: 20,
            padding: "2px 10px", fontSize: 11, color: "var(--text2)",
            border: "1px solid var(--border)",
          }}>
            {f.nome ? `${f.nome} · ` : ""}{f.integrantes} integrante{f.integrantes !== 1 ? "s" : ""}
            {f.cache != null && f.cache !== "" ? ` · R$ ${Number(f.cache).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {dias.map(d => (
          <span key={d} style={{
            background: "var(--primary)22", color: "var(--primary-light)",
            border: "1px solid var(--primary)44", borderRadius: 20,
            padding: "1px 7px", fontSize: 10, fontWeight: 600,
          }}>{d}</span>
        ))}
        {dias.length === 0 && <span style={{ color: "var(--text3)", fontSize: 11 }}>Sem dias elegíveis</span>}
      </div>

      <button onClick={onAgendar} style={{
        ...btnPrimary, fontSize: 12, padding: "7px 12px", width: "100%", marginTop: 2,
      }}>
        <IconCalendar size={13} /> Agendar show
      </button>
      {artista.pix && <BotaoCopiarPix pix={artista.pix} />}
      {artista.observacoes && (
        <div style={{ color: "var(--text3)", fontSize: 11, fontStyle: "italic" }}>{artista.observacoes}</div>
      )}
      </div>
    </div>
  );
}

function ModalArtista({ artista, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: artista?.nome ?? "",
    contato: artista?.contato ?? "",
    generos: artista?.generos ?? [],
    formacoes: getFormacoes(artista ?? {}),
    instagram: artista?.instagram ?? "",
    pix: artista?.pix ?? "",
    observacoes: artista?.observacoes ?? "",
    fotoUrl: artista?.fotoUrl ?? "",
    fotoPath: artista?.fotoPath ?? "",
    id: artista?.id ?? undefined,
  });
  const [fotoPreview, setFotoPreview] = useState(artista?.fotoUrl ?? "");
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  function setFormacao(idx, key, val) {
    setForm(f => {
      const fs = [...f.formacoes];
      fs[idx] = { ...fs[idx], [key]: val };
      return { ...f, formacoes: fs };
    });
  }

  function addFormacao() {
    if (form.formacoes.length >= MAX_FORMACOES) return;
    setForm(f => ({ ...f, formacoes: [...f.formacoes, { integrantes: 1, nome: "", cache: "" }] }));
  }

  function removeFormacao(idx) {
    setForm(f => ({ ...f, formacoes: f.formacoes.filter((_, i) => i !== idx) }));
  }

  function toggleGenero(g) {
    setForm(f => ({
      ...f,
      generos: f.generos.includes(g) ? f.generos.filter(x => x !== g) : [...f.generos, g],
    }));
  }

  function onFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  function removerFoto() {
    setFotoFile(null);
    setFotoPreview("");
    setForm(f => ({ ...f, fotoUrl: "", fotoPath: "" }));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    if (form.formacoes.length === 0) return;
    setUploading(true);
    try {
      const { integrantes: _old, ...resto } = form;
      const formacoes = form.formacoes.map(f => ({
        ...f,
        cache: f.cache !== "" && f.cache != null ? Number(f.cache) : null,
      }));
      let fotoUrl = form.fotoUrl;
      let fotoPath = form.fotoPath;
      if (fotoFile) {
        // Remove foto antiga se existir
        if (fotoPath) await fbDeleteFoto(fotoPath);
        const id = form.id ?? nanoid();
        fotoPath = `bandas_artistas/${id}/cartaz`;
        fotoUrl = await fbUploadFoto(fotoPath, fotoFile);
        resto.id = id;
      } else if (!fotoPreview && fotoPath) {
        // Foto removida pelo usuário
        await fbDeleteFoto(fotoPath);
        fotoPath = "";
        fotoUrl = "";
      }
      onSalvar({ ...resto, formacoes, fotoUrl, fotoPath });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={modalBox}>
        <h3 style={{ marginBottom: 20, fontWeight: 700 }}>{artista ? "Editar artista" : "Novo artista"}</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nome artístico *">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required style={inputStyle} placeholder="Ex: Banda Forró do Povo" />
          </Field>
          <Field label="Contato (WhatsApp / telefone)">
            <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} style={inputStyle} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="Instagram">
            <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} style={inputStyle} placeholder="@nomeartista" />
          </Field>

          <Field label="Gêneros musicais">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {Object.entries(GENEROS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => toggleGenero(k)}
                  style={{
                    border: `1px solid ${form.generos.includes(k) ? v.cor : "var(--border)"}`,
                    background: form.generos.includes(k) ? v.cor + "22" : "transparent",
                    color: form.generos.includes(k) ? v.cor : "var(--text2)",
                    borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer",
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Formações (${form.formacoes.length}/${MAX_FORMACOES})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.formacoes.map((f, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      value={f.nome}
                      onChange={e => setFormacao(idx, "nome", e.target.value)}
                      style={{ ...inputStyle, fontSize: 12 }}
                      placeholder={`Nome da formação ${idx + 1} (ex: Solo, Dupla, Completa)`}
                    />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {NUMS.map(n => (
                        <button key={n} type="button"
                          onClick={() => setFormacao(idx, "integrantes", n)}
                          style={{
                            width: 36, height: 32, borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
                            background: f.integrantes === n ? "var(--primary)" : "var(--bg2)",
                            border: `1px solid ${f.integrantes === n ? "var(--primary)" : "var(--border)"}`,
                            color: f.integrantes === n ? "#fff" : "var(--text2)",
                          }}>
                          {n}
                        </button>
                      ))}
                      <span style={{ fontSize: 11, color: "var(--text3)", alignSelf: "center", marginLeft: 2 }}>
                        integrante{f.integrantes !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 12 }}>R$</span>
                      <input
                        type="text" inputMode="decimal"
                        value={f.cache ?? ""}
                        onChange={e => setFormacao(idx, "cache", e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 32, fontSize: 12 }}
                        placeholder="Cachê desta formação"
                      />
                    </div>
                  </div>
                  {form.formacoes.length > 1 && (
                    <button type="button" onClick={() => removeFormacao(idx)}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--danger)", marginTop: 2, flexShrink: 0 }}>
                      <IconX size={13} />
                    </button>
                  )}
                </div>
              ))}
              {form.formacoes.length < MAX_FORMACOES && (
                <button type="button" onClick={addFormacao}
                  style={{ ...btnSecondary, fontSize: 12, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                  <IconPlus size={13} /> Adicionar formação
                </button>
              )}
            </div>
          </Field>

          <Field label="Cartaz / Foto">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fotoPreview ? (
                <div style={{ position: "relative", width: "100%", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <img src={fotoPreview} alt="Cartaz" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                  <button type="button" onClick={removerFoto}
                    style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6,
                      padding: "4px 6px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center",
                    }}>
                    <IconX size={13} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{
                    ...inputStyle, cursor: "pointer",
                    padding: "8px 12px", color: "var(--text3)", fontSize: 11,
                    border: "1px dashed var(--border)", background: "var(--bg2)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                  <span style={{ fontSize: 16 }}>🖼️</span>
                  <span>Selecionar cartaz / foto</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*"
                onChange={onFotoChange} style={{ display: "none" }} />
              {!fotoPreview && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ ...btnSecondary, fontSize: 12, padding: "7px 12px", alignSelf: "flex-start" }}>
                  Selecionar imagem
                </button>
              )}
            </div>
          </Field>

          <Field label="Chave PIX">
            <input value={form.pix} onChange={e => setForm(f => ({ ...f, pix: e.target.value }))}
              style={inputStyle} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          </Field>

          <Field label="Observações">
            <textarea value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Equipamentos necessários, rider, etc." />
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onFechar} style={btnSecondary} disabled={uploading}>Cancelar</button>
            <button type="submit" style={{ ...btnPrimary, flex: 1 }} disabled={uploading}>
              {uploading ? "Enviando foto…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalAgendarShow({ artista, shows, onFechar, onSalvo }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [selecionadas, setSelecionadas] = useState({}); // { "YYYY-MM-DD": { horario, cache, generoId } }
  const [salvando, setSalvando] = useState(false);

  const diasMes = diasNoMes(ano, mes);
  const inicioDia = primeiroDiaSemana(ano, mes);
  const todayStr = hoje.toISOString().slice(0, 10);
  const formacoes = getFormacoes(artista);

  // índice de shows existentes por "data|horario"
  const showsIdx = useMemo(() => {
    const idx = {};
    shows.forEach(s => { if (s.data && s.horario) idx[`${s.data}|${s.horario}`] = true; });
    return idx;
  }, [shows]);

  function temConflito(data, horario) {
    return !!horario && showsIdx[`${data}|${horario}`];
  }

  function dataStr(dia) {
    return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  function toggleData(dia) {
    const d = dataStr(dia);
    const diaSemana = new Date(d + "T12:00:00").getDay();
    const regra = REGRAS_DIA[diaSemana];
    if (regra?.fechado) return;
    setSelecionadas(prev => {
      if (prev[d]) {
        const { [d]: _, ...resto } = prev;
        return resto;
      }
      const horario = regra?.slots?.[0] ?? "";
      const formacaoIdx = 0;
      const cache = formacoes[formacaoIdx]?.cache ?? "";
      const generoId = artista.generos?.[0] ?? "";
      return { ...prev, [d]: { horario, cache, generoId, formacaoIdx } };
    });
  }

  function setDadoData(d, key, val) {
    setSelecionadas(prev => ({ ...prev, [d]: { ...prev[d], [key]: val } }));
  }

  function navMes(dir) {
    setMes(m => {
      let nm = m + dir;
      if (nm < 0) { setAno(a => a - 1); return 11; }
      if (nm > 11) { setAno(a => a + 1); return 0; }
      return nm;
    });
  }

  async function salvar() {
    const datas = Object.entries(selecionadas);
    if (!datas.length) return;
    setSalvando(true);
    try {
      for (const [data, cfg] of datas) {
        const id = nanoid();
        await fbSet("bandas_shows", id, {
          id, artistaId: artista.id, data,
          horario: cfg.horario, cache: Number(cfg.cache) || 0,
          generoId: cfg.generoId, formacaoIdx: cfg.formacaoIdx ?? 0,
          status: "pendente", observacoes: "",
        });
      }
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  const datasOrdenadas = Object.keys(selecionadas).sort();
  const temConflitos = datasOrdenadas.some(d => temConflito(d, selecionadas[d]?.horario));

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{ ...modalBox, maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700 }}>Agendar show</h3>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{artista.nome}</div>
          </div>
          <button onClick={onFechar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
            <IconX size={16} />
          </button>
        </div>

        {/* Navegação mês */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => navMes(-1)} style={iconBtnSm}><IconChevronLeft size={14} /></button>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: 14 }}>{MESES[mes]} {ano}</span>
          <button onClick={() => navMes(1)} style={iconBtnSm}><IconChevronRight size={14} /></button>
        </div>

        {/* Grid calendário */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 14 }}>
          {["D","S","T","Q","Q","S","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10, color: "var(--text3)", padding: "2px 0", fontWeight: 600 }}>{d}</div>
          ))}
          {Array.from({ length: inicioDia }).map((_, i) => <div key={`v${i}`} />)}
          {Array.from({ length: diasMes }, (_, i) => {
            const dia = i + 1;
            const d = dataStr(dia);
            const diaSemana = new Date(d + "T12:00:00").getDay();
            const regra = REGRAS_DIA[diaSemana];
            const fechado = regra?.fechado;
            const sel = !!selecionadas[d];
            const passado = d < todayStr;
            const cfgDia = selecionadas[d];
            const conflito = sel && temConflito(d, cfgDia?.horario);
            return (
              <button key={dia} type="button" onClick={() => !passado && !fechado && toggleData(dia)}
                title={conflito ? "Horário já ocupado" : undefined}
                style={{
                  padding: "6px 2px", borderRadius: 6, fontSize: 12, fontWeight: sel ? 700 : 400,
                  textAlign: "center", cursor: fechado || passado ? "default" : "pointer",
                  background: conflito ? "#ef444422" : sel ? "var(--primary)" : "var(--bg2)",
                  border: `1px solid ${conflito ? "#ef4444" : sel ? "var(--primary)" : "var(--border)"}`,
                  color: conflito ? "#ef4444" : sel ? "#fff" : fechado || passado ? "var(--text3)" : "var(--text)",
                  opacity: fechado || passado ? 0.35 : 1,
                }}>
                {dia}
              </button>
            );
          })}
        </div>

        {/* Configuração de cada data selecionada */}
        {datasOrdenadas.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>
              {datasOrdenadas.length} data{datasOrdenadas.length > 1 ? "s" : ""} selecionada{datasOrdenadas.length > 1 ? "s" : ""}
            </div>
            {datasOrdenadas.map(d => {
              const diaSemana = new Date(d + "T12:00:00").getDay();
              const regra = REGRAS_DIA[diaSemana];
              const cfg = selecionadas[d];
              const [, m, dia] = d.split("-");
              return (
                <div key={d} style={{ background: "var(--bg2)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][diaSemana]}, {dia}/{m}
                    </span>
                    <button type="button" onClick={() => toggleData(Number(dia))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
                      <IconX size={12} />
                    </button>
                  </div>
                  {/* Horário */}
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>Horário</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {regra?.slots?.map(s => {
                        const ocupado = temConflito(d, s);
                        const ativo = cfg.horario === s;
                        return (
                          <button key={s} type="button" onClick={() => setDadoData(d, "horario", s)}
                            title={ocupado ? "Horário já ocupado" : undefined}
                            style={{
                              borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                              background: ocupado ? "#ef444422" : ativo ? "var(--primary)33" : "var(--bg3)",
                              border: `1px solid ${ocupado ? "#ef4444" : ativo ? "var(--primary)" : "var(--border)"}`,
                              color: ocupado ? "#ef4444" : ativo ? "var(--primary-light)" : "var(--text2)",
                            }}>{s}{ocupado ? " ⚠️" : ""}</button>
                        );
                      })}
                      <input type="time" value={cfg.horario}
                        onChange={e => setDadoData(d, "horario", e.target.value)}
                        style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", width: 90 }} />
                    </div>
                  </div>

                  {/* Formação (se tiver mais de uma) */}
                  {formacoes.length > 1 && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>Formação</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {formacoes.map((f, i) => {
                          const sel = (cfg.formacaoIdx ?? 0) === i;
                          return (
                            <button key={i} type="button"
                              onClick={() => setSelecionadas(prev => ({
                                ...prev,
                                [d]: { ...prev[d], formacaoIdx: i, cache: f.cache ?? "" },
                              }))}
                              style={{
                                borderRadius: 20, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                                background: sel ? "var(--primary)33" : "var(--bg3)",
                                border: `1px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                                color: sel ? "var(--primary-light)" : "var(--text2)",
                              }}>
                              {f.nome || `Formação ${i + 1}`} · {f.integrantes} int.
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cachê — derivado da formação, editável sem spinners */}
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>Cachê (R$)</div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 11 }}>R$</span>
                      <input
                        type="text" inputMode="decimal" value={cfg.cache ?? ""}
                        onChange={e => setDadoData(d, "cache", e.target.value)}
                        style={{ ...inputStyle, fontSize: 11, padding: "4px 8px 4px 28px" }}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Gênero */}
                  {artista.generos?.length > 1 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {artista.generos.map(g => {
                        const cor = GENEROS[g]?.cor ?? "var(--border)";
                        const sel = cfg.generoId === g;
                        return (
                          <button key={g} type="button" onClick={() => setDadoData(d, "generoId", g)}
                            style={{
                              borderRadius: 20, padding: "2px 9px", fontSize: 10, cursor: "pointer", fontWeight: 600,
                              background: sel ? cor + "33" : "var(--bg3)",
                              border: `1px solid ${sel ? cor : "var(--border)"}`,
                              color: sel ? cor : "var(--text2)",
                            }}>{GENEROS[g]?.label}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onFechar} style={btnSecondary} disabled={salvando}>Cancelar</button>
          <button onClick={salvar} disabled={!datasOrdenadas.length || salvando || temConflitos}
            style={{ ...btnPrimary, flex: 1, opacity: !datasOrdenadas.length || temConflitos ? 0.5 : 1 }}>
            {salvando ? "Salvando…" : temConflitos ? "⚠️ Horário já Agendado" : `Confirmar ${datasOrdenadas.length > 1 ? `${datasOrdenadas.length} shows` : "show"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const iconBtnSm = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center" };

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", color: "var(--text2)", fontSize: 12, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6,
      padding: "5px 7px", cursor: "pointer",
      color: danger ? "var(--danger)" : "var(--text2)",
      display: "flex", alignItems: "center",
    }}>{children}</button>
  );
}

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 16,
};
const modalBox = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 16, padding: 28, width: "100%", maxWidth: 480,
  maxHeight: "90vh", overflowY: "auto",
};
const inputStyle = {
  background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "9px 12px", color: "var(--text)", width: "100%", outline: "none",
};
const btnPrimary = {
  background: "var(--primary)", color: "#fff", border: "none",
  borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
};
const btnSecondary = {
  background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer",
};
