import React from 'react'

export default function ApiKeyCard({ keyObj, edited, onEdit, onToggleShow, onOpenHistory, onSave }) {
  const key = keyObj.key
  const value = edited.value !== undefined ? edited.value : (keyObj.value || '')
  const currentDescription = edited.description !== undefined ? edited.description : (keyObj.description || '')

  return (
    <div className="card" style={{ padding: 20, borderRadius: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>🔑 {key}</h4>
            <div style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>● Đang hoạt động</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => onOpenHistory && onOpenHistory(key)} style={{ fontSize: 13, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>🕒 Lịch sử</button>
            <button className="btn" onClick={() => onEdit && onEdit(key, 'show', !(edited.show))} style={{ fontSize: 13, padding: '4px 10px' }}>{edited.show ? 'Ẩn Key' : 'Hiện Key'}</button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#475569', fontSize: 13 }}>API Key / Khóa kết nối</label>
          <input value={value} type={edited.show ? 'text' : 'password'} onChange={(e) => onEdit && onEdit(key, 'value', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#475569', fontSize: 13 }}>Mô tả chức năng của key</label>
          <textarea rows={4} value={currentDescription} onChange={(e) => onEdit && onEdit(key, 'description', e.target.value)} style={{ width: '100%', resize: 'vertical', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.4, color: '#334155' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
        <button className="btn" onClick={() => { navigator.clipboard.writeText(value); alert('Đã sao chép khóa cấu hình!'); }} style={{ padding: '6px 12px', fontSize: 13 }}>📋 Copy Key</button>
        <button style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6 }} onClick={() => onSave && onSave(key)}>💾 Lưu thay đổi</button>
      </div>
    </div>
  )
}
