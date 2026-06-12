import React from 'react'
import { motion } from 'framer-motion'



export default function Pricing() {
    const plans = [{ name: 'Cơ bản', credits: 100, price: '50.000 VND' }, { name: 'Tiêu chuẩn', credits: 600, price: '150.000 VND' }, { name: 'Chuyên nghiệp', credits: 'Custom', price: 'Contact' }]
    return (
        <section id="pricing" className="lp-pricing">
            <div className="container">
                <h2 className="section-title">Bảng giá</h2>
                <div className="pricing-grid">
                    {plans.map((p, i) => (
                        <div className="pricing-card" key={i}>
                            <div style={{ fontWeight: 800, fontSize: 18 }}>{p.name}</div>
                            <div style={{ color: 'var(--muted)', margin: '8px 0' }}>{p.credits} credits</div>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{p.price}</div>
                            <div style={{ marginTop: 12 }}><a className="btn primary" href="/dashboard">Chọn gói</a></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}