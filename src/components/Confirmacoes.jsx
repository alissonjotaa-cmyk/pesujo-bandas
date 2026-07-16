import { useState, useMemo } from "react";
import { formatarData, formatarMoeda } from "../utils";
import { getFormacoes, MESES } from "../regras";
import { IconPhone, IconSend, IconUsers } from "../icons";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function showInfo(s, artista) {
  const diaSem = DIAS_SEMANA[new Date(s.data + "T12:00:00").getDay()];
  const data = formatarData(s.data);
  const formacoes = getFormacoes(artista);
  const formacao = formacoes[s.formacaoIdx ?? 0];
  const nomeFormacao = formacao?.nome || (formacoes.length > 1 ? `Formação ${(s.formacaoIdx ?? 0) + 1}` : "");
  return { diaSem, data, nomeFormacao };
}

// Agrupa shows por "YYYY-MM"
function agruparPorMes(shows) {
  const grupos = [];
  const map = {};
  shows.forEach(s => {
    const chave = s.data.slice(0, 7);
    if (!map[chave]) {
      const [ano, mes] = chave.split("-").map(Number);
      map[chave] = { chave, label: `${MESES[mes - 1]} ${ano}`, shows: [] };
      grupos.push(map[chave]);
    }
    map[chave].shows.push(s);
  });
  return grupos;
}

export default function Confirmacoes({ artistas, shows }) {
  const [artistaId, setArtistaId] = useState("");

  const hoje = new Date().toISOString().slice(0, 10);
  const artista = artistas.find(a => a.id === artistaId) ?? null;

  const showsArtista = useMemo(() => {
    if (!artistaId) return [];
    return shows
      .filter(s => s.artistaId === artistaId && s.data >= hoje && s.status !== "cancelado")
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [artistaId, shows, hoje]);

  const grupos = useMemo(() => agruparPorMes(showsArtista), [showsArtista]);

  // Mensagem para WhatsApp — sem emojis, com •
  const mensagemWpp = useMemo(() => {
    if (!artista || showsArtista.length === 0) return "";

    const blocos = grupos.map(g => {
      const linhas = g.shows.map(s => {
        const { diaSem, data, nomeFormacao } = showInfo(s, artista);
        const cache = s.cache > 0 ? ` · Cache: ${formatarMoeda(s.cache)}` : "";
        const partes = [
          `• ${diaSem}, ${data} as ${s.horario}`,
          nomeFormacao ? `  • ${nomeFormacao}` : null,
          `  • Cache${cache || ": A confirmar"}`,
        ].filter(Boolean);
        return partes.join("\n");
      });
      return `*${g.label}*\n${linhas.join("\n\n")}`;
    });

    return (
      `Ola ${artista.nome}! Seguem suas proximas datas no Bar Pe Sujo:\n\n` +
      blocos.join("\n\n") +
      `\n\nQualquer duvida, estamos a disposicao!`
    );
  }, [artista, showsArtista, grupos]);

  const numWpp = artista?.contato?.replace(/\D/g, "");
  const linkWpp = numWpp
    ? `https://wa.me/55${numWpp}?text=${encodeURIComponent(mensagemWpp)}`
    : `https://wa.me/?text=${encodeURIComponent(mensagemWpp)}`;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>✅ Confirmações</h2>

      {/* Seleção de artista */}
      <div style={card}>
        <label style={{ display: "block", color: "var(--text2)", fontSize: 12, marginBottom: 6 }}>
          Selecione o artista
        </label>
        <select value={artistaId} onChange={e => setArtistaId(e.target.value)} style={inputStyle}>
          <option value="">— escolha um artista —</option>
          {[...artistas]
            .filter(a => (a.status ?? "ativo") !== "pendente")
            .sort((a, b) => a.nome?.localeCompare(b.nome ?? "") ?? 0)
            .map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        {artista?.contato && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: "var(--text3)", fontSize: 12 }}>
            <IconPhone size={12} /> {artista.contato}
          </div>
        )}
      </div>

      {/* Shows futuros agrupados por mês */}
      {artista && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <IconUsers size={14} color="var(--text2)" />
            <span style={{ fontWeight: 700 }}>{artista.nome}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>
              {showsArtista.length} show{showsArtista.length !== 1 ? "s" : ""}
            </span>
          </div>

          {showsArtista.length === 0 ? (
            <p style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Nenhum show futuro agendado para este artista.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {grupos.map(g => (
                <div key={g.chave}>
                  {/* Título do mês */}
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", color: "var(--primary-light)",
                    borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 10,
                  }}>
                    {g.label}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {g.shows.map(s => {
                      const { diaSem, data, nomeFormacao } = showInfo(s, artista);
                      const statusCor = s.status === "pago" ? "#10b981" : "#f59e0b";
                      return (
                        <div key={s.id} style={{
                          background: "var(--bg2)", borderRadius: 10, padding: "12px 14px",
                          border: "1px solid var(--border)",
                          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                              {diaSem}, {data}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                              {s.horario}{nomeFormacao ? ` · ${nomeFormacao}` : ""}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {s.cache > 0 && (
                              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>
                                {formatarMoeda(s.cache)}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: statusCor, fontWeight: 600, marginTop: 2, textTransform: "capitalize" }}>
                              {s.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showsArtista.length > 0 && (
            <>
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Prévia da mensagem</div>
                <pre style={{
                  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "12px 14px", fontSize: 12, color: "var(--text2)", lineHeight: 1.8,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit",
                }}>
                  {mensagemWpp}
                </pre>
              </div>

              <a href={linkWpp} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 14, padding: "12px 0", borderRadius: 10, textDecoration: "none",
                background: "#25d366", color: "#fff", fontWeight: 700, fontSize: 14,
              }}>
                <IconSend size={14} color="#fff" />
                Enviar via WhatsApp
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };
const inputStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", width: "100%", outline: "none" };
