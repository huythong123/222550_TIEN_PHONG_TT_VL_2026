import React, { useEffect, useState } from 'react'
import {
    listPackages,
    createPackage,
    updatePackage,
    deletePackage,
    listTransactions,
    listVideos,
    getVideo,
    listVideoScenes,
    getDashboardStats,
    getUsers,
    getUserLogs,
    getUserLogDetail,
    getUserRunVideos,
    deleteUserLog,
    refundRun,
    getUserDetails,
    getUserActivities,
    banUser,
    unbanUser,
    resetUserPassword,
    downloadRunUrl,
    setUserCredits,
    adjustUserCredits,
    listSettings,
    setSetting,
    getAdminLogs,
} from './api'

import AdminSidebar from './components/admin/AdminSidebar'
import AdminHeader from './components/admin/AdminHeader'
import DashboardOverview from './components/admin/dashboard/DashboardOverview'
import UserTable from './components/admin/users/UserTable'
import UserDetails from './components/admin/users/UserDetails'
import PackageTable from './components/admin/packages/PackageTable'
import PackageForm from './components/admin/packages/PackageForm'
import RevenueFilter from './components/admin/revenue/RevenueFilter'
import RevenueSummary from './components/admin/revenue/RevenueSummary'
import RevenueTable from './components/admin/revenue/RevenueTable'
import ApiKeyCard from './components/admin/apiKeys/ApiKeyCard'
import ApiKeyHistoryModal from './components/admin/apiKeys/ApiKeyHistoryModal'
import './styles/admin.css'
 

function UsersPanel() {
    const [users, setUsers] = useState([])
    useEffect(() => { async function l() { const u = await getUsers(); setUsers(u || []) } l() }, [])
    const [selectedUser, setSelectedUser] = useState(null)
    const [userRuns, setUserRuns] = useState([])
    const [userVideos, setUserVideos] = useState([])
    const [userPreviewUrl, setUserPreviewUrl] = useState(null)
    const [userPreviewBlobUrl, setUserPreviewBlobUrl] = useState(null)
    const [runVideos, setRunVideos] = useState({})
    const [selectedRunDetail, setSelectedRunDetail] = useState(null)
    const [modalPreviewUrl, setModalPreviewUrl] = useState(null)
    const [modalPreviewBlob, setModalPreviewBlob] = useState(null)
    const [showRunTable, setShowRunTable] = useState(true)

    async function loadUserRuns(u) {
        setSelectedUser(u)
        try {
            const runs = await getUserLogs(u.id)
            const detailed = await Promise.all((runs || []).map(async (r) => {
                try {
                    const d = await getUserLogDetail(u.id, r.run_id)
                    const events = d.events || []
                    const refunded = events.some(ev => (ev.step === 'admin_refund' || (ev.data && ev.data.refunded)))

                    const videos = []
                    for (let i = 0; i < events.length; i++) {
                        const ev = events[i]
                        const data = ev.data || {}
                        const url = data.final_video_path || data.final_path || data.video_url || data.video_url_result || null
                        if (url) {
                            videos.push({
                                step: ev.step || 'unknown',
                                timestamp: ev.timestamp || null,
                                url: url,
                                title: data.tvc_title || data.title || `${ev.step || 'step'} #${i + 1}`,
                                event_index: i,
                            })
                        }
                    }

                    const videosByStep = {}
                    for (const vv of videos) {
                        if (!videosByStep[vv.step]) videosByStep[vv.step] = []
                        videosByStep[vv.step].push(vv)
                    }

                    const has_video = videos.length > 0
                    return { ...r, refunded, has_video, events, videos, videosByStep }
                } catch (e) {
                    return { ...r, refunded: false, has_video: false, events: [], videos: [], videosByStep: {} }
                }
            }))
            setUserRuns(detailed || [])
            try {
                const vids = await listVideos(100, 0, u.id)
                setUserVideos(vids || [])
            } catch (e) { setUserVideos([]) }
        } catch (e) {
            setUserRuns([])
        }
    }

    const [userDetails, setUserDetails] = useState(null)
    const [creditsInput, setCreditsInput] = useState('')
    const [deltaInput, setDeltaInput] = useState('')
    const [activities, setActivities] = useState([])
    const [expandedRun, setExpandedRun] = useState(null)
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
    const [eventDetail, setEventDetail] = useState(-1)

    async function loadUserDetails(u) {
        try {
            const d = await getUserDetails(u.id)
            setUserDetails(d)
        } catch (e) {
            setUserDetails(null)
        }
    }

    async function loadRunVideos(u, runId) {
        try {
            const items = await getUserRunVideos(u.id, runId)
            setRunVideos((prev) => ({ ...prev, [runId]: items || [] }))
        } catch (e) {
            setRunVideos((prev) => ({ ...prev, [runId]: [] }))
        }
    }

    function resolveVideoUrl(rawUrl) {
        if (!rawUrl) return null
        let url = String(rawUrl)
        url = url.replace(/\\\\/g, '/')
        url = url.replace(/\\/g, '/')
        if (url.match(/^https?:\/\//)) return url

        const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1').replace(/\/$/, '')
        const origin = apiBase.replace(/\/api\/v[0-9]+$/, '')

        const storageIndex = url.indexOf('storage/')
        if (storageIndex !== -1) {
            let sub = url.slice(storageIndex)
            if (!sub.startsWith('/')) sub = '/' + sub
            return origin + sub
        }

        const rendersIndex = url.indexOf('/renders/')
        if (rendersIndex !== -1) {
            let sub = url.slice(rendersIndex)
            if (!sub.startsWith('/')) sub = '/' + sub
            return origin + sub
        }

        if (url.startsWith('/')) return apiBase + url
        return apiBase + '/' + url
    }

    async function loadActivities(u) {
        try {
            const a = await getUserActivities(u.id, 50, 0)
            setActivities(a || [])
        } catch (e) { setActivities([]) }
    }

    async function handlePreview(run) {
        try {
            if (!run.has_video) { alert('Run này không có video'); return }
            const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1').replace(/\/$/, '')
            const url = `${base}/admin/users/${selectedUser.id}/runs/${run.run_id}/download`
            const token = localStorage.getItem('auth_token')
            const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
            if (!resp.ok) {
                alert('Không thể tải video: ' + resp.statusText)
                return
            }
            const blob = await resp.blob()
            const blobUrl = URL.createObjectURL(blob)
            try { if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl) } catch (e) { }
            try {
                if (userPreviewBlobUrl)
                    URL.revokeObjectURL(userPreviewBlobUrl)
            } catch (e) { }

            setUserPreviewBlobUrl(blobUrl)
            setUserPreviewUrl(blobUrl)
        } catch (e) {
            alert('Lỗi khi lấy thông tin run: ' + (e.message || e))
        }
    }

    async function openPreviewVideo(rawUrl, setPreviewState, currentBlobUrl, setBlobState) {
        const url = resolveVideoUrl(rawUrl)
        if (!url) {
            throw new Error('Không tìm thấy đường dẫn video')
        }

        const token = localStorage.getItem('auth_token')
        const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!resp.ok) {
            throw new Error(resp.statusText || `HTTP ${resp.status}`)
        }

        const blob = await resp.blob()
        const blobUrl = URL.createObjectURL(blob)
        try {
            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl)
        } catch (e) { }
        setBlobState(blobUrl)
        setPreviewState(blobUrl)
    }

    async function handlePreviewEventVideo(video) {
        try {
            await openPreviewVideo(
                video.url,
                setModalPreviewUrl,
                modalPreviewBlob,
                setModalPreviewBlob
            )
        } catch (e) {
            alert('Không thể preview video: ' + (e.message || e))
        }
    }

    async function handleDownloadEventVideo(video, run) {
        try {
            const url = resolveVideoUrl(video.url)
            const token = localStorage.getItem('auth_token')
            const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
            if (!resp.ok) { alert('Không thể tải video: ' + resp.statusText); return }
            const blob = await resp.blob()
            const a = document.createElement('a')
            const blobUrl = URL.createObjectURL(blob)
            a.href = blobUrl
            a.download = `${run.run_id || 'video'}_${video.event_index || 0}.mp4`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(blobUrl)
        } catch (e) { alert('Lỗi tải: ' + (e.message || e)) }
    }

    async function handleDownloadRun(run) {
        const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1').replace(/\/$/, '')
        const url = `${base}/admin/users/${selectedUser.id}/runs/${run.run_id}/download`
        const token = localStorage.getItem('auth_token')
        const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!resp.ok) { alert('Không thể tải video: ' + resp.statusText); return }
        const blob = await resp.blob()
        const a = document.createElement('a')
        const blobUrl = URL.createObjectURL(blob)
        a.href = blobUrl
        a.download = `${run.run_id}.mp4`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(blobUrl)
    }

    async function handlePreviewUserVideo(video) {
        try {
            await openPreviewVideo(
                video.final_path || video.video_url || video.url || '',
                setUserPreviewUrl,
                userPreviewBlobUrl,
                setUserPreviewBlobUrl
            )
        } catch (e) {
            alert('Không thể preview video: ' + (e.message || e))
        }
    }

    async function handleDownloadUserVideo(video) {
        try {
            await handleDownloadEventVideo({ url: video.final_path || video.video_url || video.url || '' }, { run_id: selectedRunDetail || 'video' })
        } catch (e) {
            alert('Không thể tải video: ' + (e.message || e))
        }
    }

    async function handleLoadRunDetail(run) {
        await loadRunVideos(selectedUser, run.run_id)
        setSelectedRunDetail(run.run_id)
    }

    async function handleRefund(run) {
        if (!confirm(`Hoàn tiền cho run ${run.run_id} ?`)) return
        try {
            const res = await refundRun(selectedUser.id, run.run_id)
            alert(`Hoàn tiền ${res.refunded} credits. Số dư hiện: ${res.credits}`)
            await loadUserRuns(selectedUser)
        } catch (e) {
            alert('Hoàn tiền thất bại: ' + (e.message || e))
        }
    }

    async function handleDelete(run) {
        if (!confirm(`Xóa run ${run.run_id} (không thể hoàn tác)?`)) return
        try {
            await deleteUserLog(selectedUser.id, run.run_id)
            await loadUserRuns(selectedUser)
        } catch (e) {
            alert('Xóa thất bại: ' + (e.message || e))
        }
    }

    async function handleBan() {
        if (!selectedUser) return
        const reason = prompt('Lý do khóa (tuỳ chọn)')
        try {
            await banUser(selectedUser.id, reason)
            alert('Đã khóa')
            loadUserDetails(selectedUser)
        } catch (e) { alert('Thất bại: ' + (e.message || e)) }
    }

    async function handleUnban() {
        if (!selectedUser) return
        try {
            await unbanUser(selectedUser.id)
            alert('Đã mở khóa')
            loadUserDetails(selectedUser)
        } catch (e) { alert('Thất bại: ' + (e.message || e)) }
    }

    async function handleResetPassword() {
        if (!selectedUser) return
        if (!confirm('Đặt lại mật khẩu cho người dùng này?')) return
        try {
            const res = await resetUserPassword(selectedUser.id)
            alert('Mật khẩu tạm thời: ' + res.temporary_password)
        } catch (e) { alert('Thất bại: ' + (e.message || e)) }
    }

    function downloadLinkForRun(run) {
        return `/storage/renders/user_${selectedUser.id}/${run.date}/${run.run_id}/final/`
    }

    return (
        <div>
            <h3>Người dùng</h3>
            <div>
                <UserTable users={users} onSelectUser={loadUserRuns} />

                <div style={{ marginTop: '1.25rem' }}>
                    <UserDetails
                        selectedUser={selectedUser}
                        userDetails={userDetails}
                        userVideos={userVideos}
                        userRuns={userRuns}
                        activities={activities}
                        creditsInput={creditsInput}
                        deltaInput={deltaInput}
                        onCreditsInputChange={setCreditsInput}
                        onDeltaInputChange={setDeltaInput}
                        onSetCredits={async () => {
                            const v = parseInt(creditsInput || '0')
                            if (isNaN(v)) return alert('Giá trị không hợp lệ')
                            try {
                                await setUserCredits(selectedUser.id, v)
                                alert('Đã đặt credits')
                                await loadUserDetails(selectedUser)
                            } catch (e) { alert('Lỗi: ' + (e.message || e)) }
                        }}
                        onAdjustCredits={async () => {
                            const v = parseInt(deltaInput || '0')
                            if (isNaN(v)) return alert('Giá trị không hợp lệ')
                            try {
                                await adjustUserCredits(selectedUser.id, v)
                                alert('Đã cập nhật credits')
                                await loadUserDetails(selectedUser)
                            } catch (e) { alert('Lỗi: ' + (e.message || e)) }
                        }}
                        onPreviewVideo={async (video) => {
                            if (!video) return
                            if (video.id) {
                                try {
                                    const details = await getVideo(video.id)
                                    await listVideoScenes(video.id)
                                    await handlePreviewUserVideo(details)
                                } catch (e) { setUserPreviewUrl(null) }
                            } else {
                                await handlePreviewUserVideo(video)
                            }
                        }}
                        onDownloadVideo={async (video) => {
                            if (!video) return
                            await handleDownloadUserVideo(video)
                        }}
                        onPreviewRun={handlePreview}
                        onDownloadRun={handleDownloadRun}
                        onRefundRun={handleRefund}
                        onDeleteRun={handleDelete}
                        onLoadRunVideos={handleLoadRunDetail}
                        onBan={handleBan}
                        onUnban={handleUnban}
                        onResetPassword={handleResetPassword}
                    />

                    {userPreviewUrl ? (
                        <div className="admin-video-preview" style={{ marginTop: 12 }}>
                            <h5>Preview Video</h5>
                            <video src={userPreviewUrl} controls style={{ maxWidth: '100%' }} />
                            <br />
                            <button
                                style={{ marginTop: 12 }}
                                onClick={() => {
                                    try {
                                        if (userPreviewBlobUrl) URL.revokeObjectURL(userPreviewBlobUrl)
                                    } catch (e) { }
                                    setUserPreviewBlobUrl(null)
                                    setUserPreviewUrl(null)
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {selectedRunDetail && (
                <div className="video-modal-overlay">
                    <div className="video-modal">
                        <div className="video-modal-header">
                            {!modalPreviewUrl && (
                                <>
                                    <h3>Chi tiết đoạn chat</h3>
                                    <button
                                        onClick={() => {
                                            setSelectedRunDetail(null)
                                            try {
                                                if (modalPreviewBlob) URL.revokeObjectURL(modalPreviewBlob)
                                            } catch (e) { }
                                            setModalPreviewBlob(null)
                                            setModalPreviewUrl(null)
                                            setShowRunTable(true)
                                        }}
                                    >
                                        ✕
                                    </button>
                                </>
                            )}
                        </div>

                        {modalPreviewUrl && (
                            <div className="modal-preview-box">
                                <div className="modal-preview-header">
                                    <button
                                        onClick={() => {
                                            try {
                                                if (modalPreviewBlob) URL.revokeObjectURL(modalPreviewBlob)
                                            } catch (e) { }
                                            setModalPreviewBlob(null)
                                            setModalPreviewUrl(null)
                                            setShowRunTable(true)
                                        }}
                                    >
                                        ✕ Đóng preview
                                    </button>
                                </div>
                                <video src={modalPreviewUrl} controls autoPlay style={{ width: '100%', maxHeight: '500px' }} />
                            </div>
                        )}

                        {showRunTable ? (
                            (runVideos[selectedRunDetail] || []).length > 0 ? (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>STT</th><th>Bước</th><th>Tiêu đề</th><th>Thời gian</th><th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(runVideos[selectedRunDetail] || []).map((vv, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td>{vv.step}</td>
                                                <td>{vv.title}</td>
                                                <td>{vv.timestamp}</td>
                                                <td>
                                                    <button
                                                        onClick={async () => {
                                                            await handlePreviewEventVideo(vv)
                                                            setShowRunTable(false)
                                                        }}
                                                    >
                                                        Preview
                                                    </button>
                                                    <button
                                                        style={{ marginLeft: 8 }}
                                                        onClick={() => handleDownloadEventVideo(vv, { run_id: selectedRunDetail })}
                                                    >
                                                        Tải xuống
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>Không có video.</p>
                            )
                        ) : null}

                        {showRunTable && (
                            <div className="step-events-container">
                                <h5 className="step-events-title">Sự kiện (chi tiết bước)</h5>
                                {(() => {
                                    const runObj = (userRuns || []).find(x => x.run_id === selectedRunDetail) || {}
                                    const rawEvents = runObj.events || []
                                    const creditMap = {}

                                    rawEvents.forEach(ev => {
                                        if (ev.step === 'credits' && ev.data?.deducted) {
                                            const idx = rawEvents.indexOf(ev)
                                            if (idx > 0) {
                                                const prev = rawEvents[idx - 1]
                                                creditMap[prev.timestamp] = ev.data.deducted
                                            }
                                        }
                                    })

                                    const events = rawEvents.filter(ev => ev.step !== 'credits')
                                    if (!events || events.length === 0) return <div style={{ color: '#666' }}>Không có sự kiện được ghi nhận cho run này.</div>
                                    return events.map((ev, idx) => (
                                        <div key={idx} className="step-event-card">
                                            <div className="step-event-header">
                                                <div className="step-event-name">
                                                    {ev.step || 'unknown'}
                                                    {creditMap[ev.timestamp] && (
                                                        <span className="step-credit-tag"> (-{creditMap[ev.timestamp]} credit)</span>
                                                    )}
                                                </div>
                                                <div className="step-event-time">{ev.timestamp || ''}</div>
                                            </div>
                                            <div className="step-event-content">
                                                {(ev.data && (ev.data.tvc_title || ev.data.title)) ||
                                                    (ev.data && ev.data.text) ||
                                                    JSON.stringify(ev.data || {}).slice(0, 120)}
                                            </div>
                                            <div className="step-event-actions">
                                                <button onClick={() => setEventDetail(eventDetail === idx ? -1 : idx)}>
                                                    {eventDetail === idx ? 'Ẩn' : 'Chi tiết bước'}
                                                </button>
                                            </div>
                                            {eventDetail === idx && (
                                                <div className="event-detail-box">
                                                    <pre className="event-detail-pre">{JSON.stringify(ev, null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function PackagesPanel() {
    const [packages, setPackages] = useState([])
    const [form, setForm] = useState({ name: '', credits: 0, price_vnd: 0 })
    const [selected, setSelected] = useState(null)

    useEffect(() => { async function l() { const p = await listPackages(); setPackages(p || []) } l() }, [])
    async function reload() { const p = await listPackages(); setPackages(p || []) }

    async function save() {
        const payload = {
            name: form.name,
            credits: Number(form.credits || 0),
            price_cents: Math.round(Number(form.price_vnd || 0) * 100)
        }
        if (selected) {
            await updatePackage(selected.id, payload)
        } else {
            await createPackage(payload)
        }
        setForm({ name: '', credits: 0, price_vnd: 0 })
        setSelected(null)
        await reload()
    }

    async function edit(p) {
        setSelected(p)
        setForm({ name: p.name, credits: p.credits, price_vnd: Math.round((p.price_cents || 0) / 100) })
    }

    async function remove(id) {
        if (!confirm('Xác nhận xóa gói này?')) return
        await deletePackage(id)
        if (selected && selected.id === id) { setSelected(null); setForm({ name: '', credits: 0, price_vnd: 0 }) }
        await reload()
    }

    return (
        <div>
            <h3 style={{ marginBottom: 20, fontSize: '1.25rem', fontWeight: 700, textAlign: 'left' }}>Quản lý Gói</h3>

            <div className="packages-panel">
                <PackageTable packages={packages} onEdit={edit} onRemove={remove} />

                <PackageForm
                    form={form}
                    onChange={(next) => setForm(next)}
                    onSave={save}
                    onCancel={() => { setSelected(null); setForm({ name: '', credits: 0, price_vnd: 0 }) }}
                    isEditing={!!selected}
                />
            </div>
        </div>
    )
}

function RevenueReport() {
    const today = new Date()
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const currentDay = today.toISOString().slice(0, 10)

    const [fromDate, setFromDate] = useState(currentMonthStart)
    const [toDate, setToDate] = useState(currentDay)
    const [tx, setTx] = useState([])
    const [users, setUsers] = useState([]) // State lưu thông tin User để map username
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState({ total_vnd: 0, count: 0 })
    const [monthRevenue, setMonthRevenue] = useState(0)
    const [byDay, setByDay] = useState([])
    const [selectedDateDetails, setSelectedDateDetails] = useState(null) // State theo dõi ngày đang được chọn xem chi tiết
    const [detailedTxList, setDetailedTxList] = useState([]) // Danh sách transaction của ngày được chọn

    async function filterTransactions(from, to, transactions) {
        const fromValue = from || fromDate
        const toValue = to || toDate
        const fromDateObj = fromValue ? new Date(fromValue) : null
        const toDateObj = toValue ? new Date(toValue) : null
        const map = {}
        let total = 0
        let count = 0

        setSelectedDateDetails(null)
        setDetailedTxList([])

        for (const t of (transactions || tx || [])) {
            try {
                const created = t.created_at ? new Date(t.created_at) : null
                if (!created) continue
                if (fromDateObj && created < fromDateObj) continue
                if (toDateObj) {
                    const toEnd = new Date(toDateObj)
                    toEnd.setHours(23, 59, 59, 999)
                    if (created > toEnd) continue
                }

                const key = created.toISOString().slice(0, 10)
                const amt = parseAmount(t)
                if (amt > 0) {
                    if (!map[key]) map[key] = { date: key, amount: 0, count: 0 }
                    map[key].amount += amt
                    map[key].count += 1
                    total += amt
                    count += 1
                }
            } catch (e) { }
        }

        const rows = Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
        setByDay(rows)
        setSummary({ total_vnd: total, count })
    }

    function resetToCurrentMonth(transactions) {
        const today2 = new Date()
        const monthStart = new Date(today2.getFullYear(), today2.getMonth(), 1).toISOString().slice(0, 10)
        const dayNow = today2.toISOString().slice(0, 10)
        setFromDate(monthStart)
        setToDate(dayNow)
        filterTransactions(monthStart, dayNow, transactions)
    }

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const allTx = await listTransactions(2000, 0) // Lấy danh sách giao dịch lớn hơn để tổng hợp báo cáo đầy đủ
                const allUsers = await getUsers()
                const transactions = allTx || []
                setTx(transactions)
                setUsers(allUsers || [])

                const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                const currentMonthEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
                const monthTotal = (transactions || []).reduce((sum, t) => {
                    try {
                        const created = t.created_at ? new Date(t.created_at) : null
                        if (!created) return sum
                        if (created < currentMonthStart || created > currentMonthEnd) return sum
                        return sum + parseAmount(t)
                    } catch (error) {
                        return sum
                    }
                }, 0)
                setMonthRevenue(monthTotal)

                resetToCurrentMonth(transactions)
            } catch (e) {
                setTx([])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    function applyFilter() {
        filterTransactions(fromDate, toDate, tx)
    }

    function parseAmount(t) {
        try {
            const m = (t.reason || '').match(/amount_vnd=([0-9]+)/)
            if (m) return Number(m[1] || 0)
        } catch (e) { }
        return 0
    }

    // Hàm xử lý khi nhấn vào dòng của một Ngày để xem danh sách giao dịch chi tiết cụ thể
    function handleShowDateDetails(dateStr) {
        setSelectedDateDetails(dateStr)
        const list = tx.filter(t => {
            if (!t.created_at) return false
            const key = new Date(t.created_at).toISOString().slice(0, 10)
            return key === dateStr && parseAmount(t) > 0
        })
        setDetailedTxList(list)
    }

    function getUserName(userId) {
        const found = users.find(u => u.id === userId)
        return found ? `${found.username || found.email} (#${userId})` : `User ID: ${userId}`
    }

    return (
        <div>
            <h3 style={{ marginBottom: 20, fontSize: '1.25rem', fontWeight: 700, textAlign: 'left' }}>
                Báo cáo doanh thu chi tiết
            </h3>

            {/* Bộ lọc thiết kế hàng ngang */}
            <div
                className="card"
                style={{
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'flex-end',
                    marginBottom: 24,
                    padding: '16px 20px',
                    flexWrap: 'wrap',
                    background: '#fff'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-soft)' }}>📅 Từ ngày</span>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '160px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-soft)' }}>📅 Đến ngày</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '160px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={applyFilter}
                        disabled={loading}
                        style={{
                            padding: '9px 20px',
                            backgroundColor: 'var(--accent)',
                            color: '#fff',
                            borderColor: 'var(--accent)'
                        }}
                    >
                        {loading ? 'Đang tải...' : 'Lọc kết quả'}
                    </button>
                    <button
                        onClick={() => resetToCurrentMonth(tx)}
                        style={{ padding: '9px 20px' }}
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* Khối hiển thị Tổng quan số liệu */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: 24, flexWrap: 'wrap' }}>
                <RevenueSummary summary={summary} monthRevenue={monthRevenue} />
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <RevenueTable byDay={byDay} selectedDateDetails={selectedDateDetails} onSelectDate={handleShowDateDetails} />

                {selectedDateDetails && (
                    <div className="card" style={{ flex: 1.2, minWidth: '450px', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', textAlign: 'left' }}>
                                Chi tiết dòng tiền ngày: {selectedDateDetails}
                            </h4>
                            <button
                                onClick={() => { setSelectedDateDetails(null); setDetailedTxList([]) }}
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                                Đóng chi tiết
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table" style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--line)', fontSize: '13px' }}>
                                        <th style={{ padding: '10px 8px' }}>Khách hàng (ID)</th>
                                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Số tiền nhận</th>
                                        <th style={{ padding: '10px 8px' }}>Thời gian chuyển</th>
                                        <th style={{ padding: '10px 8px' }}>Nội dung/Lý do</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '13px' }}>
                                    {detailedTxList.map(t => {
                                        const formattedTime = t.created_at
                                            ? new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                            : ''
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'left' }}>
                                                    {getUserName(t.user_id)}
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                                                    +{parseAmount(t).toLocaleString()}₫
                                                </td>
                                                <td style={{ padding: '10px 8px', color: 'var(--text-soft)' }}>
                                                    {formattedTime}
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'pre-wrap', color: 'var(--text-soft)', fontSize: '12px' }}>
                                                    {t.reason}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default function AdminPanel() {
    const [tab, setTab] = useState('Dashboard');
    const [dashboardCounts, setDashboardCounts] = useState({})
    const [monthlyRevenue, setMonthlyRevenue] = useState([])
    const [recentUsers, setRecentUsers] = useState([])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const stats = await getDashboardStats()
                if (!mounted) return
                const rawCounts = stats.counts || stats || {}
                const counts = {
                    users: rawCounts.users_created_this_month ?? rawCounts.users ?? rawCounts.total_users ?? 0,
                    packages: rawCounts.packages ?? rawCounts.total_packages ?? 0,
                    transactions: rawCounts.transactions ?? rawCounts.total_transactions ?? 0,
                    total_revenue_vnd: rawCounts.total_revenue_vnd ?? rawCounts.total_revenue ?? 0,
                    videos_created_total: rawCounts.videos_created_total ?? rawCounts.total_videos ?? 0,
                    videos_created_this_month: rawCounts.videos_created_this_month ?? 0,
                }
                setDashboardCounts(counts)
                setMonthlyRevenue(stats.revenue_by_month || stats.revenue7 || [])
                setRecentUsers(stats.recent_users || [])
            } catch (e) {
                // ignore
            }
        })()
        return () => { mounted = false }
    }, [])

    return (
        <div className="admin-root admin-shell">
            <aside className="admin-sidebar-wrapper">
                <AdminSidebar tab={tab} setTab={setTab} />
            </aside>

            <div className="admin-main">
                <AdminHeader onLogout={() => { localStorage.clear(); window.location.reload(); }} />

                <main className="admin-content">
                    {tab === 'Dashboard' && <DashboardOverview counts={dashboardCounts} monthlyRevenue={monthlyRevenue} recentUsers={recentUsers} />}
                    {tab === 'Users' && <UsersPanel />}
                    {tab === 'Packages' && <PackagesPanel />}
                    {tab === 'Revenue' && <RevenueReport />}
                    {tab === 'Integrations' && <IntegrationsPanel />}
                </main>
            </div>
        </div>
    );
}

function IntegrationsPanel() {
    const [settings, setSettingsState] = useState([])
    const [loading, setLoading] = useState(false)
    const [edits, setEdits] = useState({})
    const [logs, setLogs] = useState([])
    const [logLoading, setLogLoading] = useState(false)
    const [revealed, setRevealed] = useState({})

    // Thêm state để quản lý Key nào đang được mở popup lịch sử thay đổi
    const [activeLogKey, setActiveLogKey] = useState(null)

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const s = await listSettings()
                setSettingsState(s || [])
                try {
                    setLogLoading(true)
                    const l = await getAdminLogs(500, 0) // Tăng limit để lấy nhiều log hơn phục vụ việc filter theo key
                    setLogs(l || [])
                } catch (e) {
                    setLogs([])
                } finally {
                    setLogLoading(false)
                }
            } catch (e) {
                setSettingsState([])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    function onEdit(key, field, value) {
        setEdits(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }))
    }

    async function onSave(key) {
        const orig = settings.find(s => s.key === key) || {}
        // Nếu người dùng chưa tự gõ mô tả mới, lấy luôn mô tả hệ thống tự động để lưu vào DB
        const finalDescription = edits[key] && edits[key].description !== undefined
            ? edits[key].description
            : getSystemDescription(key, orig.description);

        const payload = {
            key,
            value: edits[key] && edits[key].value !== undefined ? edits[key].value : (orig.value || ''),
            description: finalDescription,
        }
        try {
            await setSetting(payload)
            const s = await listSettings()
            setSettingsState(s || [])
            // Tải lại admin logs để cập nhật lịch sử mới nhất
            const l = await getAdminLogs(500, 0)
            setLogs(l || [])
            setEdits(prev => { const copy = { ...prev }; delete copy[key]; return copy })
            alert('Đã cập nhật key vào hệ thống.');
        } catch (e) {
            alert('Lưu thất bại: ' + (e.message || e))
        }
    }

    function maskValue(v) {
        if (v === null || v === undefined) return ''
        const s = String(v)
        if (s.length <= 8) return '****' + s.slice(-4)
        return '****' + s.slice(-8)
    }

    function toggleReveal(id) {
        setRevealed(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // Hàm tiện ích hỗ trợ bóc tách tên Key từ dữ liệu JSON String của Log
    function getKeyNameFromLog(l) {
        try {
            if (l.details && typeof l.details === 'object') {
                return l.details.setting_key || l.details.key || '';
            }
            if (l.details && typeof l.details === 'string') {
                const parsed = JSON.parse(l.details);
                return parsed.setting_key || parsed.key || '';
            }
        } catch (e) {
            const match = String(l.details || '').match(/"(?:setting_key|key)"\s*:\s*"([^"]+)"/);
            if (match) return match[1];
        }
        return '';
    }

    // Hàm tự động trả về mô tả chuẩn tiếng Việt theo từng loại từ khóa cấu hình hệ thống
    function getSystemDescription(key, customDesc) {
        // Nếu trong DB đã có mô tả tùy chỉnh do bạn tự gõ trước đó và không chứa text mặc định của môi trường, giữ nguyên nó
        if (customDesc && customDesc.trim() !== '' && !customDesc.includes('From environment')) {
            return customDesc;
        }

        const upperKey = String(key).toUpperCase();
        if (upperKey.includes('SEPAY')) {
            return 'API Key SePay dùng để xác nhận thanh toán và tự động cộng Credits cho người dùng.';
        }

        if (
            upperKey.includes('KLING_ACCESS_KEY') ||
            upperKey.includes('KLING_SECRET_KEY') ||
            upperKey.includes('KLING')
        ) {
            return 'API Key kết nối Kling AI để tạo và render video từ kịch bản quảng cáo.';
        }

        if (
            upperKey.includes('OPENAI_API_KEY') ||
            upperKey.includes('OPENAI') ||
            upperKey.includes('GPT')
        ) {
            return 'API Key OpenAI dùng để tạo kịch bản, prompt và xử lý nội dung AI.';
        }

        if (
            upperKey.includes('VITE_API_BASE') ||
            upperKey.includes('API_URL') ||
            upperKey.includes('BASE_URL')
        ) {
            return 'Địa chỉ API kết nối giữa giao diện người dùng và máy chủ hệ thống.';
        }

        if (
            upperKey.includes('STORAGE') ||
            upperKey.includes('PATH') ||
            upperKey.includes('RENDER')
        ) {
            return 'Cấu hình đường dẫn lưu trữ video, dữ liệu và tệp hệ thống.';
        }
        return 'Mã cấu hình tích hợp tiện ích hệ thống. Cung cấp thông số biến môi trường môi trường vận hành nội bộ phục vụ cho các tiến trình đồng bộ dữ liệu quản trị viên và người dùng.';
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>Tích hợp & API Keys</h2>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-soft)' }}>
                        Quản lý các API Key và cấu hình hệ thống
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="card">Đang tải...</div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(500px,1fr))',
                        gap: 20
                    }}
                >
                    {(settings || []).map((s) => {
                        const key = s.key
                        const edited = edits[key] || {}
                        return (
                            <ApiKeyCard
                                key={key}
                                keyObj={s}
                                edited={edited}
                                onEdit={onEdit}
                                onOpenHistory={(k) => setActiveLogKey(k)}
                                onSave={(k) => onSave(k)}
                            />
                        )
                    })}
                </div>
            )}

            <ApiKeyHistoryModal
                activeLogKey={activeLogKey}
                logs={logs}
                revealedMap={revealed}
                onClose={() => setActiveLogKey(null)}
                onToggleReveal={(id) => toggleReveal(id)}
            />
        </div>
    )
}