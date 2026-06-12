import React from 'react'

export default function MobileTopbar({ isMobileMenuOpen, onToggleMobileMenu, credits }) {
  return (
    <div style={{
      height: '60px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e2e8f0',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }} className="mobile-top-bar">
      <button onClick={onToggleMobileMenu} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '22px', cursor: 'pointer' }}>
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>
      <div style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px', color: '#1e293b' }}>Auto Ads System</div>
      <div style={{ fontSize: '12px', backgroundColor: 'rgba(15, 118, 110, 0.08)', color: '#0f766e', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>🪙 {credits}</div>
    </div>
  )
}
