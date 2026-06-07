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
        { key: 'Transactions', label: 'Giao dịch' },
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

function Dashboard() {
    const [counts, setCounts] = useState({
        users: 0,
        videos: 0,
        packages: 0,
        transactions: 0,
        total_revenue_vnd: 0,
        total_videos: 0,
    })

    const [recentUsers, setRecentUsers] = useState([])

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

                setRecentUsers((users || []).slice(0, 6))
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

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-outline">
                        🔄 Làm mới
                    </button>

                    <button className="btn-primary">
                        📊 Xuất báo cáo
                    </button>
                </div>
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
                    gridTemplateColumns: '1fr 1fr',
                    gap: 24
                }}
            >
                <div className="card">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 20
                        }}
                    >
                        <h4>Người dùng mới</h4>

                        <button className="btn-link">
                            Xem tất cả
                        </button>
                    </div>

                    <div className="users-scroll">
                        {recentUsers.map((u) => (
                            <div key={u.id} className="user-row">
                                <div>{u.username}</div>

                                <span className="user-badge">
                                    #{u.id}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hoạt động panel removed because it's empty */}
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

    async function loadUserRuns(u) {
        setSelectedUser(u)
        try {
            const runs = await getUserLogs(u.id)
            const detailed = await Promise.all((runs || []).map(async (r) => {
                try {
                    const d = await getUserLogDetail(u.id, r.run_id)
                    const events = d.events || []
                    const refunded = events.some(ev => (ev.step === 'admin_refund' || (ev.data && ev.data.refunded)))

                    // extract all video-producing events (could be multiple per run/step)
                    const videos = []
                    for (let i = 0; i < events.length; i++) {
                        const ev = events[i]
                        const data = ev.data || {}
                        // common keys used across pipeline: final_video_path, final_path, video_url
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

                    // group videos by step for easier display
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
            // keep ALL runs, but we mark which have video via has_video
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

    async function loadUserDetails(u) {
        try {
            const d = await getUserDetails(u.id)
            setUserDetails(d)
        } catch (e) {
            setUserDetails(null)
        }
    }

    function resolveVideoUrl(rawUrl) {
        if (!rawUrl) return null
        let url = String(rawUrl)
        // normalize backslashes
        url = url.replace(/\\\\/g, '/')
        url = url.replace(/\\/g, '/')
        // prefer absolute http(s)
        if (url.match(/^https?:\/\//)) return url

        // if path contains 'storage/' use that as web root
        const storageIndex = url.indexOf('storage/')
        const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1').replace(/\/$/, '')
        if (storageIndex !== -1) {
            let sub = url.slice(storageIndex)
            if (!sub.startsWith('/')) sub = '/' + sub
            return base + sub
        }

        // if it's an absolute filesystem path with drive letter like C:/... try to find '/renders/' as fallback
        const rendersIndex = url.indexOf('/renders/')
        if (rendersIndex !== -1) {
            let sub = url.slice(rendersIndex)
            if (!sub.startsWith('/')) sub = '/' + sub
            return base + sub
        }

        // otherwise prefix base
        if (url.startsWith('/')) return base + url
        return base + '/' + url
    }

    async function loadActivities(u) {
        try {
            const a = await getUserActivities(u.id, 50, 0)
            setActivities(a || [])
        } catch (e) { setActivities([]) }
    }

    async function handlePreview(run) {
        // fetch run detail to find final video path
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
            // revoke previous blob if any
            try { if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl) } catch (e) { }
            setPreviewSrc(blobUrl)
            setPreviewBlobUrl(blobUrl)
        } catch (e) {
            alert('Lỗi khi lấy thông tin run: ' + (e.message || e))
        }
    }

    async function handlePreviewEventVideo(video) {
        try {
            const url = resolveVideoUrl(video.url)
            setUserPreviewUrl(url)
        } catch (e) {
            alert('Không thể preview video: ' + (e.message || e))
        }
    }

    async function handleDownloadEventVideo(video, run) {
        try {
            const url = resolveVideoUrl(video.url)
            // try direct fetch (may require auth)
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
            // refresh runs (reload detailed runs)
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
        // attempt to construct download link from run events
        return `/storage/renders/user_${selectedUser.id}/${run.date}/${run.run_id}/final/`
    }

    return (
        <div>
            <h3>Người dùng</h3>
            <div>
                <div style={{ width: '100%' }}>
                    <table className="admin-table"><thead><tr><th>ID</th><th>Tên đăng nhập</th><th>Email</th><th>Vai trò</th></tr></thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => loadUserRuns(u)}><td>{u.id}</td><td>{u.username}</td><td>{u.email}</td><td>{u.role}</td></tr>
                            ))}
                        </tbody></table>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                    {selectedUser ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4>Lịch sử chạy của {selectedUser.username} (#{selectedUser.id})</h4>
                                <div>
                                    <button onClick={() => loadUserDetails(selectedUser)}>Xem chi tiết</button>
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
                                    <table className="admin-table"><thead><tr><th>ID</th><th>Tiêu đề</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                                        <tbody>{(userVideos || []).map(v => (
                                            <tr key={v.id}>
                                                <td>{v.id}</td>
                                                <td style={{ cursor: 'pointer' }} onClick={async () => {
                                                    try {
                                                        const details = await getVideo(v.id)
                                                        const scenes = await listVideoScenes(v.id)
                                                        setPreviewSrc(null)
                                                        const url = resolveVideoUrl(details.final_path || v.final_path || '')
                                                        setUserPreviewUrl(url)
                                                    } catch (e) { setUserPreviewUrl(null) }
                                                }}>{v.title}</td>
                                                <td>{v.status}</td>
                                                <td>
                                                    <button onClick={async () => {
                                                        const url = resolveVideoUrl(v.final_path || '')
                                                        setUserPreviewUrl(url)
                                                    }}>Preview</button>
                                                </td>
                                            </tr>
                                        ))}</tbody></table>
                                ) : (
                                    <div style={{ padding: 12, color: '#666' }}></div>
                                )}

                                {userPreviewUrl ? (
                                    <div style={{ marginTop: 12 }}>
                                        <h5>Preview</h5>
                                        <video src={userPreviewUrl} controls style={{ width: '100%' }} />
                                        <div style={{ marginTop: 8 }}><button onClick={() => setUserPreviewUrl(null)}>Đóng Preview</button></div>
                                    </div>
                                ) : null}
                            </div>
                            <table className="admin-table"><thead><tr><th>Run ID</th><th>Ngày</th><th>Số sự kiện</th><th>Hành động</th></tr></thead>
                                <tbody>
                                    {userRuns.map(r => (
                                        <React.Fragment key={r.run_id}>
                                            <tr><td>{r.run_id}</td><td>{r.date}</td><td>{r.event_count}</td>
                                                <td>
                                                    <button onClick={() => handlePreview(r)} disabled={!r.has_video}>{r.has_video ? 'Xem video' : 'Không có video'}</button>
                                                    <button style={{ marginLeft: 8 }} onClick={async () => {
                                                        // authenticated download via blob
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
                                                    <button style={{ marginLeft: 8 }} onClick={() => setExpandedRun(expandedRun === r.run_id ? null : r.run_id)}>Chi tiết</button>
                                                </td>
                                            </tr>
                                            {expandedRun === r.run_id ? (
                                                <tr><td colSpan={6} style={{ background: '#fafafa' }}>
                                                    <div style={{ padding: 12 }}>
                                                        <h5>Videos theo sự kiện</h5>
                                                        {r.videosByStep && Object.keys(r.videosByStep).length > 0 ? (
                                                            Object.entries(r.videosByStep).map(([step, vids]) => (
                                                                <div key={step} style={{ marginBottom: 10 }}>
                                                                    <div style={{ fontWeight: 600 }}>{step} ({(vids || []).length})</div>
                                                                    <table className="admin-table"><thead><tr><th>#</th><th>Tiêu đề</th><th>Thời gian</th><th>Hành động</th></tr></thead>
                                                                        <tbody>
                                                                            {(vids || []).map((vv, idx) => (
                                                                                <tr key={idx}>
                                                                                    <td>{idx + 1}</td>
                                                                                    <td>{vv.title}</td>
                                                                                    <td>{vv.timestamp || ''}</td>
                                                                                    <td>
                                                                                        <button onClick={() => handlePreviewEventVideo(vv)}>Preview</button>
                                                                                        <button style={{ marginLeft: 8 }} onClick={() => handleDownloadEventVideo(vv, r)}>Tải xuống</button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody></table>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div style={{ color: '#666' }}><em>Không có video theo sự kiện — hiển thị raw events bên dưới.</em></div>
                                                        )}

                                                        <div style={{ marginTop: 12 }}>
                                                            <h6>Events (raw)</h6>
                                                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(r.events || [], null, 2)}</pre>
                                                        </div>
                                                    </div>
                                                </td></tr>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </tbody></table>
                            {activities && activities.length > 0 ? (
                                <div style={{ marginTop: 12 }}>
                                    <h4>Hoạt động gần đây</h4>
                                    <table className="admin-table"><thead><tr><th>ID</th><th>Hành động</th><th>Chi tiết</th><th>IP</th><th>Thời gian</th></tr></thead>
                                        <tbody>
                                            {activities.map(a => (
                                                <tr key={a.id}><td>{a.id}</td><td>{a.action}</td><td style={{ whiteSpace: 'pre-wrap' }}>{a.detail}</td><td>{a.ip_address}</td><td>{a.created_at}</td></tr>
                                            ))}
                                        </tbody></table>
                                </div>
                            ) : null}
                        </div>
                    ) : <div><em>Nhấn vào người dùng để xem các runs</em></div>}

                    {previewSrc ? (
                        <div style={{ marginTop: 12 }}>
                            <h5>Xem video</h5>
                            <video src={previewSrc} controls style={{ width: '100%' }} />
                            <div style={{ marginTop: 8 }}><button onClick={() => { try { if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl) } catch (e) { } setPreviewBlobUrl(null); setPreviewSrc(null); }}>Đóng</button></div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}



function PackagesPanel() {
    const [packages, setPackages] = useState([])
    const [form, setForm] = useState({ name: '', credits: 0, price_vnd: 0 })
    const [selected, setSelected] = useState(null)
    useEffect(() => { async function l() { const p = await listPackages(); setPackages(p || []) } l() }, [])

    async function reload() { const p = await listPackages(); setPackages(p || []); }

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
            <h3>Gói</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <table className="admin-table"><thead><tr><th>ID</th><th>Tên</th><th>Số credit</th><th>Giá (VND)</th><th>Giá / credit (VND)</th><th>Hành động</th></tr></thead>
                        <tbody>{packages.map(p => {
                            const priceCents = Number(p.price_cents || 0)
                            const priceVnd = Math.round(priceCents / 100)
                            const pricePerCredit = p.credits ? Math.round(priceVnd / p.credits) : 0
                            return (
                                <tr key={p.id}>
                                    <td>{p.id}</td>
                                    <td>{p.name}</td>
                                    <td>{p.credits}</td>
                                    <td>{priceVnd.toLocaleString()}₫</td>
                                    <td>{pricePerCredit.toLocaleString()}₫</td>
                                    <td>
                                        <button onClick={() => edit(p)}>Sửa</button>
                                        <button style={{ marginLeft: 8 }} onClick={() => remove(p.id)}>Xóa</button>
                                    </td>
                                </tr>
                            )
                        })}</tbody></table>
                </div>
                <div style={{ width: 360 }}>
                    <h4>{selected ? 'Sửa gói' : 'Tạo gói mới'}</h4>
                    <div style={{ marginBottom: 8 }}><input placeholder="Tên gói" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div style={{ marginBottom: 8 }}><input placeholder="Số credit (ví dụ: 30)" type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} /></div>
                    <div style={{ marginBottom: 8 }}><input placeholder="Giá (VND)" type="number" value={form.price_vnd} onChange={(e) => setForm({ ...form, price_vnd: Number(e.target.value) })} /></div>
                    <div>
                        <button onClick={save}>{selected ? 'Lưu' : 'Tạo gói'}</button>
                        {selected && <button style={{ marginLeft: 8 }} onClick={() => { setSelected(null); setForm({ name: '', credits: 0, price_vnd: 0 }) }}>Hủy</button>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function TransactionsPanel() {
    const [tx, setTx] = useState([])
    useEffect(() => { async function l() { const t = await listTransactions(100, 0); setTx(t || []) } l() }, [])
    return (
        <div>
            <h3>Giao dịch</h3>
            <table className="admin-table"><thead><tr><th>ID</th><th>Người dùng</th><th>Credits</th><th>Số tiền (VND)</th><th>Lý do</th><th>Thời gian</th></tr></thead>
                <tbody>{tx.map(t => {
                    // try to extract amount_vnd=NUMBER from reason
                    let amount = ''
                    try {
                        const m = (t.reason || '').match(/amount_vnd=([0-9]+)/)
                        if (m) amount = Number(m[1]).toLocaleString()
                    } catch (e) { }
                    const formattedTime = (t.created_at) ? new Date(t.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''
                    return (
                        <tr key={t.id}><td>{t.id}</td><td>{t.user_id}</td><td>{t.delta}</td><td>{amount}</td><td style={{ whiteSpace: 'pre-wrap' }}>{t.reason}</td><td>{formattedTime}</td></tr>
                    )
                })}</tbody></table>
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
                {tab === 'Dashboard' && <Dashboard />}
                {tab === 'Users' && <UsersPanel />}
                {/* Videos tab removed: videos are shown per-user in Users panel */}
                {tab === 'Packages' && <PackagesPanel />}
                {tab === 'Transactions' && <TransactionsPanel />}
            </div>
        </div>
    )
}
