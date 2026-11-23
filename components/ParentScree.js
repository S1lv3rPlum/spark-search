import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet,
} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  subscribePairing, parentSignUp, parentSignIn, parentSignOut, pairThisDevice,
  createPairCode, addBlockedWord, removeBlockedWord, watchBlockedWords, watchSearches,
} from '../services/parentControls';

const friendly = (e) =>
  ({
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/email-already-in-use': 'There is already an account with that email. Try signing in.',
    'auth/weak-password': 'Please use at least 6 characters for the password.',
    'auth/too-many-requests': 'Too many tries. Please wait a few minutes.',
  }[e.code] || e.message || 'Something went wrong.');

const Btn = ({ label, onPress, kind, disabled }) => (
  <TouchableOpacity
    style={[s.btn, kind === 'ghost' && s.btnGhost, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[s.btnText, kind === 'ghost' && s.btnGhostText]}>{label}</Text>
  </TouchableOpacity>
);

function SignedOut() {
  const [mode, setMode] = useState('signin'); // signin | signup | pair
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setErr(''); setBusy(true);
    try { await fn(); } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  };

  if (mode === 'pair') {
    return (
      <View>
        <Text style={s.h2}>Pair this device</Text>
        <Text style={s.p}>A parent makes a code in the Parents area on their own phone. Type it here.</Text>
        <TextInput style={[s.input, s.codeInput]} value={code} onChangeText={setCode}
          placeholder="ABCD1234" autoCapitalize="characters" autoCorrect={false} maxLength={9} />
        {!!err && <Text style={s.err}>{err}</Text>}
        <Btn label={busy ? 'Pairing…' : 'Pair this device'} disabled={busy} onPress={() => run(() => pairThisDevice(code))} />
        <Btn kind="ghost" label="Back" onPress={() => { setMode('signin'); setErr(''); }} />
      </View>
    );
  }
  const signup = mode === 'signup';
  return (
    <View>
      <Text style={s.h2}>{signup ? 'Create a parent account' : 'Parent sign in'}</Text>
      <Text style={s.p}>Do this on your own phone or computer, not on your child's device.</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email"
        autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
      <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password"
        secureTextEntry autoCapitalize="none" />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn label={busy ? 'One moment…' : signup ? 'Create account' : 'Sign in'} disabled={busy}
        onPress={() => run(() => (signup ? parentSignUp(email.trim(), password) : parentSignIn(email.trim(), password)))} />
      <Btn kind="ghost" label={signup ? 'I already have an account' : 'Create a parent account'}
        onPress={() => { setMode(signup ? 'signin' : 'signup'); setErr(''); }} />
      <Btn kind="ghost" label="Pair this device with a code" onPress={() => { setMode('pair'); setErr(''); }} />
    </View>
  );
}

function Dashboard() {
  const [tab, setTab] = useState('searches');
  const [searches, setSearches] = useState([]);
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => watchSearches(setSearches), []);
  useEffect(() => watchBlockedWords(setWords), []);

  const add = async () => {
    try { await addBlockedWord(newWord); setNewWord(''); setErr(''); } catch (e) { setErr(friendly(e)); }
  };
  const makeCode = async () => {
    try { setErr(''); setCode(await createPairCode()); } catch (e) { setErr(friendly(e)); }
  };
  const fmt = (t) => (t?.toDate ? t.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'just now');

  return (
    <View>
      <Text style={s.p}>Signed in as {auth.currentUser?.email}</Text>
      <View style={s.tabs}>
        {[['searches', 'Searches'], ['words', 'Blocked words'], ['pair', 'Pair a device']].map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabText, tab === k && s.tabTextOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'searches' && (
        <View>
          <Text style={s.p}>The last 7 days from paired devices. Blocked tries are marked.</Text>
          {searches.length === 0 && <Text style={s.empty}>Nothing yet. Pair a device and searches will show up here.</Text>}
          {searches.map((x) => (
            <View key={x.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.term}>{x.term}</Text>
                <Text style={s.meta}>{x.tab} · {fmt(x.at)}</Text>
              </View>
              {x.blocked && <Text style={s.blocked}>Blocked</Text>}
            </View>
          ))}
        </View>
      )}

      {tab === 'words' && (
        <View>
          <Text style={s.p}>Searches and picture tags with these whole words are blocked on paired devices.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={newWord} onChangeText={setNewWord}
              placeholder="Add a word" autoCapitalize="none" onSubmitEditing={add} />
            <Btn label="Add" onPress={add} />
          </View>
          <View style={s.chips}>
            {words.map((w) => (
              <TouchableOpacity key={w} style={s.chip} onPress={() => removeBlockedWord(w)}>
                <Text style={s.chipText}>{w}  ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
          {words.length === 0 && <Text style={s.empty}>No blocked words yet.</Text>}
        </View>
      )}

      {tab === 'pair' && (
        <View>
          <Text style={s.p}>1. Make a code here. 2. On your child's device, tap Parents, then "Pair this device with a code". The code works for 10 minutes.</Text>
          <Btn label="Make a pairing code" onPress={makeCode} />
          {!!code && <Text style={s.code}>{code}</Text>}
        </View>
      )}
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn kind="ghost" label="Sign out" onPress={parentSignOut} />
    </View>
  );
}

export default function ParentScreen({ onClose }) {
  const [paired, setPaired] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  useEffect(() => subscribePairing((st) => setPaired(st.paired)), []);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const isParent = user && !user.isAnonymous;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>🔒 Parents</Text>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {paired ? (
          <View>
            <Text style={s.h2}>This device is protected</Text>
            <Text style={s.p}>A parent account controls what can be searched here. To see searches or change blocked words, sign in on your own phone or computer.</Text>
          </View>
        ) : isParent ? <Dashboard /> : <SignedOut />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7fb' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  back: { fontSize: 16, fontWeight: '600', color: '#667eea', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  body: { padding: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  h2: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  p: { fontSize: 15, color: '#4b5563', marginBottom: 14, lineHeight: 22 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12, color: '#1f2937' },
  codeInput: { fontSize: 22, letterSpacing: 4, textAlign: 'center' },
  btn: { backgroundColor: '#667eea', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnGhost: { backgroundColor: 'transparent' },
  btnGhostText: { color: '#667eea' },
  err: { color: '#b91c1c', fontSize: 14, marginBottom: 10 },
  empty: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#e5e7eb' },
  tabOn: { backgroundColor: '#667eea' },
  tabText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  tabTextOn: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  term: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  blocked: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { backgroundColor: '#fee2e2', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { color: '#991b1b', fontSize: 14, fontWeight: '600' },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: '#1f2937', marginVertical: 16 },
});
