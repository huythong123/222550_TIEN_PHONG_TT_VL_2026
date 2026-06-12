import React from 'react'

export default function AdminSidebar({ tab, setTab }) {
  const items = [
    { key: 'Dashboard', label: 'Bảng điều khiển', icon: '📊' },
    { key: 'Users', label: 'Người dùng', icon: '👥' },
    { key: 'Packages', label: 'Gói', icon: '📦' },
    { key: 'Revenue', label: 'Báo cáo doanh thu', icon: '💰' },
    { key: 'Integrations', label: 'Quản lý API Keys', icon: '🔑' },
  ]

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-title">AUTO ADS DASHBOARD</div>
      {items.map((it) => (
        <div
          key={it.key}
          className={`admin-menu-item ${tab === it.key ? 'active' : ''}`}
          onClick={() => setTab(it.key)}
        >
          <span className="admin-menu-icon">{it.icon}</span>
          <span className="admin-menu-label">{it.label}</span>
        </div>
      ))}
    </aside>
  )
}
