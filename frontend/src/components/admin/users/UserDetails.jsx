import React from 'react'

export default function UserDetails({
  selectedUser,
  userDetails,
  userVideos,
  userRuns,
  activities,
  creditsInput,
  deltaInput,
  onCreditsInputChange,
  onDeltaInputChange,
  onSetCredits,
  onAdjustCredits,
  onPreviewVideo,
  onPreviewRun,
  onDownloadVideo,
  onDownloadRun,
  onRefundRun,
  onDeleteRun,
  onBan,
  onUnban,
  onResetPassword,
  onLoadRunVideos,
}) {
  if (!selectedUser) return <div><em>Nhấn vào người dùng để xem các runs</em></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4>Lịch sử chạy của {selectedUser.username} (#{selectedUser.id})</h4>
        <div>
          <button style={{ marginLeft: 8 }} onClick={() => onBan && onBan()}>Khóa</button>
          <button style={{ marginLeft: 8 }} onClick={() => onUnban && onUnban()}>Mở khóa</button>
          <button style={{ marginLeft: 8 }} onClick={() => onResetPassword && onResetPassword()}>Đặt lại mật khẩu</button>
        </div>
      </div>

      {userDetails ? (
        <div style={{ marginBottom: 12, padding: 8, background: '#fafafa', borderRadius: 6 }}>
          <div><strong>Credits:</strong> {userDetails.credits}</div>
          <div><strong>Tổng video:</strong> {userDetails.total_videos}</div>
          <div><strong>Credits đã mua:</strong> {userDetails.credits_bought}</div>
          <div><strong>Credits đã dùng:</strong> {userDetails.credits_used}</div>
          <div><strong>Đăng nhập gần nhất:</strong> {userDetails.last_login || 'N/A'}</div>
        </div>
      ) : null}

      <div style={{ marginBottom: 12, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
        <h5>Quản lý Credits</h5>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Đặt credits (tổng)" value={creditsInput} onChange={(e) => onCreditsInputChange && onCreditsInputChange(e.target.value)} />
          <button onClick={() => onSetCredits && onSetCredits()}>Đặt</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input placeholder="Hiệu số (ví dụ: 30 hoặc -20)" value={deltaInput} onChange={(e) => onDeltaInputChange && onDeltaInputChange(e.target.value)} />
          <button onClick={() => onAdjustCredits && onAdjustCredits()}>Điều chỉnh</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Lịch sử video</h4>
        {userVideos && userVideos.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Tiêu đề</th><th>Trạng thái</th><th>Hành động</th></tr>
            </thead>
            <tbody>
              {userVideos.map(v => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td style={{ cursor: 'pointer' }} onClick={() => onPreviewVideo && onPreviewVideo(v)}>{v.title}</td>
                  <td>{v.status}</td>
                  <td>
                    <button onClick={() => onPreviewVideo && onPreviewVideo(v)}>Preview</button>
                    <button style={{ marginLeft: 8 }} onClick={() => onDownloadVideo && onDownloadVideo(v)}>Tải xuống</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 12, color: '#666' }}>Không có video.</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Hoạt động gần đây</h4>
        {activities && activities.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Hành động</th><th>Chi tiết</th><th>IP</th><th>Thời gian</th></tr>
            </thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id}><td>{a.id}</td><td>{a.action}</td><td style={{ whiteSpace: 'pre-wrap' }}>{a.detail}</td><td>{a.ip_address}</td><td>{a.created_at}</td></tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <h4>Lịch sử hiển thị các Runs</h4>
          {userRuns && userRuns.length > 0 ? (
            <table className="admin-table">
              <thead><tr><th>Run ID</th><th>Ngày</th><th>Số sự kiện</th><th>Hành động</th></tr></thead>
              <tbody>
                {userRuns.map(r => (
                  <tr key={r.run_id}>
                    <td>{r.run_id}</td><td>{r.date}</td><td>{r.event_count}</td>
                    <td>
                      <div className="run-actions">
                        <button onClick={() => onPreviewRun && onPreviewRun(r)} disabled={!r.has_video}>{r.has_video ? 'Xem video' : 'Không có video'}</button>
                        <button style={{ marginLeft: 8 }} onClick={() => onDownloadRun && onDownloadRun(r)}>Tải xuống</button>
                        <button style={{ marginLeft: 8 }} onClick={() => onRefundRun && onRefundRun(r)} disabled={r.refunded}>{r.refunded ? 'Đã hoàn tiền' : 'Hoàn tiền'}</button>
                        <button style={{ marginLeft: 8 }} onClick={() => onDeleteRun && onDeleteRun(r)}>Xóa</button>
                        <button style={{ marginLeft: 8 }} onClick={() => onLoadRunVideos && onLoadRunVideos(r)}>Chi tiết</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 12, color: '#666' }}>Không có video.</div>
          )}
        </div>
      </div>
    </div>
  )
}
