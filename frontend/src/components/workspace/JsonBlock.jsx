import React from 'react'

const API_BASE_RAW = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'
// Derive origin by removing any trailing slash and the API version segment (e.g. /api/v1)
const API_ORIGIN = String(API_BASE_RAW).replace(/\/$/, '').replace(/\/api\/v[0-9]+$/, '')

function resolveVideoUrl(raw) {
  if (!raw) return null
  try {
    let s = String(raw).replace(/\\\\/g, '/').trim()
    const markers = ['storage/renders', 'storage/raw_clips']
    for (const marker of markers) {
      const idx = s.indexOf(marker)
      if (idx !== -1) {
        const rel = s.substring(idx + marker.length)
        if (marker === 'storage/renders') return API_ORIGIN + '/renders' + (rel.startsWith('/') ? rel : '/' + rel)
        if (marker === 'storage/raw_clips') return API_ORIGIN + '/storage/raw_clips' + (rel.startsWith('/') ? rel : '/' + rel)
      }
    }
    if (s.startsWith('/renders/')) return API_ORIGIN + s
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    if (s.startsWith('/')) return API_ORIGIN + s
    return API_ORIGIN + '/' + s
  } catch (e) {
    return String(raw)
  }
}

export default function JsonBlock({ value, playerKey, currentStep, targetDuration }) {
  if (!value) {
    return <p className="placeholder" style={{ color: '#94a3b8', fontStyle: 'italic', padding: '12px', margin: 0 }}>Chưa có kết quả.</p>
  }

  if (value.title && value.main_text) {
    return (
      <div className="result-article" style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: '700' }}>{value.title}</h4>
        {value.source_url ? (
          <p style={{ margin: 0 }}><a href={value.source_url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--accent, #0f766e)', fontWeight: '500' }}>{value.source_url}</a></p>
        ) : null}
        <div style={{ whiteSpace: 'pre-wrap', marginTop: '12px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>{value.main_text}</div>
      </div>
    )
  }

  if (value.hook && value.body && value.call_to_action) {
    const displayDur = (value && value.target_duration) ? value.target_duration : targetDuration
    return (
      <div className="result-script" style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', marginTop: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: '700' }}>Kịch bản tổng thể</h4>
        {currentStep === 2 && displayDur ? (
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Kịch bản cho video {displayDur}s</div>
        ) : null}
        <div style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Hook:</strong> <em style={{ color: '#475569' }}>{value.hook}</em></div>
        <div style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Nội dung:</strong> <div style={{ whiteSpace: 'pre-wrap', color: '#334155', marginTop: '4px', lineHeight: '1.5' }}>{value.body}</div></div>
        <div style={{ marginBottom: 0, fontSize: '13px' }}><strong>Call to action:</strong> <span style={{ color: 'var(--accent, #0f766e)', fontWeight: '600' }}>{value.call_to_action}</span></div>
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <div className="result-scenes" style={{ textAlign: 'left', marginTop: '12px' }}>
        <h4 style={{ marginBottom: '16px', color: '#1e293b', fontWeight: '700' }}>Danh sách phân cảnh ({value.length})</h4>
        <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {value.map((s) => (
            <li key={s.scene_number} style={{ paddingBottom: '16px', borderBottom: '1px dashed #e2e8f0' }}>
              <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px', fontSize: '14px' }}>Cảnh {s.scene_number} — {s.duration} giây</div>
              {s.visual_description ? <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: '13px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', lineHeight: '1.5' }}>{s.visual_description}</div> : null}
              {s.voiceover ? <div style={{ color: '#475569', fontSize: '13px', marginTop: '8px', paddingLeft: '4px', lineHeight: '1.4' }}>🎙️ <b>Voiceover:</b> {s.voiceover}</div> : null}
              {s.audio_path ? (
                <div style={{ marginTop: '10px' }}>
                  <audio controls style={{ width: '100%', height: '36px' }}>
                    <source src={resolveVideoUrl(String(s.audio_path).replace(/\\/g, '/'))} />
                  </audio>
                </div>
              ) : null}
              {s.video_path ? (
                <div style={{ marginTop: '12px' }}>
                  <video key={s.video_path} controls style={{ width: '100%', maxWidth: '480px', borderRadius: 12, display: 'block', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <source src={resolveVideoUrl(String(s.video_path).replace(/\\/g, '/'))} type="video/mp4" />
                  </video>
                </div>
              ) : null}
              {s.technical_prompt ? <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', wordBreak: 'break-all', fontFamily: 'monospace' }}><b>Technical prompt:</b> {s.technical_prompt}</div> : null}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (value && typeof value === 'object' && value.video_url) {
    const src = resolveVideoUrl(String(value.video_url).replace(/\\/g, '/'))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginTop: '12px' }}>
        <video key={playerKey || src} controls style={{ width: '100%', maxWidth: '640px', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
          <source src={src} type="video/mp4" />
        </video>
        <div style={{ fontSize: '13.5px', fontWeight: '500' }}>
          🎬 Thành phẩm: <a href={src} target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #0f766e)', fontWeight: '700', textDecoration: 'underline' }}>Mở tệp video ở tab mới</a>
        </div>
        <pre className="json-block" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    )
  }

  return <pre className="json-block" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', border: '1px solid #e2e8f0', textAlign: 'left', marginTop: '12px', fontFamily: 'monospace' }}>{JSON.stringify(value, null, 2)}</pre>
}
