import React from 'react'

export default function ApiKeyHistoryModal({ activeLogKey, logs, revealedMap, onClose, onToggleReveal }) {
  if (!activeLogKey) return null
  const filteredLogs = (logs || []).filter(l => {
    try {
      if (l.details && typeof l.details === 'object') {
        return (l.details.setting_key || l.details.key || '').toLowerCase() === activeLogKey.toLowerCase()
      }
      if (l.details && typeof l.details === 'string') {
        const parsed = JSON.parse(l.details)
        return (parsed.setting_key || parsed.key || '').toLowerCase() === activeLogKey.toLowerCase()
      }
    } catch (e) { }
    const match = String(l.details || '').match(/"(?:setting_key|key)"\s*:\s*"([^\"]+)"/)
    return match && match[1] && match[1].toLowerCase() === activeLogKey.toLowerCase()
  })

  return (
    <div className="video-modal-overlay" style={{ zIndex: 999 }}>
      <div className="video-modal" style={{ maxWidth: '950px', width: '95%' }}>
        <div className="video-modal-header">
          <h3>Lịch sử thay đổi: <span style={{ color: 'var(--accent)' }}>{activeLogKey}</span></h3>
          <button onClick={() => onClose && onClose()}>✕</button>
        </div>

        <div style={{ padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '24px 0', fontStyle: 'italic', color: 'var(--text-soft)', textAlign: 'center' }}>Chưa ghi nhận lượt thay đổi cấu hình nào cho key này.</div>
          ) : (
            <table className="admin-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th>ID</th><th>Admin</th><th>Hành động</th><th>Thời gian</th><th>Chi tiết</th></tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => {
                  let parsed = {}
                  try { parsed = typeof l.details === 'string' ? JSON.parse(l.details || '{}') : (l.details || {}) } catch (e) { parsed = {} }
                  const oldv = parsed.old_value
                  const newv = parsed.new_value
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 6px', textAlign: 'center', color: '#64748b' }}>{l.id}</td>
                      <td style={{ padding: '12px 6px', textAlign: 'center', fontWeight: 500 }}>{l.admin_id || l.admin_user_id || 'N/A'}</td>
                      <td style={{ padding: '12px 6px', textAlign: 'center' }}><span className="user-badge" style={{ fontSize: 11, padding: '3px 6px' }}>{l.action_type}</span></td>
                      <td style={{ padding: '12px 6px', textAlign: 'center', color: '#64748b' }}>{l.created_at ? String(l.created_at).replace('T', ' ').slice(0,19) : 'N/A'}</td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 6 }}>
                          <button style={{ padding: '3px 8px', fontSize: 11, borderRadius: 4, backgroundColor: revealedMap && revealedMap[l.id] ? '#64748b' : 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={() => onToggleReveal && onToggleReveal(l.id)}>
                            {revealedMap && revealedMap[l.id] ? '🔒 Ẩn' : '👁️ Hiện'}
                          </button>
                        </div>

                        <div style={{ fontSize: 12, textAlign: 'left', background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                          <div style={{ marginBottom: 6, borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                            <strong style={{ color: '#ef4444', display: 'inline-block', width: 40 }}>Cũ:</strong>
                            <span style={{ fontFamily: 'monospace', color: '#475569' }}>{revealedMap && revealedMap[l.id] ? (oldv || 'trống') : (oldv ? '****'+String(oldv).slice(-4) : '')}</span>
                          </div>
                          <div>
                            <strong style={{ color: '#22c55e', display: 'inline-block', width: 40 }}>Mới:</strong>
                            <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 500 }}>{revealedMap && revealedMap[l.id] ? (newv || 'trống') : (newv ? '****'+String(newv).slice(-4) : '')}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
