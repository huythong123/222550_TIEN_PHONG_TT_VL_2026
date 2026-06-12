import React from 'react'

export default function PackageForm({ form, onChange, onSave, onCancel, isEditing }) {
  return (
    <div className="card package-form-card">
      <h4>{isEditing ? 'Sửa gói' : 'Tạo gói mới'}</h4>
      <div className="package-form-fields">
        <label className="package-form-row">
          <span>Tên gói</span>
          <input
            className="package-form-input"
            placeholder="Nhập tên gói"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </label>
        <label className="package-form-row">
          <span>Số credit</span>
          <input
            className="package-form-input"
            placeholder="Nhập số lượng credits"
            type="number"
            value={form.credits || ''}
            onChange={(e) => onChange({ ...form, credits: Number(e.target.value) })}
          />
        </label>
        <label className="package-form-row">
          <span>Giá tiền (VND)</span>
          <input
            className="package-form-input"
            placeholder="Nhập giá tiền VND"
            type="number"
            value={form.price_vnd || ''}
            onChange={(e) => onChange({ ...form, price_vnd: Number(e.target.value) })}
          />
        </label>

        <div className="package-form-actions">
          <button className="primary" onClick={onSave}>{isEditing ? 'Lưu thay đổi' : 'Tạo gói'}</button>
          {isEditing && <button className="secondary" onClick={onCancel}>Hủy</button>}
        </div>
      </div>
    </div>
  )
}
