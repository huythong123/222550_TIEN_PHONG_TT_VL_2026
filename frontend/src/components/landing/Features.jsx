import React from 'react'
import { motion } from 'framer-motion'

export default function Features() {
    const items = ['Tự động hóa toàn bộ quy trình', 'Tiết kiệm thời gian sản xuất video', 'Tích hợp AI hiện đại', 'Hỗ trợ tạo quảng cáo nhanh', 'Dễ sử dụng', 'Mở rộng linh hoạt']
    return (
        <section id="features" className="lp-features">
            <div className="container">
                <h2 className="section-title">Tại sao chọn AutoAds System?</h2>
                <div className="features-grid">
                    {items.map((t, i) => (
                        <div key={i} className="feature-card">
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Mô tả ngắn cho {t.toLowerCase()}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
