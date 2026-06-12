import React from 'react'

export default function DashboardOverview({ counts, monthlyRevenue, recentUsers }) {
  return (
    <div>
      {/* 5 Thẻ Thống Kê Trên Cùng */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-title">Người dùng tháng</div>
            <div className="stat-number">{counts.users || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div>
            <div className="stat-title">Gói</div>
            <div className="stat-number">{counts.packages || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎥</div>
          <div>
            <div className="stat-title">Video đã tạo</div>
            <div className="stat-number">{counts.videos_created_total || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🗓️</div>
          <div>
            <div className="stat-title">Video tháng này</div>
            <div className="stat-number">{counts.videos_created_this_month || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div>
            <div className="stat-title">Tổng doanh thu</div>
            <div className="stat-number">{(counts.total_revenue_vnd || 0).toLocaleString()}₫</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div>
            <div className="stat-title">Doanh thu tháng</div>
            <div className="stat-number">{(monthlyRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0).toLocaleString()}₫</div>
          </div>
        </div>

      </div>

      {/* Khu vực 2 Cột lớn phía dưới */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        
        {/* Khối Người dùng mới */}
        <div className="card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ margin: 0, marginBottom: 16, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Người dùng mới</h4>

          <div className="users-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {recentUsers && recentUsers.length > 0 ? (
              recentUsers.map((u) => (
                <div key={u.id} className="user-row" style={{ padding: '12px 4px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.username || 'Chưa cập nhật'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{u.email || 'Không có email'}</span>
                  </div>
                  <span className="user-badge" style={{ fontSize: '12px', color: 'var(--text-soft)', fontWeight: 600 }}>#{u.id}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', color: 'var(--text-soft)', fontStyle: 'italic', textAlign: 'center' }}>Không có người dùng mới nào</div>
            )}
          </div>
        </div>

        {/* Khối Biểu đồ Doanh thu tháng hiện tại */}
        <div className="card dashboard-chart-card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginTop: 0, marginBottom: 20, fontSize: '1.1rem', fontWeight: 700, textAlign: 'left', color: 'var(--text-main)' }}>Doanh thu tháng</h4>

          {monthlyRevenue && monthlyRevenue.length > 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <svg viewBox="0 0 700 300" className="revenue-chart" style={{ width: '100%', height: '100%', maxHeight: '240px', background: 'transparent' }}>
                {(() => {
                  const paddingLeft = 50
                  const paddingRight = 20
                  const paddingTop = 20
                  const paddingBottom = 60
                  const w = 700 - paddingLeft - paddingRight
                  const h = 300 - paddingTop - paddingBottom

                  const maxRevenue = Math.max(...monthlyRevenue.map(r => r.amount), 0)
                  const tickSizes = [2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000]
                  const targetTicks = 4
                  const step = tickSizes.find((size) => Math.ceil(maxRevenue / size) <= targetTicks) ?? 1000000
                  const steps = Math.max(4, Math.ceil(maxRevenue / step) || 4)
                  const yMax = Math.max(step * steps, step * 4)
                  const bw = w / monthlyRevenue.length
                  const formatMoney = (value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
                    return `${value}`
                  }

                  return (
                    <g>
                      {/* Trục y */}
                      {[...Array(steps + 1)].map((_, idx) => {
                        const y = paddingTop + h - (h * idx / steps)
                        const value = step * idx
                        return (
                          <g key={`y-${idx}`}>
                            <line x1={paddingLeft} y1={y} x2={700 - paddingRight} y2={y} stroke="rgba(148, 163, 184, 0.12)" />
                            <text x={paddingLeft - 10} y={y + 4} fontSize="12" fontWeight="500" textAnchor="end" fill="var(--text-soft)">{formatMoney(value)}</text>
                          </g>
                        )
                      })}

                      {/* Trục x */}
                      <line x1={paddingLeft} y1={paddingTop + h} x2={700 - paddingRight} y2={paddingTop + h} stroke="rgba(148, 163, 184, 0.35)" strokeWidth="1.5" />

                      {/* Cột dữ liệu */}
                      {monthlyRevenue.map((r, i) => {
                        const bx = paddingLeft + i * bw
                        const currentAmount = Math.min(r.amount, yMax)
                        const bh = Math.round((currentAmount / yMax) * h)
                        const by = paddingTop + (h - bh)
                        return (
                          <g key={r.key || i}>
                            <rect x={bx + 10} y={by} width={bw - 24} height={Math.max(bh, 4)} fill="var(--accent)" rx="6" />
                            {r.amount > 0 && (
                              <text x={bx + bw / 2} y={by - 8} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--accent)">
                                {r.amount >= 1000 ? `${(r.amount / 1000).toFixed(0)}k` : r.amount}
                              </text>
                            )}
                            <text x={bx + bw / 2} y={paddingTop + h + 18} fontSize="11" fontWeight="500" textAnchor="middle" fill="var(--text-soft)">{r.label}</text>
                          </g>
                        )
                      })}
                    </g>
                  )
                })()}
              </svg>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}>Không có dữ liệu doanh thu</div>
          )}
        </div>

      </div>
    </div>
  )
}
