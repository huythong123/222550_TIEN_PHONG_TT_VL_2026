import { useEffect, useState } from 'react'
import {
  getStoredToken,
  setAuthToken,
  loginUser,
  logoutUser,
  registerUser,
  getGoogleLoginUrl,
  getMe,
  estimateCredits,
  step1Extract,
  step2Script,
  step3Scene,
  step4Prompt,
  step5Voice,
  step6Video,
  step7Merge,
} from './api'
import AdminPanel from './AdminPanel'
import BuyCredits from './BuyCredits'

const API_BASE_RAW = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'
const API_ORIGIN = API_BASE_RAW.replace(/\/api\/v1\/?$/, '')

function resolveVideoUrl(raw) {
  if (!raw) return null
  try {
    // Normalize backslashes to forward slashes
    let s = String(raw).replace(/\\\\/g, '/').trim()

    // If the backend returned a filesystem path or a path containing 'storage/renders' or 'storage/raw_clips',
    // map it to the mounted routes used by the server.
    const markers = ['storage/renders', 'storage/raw_clips']
    for (const marker of markers) {
      const idx = s.indexOf(marker)
      if (idx !== -1) {
        const rel = s.substring(idx + marker.length)
        // for renders -> /renders, for raw_clips -> /storage/raw_clips (workspace-mounted)
        if (marker === 'storage/renders') return API_ORIGIN + '/renders' + (rel.startsWith('/') ? rel : '/' + rel)
        if (marker === 'storage/raw_clips') return API_ORIGIN + '/storage/raw_clips' + (rel.startsWith('/') ? rel : '/' + rel)
      }
    }

    // If already a /renders path, prefix origin
    if (s.startsWith('/renders/')) return API_ORIGIN + s

    if (s.startsWith('http://') || s.startsWith('https://')) return s
    if (s.startsWith('/')) return API_ORIGIN + s
    return API_ORIGIN + '/' + s
  } catch (e) {
    return String(raw)
  }
}


function JsonBlock({ value, playerKey }) {
  if (!value) return <p className="placeholder">Chưa có kết quả.</p>

  // CleanedContent (step 1)
  if (value.title && value.main_text) {
    return (
      <div className="result-article">
        <h4>{value.title}</h4>
        {value.source_url ? (
          <p><a href={value.source_url} target="_blank" rel="noreferrer">{value.source_url}</a></p>
        ) : null}
        <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.6rem' }}>{value.main_text}</div>
      </div>
    )
  }

  // MasterScript (step 2)
  if (value.hook && value.body && value.call_to_action) {
    return (
      <div className="result-script">
        <h4>Kịch bản tổng thể</h4>
        <div style={{ marginBottom: '0.5rem' }}><strong>Hook:</strong> <em>{value.hook}</em></div>
        <div style={{ marginBottom: '0.5rem' }}><strong>Nội dung:</strong> <div style={{ whiteSpace: 'pre-wrap' }}>{value.body}</div></div>
        <div style={{ marginBottom: '0.5rem' }}><strong>Call to action:</strong> {value.call_to_action}</div>
      </div>
    )
  }

  // Scenes array (step 3/4+)
  if (Array.isArray(value)) {
    return (
      <div className="result-scenes">
        <h4>Phân cảnh ({value.length})</h4>
        <ol>
          {value.map((s) => (
            <li key={s.scene_number} style={{ marginBottom: '0.6rem' }}>
              <div><strong>Cảnh {s.scene_number}</strong> — {s.duration}s</div>
              {s.visual_description ? <div style={{ whiteSpace: 'pre-wrap' }}>{s.visual_description}</div> : null}
              {s.voiceover ? <div style={{ color: 'var(--text-soft)' }}>Voiceover: {s.voiceover}</div> : null}
              {s.audio_path ? (
                <div style={{ marginTop: '0.4rem' }}>
                  <audio controls style={{ width: '100%' }}>
                    <source src={resolveVideoUrl(String(s.audio_path).replace(/\\/g, '/'))} />
                    Trình duyệt của bạn không hỗ trợ audio.
                  </audio>
                </div>
              ) : null}

              {s.video_path ? (
                <div style={{ marginTop: '0.6rem' }}>
                  <video key={s.video_path} controls style={{ maxWidth: '100%', borderRadius: 8 }}>
                    <source src={resolveVideoUrl(String(s.video_path).replace(/\\/g, '/'))} type="video/mp4" />
                    Trình duyệt của bạn không hỗ trợ video.
                  </video>
                </div>
              ) : null}
              {s.technical_prompt ? <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Technical prompt: <div style={{ whiteSpace: 'pre-wrap' }}>{s.technical_prompt}</div></div> : null}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  // Fallback: pretty JSON
  // If an object contains a web-accessible video_url, show a video player
  if (value && typeof value === 'object' && value.video_url) {
    const src = resolveVideoUrl(String(value.video_url).replace(/\\\\/g, '/'))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <video key={playerKey || src} controls style={{ maxWidth: '100%', borderRadius: 8 }}>
          <source src={src} type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ video.
        </video>
        <div style={{ color: 'var(--text-soft)' }}>
          Kết quả: <a href={src} target="_blank" rel="noreferrer">Mở file</a>
        </div>
        <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>
      </div>
    )
  }

  // If an object contains an audio_path, show an audio player
  if (value && typeof value === 'object' && value.audio_path) {
    const src = resolveVideoUrl(String(value.audio_path).replace(/\\\\/g, '/'))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <audio controls style={{ width: '100%' }}>
          <source src={src} />
          Trình duyệt của bạn không hỗ trợ audio.
        </audio>
        <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>
      </div>
    )
  }

  return <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>
}

const DEFAULT_STEP2_PAYLOAD = {
  title: 'AutoAds Product',
  main_text: 'Nội dung nguồn để tạo kịch bản quảng cáo ngắn gọn và hiệu quả.',
  source_url: 'https://example.com',
  duration_sec: 30,
}

const STEP_INFO = {
  1: { title: 'Phân tích nội dung website', input: 'Dán link', how_to: 'Dán link và chạy' },
  2: { title: 'Tạo kịch bản', input: 'JSON từ Bước 1', how_to: 'Dùng JSON từ Bước 1 và chạy' },
  3: { title: 'Chia phân cảnh', input: 'JSON từ Bước 2', how_to: 'Dùng JSON từ Bước 2 và chạy' },
  4: { title: 'Tạo prompt', input: 'JSON từ Bước 3', how_to: 'Dùng JSON từ Bước 3 và chạy' },
  5: { title: 'Tạo giọng đọc', input: 'Scenes JSON (có voiceover)', how_to: 'Dùng JSON từ Bước 4 và chạy' },
  6: { title: 'Render video', input: 'Scenes JSON (có technical_prompt)', how_to: 'Dùng JSON từ Bước 5 và chạy' },
  7: { title: 'Ghép phim', input: 'tvc_title + Scenes JSON', how_to: 'Dùng JSON từ Bước 6 và chạy' },
}

function App() {
  const [token, setToken] = useState(getStoredToken())
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [credits, setCredits] = useState(null)
  const [me, setMe] = useState(null)
  const [adminTargetUserId, setAdminTargetUserId] = useState('')
  const [adminCreditsAmount, setAdminCreditsAmount] = useState('')
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showBuyCredits, setShowBuyCredits] = useState(false)
  const [showBuyPage, setShowBuyPage] = useState(false)

  const [authEmail, setAuthEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [isRegisterView, setIsRegisterView] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState(null)
  const [playerKey, setPlayerKey] = useState(0)
  const [step1Payload, setStep1Payload] = useState(null)
  const [step2Payload, setStep2Payload] = useState(null)
  const [step3Payload, setStep3Payload] = useState(null)
  const [step4Payload, setStep4Payload] = useState(null)
  const [step5Payload, setStep5Payload] = useState(null)
  const [step6Payload, setStep6Payload] = useState(null)
  const [step7Payload, setStep7Payload] = useState(null)
  const [estimatedCredits, setEstimatedCredits] = useState(null)
  const [estimateTimer, setEstimateTimer] = useState(null)
  const [targetDuration, setTargetDuration] = useState(null)
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [selectedChatItemId, setSelectedChatItemId] = useState(null)

  useEffect(() => {
    // Auto-estimate credits when currentStep or inputText changes (debounced)
    try {
      if (estimateTimer) clearTimeout(estimateTimer)
    } catch (e) { }
    const t = setTimeout(async () => {
      try {
        let estPayload = { step: currentStep }
        if ([4, 5, 6, 7].includes(currentStep)) {
          try {
            const parsed = inputText ? JSON.parse(inputText) : null
            if (Array.isArray(parsed)) estPayload.scenes = parsed
            else if (parsed && parsed.scenes && Array.isArray(parsed.scenes)) estPayload.scenes = parsed.scenes
          } catch (e) { }
        }
        const r = await estimateCredits(estPayload)
        setEstimatedCredits(r?.estimated || 0)
      } catch (e) {
        // ignore
      }
    }, 600)
    setEstimateTimer(t)
    return () => clearTimeout(t)
  }, [currentStep, inputText])

  useEffect(() => {
    function handleDocClick(e) {
      if (!openMenuId) return
      const el = document.querySelector(`[data-menu-id="${openMenuId}"]`)
      if (!el) {
        setOpenMenuId(null)
        return
      }
      if (!el.contains(e.target)) setOpenMenuId(null)
    }

    function handleKey(e) {
      if (e.key === 'Escape') setOpenMenuId(null)
    }

    document.addEventListener('mousedown', handleDocClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDocClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openMenuId])

  useEffect(() => {
    setNotice('')
  }, [])

  // Handle OAuth redirect token (e.g. ?token=... from backend Google OAuth callback)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tokenFromUrl = params.get('token')
      const error = params.get('error')
      if (tokenFromUrl) {
        setLocalToken(tokenFromUrl)
        setNotice('Đăng nhập Google thành công')
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (error) {
        setNotice(error)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user')
    if (storedUser) setAuthEmail(storedUser)
  }, [])

  useEffect(() => {
    // Always load chats when auth token changes. If not logged in, load anon chats.
    loadChats()
    // Load current user profile (credits, role) when token changes
    async function loadMe() {
      if (!token) {
        setMe(null)
        setCredits(null)
        return
      }
      try {
        const profile = await getMe()
        setMe(profile)
        setCredits(profile?.credits ?? 0)
        try {
          const name = profile?.username || profile?.email || ''
          if (name) localStorage.setItem('auth_user', name)
        } catch (e) { }
        // Now that `me` is set, reload chats to pick up the user-specific key
        try { loadChats() } catch (e) { }

        // Fetch server-side run logs for this user and merge into local chats
        try {
          const serverRuns = await getMyLogs()
          if (serverRuns && Array.isArray(serverRuns) && serverRuns.length) {
            // Convert runs into chat objects and merge without overwriting local chats
            const serverChats = serverRuns.map((r) => {
              const chatId = `run_${r.run_id}`
              const items = (r.events || []).map((ev, idx) => ({ id: `${r.run_id}_${idx}`, step: 0, input: '', result: ev.data || {}, created_at: ev.timestamp }))
              return { id: chatId, title: `Run ${r.date} ${r.run_id}`, created_at: r.first_timestamp || new Date().toISOString(), items }
            })
            // Merge: prefer existing local chats, append server chats that don't already exist
            try {
              const key = chatStorageKey()
              const raw = localStorage.getItem(key)
              const existing = raw ? JSON.parse(raw) : []
              const existingIds = new Set((existing || []).map((c) => c.id))
              const merged = [...serverChats.filter((c) => !existingIds.has(c.id)), ...(existing || [])]
              if (merged.length) {
                setChats(merged)
                try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) { }
              }
            } catch (e) { }
          }
        } catch (e) {
          // ignore fetch errors
        }
      } catch (e) {
        setMe(null)
        setCredits(null)
      }
    }
    loadMe()
  }, [token])

  // When entering Step 2, if we have a saved Step1 payload and the input is empty,
  // prefill the textarea with editable JSON so the user can tweak it before running.
  useEffect(() => {
    try {
      if (currentStep === 2 && step1Payload && (!inputText || inputText.trim() === '')) {
        setInputText(JSON.stringify(step1Payload, null, 2))
      }
    } catch (e) {
      // ignore
    }
  }, [currentStep, step1Payload])

  useEffect(() => {
    try {
      if (currentStep === 3 && step2Payload && (!inputText || inputText.trim() === '')) {
        setInputText(JSON.stringify(step2Payload, null, 2))
      }
    } catch (e) {
      // ignore
    }
  }, [currentStep, step2Payload])

  // Auto-fill for steps 4..7 from previous step payloads
  useEffect(() => {
    try {
      if (currentStep === 4 && step3Payload && (!inputText || inputText.trim() === '')) setInputText(JSON.stringify(step3Payload, null, 2))
      if (currentStep === 5 && step4Payload && (!inputText || inputText.trim() === '')) setInputText(JSON.stringify(step4Payload, null, 2))
      if (currentStep === 6 && step5Payload && (!inputText || inputText.trim() === '')) setInputText(JSON.stringify(step5Payload, null, 2))
    } catch (e) {
      // ignore
    }
  }, [currentStep, step3Payload, step4Payload, step5Payload, step6Payload])

  function chatStorageKey() {
    try {
      if (me && me.id) return `chats:user_${me.id}`
      const stored = localStorage.getItem('auth_user')
      if (stored && String(stored).trim() !== '') return `chats:${stored}`
    } catch (e) { }
    return 'chats:anon'
  }

  function persistChats(next) {
    try {
      const key = chatStorageKey()
      try { localStorage.setItem(key, JSON.stringify(next)) } catch (e) { }
      try {
        const storedName = localStorage.getItem('auth_user')
        if (storedName) localStorage.setItem(`chats:${storedName}`, JSON.stringify(next))
      } catch (e) { }
    } catch (e) {
      console.warn('persistChats failed', e)
    }
  }

  function loadChats() {
    try {
      const key = chatStorageKey()
      let raw = localStorage.getItem(key)
      // Migration fallback: if per-user key is empty, try legacy `chats:<username>` key
      if ((!raw || raw === 'null') && me && localStorage.getItem('auth_user')) {
        const storedName = localStorage.getItem('auth_user')
        if (storedName && storedName !== '') {
          const legacyKey = `chats:${storedName}`
          const legacyRaw = localStorage.getItem(legacyKey)
          if (legacyRaw) {
            raw = legacyRaw
            // Persist into new key
            try { localStorage.setItem(key, legacyRaw) } catch (e) { }
          }
        }
      }
      let parsed = raw ? JSON.parse(raw) : []

      setChats(parsed)
      if (parsed.length && !selectedChatId) setSelectedChatId(parsed[0].id)
    } catch (e) {
      setChats([])
    }
  }

  function createNewChat() {
    const id = Date.now().toString()
    const c = { id, title: 'Hệ thống tạo video quảng cáo', created_at: new Date().toISOString(), items: [] }
    const next = [c, ...chats]
    setChats(next)
    persistChats(next)
    setSelectedChatId(id)
    setSelectedChatItemId(null)
    setResult(null)
    setInputText('')
    try { localStorage.setItem('last_new_chat', id) } catch { }
    return id
  }

  function selectChat(id) {
    setSelectedChatId(id)
    setSelectedChatItemId(null)
    setResult(null)
    setInputText('')
    setStep1Payload(null)
    setStep2Payload(null)
    setStep3Payload(null)
    setStep4Payload(null)
    setStep5Payload(null)
    setStep6Payload(null)
    setStep7Payload(null)
    setEstimatedCredits(null)
    try { setPlayerKey(Date.now()) } catch (e) { }
  }

  function deleteChat(id) {
    if (!window.confirm('Xóa cuộc chat này? Hành động không thể hoàn tác.')) return
    const next = chats.filter((c) => c.id !== id)
    setChats(next)
    persistChats(next)
    if (selectedChatId === id) {
      setSelectedChatId(next.length ? next[0].id : null)
      setSelectedChatItemId(null)
      setResult(null)
      setInputText('')
    }
  }

  function renameChat(id) {
    const chat = chats.find((c) => c.id === id)
    if (!chat) return
    const name = window.prompt('Đổi tên lịch sử (project):', chat.title)
    if (name == null) return
    const trimmed = String(name).trim()
    if (!trimmed) return
    const next = chats.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    setChats(next)
    persistChats(next)
    setOpenMenuId(null)
  }

  function toggleMenu(id) {
    setOpenMenuId((prev) => (prev === id ? null : id))
  }

  function deleteChatItem(chatId, itemId) {
    if (!window.confirm('Xóa mục này khỏi lịch sử?')) return
    const next = chats.map((c) => {
      if (c.id !== chatId) return c
      return { ...c, items: c.items.filter((it) => it.id !== itemId) }
    })
    setChats(next)
    persistChats(next)
    if (selectedChatId === chatId) {
      const chat = next.find((c) => c.id === chatId)
      if (chat && chat.items.length === 0) setResult(null)
    }
    if (selectedChatItemId === itemId) setSelectedChatItemId(null)
  }

  function addToChat(id, entry) {
    const next = chats.map((c) => (c.id === id ? { ...c, items: [...c.items, entry] } : c))
    setChats(next)
    persistChats(next)
  }

  function saveCurrentToChat() {
    if (!result) {
      setNotice('Không có kết quả để lưu')
      return
    }
    if (!selectedChatId) {
      const id = createNewChat()
      const entry = { id: Date.now().toString(), step: currentStep, input: inputText, result, created_at: new Date().toISOString() }
      addToChat(id, entry)
      setSelectedChatItemId(entry.id)
      setNotice('Đã lưu vào lịch sử chat')
      return
    }
    const entry = { id: Date.now().toString(), step: currentStep, input: inputText, result, created_at: new Date().toISOString() }
    addToChat(selectedChatId, entry)
    setSelectedChatItemId(entry.id)
    setNotice('Đã lưu vào lịch sử chat')
  }

  function downloadJson(filename, obj) {
    try {
      const content = JSON.stringify(obj, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.warn('downloadJson failed', e)
      setNotice('Tải file thất bại')
    }
  }

  function downloadResult() {
    if (!result) {
      setNotice('Không có kết quả để tải')
      return
    }
    const filename = `autoads_step${currentStep}_${Date.now()}.json`
    downloadJson(filename, result)
    setNotice('Bắt đầu tải file JSON')
  }

  function importResultToNextStep() {
    if (!result) {
      setNotice('Không có kết quả để chuyển')
      return
    }
    const target = Math.min(8, currentStep + 1)
    try {
      setInputText(JSON.stringify(result, null, 2))
      setCurrentStep(target)
      setNotice(`Đã chuyển kết quả sang input Bước ${target}`)
    } catch (e) {
      setNotice('Không thể chuyển kết quả')
    }
  }

  function importHistoryItem(chatId, item) {
    if (!item || !item.result) {
      setNotice('Mục lịch sử không có kết quả')
      return
    }
    const target = Math.min(8, item.step + 1)
    try {
      setSelectedChatId(chatId)
      setSelectedChatItemId(item.id)
      setInputText(JSON.stringify(item.result, null, 2))
      setCurrentStep(target)
      setNotice(`Đã nhập mục lịch sử vào input Bước ${target}`)
    } catch (e) {
      setNotice('Không thể nhập mục lịch sử')
    }
  }

  function setLocalToken(t) {
    setToken(t)
    setAuthToken(t)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const res = await loginUser(authEmail, password)
      if (res?.access_token) {
        localStorage.setItem('auth_user', authEmail)
        setLocalToken(res.access_token)
        // After login, open workspace at step 1
        setCurrentStep(1)
        setSelectedChatId(null)
        setResult(null)
        // create a default chat if none exists
        if (!chats || chats.length === 0) {
          createNewChat()
        }
        setNotice('Đăng nhập thành công')
      } else {
        setNotice('Đăng nhập thất bại')
      }
    } catch (err) {
      setNotice(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    try {
      // Persist current chats to the appropriate storage key (user-specific if available)
      try { localStorage.setItem(chatStorageKey(), JSON.stringify(chats || [])) } catch (e) { }
    } finally {
      logoutUser()
      setToken(null)
      localStorage.removeItem('auth_user')
      setNotice('Đã đăng xuất')
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const email = (authEmail || '').trim().toLowerCase()
      if (!email.endsWith('@gmail.com') && !email.endsWith('@googlemail.com')) {
        setNotice('Chỉ hỗ trợ đăng ký bằng Gmail (@gmail.com hoặc @googlemail.com)')
        setBusy(false)
        return
      }
      const res = await registerUser(email, password)
      localStorage.setItem('auth_user', email)
      setNotice('Tạo tài khoản thành công (hoặc đã gửi mail xác thực)')
    } catch (err) {
      setNotice(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  async function runStep() {
    // Validate step 1 input: must be non-empty and a valid URL
    if (currentStep === 1) {
      const url = (inputText || '').trim()
      if (!url) {
        const msg = 'Bước 1: vui lòng nhập link (URL). Không được để trống.'
        setNotice(msg)
        try { window.alert(msg) } catch (e) { }
        return
      }
      try {
        // URL constructor will throw for invalid urls
        new URL(url)
      } catch (err) {
        const msg = 'Bước 1: URL không hợp lệ. Vui lòng nhập định dạng link hợp lệ (ví dụ https://example.com).'
        setNotice(msg)
        try { window.alert(msg) } catch (e) { }
        return
      }
    }

    // For all other steps, require the user to provide input JSON/text explicitly.
    if (currentStep !== 1) {
      const raw = (inputText || '').trim()
      if (!raw) {
        const msg = `Bước ${currentStep}: Vui lòng nhập input (JSON hoặc kết quả từ bước trước).`
        setNotice(msg)
        try { window.alert(msg) } catch (e) { }
        return
      }
    }

    // Request an estimate of credits for this step and ensure user has enough
    try {
      let estPayload = { step: currentStep }
      // For scene-based steps, try to detect scenes from inputText
      if ([4, 5, 6, 7].includes(currentStep)) {
        try {
          const parsed = inputText ? JSON.parse(inputText) : null
          if (Array.isArray(parsed)) estPayload.scenes = parsed
          else if (parsed && parsed.scenes && Array.isArray(parsed.scenes)) estPayload.scenes = parsed.scenes
        } catch (e) { }
      }
      const estimateRes = await estimateCredits(estPayload)
      const estimated = estimateRes?.estimated || 0
      setEstimatedCredits(estimated)
      if (typeof credits === 'number' && credits < estimated) {
        const msg = `Cần ${estimated} credits để chạy Bước ${currentStep}, nhưng bạn chỉ có ${credits} credits. Vui lòng nạp thêm.`
        setNotice(msg)
        try { window.alert(msg) } catch (e) { }
        return
      }
      if (estimated > 0) setNotice(`Ước tính tiêu hao: ${estimated} credits`)
    } catch (e) {
      try { console.warn('estimateCredits failed', e) } catch (err) { }
    }

    setBusy(true)
    setResult(null)
    setNotice('')
    try {
      let res = null
      if (currentStep === 1) {
        setNotice('Bước 1: Đang cào nội dung từ URL...')
        res = await step1Extract(inputText || 'https://example.com')
        setNotice('Bước 1: Hoàn tất cào dữ liệu')
        // Save the structured result so user can import it into Step 2 when ready
        try { setStep1Payload(res) } catch (e) { }
        // Refresh user profile to pick up credit deduction
        try { const profile = await getMe(); setMe(profile); setCredits(profile?.credits ?? credits); } catch (e) { }
        // Do NOT auto-advance to Step 2; user should manually navigate or import JSON
      } else if (currentStep === 2) {
        setNotice('Bước 2: Đang sinh kịch bản tổng thể...')
        // Prefer structured inputText JSON, otherwise use last `result` if it looks like CleanedContent
        let payload = null
        if (inputText) {
          try { payload = JSON.parse(inputText) } catch (e) { payload = null }
        }
        if (!payload && result && result.title && result.main_text) payload = result
        if (!payload) {
          const msg = 'Bước 2: Cần MasterScript (JSON). Vui lòng dán JSON hoặc chạy Bước 1 trước.'
          setNotice(msg)
          setBusy(false)
          try { window.alert(msg) } catch (e) { }
          return
        }
        res = await step2Script(payload)
        setNotice('Bước 2: Kịch bản tạo xong')
        try { setStep2Payload(res) } catch (e) { }
      } else if (currentStep === 3) {
        setNotice('Bước 3: Đang chia kịch bản thành phân cảnh...')
        let payload = null
        try { payload = inputText ? JSON.parse(inputText) : null } catch (e) { payload = null }
        if (!payload) {
          const msg = 'Bước 3: Cần MasterScript (JSON). Vui lòng dán JSON từ Bước 2.'
          setNotice(msg)
          setBusy(false)
          try { window.alert(msg) } catch (e) { }
          return
        }
        res = await step3Scene(payload, targetDuration)
        setNotice('Bước 3: Phân cảnh hoàn tất')
        try { setStep3Payload(res) } catch (e) { }
      } else if (currentStep === 4) {
        setNotice('Bước 4: Đang sinh prompt (image & technical) cho phân cảnh...')
        let payload = null
        try { payload = inputText ? JSON.parse(inputText) : null } catch (e) { payload = null }
        if (!payload) {
          const msg = 'Bước 4: Cần danh sách `scenes` (JSON). Vui lòng dán JSON từ Bước 3.'
          setNotice(msg)
          setBusy(false)
          try { window.alert(msg) } catch (e) { }
          return
        }
        res = await step4Prompt(payload)
        setNotice('Bước 4: Hoàn tất tạo prompt')
        try { setStep4Payload(res) } catch (e) { }
      } else if (currentStep === 5) {
        // Voice generation: expects scenes (from step4 prompt)
        let payload = []
        try {
          payload = inputText ? JSON.parse(inputText) : (Array.isArray(result) ? result : [])
        } catch (e) {
          payload = []
        }
        if (!payload || !payload.length) {
          const msg = 'Bước 5 cần danh sách phân cảnh (JSON). Vui lòng chạy bước 3/4 hoặc nhập JSON scenes.'
          setNotice(msg)
          setBusy(false)
          try { window.alert(msg) } catch (e) { }
          return
        }
        setNotice(`Bước 5: Đang tạo giọng đọc cho ${payload.length} phân cảnh...`)
        res = await step5Voice(payload)
        setNotice('Bước 5: Hoàn tất tạo giọng đọc')
        try { setStep5Payload(res) } catch (e) { }
      } else if (currentStep === 6) {
        // Video generation: expects scenes
        let payload = []
        try {
          payload = inputText ? JSON.parse(inputText) : (Array.isArray(result) ? result : [])
        } catch (e) {
          payload = []
        }
        if (!payload || !payload.length) {
          const msg = 'Bước 6 cần danh sách phân cảnh (JSON). Vui lòng chạy bước 3/4 hoặc nhập JSON scenes.'
          setNotice(msg)
          setBusy(false)
          try { window.alert(msg) } catch (e) { }
          return
        }
        setNotice(`Bước 6: Đang render video cho ${payload.length} phân cảnh (có thể mất nhiều thời gian)...`)
        res = await step6Video(payload)
        setNotice('Bước 6: Hoàn tất render video (bản nháp)')
        try { setStep6Payload(res) } catch (e) { }
      } else if (currentStep === 7) {
        // Merge: use the result from step6 automatically (no manual input required)
        const scenes = Array.isArray(step6Payload) ? step6Payload : (Array.isArray(result) ? result : [])
        const tvcTitle = (step6Payload && step6Payload.tvc_title) || (result && result.tvc_title) || 'AutoAds Product'
        const runId = (step6Payload && step6Payload.run_id) || (scenes && scenes.length ? scenes[0].run_id : null) || null
        if (!scenes || !scenes.length) {
          const msg = 'Bước 7 cần danh sách phân cảnh để ghép video. Vui lòng chạy các bước trước.'
          setNotice(msg)
          setBusy(false)
          try { window.alert(msg) } catch (e) { }
          return
        }
        setNotice('Bước 7: Đang dựng phim (merge audio & video)...')
        res = await step7Merge(tvcTitle, scenes, runId)
        setNotice('Bước 7: Dựng phim hoàn tất')
      }

      setResult(res)
      // Refresh user profile so credits update immediately after running a step
      try {
        if (token) {
          const profileAfter = await getMe()
          setMe(profileAfter)
          setCredits(profileAfter?.credits ?? credits)
        }
      } catch (e) {
        // ignore profile refresh errors
      }
      // reset video player whenever a new result is set
      try { setPlayerKey(Date.now()) } catch (e) { }
      // Auto-save run result into chat history (shared)
      if (res) {
        const entry = { id: Date.now().toString(), step: currentStep, input: inputText, result: res, created_at: new Date().toISOString() }
        if (selectedChatId) {
          // If this is the first saved entry in the selected chat and this is Step 1,
          // update the chat title to the returned `title` (e.g. cleaned article title).
          try {
            const chat = chats.find((c) => c.id === selectedChatId)
            if (chat) {
              const wasEmpty = !(chat.items && chat.items.length)
              if (currentStep === 1 && wasEmpty && res && res.title) {
                const next = chats.map((c) => (c.id === selectedChatId ? { ...c, title: res.title } : c))
                setChats(next)
                try { persistChats(next) } catch (e) { }
              }
            }
          } catch (e) { }
          addToChat(selectedChatId, entry)
        } else {
          const chatId = Date.now().toString()
          // If step1 returned a title, use it for the new chat; otherwise fallback to default
          const preferredTitle = (currentStep === 1 && res && res.title) ? res.title : 'Hệ thống tạo video quảng cáo'

          // If user has no selected chat, prefer reusing an existing empty placeholder chat
          // with the default title to avoid spawning many empty chats. Otherwise create new.
          let usedChatId = null
          try {
            const placeholderIndex = chats.findIndex((c) => {
              const isPlaceholder = (c.title === 'Hệ thống tạo video quảng cáo')
              const empty = !(c.items && c.items.length)
              return isPlaceholder && empty
            })
            if (placeholderIndex !== -1) {
              // reuse and rename
              usedChatId = chats[placeholderIndex].id
              const next = chats.map((c) => (c.id === usedChatId ? { ...c, title: preferredTitle } : c))
              setChats(next)
              try { persistChats(next) } catch (e) { }
            }
          } catch (e) { }

          if (!usedChatId) {
            const newChat = { id: chatId, title: preferredTitle, created_at: new Date().toISOString(), items: [entry] }
            const next = [newChat, ...chats]
            setChats(next)
            persistChats(next)
            usedChatId = chatId
          } else {
            // If we reused a placeholder chat, append the entry to it
            addToChat(usedChatId, entry)
            setSelectedChatId(usedChatId)
          }
        }
        setNotice('Đã lưu kết quả vào lịch sử chung')
      }
    } catch (err) {
      setNotice(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  const accountLabel = localStorage.getItem('auth_user') || 'Thông Lự Huy'

  if (!token) {
    return (
      <div className="auth-shell">
        <main className="center-area">
          <section className="card">
            <h2>{isRegisterView ? 'Đăng ký' : 'Đăng nhập'}</h2>
            <form onSubmit={isRegisterView ? handleRegister : handleLogin} className="form-grid">
              <label>
                Email hoặc username
                <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              </label>
              <label>
                Mật khẩu
                <div className="input-with-icon">
                  <input className="form-input" type={passwordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button
                    type="button"
                    aria-label={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="toggle-password"
                    onClick={() => setPasswordVisible((s) => !s)}
                  >
                    {passwordVisible ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9.88 9.88A3 3 0 0114.12 14.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.94 5.11C12.2 5 13.58 5.32 15 6.05C18 7.6 20 10.5 21 12c-.72 1.3-2 3.2-4 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 12c1 1.5 3 4 6 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={busy}>{isRegisterView ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
                <button type="button" onClick={() => setIsRegisterView((s) => !s)} disabled={busy}>{isRegisterView ? 'Quay lại' : 'Đăng ký'}</button>
              </div>
              <p style={{ color: 'var(--text-soft)' }}>Hoặc đăng nhập với Google</p>
              <button type="button" className="google-login" onClick={() => window.location.assign(getGoogleLoginUrl())}>Đăng nhập với Google</button>
            </form>
            {notice ? <p className="notice">{notice}</p> : null}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="sidebar-top">
          {me && me.role === 'admin' ? (
            <div style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700 }}>Admin Panel</div>
            </div>
          ) : (
            <>
              <button className="sidebar-new" onClick={createNewChat}>+ Tạo chat mới</button>
              <nav className="sidebar-nav">
                {chats.length > 0 ? (
                  <>
                    <div className="section-label">Gần đây</div>
                    {chats.map((c) => (
                      <div key={c.id} className={"chat-list-item" + (selectedChatId === c.id ? ' active' : '')}>
                        <button onClick={() => selectChat(c.id)} className={"chat-title" + (selectedChatId === c.id ? ' active' : '')}>{c.title}</button>
                        <div style={{ position: 'relative' }} data-menu-id={c.id}>
                          <button aria-label="menu" className="chat-menu-button" onClick={() => toggleMenu(c.id)}>⋯</button>
                          {openMenuId === c.id ? (
                            <div className="chat-menu-dropdown">
                              <button onClick={() => renameChat(c.id)}>Đổi tên</button>
                              <button onClick={() => { if (window.confirm('Xác nhận xóa lịch sử này?')) { deleteChat(c.id); setOpenMenuId(null) } }}>Xóa</button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  (chats.length === 0 ? (
                    <div className="empty-list">Không có lịch sử. Tạo chat mới.</div>
                  ) : (
                    chats.map((c) => (
                      <div key={c.id} className={"chat-list-item" + (selectedChatId === c.id ? ' active' : '')}>
                        <button onClick={() => selectChat(c.id)} className="chat-title">{c.title}</button>
                        <div style={{ position: 'relative' }} data-menu-id={c.id}>
                          <button aria-label="menu" className="chat-menu-button" onClick={() => toggleMenu(c.id)}>⋯</button>
                          {openMenuId === c.id ? (
                            <div className="chat-menu-dropdown">
                              <button onClick={() => renameChat(c.id)}>Đổi tên</button>
                              <button onClick={() => { if (window.confirm('Xác nhận xóa lịch sử này?')) { deleteChat(c.id); setOpenMenuId(null) } }}>Xóa</button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ))
                )}
              </nav>
            </>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="user">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600 }}>{accountLabel}</div>
              <small style={{ color: 'var(--text-soft)' }}>{localStorage.getItem('auth_user') || ''}</small>
              {/* Token is kept in-memory only and not shown in UI for security */}
              {credits != null && credits !== 0 ? (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ fontSize: 13 }}><strong>Credits:</strong> {String(credits)}</div>
                </div>
              ) : null}
              {!(me && me.role === 'admin') ? (
                <div style={{ marginTop: '0.6rem' }}>
                  <button onClick={() => setShowBuyPage(true)} style={{ marginTop: '0.5rem' }}>Mua Credits</button>
                </div>
              ) : null}
            </div>
            <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </div>
          {me && me.role === 'admin' ? (
            <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Admin</div>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="chat-main">
        <div className="center-area">
          <section className="card">
            <div className="row-between">
              <h2>Auto Ads System</h2>
              {notice ? <div style={{ marginTop: '0.6rem', padding: '0.6rem', borderRadius: 6, background: 'var(--card-bg)', border: '1px solid var(--border)', color: notice.startsWith('Bước') ? 'var(--text)' : 'var(--text)', fontWeight: 600 }}>{notice}</div> : null}
            </div>

            {me && me.role === 'admin' ? (
              <AdminPanel />
            ) : showAdminPanel ? (
              <AdminPanel />
            ) : showBuyPage ? (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ textAlign: 'left', marginBottom: '0.8rem' }}>
                  <button onClick={() => setShowBuyPage(false)} style={{ display: 'inline-block', padding: '0.4rem 0.6rem', borderRadius: 6 }}>← Quay lại</button>
                </div>
                <div style={{ marginTop: '0.6rem' }}>
                  <BuyCredits pageMode onBought={(c) => { setCredits(c); setShowBuyPage(false); }} onClose={() => setShowBuyPage(false)} />
                </div>
              </div>
            ) : (

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                    <button key={s} onClick={() => { setCurrentStep(s); setResult(null); }} className={currentStep === s ? 'tab active' : 'tab'}>
                      Bước {s}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label>
                    Dữ liệu (URL cho bước 1 hoặc JSON cho các bước khác)
                    <textarea rows={10} style={{ width: '100%', minHeight: 160, resize: 'vertical' }} value={inputText} onChange={(e) => setInputText(e.target.value)} />
                  </label>

                  <div className="step-info" style={{ marginTop: '0.8rem', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card-bg)' }}>
                    {STEP_INFO[currentStep] ? (
                      <>
                        <div style={{ fontWeight: 700 }}>{`Bước ${currentStep}: ${STEP_INFO[currentStep].title}`}</div>
                        {STEP_INFO[currentStep].how_to ? <div style={{ marginTop: '0.5rem' }}><strong>Hướng dẫn sử dụng:</strong> {STEP_INFO[currentStep].how_to}</div> : null}
                      </>
                    ) : (
                      <div className="placeholder">Không có thông tin cho bước này.</div>
                    )}
                  </div>
                  {/* If there's a result captured from step 1, offer to import it into step 2 */}
                  {currentStep === 2 && step1Payload ? (
                    <div style={{ marginTop: '0.6rem', padding: '0.6rem', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--card-bg)' }}>
                      <div style={{ fontWeight: 600 }}>Dữ liệu nguồn từ Bước 1</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(step1Payload, null, 2)}</pre>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button onClick={() => { try { setInputText(JSON.stringify(step1Payload, null, 2)); setNotice('Đã điền JSON của Bước 1 vào input.'); setCurrentStep(2); setResult(null); } catch (e) { } }}>Sử dụng JSON này cho Bước 2</button>
                        <button style={{ marginLeft: '0.5rem' }} onClick={() => { setStep1Payload(null); setNotice('Đã bỏ dữ liệu nguồn từ Bước 1') }}>Bỏ</button>
                      </div>
                    </div>
                  ) : null}
                  {/* If there's a result captured from step 2, offer to import it into step 3 */}
                  {currentStep === 3 && step2Payload ? (
                    <div style={{ marginTop: '0.6rem', padding: '0.6rem', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--card-bg)' }}>
                      <div style={{ fontWeight: 600 }}>Dữ liệu nguồn từ Bước 2</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(step2Payload, null, 2)}</pre>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button onClick={() => { try { setInputText(JSON.stringify(step2Payload, null, 2)); setNotice('Đã điền JSON của Bước 2 vào input.'); setCurrentStep(3); setResult(null); } catch (e) { } }}>Sử dụng JSON này cho Bước 3</button>
                        <button style={{ marginLeft: '0.5rem' }} onClick={() => { setStep2Payload(null); setNotice('Đã bỏ dữ liệu nguồn từ Bước 2') }}>Bỏ</button>
                      </div>
                    </div>
                  ) : null}
                  {currentStep === 3 ? (
                    <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>Chọn tổng thời lượng:</div>
                        <select value={targetDuration ?? ''} onChange={(e) => setTargetDuration(e.target.value ? parseInt(e.target.value) : null)}>
                          <option value=''>Tự động</option>
                          <option value='15'>15s</option>
                          <option value='30'>30s</option>
                          <option value='60'>60s</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                  {/* If there's a result captured from step 3, offer to import it into step 4 */}
                  {currentStep === 4 && step3Payload ? (
                    <div style={{ marginTop: '0.6rem', padding: '0.6rem', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--card-bg)' }}>
                      <div style={{ fontWeight: 600 }}>Dữ liệu nguồn từ Bước 3</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(step3Payload, null, 2)}</pre>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button onClick={() => { try { setInputText(JSON.stringify(step3Payload, null, 2)); setNotice('Đã điền JSON của Bước 3 vào input.'); setCurrentStep(4); setResult(null); } catch (e) { } }}>Sử dụng JSON này cho Bước 4</button>
                        <button style={{ marginLeft: '0.5rem' }} onClick={() => { setStep3Payload(null); setNotice('Đã bỏ dữ liệu nguồn từ Bước 3') }}>Bỏ</button>
                      </div>
                    </div>
                  ) : null}

                  {/* If there's a result captured from step 4, offer to import it into step 5 */}
                  {/* Step 5 (image creation) removed from workflow; use Step 4 (prompt) -> Step 6/7 media steps directly. */}

                  {/* If there's a result captured from step 5, offer to import it into step 6 */}


                  {/* If there's a result captured from step 5, offer to import it into step 6 */}
                  {currentStep === 6 && step5Payload ? (
                    <div style={{ marginTop: '0.6rem', padding: '0.6rem', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--card-bg)' }}>
                      <div style={{ fontWeight: 600 }}>Dữ liệu nguồn từ Bước 5</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(step5Payload, null, 2)}</pre>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button onClick={() => { try { setInputText(JSON.stringify(step5Payload, null, 2)); setNotice('Đã điền JSON của Bước 5 vào input.'); setCurrentStep(6); setResult(null); } catch (e) { } }}>Sử dụng JSON này cho Bước 6</button>
                        <button style={{ marginLeft: '0.5rem' }} onClick={() => { setStep5Payload(null); setNotice('Đã bỏ dữ liệu nguồn từ Bước 5') }}>Bỏ</button>
                      </div>
                    </div>
                  ) : null}

                  {/* Step 7: final merge uses step6 result automatically; no manual input required */}
                  <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => { setCurrentStep((s) => Math.max(1, s - 1)); setResult(null); }} disabled={busy || currentStep === 1}>← Trước</button>
                    <button onClick={() => { setCurrentStep((s) => Math.min(7, s + 1)); setResult(null); }} disabled={busy || currentStep === 7}>Tiếp →</button>

                    <button onClick={runStep} disabled={busy || !token}>{busy ? 'Đang chạy...' : 'Chạy bước'}</button>
                    {estimatedCredits != null ? <div style={{ marginLeft: '0.6rem', color: estimatedCredits > credits ? 'red' : 'inherit', fontWeight: 700 }}>Ước tính: {estimatedCredits} credits</div> : null}
                    {!token ? <span style={{ marginLeft: '0.6rem', color: 'var(--text-soft)' }}>Vui lòng đăng nhập để chạy các bước.</span> : null}
                    <button style={{ marginLeft: '0.6rem' }} onClick={saveCurrentToChat} disabled={busy}>Lưu vào lịch sử</button>
                  </div>
                </div>

                <div style={{ marginTop: '1.2rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Kết quả
                    <div style={{ display: 'inline-flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                      <button onClick={downloadResult} disabled={!result}>Tải JSON</button>
                      <button onClick={importResultToNextStep} disabled={!result}>{`Sử dụng làm input Bước ${Math.min(7, currentStep + 1)}`}</button>
                    </div>
                  </h3>
                  <JsonBlock value={result} playerKey={playerKey} />
                </div>

                <div style={{ marginTop: '1.2rem' }}>
                  <h3>Lịch sử chat</h3>
                  {!selectedChatId ? (
                    <p className="placeholder">Chưa chọn chat</p>
                  ) : (
                    (() => {
                      const chat = chats.find((c) => c.id === selectedChatId)
                      if (!chat) return <p className="placeholder">Chat không tồn tại</p>
                      return (
                        <div className="chat-history">
                          <div className="chat-history-title">{chat.title}</div>
                          {(() => {
                            const visible = (chat.items || []).filter((it) => it.step === currentStep)
                            if (!visible.length) return <p className="placeholder">Chưa có mục nào cho bước này</p>
                            return (
                              <ul className="chat-items">
                                {visible.map((it) => (
                                  <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button onClick={() => { setResult(it.result); setSelectedChatItemId(it.id); setNotice(`Tải mục: ${new Date(it.created_at).toLocaleString()}`); setPlayerKey(it.id + '_' + Date.now()); }} className={"chat-item-btn" + (selectedChatItemId === it.id ? ' active' : '')}>{new Date(it.created_at).toLocaleString()} (B{it.step})</button>
                                    <button onClick={() => importHistoryItem(chat.id, it)} title="Nhập mục này làm input cho bước tiếp theo" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>⤴</button>
                                    <button onClick={() => deleteChatItem(chat.id, it.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-soft)', cursor: 'pointer' }}>✕</button>
                                  </li>
                                ))}
                              </ul>
                            )
                          })()}
                        </div>
                      )
                    })()
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
