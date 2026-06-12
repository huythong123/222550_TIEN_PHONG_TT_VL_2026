import React from 'react'

export default function RevenueFilter({ fromDate, toDate, onFromChange, onToChange, onApply, onClear, loading }) {
  return (
    <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: 24, padding: '16px 20px', flexWrap: 'wrap', background: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>📅 Từ ngày</span>
        <input type="date" value={fromDate} onChange={(e) => onFromChange && onFromChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '160px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>📅 Đến ngày</span>
        <input type="date" value={toDate} onChange={(e) => onToChange && onToChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '160px' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onApply} disabled={loading} style={{ padding: '9px 20px', backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>{loading ? 'Đang tải...' : 'Lọc kết quả'}</button>
        <button onClick={onClear} style={{ padding: '9px 20px' }}>Xóa bộ lọc</button>
      </div>
    </div>
  )
}
