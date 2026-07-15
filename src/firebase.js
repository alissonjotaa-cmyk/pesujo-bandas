import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, deleteDoc, onSnapshot, query, orderBy, where
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
  const metadata = nomeDownload
    ? { contentDisposition: `attachment; filename="${nomeDownload}"` }
    : undefined;
  await uploadBytes(r, file, metadata);
  return getDownloadURL(r);
}

export async function fbDeleteFoto(path) {
  try { await deleteObject(ref(storage, path)); } catch {}
}

export { orderBy, where, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail };
