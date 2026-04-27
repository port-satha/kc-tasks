'use client'
import { useState } from 'react'
import { useSupabase, useUser } from '../lib/hooks'
import { updateKpiCurrentValue } from '../lib/okr'

export default function KpiUpdateModal({ kpi, onClose, onSaved }) {
  const supabase = useSupabase()
  const { user } = useUser()
  const [value, setValue] = useState(kpi?.current_value ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const doSave = async () => {
    setSaving(true)
    try {
      const updated = await updateKpiCurrentValue(supabase, kpi.id, { value, note, userId: user?.id })
      onSaved?.(updated)
      onClose()
    } catch (err) { alert('Failed: ' + err.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-[#DFDDD9] rounded-xl shadow-xl w-full max-w-sm my-8">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
          <p className="text-[10px] uppercase tracking-wider text-[#9B8C82]">Update KPI</p>
          <p className="text-[13px] font-medium text-[#2C2C2A] truncate">{kpi.name}</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">
              Current value
              {kpi.target_value != null && <span className="normal-case text-[#B7A99D] ml-1">
                · Target {kpi.target_value}{kpi.target_unit ? ` ${kpi.target_unit}` : ''}
              </span>}
            </label>
            <div className="relative">
              <input type="number" step="any" autoFocus value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full text-[14px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
              {kpi.target_unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9B8C82]">{kpi.target_unit}</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">
              Note <span className="normal-case text-[#B7A99D]">(optional)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full text-[12px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
          </div>
          {kpi.last_updated_at && (
            <p className="text-[10px] text-[#B7A99D]">
              Last updated {new Date(kpi.last_updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)] flex justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="text-[12px] px-4 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#9B8C82] rounded-md hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={doSave} disabled={saving}
            className="text-[12px] px-4 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
