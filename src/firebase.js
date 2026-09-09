import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, deleteDoc, onSnapshot, query, orderBy, where, runTransaction
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBrkLLh4r2_2O6-FYrpOd3YHrLn3MkS-jE",
  authDomain: "barpesujo-equipe.firebaseapp.com",
  projectId: "barpesujo-equipe",
  storageBucket: "barpesujo-equipe.firebasestorage.app",
  messagingSenderId: "526213214923",
  appId: "1:526213214923:web:21af7d402569f56a45e14e"
};

const fbApp = initializeApp(firebaseConfig);
export const db = getFirestore(fbApp);
export const auth = getAuth(fbApp);
export const storage = getStorage(fbApp);

export async function fbGetAll(col) {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fbGetOne(col, id) {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fbSet(col, id, data) {
  // Firestore não aceita campos undefined — remove-os antes de salvar
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await setDoc(doc(db, col, id), clean);
}

export async function fbDel(col, id) {
  await deleteDoc(doc(db, col, id));
}

// Espelha só nome/foto do artista numa coleção pública separada, para a
// vitrine de marketing (sem login) não precisar ler telefone/PIX/cachê —
// que ficam só em bandas_artistas, restrito à gerência. Ver auditoria de
// segurança de 16/08/2026.
export async function setArtista(id, dados) {
  await fbSet("bandas_artistas", id, dados);
  await fbSet("bandas_artistas_publico", id, { nome: dados.nome || "", fotoUrl: dados.fotoUrl || "" });
}

export async function delArtista(id) {
  await fbDel("bandas_artistas", id);
  await fbDel("bandas_artistas_publico", id);
}

// Mesmo padrão do artista, agora para os shows. `bandas_shows` guarda o
// `cache` (valor pago por show) e por isso é restrito à gerência; a vitrine
// pública lê este espelho, que não tem esse campo. Auditoria de 09/09/2026 —
// até então a vitrine lia `bandas_shows` direto e o cachê de todo show estava
// aberto na internet.
//
// Os campos abaixo são exatamente os que `Marketing.jsx` usa. A regra do
// Firestore trava a lista com hasOnly(): acrescentar campo aqui sem
// acrescentar lá faz a escrita falhar, em vez de vazar em silêncio.
const CAMPOS_SHOW_PUBLICO = ["id", "artistaId", "data", "horario", "status", "generoId"];

export async function setShow(id, dados) {
  await fbSet("bandas_shows", id, dados);
  const publico = Object.fromEntries(
    CAMPOS_SHOW_PUBLICO
      .filter(k => dados[k] !== undefined && dados[k] !== null)
      .map(k => [k, dados[k]])
  );
  await fbSet("bandas_shows_publico", id, { ...publico, id });
}

export async function delShow(id) {
  await fbDel("bandas_shows", id);
  await fbDel("bandas_shows_publico", id);
}

export function fbListen(col, callback, ...queryConstraints) {
  const ref = queryConstraints.length
    ? query(collection(db, col), ...queryConstraints)
    : collection(db, col);
  return onSnapshot(ref, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function fbUploadFoto(path, file, nomeDownload) {
  const r = ref(storage, path);
  const metadata = nomeDownload ? {
    contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(nomeDownload)}`,
  } : undefined;
  await uploadBytes(r, file, metadata);
  return getDownloadURL(r);
}

export async function fbDeleteFoto(path) {
  try { await deleteObject(ref(storage, path)); } catch {}
}

export async function fbGetAllQuery(col, ...constraints) {
  const snap = await getDocs(query(collection(db, col), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export { orderBy, where, runTransaction, collection, doc, getDocs, query, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail };
