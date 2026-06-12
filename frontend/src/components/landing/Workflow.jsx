import React from 'react'
import { motion } from 'framer-motion'


export default function Workflow() {
    const steps = [
        ['🌐', 'Phân tích website'],
        ['📝', 'Sinh kịch bản'],
        ['🎬', 'Tạo phân cảnh'],
        ['⚡', 'Sinh Prompt AI'],
        ['🎙️', 'Voice Over'],
        ['🎥', 'Render Video'],
        ['🚀', 'Xuất Thành Phẩm'],
    ]
    return (
        <section id="workflow" className="lp-workflow">
            <div className="container">
                <h2 className="section-title">Quy trình tự động hóa 7 bước</h2>
                <div className="workflow-grid">
                    {steps.map((s, i) => (
                        <div key={i} className="workflow-step">
                            <div className="icon" style={{ fontSize: 20 }}>{s[0]}</div>
                            <div style={{ marginTop: 8, fontWeight: 700 }}>{s[1]}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}