import { useState, useMemo, useEffect } from "react";
import { fbSet, fbDel, fbListen } from "../firebase";
import { useEscFechar } from "../hooks";
import { REGRAS_DIA, MESES, getFormacoes } from "../regras";
import { nanoid, diasNoMes, primeiroDiaSemana, formatarData, formatarMoeda } from "../utils";
import { IconPlus, IconX, IconChevronLeft, IconChevronRight, IconTrash, IconCheck, IconSend, IconLink } from "../icons";

const STATUS_COR = {
  pendente: "var(--warning)",
  aceito: "var(--success)",
  aceito_parcial: "#f97316",
  conflito_total: "var(--danger)",
  recusado: "var(--danger)",
};
const STATUS_LABEL = {
  pendente: "Aguardando",
  aceito: "Aceito",
  aceito_parcial: "Aceito parcialmente",
  conflito_total: "Todos conflitaram",
  recusado: "Recusado",
};

export default function Convites({ artistas, shows, artistaInicial, onConsumed }) {
  const [convites, setConvites] = useState([]);
  const [modalAberto, setModalAberto] = useState(!!artistaInicial);

  useEffect(() => {
    if (artistaInicial) onConsumed?.();
  }, []); // eslint-disable-line
  const [linkGerado, setLinkGerado] = useState(null);
  const [filtro, setFiltro] = useState("todos"); // "todos" | "pendente" | "respondido" | "recusado"

  useEffect(() => {
    return fbListen("bandas_convites", setConvites);
  }, []);

  async function excluir(id) {
    if (!window.confirm("Excluir este convite?")) return;
    await fbDel("bandas_convites", id);
  }

  function eExpirado(c) {
    return c.status === "pendente" && c.expiraEm && new Date() > new Date(c.expiraEm);
  }
  function temSlotAceito(c) {
    return c.slots?.some(s => s.status === "aceito");
  }
  function temSlotRecusado(c) {
    return c.slots?.some(s => s.status === "recusado_artista" || s.status === "conflito");
  }
  function eRecusado(c) {
    return c.status === "recusado" || c.status === "conflito_total" || temSlotRecusado(c);
  }
  function eAceito(c) {
    return c.status !== "pendente" && temSlotAceito(c);
  }

  const lista = [...convites]
    .filter(c => {
      if (filtro === "pendente") return c.status === "pendente";
      if (filtro === "respondido") return eAceito(c);
      if (filtro === "recusado") return eRecusado(c);
      return true;
    })
    .sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""));

  const contagem = {
    todos: convites.length,
    pendente: convites.filter(c => c.status === "pendente").length,
    respondido: convites.filter(eAceito).length,
    recusado: convites.filter(eRecusado).length,
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>💌 Convites</h2>
        <button onClick={() => setModalAberto(true)} style={btnPrimary}>
          <IconPlus size={15} /> Novo convite
        </button>
      </div>

      {/* Filtros */}
      {convites.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { key: "todos", label: "Todos" },
            { key: "pendente", label: "Aguardando" },
            { key: "respondido", label: "Aceitos" },
            { key: "recusado", label: "Recusados" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              style={{
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: filtro === key ? "var(--primary)" : "var(--bg2)",
                border: `1px solid ${filtro === key ? "var(--primary)" : "var(--border)"}`,
                color: filtro === key ? "#fff" : "var(--text2)",
              }}>
              {label} {contagem[key] > 0 && <span style={{ opacity: 0.75 }}>({contagem[key]})</span>}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
          <p>Nenhum convite enviado ainda.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Crie um convite para um artista e envie por WhatsApp.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map(c => {
            const artista = artistas.find(a => a.id === c.artistaId);
            const cor = STATUS_COR[c.status] ?? "var(--text3)";
            const url = `${window.location.origin}/convite/${c.id}`;
            const recusado = c.status === "recusado" || c.status === "conflito_total";
            const expirado = eExpirado(c);
            return (
              <div key={c.id} style={{
                background: recusado ? "#ef444430" : expirado ? "var(--bg3)" : "var(--card)",
                border: `2px solid ${recusado ? "#ef4444" : expirado ? "var(--border)" : "var(--border)"}`,
                opacity: expirado ? 0.7 : 1,
                borderRadius: 12, padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.artistaNome}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      {c.slots?.length ?? 0} data{c.slots?.length !== 1 ? "s" : ""} propostas
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: expirado ? "var(--text3)" : cor, fontWeight: 700, fontSize: 12 }}>
                      ● {expirado ? "Expirado" : (STATUS_LABEL[c.status] ?? c.status)}
                    </span>
                    {c.status === "pendente" && !expirado && artista?.contato && (
                      <a
                        href={`https://wa.me/55${artista.contato.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${c.artistaNome}! O Bar Pé Sujo tem datas disponíveis para você 🎵\n\nAcesse o link para confirmar:\n${url}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ ...btnWpp, fontSize: 11, padding: "4px 10px" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.527a.5.5 0 0 0 .609.63l5.975-1.56A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.184-1.433l-.37-.223-3.844 1.004 1.024-3.736-.242-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                        Reenviar
                      </a>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(url); }} title="Copiar link"
                      style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
                      <IconLink size={12} />
                    </button>
                    <button onClick={() => excluir(c.id)} title="Excluir"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex" }}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* Slots + observações */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.slots?.map((s, i) => {
                    const isRecusado = s.status === "recusado_artista" || s.status === "conflito";
                    const isAceito = s.status === "aceito";
                    const cor = isAceito ? "#10b981" : isRecusado ? "#ef4444" : "var(--text3)";
                    const borderCor = isAceito ? "#10b98155" : isRecusado ? "#ef444488" : "var(--border)";
                    const bgCor = isAceito ? "#10b98115" : isRecusado ? "#ef444420" : "var(--bg2)";
                    return (
                      <span key={i} style={{
                        background: bgCor, border: `1px solid ${borderCor}`,
                        borderRadius: 20, padding: "3px 10px", fontSize: 11, color: cor,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        {formatarData(s.data)} {s.horario}
                        {s.status === "aceito" && " ✅"}
                        {s.status === "conflito" && " ❌"}
                        {s.status === "recusado_artista" && " —"}
                        {s.observacaoArtista && (
                          <span title={s.observacaoArtista} style={{
                            background: "var(--warning)33", color: "var(--warning)",
                            border: "1px solid var(--warning)55",
                            borderRadius: 10, padding: "0px 6px", fontSize: 10, fontWeight: 600,
                            cursor: "help", whiteSpace: "nowrap",
                          }}>💬 obs</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                {/* Observações do artista */}
                {c.slots?.some(s => s.observacaoArtista) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    {c.slots.filter(s => s.observacaoArtista).map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: "var(--text2)", background: "var(--warning)15", border: "1px solid var(--warning)33", borderRadius: 6, padding: "4px 10px" }}>
                        <span style={{ color: "var(--warning)", fontWeight: 700 }}>💬 {formatarData(s.data)} {s.horario}:</span> {s.observacaoArtista}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <ModalNovoConvite
          artistas={artistas}
          shows={shows}
          artistaInicial={artistaInicial}
          onFechar={() => setModalAberto(false)}
          onCriado={(convite) => {
            setModalAberto(false);
            setLinkGerado(convite);
          }}
        />
      )}

      {linkGerado && (
        <ModalLinkGerado
          convite={linkGerado}
          artista={artistas.find(a => a.id === linkGerado.artistaId)}
          onFechar={() => setLinkGerado(null)}
        />
      )}
    </div>
  );
}

function ModalNovoConvite({ artistas, shows, onFechar, onCriado, artistaInicial }) {
  useEscFechar(onFechar);
  const hoje = new Date();
  const [artistaId, setArtistaId] = useState(artistaInicial?.id ?? "");
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [selecionadas, setSelecionadas] = useState({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  const artista = artistas.find(a => a.id === artistaId);
  const formacoes = artista ? getFormacoes(artista) : [];
  const diasMes = diasNoMes(ano, mes);
  const inicioDia = primeiroDiaSemana(ano, mes);
  const todayStr = hoje.toISOString().slice(0, 10);

  const showsIdx = useMemo(() => {
    const idx = {};
    shows.forEach(s => { if (s.data && s.horario && s.status !== "cancelado") idx[`${s.data}|${s.horario}`] = true; });
    return idx;
  }, [shows]);

  const showsPorDia = useMemo(() => {
    const m = {};
    shows.forEach(s => { if (s.data && s.status !== "cancelado") m[s.data] = (m[s.data] ?? 0) + 1; });
    return m;
  }, [shows]);

  function dataStr(dia) {
    return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  function toggleData(dia) {
    const d = dataStr(dia);
    const diaSemana = new Date(d + "T12:00:00").getDay();
    const regra = REGRAS_DIA[diaSemana];
    if (regra?.fechado) return;
    setSelecionadas(prev => {
      if (prev[d]) { const { [d]: _, ...r } = prev; return r; }
      const horario = regra?.slots?.[0] ?? "";
      const cache = formacoes[0]?.cache ?? "";
      return { ...prev, [d]: { horario, cache, formacaoIdx: 0 } };
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
    if (!artistaId || !Object.keys(selecionadas).length) return;
    setSalvando(true);
    try {
      const id = nanoid();
      const slots = Object.entries(selecionadas).sort(([a], [b]) => a.localeCompare(b)).map(([data, cfg]) => {
        const formacao = formacoes[cfg.formacaoIdx ?? 0];
        return {
          data,
          horario: cfg.horario,
          cache: Number(cfg.cache) || 0,
          formacaoIdx: cfg.formacaoIdx ?? 0,
          formacaoNome: formacao?.nome || "",
          formacaoIntegrantes: formacao?.integrantes ?? 1,
          status: "pendente",
        };
      });
      const convite = {
        id,
        artistaId,
        artistaNome: artista.nome,
        slots,
        mensagem: mensagem.trim(),
        status: "pendente",
        criadoEm: new Date().toISOString(),
        expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      await fbSet("bandas_convites", id, convite);
      onCriado(convite);
    } finally {
      setSalvando(false);
    }
  }

  const datasOrdenadas = Object.keys(selecionadas).sort();

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Novo convite</h3>
          <button onClick={onFechar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
            <IconX size={16} />
          </button>
        </div>

        {/* Artista */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Artista</label>
          <select value={artistaId} onChange={e => { setArtistaId(e.target.value); setSelecionadas({}); }} style={inputStyle}>
            <option value="">Selecionar artista…</option>
            {artistas.filter(a => a.status !== "pendente").sort((a, b) => a.nome.localeCompare(b.nome)).map(a => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>

        {/* Navegação mês */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => navMes(-1)} style={iconBtnSm}><IconChevronLeft size={14} /></button>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: 14 }}>{MESES[mes]} {ano}</span>
          <button onClick={() => navMes(1)} style={iconBtnSm}><IconChevronRight size={14} /></button>
        </div>

        {/* Grid calendário */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 14 }}>
          {["S","T","Q","Q","S","S","D"].map((d, i) => (
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
            const qtdShows = showsPorDia[d] ?? 0;
            const temShow = qtdShows > 0 && !sel;
            return (
              <button key={dia} type="button"
                onClick={() => !passado && !fechado && toggleData(dia)}
                title={temShow ? `${qtdShows} show${qtdShows > 1 ? "s" : ""} agendado${qtdShows > 1 ? "s" : ""}` : undefined}
                style={{
                  padding: "4px 2px 2px", borderRadius: 6, fontSize: 12, fontWeight: sel ? 700 : 400,
                  textAlign: "center", cursor: fechado || passado ? "default" : "pointer",
                  background: sel ? "var(--primary)" : temShow ? "var(--bg3)" : "var(--bg2)",
                  border: `1px solid ${sel ? "var(--primary)" : temShow ? "var(--primary)55" : "var(--border)"}`,
                  color: sel ? "#fff" : fechado || passado ? "var(--text3)" : "var(--text)",
                  opacity: fechado || passado ? 0.35 : 1,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                {dia}
                <span style={{ display: "flex", gap: 2, justifyContent: "center", height: 6 }}>
                  {temShow && !passado && qtdShows >= 1 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />}
                  {temShow && !passado && qtdShows >= 2 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Configuração das datas selecionadas */}
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
                        const ocupado = !!showsIdx[`${d}|${s}`];
                        const ativo = cfg.horario === s;
                        return (
                          <button key={s} type="button" onClick={() => !ocupado && setDadoData(d, "horario", s)}
                            style={{
                              borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: ocupado ? "not-allowed" : "pointer", fontWeight: 600,
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
                  {/* Cachê */}
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>Cachê (R$)</div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 11 }}>R$</span>
                      <input type="text" inputMode="decimal" value={cfg.cache ?? ""}
                        onChange={e => setDadoData(d, "cache", e.target.value)}
                        style={{ ...inputStyle, fontSize: 11, padding: "4px 8px 4px 28px" }}
                        placeholder="0,00" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mensagem opcional */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Mensagem personalizada (opcional)</label>
          <textarea value={mensagem} onChange={e => setMensagem(e.target.value)}
            rows={2} placeholder="Ex: Temos uma data especial para você!"
            style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onFechar} style={btnSecondary} disabled={salvando}>Cancelar</button>
          <button onClick={salvar} disabled={!artistaId || !datasOrdenadas.length || salvando}
            style={{ ...btnPrimary, flex: 1, opacity: !artistaId || !datasOrdenadas.length ? 0.5 : 1 }}>
            <IconSend size={14} /> {salvando ? "Gerando…" : "Gerar link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalLinkGerado({ convite, artista, onFechar }) {
  useEscFechar(onFechar);
  const [copiado, setCopiado] = useState(false);
  const url = `${window.location.origin}/convite/${convite.id}`;
  const telefone = artista?.contato?.replace(/\D/g, "");
  const msgWpp = `Olá ${convite.artistaNome}! O Bar Pé Sujo tem datas disponíveis para você 🎵\n\nAcesse o link para confirmar os shows:\n${url}`;

  function copiar() {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{ ...modalBox, maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
          <h3 style={{ fontWeight: 700 }}>Link gerado!</h3>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 6 }}>
            Envie para <strong>{convite.artistaNome}</strong> confirmar os shows.
          </p>
        </div>

        {/* Link */}
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, wordBreak: "break-all", fontSize: 12, color: "var(--text2)" }}>
          {url}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={copiar} style={{ ...btnSecondary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {copiado ? <><IconCheck size={14} /> Link copiado!</> : <><IconLink size={14} /> Copiar link</>}
          </button>

          {telefone && (
            <a href={`https://wa.me/55${telefone}?text=${encodeURIComponent(msgWpp)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ ...btnWpp, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.527a.5.5 0 0 0 .609.63l5.975-1.56A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.184-1.433l-.37-.223-3.844 1.004 1.024-3.736-.242-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Enviar pelo WhatsApp
            </a>
          )}

          {!telefone && (
            <p style={{ fontSize: 12, color: "var(--warning)", textAlign: "center" }}>
              ⚠️ Artista sem número cadastrado. Copie o link e envie manualmente.
            </p>
          )}

          <button onClick={onFechar} style={{ ...btnSecondary, textAlign: "center" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 };
const modalBox = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" };
const inputStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", width: "100%", outline: "none" };
const labelStyle = { display: "block", color: "var(--text2)", fontSize: 12, marginBottom: 5 };
const iconBtnSm = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center" };
const btnPrimary = { background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" };
const btnSecondary = { background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer" };
const btnWpp = { background: "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 };
