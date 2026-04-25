import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const PERIODS = ['today','week','month','Q1','Q2','Q3','Q4']

const TIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#161f18', border: '1px solid #243d28', borderRadius: '8px', padding: '10px 14px' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#86a98a', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: p.color || '#e8f5e9' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

const HEALTH_COLORS = { Healthy: '#4ade80', Warning: '#fbbf24', Critical: '#f87171' }
const RISK_COLORS   = { Low: '#4ade80', Medium: '#fbbf24', High: '#f87171' }
const MEMBER_COLORS = { Himansa: '#4ade80', Anupama: '#60a5fa', Sadith: '#fbbf24', Rashini: '#f97316' }

// ── AI Insights sub-component ─────────────────────────────────────────────────
function AIInsightsSection({ data }) {
  if (!data) return null

  return (
    <div style={aiStyles.section}>
      <div style={aiStyles.header}>
        <div style={{ fontSize: '16px' }}>🤖</div>
        <div>
          <div style={aiStyles.title}>AI Model Insights</div>
          <div style={aiStyles.sub}>Trained Machine Learning models — what drives plant health?</div>
        </div>
      </div>

      {/* Model accuracy cards */}
      <div style={aiStyles.modelGrid}>
        {(data.model_summary || []).map(m => {
          const mc = MEMBER_COLORS[m.member] || '#86a98a'
          return (
            <div key={m.model} style={aiStyles.modelCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', color: '#4a6b4e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {m.type}
                </div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600', color: mc, background: mc + '15', border: `1px solid ${mc}44` }}>
                  {m.member}
                </span>
              </div>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#e8f5e9', marginBottom: '4px' }}>{m.model}</div>
              <div style={{ fontSize: '11px', color: '#4a6b4e', marginBottom: '10px', fontFamily: "'DM Mono', monospace" }}>{m.algorithm}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: '500', color: mc }}>{m.accuracy}</div>
              <div style={{ fontSize: '10px', color: '#4a6b4e', marginTop: '2px' }}>accuracy</div>
            </div>
          )
        })}
      </div>

      {/* Feature importance charts */}
      <div style={aiStyles.chartRow}>
        {data.plant_health_importance && (
          <div style={aiStyles.chartCard}>
            <div style={aiStyles.chartTitle}>What drives Plant Health?</div>
            <div style={aiStyles.chartSub}>Feature importance — Himansa's Random Forest model</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.plant_health_importance} layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#4a6b4e', fontSize: 10, fontFamily: "'DM Mono'" }}
                  tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="feature" width={130}
                  tick={{ fill: '#86a98a', fontSize: 11, fontFamily: "'DM Mono'" }}
                  tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Importance']}
                  contentStyle={{ background: '#161f18', border: '1px solid #243d28', borderRadius: '8px', fontFamily: "'DM Mono'", fontSize: '12px' }} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {(data.plant_health_importance || []).map((_, i) => (
                    <Cell key={i} fill={['#4ade80','#22d3ee','#60a5fa','#a78bfa','#f97316','#fbbf24','#f87171'][i] || '#86a98a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.watering_importance && (
          <div style={aiStyles.chartCard}>
            <div style={aiStyles.chartTitle}>What drives Watering Need?</div>
            <div style={aiStyles.chartSub}>Feature importance — Anupama's Random Forest model</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.watering_importance} layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#4a6b4e', fontSize: 10, fontFamily: "'DM Mono'" }}
                  tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="feature" width={130}
                  tick={{ fill: '#86a98a', fontSize: 11, fontFamily: "'DM Mono'" }}
                  tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Importance']}
                  contentStyle={{ background: '#161f18', border: '1px solid #243d28', borderRadius: '8px', fontFamily: "'DM Mono'", fontSize: '12px' }} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {(data.watering_importance || []).map((_, i) => (
                    <Cell key={i} fill={['#60a5fa','#4ade80','#fbbf24','#f97316'][i] || '#86a98a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

const aiStyles = {
  section: { background: '#161f18', border: '1px solid #243d28', borderRadius: '14px', padding: '20px' },
  header:  { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #1a2e1d' },
  title:   { fontWeight: '700', fontSize: '15px', color: '#e8f5e9' },
  sub:     { fontSize: '11px', color: '#4a6b4e', fontFamily: "'DM Mono', monospace", marginTop: '2px' },
  modelGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
  modelCard: { background: '#0d1410', border: '1px solid #1a2e1d', borderRadius: '10px', padding: '14px' },
  chartRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  chartCard: { background: '#0d1410', border: '1px solid #1a2e1d', borderRadius: '10px', padding: '16px' },
  chartTitle: { fontWeight: '600', fontSize: '13px', color: '#e8f5e9', marginBottom: '3px' },
  chartSub:   { fontSize: '10px', color: '#4a6b4e', fontFamily: "'DM Mono', monospace", marginBottom: '14px' },
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod]         = useState('week')
  const [kpi, setKpi]               = useState(null)
  const [healthDist, setHealthDist] = useState([])
  const [riskDist, setRiskDist]     = useState([])
  const [riskTrend, setRiskTrend]   = useState([])
  const [envTrend, setEnvTrend]     = useState([])
  const [soilTrend, setSoilTrend]   = useState([])
  const [waterTrend, setWaterTrend] = useState([])
  const [critEvents, setCritEvents] = useState([])
  const [aiInsights, setAiInsights] = useState(null)
  const [loading, setLoading]       = useState(true)

  const load = async (p) => {
    setLoading(true)
    try {
      const [k, hd, rd, rt, et, st, wt, ce] = await Promise.all([
        api.get(`/sensor/kpi?period=${p}`),
        api.get(`/sensor/health-dist?period=${p}`),
        api.get(`/sensor/risk-dist?period=${p}`),
        api.get(`/sensor/risk-trend?period=${p}`),
        api.get(`/sensor/env-trend?period=${p}`),
        api.get(`/sensor/soil-trend?period=${p}`),
        api.get(`/sensor/water-trend?period=${p}`),
        api.get(`/sensor/critical-events?period=${p}&limit=20`),
      ])
      setKpi(k.data); setHealthDist(hd.data); setRiskDist(rd.data)
      setRiskTrend(rt.data); setEnvTrend(et.data); setSoilTrend(st.data)
      setWaterTrend(wt.data); setCritEvents(ce.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Load AI insights once (doesn't change with period)
  useEffect(() => {
    api.get('/predict/owner/insights')
      .then(r => setAiInsights(r.data))
      .catch(console.error)
  }, [])

  useEffect(() => { load(period) }, [period])

  const handleLogout = () => { logout(); navigate('/') }

  const KPI_CARDS = kpi ? [
    { label: 'Avg Temperature',   val: kpi.avg_temp?.toFixed(1),          unit: '°C', color: '#f97316' },
    { label: 'Avg Humidity',      val: kpi.avg_humidity?.toFixed(1),      unit: '%',  color: '#60a5fa' },
    { label: 'Avg Soil Moisture', val: kpi.avg_soil_moisture?.toFixed(1), unit: '%',  color: '#4ade80' },
    { label: 'Avg Water Level',   val: kpi.avg_water_level?.toFixed(1),   unit: '%',  color: '#22d3ee' },
    { label: 'Avg Risk Score',    val: kpi.avg_risk_score?.toFixed(1),    unit: '',   color: '#fbbf24' },
    { label: 'Total Readings',    val: kpi.total_readings,                unit: '',   color: '#86a98a' },
    { label: 'Critical Events',   val: kpi.critical_count,                unit: '',   color: '#f87171' },
    { label: 'Warnings',          val: kpi.warning_count,                 unit: '',   color: '#fbbf24' },
  ] : []

  return (
    <div style={styles.page}>

      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8z" fill="#22c55e"/>
              <path d="M12 6c-1.5 0-3 1.5-3 4s3 7 3 7 3-4 3-7-1.5-4-3-4z" fill="#4ade80"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoName}>NurseryPulse</div>
            <div style={styles.logoRole}>Owner View</div>
          </div>
        </div>

        <div style={styles.userBox}>
          <div style={styles.avatar}>{user?.name?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>Owner</div>
          </div>
        </div>

        <div style={styles.periodSection}>
          <div style={styles.periodLabel}>Time Period</div>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              ...styles.periodBtn,
              ...(period === p ? styles.periodActive : {}),
            }}>{p.toUpperCase()}</button>
          ))}
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>← Sign out</button>
      </aside>

      {/* ── Main ── */}
      <main style={styles.main}>

        <div style={styles.mainHeader}>
          <div>
            <h1 style={styles.title}>Business Overview</h1>
            <p style={styles.sub}>Period: {period.toUpperCase()} {loading ? '· Loading...' : ''}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={styles.kpiGrid}>
          {KPI_CARDS.map(k => (
            <div key={k.label} style={styles.kpiCard}>
              <div style={styles.kpiLabel}>{k.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '26px', fontWeight: '500', color: k.color }}>
                {k.val ?? '—'}{k.unit && <span style={{ fontSize: '13px', opacity: 0.7 }}>{k.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div style={styles.row2}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Plant Health Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={healthDist} dataKey="count" nameKey="status"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ status, percent }) => `${status} ${(percent*100).toFixed(0)}%`}>
                  {healthDist.map((e, i) => <Cell key={i} fill={HEALTH_COLORS[e.status] || '#4a6b4e'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#161f18', border: '1px solid #243d28', borderRadius: '8px', fontFamily: "'DM Mono'" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Risk Level Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={riskDist} dataKey="count" nameKey="level"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ level, percent }) => `${level} ${(percent*100).toFixed(0)}%`}>
                  {riskDist.map((e, i) => <Cell key={i} fill={RISK_COLORS[e.level] || '#4a6b4e'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#161f18', border: '1px solid #243d28', borderRadius: '8px', fontFamily: "'DM Mono'" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Risk Score Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={riskTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1d" />
                <XAxis dataKey="time" tick={{ fill: '#4a6b4e', fontSize: 9, fontFamily: "'DM Mono'" }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#4a6b4e', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<TIP />} />
                <Line type="monotone" dataKey="avg_risk" name="Risk Score"
                  stroke="#fbbf24" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={styles.row2}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Temperature & Humidity Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={envTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1d" />
                <XAxis dataKey="time" tick={{ fill: '#4a6b4e', fontSize: 9 }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#4a6b4e', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<TIP />} />
                <Line type="monotone" dataKey="avg_temp"     name="Temp °C"   stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avg_humidity" name="Humidity %" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Soil Moisture Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={soilTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1d" />
                <XAxis dataKey="time" tick={{ fill: '#4a6b4e', fontSize: 9 }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#4a6b4e', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<TIP />} />
                <Line type="monotone" dataKey="avg_moisture" name="Soil Moisture %"
                  stroke="#4ade80" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Water Level Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={waterTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1d" />
                <XAxis dataKey="time" tick={{ fill: '#4a6b4e', fontSize: 9 }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#4a6b4e', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<TIP />} />
                <Line type="monotone" dataKey="avg_water" name="Water Level %"
                  stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Events Table */}
        <div style={{ ...styles.card, marginTop: '0' }}>
          <div style={styles.cardTitle}>Critical Events Log</div>
          <div style={styles.cardSub}>{critEvents.length} critical readings in period</div>
          {critEvents.length === 0
            ? <div style={{ color: '#4a6b4e', padding: '20px 0', fontSize: '13px' }}>No critical events in this period 🌿</div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>{['Timestamp','Risk Score','Soil %','Temp °C','Humidity %','Water %','Root Status'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {critEvents.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a2e1d' }}>
                        <td style={{ ...styles.td, fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#86a98a' }}>
                          {new Date(e.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </td>
                        <td style={{ ...styles.td, color: '#f87171', fontFamily: "'DM Mono', monospace" }}>{e.risk_score?.toFixed(1)}</td>
                        <td style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{e['soil_moisture_%']?.toFixed(1)}</td>
                        <td style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{e.temperature_C?.toFixed(1)}</td>
                        <td style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{e['humidity_%']?.toFixed(1)}</td>
                        <td style={{ ...styles.td, fontFamily: "'DM Mono', monospace" }}>{e['water_level_%']?.toFixed(1)}</td>
                        <td style={{ ...styles.td }}>{e.Root_Water_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* ── AI Insights Section ── */}
        <AIInsightsSection data={aiInsights} />

      </main>
    </div>
  )
}

const styles = {
  page:    { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: '200px', minWidth: '200px', background: '#161f18', borderRight: '1px solid #243d28', display: 'flex', flexDirection: 'column', padding: '20px 14px', gap: '6px' },
  logo:    { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #243d28' },
  logoIcon: { width: '34px', height: '34px', minWidth: '34px', background: '#0d1410', border: '1px solid #243d28', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoName: { fontWeight: '700', fontSize: '13px', color: '#e8f5e9', letterSpacing: '-0.02em' },
  logoRole: { fontSize: '10px', color: '#fbbf24', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  userBox:  { display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1410', border: '1px solid #1a2e1d', borderRadius: '10px', padding: '8px 10px', marginBottom: '12px' },
  avatar:   { width: '28px', height: '28px', minWidth: '28px', background: 'linear-gradient(135deg, #78350f, #fbbf24)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: '#fff' },
  userName: { fontWeight: '600', fontSize: '12px', color: '#e8f5e9' },
  userRole: { fontSize: '10px', color: '#86a98a' },
  periodSection: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  periodLabel:   { fontSize: '10px', color: '#4a6b4e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' },
  periodBtn:    { background: 'none', border: '1px solid #1a2e1d', borderRadius: '7px', padding: '7px 10px', color: '#86a98a', fontFamily: "'DM Mono', monospace", fontSize: '11px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  periodActive: { background: '#0d3d1a', color: '#4ade80', border: '1px solid #166534' },
  logoutBtn:    { background: 'none', border: '1px solid #1a2e1d', borderRadius: '8px', padding: '8px 10px', color: '#4a6b4e', fontFamily: "'Outfit', sans-serif", fontSize: '12px', cursor: 'pointer', textAlign: 'left' },
  main:       { flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em' },
  sub:   { fontSize: '11px', color: '#4a6b4e', marginTop: '2px', fontFamily: "'DM Mono', monospace" },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' },
  kpiCard: { background: '#161f18', border: '1px solid #243d28', borderRadius: '12px', padding: '14px 16px' },
  kpiLabel: { fontSize: '10px', color: '#4a6b4e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
  row2: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' },
  card: { background: '#161f18', border: '1px solid #243d28', borderRadius: '14px', padding: '18px' },
  cardTitle: { fontWeight: '600', fontSize: '13px', color: '#e8f5e9', marginBottom: '3px' },
  cardSub:   { fontSize: '11px', color: '#4a6b4e', marginBottom: '12px', fontFamily: "'DM Mono', monospace" },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '12px' },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#4a6b4e', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #243d28' },
  td: { padding: '9px 12px', fontSize: '13px', color: '#e8f5e9' },
}