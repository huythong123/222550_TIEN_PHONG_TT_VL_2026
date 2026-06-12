import React from 'react'
import { motion } from 'framer-motion'

const samples = [
  {name: 'A. Nguyen', text: 'Cut our production time by 80% — unreal results.'},
  {name: 'B. Tran', text: 'The voices and pacing are spot-on every time.'},
  {name: 'C. Le', text: 'Enterprise-grade renders with tiny turnaround.'},
]

export default function Testimonials(){
  return (
    <section className="lp-testimonials">
      <div className="container">
        <h2 className="section-title">Testimonials</h2>
        <div className="test-grid">
          {samples.map((s, i) => (
            <motion.blockquote key={i} className="test-card" whileHover={{ scale: 1.02 }}>
              <p>“{s.text}”</p>
              <footer>— {s.name}</footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
