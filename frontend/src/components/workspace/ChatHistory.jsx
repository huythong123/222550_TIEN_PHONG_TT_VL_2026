import React from 'react'

export default function ChatHistory({ selectedChatId, chats, currentStep, onLoadItem, onDeleteItem }) {
  return (
    <div style={{ marginTop: '40px', textAlign: 'left' }}>
      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>Lịch sử đoạn chat hiện tại</h3>
      {selectedChatId && (() => {
        const chat = chats.find((c) => c.id === selectedChatId)
        if (!chat) return null
        const visible = (chat.items || []).filter((it) => it.step === currentStep)
        if (!visible.length) return <p className="placeholder" style={{ fontSize: '13px', color: '#94a3b8', padding: '12px', margin: 0 }}>Chưa ghi nhận bản lưu lịch sử nào cho bước này.</p>
        return (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visible.map((it) => (
              <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                <button
                  onClick={() => onLoadItem(it)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    color: '#334155',
                    textAlign: 'left',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}
                >
                  📄 Bản lưu: {new Date(it.created_at).toLocaleString()} (Xử lý bước {it.step})
                </button>
                <button onClick={() => onDeleteItem(chat.id, it.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>✕</button>
              </li>
            ))}
          </ul>
        )
      })()}
    </div>
  )
}
