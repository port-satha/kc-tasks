'use client'

const CONF_COLOR = {
  1: '#A32D2D', 2: '#A32D2D',
  3: '#BA7517',
  4: '#639922', 5: '#639922',
}
const LINE_COLOR = '#B7A99D'
const TARGET_COLOR = 'rgba(0,0,0,0.15)'

export default function KrSparkline({ checkIns = [], kr, width = 80, height = 20 }) {
  if (kr?.kr_type === 'binary') return null
  const pts = (checkIns || []).filter(ci => !ci.is_skipped && ci.value != null)
  if (pts.length < 2) return null

  const start = Number(kr?.start_value) || 0
  const target = Number(kr?.target_value)
  const values = pts.map(p => Number(p.value))

  let yMin, yMax
  if (Number.isFinite(target) && target !== start) {
    yMin = Math.min(start, target, ...values)
    yMax = Math.max(start, target, ...values)
  } else {
    yMin = Math.min(...values)
    yMax = Math.max(...values)
    if (yMin === yMax) { yMin -= 1; yMax += 1 }
  }

  const pad = 3
  const usableW = width - pad * 2
  const usableH = height - pad * 2
  const span = yMax - yMin || 1
  const xFor = (i) => pad + (i / (pts.length - 1)) * usableW
  const yFor = (v) => pad + (1 - (Number(v) - yMin) / span) * usableH

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`)
    .join(' ')

  const targetY = Number.isFinite(target) ? yFor(target) : null
  const showTargetLine = targetY !== null && targetY >= pad && targetY <= height - pad

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="flex-shrink-0 block"
      role="img"
      aria-label={`${pts.length}-week progress trajectory`}
    >
      {showTargetLine && (
        <line
          x1={pad} x2={width - pad}
          y1={targetY} y2={targetY}
          stroke={TARGET_COLOR}
          strokeDasharray="2 2"
          strokeWidth="1"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => {
        const color = CONF_COLOR[p.confidence] || '#9B8C82'
        const date = p.week_of
          ? new Date(p.week_of).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
          : ''
        const unit = kr?.unit ? ` ${kr.unit}` : ''
        const confTxt = p.confidence ? ` · conf ${p.confidence}/5` : ''
        return (
          <circle key={i} cx={xFor(i)} cy={yFor(p.value)} r="2" fill={color}>
            <title>{date}: {p.value}{unit}{confTxt}</title>
          </circle>
        )
      })}
    </svg>
  )
}
