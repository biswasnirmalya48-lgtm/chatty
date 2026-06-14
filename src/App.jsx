import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Separate ChatInput to prevent re-render focus loss ──
function ChatInput({ onSend, onImage }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  function send() {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    inputRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #E5E5EA', alignItems: 'center', background: 'inherit' }}>
      <button onClick={() => fileRef.current.click()} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>🖼️</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) { onImage(e.target.files[0]); e.target.value = '' } }} />
      <input
        ref={inputRef}
        autoFocus
        placeholder="মেসেজ লেখো..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #E5E5EA', background: '#F2F2F7', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />
      <button onClick={send} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: '#007AFF', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [pName, setPName] = useState('')

  const photoInputRef = useRef(null)
  const msgEndRef = useRef(null)

  const t = dark ? {
    bg: '#000', card: '#1C1C1E', text: '#FFF', sub: '#8E8E93',
    border: '#2C2C2E', accent: '#0A84FF', me: '#0A84FF',
    them: '#2C2C2E', input: '#1C1C1E'
  } : {
    bg: '#FFF', card: '#F2F2F7', text: '#000', sub: '#8E8E93',
    border: '#E5E5EA', accent: '#007AFF', me: '#007AFF',
    them: '#E9E9EB', input: '#F2F2F7'
  }

  const S = {
    wrap: { width: '100%', maxWidth: 430, margin: '0 auto', background: t.bg, color: t.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
    input: { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, marginBottom: 10, outline: 'none', boxSizing: 'border-box' },
    btnBlue: { width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: t.accent, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
    btnGhost: { width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: 'transparent', color: t.accent, fontSize: 14, cursor: 'pointer', marginTop: 8 },
    iconBtn: { width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${t.border}`, cursor: 'pointer' },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${t.border}` }
  }

  function Av({ name = '?', url, size = 40 }) {
    const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    return <div style={{ width: size, height: size, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: size * 0.35, flexShrink: 0 }}>{ini}</div>
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
    if (!name || !email || !password) { setAuthError('সব ফিল্ড পূরণ করো'); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) setAuthError(error.message)
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

  async function uploadAvatar(file) {
    const path = `${session.user.id}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('chat-images').upload(path, file)
    if (upErr) { alert('Upload failed: ' + upErr.message); return }
    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', session.user.id)
    setProfile(p => ({ ...p, avatar_url: urlData.publicUrl }))
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
    addNotif(`${fp.name} বন্ধু হয়েছে`)
  }

  // ── Groups ──
  async function createGroup(groupName, memberIds) {
    const { data: chat } = await supabase.from('chats').insert({ is_group: true, name: groupName }).select().single()
    await supabase.from('chat_members').insert([session.user.id, ...memberIds].map(uid => ({ chat_id: chat.id, user_id: uid })))
    await supabase.from('messages').insert({ chat_id: chat.id, sender_id: session.user.id, text: `"${groupName}" গ্রুপ তৈরি হয়েছে` })
    setGroups(prev => [...prev, chat])
    addNotif(`গ্রুপ "${groupName}" তৈরি হয়েছে`)
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
    setCurrentChat({ id: chatId, name: friend.name, avatar_url: friend.avatar_url, isGroup: false, online: friend.online })
    loadMessages(chatId)
    setScreen('chat')
  }

  async function openGroupChat(group) {
    setCurrentChat({ id: group.id, name: group.name, isGroup: true })
    loadMessages(group.id)
    setScreen('chat')
  }

  // ── Messages ──
  async function loadMessages(chatId) {
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(name, avatar_url)')
      .eq('chat_id', chatId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  useEffect(() => {
    if (!currentChat) return
    const channel = supabase.channel(`chat-${currentChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${currentChat.id}` },
        async payload => {
          const { data: full } = await supabase.from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(name, avatar_url)')
            .eq('id', payload.new.id).single()
          if (full) {
            setMessages(prev => [...prev, full])
            if (full.sender_id !== session.user.id) addNotif(`${full.sender?.name}: ${full.text || '📷 Photo'}`)
          }
        }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [currentChat])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = useCallback(async (text) => {
    if (!currentChat) return
    await supabase.from('messages').insert({ chat_id: currentChat.id, sender_id: session.user.id, text })
  }, [currentChat, session])

  const sendImage = useCallback(async (file) => {
    if (!currentChat) return
    const path = `messages/${currentChat.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('chat-images').upload(path, file)
    if (error) { alert('Image upload failed'); return }
    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)
    await supabase.from('messages').insert({ chat_id: currentChat.id, sender_id: session.user.id, image_url: urlData.publicUrl })
  }, [currentChat, session])

  function addNotif(text) {
    setNotifications(prev => [{ id: Date.now(), text }, ...prev].slice(0, 15))
  }

  // ── Loading ──
  if (loading) return <div style={{ ...S.wrap, justifyContent: 'center', alignItems: 'center' }}><p style={{ color: t.sub }}>লোড হচ্ছে...</p></div>

  // ── Login ──
  if (stage === 'login') return (
    <div style={{ ...S.wrap, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <span style={{ color: '#fff', fontSize: 30, fontWeight: 700 }}>C</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>Chatly</h1>
      <p style={{ color: t.sub, fontSize: 14, marginBottom: 32 }}>{mode === 'login' ? 'লগইন করো' : 'নতুন একাউন্ট বানাও'}</p>
      {mode === 'signup' && <input placeholder="তোমার নাম" value={name} onChange={e => setName(e.target.value)} style={S.input} />}
      <input placeholder="ইমেল" type="email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} />
      <input placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" type="password" value={password} onChange={e => setPassword(e.target.value)} style={S.input} />
      {authError && <p style={{ color: '#FF453A', fontSize: 13, marginBottom: 8 }}>{authError}</p>}
      <button onClick={mode === 'login' ? handleLogin : handleSignup} style={S.btnBlue}>{mode === 'login' ? 'লগইন' : 'সাইন আপ'}</button>
      <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthError('') }} style={S.btnGhost}>
        {mode === 'login' ? 'একাউন্ট নেই? সাইন আপ করো' : 'একাউন্ট আছে? লগইন করো'}
      </button>
    </div>
  )

  // ── Setup Profile ──
  if (stage === 'setupProfile') return (
    <div style={{ ...S.wrap, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>প্রোফাইল সেটআপ</h2>
      <div onClick={() => photoInputRef.current.click()} style={{ width: 110, height: 110, borderRadius: '50%', background: t.card, border: `2px dashed ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 20, overflow: 'hidden' }}>
        {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40 }}>📷</span>}
      </div>
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadAvatar(e.target.files[0]) }} />
      <p style={{ color: t.sub, fontSize: 13, marginBottom: 20 }}>ছবিতে ট্যাপ করো আপলোড করতে</p>
      <input placeholder="তোমার নাম" value={pName} onChange={e => setPName(e.target.value)} style={S.input} />
      <button onClick={saveProfileName} style={{ ...S.btnBlue, opacity: pName.trim() ? 1 : 0.4 }}>শুরু করো</button>
    </div>
  )

  // ── Friends Screen ──
  function FriendsScreen() {
    const [query, setQuery] = useState('')
    const filtered = allProfiles.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()))
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => setScreen('chats')} style={S.iconBtn}>←</button>
          <span style={{ fontWeight: 600, fontSize: 17, flex: 1 }}>বন্ধু যোগ করো</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <input placeholder="নাম দিয়ে খোঁজো..." value={query} onChange={e => setQuery(e.target.value)} style={S.input} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(p => {
            const isFriend = friends.find(f => f.id === p.id)
            return (
              <div key={p.id} style={S.row}>
                <Av name={p.name} url={p.avatar_url} size={42} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 15 }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: p.online ? '#30D158' : t.sub }}>{p.online ? '● অনলাইন' : 'অফলাইন'}</p>
                </div>
                {isFriend
                  ? <span style={{ fontSize: 12, color: '#30D158' }}>✓ বন্ধু</span>
                  : <button onClick={() => addFriend(p)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: t.accent, color: '#fff', fontSize: 13, cursor: 'pointer' }}>যোগ করো</button>
                }
              </div>
            )
          })}
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: t.sub, marginTop: 40 }}>কেউ পাওয়া যায়নি</p>}
        </div>
      </div>
    )
  }

  // ── New Group Screen ──
  function NewGroupScreen() {
    const [gName, setGName] = useState('')
    const [selected, setSelected] = useState([])
    const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => setScreen('chats')} style={S.iconBtn}>←</button>
          <span style={{ fontWeight: 600, fontSize: 17, flex: 1 }}>নতুন গ্রুপ</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <input placeholder="গ্রুপের নাম" value={gName} onChange={e => setGName(e.target.value)} style={S.input} />
          <p style={{ fontSize: 13, color: t.sub, marginBottom: 8 }}>মেম্বার বাছাই করো</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {friends.map(f => (
            <label key={f.id} style={{ ...S.row, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} style={{ width: 18, height: 18 }} />
              <Av name={f.name} url={f.avatar_url} size={40} />
              <span style={{ fontSize: 15 }}>{f.name}</span>
            </label>
          ))}
          {friends.length === 0 && <p style={{ textAlign: 'center', color: t.sub, marginTop: 30 }}>আগে বন্ধু যোগ করো</p>}
        </div>
        <div style={{ padding: 16 }}>
          <button onClick={() => gName.trim() && selected.length > 0 && createGroup(gName.trim(), selected)} style={{ ...S.btnBlue, opacity: gName.trim() && selected.length > 0 ? 1 : 0.4 }}>
            গ্রুপ তৈরি করো ({selected.length} জন)
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
          <Av name={profile?.name || '?'} url={profile?.avatar_url} size={32} />
          <span style={{ fontWeight: 700, fontSize: 20, flex: 1 }}>Chats</span>
          <button onClick={() => setShowNotifs(s => !s)} style={{ ...S.iconBtn, position: 'relative' }}>
            🔔
            {notifications.length > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#FF453A' }} />}
          </button>
          <button onClick={() => setScreen('friends')} style={S.iconBtn}>🔍</button>
          <button onClick={() => setScreen('newgroup')} style={S.iconBtn}>✏️</button>
          <button onClick={() => setDark(d => !d)} style={S.iconBtn}>{dark ? '☀️' : '🌙'}</button>
          {showNotifs && (
            <div style={{ position: 'absolute', top: 56, right: 16, width: 260, background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: t.sub, marginBottom: 6 }}>নোটিফিকেশন</p>
              {notifications.length === 0 && <p style={{ fontSize: 13, color: t.sub }}>কোনো নোটিফিকেশন নেই</p>}
              {notifications.map(n => <div key={n.id} style={{ fontSize: 13, padding: '5px 0', borderBottom: `1px solid ${t.border}` }}>{n.text}</div>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(g => (
            <div key={g.id} onClick={() => openGroupChat(g)} style={S.row}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#5E5CE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👥</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{g.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: t.sub }}>গ্রুপ চ্যাট</p>
              </div>
            </div>
          ))}
          {friends.map(f => (
            <div key={f.id} onClick={() => openDirectChat(f)} style={S.row}>
              <div style={{ position: 'relative' }}>
                <Av name={f.name} url={f.avatar_url} size={46} />
                {f.online && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#30D158', border: `2px solid ${t.bg}` }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{f.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: t.sub }}>{f.online ? 'অনলাইন' : 'অফলাইন'}</p>
              </div>
            </div>
          ))}
          {friends.length === 0 && groups.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 80, color: t.sub }}>
              <p style={{ fontSize: 40 }}>💬</p>
              <p style={{ fontSize: 15, marginTop: 12 }}>কোনো চ্যাট নেই</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>🔍 বাটন চেপে বন্ধু খোঁজো</p>
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: `1px solid ${t.border}`, textAlign: 'center' }}>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#FF453A', fontSize: 13, cursor: 'pointer' }}>লগআউট</button>
        </div>
      </div>
    )
  }

  // ── Chat Screen ──
  function ChatScreen() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={S.topbar}>
          <button onClick={() => { setScreen('chats'); setCurrentChat(null); setMessages([]) }} style={S.iconBtn}>←</button>
          {currentChat?.isGroup
            ? <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5E5CE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
            : <div style={{ position: 'relative' }}>
                <Av name={currentChat?.name} url={currentChat?.avatar_url} size={36} />
                {currentChat?.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#30D158', border: `2px solid ${t.bg}` }} />}
              </div>
          }
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{currentChat?.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: currentChat?.online ? '#30D158' : t.sub }}>
              {currentChat?.isGroup ? 'গ্রুপ' : (currentChat?.online ? 'অনলাইন' : 'অফলাইন')}
            </p>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map((m, i) => {
            const mine = m.sender_id === session.user.id
            return (
              <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && currentChat?.isGroup && <p style={{ fontSize: 11, color: t.sub, marginBottom: 2, marginLeft: 4 }}>{m.sender?.name}</p>}
                <div style={{ maxWidth: '75%', padding: m.image_url ? 4 : '9px 13px', borderRadius: 18, background: mine ? t.me : t.them, color: mine ? '#fff' : t.text, fontSize: 14 }}>
                  {m.image_url ? <img src={m.image_url} alt="img" style={{ maxWidth: '100%', borderRadius: 14, display: 'block', maxHeight: 220 }} /> : m.text}
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
        <ChatInput onSend={sendMessage} onImage={sendImage} />
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      {screen === 'chats' && <ChatsScreen />}
      {screen === 'friends' && <FriendsScreen />}
      {screen === 'newgroup' && <NewGroupScreen />}
      {screen === 'chat' && currentChat && <ChatScreen />}
    </div>
  )
}