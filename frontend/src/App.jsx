import React, { useEffect, useState, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import {
  getStoredToken,
  setAuthToken,
  loginUser,
  logoutUser,
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
  getMyChats,
  saveMyChats,
  updateMyPassword,
} from './api'
import AdminPanel from './AdminPanel'
import BuyCredits from './BuyCredits'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import WorkspacePage from './pages/WorkspacePage'
import ConfirmModal from './components/ui/ConfirmModal'
import PromptModal from './components/ui/PromptModal'
import { STEP_INFO } from './components/workspace/stepInfo'

function App() {
  const DEFAULT_CHAT_TITLE = 'Đoạn chat tạo video mới'
  const [token, setToken] = useState(getStoredToken())
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [credits, setCredits] = useState(null)
  const [me, setMe] = useState(null)
  const [showBuyPage, setShowBuyPage] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const [authEmail, setAuthEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
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
  const [estimateTimer, setEstimateTimer] = useState(null)
  const [estimatedCredits, setEstimatedCredits] = useState(null)
  const [targetDuration, setTargetDuration] = useState(null)
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [selectedChatItemId, setSelectedChatItemId] = useState(null)

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', resolve: null })
  const [promptState, setPromptState] = useState({ open: false, title: '', message: '', defaultValue: '', resolve: null })
  const showConfirm = useCallback((title, message) => new Promise((resolve) => {
    setConfirmState({ open: true, title, message, resolve })
  }), [])
  const showPrompt = useCallback((title, message, defaultValue = '') => new Promise((resolve) => {
    setPromptState({ open: true, title, message, defaultValue, resolve })
  }), [])
  const closeConfirm = useCallback((result) => {
    confirmState.resolve?.(result)
    setConfirmState(s => ({ ...s, open: false }))
  }, [confirmState])
  const closePrompt = useCallback((result) => {
    promptState.resolve?.(result)
    setPromptState(s => ({ ...s, open: false }))
  }, [promptState])
  const [showLoginFromHash, setShowLoginFromHash] = useState(() => {
    try { return window?.location?.hash === '#login' } catch (e) { return false }
  })

  useEffect(() => {
    function onHash() { try { setShowLoginFromHash(window.location.hash === '#login') } catch (e) { } }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    try { if (estimateTimer) clearTimeout(estimateTimer) } catch (e) { }
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
      } catch (e) { }
    }, 600)
    setEstimateTimer(t)
    return () => clearTimeout(t)
  }, [currentStep, inputText])

  useEffect(() => {
    function handleDocClick(e) {
      if (!openMenuId) return
      const el = document.querySelector(`[data-menu-id="${openMenuId}"]`)
      if (!el) { setOpenMenuId(null); return }
      if (!el.contains(e.target)) setOpenMenuId(null)
    }
    function handleKey(e) { if (e.key === 'Escape') setOpenMenuId(null) }
    document.addEventListener('mousedown', handleDocClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDocClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openMenuId])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tokenFromUrl = params.get('token')
      if (tokenFromUrl) {
        setLocalToken(tokenFromUrl)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (e) { }
  }, [])

  useEffect(() => {
    async function loadMe() {
      if (!token) { setMe(null); setCredits(null); return }
      try {
        const profile = await getMe()
        setMe(profile)
        setCredits(profile?.credits ?? 0)
        await loadChats(profile)
      } catch (e) { setMe(null); setCredits(null) }
    }
    loadMe()
  }, [token])

  useEffect(() => {
    try {
      if (currentStep === 2 && step1Payload && (!inputText || inputText.trim() === '')) {
        setInputText(JSON.stringify(step1Payload, null, 2))
      }
    } catch (e) { }
  }, [currentStep, step1Payload])

  // If user selected a target duration on Step 2 and then navigates to Step 3,
  // auto-run the scene-splitting (step3) once if we don't have a step3 payload yet.
  useEffect(() => {
    if (currentStep !== 3) return
    if (!step2Payload) return
    if (!targetDuration) return
    if (step3Payload) return

    let cancelled = false
      ; (async () => {
        try {
          setBusy(true)
          const res = await step3Scene(step2Payload, targetDuration)
          if (cancelled) return
          setResult(res)
          setStep3Payload(res)

          const entry = { id: Date.now().toString(), step: 3, input: JSON.stringify(step2Payload, null, 2), result: res, created_at: new Date().toISOString() }
          let activeId = selectedChatId
          if (!activeId) {
            const title = deriveChatTitle(res, 3)
            activeId = createNewChat(title)
          }
          if (activeId) {
            const ch = chats.find((c) => c.id === activeId)
            if (ch && (ch.title === DEFAULT_CHAT_TITLE || (ch.title || '').trim() === '')) {
              try { setChatTitle(activeId, deriveChatTitle(res, 3)) } catch (e) { }
            }
            addToChat(activeId, entry)
          }
        } catch (e) {
          // ignore
        } finally {
          setBusy(false)
        }
      })()
    return () => { cancelled = true }
  }, [currentStep, step2Payload, targetDuration, chats, selectedChatId])

  useEffect(() => {
    try {
      if (currentStep === 3 && step2Payload && (!inputText || inputText.trim() === '')) {
        setInputText(JSON.stringify(step2Payload, null, 2))
      }
    } catch (e) { }
  }, [currentStep, step2Payload])

  useEffect(() => {
    try {
      if (currentStep === 4 && step3Payload && (!inputText || inputText.trim() === '')) setInputText(JSON.stringify(step3Payload, null, 2))
      if (currentStep === 5 && step4Payload && (!inputText || inputText.trim() === '')) setInputText(JSON.stringify(step4Payload, null, 2))
      if (currentStep === 6 && step5Payload && (!inputText || inputText.trim() === '')) setInputText(JSON.stringify(step5Payload, null, 2))
    } catch (e) { }
  }, [currentStep, step3Payload, step4Payload, step5Payload])

  function chatStorageKey(userProfile) {
    const active = userProfile !== undefined ? userProfile : me;
    if (active && active.id) return `chats:user_${active.id}`
    return 'chats:anon'
  }

  function persistChats(next) {
    try {
      const key = chatStorageKey()
      localStorage.setItem(key, JSON.stringify(next))
      // Only mirror to anon key when NOT logged in.
      if (!token) {
        try { localStorage.setItem('chats:anon', JSON.stringify(next)) } catch (e) { }
      }
      // debug
      try { console.debug('[persistChats] saved', key, next.length) } catch (e) { }
    } catch (e) { }
  }

  // Persist to server when logged in (best-effort, async)
  async function persistChatsToServer(next) {
    try {
      if (!token) return
      try { await saveMyChats(next) } catch (e) { console.warn('Failed to save chats to server', e) }
    } catch (e) { }
  }

  async function loadChats(userProfile) {
    try {
      const activeUser = userProfile !== undefined ? userProfile : me;
      const key = chatStorageKey(activeUser)
      let raw = localStorage.getItem(key)
      let parsed = raw ? JSON.parse(raw) : []

      // If logged in, prefer server-side saved chats (replace local)
      if (activeUser && activeUser.id) {
        try {
          const server = await getMyChats()
          if (server && Array.isArray(server)) {
            const chatMap = new Map()
            parsed.forEach(c => chatMap.set(c.id, c))
            
            server.forEach(sChat => {
              if (!chatMap.has(sChat.id) || (sChat.items?.length >= (chatMap.get(sChat.id)?.items?.length || 0))) {
                chatMap.set(sChat.id, sChat)
              }
            })
            
            parsed = Array.from(chatMap.values()).sort((a, b) => b.id.localeCompare(a.id))

            try { localStorage.setItem(key, JSON.stringify(parsed)) } catch (e) { }
            // server has authoritative data; remove any anon blob to avoid later accidental imports
            try { localStorage.removeItem('chats:anon') } catch (e) { }
          } else {
            // No server chats. If local parsed exists, ask user before pushing local data to their account
            if (parsed && parsed.length > 0) {
              try {
                const confirmSave = await showConfirm('Đồng bộ dữ liệu', 'Tài khoản này chưa có lịch sử chat trên server. Bạn có muốn lưu lịch sử chat cục bộ vào tài khoản không?')
                if (confirmSave) {
                  try { await saveMyChats(parsed) } catch (e) { console.warn('Failed to save local chats to server', e) }
                  try { localStorage.removeItem('chats:anon') } catch (e) { }
                }
              } catch (e) { }
            }
          }
        } catch (e) {
          console.error("Lỗi đồng bộ từ server, giữ lại dữ liệu local ẩn:", e)
        }
      }

      setChats(parsed)
      if (parsed && parsed.length && !selectedChatId) setSelectedChatId(parsed[0].id)
    } catch (e) { setChats([]) }
  }

  useEffect(() => {
    try { loadChats() } catch (e) { }
  }, [])

  function createNewChat(title) {
    const id = Date.now().toString()
    const c = { id, title: title || DEFAULT_CHAT_TITLE, created_at: new Date().toISOString(), items: [] }
    setChats((prev) => {
      const next = [c, ...prev]
      try { persistChats(next) } catch (e) { }
      try { persistChatsToServer(next) } catch (e) { }
      return next
    })
    setSelectedChatId(id)
    setSelectedChatItemId(null)
    setResult(null)
    setInputText('')
    setIsMobileMenuOpen(false)
    return id
  }

  // Derive a short, human-friendly chat title from a step result
  function deriveChatTitle(res, step) {
    try {
      if (!res) return `Run bước ${step}`

      // Common candidates
      if (typeof res === 'string' && res.trim()) {
        const s = res.trim().replace(/\s+/g, ' ')
        return s.slice(0, 60) + (s.length > 60 ? '…' : '')
      }

      if (res.tvc_title) return String(res.tvc_title).slice(0, 60)
      if (res.title) return String(res.title).slice(0, 60)
      if (res.prompt) return String(res.prompt).slice(0, 60)
      if (res.technical_prompt) return String(res.technical_prompt).slice(0, 60)

      // If scenes array, use first scene text/title
      if (Array.isArray(res) && res.length > 0) {
        const first = res[0]
        if (first.title) return String(first.title).slice(0, 60)
        if (first.text) return String(first.text).slice(0, 60)
        // fallback to JSON summary
        const j = JSON.stringify(first)
        return j.slice(0, 60) + (j.length > 60 ? '…' : '')
      }

      // If object with nested fields
      if (typeof res === 'object') {
        const keys = ['summary', 'text', 'content', 'description']
        for (const k of keys) {
          if (res[k]) return String(res[k]).slice(0, 60)
        }
        const j = JSON.stringify(res)
        return j.slice(0, 60) + (j.length > 60 ? '…' : '')
      }

      return `Run bước ${step}`
    } catch (e) {
      return `Run bước ${step}`
    }
  }

  function selectChat(id) {
    setSelectedChatId(id)
    setSelectedChatItemId(null)
    setResult(null)
    setInputText('')
    setIsMobileMenuOpen(false)
  }

  async function deleteChat(id) {
    const ok = await showConfirm('Xóa chat', 'Xác nhận xóa đoạn chat này?')
    if (!ok) return
    const next = chats.filter((c) => c.id !== id)
    setChats(next)
    persistChats(next)
    try { persistChatsToServer(next) } catch (e) { }
    if (selectedChatId === id) {
      setSelectedChatId(next.length ? next[0].id : null)
      setResult(null)
    }
  }

  async function renameChat(id) {
    const chat = chats.find((c) => c.id === id)
    if (!chat) return
    const name = await showPrompt('Đổi tên', 'Nhập tên mới cho đoạn chat:', chat.title)
    if (!name || !name.trim()) return
    const next = chats.map((c) => (c.id === id ? { ...c, title: name.trim() } : c))
    setChats(next)
    persistChats(next)
    try { persistChatsToServer(next) } catch (e) { }
  }

  // Programmatically set chat title (used when first result should name a default chat)
  function setChatTitle(id, newTitle) {
    if (!newTitle) return
    const next = chats.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    setChats(next)
    persistChats(next)
    try { persistChatsToServer(next) } catch (e) { }
  }

  function toggleMenu(e, id) {
    e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài
    setOpenMenuId((prev) => (prev === id ? null : id));
  }

  function deleteChatItem(chatId, itemId) {
    const next = chats.map((c) => c.id === chatId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c)
    setChats(next)
    persistChats(next)
    try { persistChatsToServer(next) } catch (e) { }
    if (selectedChatItemId === itemId) setSelectedChatItemId(null)
  }

  function addToChat(id, entry) {
    setChats((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, items: [...(c.items || []), entry] } : c))
      try { persistChats(next) } catch (e) { }
      try { persistChatsToServer(next) } catch (e) { }
      return next
    })
  }

  function saveCurrentToChat() {
    if (!result) return
    const entry = { id: Date.now().toString(), step: currentStep, input: inputText, result, created_at: new Date().toISOString() }
    const activeId = selectedChatId || createNewChat()
    addToChat(activeId, entry)
    setSelectedChatItemId(entry.id)
    toast.success('Đã lưu dữ liệu thành công vào lịch sử đoạn chat.')
  }

  function downloadResult() {
    if (!result) return
    const content = JSON.stringify(result, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autoads_step${currentStep}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function importResultToNextStep() {
    if (!result) return
    const target = Math.min(7, currentStep + 1)
    setInputText(JSON.stringify(result, null, 2))
    setCurrentStep(target)
  }

  function importHistoryItem(chatId, item) {
    if (!item?.result) return
    setInputText(JSON.stringify(item.result, null, 2))
    setCurrentStep(Math.min(7, item.step + 1))
  }

  function setLocalToken(t) { setToken(t); setAuthToken(t) }

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await loginUser(authEmail, password)
      if (res?.access_token) {
        setLocalToken(res.access_token)
        setCurrentStep(1)
      }
    } catch (err) { toast.error(err.message || 'Lỗi đăng nhập') }
    finally { setBusy(false) }
  }

  async function handleLogout() {
    setBusy(true)
    try {
      // 1. Chờ đợi chạy xong việc lưu dữ liệu lên server trước
      if (me && me.id) {
        try {
          const key = `chats:user_${me.id}`
          const raw = localStorage.getItem(key)
          const latestChats = raw ? JSON.parse(raw) : chats;
          await saveMyChats(latestChats)
        } catch (e) {
          console.warn('Failed to save chats on logout', e)
        }
      }
    } catch (e) {
    } finally {
      // 2. Xóa token và cấu hình vật lý
      logoutUser()
      setToken(null)
      setMe(null)
      try { localStorage.removeItem('auth_token') } catch (e) { }
      setBusy(false)

      // 3. Cuối cùng mới reload trang
      window.location.reload()
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!newPassword || !newPasswordConfirm) {
      toast.error('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error('Mật khẩu mới không khớp')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    setPasswordBusy(true)
    try {
      await updateMyPassword(currentPassword, newPassword)
      setPasswordMessage('Đổi mật khẩu thành công')
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      setShowPasswordForm(false)
    } catch (err) {
      toast.error(err.message || 'Không thể đổi mật khẩu')
    } finally {
      setPasswordBusy(false)
    }
  }

  async function runStep() {
    if (currentStep === 1) {
      const url = (inputText || '').trim()
      if (!url) { toast.error('Vui lòng nhập link URL'); return }
    }
    setBusy(true)
    try {
      let res = null
      if (currentStep === 1) res = await step1Extract(inputText)
      else if (currentStep === 2) res = await step2Script(JSON.parse(inputText), targetDuration)
      else if (currentStep === 3) res = await step3Scene(JSON.parse(inputText), targetDuration)
      else if (currentStep === 4) res = await step4Prompt(JSON.parse(inputText))
      else if (currentStep === 5) res = await step5Voice(JSON.parse(inputText))
      else if (currentStep === 6) res = await step6Video(JSON.parse(inputText))
      else if (currentStep === 7) {
        const scenes = step6Payload || result || []
        res = await step7Merge('AutoAds Final Video', scenes, scenes[0]?.run_id)
      }
      setResult(res)
      // store step-specific payloads so downstream steps can auto-run or prefill
      try {
        if (currentStep === 1) setStep1Payload(res)
        else if (currentStep === 2) setStep2Payload(res)
        else if (currentStep === 3) setStep3Payload(res)
        else if (currentStep === 4) setStep4Payload(res)
        else if (currentStep === 5) setStep5Payload(res)
        else if (currentStep === 6) setStep6Payload(res)
      } catch (e) { }
      if (res) {
        const entry = { id: Date.now().toString(), step: currentStep, input: inputText, result: res, created_at: new Date().toISOString() }
        // If no chat selected, create one with a derived title from the result
        let activeId = selectedChatId
        if (!activeId) {
          const title = deriveChatTitle(res, currentStep)
          activeId = createNewChat(title)
        }
        // If there is an active chat but it still has the default name, rename it to the derived title
        if (activeId) {
          const ch = chats.find((c) => c.id === activeId)
          if (ch && (ch.title === DEFAULT_CHAT_TITLE || (ch.title || '').trim() === '')) {
            const newTitle = deriveChatTitle(res, currentStep)
            try { setChatTitle(activeId, newTitle) } catch (e) { }
          }
        }
        if (activeId) addToChat(activeId, entry)
      }
    } catch (err) { toast.error(err.message || 'Xử lý thất bại.') }
    finally { setBusy(false) }
  }

  const accountLabel = me?.username || me?.email || 'Thông Lự Huy'
  const showLanding = window.location.hash === '#home'

  // ==========================================
  // RENDER
  // ==========================================
  let page = null
  if (!token && !showLoginFromHash) {
    page = <LandingPage />
  } else if (!token && showLoginFromHash) {
    page = (
      <LoginPage
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        password={password}
        setPassword={setPassword}
        handleLogin={handleLogin}
        busy={busy}
        getGoogleLoginUrl={getGoogleLoginUrl}
      />
    )
  } else if (showLanding) {
    page = <LandingPage />
  } else if (me && me.role === 'admin' && showAdmin) {
    page = <AdminPanel onBack={() => setShowAdmin(false)} />
  } else {
    page = (
      <WorkspacePage
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        chats={chats}
        selectedChatId={selectedChatId}
        createNewChat={createNewChat}
        selectChat={selectChat}
        openMenuId={openMenuId}
        onToggleMenu={toggleMenu}
        renameChat={renameChat}
        deleteChat={deleteChat}
        accountLabel={accountLabel}
        credits={credits}
        isAdmin={me?.role === 'admin'}
        onOpenAdmin={() => setShowAdmin(true)}
        showBuyPage={showBuyPage}
        onToggleBuyPage={(v) => setShowBuyPage((prev) => (typeof v === 'boolean' ? v : !prev))}
        showPasswordForm={showPasswordForm}
        onTogglePasswordForm={(v) => setShowPasswordForm((prev) => (typeof v === 'boolean' ? v : !prev))}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        newPasswordConfirm={newPasswordConfirm}
        setNewPasswordConfirm={setNewPasswordConfirm}
        passwordBusy={passwordBusy}
        passwordMessage={passwordMessage}
        handleChangePassword={handleChangePassword}
        onLogout={handleLogout}
        currentStep={currentStep}
        setCurrentStep={(s) => { setCurrentStep(s); setResult(null) }}
        inputText={inputText}
        setInputText={setInputText}
        targetDuration={targetDuration}
        setTargetDuration={setTargetDuration}
        estimatedCredits={estimatedCredits}
        busy={busy}
        runStep={runStep}
        saveCurrentToChat={saveCurrentToChat}
        result={result}
        playerKey={playerKey}
        onDownloadResult={downloadResult}
        onImportResultToNextStep={importResultToNextStep}
        onLoadHistoryItem={(it) => { setResult(it.result); setSelectedChatItemId(it.id); setPlayerKey(it.id + '_' + Date.now()) }}
        deleteChatItem={deleteChatItem}
        STEP_INFO={STEP_INFO}
        step1Payload={step1Payload}
        step2Payload={step2Payload}
        step3Payload={step3Payload}
        step4Payload={step4Payload}
        step5Payload={step5Payload}
        step6Payload={step6Payload}
        creditsWarning={credits > 0 && estimatedCredits > credits ? 'Chú ý: credits ước tính vượt quá số dư hiện tại.' : ''}
        buyCreditsComponent={<BuyCredits pageMode onBought={(c) => { setCredits(c); setShowBuyPage(false); }} onClose={() => setShowBuyPage(false)} />}
      />
    )
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: 10, fontSize: 14 } }} />
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
      <PromptModal
        open={promptState.open}
        title={promptState.title}
        message={promptState.message}
        defaultValue={promptState.defaultValue}
        onConfirm={(val) => closePrompt(val)}
        onCancel={() => closePrompt(null)}
      />
      {page}
    </>
  )
}

export default App