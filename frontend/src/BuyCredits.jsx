import React, { useState, useEffect, useRef } from 'react'
import { buyCredits, listPublicPackages } from './api'

export default function BuyCredits({ onBought, pageMode = false, onClose }) {
    const [busyPlan, setBusyPlan] = useState(null)
    const [notice, setNotice] = useState('')
    const [open, setOpen] = useState(false)
    const [paymentInfo, setPaymentInfo] = useState(null)
    const [pollStatus, setPollStatus] = useState('')
    const [successModal, setSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [pendingCredits, setPendingCredits] = useState(null)
    const [isHovered, setIsHovered] = useState(false)
    const [remainingSeconds, setRemainingSeconds] = useState(null)
    const pollRef = useRef(null)
    const countdownRef = useRef(null)
    const [plans, setPlans] = useState([])

    // Hàm xử lý khi hoàn tất
    const finalizeSuccess = (msg) => {
        setSuccessMessage(msg);
        setSuccessModal(true);
        setPaymentInfo(null);
        setNotice('');
    }

    async function handleBuy(plan) {
        setBusyPlan(plan.id)
        setNotice('')
        try {
            const res = await buyCredits(plan.price_vnd)
            if (res && res.hex_id) {
                setPaymentInfo(res)
                setPollStatus('pending')
            } else if (res && typeof res.credits !== 'undefined') {
                setPendingCredits(res.credits)
                finalizeSuccess('Mua credits thành công')
            }
        } catch (e) {
            setNotice(e.message || String(e))
        } finally {
            setBusyPlan(null)
        }
    }

    useEffect(() => {
        if (!paymentInfo || !paymentInfo.hex_id) return
        let cancelled = false
        const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1').replace(/\/$/, '')

        // compute remaining time in seconds; cap at 5 minutes (300s)
        let rem = 300
        try {
            if (paymentInfo.expires_at) {
                const exp = new Date(paymentInfo.expires_at).getTime()
                const now = Date.now()
                const diff = Math.max(0, Math.floor((exp - now) / 1000))
                rem = Math.min(diff || 300, 300)
            }
        } catch (e) { rem = 300 }

        setRemainingSeconds(rem)

        // start polling Sepay status every 5s
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${base}/payment/status/${paymentInfo.hex_id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                })
                const data = await res.json()
                if (cancelled) return;

                setPollStatus(data.status)
                if (data.status === 'completed') {
                    clearInterval(pollRef.current);
                    pollRef.current = null
                    // stop countdown
                    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
                    // Cập nhật số dư mới từ server
                    const meRes = await fetch(`${base}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    })
                    if (meRes.ok) {
                        const me = await meRes.json()
                        setPendingCredits(me.credits)
                    }
                    finalizeSuccess('Nạp tiền thành công!')
                } else if (data.status === 'failed') {
                    setNotice('Hóa đơn đã hết hạn hoặc thất bại')
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
                    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
                    setPaymentInfo(null)
                }
            } catch (e) { /* ignore */ }
        }, 5000)

        // start countdown timer every second
        countdownRef.current = setInterval(() => {
            setRemainingSeconds(s => {
                if (s == null) return null
                if (s <= 1) {
                    // expire
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
                    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
                    setNotice('Hóa đơn đã hết hạn. Vui lòng tạo lại đơn hàng.')
                    setPaymentInfo(null)
                    return null
                }
                return s - 1
            })
        }, 1000)

        return () => { cancelled = true; if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }; if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null } }
    }, [paymentInfo])

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                const p = await listPublicPackages()
                if (!mounted) return
                const PACKAGE_NAMES = {
                    Starter: {
                        name: 'Dùng thử',
                        desc: 'Dành cho người mới trải nghiệm'
                    },
                    Standard: {
                        name: 'Phổ biến',
                        desc: 'Phù hợp nhu cầu sử dụng hằng ngày'
                    },
                    Pro: {
                        name: 'Chuyên nghiệp',
                        desc: 'Dành cho người dùng thường xuyên'
                    }
                }

                const mapped = (p || []).map(x => ({
                    id: x.id,
                    label: PACKAGE_NAMES[x.name]?.name || x.name,
                    credits: x.credits,
                    price_vnd: Math.round((x.price_cents || 0) / 100),
                    subtitle: PACKAGE_NAMES[x.name]?.desc || ''
                }))        
                mapped.sort((a, b) => (a.price_vnd || 0) - (b.price_vnd || 0))
                const limited = mapped.slice(0, 3)
                if (limited.length > 0) setPlans(limited)
            } catch (e) { }
        }
        load()
        return () => { mounted = false }
    }, [])

    // --- UI Components ---

    const RenderSuccessModal = () => {
        if (!successModal) return null;
        return (
            <div className="buy-modal-overlay">
                <div className="buy-modal-card">
                    <div className="buy-modal-icon">✓</div>
                    <div className="buy-modal-title">{successMessage}</div>
                    <button className="buy-btn" onClick={() => { setSuccessModal(false); if (typeof onBought === 'function' && pendingCredits != null) onBought(pendingCredits); setPendingCredits(null); window.location.reload(); }}>Xác nhận</button>
                </div>
            </div>
        )
    }

    const PaymentBlock = ({ info }) => (
        <div className="payment-block">
            <img src={info.qr_url} alt="QR" className="qr-img" />
            <div className="payment-info">
                <div className="payment-heading">Thông tin chuyển khoản</div>
                <p className="muted">Ngân hàng: <b>{info.bank_brand}</b></p>
                <p className="muted">Số tài khoản: <b className="accent-text">{info.account_number}</b></p>
                <p className="muted">Số tiền: <b>{info.amount_vnd.toLocaleString()} VND</b></p>
                <p className="muted">Nội dung: <b className="accent-text">{info.qr_text}</b></p>
                <div className="status">Trạng thái: <span className="status-value">{pollStatus === 'pending' ? '⏳ Đang chờ quét mã...' : pollStatus}</span></div>
                {remainingSeconds != null && (
                    <div className="payment-countdown">
                        <div className="muted">Thời gian còn lại: <b>{Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:{(remainingSeconds % 60).toString().padStart(2, '0')}</b></div>
                    </div>
                )}
            </div>
        </div>
    )

    const PlansGrid = () => (
        <div className="buy-plans-grid">
            {(plans.length ? plans : []).map((p, idx) => {
                const isRecommended = idx === plans.length - 1
                return (
                    <div key={p.id} className={"buy-plan-card" + (isRecommended ? ' recommended' : '')}>
                        <div className="buy-plan-header">
                            <div className="buy-plan-name">{p.label}</div>
                            <div className="buy-plan-credits">{p.credits} Credits</div>
                        </div>
                        <div className="buy-plan-price">{(p.price_vnd || 0).toLocaleString()}₫</div>
                        <div className="buy-plan-desc">{p.subtitle}</div>
                        <button className="buy-btn" onClick={() => handleBuy(p)} disabled={!!busyPlan}>{busyPlan === p.id ? 'Đang tạo...' : 'Chọn mua'}</button>
                    </div>
                )
            })}
        </div>
    )

    return (
        <>
            <RenderSuccessModal />

            {pageMode ? (
                <div style={{ padding: '1rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Mua Credits</h2>
                    <PlansGrid />
                    {paymentInfo && <PaymentBlock info={paymentInfo} />}
                    {notice && <div style={{ color: 'red', marginTop: 15, fontWeight: 500 }}>{notice}</div>}
                </div>
            ) : (
                <div>
                    <button onClick={() => setOpen(true)} className="btn-primary">Nạp Credits</button>

                    {open && (
                        <div className="buy-modal-overlay">
                            <div className="buy-modal-card" style={{ maxWidth: 900, width: '92%', maxHeight: '90vh', overflow: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0 }}>Nạp thêm credits vào tài khoản</h3>
                                    <button onClick={() => setOpen(false)} className="btn-close">✕</button>
                                </div>
                                <PlansGrid />
                                {paymentInfo && <PaymentBlock info={paymentInfo} />}
                                {notice && <div className="muted" style={{ color: 'var(--danger)', marginTop: 12 }}>{notice}</div>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}