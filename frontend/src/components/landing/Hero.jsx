import React from 'react'
import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="lp-hero">
            {/* Video Background phủ từ đỉnh Header xuống hết phân vùng Hero */}
            <div className="hero-video-bg">
                <video className="hero-bg-video" autoPlay muted loop playsInline src="/demoweb_gemini.mp4" />
                <div className="hero-video-overlay" /> {/* Lớp phủ mờ giúp chữ rõ nét hơn */}
            </div>

            {/* Nội dung căn chính giữa tuyệt đối */}
            <div className="container hero-content-center">
                <div className="hero-copy-centered">
                    <h1>Tạo Video Quảng Cáo AI<br />Từ Website Chỉ Trong Vài Phút</h1>
                    <p className="muted">AutoAds System tự động phân tích website, sinh kịch bản quảng cáo, tạo phân cảnh, tạo prompt AI, voice over và render video hoàn chỉnh trên một quy trình tự động hóa.</p>
                    <div className="hero-ctas-center">
                        <a className="btn primary" href="#login">🚀 Tạo Video Ngay</a>
                        <a className="btn ghost" href="#showcase">▶ Xem Demo</a>
                    </div>
                </div>
            </div>
        </section>
    )
}
