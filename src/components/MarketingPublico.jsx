import { useState, useEffect } from "react";
import { fbGetAll } from "../firebase";
import Marketing from "./Marketing";

export default function MarketingPublico() {
  const [artistas, setArtistas] = useState([]);
  const [shows, setShows] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([fbGetAll("bandas_artistas"), fbGetAll("bandas_shows")])
      .then(([a, s]) => { setArtistas(a); setShows(s); })
      .catch(() => setErro("Não foi possível carregar os dados. Tente novamente."))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 40 }}>🎸</div>
        <div style={{ color: "var(--text3)", fontSize: 14 }}>Carregando programação…</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{erro}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)" }}>
        <img src="/logo-pesujo.png" alt="Pé Sujo" style={{ height: 36, objectFit: "contain" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Programação Musical</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Bar Pé Sujo</div>
        </div>
      </div>
      <Marketing artistas={artistas} shows={shows} publico />
    </div>
  );
}
