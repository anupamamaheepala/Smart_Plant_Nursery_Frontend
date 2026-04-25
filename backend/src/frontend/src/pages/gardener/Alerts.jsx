import { useState, useEffect } from 'react'
import api from '../../api/client'

const TIME_FILTERS = [
  { label: 'Last 1 hour',   value: 1 },
  { label: 'Last 6 hours',  value: 6 },
  { label: 'Last 24 hours', value: 24 },
  { label: 'Last 7 days',   value: 168 },
  { label: 'All',           value: 0 },
]

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor(Math.abs(Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return                   `${Math.floor(diff / 86400)}d ago`
}

function timeAgoColor(ts) {
  if (!ts) return '#4a6b4e'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 120)  return '#f87171'
  if (diff < 3600) return '#fbbf24'
  return '#4a6b4e'
}

export default function Alerts() {
  const [allAlerts, setAllAlerts]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [hoursFilter, setHoursFilter] = useState(24) // default: last 24h
  const [, setTick]                   = useState(0)

  useEffect(() => {
    const fetchAlerts = () => {
      api.get('/sensor/alerts?limit=200')
        .then(r => { setAllAlerts(r.data); setLastUpdated(new Date()) })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Re-render every 30s so time-ago labels stay fresh
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // Apply time filter client-side
  const alerts = hoursFilter === 0
  ? allAlerts
  : allAlerts.filter(a => {
      if (!a.timestamp) return false
      const diff = Math.abs(Date.now() - new Date(a.timestamp).getTime()) / 3600000
      return diff <= hoursFilter
    })

  const critical = alerts.filter(a => a.plant_health === 'Critical')
  const warning  = alerts.filter(a => a.plant_health === 'Warning')

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Alerts</h1>
          <p style={styles.sub}>
            Warning and Critical events · auto-refreshes every 30s
            {lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ''}
          </p>
        </div>

        {/* Time filter */}
        <div style={styles.filterRow}>
          <span style={styles.filterLabel}>Show:</span>
          {TIME_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setHoursFilter(f.value)}
              style={{
                ...styles.filterBtn,
                ...(hoursFilter === f.value ? styles.filterActive : {}),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={styles.summaryRow}>
        <div style={{ ...styles.summaryCard, borderColor: '#991b1b', background: '#7f1d1d22' }}>
          <span style={styles.summaryNum}>{critical.length}</span>
          <span style={{ color: '#f87171', fontSize: '12px', fontWeight: '600' }}>CRITICAL</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: '#92400e', background: '#78350f22' }}>
          <span style={{ ...styles.summaryNum, color: '#fbbf24' }}>{warning.length}</span>
          <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '600' }}>WARNING</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: '#243d28', background: '#161f18' }}>
          <span style={{ ...styles.summaryNum, color: '#86a98a' }}>{alerts.length}</span>
          <span style={{ color: '#86a98a', fontSize: '12px', fontWeight: '600' }}>
            {hoursFilter === 0 ? 'TOTAL' : `IN ${hoursFilter < 24 ? hoursFilter + 'H' : hoursFilter === 24 ? '24H' : '7D'}`}
          </span>
        </div>
      </div>

      {loading && <div style={styles.loader}>Loading alerts...</div>}

      {!loading && alerts.length === 0 && (
        <div style={styles.empty}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌿</div>
          <div style={{ color: '#4ade80', fontWeight: '600' }}>All clear!</div>
          <div style={{ color: '#4a6b4e', fontSize: '13px', marginTop: '4px' }}>
            No alerts in the selected time window
          </div>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div style={styles.table}>
          <div style={styles.thead}>
            {['Time', 'Age', 'Health', 'Risk Level', 'Risk Score', 'Soil %', 'Temp °C', 'Root Status', 'ESP32 Alert'].map(h => (
              <div key={h} style={styles.th}>{h}</div>
            ))}
          </div>
          {alerts.map((a, i) => {
            const isCrit = a.plant_health === 'Critical'
            const ago    = timeAgo(a.timestamp)
            const agoCol = timeAgoColor(a.timestamp)
            return (
              <div key={i} style={{
                ...styles.trow,
                background:  isCrit ? '#7f1d1d11' : '#78350f11',
                borderColor: isCrit ? '#991b1b44' : '#92400e44',
              }}>
                {/* Timestamp */}
                <div style={{ ...styles.td, flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#86a98a' }}>
                    {fmt(a.timestamp)}
                  </span>
                </div>

                {/* Age badge */}
                <div style={styles.td}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '11px', fontWeight: '600',
                    color: agoCol,
                    background: agoCol + '18',
                    border: `1px solid ${agoCol}44`,
                    borderRadius: '9999px',
                    padding: '2px 8px',
                  }}>{ago}</span>
                </div>

                {/* Health */}
                <div style={styles.td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px',
                    fontSize: '11px', fontWeight: '700',
                    background: isCrit ? '#7f1d1d44' : '#78350f44',
                    color:      isCrit ? '#f87171'   : '#fbbf24',
                    border:     `1px solid ${isCrit ? '#991b1b' : '#92400e'}`,
                  }}>{a.plant_health}</span>
                </div>

                {/* Risk level */}
                <div style={styles.td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px',
                    fontSize: '11px', fontWeight: '600',
                    background: a.Risk_level === 'High' ? '#7f1d1d44' : '#78350f44',
                    color:      a.Risk_level === 'High' ? '#f87171'   : '#fbbf24',
                  }}>{a.Risk_level}</span>
                </div>

                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace", color: isCrit ? '#f87171' : '#fbbf24' }}>
                  {a.risk_score?.toFixed(1)}
                </div>
                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{a.soil_moisture?.toFixed(1)}</div>
                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{a.air_temp?.toFixed(1)}</div>
                <div style={styles.td}>{a.Root_Water_status}</div>
                <div style={{ ...styles.td, fontSize: '11px', fontFamily: "'DM Mono', monospace", color: a.alert === 'NORMAL' ? '#4ade80' : '#fbbf24' }}>
                  {a.alert || '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title:  { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em' },
  sub:    { fontSize: '12px', color: '#4a6b4e', marginTop: '3px' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  filterLabel: { fontSize: '11px', color: '#4a6b4e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' },
  filterBtn: {
    background: 'none', border: '1px solid #1a2e1d',
    borderRadius: '7px', padding: '6px 12px',
    color: '#86a98a', fontFamily: "'Outfit', sans-serif",
    fontSize: '12px', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterActive: {
    background: '#0d3d1a', color: '#4ade80',
    border: '1px solid #166534',
  },
  summaryRow: { display: 'flex', gap: '14px', marginBottom: '20px' },
  summaryCard: {
    flex: 1, background: '#161f18', border: '1px solid',
    borderRadius: '12px', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  summaryNum: { fontFamily: "'DM Mono', monospace", fontSize: '32px', fontWeight: '500', color: '#f87171' },
  loader: { color: '#86a98a', fontFamily: "'DM Mono', monospace", padding: '20px' },
  empty:  { textAlign: 'center', padding: '60px', background: '#161f18', border: '1px solid #243d28', borderRadius: '14px' },
  table:  { background: '#161f18', border: '1px solid #243d28', borderRadius: '14px', overflow: 'hidden' },
  thead: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 0.7fr 0.9fr 0.9fr 0.7fr 0.6fr 0.6fr 0.9fr 0.9fr',
    padding: '12px 16px', background: '#0d1410',
    borderBottom: '1px solid #243d28',
  },
  th: { fontSize: '10px', fontWeight: '700', color: '#4a6b4e', textTransform: 'uppercase', letterSpacing: '0.06em' },
  trow: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 0.7fr 0.9fr 0.9fr 0.7fr 0.6fr 0.6fr 0.9fr 0.9fr',
    padding: '11px 16px', borderBottom: '1px solid',
    transition: 'background 0.1s',
  },
  td: { fontSize: '13px', color: '#e8f5e9', display: 'flex', alignItems: 'center' },
}