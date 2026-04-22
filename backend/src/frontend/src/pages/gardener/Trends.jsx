import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../../api/client'

const TIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#161f18', border: '1px solid #243d28', borderRadius: '8px', padding: '10px 14px' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#86a98a', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

function timeFmt(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function Trends() {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sensor/today')
      .then(r => setData(r.data.map(d => ({ ...d, time: timeFmt(d.timestamp) }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.loader}>Loading trends...</div>

  const charts = [
    {
      title: 'Soil Moisture & Water Level',
      sub: 'Capacitive Sensor + Water Level Sensor (last 24h)',
      lines: [
        { key: 'soil_moisture_%', name: 'Soil Moisture %', color: '#4ade80' },
        { key: 'water_level_%',   name: 'Water Level %',   color: '#22d3ee' },
      ]
    },
    {
      title: 'Temperature',
      sub: 'BME280 Air Temp + DS18B20 Water Temp (last 24h)',
      lines: [
        { key: 'temperature_C',       name: 'Air Temp °C',   color: '#f97316' },
        { key: 'water_temperature_C', name: 'Water Temp °C', color: '#34d399' },
      ]
    },
    {
      title: 'Humidity & Light',
      sub: 'BME280 Humidity + LDR Light (last 24h)',
      lines: [
        { key: 'humidity_%',     name: 'Humidity %', color: '#60a5fa' },
      ]
    },
    {
      title: 'Light Level (lux)',
      sub: 'LDR Sensor (last 24h)',
      lines: [
        { key: 'light_level_lux', name: 'Light lux', color: '#fbbf24' },
      ]
    },
  ]

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Trends</h1>
        <p style={styles.sub}>Last 24 hours of sensor data · {data.length} readings</p>
      </div>

      <div style={styles.grid}>
        {charts.map(chart => (
          <div key={chart.title} style={styles.card}>
            <div style={styles.cardTitle}>{chart.title}</div>
            <div style={styles.cardSub}>{chart.sub}</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1d" />
                <XAxis dataKey="time" tick={{ fill: '#4a6b4e', fontSize: 10, fontFamily: "'DM Mono'" }}
                  interval={Math.floor(data.length / 8)} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#4a6b4e', fontSize: 10, fontFamily: "'DM Mono'" }}
                  tickLine={false} axisLine={false} />
                <Tooltip content={<TIP />} />
                {chart.lines.map(l => (
                  <Line key={l.key} type="monotone" dataKey={l.key} name={l.name}
                    stroke={l.color} strokeWidth={2} dot={false}
                    activeDot={{ r: 4, fill: l.color }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={styles.legend}>
              {chart.lines.map(l => (
                <div key={l.key} style={styles.legendItem}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color }} />
                  <span style={{ fontSize: '11px', color: '#86a98a' }}>{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  loader: { color: '#86a98a', fontFamily: "'DM Mono', monospace", padding: '20px' },
  header: { marginBottom: '20px' },
  title:  { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em' },
  sub:    { fontSize: '12px', color: '#4a6b4e', marginTop: '3px', fontFamily: "'DM Mono', monospace" },
  grid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' },
  card: {
    background: '#161f18', border: '1px solid #243d28',
    borderRadius: '14px', padding: '20px',
  },
  cardTitle: { fontWeight: '600', fontSize: '15px', color: '#e8f5e9', marginBottom: '3px' },
  cardSub:   { fontSize: '11px', color: '#4a6b4e', marginBottom: '16px', fontFamily: "'DM Mono', monospace" },
  legend: { display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
}
