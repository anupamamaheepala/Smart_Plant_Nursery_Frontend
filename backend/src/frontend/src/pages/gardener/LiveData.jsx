import { useState, useEffect } from 'react'
import api from '../../api/client'

const SENSORS = [
  { key: 'temperature_C',      label: 'Air Temperature',  unit: '°C',  icon: '🌡', sensor: 'BME280',    color: '#f97316' },
  { key: 'humidity_%',         label: 'Humidity',         unit: '%',   icon: '💧', sensor: 'BME280',    color: '#60a5fa' },
  { key: 'pressure_hPa',       label: 'Pressure',         unit: 'hPa', icon: '🔵', sensor: 'BME280',    color: '#a78bfa' },
  { key: 'soil_moisture_%',    label: 'Soil Moisture',    unit: '%',   icon: '🌱', sensor: 'Capacitive', color: '#4ade80' },
  { key: 'light_level_lux',    label: 'Light Level',      unit: 'lux', icon: '☀', sensor: 'LDR',       color: '#fbbf24' },
  { key: 'water_level_%',      label: 'Water Tank',       unit: '%',   icon: '🪣', sensor: 'Water Lvl', color: '#22d3ee' },
  { key: 'water_temperature_C',label: 'Water Temp',       unit: '°C',  icon: '🌊', sensor: 'DS18B20',   color: '#34d399' },
]

function healthStyle(h) {
  if (h === 'Healthy')  return { bg: '#14532d33', color: '#4ade80', border: '#166534' }
  if (h === 'Warning')  return { bg: '#78350f33', color: '#fbbf24', border: '#92400e' }
  if (h === 'Critical') return { bg: '#7f1d1d33', color: '#f87171', border: '#991b1b' }
  return { bg: '#1a2e1d', color: '#86a98a', border: '#243d28' }
}

function rootStyle(r) {
  if (r === 'Dry')    return { color: '#f87171', bg: '#7f1d1d22' }
  if (r === 'Wet')    return { color: '#60a5fa', bg: '#1e3a5f22' }
  return { color: '#4ade80', bg: '#14532d22' }
}

export default function LiveData() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = async () => {
    try {
      const res = await api.get('/sensor/latest')
      setData(res.data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div style={styles.loader}>Loading sensor data...</div>

  const health = data?.plant_health || '—'
  const hs = healthStyle(health)
  const rs = rootStyle(data?.Root_Water_status)

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Live Sensor Data</h1>
          <p style={styles.sub}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''} · Auto-refreshes every 30s
          </p>
        </div>
        <button onClick={fetchData} style={styles.refreshBtn}>↻ Refresh</button>
      </div>

      {/* Plant Health Banner */}
      <div style={{ ...styles.healthBanner, background: hs.bg, borderColor: hs.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '28px' }}>
            {health === 'Healthy' ? '🌿' : health === 'Warning' ? '⚠️' : '🚨'}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#86a98a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plant Health Status</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: hs.color, letterSpacing: '-0.03em' }}>{health}</div>
          </div>
        </div>
        <div style={styles.bannerRight}>
          <div style={styles.miniStat}>
            <span style={{ color: '#86a98a', fontSize: '11px' }}>RISK SCORE</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '20px', fontWeight: '500', color: hs.color }}>
              {data?.risk_score?.toFixed(1) || '—'}
            </span>
          </div>
          <div style={styles.miniStat}>
            <span style={{ color: '#86a98a', fontSize: '11px' }}>RISK LEVEL</span>
            <span style={{ fontWeight: '600', fontSize: '14px', color: hs.color }}>{data?.Risk_level || '—'}</span>
          </div>
          <div style={styles.miniStat}>
            <span style={{ color: '#86a98a', fontSize: '11px' }}>ROOT STATUS</span>
            <span style={{ fontWeight: '600', fontSize: '14px', color: rs.color }}>{data?.Root_Water_status || '—'}</span>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div style={styles.grid}>
        {SENSORS.map(s => {
          const val = data?.[s.key]
          return (
            <div key={s.key} style={styles.sensorCard}>
              <div style={styles.cardTop}>
                <span style={{ fontSize: '20px' }}>{s.icon}</span>
                <span style={{ ...styles.sensorTag, color: s.color, borderColor: s.color + '44', background: s.color + '11' }}>
                  {s.sensor}
                </span>
              </div>
              <div style={{ ...styles.sensorValue, color: s.color }}>
                {val !== undefined ? (typeof val === 'number' ? val.toFixed(1) : val) : '—'}
                <span style={styles.unit}>{s.unit}</span>
              </div>
              <div style={styles.sensorLabel}>{s.label}</div>

              {/* Progress bar for % values */}
              {s.unit === '%' && val !== undefined && (
                <div style={styles.barBg}>
                  <div style={{ ...styles.barFill, width: `${Math.min(val, 100)}%`, background: s.color }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Status row */}
      <div style={styles.statusRow}>
        {[
          { label: 'Water Status',  val: data?.water_status,       ok: data?.water_status === 'Normal' },
          { label: 'Water Detected',val: data?.water_detected ? 'Yes' : 'No', ok: !!data?.water_detected },
          { label: 'Light Status',  val: data?.light_status,       ok: data?.light_status === 'Medium' },
        ].map(item => (
          <div key={item.label} style={styles.statusCard}>
            <div style={styles.statusLabel}>{item.label}</div>
            <div style={{ fontWeight: '600', fontSize: '15px', color: item.ok ? '#4ade80' : '#fbbf24' }}>
              {item.val || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  loader: { padding: '40px', color: '#86a98a', fontFamily: "'DM Mono', monospace" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:  { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em' },
  sub:    { fontSize: '12px', color: '#4a6b4e', marginTop: '3px', fontFamily: "'DM Mono', monospace" },
  refreshBtn: {
    background: '#0d1f12', border: '1px solid #243d28',
    borderRadius: '8px', padding: '8px 16px',
    color: '#4ade80', fontFamily: "'Outfit', sans-serif",
    fontSize: '13px', cursor: 'pointer',
  },
  healthBanner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    border: '1px solid', borderRadius: '14px',
    padding: '20px 24px', marginBottom: '20px',
    flexWrap: 'wrap', gap: '16px',
  },
  bannerRight: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  miniStat: { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '14px', marginBottom: '16px',
  },
  sensorCard: {
    background: '#161f18', border: '1px solid #243d28',
    borderRadius: '12px', padding: '16px',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  sensorTag: {
    fontSize: '10px', fontWeight: '600', letterSpacing: '0.04em',
    padding: '2px 7px', borderRadius: '9999px',
    border: '1px solid', textTransform: 'uppercase',
  },
  sensorValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '28px', fontWeight: '500',
    lineHeight: '1', marginBottom: '4px',
  },
  unit: { fontSize: '13px', marginLeft: '3px', opacity: 0.7 },
  sensorLabel: { fontSize: '11px', color: '#86a98a', fontWeight: '500' },
  barBg: { marginTop: '10px', height: '3px', background: '#1a2e1d', borderRadius: '9999px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '9999px', transition: 'width 0.4s' },
  statusRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' },
  statusCard: {
    background: '#161f18', border: '1px solid #243d28',
    borderRadius: '12px', padding: '16px',
  },
  statusLabel: { fontSize: '11px', color: '#4a6b4e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
}
