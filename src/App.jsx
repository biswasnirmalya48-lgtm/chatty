import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Design tokens ──────────────────────────────────────────
const T = {
  blue:   '#0A84FF',
  indigo: '#5E5CE6',
  green:  '#30D158',
  red:    '#FF453A',
  orange: '#FF9F0A',
  pink:   '#FF375F',
  teal:   '#5AC8FA',
}

function glass(dark, r = 20, extra = {}) {
  return {
    background: dark
      ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.45) 100%)',
    backdropFilter: 'blur(48px) saturate(200%)',
    WebkitBackdropFilter: 'blur(48px) saturate(200%)',
    border: dark
      ? '1px solid rgba(255,255,255,0.13)'
      : '1px solid rgba(255,255,255,0.95)',
    boxShadow: dark
      ? '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)'
      : '0 8px 40px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,1)',
    borderRadius: r,
    ...extra,
  }
}

// ── Avatar ─────────────────────────────────────────────────
function Av({ name = '?', url, size = 44 }) {
  const palette = [T.blue, T.indigo, T.green, T.orange, T.pink, T.teal, '#FF6B35']
  const color = palette[(name?.charCodeAt(0) || 0) % palette.length]
  const ini = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const s = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.25)',
    boxShadow: `0 4px 16px ${color}44`,
  }
  if (url) return <img src={url} alt={name} style={{ ...s, objectFit: 'cover' }} />
  return (
    <div style={{ ...s, background: `linear-gradient(135deg, ${color}, ${color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>{ini}</div>
  )
}

function Dot({ on }) {
  if (!on) return null
  return <span style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: T.green, border: '2px solid transparent', boxShadow: `0 0 8px ${T.green}` }} />
}

// ── Context menu ───────────────────────────────────────────
function CtxMenu({ x, y, items, close }) {
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) close() }
    setTimeout(() => { document.addEventListener('pointerdown', h) }, 10)
    return () => document.removeEventListener('pointerdown', h)
  }, [])
  const safeX = Math.min(x, window.innerWidth - 210)
  const safeY = Math.min(y, window.innerHeight - items.length * 48 - 24)
  return (
    <div ref={ref} style={{ position: 'fixed', left: safeX, top: safeY, zIndex: 3000, minWidth: 200, background: 'rgba(22,22,26,0.93)', backdropFilter: 'blur(50px)', WebkitBackdropFilter: 'blur(50px)', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      {items.map((it, i) => (
        <button key={i} onClick={() => { it.fn(); close() }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 18px', border: 'none', background: 'transparent', color: it.red ? T.red : '#fff', fontSize: 14, fontWeight: 500, textAlign: 'left', cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
          <span style={{ fontSize: 17 }}>{it.icon}</span>{it.label}
        </button>
      ))}
    </div>
  )
}

// ── Pill button ────────────────────────────────────────────
function Pill({ label, onClick, color = T.blue, small }) {
  return (
    <button onClick={onClick} style={{ padding: small ? '7px 16px' : '13px 0', width: small ? 'auto' : '100%', borderRadius: small ? 20 : 14, border: 'none', background: `linear-gradient(135deg, ${color}, ${color === T.blue ? T.indigo : color})`, color: '#fff', fontSize: small ? 13 : 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 6px 20px ${color}44`, letterSpacing: 0.2 }}>
      {label}
    </button>
  )
}

// ── ChatInput (isolated — no re-render focus loss) ─────────
function ChatInput({ onSend, onFile, replyTo, onCancelReply, dark }) {
  const [text, setText] = useState('')
  const [rec, setRec] = useState(false)
  const inputRef = useRef()
  const fileRef  = useRef()
  const mrRef    = useRef()
  const chunks   = useRef([])

  useEffect(() => { inputRef.current?.focus() }, [])

  function send() {
    if (!text.trim()) return
    onSend(text.trim()); setText('')
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = e => chunks.current.push(e.data)
      mr.onstop = () => {
        onFile(new File(chunks.current, `voice_${Date.now()}.webm`, { type: 'audio/webm' }))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(); mrRef.current = mr; setRec(true)
    } catch { alert('Microphone access needed') }
  }
  function stopRec() { mrRef.current?.stop(); setRec(false) }

  const bg = dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
  const iBg = dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.85)'
  const bdr = dark ? '1px solid rgba(255,255,255,0.11)' : '1px solid rgba(0,0,0,0.07)'

  return (
    <div style={{ background: bg, backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)', borderTop: bdr }}>
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 12px', padding: '8px 12px', borderLeft: `3px solid ${T.blue}`, background: dark ? 'rgba(10,132,255,0.1)' : 'rgba(10,132,255,0.07)', borderRadius: '0 10px 10px 0' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, color: T.blue, fontWeight: 700 }}>↩ {replyTo.sender?.name || 'You'}</p>
            <p style={{ margin: 0, fontSize: 12, color: dark ? 'rgba(255,255,255,0.45)' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text || '📎 File'}</p>
          </div>
          <button onClick={onCancelReply} style={{ border: 'none', background: 'transparent', color: dark ? 'rgba(255,255,255,0.4)' : '#aaa', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', alignItems: 'center' }}>
        <button onClick={() => fileRef.current.click()} style={{ width: 36, height: 36, borderRadius: '50%', border: bdr, background: iBg, color: dark ? 'rgba(255,255,255,0.7)' : '#555', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📎</button>
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,*/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) { onFile(e.target.files[0]); e.target.value = '' } }} />
        <input ref={inputRef} autoFocus placeholder="Message…"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 22, border: bdr, background: iBg, backdropFilter: 'blur(20px)', color: dark ? '#fff' : '#000', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />
        {text.trim()
          ? <button onClick={send} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${T.blue}55` }}>↑</button>
          : <button onPointerDown={startRec} onPointerUp={stopRec}
              style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: rec ? `linear-gradient(135deg, ${T.red}, ${T.orange})` : `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${rec ? T.red : T.blue}55` }}>
              {rec ? '⏹' : '🎤'}
            </button>
        }
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [session, setSession]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [profile, setProfile]       = useState(null)
  const [stage, setStage]           = useState('login')
  const [dark, setDark]             = useState(true)
  const [screen, setScreen]         = useState('chats')
  const [allUsers, setAllUsers]     = useState([])
  const [friends, setFriends]       = useState([])
  const [groups, setGroups]         = useState([])
  const [current, setCurrent]       = useState(null)
  const [messages, setMessages]     = useState([])
  const [notifs, setNotifs]         = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [loginMode, setLoginMode]   = useState('login')
  const [nameF, setNameF]           = useState('')
  const [email, setEmail]           = useState('')
  const [pw, setPw]                 = useState('')
  const [authErr, setAuthErr]       = useState('')
  const [pName, setPName]           = useState('')
  const [replyTo, setReplyTo]       = useState(null)
  const [editMsg, setEditMsg]       = useState(null)
  const [pinned, setPinned]         = useState(null)
  const [ctx, setCtx]               = useState(null)
  const [fwdMsg, setFwdMsg]         = useState(null)

  const photoRef = useRef()
  const endRef   = useRef()

  // background gradient
  const BG = dark
    ? 'radial-gradient(ellipse at 20% 20%, #0d1b3e 0%, #050510 55%, #1a0a2e 100%)'
    : 'radial-gradient(ellipse at 20% 20%, #daeeff 0%, #f0f4ff 50%, #fce4ff 100%)'

  const tc = {
    text:    dark ? '#ffffff'                    : '#000000',
    sub:     dark ? 'rgba(255,255,255,0.42)'     : 'rgba(0,0,0,0.38)',
    border:  dark ? 'rgba(255,255,255,0.10)'     : 'rgba(0,0,0,0.07)',
    input:   dark ? 'rgba(255,255,255,0.08)'     : 'rgba(255,255,255,0.82)',
    them:    dark ? 'rgba(255,255,255,0.09)'     : 'rgba(0,0,0,0.05)',
  }

  const WRAP  = { width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: BG, color: tc.text, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif', position: 'relative', overflow: 'hidden' }
  const INP   = { width: '100%', padding: '13px 16px', borderRadius: 14, border: `1px solid ${tc.border}`, background: tc.input, backdropFilter: 'blur(20px)', color: tc.text, fontSize: 15, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }
  const ROW   = { display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderBottom: `1px solid ${tc.border}`, cursor: 'pointer' }
  const IBTN  = { width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'transparent', color: tc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 20 }
  const TBAR  = { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', ...glass(dark, 0), borderBottom: `1px solid ${tc.border}`, position: 'sticky', top: 0, zIndex: 10 }

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
      else setLoading(false)
    })
    const { data: L } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => L.subscription.unsubscribe()
  }, [])

  async function fetchProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) { setProfile(data); setPName(data.name || ''); setStage(data.name ? 'app' : 'setupProfile') }
    else setStage('setupProfile')
    setLoading(false)
  }

  async function handleAuth() {
    setAuthErr('')
    if (loginMode === 'signup') {
      if (!nameF || !email || !pw) { setAuthErr('Fill all fields'); return }
      const { error } = await supabase.auth.signUp({ email, password: pw, options: { data: { name: nameF } } })
      setAuthErr(error ? error.message : '✓ Check your email to confirm!')
    } else {
      if (!email || !pw) { setAuthErr('Enter email & password'); return }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) { setAuthErr(error.message); return }
      if (data.session) fetchProfile(data.session.user.id)
    }
  }

  async function handleLogout() {
    await supabase.from('profiles').update({ online: false }).eq('id', session.user.id)
    await supabase.auth.signOut()
    setSession(null); setProfile(null); setStage('login')
  }

  // ── File upload ───────────────────────────────────────────
  async function uploadFile(file, path) {
    const { error } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl
  }

  async function uploadAvatar(file) {
    try {
      const url = await uploadFile(file, `avatars/${session.user.id}/${Date.now()}_${file.name}`)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id)
      setProfile(p => ({ ...p, avatar_url: url }))
      addNotif('Profile photo updated ✓')
    } catch(e) { alert('Upload failed: ' + e.message) }
  }

  async function saveProfileName() {
    if (!pName.trim()) return
    await supabase.from('profiles').update({ name: pName.trim() }).eq('id', session.user.id)
    setProfile(p => ({ ...p, name: pName.trim() }))
    setStage('app')
  }

  // ── Load data ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!session) return
    await supabase.from('profiles').update({ online: true }).eq('id', session.user.id)
    const { data: u }  = await supabase.from('profiles').select('*').neq('id', session.user.id)
    const { data: fr } = await supabase.from('friends').select('*, friend:profiles!friends_friend_id_fkey(*)').eq('user_id', session.user.id).eq('status', 'accepted')
    const { data: m }  = await supabase.from('chat_members').select('chat_id, chats(*)').eq('user_id', session.user.id)
    setAllUsers(u || [])
    setFriends(fr?.map(f => f.friend) || [])
    setGroups(m?.filter(x => x.chats?.is_group).map(x => x.chats) || [])
  }, [session])

  useEffect(() => { if (stage === 'app' && session) loadData() }, [stage, session])

  // ── Friends / DM ──────────────────────────────────────────
  async function addFriend(fp) {
    if (friends.find(f => f.id === fp.id)) return
    await supabase.from('friends').insert({ user_id: session.user.id, friend_id: fp.id, status: 'accepted' })
    await supabase.from('friends').insert({ user_id: fp.id, friend_id: session.user.id, status: 'accepted' })
    setFriends(prev => [...prev, fp])
    addNotif(`${fp.name} added ✓`)
  }

  async function getDM(friend) {
    const { data: a } = await supabase.from('chat_members').select('chat_id').eq('user_id', session.user.id)
    const { data: b } = await supabase.from('chat_members').select('chat_id').eq('user_id', friend.id)
    const aIds = a?.map(x => x.chat_id) || []
    const bIds = b?.map(x => x.chat_id) || []
    let id = aIds.find(x => bIds.includes(x))
    if (id) {
      const { data: cd } = await supabase.from('chats').select('is_group').eq('id', id).single()
      if (cd?.is_group) id = null
    }
    if (!id) {
      const { data: nc } = await supabase.from('chats').insert({ is_group: false }).select().single()
      await supabase.from('chat_members').insert([
        { chat_id: nc.id, user_id: session.user.id },
        { chat_id: nc.id, user_id: friend.id },
      ])
      id = nc.id
    }
    return id
  }

  async function openDM(friend) {
    const id = await getDM(friend)
    setCurrent({ id, name: friend.name, avatar_url: friend.avatar_url, isGroup: false, online: friend.online })
    await loadMsgs(id); setScreen('chat')
  }

  async function openGroup(g) {
    setCurrent({ id: g.id, name: g.name, isGroup: true, avatar_url: g.avatar_url })
    await loadMsgs(g.id); setScreen('chat')
  }

  // ── Groups ────────────────────────────────────────────────
  async function createGroup(gName, memberIds) {
    const { data: chat } = await supabase.from('chats').insert({ is_group: true, name: gName }).select().single()
    await supabase.from('chat_members').insert([session.user.id, ...memberIds].map(uid => ({ chat_id: chat.id, user_id: uid })))
    await supabase.from('messages').insert({ chat_id: chat.id, sender_id: session.user.id, text: `"${gName}" group created 🎉` })
    setGroups(prev => [...prev, chat]); setScreen('chats')
  }

  async function deleteChat(chatId) {
    await supabase.from('messages').delete().eq('chat_id', chatId)
    await supabase.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', session.user.id)
    setGroups(prev => prev.filter(g => g.id !== chatId))
    setScreen('chats')
  }

  // ── Messages ──────────────────────────────────────────────
  async function loadMsgs(chatId) {
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(name, avatar_url)')
      .eq('chat_id', chatId).order('created_at', { ascending: true })
    setMessages(data || [])
    setPinned(data?.find(m => m.pinned) || null)
  }

  useEffect(() => {
    if (!current) return
    const ch = supabase.channel(`room-${current.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${current.id}` },
        async ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') {
            const { data: full } = await supabase.from('messages')
              .select('*, sender:profiles!messages_sender_id_fkey(name, avatar_url)')
              .eq('id', n.id).single()
            if (full) {
              setMessages(p => [...p, full])
              if (full.sender_id !== session.user.id) addNotif(`${full.sender?.name}: ${full.text || '📎'}`)
            }
          } else if (eventType === 'UPDATE') {
            setMessages(p => p.map(m => m.id === n.id ? { ...m, ...n } : m))
          } else if (eventType === 'DELETE') {
            setMessages(p => p.filter(m => m.id !== o.id))
          }
        }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [current])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMsg = useCallback(async (text) => {
    if (!current) return
    const d = { chat_id: current.id, sender_id: session.user.id, text }
    if (replyTo) d.reply_to_id = replyTo.id
    await supabase.from('messages').insert(d)
    setReplyTo(null)
  }, [current, session, replyTo])

  const sendFile = useCallback(async (file) => {
    if (!current) return
    try {
      const path = `messages/${current.id}/${Date.now()}_${file.name}`
      const url  = await uploadFile(file, path)
      const d    = { chat_id: current.id, sender_id: session.user.id }
      if (file.type.startsWith('image/')) d.image_url = url
      else if (file.type.startsWith('audio/')) d.voice_url = url
      else { d.file_url = url; d.file_name = file.name; d.file_size = file.size }
      await supabase.from('messages').insert(d)
    } catch { alert('Upload failed') }
  }, [current, session])

  // ── Message actions ───────────────────────────────────────
  async function delMsg(msg, forAll) {
    if (forAll && msg.sender_id === session.user.id)
      await supabase.from('messages').delete().eq('id', msg.id)
    else setMessages(p => p.filter(m => m.id !== msg.id))
  }

  async function saveEdit(msg, newText) {
    await supabase.from('messages').update({ text: newText, edited: true }).eq('id', msg.id)
    setEditMsg(null)
  }

  async function pinMsg(msg) {
    await supabase.from('messages').update({ pinned: false }).eq('chat_id', current.id)
    await supabase.from('messages').update({ pinned: true }).eq('id', msg.id)
    setPinned(msg)
  }

  // ── Download helper ───────────────────────────────────────
  async function downloadFile(url, name) {
    try {
      const res  = await fetch(url)
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = name || 'file'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { window.open(url, '_blank') }
  }

  function showCtx(e, msg) {
    e.preventDefault()
    const x    = e.touches ? e.touches[0].clientX : e.clientX
    const y    = e.touches ? e.touches[0].clientY : e.clientY
    const mine = msg.sender_id === session.user.id
    const items = [
      { icon: '↩️', label: 'Reply',   fn: () => setReplyTo(msg) },
      { icon: '📋', label: 'Copy',    fn: () => navigator.clipboard?.writeText(msg.text || '') },
      { icon: '➡️', label: 'Forward', fn: () => setFwdMsg(msg) },
      { icon: '📌', label: 'Pin',     fn: () => pinMsg(msg) },
      ...(msg.image_url ? [{ icon: '⬇️', label: 'Download photo', fn: () => downloadFile(msg.image_url, 'photo.jpg') }] : []),
      ...(msg.file_url  ? [{ icon: '⬇️', label: 'Download file',  fn: () => downloadFile(msg.file_url, msg.file_name || 'file') }] : []),
      ...(mine && msg.text ? [{ icon: '✏️', label: 'Edit', fn: () => setEditMsg(msg) }] : []),
      ...(mine ? [{ icon: '🗑️', label: 'Delete for all', fn: () => delMsg(msg, true), red: true }] : []),
      { icon: '🗑️', label: 'Delete for me', fn: () => delMsg(msg, false), red: true },
    ]
    setCtx({ x, y, items })
  }

  function addNotif(text) {
    setNotifs(p => [{ id: Date.now(), text }, ...p].slice(0, 20))
  }

  // ── RENDER STAGES ─────────────────────────────────────────
  if (loading) return (
    <div style={{ ...WRAP, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 76, height: 76, borderRadius: 24, background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 16px 48px ${T.blue}55`, marginBottom: 18 }}>
        <span style={{ color: '#fff', fontSize: 34, fontWeight: 900 }}>C</span>
      </div>
      <p style={{ color: tc.sub, fontSize: 15 }}>Loading…</p>
    </div>
  )

  // ── Login ─────────────────────────────────────────────────
  if (stage === 'login') return (
    <div style={{ ...WRAP, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
      {/* ambient orbs */}
      {[['-10%','15%',T.blue],['-5%','80%',T.indigo],['60%','-5%',T.pink]].map(([t2,l,c],i) => (
        <div key={i} style={{ position: 'absolute', top: t2, left: l, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${c}44, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      ))}
      <div style={{ width: 88, height: 88, borderRadius: 28, background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: `0 20px 56px ${T.blue}55` }}>
        <span style={{ color: '#fff', fontSize: 40, fontWeight: 900 }}>C</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 6px', background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Chatly</h1>
      <p style={{ color: tc.sub, fontSize: 15, marginBottom: 36 }}>{loginMode === 'login' ? 'Welcome back 👋' : 'Join Chatly today'}</p>
      <div style={{ width: '100%', ...glass(dark, 24), padding: 24 }}>
        {loginMode === 'signup' && <input placeholder="Your name" value={nameF} onChange={e => setNameF(e.target.value)} style={INP} />}
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={INP} />
        <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} style={INP} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
        {authErr && <p style={{ color: authErr.startsWith('✓') ? T.green : T.red, fontSize: 13, marginBottom: 10 }}>{authErr}</p>}
        <Pill label={loginMode === 'login' ? 'Sign In' : 'Create Account'} onClick={handleAuth} />
        <button onClick={() => { setLoginMode(loginMode === 'login' ? 'signup' : 'login'); setAuthErr('') }}
          style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: T.blue, fontSize: 15, cursor: 'pointer', marginTop: 6, fontWeight: 500 }}>
          {loginMode === 'login' ? "Don't have account? Sign Up" : 'Have account? Sign In'}
        </button>
      </div>
    </div>
  )

  // ── Setup profile ─────────────────────────────────────────
  if (stage === 'setupProfile') return (
    <div style={{ ...WRAP, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Set up profile</h2>
      <p style={{ color: tc.sub, marginBottom: 28 }}>Add a photo and your name</p>
      <div onClick={() => photoRef.current.click()} style={{ position: 'relative', cursor: 'pointer', marginBottom: 22 }}>
        <Av name={pName || 'Me'} url={profile?.avatar_url} size={110} />
        <div style={{ position: 'absolute', bottom: 2, right: 2, width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)', boxShadow: `0 4px 14px ${T.blue}55`, fontSize: 15 }}>📷</div>
      </div>
      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadAvatar(e.target.files[0]) }} />
      <div style={{ width: '100%', ...glass(dark, 20), padding: 22 }}>
        <input placeholder="Your name" value={pName} onChange={e => setPName(e.target.value)} style={{ ...INP, textAlign: 'center', fontSize: 17 }} />
        <Pill label="Continue →" onClick={saveProfileName} />
      </div>
    </div>
  )

  // ── Screens ───────────────────────────────────────────────
  function FriendsScreen() {
    const [q, setQ] = useState('')
    const list = allUsers.filter(p => p.name?.toLowerCase().includes(q.toLowerCase()))
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={TBAR}>
          <button onClick={() => setScreen('chats')} style={IBTN}>←</button>
          <span style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>Add Friends</span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <input placeholder="🔍  Search people…" value={q} onChange={e => setQ(e.target.value)} style={INP} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {list.map(p => {
            const isFr = friends.find(f => f.id === p.id)
            return (
              <div key={p.id} style={ROW}>
                <div style={{ position: 'relative' }}><Av name={p.name} url={p.avatar_url} size={48} /><Dot on={p.online} /></div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: p.online ? T.green : tc.sub }}>{p.online ? '● Online' : 'Offline'}</p>
                </div>
                {isFr
                  ? <span style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>✓ Added</span>
                  : <Pill label="Add" onClick={() => addFriend(p)} small />
                }
              </div>
            )
          })}
          {list.length === 0 && <p style={{ textAlign: 'center', color: tc.sub, marginTop: 60, fontSize: 15 }}>Nobody found</p>}
        </div>
      </div>
    )
  }

  function NewGroupScreen() {
    const [gName, setGName] = useState('')
    const [sel, setSel]     = useState([])
    const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={TBAR}>
          <button onClick={() => setScreen('chats')} style={IBTN}>←</button>
          <span style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>New Group</span>
          {gName.trim() && sel.length > 0 && <Pill label="Create" onClick={() => createGroup(gName.trim(), sel)} small />}
        </div>
        <div style={{ padding: '14px 16px' }}>
          <input placeholder="Group name" value={gName} onChange={e => setGName(e.target.value)} style={INP} />
          <p style={{ fontSize: 11, color: tc.sub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9, margin: '4px 0 8px' }}>Members ({sel.length})</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {friends.map(f => (
            <div key={f.id} onClick={() => toggle(f.id)} style={{ ...ROW, background: sel.includes(f.id) ? (dark ? 'rgba(10,132,255,0.12)' : 'rgba(10,132,255,0.07)') : 'transparent' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${sel.includes(f.id) ? T.blue : tc.border}`, background: sel.includes(f.id) ? `linear-gradient(135deg,${T.blue},${T.indigo})` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sel.includes(f.id) && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
              </div>
              <Av name={f.name} url={f.avatar_url} size={46} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{f.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: f.online ? T.green : tc.sub }}>{f.online ? '● Online' : 'Offline'}</p>
              </div>
            </div>
          ))}
          {friends.length === 0 && <p style={{ textAlign: 'center', color: tc.sub, marginTop: 40 }}>Add friends first</p>}
        </div>
      </div>
    )
  }

  function ChatsScreen() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...TBAR, position: 'relative' }}>
          <button onClick={() => setScreen('profile')} style={{ ...IBTN, padding: 0 }}>
            <div style={{ position: 'relative' }}><Av name={profile?.name || '?'} url={profile?.avatar_url} size={36} /><Dot on={true} /></div>
          </button>
          <span style={{ fontWeight: 900, fontSize: 26, flex: 1, background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Chats</span>
          <button onClick={() => setShowNotifs(s => !s)} style={{ ...IBTN, position: 'relative' }}>
            🔔{notifs.length > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: T.red, boxShadow: `0 0 8px ${T.red}` }} />}
          </button>
          <button onClick={() => setScreen('friends')} style={IBTN}>🔍</button>
          <button onClick={() => setScreen('newgroup')} style={IBTN}>✏️</button>
          <button onClick={() => setDark(d => !d)} style={IBTN}>{dark ? '☀️' : '🌙'}</button>
          {showNotifs && (
            <div style={{ position: 'absolute', top: 66, right: 12, width: 286, ...glass(dark, 18), zIndex: 100, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: tc.sub, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>Notifications</p>
              {notifs.length === 0 && <p style={{ fontSize: 13, color: tc.sub, textAlign: 'center', padding: '10px 0' }}>All clear 🎉</p>}
              {notifs.slice(0, 7).map(n => <p key={n.id} style={{ margin: 0, fontSize: 13, padding: '7px 0', borderBottom: `1px solid ${tc.border}`, color: tc.text }}>{n.text}</p>)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(g => (
            <div key={g.id} style={ROW}>
              <div onClick={() => openGroup(g)} style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1 }}>
                {g.avatar_url
                  ? <img src={g.avatar_url} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', boxShadow: `0 4px 14px ${T.indigo}44`, flexShrink: 0 }} />
                  : <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${T.indigo},${T.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)', boxShadow: `0 4px 14px ${T.indigo}44` }}>👥</div>
                }
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{g.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: tc.sub }}>Group chat</p>
                </div>
              </div>
              <button onClick={() => deleteChat(g.id)} style={{ ...IBTN, color: T.red, opacity: 0.7, fontSize: 17 }}>🗑️</button>
            </div>
          ))}
          {friends.map(f => (
            <div key={f.id} onClick={() => openDM(f)} style={ROW}>
              <div style={{ position: 'relative' }}><Av name={f.name} url={f.avatar_url} size={52} /><Dot on={f.online} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{f.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: f.online ? T.green : tc.sub }}>{f.online ? '● Online' : 'Offline'}</p>
              </div>
            </div>
          ))}
          {friends.length === 0 && groups.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 110, color: tc.sub }}>
              <div style={{ fontSize: 62, marginBottom: 16 }}>💬</div>
              <p style={{ fontSize: 20, fontWeight: 700, color: tc.text }}>No chats yet</p>
              <p style={{ fontSize: 14, marginTop: 6 }}>Tap 🔍 to find friends</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', ...glass(dark, 0), borderTop: `1px solid ${tc.border}`, textAlign: 'center' }}>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: T.red, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
        </div>
      </div>
    )
  }

  function ProfileScreen() {
    const [eName, setEName] = useState(profile?.name || '')
    const fRef = useRef()
    async function save() {
      await supabase.from('profiles').update({ name: eName }).eq('id', session.user.id)
      setProfile(p => ({ ...p, name: eName })); addNotif('Profile updated ✓')
    }
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={TBAR}>
          <button onClick={() => setScreen('chats')} style={IBTN}>←</button>
          <span style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>My Profile</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <div style={{ position: 'absolute', top: '8%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${T.blue}22, transparent)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div onClick={() => fRef.current.click()} style={{ position: 'relative', cursor: 'pointer', marginBottom: 14 }}>
            <Av name={profile?.name || '?'} url={profile?.avatar_url} size={116} />
            <div style={{ position: 'absolute', bottom: 4, right: 4, width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${T.blue},${T.indigo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)', boxShadow: `0 4px 14px ${T.blue}55`, fontSize: 16 }}>📷</div>
          </div>
          <input ref={fRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadAvatar(e.target.files[0]) }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px' }}>{profile?.name}</h2>
          <p style={{ color: T.green, fontSize: 13, margin: '0 0 28px', fontWeight: 600 }}>● Online</p>
          <div style={{ width: '100%', ...glass(dark, 20), padding: 22, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: tc.sub, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>Edit Name</p>
            <input value={eName} onChange={e => setEName(e.target.value)} style={INP} />
            <Pill label="Save Changes" onClick={save} />
          </div>
          <div style={{ width: '100%', ...glass(dark, 20), padding: 22 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: tc.sub, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12 }}>Account</p>
            <p style={{ fontSize: 14, color: tc.text, margin: '10px 0' }}>📧 <span style={{ color: tc.sub }}>{session?.user?.email}</span></p>
            <p style={{ fontSize: 14, color: tc.text, margin: '10px 0' }}>👥 <span style={{ color: tc.sub }}>{friends.length} friends · {groups.length} groups</span></p>
          </div>
        </div>
      </div>
    )
  }

  function ChatScreen() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={TBAR}>
          <button onClick={() => { setScreen('chats'); setCurrent(null); setMessages([]); setPinned(null) }} style={IBTN}>←</button>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {current?.isGroup
              ? <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${T.indigo},${T.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px solid rgba(255,255,255,0.2)' }}>
                  {current.avatar_url ? <img src={current.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👥'}
                </div>
              : <><Av name={current?.name} url={current?.avatar_url} size={42} /><Dot on={current?.online} /></>
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{current?.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: current?.online ? T.green : tc.sub }}>
              {current?.isGroup ? 'Group' : (current?.online ? '● Online' : 'Offline')}
            </p>
          </div>
          <button onClick={() => deleteChat(current.id)} style={{ ...IBTN, color: T.red, opacity: 0.75, fontSize: 18 }}>🗑️</button>
        </div>

        {pinned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', ...glass(dark, 0), borderBottom: `1px solid ${tc.border}`, borderLeft: `3px solid ${T.orange}` }}>
            <span>📌</span>
            <p style={{ margin: 0, fontSize: 13, color: tc.sub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pinned.text || '📎 File'}</p>
            <button onClick={() => setPinned(null)} style={{ border: 'none', background: 'transparent', color: tc.sub, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.map((m, i) => {
            const mine  = m.sender_id === session.user.id
            const bubBg = mine
              ? `linear-gradient(135deg, ${T.blue}, ${T.indigo})`
              : tc.them
            return (
              <div key={m.id || i}
                style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}
                onContextMenu={e => showCtx(e, m)}
                onTouchStart={e => { const t = setTimeout(() => showCtx(e, m), 550); e.currentTarget._t = t }}
                onTouchEnd={e => clearTimeout(e.currentTarget._t)}
              >
                {!mine && current?.isGroup && (
                  <p style={{ fontSize: 11, color: T.blue, marginBottom: 3, marginLeft: 4, fontWeight: 700 }}>{m.sender?.name}</p>
                )}
                {m.reply_to_id && (
                  <div style={{ maxWidth: '70%', padding: '5px 12px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', marginBottom: 3, borderLeft: `3px solid ${T.blue}`, fontSize: 12, color: tc.sub }}>
                    ↩ Replied message
                  </div>
                )}
                {m.forwarded && <p style={{ fontSize: 11, color: tc.sub, marginBottom: 2, fontStyle: 'italic' }}>➡️ Forwarded</p>}
                <div style={{ maxWidth: '78%', padding: (m.image_url || m.voice_url || m.file_url) ? 5 : '10px 14px', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: bubBg, color: mine ? '#fff' : tc.text, fontSize: 15, boxShadow: mine ? `0 4px 14px ${T.blue}33` : '0 2px 8px rgba(0,0,0,0.07)' }}>
                  {m.image_url && (
                    <div style={{ position: 'relative' }}>
                      <img src={m.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 14, display: 'block', maxHeight: 280, cursor: 'pointer' }} onClick={() => window.open(m.image_url, '_blank')} />
                      <button onClick={() => downloadFile(m.image_url, 'photo.jpg')}
                        style={{ position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>⬇️</button>
                    </div>
                  )}
                  {m.voice_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                      <span>🎤</span>
                      <audio controls src={m.voice_url} style={{ height: 32, maxWidth: 190 }} />
                    </div>
                  )}
                  {m.file_url && !m.image_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px' }}>
                      <span style={{ fontSize: 22 }}>📄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file_name || 'File'}</p>
                        {m.file_size && <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>{(m.file_size / 1024).toFixed(1)} KB</p>}
                      </div>
                      <button onClick={() => downloadFile(m.file_url, m.file_name)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⬇️</button>
                    </div>
                  )}
                  {m.text && <span style={{ lineHeight: 1.45 }}>{m.text}</span>}
                  {m.edited && <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 6 }}>edited</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, opacity: 0.65 }}>
                  <span style={{ fontSize: 11, color: tc.sub }}>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  {mine && !current?.isGroup && <span style={{ fontSize: 11, color: T.blue }}>✓✓</span>}
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        <ChatInput onSend={sendMsg} onFile={sendFile} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} dark={dark} />
      </div>
    )
  }

  // ── Modals ────────────────────────────────────────────────
  function FwdModal() {
    const all = [...friends.map(f => ({ ...f, isGroup: false })), ...groups.map(g => ({ ...g, isGroup: true }))]
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 900, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(12px)' }}>
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', ...glass(dark, 0), borderRadius: '24px 24px 0 0', padding: 22, maxHeight: '65vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Forward to</h3>
            <button onClick={() => setFwdMsg(null)} style={{ border: 'none', background: 'transparent', color: tc.sub, fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {all.map(c => (
              <div key={c.id} onClick={async () => {
                const chatId = c.isGroup ? c.id : await getDM(c)
                await supabase.from('messages').insert({ chat_id: chatId, sender_id: session.user.id, text: fwdMsg.text, image_url: fwdMsg.image_url, file_url: fwdMsg.file_url, file_name: fwdMsg.file_name, forwarded: true })
                setFwdMsg(null); addNotif('Forwarded ✓')
              }} style={ROW}>
                {c.isGroup ? <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(135deg,${T.indigo},${T.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👥</div>
                  : <Av name={c.name} url={c.avatar_url} size={46} />}
                <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function EditModal() {
    const [val, setVal] = useState(editMsg?.text || '')
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(12px)' }}>
        <div style={{ width: '100%', maxWidth: 380, ...glass(dark, 22), padding: 26 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>✏️ Edit message</h3>
          <input value={val} onChange={e => setVal(e.target.value)} style={INP} autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(editMsg, val)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditMsg(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: `1px solid ${tc.border}`, background: 'transparent', color: T.blue, fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={() => saveEdit(editMsg, val)} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${T.blue},${T.indigo})`, color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 700, boxShadow: `0 6px 18px ${T.blue}44` }}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={WRAP}>
      {ctx    && <CtxMenu x={ctx.x} y={ctx.y} items={ctx.items} close={() => setCtx(null)} />}
      {fwdMsg && <FwdModal />}
      {editMsg && <EditModal />}
      {screen === 'chats'    && <ChatsScreen />}
      {screen === 'friends'  && <FriendsScreen />}
      {screen === 'newgroup' && <NewGroupScreen />}
      {screen === 'chat'     && current && <ChatScreen />}
      {screen === 'profile'  && <ProfileScreen />}
    </div>
  )
}
