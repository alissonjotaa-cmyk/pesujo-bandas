import { useState, useMemo } from "react";
import { GENEROS, MESES } from "../regras";
import { formatarData } from "../utils";
import { IconDownload, IconImage, IconChevronLeft, IconChevronRight } from "../icons";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Marketing({ shows, artistas }) {
  const hoje = new Date();
  const [mesIdx, setMesIdx] = useState(hoje.getMonth());
  const [anoIdx, setAnoIdx] = useState(hoje.getFullYear());

  const mesFiltro = `${anoIdx}-${String(mesIdx + 1).padStart(2, "0")}`;

  const showsDoMes = useMemo(() => {
    return shows
      .filter(s => s.data?.startsWith(mesFiltro) && s.status !== "cancelado")
      .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
  }, [shows, mesFiltro]);

  function navMes(dir) {
    let nm = mesIdx + dir;
    if (nm < 0) { setAnoIdx(a => a - 1); setMesIdx(11); }
    else if (nm > 11) { setAnoIdx(a => a + 1); setMesIdx(0); }
    else setMesIdx(nm);
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🎨 Marketing</h2>
        <p style={{ color: "var(--text2)", fontSize: 13 }}>
          Visualize os shows agendados e baixe as fotos dos artistas para divulgação.
        </p>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navMes(-1)} style={iconBtn}><IconChevronLeft size={16} /></button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: "center" }}>
          {MESES[mesIdx]} {anoIdx}
        </span>
        <button onClick={() => navMes(1)} style={iconBtn}><IconChevronRight size={16} /></button>
        <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text3)" }}>
          {showsDoMes.length} show{showsDoMes.length !== 1 ? "s" : ""} agendado{showsDoMes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {showsDoMes.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 64 }}>
          <IconImage size={48} />
          <p style={{ marginTop: 16, fontSize: 14 }}>Nenhum show agendado neste mês.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {showsDoMes.map(show => {
            const artista = artistas.find(a => a.id === show.artistaId);
            const diaSemana = new Date(show.data + "T12:00:00").getDay();
            const generos = show.generoId
              ? [show.generoId]
              : (artista?.generos ?? []);
            const corPrimaria = generos[0] ? (GENEROS[generos[0]]?.cor ?? "var(--primary)") : "var(--primary)";

            return (
              <ShowCard
                key={show.id}
                show={show}
                artista={artista}
                diaSemana={diaSemana}
                generos={generos}
                corPrimaria={corPrimaria}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShowCard({ show, artista, diaSemana, generos, corPrimaria }) {
  const [baixando, setBaixando] = useState(false);

  async function baixarFoto() {
    const url = artista?.fotoUrl;
    if (!url) return;
    setBaixando(true);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const nomeArquivo = `${artista.nome} - ${show.data}.${ext}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = nomeArquivo;
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
      background: "var(--card)", border: `1px solid ${corPrimaria}44`,
      borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      boxShadow: `0 2px 12px ${corPrimaria}18`,
    }}>
      {/* Foto */}
      <div style={{ position: "relative", aspectRatio: "4/3", background: "var(--bg2)", overflow: "hidden" }}>
        {artista?.fotoUrl ? (
          <img
            src={artista.fotoUrl}
            alt={artista.nome}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--text3)" }}>
            <IconImage size={40} />
            <span style={{ fontSize: 11 }}>Sem foto</span>
          </div>
        )}

        {/* Badge data sobre a foto */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: "rgba(0,0,0,0.72)", borderRadius: 8,
          padding: "5px 10px", backdropFilter: "blur(6px)",
        }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
            {show.data.split("-").reverse().join("/")}
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10 }}>
            {DIAS_SEMANA[diaSemana]} · {show.horario}
          </div>
        </div>

        {/* Botão download sobre a foto */}
        {artista?.fotoUrl && (
          <button
            onClick={baixarFoto}
            disabled={baixando}
            title="Baixar foto"
            style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 8,
              padding: "7px 9px", cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
              backdropFilter: "blur(6px)",
              opacity: baixando ? 0.6 : 1,
            }}>
            <IconDownload size={13} />
            {baixando ? "…" : "Baixar"}
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", lineHeight: 1.2 }}>
          {artista?.nome ?? "Artista removido"}
        </div>

        {/* Gêneros */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {generos.map(g => {
            const cor = GENEROS[g]?.cor ?? "var(--border)";
            return (
              <span key={g} style={{
                background: cor + "22", color: cor,
                border: `1px solid ${cor}55`,
                borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
              }}>
                {GENEROS[g]?.label ?? g}
              </span>
            );
          })}
        </div>

        {/* Formação do show */}
        {artista?.formacoes && artista.formacoes.length > 0 && (() => {
          const f = artista.formacoes[show.formacaoIdx ?? 0] ?? artista.formacoes[0];
          return f ? (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {f.nome ? `${f.nome} · ` : ""}{f.integrantes} integrante{f.integrantes !== 1 ? "s" : ""}
            </div>
          ) : null;
        })()}

        {/* Observações */}
        {show.observacoes && (
          <div style={{
            fontSize: 11, color: "var(--text2)", background: "var(--bg2)",
            borderRadius: 6, padding: "6px 9px", lineHeight: 1.5,
          }}>
            {show.observacoes}
          </div>
        )}

        {/* Sem foto — link direto */}
        {!artista?.fotoUrl && (
          <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>
            Nenhuma foto cadastrada para este artista.
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = {
  background: "var(--bg2)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "7px 10px", cursor: "pointer",
  color: "var(--text2)", display: "flex", alignItems: "center",
};
