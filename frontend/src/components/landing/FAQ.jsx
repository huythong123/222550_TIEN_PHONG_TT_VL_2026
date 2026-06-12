import React, {useState} from 'react'
import { motion } from 'framer-motion'

export default function FAQ() {
    const q = [
        { q: 'Làm sao AutoAds phân tích website?', a: 'Hệ thống phân tích cấu trúc HTML và nội dung để sinh kịch bản phù hợp.' },
        { q: 'Thời gian tạo video?', a: 'Tùy theo độ dài và queue; previews thường trong vài phút.' },
        { q: 'Hỗ trợ ngôn ngữ?', a: 'Hệ thống hỗ trợ nhiều ngôn ngữ cho voice-over và nội dung.' },
    ]
    return (
        <section id="faq" className="lp-faq">
            <div className="container faq-accordion">
                <h2 className="section-title">FAQ</h2>
                {q.map((it, i) => (
                    <details key={i} style={{ marginBottom: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                        <summary style={{ fontWeight: 700 }}>{it.q}</summary>
                        <div style={{ color: 'var(--muted)', marginTop: 8 }}>{it.a}</div>
                    </details>
                ))}
            </div>
        </section>
    )
}
