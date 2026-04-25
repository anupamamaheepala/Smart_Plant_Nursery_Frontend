import { useState, useEffect, useRef } from 'react'
import api from '../../api/client'

const SENSORS = [
  { key: 'air_temp',            label: 'Air Temperature', unit: '°C',  icon: '🌡', sensor: 'BME280',     color: '#f97316' },
  { key: 'air_humidity',        label: 'Humidity',        unit: '%',   icon: '💧', sensor: 'BME280',     color: '#60a5fa' },
  { key: 'air_pressure',        label: 'Pressure',        unit: 'hPa', icon: '🔵', sensor: 'BME280',     color: '#a78bfa' },
  { key: 'soil_moisture',       label: 'Soil Moisture',   unit: '%',   icon: '🌱', sensor: 'Capacitive', color: '#4ade80' },
  { key: 'light_lux',           label: 'Light Level',     unit: 'lux', icon: '☀', sensor: 'LDR',        color: '#fbbf24' },
  { key: 'water_level_percent', label: 'Water Tank',      unit: '%',   icon: '🪣', sensor: 'Water Lvl',  color: '#22d3ee' },
  { key: 'water_temp',          label: 'Water Temp',      unit: '°C',  icon: '🌊', sensor: 'DS18B20',    color: '#34d399' },
]

function healthStyle(h) {
  if (h === 'Healthy')  return { bg: '#14532d33', color: '#4ade80', border: '#166534' }
  if (h === 'Warning')  return { bg: '#78350f33', color: '#fbbf24', border: '#92400e' }
  if (h === 'Critical') return { bg: '#7f1d1d33', color: '#f87171', border: '#991b1b' }
  return { bg: '#1a2e1d', color: '#86a98a', border: '#243d28' }
}

function rootColor(r) {
  if (r === 'Dry') return '#f87171'
  if (r === 'Wet') return '#60a5fa'
  return '#4ade80'
}

export default function LiveData() {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown]     = useState(30)
  const [flash, setFlash]             = useState(false)
  const [connected, setConnected]     = useState(false)
  const [pulse, setPulse]             = useState(true)
  const activeRef = useRef(true)
  const readerRef = useRef(null)

  const onNewData = (parsed) => {
    setData(parsed)
    setLastUpdated(new Date())
    setLoading(false)
    setCountdown(30)
    setFlash(true)
    setTimeout(() => setFlash(false), 700)
  }

  // ── SSE connection (real-time push from server) ────────────────────────────
  useEffect(() => {
    activeRef.current = true
    let retryTimer = null

    const connect = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/sensor/stream', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (res.status === 401) { localStorage.clear(); window.location.href = '/'; return }
          throw new Error(`HTTP ${res.status}`)
        }
        setConnected(true)
        const reader = res.body.getReader()
        readerRef.current = reader
        const dec = new TextDecoder()
        let buf = ''
        while (activeRef.current) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const events = buf.split('\n\n')
          buf = events.pop()
          for (const ev of events) {
            for (const line of ev.split('\n')) {
              if (line.startsWith('data: ')) {
                try { onNewData(JSON.parse(line.slice(6))) } catch {}
              }
            }
          }
        }
      } catch {
        setConnected(false)
        if (activeRef.current) retryTimer = setTimeout(connect, 5000)
      }
    }

    connect()
    return () => {
      activeRef.current = false
      readerRef.current?.cancel()
      clearTimeout(retryTimer)
    }
  }, [])

  // ── Fallback poll every 30s (guarantees data matches MongoDB) ─────────────
  // This runs alongside SSE — if SSE pushes first, poll just confirms same data.
  // If SSE misses an update, poll catches it within 30s.
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await api.get('/sensor/latest')
        onNewData(res.data)
      } catch(e) { console.error(e) }
    }, 30000)
    return () => clearInterval(t)
  }, [])

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Live dot pulse ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1000)
    return () => clearInterval(t)
  }, [])

  const refresh = async () => {
    try {
      const res = await api.get('/sensor/latest')
      onNewData(res.data)
    } catch(e) { console.error(e) }
  }

  if (loading) return <div style={styles.loader}>Loading sensor data...</div>

  const health = data?.plant_health || '—'
  const hs = healthStyle(health)

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={styles.title}>Live Sensor Data</h1>
            <div style={{ ...styles.badge, borderColor: connected ? '#243d28' : '#4a1d1d' }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: connected ? '#4ade80' : '#f87171',
                opacity: pulse ? 1 : 0.3, transition: 'opacity 0.5s',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.07em', color: connected ? '#4ade80' : '#f87171' }}>
                {connected ? 'LIVE' : 'RECONNECTING'}
              </span>
            </div>
          </div>
          <p style={styles.sub}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'} · Next in {countdown}s
          </p>
        </div>
        <button onClick={refresh} style={styles.refreshBtn}>↻ Refresh</button>
      </div>

      {/* Plant Health Banner */}
      <div style={{ ...styles.healthBanner, background: hs.bg, borderColor: hs.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '28px' }}>
            {health === 'Healthy' ? '🌿' : health === 'Warning' ? '⚠️' : '🚨'}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#86a98a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plant Health Status
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: hs.color, letterSpacing: '-0.03em' }}>{health}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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
            <span style={{ fontWeight: '600', fontSize: '14px', color: rootColor(data?.Root_Water_status) }}>
              {data?.Root_Water_status || '—'}
            </span>
          </div>
          <div style={styles.miniStat}>
            <span style={{ color: '#86a98a', fontSize: '11px' }}>NODE</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#86a98a' }}>
              {data?.node_id || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div style={styles.grid}>
        {SENSORS.map(s => {
          const val = data?.[s.key]
          return (
            <div key={s.key} style={{ ...styles.sensorCard, borderColor: flash ? s.color + '88' : '#243d28' }}>
              <div style={styles.cardTop}>
                <span style={{ fontSize: '20px' }}>{s.icon}</span>
                <span style={{ ...styles.sensorTag, color: s.color, borderColor: s.color + '44', background: s.color + '11' }}>
                  {s.sensor}
                </span>
              </div>
              <div style={{ ...styles.sensorValue, color: s.color }}>
                {val !== undefined && val !== null
                  ? (typeof val === 'number' ? val.toFixed(1) : val)
                  : '—'}
                <span style={styles.unit}>{s.unit}</span>
              </div>
              <div style={styles.sensorLabel}>{s.label}</div>
              {s.unit === '%' && val !== null && val !== undefined && (
                <div style={styles.barBg}>
                  <div style={{ ...styles.barFill, width: `${Math.min(val, 100)}%`, background: s.color }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Status Row */}
      <div style={styles.statusRow}>
        {[
          { label: 'Water Status',   val: data?.water_status,                  ok: data?.water_status === 'Normal' },
          { label: 'Water Detected', val: data?.water_detected ? 'Yes' : 'No', ok: !!data?.water_detected },
          { label: 'Light Status',   val: data?.light_status,                  ok: data?.light_status === 'Medium' || data?.light_status === 'High' },
          { label: 'ESP32 Alert',    val: data?.alert,                         ok: data?.alert === 'NORMAL' },
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
  title:  { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em', margin: 0 },
  badge:  { display: 'flex', alignItems: 'center', gap: '5px', background: '#0d1f12', border: '1px solid', borderRadius: '9999px', padding: '3px 9px' },
  sub:    { fontSize: '12px', color: '#4a6b4e', marginTop: '5px', fontFamily: "'DM Mono', monospace" },
  refreshBtn: { background: '#0d1f12', border: '1px solid #243d28', borderRadius: '8px', padding: '8px 16px', color: '#4ade80', fontFamily: "'Outfit', sans-serif", fontSize: '13px', cursor: 'pointer' },
  healthBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  miniStat: { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px', marginBottom: '16px' },
  sensorCard: { background: '#161f18', border: '1px solid', borderRadius: '12px', padding: '16px', transition: 'border-color 0.5s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  sensorTag: { fontSize: '10px', fontWeight: '600', letterSpacing: '0.04em', padding: '2px 7px', borderRadius: '9999px', border: '1px solid', textTransform: 'uppercase' },
  sensorValue: { fontFamily: "'DM Mono', monospace", fontSize: '28px', fontWeight: '500', lineHeight: '1', marginBottom: '4px' },
  unit: { fontSize: '13px', marginLeft: '3px', opacity: 0.7 },
  sensorLabel: { fontSize: '11px', color: '#86a98a', fontWeight: '500' },
  barBg:   { marginTop: '10px', height: '3px', background: '#1a2e1d', borderRadius: '9999px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '9999px', transition: 'width 0.4s' },
  statusRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' },
  statusCard: { background: '#161f18', border: '1px solid #243d28', borderRadius: '12px', padding: '16px' },
  statusLabel: { fontSize: '11px', color: '#4a6b4e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
}