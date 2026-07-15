import { useState, useMemo } from "react";
import { fbSet } from "../firebase";
import { GENEROS, REGRAS_DIA } from "../regras";
import { formatarMoeda, formatarData } from "../utils";
import { IconCheck, IconClock, IconFilter, IconDollar, IconX } from "../icons";

function BotaoCopiarPix({ pix }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(pix).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }
  return (
    <button onClick={copiar} title={`Copiar PIX: ${pix}`}
      style={{
        background: copiado ? "var(--success)22" : "var(--bg3)",
        border: `1px solid ${copiado ? "var(--success)" : "var(--border)"}`,
        borderRadius: 6, padding: "5px 8px", cursor: "pointer",
        color: copiado ? "var(--success)" : "var(--text2)",
        fontSize: 11, display: "flex", alignItems: "center", gap: 4,
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}>
      {copiado ? <><IconCheck size={11} /> PIX copiado</> : "🔑 PIX"}
    </button>
  );
}

const STATUS_LABEL = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
const STATUS_COR = { pendente: "var(--warning)", pago: "var(--success)", cancelado: "var(--danger)" };

export default function Shows({ shows, artistas, onAtualizar, onSalvarShow }) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [carregando, setCarregando] = useState({});
  const [modalEditar, setModalEditar] = useState(null);

  const lista = useMemo(() => {
    let r = [...shows].sort((a, b) => b.data?.localeCompare(a.data ?? "") ?? 0);
    if (filtroStatus) r = r.filter(s => s.status === filtroStatus);
    if (filtroMes) r = r.filter(s => s.data?.startsWith(filtroMes));
    return r;
  }, [shows, filtroStatus, filtroMes]);

  // Agrupa por semana Seg→Dom
  const semanas = useMemo(() => {
    const grupos = [];
    lista.forEach(show => {
      const d = new Date(show.data + "T12:00:00");
      const dia = d.getDay(); // 0=dom
      const diffSeg = dia === 0 ? -6 : 1 - dia;
      const seg = new Date(d);
      seg.setDate(d.getDate() + diffSeg);
      const dom = new Date(seg);
      dom.setDate(seg.getDate() + 6);
      const chave = seg.toISOString().slice(0, 10);
      let grupo = grupos.find(g => g.chave === chave);
      if (!grupo) {
        grupo = { chave, seg, dom, shows: [] };
        grupos.push(grupo);
      }
      grupo.shows.push(show);
    });
    return grupos.sort((a, b) => b.chave.localeCompare(a.chave));
  }, [lista]);

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(shows.map(s => s.data?.slice(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [shows]);

  const totais = useMemo(() => ({
    total: lista.reduce((s, x) => s + (x.cache || 0), 0),
    pago: lista.filter(x => x.status === "pago").reduce((s, x) => s + (x.cache || 0), 0),
    pendente: lista.filter(x => x.status === "pendente").reduce((s, x) => s + (x.cache || 0), 0),
  }), [lista]);

  async function togglePago(show) {
    setCarregando(c => ({ ...c, [show.id]: true }));
    const novoStatus = show.status === "pago" ? "pendente" : "pago";
    await fbSet("bandas_shows", show.id, { ...show, status: novoStatus });
    onAtualizar();
    setCarregando(c => ({ ...c, [show.id]: false }));
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 900, margin: "0 auto" }}>
      {modalEditar && (
        <ModalEditarShow
          show={modalEditar}
          artistas={artistas}
          onSalvar={async (dados) => { await onSalvarShow(dados); setModalEditar(null); }}
          onFechar={() => setModalEditar(null)}
        />
      )}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>📋 Shows Agendados</h2>

      {/* Totalizadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <Tile label="Total" valor={totais.total} cor="var(--primary-light)" />
        <Tile label="Pago" valor={totais.pago} cor="var(--success)" />
        <Tile label="Pendente" valor={totais.pendente} cor="var(--warning)" />
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={inputStyle}>
          <option value="">Todos os status</option>
          <option value="pendente">⏳ Pendente</option>
          <option value="pago">✅ Pago</option>
          <option value="cancelado">❌ Cancelado</option>
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={inputStyle}>
          <option value="">Todos os meses</option>
          {mesesDisponiveis.map(m => {
            const [a, ms] = m.split("-");
            const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            return <option key={m} value={m}>{nomes[Number(ms) - 1]}/{a}</option>;
          })}
        </select>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 48 }}>
          <IconClock size={40} /><p style={{ marginTop: 12 }}>Nenhum show encontrado.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {semanas.map(({ chave, seg, dom, shows: showsSemana }) => {
            const fmt = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
            const totalSemana = showsSemana.reduce((s, x) => s + (x.cache || 0), 0);
            return (
              <div key={chave}>
                {/* Cabeçalho da semana */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 8, padding: "6px 10px",
                  background: "var(--bg2)", borderRadius: 8,
                  border: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                    Seg {fmt(seg)} — Dom {fmt(dom)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                    {showsSemana.length} show{showsSemana.length > 1 ? "s" : ""} · {formatarMoeda(totalSemana)}
                  </span>
                </div>

                {/* Shows da semana */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {showsSemana.map(show => {
                    const artista = artistas.find(a => a.id === show.artistaId);
                    const cor = STATUS_COR[show.status] ?? "var(--text3)";
                    const corGenero = artista?.generos?.[0] ? GENEROS[artista.generos[0]]?.cor : "var(--border)";
                    return (
                      <div key={show.id} style={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: 10, padding: "12px 14px",
                        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                      }}>
                        <div style={{ minWidth: 90 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{formatarData(show.data)}</div>
                          <div style={{ color: "var(--text3)", fontSize: 11 }}>{show.horario}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: corGenero }}>{artista?.nome ?? "Artista removido"}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                            {artista?.generos?.map(g => (
                              <span key={g} style={{ background: GENEROS[g]?.cor + "22", color: GENEROS[g]?.cor, border: `1px solid ${GENEROS[g]?.cor}44`, borderRadius: 20, padding: "1px 6px", fontSize: 10 }}>
                                {GENEROS[g]?.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ minWidth: 90, textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{formatarMoeda(show.cache)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {artista?.pix && <BotaoCopiarPix pix={artista.pix} />}
                          <span style={{ color: cor, fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[show.status] ?? show.status}</span>
                          {show.status !== "cancelado" && (
                            <button onClick={() => togglePago(show)} disabled={carregando[show.id]}
                              title={show.status === "pago" ? "Marcar como pendente" : "Marcar como pago"}
                              style={{
                                background: show.status === "pago" ? "var(--success)22" : "var(--bg3)",
                                border: `1px solid ${show.status === "pago" ? "var(--success)" : "var(--border)"}`,
                                borderRadius: 6, padding: "5px 8px", cursor: "pointer",
                                color: show.status === "pago" ? "var(--success)" : "var(--text2)",
                                display: "flex", alignItems: "center",
                              }}>
                              <IconCheck size={13} />
                            </button>
                          )}
                          <button onClick={() => setModalEditar(show)} title="Editar show"
                            style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "var(--text2)", fontSize: 12 }}>
                            ✏️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModalEditarShow({ show, artistas, onSalvar, onFechar }) {
  const artista = artistas.find(a => a.id === show.artistaId);
  const [data, setData] = useState(show.data ?? "");
  const [horario, setHorario] = useState(show.horario ?? "");
  const [cache, setCache] = useState(show.cache ?? "");
  const [status, setStatus] = useState(show.status ?? "pendente");
  const [observacoes, setObservacoes] = useState(show.observacoes ?? "");
  const [horarioCustom, setHorarioCustom] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Slots padrão para o dia da semana escolhido
  const diaSemana = data ? new Date(data + "T12:00:00").getDay() : null;
  const slots = diaSemana !== null ? (REGRAS_DIA[diaSemana]?.slots ?? []) : [];

  async function salvar() {
    if (!data || !horario) return;
    setSalvando(true);
    try {
      await onSalvar({ ...show, data, horario, cache: Number(cache) || 0, status, observacoes });
    } finally {
      setSalvando(false);
    }
  }

  const horarioFinal = horarioCustom.trim() || horario;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>✏️ Editar Show</h3>
          <button onClick={onFechar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)" }}><IconX size={18} /></button>
        </div>

        {artista && (
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            Artista: <strong style={{ color: "var(--text)" }}>{artista.nome}</strong>
          </div>
        )}

        {/* Data */}
        <div>
          <label style={labelStyle}>Data</label>
          <input type="date" value={data} onChange={e => { setData(e.target.value); setHorario(""); setHorarioCustom(""); }} style={inputStyle} />
        </div>

        {/* Horário — slots do dia ou custom */}
        {data && (
          <div>
            <label style={labelStyle}>Horário</label>
            {slots.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {slots.map(s => (
                  <button key={s} type="button"
                    onClick={() => { setHorario(s); setHorarioCustom(""); }}
                    style={{
                      borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer",
                      background: horario === s && !horarioCustom ? "var(--primary)" : "var(--bg2)",
                      color: horario === s && !horarioCustom ? "#fff" : "var(--text2)",
                      border: `1px solid ${horario === s && !horarioCustom ? "var(--primary)" : "var(--border)"}`,
                      fontWeight: horario === s && !horarioCustom ? 700 : 400,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <input
              type="time"
              value={horarioCustom}
              onChange={e => { setHorarioCustom(e.target.value); setHorario(e.target.value); }}
              placeholder="Horário personalizado"
              style={{ ...inputStyle, fontSize: 13 }}
            />
          </div>
        )}

        {/* Cachê */}
        <div>
          <label style={labelStyle}>Cachê (R$)</label>
          <input type="number" value={cache} onChange={e => setCache(e.target.value)} min={0} style={inputStyle} />
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
            <option value="pendente">⏳ Pendente</option>
            <option value="pago">✅ Pago</option>
            <option value="cancelado">❌ Cancelado</option>
          </select>
        </div>

        {/* Observações */}
        <div>
          <label style={labelStyle}>Observações</label>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onFechar} style={btnSecondary}>Cancelar</button>
          <button onClick={salvar} disabled={!data || !horario || salvando} style={btnPrimary}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, valor, cor }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: cor, fontWeight: 700, fontSize: 18 }}>{formatarMoeda(valor)}</div>
    </div>
  );
}

const inputStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", outline: "none", width: "100%" };
const labelStyle = { display: "block", color: "var(--text2)", fontSize: 12, marginBottom: 5 };
const btnPrimary = { background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer" };
const btnSecondary = { background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer" };
