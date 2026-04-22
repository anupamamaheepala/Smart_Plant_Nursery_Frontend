import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: 'live',   label: 'Live Data',  icon: '⬤' },
  { to: 'alerts', label: 'Alerts',     icon: '⚠' },
  { to: 'trends', label: 'Trends',     icon: '↗' },
]

export default function GardenerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8z" fill="#22c55e"/>
              <path d="M12 6c-1.5 0-3 1.5-3 4s3 7 3 7 3-4 3-7-1.5-4-3-4z" fill="#4ade80"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoName}>NurseryPulse</div>
            <div style={styles.logoRole}>Gardener View</div>
          </div>
        </div>

        {/* User */}
        <div style={styles.userBox}>
          <div style={styles.avatar}>{user?.name?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>Gardener</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navActive : {}),
            })}>
              <span style={styles.navIcon}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          ← Sign out
        </button>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

const styles = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: {
    width: '220px', minWidth: '220px',
    background: '#161f18',
    borderRight: '1px solid #243d28',
    display: 'flex', flexDirection: 'column',
    padding: '24px 16px',
    gap: '8px',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '20px', paddingBottom: '20px',
    borderBottom: '1px solid #243d28',
  },
  logoIcon: {
    width: '36px', height: '36px', minWidth: '36px',
    background: '#0d1410', border: '1px solid #243d28',
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoName: { fontWeight: '700', fontSize: '14px', color: '#e8f5e9', letterSpacing: '-0.02em' },
  logoRole: { fontSize: '10px', color: '#4ade80', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  userBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#0d1410', border: '1px solid #1a2e1d',
    borderRadius: '10px', padding: '10px 12px',
    marginBottom: '12px',
  },
  avatar: {
    width: '32px', height: '32px', minWidth: '32px',
    background: 'linear-gradient(135deg, #166534, #22c55e)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '14px', color: '#fff',
  },
  userName: { fontWeight: '600', fontSize: '13px', color: '#e8f5e9' },
  userRole: { fontSize: '11px', color: '#86a98a' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '8px',
    color: '#86a98a', textDecoration: 'none',
    fontWeight: '500', fontSize: '13px',
    transition: 'all 0.15s',
  },
  navActive: {
    background: '#0d3d1a', color: '#4ade80',
    border: '1px solid #166534',
  },
  navIcon: { fontSize: '10px', width: '16px', textAlign: 'center' },
  logoutBtn: {
    background: 'none', border: '1px solid #1a2e1d',
    borderRadius: '8px', padding: '9px 12px',
    color: '#4a6b4e', fontFamily: "'Outfit', sans-serif",
    fontSize: '12px', cursor: 'pointer',
    textAlign: 'left', marginTop: 'auto',
    transition: 'all 0.15s',
  },
  main: { flex: 1, overflow: 'auto', background: '#0d1410', padding: '28px' },
}
