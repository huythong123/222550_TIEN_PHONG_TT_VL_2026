import React from 'react'
// PasswordForm UI removed per request

export default function Sidebar(props) {
  const { isMobileMenuOpen, chats, selectedChatId, createNewChat, selectChat, openMenuId, onToggleMenu, renameChat, deleteChat, accountLabel, credits, showBuyPage, onToggleBuyPage, showPasswordForm, onTogglePasswordForm, currentPassword, setCurrentPassword, newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, passwordBusy, passwordMessage, handleChangePassword, onLogout, isAdmin, onOpenAdmin } = props

  return (
    <aside
      style={{
        width: '290px',
        backgroundColor: '#fff',
        color: '#1e293b',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 110,
        borderRight: '1px solid #e2e8f0'
      }}
      className={`responsive-sidebar ${isMobileMenuOpen ? 'open' : ''}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
        <button className="sidebar-new" onClick={() => createNewChat()} style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#0f766e', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer', marginBottom: '24px', flexShrink: 0, fontSize: '13.5px', boxShadow: '0 4px 6px -1px rgba(15,118,110,0.15)' }}>
          + Tạo đoạn chat mới
        </button>

        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px', textAlign: 'left', flexShrink: 0, letterSpacing: '0.5px', paddingLeft: '6px' }}>
          Gần đây
        </div>

        <nav style={{ textAlign: 'left', flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-sidebar-scroll">
          {chats.length > 0 ? (
            chats.map((c) => (
              <div key={c.id} className={"chat-list-item" + (selectedChatId === c.id ? ' active' : '')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', padding: '10px 12px', borderRadius: '8px', backgroundColor: selectedChatId === c.id ? 'rgba(15, 118, 110, 0.06)' : 'transparent', transition: 'all 0.2s' }}>
                <button onClick={() => selectChat(c.id)} title={c.title} style={{ background: 'none', border: 'none', color: selectedChatId === c.id ? '#0f766e' : '#475569', cursor: 'pointer', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '82%', textAlign: 'left', fontSize: '13px', fontWeight: selectedChatId === c.id ? '600' : '500' }}>
                  💬 {c.title}
                </button>
                <div style={{ position: 'relative' }} data-menu-id={c.id}>
                  <button
                    className="chat-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMenu(e, c.id)
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px', fontSize: '13px' }}
                  >⋯</button>

                  {openMenuId === c.id && (
                    <>
                      <div
                        onClick={() => onToggleMenu(null)}
                        style={{
                          position: 'fixed',
                          top: 0, left: 0, right: 0, bottom: 0,
                          zIndex: 9998
                        }}
                      />

                      <div onMouseDown={(e) => e.stopPropagation()} style={{
                        position: 'absolute',
                        right: '10px',
                        top: '25px',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        padding: '4px',
                        zIndex: 9999,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        border: '1px solid #e2e8f0',
                        minWidth: '100px'
                      }}>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); renameChat(c.id); onToggleMenu(null) }}
                          style={{ background: 'none', border: 'none', padding: '8px 10px', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                        >Đổi tên</button>
                        <button onClick={() => { deleteChat && deleteChat(c.id); onToggleMenu && onToggleMenu(null) }} style={{ background: 'none', border: 'none', padding: '8px 10px', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#ef4444' }}>Xóa</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : null}
        </nav>
      </div>

      {/* Account footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'left', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#1e293b' }}>{accountLabel}</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Ví tín dụng: <span style={{ color: '#0f766e', fontWeight: '700' }}>{credits} Credits</span></div>
        <a href="#home" style={{ width: '100%', padding: '10px', background: 'none', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textDecoration: 'none', display: 'inline-block', textAlign: 'center', marginTop: '8px', boxSizing: 'border-box' }}>
          Trang chủ
        </a>
        <button onClick={() => { onToggleBuyPage && onToggleBuyPage(); onTogglePasswordForm && onTogglePasswordForm(false); }} style={{ width: '100%', padding: '10px', background: showBuyPage ? '#64748b' : 'rgba(15, 118, 110, 0.08)', color: showBuyPage ? '#fff' : '#0f766e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'all 0.2s' }}>
          {showBuyPage ? 'Quay lại Workspace' : 'Mua Credits'}
        </button>
        {/* Password change UI removed */}
        {isAdmin && (
          <button onClick={onOpenAdmin} style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginTop: '8px' }}>
            Quản trị
          </button>
        )}
        <button onClick={onLogout} style={{ width: '100%', padding: '10px', background: 'none', border: '1px solid #e2e8f0', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginTop: '8px' }}>Đăng xuất</button>
      </div>
    </aside>
  )
}
