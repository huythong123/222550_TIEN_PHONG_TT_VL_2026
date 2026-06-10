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
} from './api'

function Sidebar({ tab, setTab }) {
    const items = [
        { key: 'Dashboard', label: 'Bảng điều khiển' },
        { key: 'Users', label: 'Người dùng' },
        { key: 'Packages', label: 'Gói' },
        { key: 'Revenue', label: 'Báo cáo doanh thu' },
    ]
    return (
        <div className="admin-sidebar">
            {items.map((it) => (
                <div
                    key={it.key}
                    className={`admin-menu-item ${tab === it.key ? 'active' : ''}`}
                    onClick={() => setTab(it.key)}
                >
                    {it.label}
                </div>
            ))}
        </div>
    )
}

function Dashboard({ setTab }) {
    const [counts, setCounts] = useState({
        users: 0,
        videos: 0,
        packages: 0,
        transactions: 0,
        total_revenue_vnd: 0,
        total_videos: 0,
    })

    const [recentUsers, setRecentUsers] = useState([])
    const [revenue7, setRevenue7] = useState([])

    useEffect(() => {
        async function load() {
            try {
                const stats = await getDashboardStats()
                const users = await getUsers()
                setCounts({
                    users: stats.total_users || (users?.length || 0),
                    videos: stats.total_videos || 0,
                    packages: stats.total_packages || 0,
                    transactions: stats.total_transactions || 0,
                    total_revenue_vnd: stats.total_revenue_vnd || 0,
                    total_videos: stats.total_videos || 0,
                })

                setRecentUsers((users || []).slice(0, 10))

                try {
                    const tx = await listTransactions(1000, 0)
                    const now = new Date()
                    const days = []
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date(now)
                        d.setDate(now.getDate() - i)
                        const key = d.toISOString().slice(0, 10)
                        days.push({ key, label: d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }), amount: 0 })
                    }

                    for (const t of (tx || [])) {
                        try {
                            const created = t.created_at ? new Date(t.created_at) : null
                            if (!created) continue
                            const key = created.toISOString().slice(0, 10)
                            const m = (t.reason || '').match(/amount_vnd=([0-9]+)/)
                            if (m) {
                                const amt = Number(m[1] || 0)
                                const slot = days.find(d => d.key === key)
                                if (slot && amt > 0) slot.amount += amt
                            }
                        } catch (e) { }
                    }

                    setRevenue7(days)
                } catch (e) { setRevenue7([]) }
            } catch (e) { }
        }

        load()
        const onRefresh = () => load()
        window.addEventListener('admin:refresh-stats', onRefresh)
        return () => window.removeEventListener('admin:refresh-stats', onRefresh)
    }, [])

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
                <h2>Bảng điều khiển</h2>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                    gap: 20,
                    marginBottom: 24
                }}
            >
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div>
                        <div className="stat-title">Người dùng</div>
                        <div className="stat-number">{counts.users}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div>
                        <div className="stat-title">Tổng doanh thu</div>
                        <div className="stat-number">{(counts.total_revenue_vnd || 0).toLocaleString()}₫</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div>
                        <div className="stat-title">Gói</div>
                        <div className="stat-number">{counts.packages}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💳</div>
                    <div>
                        <div className="stat-title">Giao dịch</div>
                        <div className="stat-number">{counts.transactions}</div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: 24
                }}
            >
                <div className="card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16,
                            flexShrink: 0
                        }}
                    >
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Người dùng mới</h4>
                        <button
                            className="btn-link"
                            style={{ padding: '4px 8px', fontSize: '13px' }}
                            onClick={() => setTab('Users')}
                        >
                            Xem tất cả
                        </button>
                    </div>

                    <div className="users-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                        {recentUsers.length > 0 ? (
                            recentUsers.map((u) => (
                                <div
                                    key={u.id}
                                    className="user-row"
                                    style={{
                                        padding: '12px 8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                            {u.username || 'Chưa cập nhật'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                                            {u.email || 'Không có email'}
                                        </span>
                                    </div>
                                    <span className="user-badge" style={{ fontWeight: 600 }}>#{u.id}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '24px', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                                Không có người dùng mới nào
                            </div>
                        )}
                    </div>
                </div>

                <div className="card dashboard-chart-card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginTop: 0, marginBottom: 20, fontSize: '1.1rem', fontWeight: 700, textAlign: 'left' }}>
                        Doanh thu 7 ngày
                    </h4>

                    {revenue7 && revenue7.length > 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <svg
                                viewBox="0 0 700 260"
                                className="revenue-chart"
                                style={{ width: '100%', height: '100%', maxHeight: '240px', background: 'transparent' }}
                            >
                                {(() => {
                                    const paddingLeft = 70
                                    const paddingRight = 30
                                    const paddingTopBottom = 35

                                    const w = 700 - paddingLeft - paddingRight
                                    const h = 260 - paddingTopBottom * 2

                                    // Định nghĩa mốc trục Y cố định theo yêu cầu của bạn: 0, 2k, 5k, 10k
                                    const yTicks = [0, 2000, 5000, 10000]
                                    const maxAxis = 10000 // Mốc cao nhất của trục tọa độ

                                    const bw = w / revenue7.length

                                    return (
                                        <g>
                                            {/* 1. VẼ CÁC ĐƯỜNG LƯỚI NGANG (GRIDLINES) VÀ TRỤC TIỀN Y */}
                                            {yTicks.map((tick, index) => {
                                                const yPos = paddingTopBottom + (h - (tick / maxAxis) * h)
                                                const labelText = tick >= 1000 ? `${tick / 1000}k` : `${tick}`

                                                return (
                                                    <g key={index}>
                                                        {/* Đường lưới ngang mờ đứt nét */}
                                                        <line
                                                            x1={paddingLeft}
                                                            y1={yPos}
                                                            x2={700 - paddingRight}
                                                            y2={yPos}
                                                            stroke="#e2e8f0"
                                                            strokeWidth="1"
                                                            strokeDasharray="4 4"
                                                        />
                                                        {/* Chữ hiển thị mốc tiền bên trái trục Y */}
                                                        <text
                                                            x={paddingLeft - 12}
                                                            y={yPos + 4}
                                                            fontSize="11"
                                                            fontWeight="600"
                                                            fill="#64748b"
                                                            textAnchor="end"
                                                        >
                                                            {labelText}
                                                        </text>
                                                    </g>
                                                )
                                            })}

                                            {/* Đường trục dọc Y */}
                                            <line
                                                x1={paddingLeft}
                                                y1={paddingTopBottom}
                                                x2={paddingLeft}
                                                y2={paddingTopBottom + h}
                                                stroke="#cbd5e1"
                                                strokeWidth="1.5"
                                            />

                                            {/* 2. VẼ CÁC CỘT DOANH THU VÀ TEXT NGÀY THÁNG */}
                                            {revenue7.map((r, i) => {
                                                const bx = paddingLeft + i * bw
                                                // Giới hạn dữ liệu không vượt quá đỉnh 10k trên biểu đồ để tránh lỗi tràn SVG
                                                const currentAmount = Math.min(r.amount, maxAxis)
                                                const bh = Math.round((currentAmount / maxAxis) * h)
                                                const by = paddingTopBottom + (h - bh)
                                                const labelY = by - 8

                                                return (
                                                    <g key={r.key}>
                                                        {/* Cột hiển thị dữ liệu - Bề ngang được thu nhỏ lại bằng cách tăng khoảng đệm (padding) */}
                                                        <rect
                                                            x={bx + 24} // Tăng từ 14 lên 24 để đẩy cột vào giữa sâu hơn
                                                            y={by}
                                                            width={bw - 48} // Giảm độ rộng của cột (bw - 48) giúp cột thon gọn hơn
                                                            height={Math.max(bh, 2)}
                                                            fill="var(--accent, #0f766e)"
                                                            rx="4"
                                                        />
                                                        {/* Số tiền cụ thể hiển thị trên đầu cột */}
                                                        {r.amount > 0 && (
                                                            <text
                                                                x={bx + bw / 2}
                                                                y={labelY}
                                                                fontSize="11"
                                                                fontWeight="700"
                                                                textAnchor="middle"
                                                                fill="var(--text-main)"
                                                            >
                                                                {r.amount >= 1000 ? `${(r.amount / 1000).toFixed(0)}k` : r.amount}
                                                            </text>
                                                        )}
                                                        {/* Label Ngày tháng dưới chân cột */}
                                                        <text
                                                            x={bx + bw / 2}
                                                            y={paddingTopBottom + h + 20}
                                                            fontSize="12"
                                                            fontWeight="500"
                                                            textAnchor="middle"
                                                            fill="var(--text-soft)"
                                                        >
                                                            {r.label}
                                                        </text>
                                                    </g>
                                                )
                                            })}
                                        </g>
                                    )
                                })()}
                            </svg>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}>
                            Không có dữ liệu doanh thu
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function UsersPanel() {
    const [users, setUsers] = useState([])
    useEffect(() => { async function l() { const u = await getUsers(); setUsers(u || []) } l() }, [])
    const [selectedUser, setSelectedUser] = useState(null)
    const [userRuns, setUserRuns] = useState([])
    const [previewSrc, setPreviewSrc] = useState(null)
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
                <div style={{ width: '100%' }}>
                    <table className="admin-table">
                        <thead>
                            <tr><th>ID</th><th>Tên đăng nhập</th><th>Email</th><th>Vai trò</th></tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => loadUserRuns(u)}>
                                    <td>{u.id}</td><td>{u.username}</td><td>{u.email}</td><td>{u.role}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                    {selectedUser ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4>Lịch sử chạy của {selectedUser.username} (#{selectedUser.id})</h4>
                                <div>
                                    <button style={{ marginLeft: 8 }} onClick={handleBan}>Khóa</button>
                                    <button style={{ marginLeft: 8 }} onClick={handleUnban}>Mở khóa</button>
                                    <button style={{ marginLeft: 8 }} onClick={handleResetPassword}>Đặt lại mật khẩu</button>
                                </div>
                            </div>
                            {userDetails ? (
                                <div style={{ marginBottom: 12, padding: 8, background: '#fafafa', borderRadius: 6 }}>
                                    <div><strong>Credits:</strong> {userDetails.credits}</div>
                                    <div><strong>Tổng video:</strong> {userDetails.total_videos}</div>
                                    <div><strong>Credits đã mua:</strong> {userDetails.credits_bought}</div>
                                    <div><strong>Credits đã dùng:</strong> {userDetails.credits_used}</div>
                                    <div><strong>Đăng nhập gần nhất:</strong> {userDetails.last_login || 'N/A'}</div>
                                </div>
                            ) : null}
                            <div style={{ marginBottom: 12, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
                                <h5>Quản lý Credits</h5>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input placeholder="Đặt credits (tổng)" value={creditsInput} onChange={(e) => setCreditsInput(e.target.value)} />
                                    <button onClick={async () => {
                                        const v = parseInt(creditsInput || '0')
                                        if (isNaN(v)) return alert('Giá trị không hợp lệ')
                                        try { await setUserCredits(selectedUser.id, v); alert('Đã đặt credits'); await loadUserDetails(selectedUser) } catch (e) { alert('Lỗi: ' + (e.message || e)) }
                                    }}>Đặt</button>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                                    <input placeholder="Hiệu số (ví dụ: 30 hoặc -20)" value={deltaInput} onChange={(e) => setDeltaInput(e.target.value)} />
                                    <button onClick={async () => {
                                        const v = parseInt(deltaInput || '0')
                                        if (isNaN(v)) return alert('Giá trị không hợp lệ')
                                        try { await adjustUserCredits(selectedUser.id, v); alert('Đã cập nhật credits'); await loadUserDetails(selectedUser) } catch (e) { alert('Lỗi: ' + (e.message || e)) }
                                    }}>Điều chỉnh</button>
                                </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <h4>Lịch sử hoạt động</h4>
                                {userVideos && userVideos.length > 0 ? (
                                    <table className="admin-table">
                                        <thead>
                                            <tr><th>ID</th><th>Tiêu đề</th><th>Trạng thái</th><th>Hành động</th></tr>
                                        </thead>
                                        <tbody>
                                            {(userVideos || []).map(v => (
                                                <tr key={v.id}>
                                                    <td>{v.id}</td>
                                                    <td style={{ cursor: 'pointer' }} onClick={async () => {
                                                        try {
                                                            const details = await getVideo(v.id)
                                                            await listVideoScenes(v.id)
                                                            setPreviewSrc(null)
                                                            await openPreviewVideo(details.final_path || v.final_path || '', setUserPreviewUrl, userPreviewBlobUrl, setUserPreviewBlobUrl)
                                                        } catch (e) { setUserPreviewUrl(null) }
                                                    }}>{v.title}</td>
                                                    <td>{v.status}</td>
                                                    <td>
                                                        <button onClick={async () => {
                                                            try {
                                                                await openPreviewVideo(v.final_path || '', setUserPreviewUrl, userPreviewBlobUrl, setUserPreviewBlobUrl)
                                                            } catch (e) {
                                                                alert('Không thể preview video: ' + (e.message || e))
                                                            }
                                                        }}>Preview</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ padding: 12, color: '#666' }}>Không có video.</div>
                                )}

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

                            <div style={{ marginTop: 20 }}>
                                <h4>Lịch sử hiển thị các Runs</h4>
                                <table className="admin-table">
                                    <thead>
                                        <tr><th>Run ID</th><th>Ngày</th><th>Số sự kiện</th><th>Hành động</th></tr>
                                    </thead>
                                    <tbody>
                                        {userRuns.map(r => (
                                            <tr key={r.run_id}>
                                                <td>{r.run_id}</td><td>{r.date}</td><td>{r.event_count}</td>
                                                <td>
                                                    <div className="run-actions">
                                                        <button onClick={() => handlePreview(r)} disabled={!r.has_video}>{r.has_video ? 'Xem video' : 'Không có video'}</button>
                                                        <button style={{ marginLeft: 8 }} onClick={async () => {
                                                            const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1').replace(/\/$/, '')
                                                            const url = `${base}/admin/users/${selectedUser.id}/runs/${r.run_id}/download`
                                                            const token = localStorage.getItem('auth_token')
                                                            try {
                                                                const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
                                                                if (!resp.ok) { alert('Không thể tải video: ' + resp.statusText); return }
                                                                const blob = await resp.blob()
                                                                const a = document.createElement('a')
                                                                const blobUrl = URL.createObjectURL(blob)
                                                                a.href = blobUrl
                                                                a.download = `${r.run_id}.mp4`
                                                                document.body.appendChild(a)
                                                                a.click()
                                                                a.remove()
                                                                URL.revokeObjectURL(blobUrl)
                                                            } catch (e) { alert('Lỗi tải: ' + (e.message || e)) }
                                                        }}>Tải xuống</button>
                                                        <button style={{ marginLeft: 8 }} onClick={() => handleRefund(r)} disabled={r.refunded}>{r.refunded ? 'Đã hoàn tiền' : 'Hoàn tiền'}</button>
                                                        <button style={{ marginLeft: 8 }} onClick={() => handleDelete(r)}>Xóa</button>
                                                        <button
                                                            style={{ marginLeft: 8 }}
                                                            onClick={async () => {
                                                                await loadRunVideos(selectedUser, r.run_id)
                                                                setSelectedRunDetail(r.run_id)
                                                            }}
                                                        >
                                                            Chi tiết
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {activities && activities.length > 0 ? (
                                <div style={{ marginTop: 12 }}>
                                    <h4>Hoạt động gần đây</h4>
                                    <table className="admin-table">
                                        <thead>
                                            <tr><th>ID</th><th>Hành động</th><th>Chi tiết</th><th>IP</th><th>Thời gian</th></tr>
                                        </thead>
                                        <tbody>
                                            {activities.map(a => (
                                                <tr key={a.id}><td>{a.id}</td><td>{a.action}</td><td style={{ whiteSpace: 'pre-wrap' }}>{a.detail}</td><td>{a.ip_address}</td><td>{a.created_at}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>
                    ) : <div><em>Nhấn vào người dùng để xem các runs</em></div>}
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

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                <div className="card" style={{ flex: 1, minWidth: '400px', overflowX: 'auto' }}>
                    <table
                        className="admin-table"
                        style={{
                            width: '100%',
                            tableLayout: 'auto',
                            borderCollapse: 'collapse'
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={{ width: '50px', padding: '12px 8px' }}>ID</th>
                                <th style={{ padding: '12px 8px' }}>Tên gói</th>
                                <th style={{ padding: '12px 8px' }}>Credits</th>
                                <th style={{ padding: '12px 8px' }}>Giá (VND)</th>
                                <th style={{ padding: '12px 8px', width: '130px', textAlign: 'center' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 8px', overflow: 'visible', textOverflow: 'clip' }}>{p.id}</td>
                                    <td style={{ padding: '12px 8px', fontWeight: 600, overflow: 'visible', textOverflow: 'clip' }}>{p.name}</td>
                                    <td style={{ padding: '12px 8px', overflow: 'visible', textOverflow: 'clip' }}>{p.credits}</td>
                                    <td style={{ padding: '12px 8px', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                                        {Math.round((p.price_cents || 0) / 100).toLocaleString()}₫
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center', overflow: 'visible' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => edit(p)}
                                                style={{ padding: '4px 10px', fontSize: '13px', borderRadius: '8px' }}
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => remove(p.id)}
                                                className="danger"
                                                style={{ padding: '4px 10px', fontSize: '13px', borderRadius: '8px' }}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card" style={{ width: '360px', flexShrink: 0 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, textAlign: 'left' }}>
                        {selected ? 'Sửa gói' : 'Tạo gói mới'}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ textAlign: 'left', fontWeight: 500 }}>
                            Tên gói
                            <input
                                placeholder="Nhập tên gói (VD: Premium, VIP...)"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                style={{ width: '100%', marginTop: '4px' }}
                            />
                        </label>

                        <label style={{ textAlign: 'left', fontWeight: 500 }}>
                            Số credit
                            <input
                                placeholder="Nhập số lượng credits"
                                type="number"
                                value={form.credits || ''}
                                onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                                style={{ width: '100%', marginTop: '4px' }}
                            />
                        </label>

                        <label style={{ textAlign: 'left', fontWeight: 500 }}>
                            Giá tiền (VND)
                            <input
                                placeholder="Nhập giá tiền VND"
                                type="number"
                                value={form.price_vnd || ''}
                                onChange={(e) => setForm({ ...form, price_vnd: Number(e.target.value) })}
                                style={{ width: '100%', marginTop: '4px' }}
                            />
                        </label>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button
                                onClick={save}
                                style={{
                                    flex: 1,
                                    backgroundColor: 'var(--accent)',
                                    color: '#fff',
                                    borderColor: 'var(--accent)'
                                }}
                            >
                                {selected ? 'Lưu thay đổi' : 'Tạo gói'}
                            </button>
                            {selected && (
                                <button
                                    style={{ flex: 1 }}
                                    onClick={() => { setSelected(null); setForm({ name: '', credits: 0, price_vnd: 0 }) }}
                                >
                                    Hủy
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

function RevenueReport() {
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [tx, setTx] = useState([])
    const [users, setUsers] = useState([]) // State lưu thông tin User để map username
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState({ total_vnd: 0, count: 0 })
    const [byDay, setByDay] = useState([])
    const [selectedDateDetails, setSelectedDateDetails] = useState(null) // State theo dõi ngày đang được chọn xem chi tiết
    const [detailedTxList, setDetailedTxList] = useState([]) // Danh sách transaction của ngày được chọn

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const allTx = await listTransactions(2000, 0) // Lấy danh sách giao dịch lớn hơn để tổng hợp báo cáo đầy đủ
                const allUsers = await getUsers()
                setTx(allTx || [])
                setUsers(allUsers || [])
            } catch (e) {
                setTx([])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    function parseAmount(t) {
        try {
            const m = (t.reason || '').match(/amount_vnd=([0-9]+)/)
            if (m) return Number(m[1] || 0)
        } catch (e) { }
        return 0
    }

    function applyFilter() {
        const from = fromDate ? new Date(fromDate) : null
        const to = toDate ? new Date(toDate) : null
        const map = {}
        let total = 0
        let count = 0

        // Reset trạng thái chi tiết khi thực hiện lọc mới
        setSelectedDateDetails(null)
        setDetailedTxList([])

        for (const t of (tx || [])) {
            try {
                const created = t.created_at ? new Date(t.created_at) : null
                if (!created) continue
                if (from && created < from) continue
                if (to) {
                    const toEnd = new Date(to)
                    toEnd.setHours(23, 59, 59, 999)
                    if (created > toEnd) continue
                }

                const key = created.toISOString().slice(0, 10)
                const amt = parseAmount(t)

                // Chỉ tính những giao dịch sinh ra doanh thu thực tế (> 0đ)
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
                        onClick={() => { setFromDate(''); setToDate(''); setByDay([]); setSummary({ total_vnd: 0, count: 0 }); setSelectedDateDetails(null); setDetailedTxList([]) }}
                        style={{ padding: '9px 20px' }}
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            {/* Khối hiển thị Tổng quan số liệu */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: 24, flexWrap: 'wrap' }}>
                <div className="stat-card" style={{ flex: 1, minWidth: '240px' }}>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>💰</div>
                    <div style={{ textAlign: 'left' }}>
                        <div className="stat-title">Doanh thu thu về</div>
                        <div className="stat-number" style={{ color: 'var(--accent)' }}>
                            {(summary.total_vnd || 0).toLocaleString()}₫
                        </div>
                    </div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: '240px' }}>
                    <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>🧾</div>
                    <div style={{ textAlign: 'left' }}>
                        <div className="stat-title">Tổng số lượt mua gói</div>
                        <div className="stat-number" style={{ color: '#1d4ed8' }}>
                            {summary.count} Giao dịch
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* Bảng Doanh thu theo Ngày */}
                <div className="card" style={{ flex: 1, minWidth: '350px', overflowX: 'auto', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, textAlign: 'left' }}>
                        Thống kê theo ngày (Chọn ngày để xem chi tiết)
                    </h4>
                    {byDay.length > 0 ? (
                        <table className="admin-table" style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                                    <th style={{ padding: '12px' }}>Ngày nhận tiền</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Số lượt mua</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Doanh thu</th>
                                    <th style={{ padding: '12px', width: '80px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {byDay.map(r => (
                                    <tr
                                        key={r.date}
                                        style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            cursor: 'pointer',
                                            backgroundColor: selectedDateDetails === r.date ? 'var(--accent-soft)' : 'transparent'
                                        }}
                                        onClick={() => handleShowDateDetails(r.date)}
                                    >
                                        <td style={{ padding: '12px', fontWeight: 500 }}>{r.date}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>{r.count}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                                            {r.amount.toLocaleString()}₫
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--accent)', fontWeight: 600, fontSize: '12px' }}>
                                            {selectedDateDetails === r.date ? 'Đang xem' : 'Xem ➔'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '30px 10px', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                            Chưa có dữ liệu. Vui lòng bấm "Lọc kết quả".
                        </div>
                    )}
                </div>

                {/* Khối hiển thị chi tiết: Ai chuyển, Lúc nào, Gói gì */}
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
    const [tab, setTab] = useState('Dashboard')
    return (
        <div
            className="admin-root"
            style={{
                display: 'flex',
                width: '100%',
                minHeight: '100vh'
            }}
        >
            <Sidebar tab={tab} setTab={setTab} />

            <div
                className="admin-content"
                style={{
                    flex: 1,
                    padding: '24px',
                    overflow: 'auto'
                }}
            >
                {tab === 'Dashboard' && <Dashboard setTab={setTab} />}
                {tab === 'Users' && <UsersPanel />}
                {tab === 'Packages' && <PackagesPanel />}
                {tab === 'Revenue' && <RevenueReport />}
            </div>
        </div>
    )
}