import React from 'react'

export default function AdminHeader({ onLogout }) {
  return (
    <header className="admin-header" style={{
      background: 'var(--panel)',
      padding: '18px 24px',
      borderRadius: '12px',
      border: '1px solid #eef2f6',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24
    }}>
      <div style={{ textAlign: 'left' }}>
        <p className="admin-welcome" style={{ margin: 0, fontSize: '13px', color: 'var(--text-soft)', marginBottom: 4 }}>
          Xin chào, Quản trị viên
        </p>
        <h1 className="admin-title" style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Bảng điều khiển Auto Ads
        </h1>
      </div>

      <button 
        onClick={onLogout} 
        style={{
          background: '#fff1f2',
          color: '#e11d48',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = '#ffe4e6'}
        onMouseLeave={(e) => e.target.style.background = '#fff1f2'}
      >
        Đăng xuất
      </button>
    </header>
  )
}