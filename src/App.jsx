import { useEffect, useState, useCallback, useRef } from "react";
import { auth, onAuthStateChanged, signOut, fbGetOne, fbSet, fbListen, orderBy } from "./firebase";
import { nanoid } from "./utils";
import Login from "./components/Login";
import Artistas from "./components/Artistas";
import Calendario from "./components/Calendario";
import Shows from "./components/Shows";
import ConfigGeral from "./components/ConfigGeral";
import Convites from "./components/Convites";
import Marketing from "./components/Marketing";
import Confirmacoes from "./components/Confirmacoes";
import { IconCalendar, IconUsers, IconDollar, IconSettings, IconLogout, IconChevronLeft, IconChevronRight, IconMail, IconImage, IconCheck } from "./icons";

const PAPEIS_PERMITIDOS = ["gestor", "gerente"];

const ABAS = [
  { key: "calendario", label: "Calendário", icon: IconCalendar },
  { key: "shows",      label: "Shows",      icon: IconDollar },
  { key: "artistas",   label: "Artistas",   icon: IconUsers },
  { key: "convites",   label: "Convites",   icon: IconMail },
  { key: "marketing",      label: "Marketing",      icon: IconImage },
  { key: "confirmacoes",  label: "Confirmações",  icon: IconCheck },
  { key: "config",         label: "Config",         icon: IconSettings },
];

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 60;

export default function App() {
  const [user, setUser] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [aba, setAba] = useState("calendario");
  const [artistas, setArtistas] = useState([]);
  const [shows, setShows] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [agendarArtista, setAgendarArtista] = useState(null);
  const [convidarArtista, setConvidarArtista] = useState(null);
  const [tema, setTema] = useState(() => localStorage.getItem("tema") ?? "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
  }, [tema]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const pendentesRef = useRef(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u || null);
    if (u) setPerfil(await fbGetOne("users", u.uid));
    else setPerfil(null);
  }), []);

  useEffect(() => {
    if (!user) return;
    const unsub1 = fbListen("bandas_artistas", (lista) => {
      setArtistas(lista);
      const qtd = lista.filter(a => a.status === "pendente").length;
      if (pendentesRef.current !== null && qtd > pendentesRef.current) {
        const novos = qtd - pendentesRef.current;
        const msg = `🎤 ${novos} novo${novos > 1 ? "s" : ""} cadastro${novos > 1 ? "s" : ""} de artista aguardando aprovação`;
        // Toast in-app
        setToast(msg);
        // Notificação do navegador
        if (Notification.permission === "granted") {
          new Notification("Pé Sujo Bandas", { body: msg, icon: "/logo-pesujo.png" });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => {
            if (p === "granted") new Notification("Pé Sujo Bandas", { body: msg, icon: "/logo-pesujo.png" });
          });
        }
      }
      pendentesRef.current = qtd;
    });
    const unsub2 = fbListen("bandas_shows", setShows, orderBy("data", "desc"));
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const recarregar = useCallback(() => {}, []);

  async function salvarShow(dados) {
    const id = dados.id ?? nanoid();
    await fbSet("bandas_shows", id, { ...dados, id });
  }

  if (user === undefined) return <Splash />;
  if (!user) return <Login />;
  if (!perfil || !PAPEIS_PERMITIDOS.includes(perfil.role)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, textAlign: "center" }}>
        <p style={{ color: "var(--text2)" }}>Sua conta não tem permissão para acessar este sistema.</p>
        <button onClick={() => signOut(auth)} style={btnSecondary}>Sair</button>
      </div>
    );
  }

  const sw = isMobile ? 0 : (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
  const sidebarVisible = isMobile ? sidebarOpen : true;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Toast de novo cadastro */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: "#f59e0b", color: "#000",
          borderRadius: 12, padding: "14px 18px",
          fontSize: 13, fontWeight: 600, maxWidth: 320,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "flex-start", gap: 10,
          animation: "slideIn 0.3s ease",
        }}>
          <span style={{ flex: 1 }}>{toast}</span>
          <button
            onClick={() => { setToast(null); setAba("artistas"); }}
            style={{ background: "rgba(0,0,0,0.15)", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#000", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
            Ver agora
          </button>
          <button onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#000", padding: 0, fontSize: 16, lineHeight: 1, opacity: 0.6 }}>
            ×
          </button>
        </div>
      )}

      {/* Overlay escuro no mobile quando sidebar aberta */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 199 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? SIDEBAR_EXPANDED : sw,
        minWidth: isMobile ? SIDEBAR_EXPANDED : sw,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: sidebarVisible ? "flex" : "none",
        flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0,
        zIndex: 200,
        transition: "width 0.2s, min-width 0.2s",
        overflow: "hidden",
      }}>

        {/* Logo */}
        <div style={{
          height: collapsed ? 64 : 80,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: collapsed ? "8px 0" : "12px 16px",
          borderBottom: "1px solid var(--border)",
          transition: "height 0.2s",
          overflow: "hidden",
        }}>
          <img
            src="/logo-pesujo.png"
            alt="Pé Sujo"
            style={{
              width: collapsed ? 36 : 120,
              height: "auto",
              objectFit: "contain",
              transition: "width 0.2s",
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 5, letterSpacing: 1, textTransform: "uppercase" }}>
              Gestão de Bandas
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {ABAS.map(({ key, label, icon: Icon }) => {
            const ativo = aba === key;
            const pendentes = key === "artistas" ? artistas.filter(a => a.status === "pendente").length : 0;
            return (
              <button key={key} onClick={() => { setAba(key); if (isMobile) setSidebarOpen(false); }}
                title={collapsed ? label : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: collapsed ? "11px 0 11px 18px" : "11px 16px",
                  background: ativo ? "var(--primary)22" : "transparent",
                  borderLeft: ativo ? "3px solid var(--primary)" : "3px solid transparent",
                  border: "none", cursor: "pointer", width: "100%",
                  color: ativo ? "var(--primary-light)" : "var(--text2)",
                  fontWeight: ativo ? 700 : 400, fontSize: 14,
                  textAlign: "left", whiteSpace: "nowrap", overflow: "hidden",
                  transition: "background 0.15s",
                  position: "relative",
                }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Icon size={18} color={ativo ? "var(--primary-light)" : "var(--text2)"} />
                  {pendentes > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -6,
                      background: "#f59e0b", color: "#000",
                      fontSize: 9, fontWeight: 800, lineHeight: 1,
                      borderRadius: 10, padding: "2px 4px", minWidth: 14,
                      textAlign: "center",
                    }}>{pendentes}</span>
                  )}
                </div>
                {!collapsed && label}
              </button>
            );
          })}
        </nav>

        {/* Rodapé sidebar */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
          {/* Usuário + sair */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: collapsed ? "8px 0 8px 14px" : "8px 12px",
            gap: 10, overflow: "hidden",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: "var(--primary)44", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary-light)",
            }}>
              {perfil?.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {perfil?.name ?? user.email}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "capitalize" }}>{perfil?.role}</div>
              </div>
            )}
            <button onClick={() => signOut(auth)} title="Sair"
              style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}>
              <IconLogout size={15} />
            </button>
          </div>

          {/* Recolher/expandir */}
          <button onClick={() => setCollapsed(c => !c)}
            style={{
              display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end",
              width: "100%", padding: "6px 14px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", gap: 6, fontSize: 11,
            }}>
            {collapsed
              ? <IconChevronRight size={14} />
              : <><span>Recolher</span><IconChevronLeft size={14} /></>
            }
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main style={{
        flex: 1, marginLeft: sw, transition: "margin-left 0.2s",
        minHeight: "100vh", overflowX: "hidden",
      }}>
        {/* Top bar mobile */}
        {isMobile && (
          <div style={{
            position: "sticky", top: 0, zIndex: 100,
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: "var(--bg2)", borderBottom: "1px solid var(--border)",
          }}>
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 4, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
              <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
              <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
            </button>
            <img src="/logo-pesujo.png" alt="Pé Sujo" style={{ height: 28, objectFit: "contain" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginLeft: "auto" }}>
              {ABAS.find(a => a.key === aba)?.label}
            </span>
          </div>
        )}

        {aba === "calendario" && (
          <Calendario artistas={artistas} shows={shows} onAtualizar={recarregar}
            onSalvarShow={salvarShow}
            agendarArtista={agendarArtista} onAgendarClear={() => setAgendarArtista(null)} />
        )}
        {aba === "shows" && <Shows shows={shows} artistas={artistas} onAtualizar={recarregar} onSalvarShow={salvarShow} />}
        {aba === "artistas" && (
          <Artistas artistas={artistas} shows={shows} onAtualizar={recarregar}
            onSalvarShow={salvarShow}
            onAgendar={artista => { setAgendarArtista(artista); setAba("calendario"); }}
            onConvite={artista => { setConvidarArtista(artista); setAba("convites"); }} />
        )}
        {aba === "convites" && <Convites key={convidarArtista?.id ?? "convites"} artistas={artistas} shows={shows} artistaInicial={convidarArtista} />}
        {aba === "marketing" && <Marketing artistas={artistas} shows={shows} />}
        {aba === "confirmacoes" && <Confirmacoes artistas={artistas} shows={shows} />}
        {aba === "config" && <ConfigGeral tema={tema} onTemaChange={setTema} />}
      </main>
    </div>
  );
}

function Splash() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🎸</div>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Carregando…</div>
    </div>
  );
}

const btnSecondary = { background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer" };
