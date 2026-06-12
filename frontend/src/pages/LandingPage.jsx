import React from 'react'
import '../landing.css'
import Footer from '../components/landing/Footer'
import NavBar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import Workflow from '../components/landing/Workflow'
import Features from '../components/landing/Features'
import Showcase from '../components/landing/Showcase'
import Pricing from '../components/landing/Pricing'
import FAQ from '../components/landing/FAQ'

function Stats() {
    const data = [['7+', 'Bước tự động hóa'], ['AI', 'Sinh kịch bản'], ['Kling', 'Render video'], ['24/7', 'Hoạt động liên tục']]
    return (
        <section className="lp-stats">
            <div className="container stats-row">
                {data.map((s, i) => (
                    <div className="stat-item" key={i}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{s[0]}</div>
                        <div style={{ color: 'var(--muted)' }}>{s[1]}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default function LandingPage() {
    return (
        <div className="lp-root">
            {/* Vùng bọc chung để Header và Hero nằm đè lên cùng 1 background video */}
            <div className="hero-fullscreen-wrapper">
                <NavBar />
                <Hero />
            </div>

            <main>
                <Workflow />
                <Features />
                <Showcase />
                <Stats />
                <Pricing />
                <FAQ />
            </main>
            <Footer />
        </div>
    )
}