import React from 'react'

export default function UserTable({ users, onSelectUser }) {
  return (
    <div className="card">
      <table className="admin-table">
        <thead>
          <tr><th>ID</th><th>Tên đăng nhập</th><th>Email</th><th>Vai trò</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => onSelectUser && onSelectUser(u)}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
