import { useState, useEffect } from 'react'
import api from '../../api/client'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

export default function Alerts() {
  const [alerts, setAlerts]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const fetch = () => {
      api.get('/sensor/alerts?limit=100')
        .then(r => {
          setAlerts(r.data)
          setLastUpdated(new Date())
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [])

  const critical = alerts.filter(a => a.plant_health === 'Critical')
  const warning  = alerts.filter(a => a.plant_health === 'Warning')

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Alerts</h1>
          <p style={styles.sub}>
            Warning and Critical events · auto-refreshes every 30s
            {lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ''}
          </p>
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
          <span style={{ color: '#86a98a', fontSize: '12px', fontWeight: '600' }}>TOTAL</span>
        </div>
      </div>

      {loading && <div style={styles.loader}>Loading alerts...</div>}

      {!loading && alerts.length === 0 && (
        <div style={styles.empty}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌿</div>
          <div style={{ color: '#4ade80', fontWeight: '600' }}>All clear!</div>
          <div style={{ color: '#4a6b4e', fontSize: '13px', marginTop: '4px' }}>No alerts found</div>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div style={styles.table}>
          <div style={styles.thead}>
            {['Time', 'Health', 'Risk', 'Score', 'Soil %', 'Temp °C', 'Root Status', 'Light'].map(h => (
              <div key={h} style={styles.th}>{h}</div>
            ))}
          </div>
          {alerts.map((a, i) => {
            const isCrit = a.plant_health === 'Critical'
            return (
              <div key={i} style={{
                ...styles.trow,
                background: isCrit ? '#7f1d1d11' : '#78350f11',
                borderColor: isCrit ? '#991b1b44' : '#92400e44',
              }}>
                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#86a98a' }}>
                  {fmt(a.timestamp)}
                </div>
                <div style={styles.td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700',
                    background: isCrit ? '#7f1d1d44' : '#78350f44',
                    color:      isCrit ? '#f87171'   : '#fbbf24',
                    border:     `1px solid ${isCrit ? '#991b1b' : '#92400e'}`,
                  }}>{a.plant_health}</span>
                </div>
                <div style={styles.td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
                    background: a.Risk_level === 'High' ? '#7f1d1d44' : '#78350f44',
                    color:      a.Risk_level === 'High' ? '#f87171'   : '#fbbf24',
                  }}>{a.Risk_level}</span>
                </div>
                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace", color: isCrit ? '#f87171' : '#fbbf24' }}>
                  {a.risk_score?.toFixed(1)}
                </div>
                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{a['soil_moisture_%']?.toFixed(1)}</div>
                <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{a.temperature_C?.toFixed(1)}</div>
                <div style={styles.td}>{a.Root_Water_status}</div>
                <div style={styles.td}>{a.light_status}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { marginBottom: '20px' },
  title:  { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em' },
  sub:    { fontSize: '12px', color: '#4a6b4e', marginTop: '3px' },
  summaryRow: { display: 'flex', gap: '14px', marginBottom: '20px' },
  summaryCard: {
    flex: 1, background: '#161f18', border: '1px solid',
    borderRadius: '12px', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  summaryNum: { fontFamily: "'DM Mono', monospace", fontSize: '32px', fontWeight: '500', color: '#f87171' },
  loader: { color: '#86a98a', fontFamily: "'DM Mono', monospace", padding: '20px' },
  empty: {
    textAlign: 'center', padding: '60px',
    background: '#161f18', border: '1px solid #243d28', borderRadius: '14px',
  },
  table: {
    background: '#161f18', border: '1px solid #243d28',
    borderRadius: '14px', overflow: 'hidden',
  },
  thead: {
    display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 0.8fr',
    padding: '12px 16px', background: '#0d1410',
    borderBottom: '1px solid #243d28',
  },
  th: { fontSize: '10px', fontWeight: '700', color: '#4a6b4e', textTransform: 'uppercase', letterSpacing: '0.06em' },
  trow: {
    display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 0.8fr',
    padding: '11px 16px', borderBottom: '1px solid',
    transition: 'background 0.1s',
  },
  td: { fontSize: '13px', color: '#e8f5e9', display: 'flex', alignItems: 'center' },
}
