import { useState, useEffect } from "react";
import { db, fbSet, fbGetAllQuery, where } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { nanoid, formatarData, formatarMoeda } from "../utils";
import { IconCheck, IconX, IconCalendar } from "../icons";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function diaSemanaStr(dataIso) {
  return DIAS_SEMANA[new Date(dataIso + "T12:00:00").getDay()];
}

export default function ConvitePublico({ id }) {
  const [convite, setConvite] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [decisoes, setDecisoes] = useState({}); // { slotIndex: "aceito" | "recusado" }
  const [observacoes, setObservacoes] = useState({}); // { slotIndex: string }
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    getDoc(doc(db, "bandas_convites", id)).then(snap => {
      if (snap.exists()) setConvite({ id: snap.id, ...snap.data() });
      setCarregando(false);
    });
  }, [id]);

  function toggleDecisao(idx, valor) {
    setDecisoes(prev => ({ ...prev, [idx]: prev[idx] === valor ? undefined : valor }));
  }

  const todasRespondidas = convite?.slots?.every((_, i) => decisoes[i] !== undefined);

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      const showsExistentes = await fbGetAllQuery("bandas_shows", where("status", "!=", "cancelado"));
      const slotOcupado = (data, horario) =>
        showsExistentes.some(s => s.data === data && s.horario === horario);

      const slotsAtualizados = [];
      const aceitos = [];
      const conflitos = [];
      const recusados = [];

      for (let i = 0; i < convite.slots.length; i++) {
        const slot = convite.slots[i];
        const decisao = decisoes[i];

        const obs = observacoes[i]?.trim() ?? "";
        if (decisao === "recusado") {
          slotsAtualizados.push({ ...slot, status: "recusado_artista", observacaoArtista: obs });
          recusados.push(slot);
        } else if (decisao === "aceito") {
          if (slotOcupado(slot.data, slot.horario)) {
            slotsAtualizados.push({ ...slot, status: "conflito", observacaoArtista: obs });
            conflitos.push(slot);
          } else {
            const showId = nanoid();
            await fbSet("bandas_shows", showId, {
              id: showId,
              artistaId: convite.artistaId,
              data: slot.data,
              horario: slot.horario,
              cache: slot.cache ?? 0,
              formacaoIdx: slot.formacaoIdx ?? 0,
              status: "pendente",
              observacoes: obs,
            });
            slotsAtualizados.push({ ...slot, status: "aceito", observacaoArtista: obs });
            aceitos.push({ ...slot, observacaoArtista: obs });
          }
        } else {
          slotsAtualizados.push({ ...slot, status: "pendente" });
        }
      }

      const algumAceito = aceitos.length > 0;
      const todosAceitos = aceitos.length === convite.slots.length;
      const novoStatus = todosAceitos ? "aceito"
        : algumAceito ? "aceito_parcial"
        : recusados.length === convite.slots.length ? "recusado"
        : "conflito_total";

      await fbSet("bandas_convites", convite.id, {
        ...convite,
        slots: slotsAtualizados,
        status: novoStatus,
        respondidoEm: new Date().toISOString(),
      });

      setConvite(c => ({ ...c, slots: slotsAtualizados, status: novoStatus }));
      setResultado({ aceitos, conflitos, recusados });
    } catch (err) {
      console.error("Erro ao confirmar convite:", err);
      setErro(
        err?.code === "permission-denied"
          ? "Sem permissão para salvar. Verifique as regras do Firebase (bandas_shows e bandas_convites precisam permitir escrita pública)."
          : `Erro ao confirmar: ${err?.message ?? "Tente novamente."}`
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return (
    <div style={pageWrap}>
      <Logo />
      <div style={{ color: "var(--text3)", marginTop: 40 }}>Carregando convite…</div>
    </div>
  );

  if (!convite) return (
    <div style={pageWrap}>
      <Logo />
      <div style={card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Convite não encontrado</h2>
        <p style={{ color: "var(--text2)", fontSize: 14 }}>O link pode estar incorreto ou o convite foi removido.</p>
      </div>
    </div>
  );

  // Já respondido anteriormente
  if (!resultado && convite.status !== "pendente") {
    return (
      <div style={pageWrap}>
        <Logo />
        <div style={card}>
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>
            {convite.status === "recusado" ? "🙅 Convite recusado" : "📋 Resposta já enviada"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {convite.slots.map((s, i) => <SlotRow key={i} slot={s} />)}
          </div>
        </div>
      </div>
    );
  }

  // Resultado pós-confirmação nesta sessão
  if (resultado) {
    return (
      <div style={pageWrap}>
        <Logo />
        <div style={card}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>
            {resultado.conflitos.length === 0 && resultado.recusados.length === 0 ? "🎉"
              : resultado.aceitos.length === 0 ? "🙅"
              : "⚠️"}
          </div>
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>
            {resultado.aceitos.length === 0 ? "Nenhum show confirmado"
              : resultado.conflitos.length === 0 && resultado.recusados.length === 0 ? "Tudo confirmado!"
              : "Confirmação parcial"}
          </h2>
          {resultado.aceitos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={sectionLabel("#10b981")}>✅ Shows confirmados</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resultado.aceitos.map((s, i) => <SlotRow key={i} slot={{ ...s, status: "aceito" }} />)}
              </div>
            </div>
          )}
          {resultado.conflitos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={sectionLabel("#ef4444")}>❌ Horário já ocupado por outro artista</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resultado.conflitos.map((s, i) => <SlotRow key={i} slot={{ ...s, status: "conflito" }} />)}
              </div>
            </div>
          )}
          {resultado.recusados.length > 0 && (
            <div>
              <div style={sectionLabel("var(--text3)")}>— Recusados por você</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resultado.recusados.map((s, i) => <SlotRow key={i} slot={{ ...s, status: "recusado_artista" }} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Convite pendente — aguarda resposta individual
  return (
    <div style={pageWrap}>
      <Logo />
      <div style={card}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Convite para</div>
          <h2 style={{ fontWeight: 700, fontSize: 22 }}>{convite.artistaNome}</h2>
          {convite.mensagem && (
            <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 10, lineHeight: 1.6, borderLeft: "3px solid var(--primary)", paddingLeft: 12 }}>
              {convite.mensagem}
            </p>
          )}
        </div>

        <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <IconCalendar size={13} /> Marque cada data: aceitar ou recusar
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {convite.slots.map((slot, i) => {
            const dec = decisoes[i];
            return (
              <div key={i} style={{
                background: "var(--bg2)", borderRadius: 10, padding: "12px 14px",
                border: `1px solid ${dec === "aceito" ? "#10b98155" : dec === "recusado" ? "#ef444455" : "var(--border)"}`,
                transition: "border-color 0.15s",
              }}>
                {/* Info do slot */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {diaSemanaStr(slot.data)}, {formatarData(slot.data)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{slot.horario}</div>
                    {slot.formacaoNome && (
                      <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                        {slot.formacaoNome} · {slot.formacaoIntegrantes} int.
                      </div>
                    )}
                  </div>
                  {slot.cache > 0 && (
                    <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>
                      {formatarMoeda(slot.cache)}
                    </div>
                  )}
                </div>

                {/* Observação */}
                <input
                  type="text"
                  maxLength={120}
                  placeholder="Observação para este dia (opcional)…"
                  value={observacoes[i] ?? ""}
                  onChange={e => setObservacoes(prev => ({ ...prev, [i]: e.target.value }))}
                  style={{
                    width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 7, padding: "7px 10px", color: "var(--text)",
                    fontSize: 12, outline: "none", marginBottom: 8, boxSizing: "border-box",
                  }}
                />

                {/* Botões de decisão */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => toggleDecisao(i, "recusado")}
                    style={{
                      flex: 1, borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: dec === "recusado" ? "#ef444422" : "transparent",
                      border: `1.5px solid ${dec === "recusado" ? "#ef4444" : "var(--border)"}`,
                      color: dec === "recusado" ? "#ef4444" : "var(--text3)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                    <IconX size={14} /> Recusar
                  </button>
                  <button onClick={() => toggleDecisao(i, "aceito")}
                    style={{
                      flex: 1, borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: dec === "aceito" ? "#10b98122" : "transparent",
                      border: `1.5px solid ${dec === "aceito" ? "#10b981" : "var(--border)"}`,
                      color: dec === "aceito" ? "#10b981" : "var(--text3)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                    <IconCheck size={14} /> Aceitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {erro && (
          <div style={{
            background: "#ef444420", border: "1px solid #ef444488",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            color: "#ef4444", fontSize: 13, lineHeight: 1.5,
          }}>
            {erro}
          </div>
        )}

        <button onClick={confirmar} disabled={!todasRespondidas || enviando}
          style={{
            width: "100%", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: todasRespondidas ? "pointer" : "not-allowed",
            background: todasRespondidas ? "var(--primary)" : "var(--bg3)",
            color: todasRespondidas ? "#fff" : "var(--text3)",
            border: "none", transition: "background 0.15s",
          }}>
          {enviando ? "Enviando…" : todasRespondidas ? "Confirmar respostas" : `Responda todas as ${convite.slots.length} datas para continuar`}
        </button>

        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
          Ao confirmar, os shows aceitos serão registrados automaticamente. Horários já ocupados por outro artista serão negados mesmo que você aceite.
        </p>
      </div>
    </div>
  );
}

function SlotRow({ slot }) {
  const isAceito = slot.status === "aceito";
  const isRecusado = slot.status === "recusado_artista" || slot.status === "conflito";
  const cor = isAceito ? "#10b981" : isRecusado ? "#ef4444" : "var(--text)";
  const badge = slot.status === "aceito" ? "✅ Confirmado"
    : slot.status === "conflito" ? "❌ Horário ocupado"
    : slot.status === "recusado_artista" ? "❌ Recusado"
    : null;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: isAceito ? "#10b98115" : isRecusado ? "#ef444420" : "var(--bg2)",
      borderRadius: 8, padding: "10px 14px",
      border: `1px solid ${isAceito ? "#10b98155" : isRecusado ? "#ef444488" : "var(--border)"}`,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {DIAS_SEMANA[new Date(slot.data + "T12:00:00").getDay()]}, {formatarData(slot.data)}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{slot.horario}</div>
        {slot.formacaoNome && (
          <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>{slot.formacaoNome}</div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        {slot.cache > 0 && <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>{formatarMoeda(slot.cache)}</div>}
        {badge && <div style={{ fontSize: 11, color: cor, fontWeight: 600, marginTop: 2 }}>{badge}</div>}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <img src="/logo-pesujo.png" alt="Bar Pé Sujo" style={{ height: 48, objectFit: "contain" }} />
    </div>
  );
}

function sectionLabel(cor) {
  return { fontSize: 12, color: cor, fontWeight: 700, marginBottom: 8 };
}

const pageWrap = {
  minHeight: "100vh", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  padding: "32px 16px", background: "var(--bg)",
};
const card = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 16, padding: 28, width: "100%", maxWidth: 460,
};
