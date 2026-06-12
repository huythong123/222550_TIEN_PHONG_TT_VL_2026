import React from 'react'

export default function RevenueTable({ byDay, selectedDateDetails, onSelectDate }) {
  if (!byDay || byDay.length === 0) return <div style={{ padding: '30px 10px', color: 'var(--text-soft)', fontStyle: 'italic' }}>Chưa có dữ liệu. Vui lòng bấm "Lọc kết quả".</div>
  return (
    <div className="card" style={{ flex: 1, minWidth: '350px', overflowX: 'auto', background: '#fff' }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, textAlign: 'left' }}>Thống kê theo ngày (Chọn ngày để xem chi tiết)</h4>
      <table className="admin-table">
        <thead>
          <tr><th>Ngày nhận tiền</th><th style={{ textAlign: 'center' }}>Số lượt mua</th><th style={{ textAlign: 'right' }}>Doanh thu</th><th></th></tr>
        </thead>
        <tbody>
          {byDay.map(r => (
            <tr key={r.date} style={{ cursor: 'pointer', backgroundColor: selectedDateDetails === r.date ? 'var(--accent-soft)' : 'transparent' }} onClick={() => onSelectDate && onSelectDate(r.date)}>
              <td style={{ fontWeight: 500 }}>{r.date}</td>
              <td style={{ textAlign: 'center' }}>{r.count}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.amount.toLocaleString()}₫</td>
              <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600, fontSize: '12px' }}>{selectedDateDetails === r.date ? 'Đang xem' : 'Xem ➔'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
