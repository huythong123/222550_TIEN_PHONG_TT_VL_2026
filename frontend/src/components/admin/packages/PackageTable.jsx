import React from 'react'

export default function PackageTable({ packages, onEdit, onRemove }) {
  return (
    <div className="card package-table-card">
      <div className="table-card-header">
        <h4>Danh sách gói</h4>
      </div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Tên gói</th><th>Credits</th><th>Giá (VND)</th><th>Hành động</th></tr>
          </thead>
          <tbody>
            {(packages || []).map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td className="package-name-cell">{p.name}</td>
                <td>{p.credits}</td>
                <td>{Math.round((p.price_cents || 0) / 100).toLocaleString()}₫</td>
                <td>
                  <div className="package-action-buttons">
                    <button onClick={() => onEdit && onEdit(p)}>Sửa</button>
                    <button className="danger" onClick={() => onRemove && onRemove(p.id)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
