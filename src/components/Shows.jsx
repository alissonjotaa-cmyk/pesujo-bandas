import { useState, useMemo } from "react";
import { fbSet } from "../firebase";
import { GENEROS } from "../regras";
import { formatarMoeda, formatarData } from "../utils";
import { IconCheck, IconClock, IconFilter, IconDollar } from "../icons";

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

export default function Shows({ shows, artistas, onAtualizar }) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [carregando, setCarregando] = useState({});

  const lista = useMemo(() => {
    let r = [...shows].sort((a, b) => b.data?.localeCompare(a.data ?? "") ?? 0);
    if (filtroStatus) r = r.filter(s => s.status === filtroStatus);
    if (filtroMes) r = r.filter(s => s.data?.startsWith(filtroMes));
    return r;
  }, [shows, filtroStatus, filtroMes]);

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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.map(show => {
            const artista = artistas.find(a => a.id === show.artistaId);
            const cor = STATUS_COR[show.status] ?? "var(--text3)";
            const corGenero = artista?.generos?.[0] ? GENEROS[artista.generos[0]]?.cor : "var(--border)";

            return (
              <div key={show.id} style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              }}>
                {/* Data/hora */}
                <div style={{ minWidth: 90 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{formatarData(show.data)}</div>
                  <div style={{ color: "var(--text3)", fontSize: 11 }}>{show.horario}</div>
                </div>

                {/* Artista */}
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

                {/* Cachê */}
                <div style={{ minWidth: 90, textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{formatarMoeda(show.cache)}</div>
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {artista?.pix && <BotaoCopiarPix pix={artista.pix} />}
                  <span style={{ color: cor, fontSize: 12, fontWeight: 600 }}>
                    {STATUS_LABEL[show.status] ?? show.status}
                  </span>
                  {show.status !== "cancelado" && (
                    <button
                      onClick={() => togglePago(show)}
                      disabled={carregando[show.id]}
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
                </div>
              </div>
            );
          })}
        </div>
      )}
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

const inputStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", outline: "none" };
