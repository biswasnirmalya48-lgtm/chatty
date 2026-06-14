import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Liquid Glass style ──
const glass = (dark) => ({
  background: dark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
  boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
})

// ── Separate ChatInput (prevents re-render focus loss) ──
function ChatInput({ onSend, onImage, onVoice, replyTo, onCancelReply, dark }) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const t = dark ? { bg: '#1C1C1E', border: 'rgba(255,255,255,0.1)', text: '#fff', sub: '#8E8E93', accent: '#0A84FF' }
                 : { bg: '#F2F2F7', border: 'rgba(0,0,0,0.08)', text: '#000', sub: '#8E8E93', accent: '#007AFF' }

  function send() {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        onVoice(file)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
    } catch { alert('Microphone access denied') }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  return (
    <div style={{ background: dark ? '#000' : '#fff', borderTop: `1px solid ${t.border}` }}>
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: dark ? '#1C1C1E' : '#F2F2F7', borderLeft: `3px solid ${t.accent}` }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, color: t.accent, fontWeight: 600 }}>Reply to {replyTo.sender?.name || 'You'}</p>
            <p style={{ margin: 0, fontSize: 12, color: t.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text || '📷 Photo'}</p>
          </div>
          <button onClick={onCancelReply} style={{ border: 'none', background: 'transparent', color: t.sub, fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', alignItems: 'center' }}>
        <button onClick={() => fileRef.current.click()} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>📎</button>
        <input ref={fileRef} type="file" accept="image/*,video/*,*/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) { onImage(e.target.files[0]); e.target.value = '' } }} />
        <input
          ref={inputRef}
          autoFocus
          placeholder="Message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
        {text.trim()
          ? <button onClick={send} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: t.accent, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
          : <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
              style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: recording ? '#FF453A' : t.accent, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {recording ? '⏹' : '🎤'}
            </button>
        }
      </div>
    </div>
  )
}

// ── Context Menu ──
function ContextMenu({ x, y, options, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle) }
  }, [])
  return (
    <div ref={ref} style={{ position: 'fixed', left: Math.min(x, window.innerWidth - 180), top: Math.min(y, window.innerHeight - options.length * 44), zIndex: 1000, background: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(20px)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 170 }}>
      {options.map((o, i) => (
        <button key={i} onClick={() => { o.action(); onClose() }} style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', color: o.danger ? '#FF453A' : '#fff', fontSize: 14, textAlign: 'left', cursor: 'pointer', borderBottom: i < options.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [stage, setStage] = useState('login')
  const [dark, setDark] = useState(false)
  const [screen, setScreen] = useState('chats')
  const [allProfiles, setAllProfiles] = useState([])
  const [friends, setFriends] = useState([])
  const [groups, setGroups] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [mode, setMode] = useState('login')
  const [nameF, setNameF] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [pName, setPName] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editMsg, setEditMsg] = useState(null)
  const [pinnedMsg, setPinnedMsg] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [forwardMsg, setForwardMsg] = useState(null)

  const photoInputRef = useRef(null)
  const msgEndRef = useRef(null)

  const t = dark ? {
    bg: '#000', card: '#1C1C1E', text: '#FFF', sub: '#8E8E93',
    border: 'rgba(255,255,255,0.1)', accent: '#0A84FF', me: '#0A84FF',
    them: '#2C2C2E', input: '#1C1C1E', danger: '#FF453A'
  } : {
    bg: '#FFF', card: '#F2F2F7', text: '#000', sub: '#8E8E93',
    border: 'rgba(0,0,0,0.08)', accent: '#007AFF', me: '#007AFF',
    them: '#E9E9EB', input: '#F2F2F7', danger: '#FF3B30'
  }

  const S = {
    wrap: { width: '100%', maxWidth: 430, margin: '0 auto', background: t.bg, color: t.text, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
    input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, marginBottom: 10, outline: 'none', boxSizing: 'border-box' },
    btnBlue: { width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: t.accent, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
    btnGhost: { width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: 'transparent', color: t.accent, fontSize: 14, cursor: 'pointer', marginTop: 8 },
    iconBtn: { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 18 },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${t.border}`, cursor: 'pointer' },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${t.border}`, ...glass(dark) }
  }

  function Av({ name = '?', url, size = 40 }) {
    const colors = ['#007AFF','#FF9F0A','#FF375F','#30D158','#BF5AF2','#FF6B35']
    const color = colors[(name.charCodeAt(0) || 0) % colors.length]
    const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    return <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>{ini}</div>
  }

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
      else setLoading(false)
    })
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => l.subscription.unsubscribe()
  }, [])

  async function fetchProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) { setProfile(data); setPName(data.name || ''); setStage(data.name ? 'app' : 'setupProfile') }
    else setStage('setupProfile')
    setLoading(false)
  }

  async function handleSignup() {
    setAuthError('')
    if (!nameF || !email || !password) { setAuthError('সব ফিল্ড পূরণ করো'); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name: nameF } } })
    if (error) setAuthError(error.message)
    else setAuthError('✓ Check your email to confirm!')
  }

  async function handleLogin() {
    setAuthError('')
    if (!email || !password) { setAuthError('ইমেল ও পাসওয়ার্ড দাও'); return }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); return }
    if (data.session) fetchProfile(data.session.user.id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null); setProfile(null); setStage('login')
  }

  async function uploadFile(file, path) {
    const { error } = await supabase.storage.from('chat-images').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('chat-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function uploadAvatar(file) {
    try {
      const url = await uploadFile(file, `${session.user.id}/${Date.now()}_${file.name}`)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id)
      setProfile(p => ({ ...p, avatar_url: url }))
    } catch(e) { alert('Upload failed: ' + e.message) }
  }

  async function saveProfileName() {
    if (!pName.trim()) return
    await supabase.from('profiles').update({ name: pName.trim() }).eq('id', session.user.id)
    setProfile(p => ({ ...p, name: pName.trim() }))
    setStage('app')
  }

  // ── Load data ──
  const loadAppData = useCallback(async () => {
    if (!session) return
    await supabase.from('profiles').update({ online: true }).eq('id', session.user.id)
    const { data: profs } = await supabase.from('profiles').select('*').neq('id', session.user.id)
    setAllProfiles(profs || [])
    const { data: fr } = await supabase.from('friends')
      .select('*, friend:profiles!friends_friend_id_fkey(*)')
      .eq('user_id', session.user.id).eq('status', 'accepted')
    setFriends(fr?.map(f => f.friend) || [])
    const { data: memberships } = await supabase.from('chat_members')
      .select('chat_id, chats(*)').eq('user_id', session.user.id)
    setGroups(memberships?.filter(m => m.chats?.is_group).map(m => m.chats) || [])
  }, [session])

  useEffect(() => { if (stage === 'app' && session) loadAppData() }, [stage, session])

  // ── Friends ──
  async function addFriend(fp) {
    if (friends.find(f => f.id === fp.id)) { alert('ইতিমধ্যে বন্ধু'); return }
    await supabase.from('friends').insert({ user_id: session.user.id, friend_id: fp.id, status: 'accepted' })
    await supabase.from('friends').insert({ user_id: fp.id, friend_id: session.user.id, status: 'accepted' })
    setFriends(prev => [...prev, fp])
    addNotif(`${fp.name} বন্ধু হয়েছে ✓`)
  }

  // ── Groups ──
  async function createGroup(groupName, memberIds) {
    const { data: chat } = await supabase.from('chats').insert({ is_group: true, name: groupName }).select().single()
    await supabase.from('chat_members').insert([session.user.id, ...memberIds].map(uid => ({ chat_id: chat.id, user_id: uid })))
    await supabase.from('messages').insert({ chat_id: chat.id, sender_id: session.user.id, text: `"${groupName}" group created` })
    setGroups(prev => [...prev, chat])
    setScreen('chats')
  }

  // ── Open chat ──
  async function openDirectChat(friend) {
    const { data: mine } = await supabase.from('chat_members').select('chat_id').eq('user_id', session.user.id)
    const { data: theirs } = await supabase.from('chat_members').select('chat_id').eq('user_id', friend.id)
    const mineIds = mine?.map(m => m.chat_id) || []
    const theirIds = theirs?.map(m => m.chat_id) || []
    let chatId = mineIds.find(id => theirIds.includes(id))
    if (chatId) {
      const { data: cd } = await supabase.from('chats').select('*').eq('id', chatId).single()
      if (cd?.is_group) chatId = null
    }
    if (!chatId) {
      const { data: nc } = await supabase.from('chats').insert({ is_group: false }).select().single()
      await supabase.from('chat_members').insert([
        { chat_id: nc.id, user_id: session.user.id },
        { chat_id: nc.id, user_id: friend.id }
      ])
      chatId = nc.id
    }
    setCurrentChat({ id: chatId, name: friend.name, avatar_url: friend.avatar_url, isGroup: false, online: friend.online, friendId: friend.id })
    loadMessages(chatId)
    setScreen('chat')
  }

  async function openGroupChat(group) {
    setCurrentChat({ id: group.id, name: group.name, isGroup: true, avatar_url: group.avatar_url })
    loadMessages(group.id)
    setScreen('chat')
  }

  // ── Messages ──
  async function loadMessages(chatId) {
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(name, avatar_url)')
      .eq('chat_id', chatId).order('created_at', { ascending: true })
    setMessages(data || [])
    const pinned = data?.find(m => m.pinned)
    if (pinned) setPinnedMsg(pinned)
  }

  useEffect(() => {
    if (!currentChat) return
    const channel = supabase.channel(`chat-${currentChat.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${currentChat.id}` },
        async payload => {
          if (payload.eventType === 'INSERT') {
            const { data: full } = await supabase.from('messages')
              .select('*, sender:profiles!messages_sender_id_fkey(name, avatar_url)')
              .eq('id', payload.new.id).single()
            if (full) {
              setMessages(prev => [...prev, full])
              if (full.sender_id !== session.user.id) addNotif(`${full.sender?.name}: ${full.text || '📎 File'}`)
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [currentChat])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = useCallback(async (text) => {
    if (!currentChat) return
    const msgData = { chat_id: currentChat.id, sender_id: session.user.id, text }
    if (replyTo) msgData.reply_to_id = replyTo.id
    await supabase.from('messages').insert(msgData)
    setReplyTo(null)
  }, [currentChat, session, replyTo])

  const sendFile = useCallback(async (file) => {
    if (!currentChat) return
    try {
      const isAudio = file.type.startsWith('audio/')
      const isImage = file.type.startsWith('image/')
      const path = `messages/${currentChat.id}/${Date.now()}_${file.name}`
      const url = await uploadFile(file, path)
      const msgData = { chat_id: currentChat.id, sender_id: session.user.id }
      if (isImage) msgData.image_url = url
      else if (isAudio) msgData.voice_url = url
      else { msgData.file_url = url; msgData.file_name = file.name }
      await supabase.from('messages').insert(msgData)
    } catch(e) { alert('Upload failed') }
  }, [currentChat, session])

  // ── Message actions ──
  async function deleteMessage(msg, forAll = false) {
    if (forAll && msg.sender_id === session.user.id) {
      await supabase.from('messages').delete().eq('id', msg.id)
    } else {
      setMessages(prev => prev.filter(m => m.id !== msg.id))
    }
  }

  async function editMessage(msg, newText) {
    await supabase.from('messages').update({ text: newText, edited: true }).eq('id', msg.id)
    setEditMsg(null)
  }

  async function pinMessage(msg) {
    await supabase.from('messages').update({ pinned: true }).eq('chat_id', currentChat.id)
      .neq('id', msg.id).then(() => {})
    await supabase.from('messages').update({ pinned: true }).eq('id', msg.id)
    setPinnedMsg(msg)
  }

  async function forwardMessageTo(chatId) {
    if (!forwardMsg) return
    await supabase.from('messages').insert({
      chat_id: chatId, sender_id: session.user.id,
      text: forwardMsg.text, image_url: forwardMsg.image_url,
      file_url: forwardMsg.file_url, file_name: forwardMsg.file_name,
      forwarded: true
    })
    setForwardMsg(null)
    addNotif('Message forwarded ✓')
  }

  function showContextMenu(e, msg) {
    e.preventDefault()
    const x = e.touches ? e.touches[0].clientX : e.clientX
    const y = e.touches ? e.touches[0].clientY : e.clientY
    const mine = msg.sender_id === session.user.id
    const options = [
      { icon: '↩️', label: 'Reply', action: () => setReplyTo(msg) },
      { icon: '📋', label: 'Copy', action: () => navigator.clipboard?.writeText(msg.text || '') },
      { icon: '➡️', label: 'Forward', action: () => setForwardMsg(msg) },
      ...(msg.text && mine ? [{ icon: '✏️', label: 'Edit', action: () => setEditMsg(msg) }] : []),
      { icon: '📌', label: 'Pin', action: () => pinMessage(msg) },
      ...(mine ? [{ icon: '🗑️', label: 'Delete for everyone', action: () => deleteMessage(msg, true), danger: true }] : []),
      { icon: '🗑️', label: 'Delete for me', action: () => deleteMessage(msg, false), danger: true },
    ]
    setContextMenu({ x, y, options })
  }

  function addNotif(text) {
    setNotifications(prev => [{ id: Date.now(), text }, ...prev].slice(0, 20))
  }

  // ── Delete chat ──
  async function deleteChat(chatId) {
    await supabase.from('messages').delete().eq('chat_id', chatId)
    await supabase.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', session.user.id)
    setGroups(prev => prev.filter(g => g.id !== chatId))
    setFriends(prev => prev) // keep friends, just remove chat
    setScreen('chats')
  }

  // ── Loading ──
  if (loading) return (
    <div style={{ ...S.wrap, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 16, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>C</span>
      </div>
      <p style={{ color: t.sub, fontSize: 14 }}>Loading...</p>
    </div>
  )

  // ── Login ──
  if (stage === 'login') return (
    <div style={{ ...S.wrap, justifyContent: 'center', alignItems: 'center', padding: 32, background: dark ? '#000' : 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)' }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg, ${t.accent}, #5E5CE6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: `0 12px 40px ${t.accent}44` }}>
        <span style={{ color: '#fff', fontSize: 36, fontWeight: 800 }}>C</span>
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 4px', background: `linear-gradient(135deg, ${t.accent}, #5E5CE6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Chatly</h1>
      <p style={{ color: t.sub, fontSize: 14, marginBottom: 36 }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
      <div style={{ width: '100%', ...glass(dark), borderRadius: 20, padding: 24 }}>
        {mode === 'signup' && <input placeholder="Your name" value={nameF} onChange={e => setNameF(e.target.value)} style={S.input} />}
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} />
        <input placeholder="Password (min 6 chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} style={S.input} />
        {authError && <p style={{ color: authError.startsWith('✓') ? '#30D158' : t.danger, fontSize: 13, marginBottom: 8 }}>{authError}</p>}
        <button onClick={mode === 'login' ? handleLogin : handleSignup} style={S.btnBlue}>{mode === 'login' ? 'Sign In' : 'Create Account'}</button>
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthError('') }} style={S.btnGhost}>
          {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  )

  // ── Setup Profile ──
  if (stage === 'setupProfile') return (
    <div style={{ ...S.wrap, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Set up profile</h2>
      <p style={{ color: t.sub, fontSize: 14, marginBottom: 28 }}>Add a photo and your name</p>
      <div onClick={() => photoInputRef.current.click()} style={{ width: 110, height: 110, borderRadius: '50%', background: t.card, border: `2px dashed ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 44 }}>📷</span>}
      </div>
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadAvatar(e.target.files[0]) }} />
      <p style={{ color: t.sub, fontSize: 13, marginBottom: 24 }}>Tap to upload photo</p>
      <input placeholder="Your name" value={pName} onChange={e => setPName(e.target.value)} style={{ ...S.input, textAlign: 'center', fontSize: 16 }} />
      <button onClick={saveProfileName} style={{ ...S.btnBlue, opacity: pName.trim() ? 1 : 0.4 }}>Continue →</button>
    </div>
  )

  // ── Forward Modal ──
  function ForwardModal() {
    const allChats = [...friends.map(f => ({ ...f, isGroup: false })), ...groups.map(g => ({ ...g, isGroup: true }))]
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', ...glass(dark), borderRadius: '20px 20px 0 0', padding: 16, maxHeight: '60vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Forward to</h3>
            <button onClick={() => setForwardMsg(null)} style={{ border: 'none', background: 'transparent', color: t.sub, fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          {allChats.map(c => (
            <div key={c.id} onClick={async () => {
              const chatId = c.isGroup ? c.id : await getOrCreateDirectChatId(c)
              forwardMessageTo(chatId)
            }} style={S.row}>
              {c.isGroup ? <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#5E5CE6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👥</div>
                : <Av name={c.name} url={c.avatar_url} size={40} />}
              <span style={{ fontSize: 15 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  async function getOrCreateDirectChatId(friend) {
    const { data: mine } = await supabase.from('chat_members').select('chat_id').eq('user_id', session.user.id)
    const { data: theirs } = await supabase.from('chat_members').select('chat_id').eq('user_id', friend.id)
    const mineIds = mine?.map(m => m.chat_id) || []
    const theirIds = theirs?.map(m => m.chat_id) || []
    let chatId = mineIds.find(id => theirIds.includes(id))
    if (!chatId) {
      const { data: nc } = await supabase.from('chats').insert({ is_group: false }).select().single()
      await supabase.from('chat_members').insert([
        { chat_id: nc.id, user_id: session.user.id },
        { chat_id: nc.id, user_id: friend.id }
      ])
      chatId = nc.id
    }
    return chatId
  }

  // ── Edit Modal ──
  function EditModal() {
    const [val, setVal] = useState(editMsg?.text || '')
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380, ...glass(dark), borderRadius: 20, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Edit message</h3>
          <input value={val} onChange={e => setVal(e.target.value)} style={S.input} autoFocus onKeyDown={e => e.key === 'Enter' && editMessage(editMsg, val)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditMsg(null)} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
            <button onClick={() => editMessage(editMsg, val)} style={{ ...S.btnBlue, flex: 1 }}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Friends Screen ──
  function FriendsScreen() {
    const [query, setQuery] = useState('')
    const filtered = allProfiles.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()))
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => setScreen('chats')} style={S.iconBtn}>←</button>
          <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>Add Friends</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <input placeholder="Search by name..." value={query} onChange={e => setQuery(e.target.value)} style={S.input} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(p => {
            const isFriend = friends.find(f => f.id === p.id)
            return (
              <div key={p.id} style={S.row}>
                <div style={{ position: 'relative' }}>
                  <Av name={p.name} url={p.avatar_url} size={44} />
                  {p.online && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#30D158', border: `2px solid ${t.bg}` }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: p.online ? '#30D158' : t.sub }}>{p.online ? '● Online' : 'Offline'}</p>
                </div>
                {isFriend
                  ? <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600 }}>✓ Friends</span>
                  : <button onClick={() => addFriend(p)} style={{ padding: '7px 16px', borderRadius: 20, border: 'none', background: t.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                }
              </div>
            )
          })}
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: t.sub, marginTop: 40 }}>No users found</p>}
        </div>
      </div>
    )
  }

  // ── New Group ──
  function NewGroupScreen() {
    const [gName, setGName] = useState('')
    const [selected, setSelected] = useState([])
    const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => setScreen('chats')} style={S.iconBtn}>←</button>
          <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>New Group</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <input placeholder="Group name" value={gName} onChange={e => setGName(e.target.value)} style={S.input} />
          <p style={{ fontSize: 13, color: t.sub, marginBottom: 8, fontWeight: 600 }}>SELECT MEMBERS</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {friends.map(f => (
            <label key={f.id} style={{ ...S.row, cursor: 'pointer' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected.includes(f.id) ? t.accent : t.border}`, background: selected.includes(f.id) ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => toggle(f.id)}>
                {selected.includes(f.id) && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </div>
              <Av name={f.name} url={f.avatar_url} size={42} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>{f.name}</span>
            </label>
          ))}
          {friends.length === 0 && <p style={{ textAlign: 'center', color: t.sub, marginTop: 30 }}>Add friends first</p>}
        </div>
        <div style={{ padding: 16 }}>
          <button onClick={() => gName.trim() && selected.length > 0 && createGroup(gName.trim(), selected)}
            style={{ ...S.btnBlue, opacity: gName.trim() && selected.length > 0 ? 1 : 0.4 }}>
            Create Group ({selected.length} members)
          </button>
        </div>
      </div>
    )
  }

  // ── Chats Screen ──
  function ChatsScreen() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...S.topbar, position: 'relative' }}>
          <button onClick={() => setScreen('profile')} style={{ ...S.iconBtn, padding: 0 }}>
            <Av name={profile?.name || '?'} url={profile?.avatar_url} size={34} />
          </button>
          <span style={{ fontWeight: 800, fontSize: 22, flex: 1 }}>Chats</span>
          <button onClick={() => setShowNotifs(s => !s)} style={{ ...S.iconBtn, position: 'relative' }}>
            🔔
            {notifications.length > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#FF453A' }} />}
          </button>
          <button onClick={() => setScreen('friends')} style={S.iconBtn}>🔍</button>
          <button onClick={() => setScreen('newgroup')} style={S.iconBtn}>✏️</button>
          <button onClick={() => setDark(d => !d)} style={S.iconBtn}>{dark ? '☀️' : '🌙'}</button>
          {showNotifs && (
            <div style={{ position: 'absolute', top: 60, right: 12, width: 270, ...glass(dark), borderRadius: 16, padding: 12, zIndex: 50 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: t.sub, marginBottom: 8, textTransform: 'uppercase' }}>Notifications</p>
              {notifications.length === 0 && <p style={{ fontSize: 13, color: t.sub }}>No notifications</p>}
              {notifications.map(n => <div key={n.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${t.border}`, color: t.text }}>{n.text}</div>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(g => (
            <div key={g.id} style={{ ...S.row, position: 'relative' }}>
              <div onClick={() => openGroupChat(g)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                {g.avatar_url ? <img src={g.avatar_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#5E5CE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👥</div>}
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{g.name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: t.sub }}>Group</p>
                </div>
              </div>
              <button onClick={() => deleteChat(g.id)} style={{ ...S.iconBtn, color: t.danger }}>🗑️</button>
            </div>
          ))}
          {friends.map(f => (
            <div key={f.id} style={{ ...S.row, position: 'relative' }}>
              <div onClick={() => openDirectChat(f)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <Av name={f.name} url={f.avatar_url} size={48} />
                  {f.online && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: '#30D158', border: `2px solid ${t.bg}` }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{f.name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: f.online ? '#30D158' : t.sub }}>{f.online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            </div>
          ))}
          {friends.length === 0 && groups.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 100, color: t.sub }}>
              <p style={{ fontSize: 48 }}>💬</p>
              <p style={{ fontSize: 17, fontWeight: 600, marginTop: 16, color: t.text }}>No chats yet</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>Tap 🔍 to find friends</p>
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: `1px solid ${t.border}`, textAlign: 'center' }}>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: t.danger, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Sign Out</button>
        </div>
      </div>
    )
  }

  // ── Profile Screen ──
  function ProfileScreen() {
    const [editName, setEditName] = useState(profile?.name || '')
    const fileRef = useRef(null)
    async function saveName() {
      await supabase.from('profiles').update({ name: editName }).eq('id', session.user.id)
      setProfile(p => ({ ...p, name: editName }))
      addNotif('Profile updated ✓')
    }
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => setScreen('chats')} style={S.iconBtn}>←</button>
          <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>My Profile</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32 }}>
          <div onClick={() => fileRef.current.click()} style={{ position: 'relative', cursor: 'pointer', marginBottom: 20 }}>
            <Av name={profile?.name || '?'} url={profile?.avatar_url} size={100} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${t.bg}` }}>
              <span style={{ fontSize: 14 }}>📷</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadAvatar(e.target.files[0]) }} />
          <p style={{ color: t.sub, fontSize: 13, marginBottom: 24 }}>Tap photo to change</p>
          <div style={{ width: '100%', ...glass(dark), borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: t.sub, marginBottom: 8, textTransform: 'uppercase' }}>Name</p>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={S.input} />
            <button onClick={saveName} style={S.btnBlue}>Save</button>
          </div>
          <div style={{ width: '100%', ...glass(dark), borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: t.sub, marginBottom: 8, textTransform: 'uppercase' }}>Account</p>
            <p style={{ fontSize: 14, color: t.text, margin: '8px 0' }}>📧 {session?.user?.email}</p>
            <p style={{ fontSize: 14, color: '#30D158', margin: '8px 0' }}>● Online</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Chat Screen ──
  function ChatScreen() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => { setScreen('chats'); setCurrentChat(null); setMessages([]); setPinnedMsg(null) }} style={S.iconBtn}>←</button>
          {currentChat?.isGroup
            ? <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#5E5CE6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {currentChat.avatar_url ? <img src={currentChat.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👥'}
              </div>
            : <div style={{ position: 'relative' }}>
                <Av name={currentChat?.name} url={currentChat?.avatar_url} size={38} />
                {currentChat?.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#30D158', border: `2px solid ${t.bg}` }} />}
              </div>
          }
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{currentChat?.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: currentChat?.online ? '#30D158' : t.sub }}>
              {currentChat?.isGroup ? 'Group' : (currentChat?.online ? 'Online' : 'Offline')}
            </p>
          </div>
          <button onClick={() => deleteChat(currentChat.id)} style={{ ...S.iconBtn, color: t.danger }}>🗑️</button>
        </div>

        {pinnedMsg && (
          <div style={{ padding: '8px 16px', background: dark ? '#1C1C1E' : '#F2F2F7', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📌</span>
            <p style={{ margin: 0, fontSize: 13, color: t.sub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pinnedMsg.text || '📎 File'}</p>
            <button onClick={() => setPinnedMsg(null)} style={{ border: 'none', background: 'transparent', color: t.sub, cursor: 'pointer' }}>×</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.map((m, i) => {
            const mine = m.sender_id === session.user.id
            return (
              <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}
                onContextMenu={e => showContextMenu(e, m)}
                onTouchStart={e => { const timer = setTimeout(() => showContextMenu(e, m), 500); e._timer = timer }}
                onTouchEnd={e => clearTimeout(e._timer)}
              >
                {!mine && currentChat?.isGroup && <p style={{ fontSize: 11, color: t.sub, marginBottom: 2, marginLeft: 4, fontWeight: 600 }}>{m.sender?.name}</p>}
                {m.reply_to_id && (
                  <div style={{ maxWidth: '70%', padding: '4px 10px', borderRadius: 10, background: dark ? '#2C2C2E' : '#E5E5EA', marginBottom: 2, borderLeft: `3px solid ${t.accent}`, fontSize: 12, color: t.sub }}>
                    ↩ Replied message
                  </div>
                )}
                {m.forwarded && <p style={{ fontSize: 11, color: t.sub, marginBottom: 2, fontStyle: 'italic' }}>➡️ Forwarded</p>}
                <div style={{ maxWidth: '78%', padding: m.image_url || m.voice_url || m.file_url ? 4 : '9px 13px', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: mine ? t.me : t.them, color: mine ? '#fff' : t.text, fontSize: 14 }}>
                  {m.image_url && <img src={m.image_url} alt="img" style={{ maxWidth: '100%', borderRadius: 14, display: 'block', maxHeight: 240 }} />}
                  {m.voice_url && (
                    <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🎤</span>
                      <audio controls src={m.voice_url} style={{ height: 32, maxWidth: 180 }} />
                    </div>
                  )}
                  {m.file_url && !m.image_url && (
                    <a href={m.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', color: mine ? '#fff' : t.accent, textDecoration: 'none' }}>
                      <span>📄</span> <span style={{ fontSize: 13 }}>{m.file_name || 'File'}</span>
                    </a>
                  )}
                  {m.text && <span>{m.text}</span>}
                  {m.edited && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>edited</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: t.sub }}>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  {mine && !currentChat?.isGroup && <span style={{ fontSize: 11, color: t.accent }}>✓✓</span>}
                </div>
              </div>
            )
          })}
          <div ref={msgEndRef} />
        </div>

        <ChatInput onSend={sendMessage} onImage={sendFile} onVoice={sendFile} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} dark={dark} />
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} options={contextMenu.options} onClose={() => setContextMenu(null)} />}
      {forwardMsg && <ForwardModal />}
      {editMsg && <EditModal />}
      {screen === 'chats' && <ChatsScreen />}
      {screen === 'friends' && <FriendsScreen />}
      {screen === 'newgroup' && <NewGroupScreen />}
      {screen === 'chat' && currentChat && <ChatScreen />}
      {screen === 'profile' && <ProfileScreen />}
    </div>
  )
}
