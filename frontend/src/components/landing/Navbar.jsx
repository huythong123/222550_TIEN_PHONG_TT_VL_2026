import React from 'react'
import { motion } from 'framer-motion'

export default function NavBar() {
    return (
        <header className="lp-navbar">
            <div className="nav-inner container">
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <div className="logo" style={{ fontWeight: 700 }}>Hệ thống tạo video tự động</div>
                    <div className="subtitle" style={{ fontSize: 12, color: 'var(--muted)' }}>Nền tảng tạo video quảng cáo tự động bằng AI</div>
                </div>
                <nav style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="nav-links">
                        <a href="#intro">Giới thiệu</a>
                        <a href="#workflow">Quy trình</a>
                        <a href="#features">Tính năng</a>
                        <a href="#pricing">Bảng giá</a>
                        <a href="#faq">FAQ</a>
                    </div>
                    <div className="nav-ctas">
                        <a href="#login" className="btn ghost">Đăng nhập</a>
                    </div>
                </nav>
            </div>
        </header>
    )
}
