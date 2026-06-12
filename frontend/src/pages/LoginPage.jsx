import React from 'react'

export default function LoginPage(props) {
  const { authEmail, setAuthEmail, password, setPassword, handleLogin, busy, getGoogleLoginUrl } = props

  return (
    <div className="auth-shell" style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <main className="center-area" style={{ width: '100%', maxWidth: '420px' }}>
        <section className="card" style={{ padding: '32px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.3rem', color: '#1e293b', letterSpacing: '-0.5px' }}>Hệ thống tạo video tự động</span>
          </div>

          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 20px 0', color: '#1e293b', textAlign: 'center' }}>Đăng nhập tài khoản</h2>
          <form onSubmit={handleLogin} className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#475569' }}>
              Email hoặc tên đăng nhập
              <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#475569' }}>
              Mật khẩu tài khoản
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
            </label>
            <button type="submit" disabled={busy} style={{ padding: '12px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.15)' }}>
              {busy ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>
          <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ color: '#64748b', fontSize: '13px' }}>Hoặc</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>
          <button
            type="button"
            onClick={() => window.location.href = getGoogleLoginUrl()}
            className="google-login"
            style={{ width: '100%', marginTop: '18px', padding: '12px', borderRadius: '10px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            <span style={{ fontSize: '18px' }}>G</span>
            Đăng nhập với Google
          </button>
        </section>
      </main>
    </div>
  )
}
