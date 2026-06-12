import React from 'react'

export default function RunHistoryTable({ runVideos = [], onPreviewEvent, onDownloadEvent }) {
  if (!runVideos || runVideos.length === 0) return <p>Không có video.</p>
  return (
    <table className="admin-table">
      <thead>
        <tr><th>STT</th><th>Bước</th><th>Tiêu đề</th><th>Thời gian</th><th>Hành động</th></tr>
      </thead>
      <tbody>
        {runVideos.map((vv, idx) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td>{vv.step}</td>
            <td>{vv.title}</td>
            <td>{vv.timestamp}</td>
            <td>
              <button onClick={() => onPreviewEvent && onPreviewEvent(vv)}>Preview</button>
              <button style={{ marginLeft: 8 }} onClick={() => onDownloadEvent && onDownloadEvent(vv)}>Tải xuống</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
