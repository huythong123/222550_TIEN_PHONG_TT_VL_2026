import React from 'react'

export default function RevenueSummary({ summary, monthRevenue }) {
  return (
    // Grid này sẽ tự động căn 3 khối nằm ngang
    <div className="stat-grid">
      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>💰</div>
        <div>
          <div className="stat-title">Doanh thu thu về</div>
          <div className="stat-number">{(summary.total_vnd || 0).toLocaleString()}₫</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>🧾</div>
        <div>
          <div className="stat-title">Tổng số lượt mua gói</div>
          <div className="stat-number">{summary.count} Giao dịch</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>📅</div>
        <div>
          <div className="stat-title">Doanh thu tháng này</div>
          <div className="stat-number">{(monthRevenue || 0).toLocaleString()}₫</div>
        </div>
      </div>
    </div>
  )
}