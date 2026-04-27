'use client'
// Section 9 + Section 17 of the UX/UI brief — weekly history dot row.
// One filled dot per past check-in week, plus a grey dashed circle for
// the current week. Hover/title gives the week date + confidence.

import { confidenceDotColor } from './ConfidenceTapper'

export default function SparklineRow({
  history = [],          // array sorted oldest → newest, each { week_of, confidence }
  currentConfidence,     // 1-5 — live preview for the current week's dot
  width = 280,
}) {
  // Always render at least 1 slot for the current week.
  const slotCount = Math.max(history.length + 1, 1)
  const dotSize = 9
  const gap = Math.max(4, Math.floor((width - dotSize * slotCount) / Math.max(slotCount - 1, 1)))

  return (
    <div className="flex items-end gap-1" aria-label="Weekly check-in history">
      {history.map((h, i) => {
        const color = confidenceDotColor(h.confidence)
        const date = h.week_of ? new Date(h.week_of).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : ''
        return (
          <div key={i} className="flex flex-col items-center" style={{ minWidth: dotSize }}>
            <span
              className="rounded-full"
              style={{ width: dotSize, height: dotSize, background: color }}
              title={`Week of ${date}${h.confidence ? ` · conf ${h.confidence}/5` : ''}`}
            />
            <span className="text-[8.5px] text-ss-hint mt-0.5 leading-none">W{i + 1}</span>
          </div>
        )
      })}

      {/* Current week — grey dashed circle that fills with the tapper preview */}
      <div className="flex flex-col items-center" style={{ minWidth: dotSize }}>
        <span
          className="rounded-full border-2 border-dashed"
          style={{
            width: dotSize, height: dotSize,
            borderColor: currentConfidence ? confidenceDotColor(currentConfidence) : '#B7A99D',
            background: currentConfidence ? confidenceDotColor(currentConfidence) : 'transparent',
          }}
          aria-label="This week"
        />
        <span className="text-[8.5px] text-ss-text font-medium mt-0.5 leading-none">now</span>
      </div>
    </div>
  )
}
