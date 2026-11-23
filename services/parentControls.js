import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, deleteDoc, addDoc, collection,
  query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const RETENTION_DAYS = 7; // free tier; Firestore TTL deletes entries after expireAt
const CODE_MINUTES = 10;

// ───────── Kid-device side: pairing state, blocked words, logging ─────────
let state = { paired: false, parentId: null, uid: null };
let blockedWords = [];
let unsubWords = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f(state));

export const subscribePairing = (f) => { subs.add(f); f(state); return () => subs.delete(f); };

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Whole-word match, so a blocked "war" does not block "dwarf" or "warm"
export const isBlockedByParent = (text = '') =>
  blockedWords.some((w) => new RegExp(`(^|[^a-z0-9])${esc(w)}([^a-z0-9]|$)`, 'i').test(text));
export const filterByParentWords = (images) =>
  blockedWords.length ? images.filter((img) => !isBlockedByParent(img.alt || '')) : images;

const activate = (parentId, uid) => {
  state = { paired: true, parentId, uid };
  if (unsubWords) unsubWords();
  unsubWords = onSnapshot(
    collection(db, 'parents', parentId, 'blockedWords'),
    (snap) => { blockedWords = snap.docs.map((d) => d.data().word); },
    (e) => console.error('blocked words listener', e)
  );
  emit();
};

const deactivate = () => {
  if (unsubWords) unsubWords();
  unsubWords = null;
  blockedWords = [];
  state = { paired: false, parentId: null, uid: null };
  emit();
};

// Call once at app start. Restores pairing for a device that was paired earlier.
export function initParentControls() {
  return onAuthStateChanged(auth, async (user) => {
    if (!user || !user.isAnonymous) return deactivate();
    if (state.paired && state.uid === user.uid) return;
    try {
      const snap = await getDoc(doc(db, 'deviceLinks', user.uid));
      if (state.paired && state.uid === user.uid) return;
      if (snap.exists()) activate(snap.data().parentId, user.uid);
      else deactivate();
    } catch (e) {
      console.error('pairing check failed', e);
      deactivate();
    }
  });
}

export async function pairThisDevice(rawCode) {
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 8) throw new Error('Pairing codes have 8 letters and numbers.');
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    throw new Error('Sign out of the parent account first.');
  }
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  const codeSnap = await getDoc(doc(db, 'pairCodes', code));
  if (!codeSnap.exists() || codeSnap.data().expiresAt.toMillis() < Date.now()) {
    throw new Error('That code did not work. Ask a parent for a new one.');
  }
  const parentId = codeSnap.data().parentId;
  await setDoc(doc(db, 'deviceLinks', user.uid), { parentId, code, pairedAt: serverTimestamp() });
  activate(parentId, user.uid);
}

export function logSearch(term, tab, blocked) {
  if (!state.paired) return;
  addDoc(collection(db, 'parents', state.parentId, 'searches'), {
    term: term.toLowerCase().slice(0, 80),
    tab,
    blocked,
    at: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86400000),
  }).catch((e) => console.error('search log failed', e));
}

// ───────── Parent side: account, blocked words, search log, pairing codes ─────────
export const parentSignUp = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'parents', cred.user.uid), { plan: 'free', createdAt: serverTimestamp() });
};
export const parentSignIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const parentSignOut = () => signOut(auth);

const normalizeWord = (w) => w.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().slice(0, 40);

export async function addBlockedWord(raw) {
  const word = normalizeWord(raw);
  if (!word) return;
  await setDoc(doc(db, 'parents', auth.currentUser.uid, 'blockedWords', word), {
    word,
    addedAt: serverTimestamp(),
  });
}
export const removeBlockedWord = (word) =>
  deleteDoc(doc(db, 'parents', auth.currentUser.uid, 'blockedWords', word));

export const watchBlockedWords = (cb) =>
  onSnapshot(
    collection(db, 'parents', auth.currentUser.uid, 'blockedWords'),
    (s) => cb(s.docs.map((d) => d.data().word).sort()),
    (e) => console.error(e)
  );

export const watchSearches = (cb) =>
  onSnapshot(
    query(collection(db, 'parents', auth.currentUser.uid, 'searches'), orderBy('at', 'desc'), limit(100)),
    (s) =>
      cb(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => !x.expireAt || x.expireAt.toMillis() > Date.now())
      ),
    (e) => console.error(e)
  );

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid mix-ups
export async function createPairCode() {
  const rnd = new Uint32Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(rnd);
  else for (let i = 0; i < 8; i++) rnd[i] = Math.floor(Math.random() * 4294967296);
  const code = Array.from(rnd, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
  await setDoc(doc(db, 'pairCodes', code), {
    parentId: auth.currentUser.uid,
    expiresAt: Timestamp.fromMillis(Date.now() + CODE_MINUTES * 60000),
  });
  return code;
}
