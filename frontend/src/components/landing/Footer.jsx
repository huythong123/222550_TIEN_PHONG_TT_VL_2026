import React from 'react'
import "../../landing.css";
export default function Footer() {
    return (
        <footer className="lp-footer">
            <div className="container footer-inner">

                {/* Thông tin hệ thống */}
                <div className="footer-col">
                    <h3 className="footer-title">AutoAds System</h3>
                    <p className="muted">
                        Nền tảng hỗ trợ tạo video quảng cáo tự động từ website
                        bằng công nghệ AI, giúp doanh nghiệp tiết kiệm thời gian
                        và chi phí sản xuất nội dung quảng cáo.
                    </p>
                </div>

                {/* Liên kết nhanh */}
                <div className="footer-col">
                    <h4>Liên kết</h4>
                    <a href="#intro">Giới thiệu</a>
                    <a href="#workflow">Quy trình</a>
                    <a href="#features">Tính năng</a>
                    <a href="#pricing">Bảng giá</a>
                    <a href="#faq">FAQ</a>
                </div>

                {/* Công nghệ */}
                <div className="footer-col">
                    <h4>Công nghệ</h4>
                    <span>ASP.NET Core</span>
                    <span>ReactJS</span>
                    <span>OpenAI API</span>
                    <span>Kling AI</span>
                    <span>Gemini AI</span>
                </div>

                {/* Liên hệ */}
                <div className="footer-col">
                    <h4>Liên hệ</h4>
                    <span>Email: huythong983@autoads.vn</span>
                    <span>TP. Cần Thơ, Việt Nam</span>
                </div>

            </div>

            <div className="footer-bottom">
                <p>
                    © {new Date().getFullYear()} AutoAds System. All rights reserved.
                </p>
                <div className="footer-policy">
                    <a href="#">Điều khoản sử dụng</a>
                    <a href="#">Chính sách bảo mật</a>
                </div>
            </div>
        </footer>
    )
}