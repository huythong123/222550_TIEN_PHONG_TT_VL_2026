import React from 'react'
import { motion } from 'framer-motion'



export default function Showcase() {
    const demos = [
        {
            title: 'Video Ads — STING',
            dur: '10s',
            cat: 'Nước tăng lực',
            src: '/demoSting.mp4'
        },
        {
            title: 'Video Ads — Thị Trường',
            dur: '15s',
            cat: 'Doanh nghiệp',
            src: '/demoThitruong.mp4'
        },
        {
            title: 'Video Ads — Mỹ Phẩm',
            dur: '15s',
            cat: 'Làm dép',
            src: '/demodep.mp4'
        }
    ]

    return (
        <section id="showcase" className="lp-showcase">
            <div className="container">
                <h2 className="section-title">
                    Một vài video của người dùng
                </h2>

                <div className="showcase-grid">
                    {demos.map((d, i) => (
                        <div className="video-card" key={i}>
                            <video
                                className="video-thumb"
                                controls
                                preload="metadata"
                                src={d.src}
                            />

                            <div
                                style={{
                                    marginTop: 8,
                                    fontWeight: 700
                                }}
                            >
                                {d.title}
                            </div>

                            <div
                                style={{
                                    color: 'var(--muted)',
                                    fontSize: 13
                                }}
                            >
                                {d.dur} · {d.cat}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
