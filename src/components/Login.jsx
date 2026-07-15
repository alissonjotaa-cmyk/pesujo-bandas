import { useState } from "react";
import { auth, signInWithEmailAndPassword, sendPasswordResetEmail } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setCarregando(false);
    }
  }

  async function resetSenha() {
    if (!email) { setErro("Digite seu e-mail primeiro."); return; }
    await sendPasswordResetEmail(auth, email);
    setResetEnviado(true);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: 16,
    }}>
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 40, width: "100%", maxWidth: 380,
        boxShadow: "var(--shadow)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo-pesujo.png" alt="Pé Sujo" style={{ width: "100%", maxWidth: 260, height: "auto", objectFit: "contain", marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--primary-light)" }}>Pé Sujo — Bandas</h1>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>Gestão de contratações</p>
        </div>

        <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus style={inputStyle}
          />
          <input
            type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)}
            required style={inputStyle}
          />
          {erro && <p style={{ color: "var(--danger)", fontSize: 13 }}>{erro}</p>}
          {resetEnviado && <p style={{ color: "var(--success)", fontSize: 13 }}>Link de redefinição enviado!</p>}
          <button type="submit" disabled={carregando} style={btnStyle}>
            {carregando ? "Entrando…" : "Entrar"}
          </button>
          <button type="button" onClick={resetSenha}
            style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "10px 14px", color: "var(--text)", width: "100%", outline: "none",
};

const btnStyle = {
  background: "var(--primary)", color: "#fff", border: "none",
  borderRadius: 8, padding: "11px 0", fontWeight: 600, fontSize: 15, cursor: "pointer",
};
