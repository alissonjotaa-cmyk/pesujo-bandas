import { useState, useMemo, useEffect } from "react";
import { fbDel } from "../firebase";
import { REGRAS_DIA, GENEROS, artistasElegiveisParaSlot, getFormacoes } from "../regras";
import { formatarMoeda, diasNoMes, primeiroDiaSemana } from "../utils";
import { IconChevronLeft, IconChevronRight, IconX, IconCheck, IconPlus, IconTrash, IconClock } from "../icons";
import { MESES } from "../regras";

export default function Calendario({ artistas, shows, onAtualizar, onSalvarShow, agendarArtista, onAgendarClear, onConvite }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [modalSlot, setModalSlot] = useState(null); // { data, horario, show?, customHorario? }

  useEffect(() => {
    if (!agendarArtista) return;
    const dataHoje = hoje.toISOString().slice(0, 10);
    setModalSlot({ data: dataHoje, horario: "", show: null, customHorario: true, preArtista: agendarArtista });
    onAgendarClear();
  }, [agendarArtista]); // eslint-disable-line

  function navMes(dir) {
    setMes(m => {
      let nm = m + dir;
      if (nm < 0) { setAno(a => a - 1); return 11; }
      if (nm > 11) { setAno(a => a + 1); return 0; }
      return nm;
    });
  }

  const dias = diasNoMes(ano, mes);
  const inicioDiaSemana = primeiroDiaSemana(ano, mes);

  // Indexa shows por "data|horario" e também por data (para shows extras)
  const showsIdx = useMemo(() => {
    const idx = {};
    shows.forEach(s => { idx[`${s.data}|${s.horario}`] = s; });
    return idx;
  }, [shows]);

  // Mostra extras (horários não predefinidos) por data
  const showsExtrasPorData = useMemo(() => {
    const extras = {};
    shows.forEach(s => {
      const diaSemana = new Date(s.data + "T12:00:00").getDay();
      const regra = REGRAS_DIA[diaSemana];
      if (!regra?.slots?.includes(s.horario)) {
        if (!extras[s.data]) extras[s.data] = [];
        extras[s.data].push(s);
      }
    });
    return extras;
  }, [shows]);

  function showDoSlot(data, horario) {
    return showsIdx[`${data}|${horario}`] ?? null;
  }

  const todayStr = hoje.toISOString().slice(0, 10);

  async function salvarShow(dados) {
    await onSalvarShow(dados);
    onAtualizar();
    setModalSlot(null);
  }

  async function excluirShow(show) {
    if (!window.confirm("Remover este show?")) return;
    await fbDel("bandas_shows", show.id);
    onAtualizar();
    setModalSlot(null);
  }

  return (
    <div style={{ padding: "16px 12px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navMes(-1)} style={iconBtn}><IconChevronLeft size={18} /></button>
        <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "center" }}>
          {MESES[mes]} {ano}
        </h2>
        <button onClick={() => navMes(1)} style={iconBtn}><IconChevronRight size={18} /></button>
      </div>

      {/* Grid com scroll horizontal no mobile */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", margin: "0 -12px", padding: "0 12px 4px" }}>
        <div style={{ minWidth: 480 }}>

      {/* Legenda dias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => (
          <div key={d} style={{ textAlign: "center", color: "var(--text3)", fontSize: 11, fontWeight: 600, padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {Array.from({ length: inicioDiaSemana }).map((_, i) => <div key={`v${i}`} />)}

        {Array.from({ length: dias }, (_, i) => {
          const dia = i + 1;
          const dataStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const diaSemana = new Date(dataStr + "T12:00:00").getDay();
          const regra = REGRAS_DIA[diaSemana];
          const isHoje = dataStr === todayStr;
          const passado = dataStr < todayStr;

          return (
            <DiaCell key={dia}
              dia={dia}
              dataStr={dataStr}
              regra={regra}
              isHoje={isHoje}
              passado={passado}
              artistas={artistas}
              showDoSlot={showDoSlot}
              showsExtras={showsExtrasPorData[dataStr] ?? []}
              onClickSlot={(data, horario, show) => setModalSlot({ data, horario, show })}
              onNovoHorario={(data) => setModalSlot({ data, horario: "", show: null, customHorario: true })}
            />
          );
        })}
      </div>

        </div>{/* fim minWidth wrapper */}
      </div>{/* fim scroll wrapper */}

      {/* Legenda generos */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        {Object.entries(GENEROS).map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "var(--text2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.cor, display: "inline-block" }} />
            {v.label}
          </span>
        ))}
      </div>

      {modalSlot && (
        <ModalShow
          slot={modalSlot}
          artistas={artistas}
          onSalvar={salvarShow}
          onExcluir={excluirShow}
          onFechar={() => setModalSlot(null)}
          onConvite={artista => { setModalSlot(null); onConvite?.(artista); }}
        />
      )}

    </div>
  );
}

function corPorHorario(horario) {
  const hora = parseInt((horario ?? "0").split(":")[0], 10);
  return hora < 18 ? "#d97706" : "#dc2626";
}

function DiaCell({ dia, dataStr, regra, isHoje, passado, artistas, showDoSlot, showsExtras, onClickSlot, onNovoHorario }) {
  const fechado = regra?.fechado;

  return (
    <div style={{
      background: isHoje ? "var(--primary)15" : "var(--card)",
      border: isHoje ? "1px solid var(--primary)88" : "1px solid var(--border)",
      borderRadius: 6, padding: "6px 6px", minHeight: 100,
      opacity: fechado ? 0.35 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{
          fontSize: 11, fontWeight: isHoje ? 700 : 400,
          color: isHoje ? "var(--primary-light)" : passado ? "var(--text3)" : "var(--text2)",
        }}>{dia}</span>
        {!fechado && (
          <button
            onClick={() => onNovoHorario(dataStr)}
            title="Adicionar horário"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", padding: "1px 2px", lineHeight: 1,
              display: "flex", alignItems: "center", opacity: 0.6,
            }}>
            <IconPlus size={10} />
          </button>
        )}
      </div>

      {/* Slots predefinidos */}
      {!fechado && regra?.slots?.map(slot => {
        const show = showDoSlot(dataStr, slot);
        const artista = show ? artistas.find(a => a.id === show.artistaId) : null;
        const corGenero = show ? corPorHorario(slot) : "var(--border)";

        return (
          <button key={slot} onClick={() => onClickSlot(dataStr, slot, show || null)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              background: show ? corGenero + "22" : "var(--bg2)",
              border: `1px solid ${show ? corGenero + "55" : "var(--border)"}`,
              borderRadius: 5, padding: "4px 6px", marginBottom: 4,
              cursor: "pointer", color: show ? corGenero : "var(--text3)",
              fontSize: 11, fontWeight: show ? 600 : 400, lineHeight: 1.3,
            }}>
            <span style={{ color: "var(--text3)", fontSize: 10 }}>{slot} </span>
            {show ? (
              <span style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
                {/* Ponto do gênero selecionado, ou pontos de todos os gêneros se não houver seleção */}
                {(() => {
                  const generos = show.generoId
                    ? [show.generoId]
                    : (artista?.generos ?? []);
                  return generos.slice(0, 3).map(g => (
                    <span key={g} style={{ width: 5, height: 5, borderRadius: "50%", background: GENEROS[g]?.cor ?? corGenero, flexShrink: 0 }} />
                  ));
                })()}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {artista?.nome ?? "?"}
                </span>
              </span>
            ) : <span style={{ color: "var(--border)" }}>+ agendar</span>}
          </button>
        );
      })}

      {/* Slots extras (horários personalizados) */}
      {showsExtras.map(show => {
        const artista = artistas.find(a => a.id === show.artistaId);
        const corGenero = corPorHorario(show.horario);
        return (
          <button key={show.id} onClick={() => onClickSlot(dataStr, show.horario, show)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              background: corGenero + "22",
              border: `1px dashed ${corGenero}55`,
              borderRadius: 5, padding: "4px 6px", marginBottom: 4,
              cursor: "pointer", color: corGenero,
              fontSize: 11, fontWeight: 600, lineHeight: 1.3,
            }}>
            <span style={{ color: "var(--text3)", fontSize: 10 }}>{show.horario} </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
              {(() => {
                const generos = show.generoId ? [show.generoId] : (artista?.generos ?? []);
                return generos.slice(0, 3).map(g => (
                  <span key={g} style={{ width: 5, height: 5, borderRadius: "50%", background: GENEROS[g]?.cor ?? corGenero, flexShrink: 0 }} />
                ));
              })()}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artista?.nome ?? "?"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ModalShow({ slot, artistas, onSalvar, onExcluir, onFechar, onConvite }) {
  const { data: dataInicial, horario: horarioInicial, show, customHorario, preArtista } = slot;

  const artistaInicial = preArtista ?? (show?.artistaId ? artistas.find(a => a.id === show.artistaId) : null);
  const primeiraFormacaoInicial = artistaInicial ? getFormacoes(artistaInicial)[0] : null;

  const [form, setForm] = useState({
    artistaId: artistaInicial?.id ?? show?.artistaId ?? "",
    formacaoIdx: show?.formacaoIdx ?? 0,
    generoId: show?.generoId ?? artistaInicial?.generos?.[0] ?? "",
    cache: show?.cache ?? primeiraFormacaoInicial?.cache ?? "",
    status: show?.status ?? "pendente",
    observacoes: show?.observacoes ?? "",
    id: show?.id ?? undefined,
    data: dataInicial,
    horario: horarioInicial ?? "",
  });

  // Recalcula diaSemana/regra sempre que a data mudar
  const diaSemana = new Date(form.data + "T12:00:00").getDay();
  const elegíveis = artistasElegiveisParaSlot(artistas, form.data);
  const regra = REGRAS_DIA[diaSemana];

  const artistaSel = artistas.find(a => a.id === form.artistaId);
  const [editarHorario, setEditarHorario] = useState(!!customHorario || !horarioInicial);

  function submit(e) {
    e.preventDefault();
    if (!form.horario) return;
    onSalvar({ ...form, cache: Number(form.cache) || 0 });
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][diaSemana]}, {form.data.split("-").reverse().join("/")}
            </h3>
            <input
              type="date"
              value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value, horario: "" }))}
              style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", width: "auto" }}
            />
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>{regra?.descricao}</p>
          </div>
          <button onClick={onFechar} style={{ ...iconBtn, marginTop: -4 }}><IconX size={16} /></button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Horário — sempre editável */}
          <Field label="Horário">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {editarHorario ? (
                <input
                  type="time" value={form.horario}
                  onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                  required style={{ ...inputStyle, flex: 1 }}
                />
              ) : (
                <>
                  <div style={{
                    ...inputStyle, flex: 1, display: "flex", alignItems: "center",
                    gap: 8, color: "var(--text)", fontWeight: 600,
                  }}>
                    <IconClock size={14} color="var(--text3)" />
                    {form.horario}
                  </div>
                  <button type="button" onClick={() => setEditarHorario(true)}
                    style={{ ...iconBtn, whiteSpace: "nowrap", fontSize: 11, padding: "8px 10px" }}>
                    Alterar
                  </button>
                </>
              )}
            </div>
            {/* Atalhos de horários predefinidos do dia */}
            {regra?.slots?.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "var(--text3)", alignSelf: "center" }}>Padrões:</span>
                {regra.slots.map(s => (
                  <button key={s} type="button"
                    onClick={() => { setForm(f => ({ ...f, horario: s })); setEditarHorario(false); }}
                    style={{
                      background: form.horario === s ? "var(--primary)33" : "var(--bg3)",
                      border: `1px solid ${form.horario === s ? "var(--primary)" : "var(--border)"}`,
                      color: form.horario === s ? "var(--primary-light)" : "var(--text2)",
                      borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                    }}>{s}</button>
                ))}
              </div>
            )}
          </Field>

          {/* Artista */}
          <Field label="Artista">
            <select value={form.artistaId} onChange={e => {
              const a = artistas.find(x => x.id === e.target.value);
              const primeiraFormacao = a ? getFormacoes(a)[0] : null;
              setForm(f => ({ ...f, artistaId: e.target.value, formacaoIdx: 0, cache: primeiraFormacao?.cache ?? "", generoId: a?.generos?.[0] ?? "" }));
            }} required style={inputStyle}>
              <option value="">Selecione o artista…</option>
              {elegíveis.length > 0 && (
                <optgroup label="✅ Elegíveis para este dia">
                  {elegíveis.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </optgroup>
              )}
              {artistas.filter(a => !elegíveis.includes(a)).length > 0 && (
                <optgroup label="⚠️ Fora do perfil do dia">
                  {artistas.filter(a => !elegíveis.includes(a)).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </optgroup>
              )}
            </select>
          </Field>

          {artistaSel && (() => {
            const formacoes = getFormacoes(artistaSel);
            return (
              <div style={{ background: "var(--bg2)", borderRadius: 8, padding: 10, fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {artistaSel.generos?.length > 0 && (
                  <div>
                    {artistaSel.generos.length > 1 && (
                      <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 5 }}>Estilo para este show:</div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {artistaSel.generos.map(g => {
                        const cor = GENEROS[g]?.cor ?? "var(--border)";
                        const sel = form.generoId === g;
                        return (
                          <button key={g} type="button"
                            onClick={() => setForm(f => ({ ...f, generoId: g }))}
                            style={{
                              borderRadius: 20, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                              background: sel ? cor + "33" : "var(--bg3)",
                              border: `1px solid ${sel ? cor : "var(--border)"}`,
                              color: sel ? cor : "var(--text2)",
                            }}>
                            {GENEROS[g]?.label ?? g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {artistaSel.contato && <span style={{ color: "var(--text3)", fontSize: 11 }}>📞 {artistaSel.contato}</span>}
                {formacoes.length > 1 && (
                  <div>
                    <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 5 }}>Formação para este show:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {formacoes.map((f, i) => (
                        <button key={i} type="button"
                          onClick={() => setForm(fm => ({ ...fm, formacaoIdx: i, cache: f.cache ?? "" }))}
                          style={{
                            borderRadius: 20, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                            background: form.formacaoIdx === i ? "var(--primary)33" : "var(--bg3)",
                            border: `1px solid ${form.formacaoIdx === i ? "var(--primary)" : "var(--border)"}`,
                            color: form.formacaoIdx === i ? "var(--primary-light)" : "var(--text2)",
                          }}>
                          {f.nome || `Formação ${i + 1}`} · {f.integrantes} integrante{f.integrantes !== 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {formacoes.length === 1 && (
                  <div style={{ color: "var(--text2)", fontSize: 11 }}>
                    {formacoes[0].nome ? `${formacoes[0].nome} · ` : ""}{formacoes[0].integrantes} integrante{formacoes[0].integrantes !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            );
          })()}

          <Field label="Cachê (R$)">
            <input type="number" min="0" step="0.01" value={form.cache}
              onChange={e => setForm(f => ({ ...f, cache: e.target.value }))}
              style={inputStyle} placeholder="0,00" />
          </Field>

          <Field label="Status do pagamento">
            <div style={{ display: "flex", gap: 8 }}>
              {[["pendente","⏳ Pendente"], ["pago","✅ Pago"], ["cancelado","❌ Cancelado"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, status: v }))}
                  style={{
                    flex: 1, padding: "7px 4px", borderRadius: 8, cursor: "pointer", fontSize: 11,
                    background: form.status === v ? (v === "pago" ? "#10b98122" : v === "cancelado" ? "#ef444422" : "var(--primary)22") : "var(--bg2)",
                    border: `1px solid ${form.status === v ? (v === "pago" ? "#10b981" : v === "cancelado" ? "#ef4444" : "var(--primary)") : "var(--border)"}`,
                    color: form.status === v ? (v === "pago" ? "#10b981" : v === "cancelado" ? "#ef4444" : "var(--primary-light)") : "var(--text2)",
                    fontWeight: form.status === v ? 700 : 400,
                  }}>{l}</button>
              ))}
            </div>
          </Field>

          <Field label="Observações">
            <textarea value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Rider técnico, observações…" />
          </Field>


          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {show && (
              <button type="button" onClick={() => onExcluir(show)}
                style={{ ...iconBtn, padding: "9px 12px", color: "var(--danger)", border: "1px solid var(--danger)44" }}>
                <IconTrash size={14} />
              </button>
            )}
            <button type="button" onClick={onFechar} style={btnSecondary}>Cancelar</button>
            <button type="submit" style={{ ...btnPrimary, flex: 1 }}>
              {show ? "Atualizar" : "Agendar"}
            </button>
          </div>

          {form.artistaId && (
            <button
              type="button"
              onClick={() => {
                const artista = artistas.find(a => a.id === form.artistaId);
                if (artista) onConvite?.(artista);
              }}
              style={{
                ...btnPrimary, width: "100%", marginTop: 8,
                background: "#059669", border: "none",
              }}
            >
              ✉️ Enviar convite online
            </button>
          )}
        </form>
      </div>
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

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 };
const modalBox = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" };
const inputStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", width: "100%", outline: "none" };
const iconBtn = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center" };
const btnPrimary = { background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" };
const btnSecondary = { background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer" };
