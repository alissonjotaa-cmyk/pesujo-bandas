// ─────────────────────────────────────────────────────────────────────────────
// Backfill das coleções espelho: `bandas_shows_publico` e `bandas_artistas_publico`.
//
// POR QUE ISSO EXISTE
//
// Até 09/09/2026 a vitrine pública de marketing lia `bandas_shows` direto —
// e junto com data e horário vinha o `cache`, o valor pago em cada show,
// aberto na internet para quem fizesse um `curl` sem token.
//
// A correção fecha `bandas_shows` e cria o espelho `bandas_shows_publico`,
// sem o campo `cache`. O app passa a escrever nos dois (setShow/delShow em
// src/firebase.js), mas os shows JÁ existentes não têm espelho: sem este
// backfill a programação pública fica vazia no instante em que as regras
// novas forem publicadas.
//
// ORDEM CERTA
//
//   1. Rode este script (ainda com as regras ANTIGAS — precisa ler
//      `bandas_shows`, e depois da publicação só a gerência lê; como você
//      entra como gestor, funciona antes e depois).
//   2. Publique as regras novas.
//   3. Confira a vitrine pública.
//
// SEGURANÇA
//
// O espelho recebe SÓ os campos da lista abaixo. `cache`, `formacaoIdx` e
// `observacoes` nunca são copiados. A senha é digitada no terminal com o eco
// desligado — não fica em disco nem no histórico do shell.
//
// COMO RODAR
//
//   node scripts/espelhar-publico.mjs           (mostra o que faria)
//   node scripts/espelhar-publico.mjs --aplicar (grava)
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const firebaseConfig = {
  apiKey: "AIzaSyBrkLLh4r2_2O6-FYrpOd3YHrLn3MkS-jE",
  authDomain: "barpesujo-equipe.firebaseapp.com",
  projectId: "barpesujo-equipe",
  storageBucket: "barpesujo-equipe.firebasestorage.app",
  messagingSenderId: "526213214923",
  appId: "1:526213214923:web:21af7d402569f56a45e14e",
};

// Espelho igual ao de src/firebase.js. Se divergir, a regra do Firestore
// (hasOnly) rejeita a escrita — de propósito.
const CAMPOS = ["id", "artistaId", "data", "horario", "status", "generoId"];

// O espelho de artista aceita SÓ estes dois campos (hasOnly na regra). Nome e
// foto são o que a vitrine mostra; telefone, PIX e cachê ficam de fora.
const CAMPOS_ARTISTA = ["nome", "fotoUrl"];

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  vermelho: "\x1b[31m", verde: "\x1b[32m", amarelo: "\x1b[33m", azul: "\x1b[36m",
};

const APLICAR = process.argv.includes("--aplicar");

async function perguntarSenha(rl, texto) {
  const originalEco = rl._writeToOutput;
  rl._writeToOutput = (s) => { if (s.includes(texto)) output.write(s); };
  const senha = await rl.question(texto);
  rl._writeToOutput = originalEco;
  output.write("\n");
  return senha;
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log(`${c.bold}Espelhar shows → bandas_shows_publico${c.reset}`);
console.log(APLICAR
  ? `${c.amarelo}Modo APLICAR — vai gravar.${c.reset}`
  : `${c.dim}Simulação. Nada é gravado. Use --aplicar para valer.${c.reset}`);

if (!input.isTTY) {
  console.log(`${c.vermelho}✗${c.reset} Rode direto no terminal, sem pipe — a senha precisa de TTY.`);
  process.exit(1);
}

const rl = readline.createInterface({ input, output });
let email, senha;
try {
  email = (await rl.question("\nE-mail (gestor/gerente): ")).trim();
  senha = await perguntarSenha(rl, "Senha (não aparece): ");
} finally {
  rl.close();
}

try {
  await signInWithEmailAndPassword(auth, email, senha);
} catch (e) {
  console.log(`${c.vermelho}✗${c.reset} Login falhou: ${e.code ?? e.message}`);
  process.exit(1);
}

const snap = await getDocs(collection(db, "bandas_shows"));
console.log(`\n${snap.size} show(s) em bandas_shows.\n`);

let gravados = 0, pulados = 0;
for (const d of snap.docs) {
  const dados = { id: d.id, ...d.data() };
  const publico = Object.fromEntries(
    CAMPOS.filter(k => dados[k] !== undefined && dados[k] !== null).map(k => [k, dados[k]])
  );
  publico.id = d.id;

  const descartados = Object.keys(dados).filter(k => !CAMPOS.includes(k));
  console.log(`  ${c.azul}${d.id}${c.reset} ${dados.data ?? "?"} ${dados.horario ?? ""} ` +
              `${c.dim}(fora do espelho: ${descartados.join(", ") || "nada"})${c.reset}`);

  if (APLICAR) {
    try {
      await setDoc(doc(db, "bandas_shows_publico", d.id), publico);
      gravados++;
    } catch (e) {
      console.log(`    ${c.vermelho}✗ falhou:${c.reset} ${e.code ?? e.message}`);
      pulados++;
    }
  }
}

// ─── Artistas ────────────────────────────────────────────────────────────────
// Mesma história dos shows: `bandas_artistas_publico` só recebe documento
// quando setArtista() roda. Artista cadastrado antes do espelho existir
// (16/08/2026) não tem entrada, e a vitrine não consegue mostrar o nome dele
// nos shows futuros — some o nome, não a data, então passa despercebido.
const snapA = await getDocs(collection(db, "bandas_artistas"));
const snapE = await getDocs(collection(db, "bandas_artistas_publico"));
const jaEspelhados = new Set(snapE.docs.map(d => d.id));

const faltando = snapA.docs.filter(d => !jaEspelhados.has(d.id));
console.log(`\n${snapA.size} artista(s), ${jaEspelhados.size} já espelhado(s), ` +
            `${c.bold}${faltando.length} faltando${c.reset}.\n`);

for (const d of faltando) {
  const dados = d.data();
  const publico = Object.fromEntries(
    CAMPOS_ARTISTA.map(k => [k, dados[k] ?? ""])
  );
  console.log(`  ${c.azul}${d.id}${c.reset} ${dados.nome ?? "(sem nome)"}`);
  if (APLICAR) {
    try {
      await setDoc(doc(db, "bandas_artistas_publico", d.id), publico);
      gravados++;
    } catch (e) {
      console.log(`    ${c.vermelho}✗ falhou:${c.reset} ${e.code ?? e.message}`);
      pulados++;
    }
  }
}

console.log(APLICAR
  ? `\n${c.verde}${c.bold}${gravados} espelhado(s) no total${c.reset}${pulados ? `, ${c.vermelho}${pulados} falharam${c.reset}` : ""}`
  : `\n${c.dim}Simulação encerrada. Rode com --aplicar para gravar.${c.reset}`);

await signOut(auth);
process.exit(pulados > 0 ? 1 : 0);
