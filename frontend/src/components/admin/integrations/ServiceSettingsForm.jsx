import React, { useState, useEffect } from 'react'
import { setSetting } from '../../../api'

export default function ServiceSettingsForm({ settings, onUpdated, title, fields }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const init = {}
    fields.forEach(f => {
      const s = settings.find(x => x.key === f.key)
      init[f.key] = s ? s.value : ''
    })
    setForm(init)
  }, [settings, fields])

  function onChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    try {
      for (const f of fields) {
        const val = form[f.key] || ''
        await setSetting({ key: f.key, value: val })
      }
      if (onUpdated) await onUpdated()
      setMsg('Đã lưu thành công.')
    } catch (e) {
      setMsg('Lỗi: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  const rowStyle = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }
  const labelStyle = { minWidth: 150, fontWeight: 600, fontSize: 14 }
  const inputStyle = { flex: 1, minWidth: 280, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }

  return (
    <div>
      {fields.map(f => (
        <div key={f.key} style={rowStyle}>
          <div style={labelStyle}>{f.label}</div>
          <input
            style={inputStyle}
            type={f.type || 'text'}
            value={form[f.key] || ''}
            onChange={e => onChange(f.key, e.target.value)}
            placeholder={f.placeholder || ''}
          />
        </div>
      ))}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        {msg && <span style={{ color: msg.includes('thành công') ? 'green' : 'red', fontWeight: 500 }}>{msg}</span>}
      </div>
    </div>
  )
}
