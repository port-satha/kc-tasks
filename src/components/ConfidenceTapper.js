'use client'
// Section 9 + Section 17 of the UX/UI brief — confidence tapper.
// Five tappable boxes with labels (1=off track … 5=nailed it). Selected
// state uses the exact colors listed in Section 9.

const STATES = [
  { n: 1, label: 'off track',  selBg: '#FCEBEB', selFg: '#A32D2D', dot: '#A32D2D' },
  { n: 2, label: 'at risk',    selBg: '#FDE8D0', selFg: '#BA7517', dot: '#A32D2D' },
  { n: 3, label: 'on track',   selBg: '#FEF3D0', selFg: '#BA7517', dot: '#BA7517' },
  { n: 4, label: 'confident',  selBg: '#D4EDBE', selFg: '#3B6D11', dot: '#639922' },
  { n: 5, label: 'nailed it',  selBg: '#C0E8A8', selFg: '#2D5016', dot: '#2D5016' },
]

// Returns the dot color matching a confidence integer 1-5 (used by SparklineRow).
export function confidenceDotColor(n) {
  if (n == null) return '#B7A99D'
  if (n <= 2) return '#A32D2D'
  if (n === 3) return '#BA7517'
  return '#639922'
}

export default function ConfidenceTapper({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Confidence" className="grid grid-cols-5 gap-1.5">
      {STATES.map(s => {
        const active = value === s.n
        return (
          <button
            key={s.n}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(s.n)}
            style={active ? { background: s.selBg, color: s.selFg, borderColor: s.selFg } : undefined}
            className={`text-center py-2 px-1 rounded-md border transition-colors ${
              active
                ? 'font-medium'
                : 'border-ss-divider bg-ss-card text-ss-muted-text hover:bg-ss-hover'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="text-[16px] font-medium leading-none block">{s.n}</span>
            <span className="text-[9px] uppercase tracking-wider mt-1 block">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}
