import { useState, useMemo } from "react";
import { GENEROS } from "../regras";
import { IconDownload, IconImage, IconChevronLeft, IconChevronRight } from "../icons";

const DIAS_SEMANA_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// Grid exibe Seg→Dom
const ORDEM_GRID = [1, 2, 3, 4, 5, 6, 0];
const LABELS_GRID = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function inicioSemana(ref) {
  // Segunda-feira da semana que contém `ref`
  const d = new Date(ref);
  const dia = d.getDay(); // 0=dom
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function addDias(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function Marketing({ shows, artistas }) {
  const hoje = new Date();
  const [semanaBase, setSemanaBase] = useState(() => inicioSemana(hoje));

  const dias = useMemo(() =>
    ORDEM_GRID.map((_, i) => addDias(semanaBase, i)),
    [semanaBase]
  );

  const showsPorData = useMemo(() => {
    const idx = {};
    shows.forEach(s => {
      if (s.status === "cancelado") return;
      if (!idx[s.data]) idx[s.data] = [];
      idx[s.data].push(s);
    });
    Object.values(idx).forEach(arr =>
      arr.sort((a, b) => a.horario.localeCompare(b.horario))
    );
    return idx;
  }, [shows]);

  function navSemana(dir) {
    setSemanaBase(b => addDias(b, dir * 7));
  }

  const inicioStr = toDateStr(dias[0]);
  const fimStr    = toDateStr(dias[6]);
  const todayStr  = toDateStr(hoje);

  // Label do período
  const mesInicio = dias[0].toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const mesFim    = dias[6].toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const anoInicio = dias[0].getFullYear();
  const anoFim    = dias[6].getFullYear();
  const periodoLabel = anoInicio === anoFim && mesInicio === mesFim
    ? `${dias[0].getDate()} – ${dias[6].getDate()} de ${mesInicio} ${anoInicio}`
    : anoInicio === anoFim
    ? `${dias[0].getDate()} ${mesInicio} – ${dias[6].getDate()} ${mesFim} ${anoInicio}`
    : `${dias[0].getDate()} ${mesInicio} ${anoInicio} – ${dias[6].getDate()} ${mesFim} ${anoFim}`;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🎨 Marketing</h2>
        <p style={{ color: "var(--text2)", fontSize: 13 }}>
          Grade semanal de shows para divulgação. Baixe as fotos dos artistas diretamente.
        </p>
      </div>

      {/* Navegação de semana */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => navSemana(-1)} style={iconBtn}><IconChevronLeft size={16} /></button>
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1, textAlign: "center" }}>
          {periodoLabel}
        </span>
        <button onClick={() => navSemana(1)} style={iconBtn}><IconChevronRight size={16} /></button>
        <button
          onClick={() => setSemanaBase(inicioSemana(hoje))}
          style={{ ...iconBtn, fontSize: 11, padding: "6px 12px", whiteSpace: "nowrap" }}>
          Hoje
        </button>
      </div>

      {/* Grid semanal — scroll horizontal no mobile */}
      <div style={{ overflowX: "auto", margin: "0 -16px", padding: "0 16px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(130px, 1fr))", gap: 8, minWidth: 700 }}>

          {/* Cabeçalhos */}
          {dias.map((d, i) => {
            const dStr = toDateStr(d);
            const isHoje = dStr === todayStr;
            return (
              <div key={i} style={{
                textAlign: "center", padding: "8px 4px",
                borderRadius: 8,
                background: isHoje ? "var(--primary)22" : "transparent",
                border: isHoje ? "1px solid var(--primary)55" : "1px solid transparent",
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
                  color: isHoje ? "var(--primary-light)" : "var(--text3)",
                }}>
                  {LABELS_GRID[i]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700,
                  color: isHoje ? "var(--primary-light)" : "var(--text)",
                  lineHeight: 1.2,
                }}>
                  {d.getDate()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>
                  {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                </div>
              </div>
            );
          })}

          {/* Colunas de shows */}
          {dias.map((d, i) => {
            const dStr = toDateStr(d);
            const showsDia = showsPorData[dStr] ?? [];
            const isHoje = dStr === todayStr;
            return (
              <div key={i} style={{
                display: "flex", flexDirection: "column", gap: 8,
                padding: "4px 0",
                borderTop: `2px solid ${isHoje ? "var(--primary)66" : "var(--border)"}`,
              }}>
                {showsDia.length === 0 ? (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    minHeight: 60, color: "var(--border)", fontSize: 18,
                  }}>
                    —
                  </div>
                ) : (
                  showsDia.map(show => (
                    <ShowCard key={show.id} show={show} artistas={artistas} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShowCard({ show, artistas }) {
  const [baixando, setBaixando] = useState(false);
  const artista = artistas.find(a => a.id === show.artistaId);

  const generos = show.generoId ? [show.generoId] : (artista?.generos ?? []);
  const corPrimaria = generos[0] ? (GENEROS[generos[0]]?.cor ?? "var(--primary)") : "var(--primary)";

  async function baixarFoto() {
    const url = artista?.fotoUrl;
    if (!url) return;
    setBaixando(true);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${artista.nome} - ${show.data}.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(artista.fotoUrl, "_blank");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${corPrimaria}44`,
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: `0 1px 6px ${corPrimaria}15`,
    }}>
      {/* Foto */}
      <div style={{ position: "relative", aspectRatio: "3/2", background: "var(--bg2)", overflow: "hidden" }}>
        {artista?.fotoUrl ? (
          <img
            src={artista.fotoUrl}
            alt={artista.nome}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--border)",
          }}>
            <IconImage size={28} />
          </div>
        )}

        {/* Horário */}
        <div style={{
          position: "absolute", bottom: 6, left: 6,
          background: "rgba(0,0,0,0.7)", borderRadius: 5,
          padding: "2px 7px", fontSize: 11, fontWeight: 700, color: "#fff",
          backdropFilter: "blur(4px)",
        }}>
          {show.horario}
        </div>

        {/* Botão download */}
        {artista?.fotoUrl && (
          <button
            onClick={baixarFoto}
            disabled={baixando}
            title="Baixar foto"
            style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 6,
              padding: "5px 7px", cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
              backdropFilter: "blur(4px)",
              opacity: baixando ? 0.5 : 1,
            }}>
            <IconDownload size={11} />
            {baixando ? "…" : "Baixar"}
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "8px 9px 10px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text)", marginBottom: 4, lineHeight: 1.2 }}>
          {artista?.nome ?? "?"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {generos.slice(0, 2).map(g => {
            const cor = GENEROS[g]?.cor ?? "var(--border)";
            return (
              <span key={g} style={{
                background: cor + "22", color: cor,
                border: `1px solid ${cor}44`,
                borderRadius: 20, padding: "1px 6px", fontSize: 10, fontWeight: 600,
              }}>
                {GENEROS[g]?.label ?? g}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const iconBtn = {
  background: "var(--bg2)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "7px 10px", cursor: "pointer",
  color: "var(--text2)", display: "flex", alignItems: "center",
};
