import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['admin', 'gardener', 'owner']

const ROLE_COLOR = {
  admin:    { color: '#a78bfa', bg: '#4c1d9533', border: '#6d28d9' },
  gardener: { color: '#4ade80', bg: '#14532d33', border: '#166534' },
  owner:    { color: '#fbbf24', bg: '#78350f33', border: '#92400e' },
}

export default function UserManagement() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'create' | {edit: user} | {del: user}
  const [form, setForm]       = useState({ username: '', password: '', role: 'gardener', name: '' })
  const [err, setErr]         = useState('')

  const load = () => {
    api.get('/users/').then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm({ username:'', password:'', role:'gardener', name:'' }); setErr(''); setModal('create') }
  const openEdit   = (u) => { setForm({ username: u.username, password:'', role: u.role, name: u.name }); setErr(''); setModal({ edit: u }) }
  const openDel    = (u) => { setModal({ del: u }) }

  const handleCreate = async () => {
    setErr('')
    try {
      await api.post('/users/', form)
      load(); setModal(null)
    } catch(e) { setErr(e.response?.data?.detail || 'Error creating user') }
  }

  const handleEdit = async () => {
    setErr('')
    const payload = { role: form.role, name: form.name }
    if (form.password) payload.password = form.password
    try {
      await api.put(`/users/${modal.edit._id}`, payload)
      load(); setModal(null)
    } catch(e) { setErr(e.response?.data?.detail || 'Error updating user') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${modal.del._id}`)
      load(); setModal(null)
    } catch(e) { console.error(e) }
  }

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div style={styles.page}>
      {/* Sidebar */}
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
            <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin View</div>
          </div>
        </div>
        <div style={styles.userBox}>
          <div style={{ ...styles.avatar, background: 'linear-gradient(135deg, #4c1d95, #a78bfa)' }}>{user?.name?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>Administrator</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={styles.logoutBtn}>← Sign out</button>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.mainHeader}>
          <div>
            <h1 style={styles.title}>User Management</h1>
            <p style={styles.sub}>{users.length} users registered</p>
          </div>
          <button onClick={openCreate} style={styles.createBtn}>+ New User</button>
        </div>

        {loading
          ? <div style={{ color: '#86a98a', fontFamily: "'DM Mono', monospace" }}>Loading users...</div>
          : (
          <div style={styles.table}>
            <div style={styles.thead}>
              {['Name', 'Username', 'Role', 'Actions'].map(h => (
                <div key={h} style={styles.th}>{h}</div>
              ))}
            </div>
            {users.map(u => {
              const rc = ROLE_COLOR[u.role] || ROLE_COLOR.gardener
              return (
                <div key={u._id} style={styles.trow}>
                  <div style={styles.tdName}>
                    <div style={{ ...styles.avatar, width: '32px', height: '32px', fontSize: '13px', background: `linear-gradient(135deg, ${rc.border}, ${rc.color})` }}>
                      {u.name?.[0]}
                    </div>
                    <span style={{ fontWeight: '500', color: '#e8f5e9' }}>{u.name}</span>
                  </div>
                  <div style={{ ...styles.td, fontFamily: "'DM Mono', monospace", color: '#86a98a' }}>@{u.username}</div>
                  <div style={styles.td}>
                    <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ ...styles.td, gap: '8px', display: 'flex' }}>
                    <button onClick={() => openEdit(u)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => openDel(u)}  style={styles.delBtn}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            {/* Create / Edit */}
            {(modal === 'create' || modal.edit) && (
              <>
                <h2 style={styles.modalTitle}>{modal === 'create' ? 'Create New User' : 'Edit User'}</h2>
                <div style={styles.fields}>
                  {modal === 'create' && (
                    <div style={styles.field}>
                      <label style={styles.label}>Username</label>
                      <input style={styles.input} value={form.username}
                        onChange={e => setForm({...form, username: e.target.value})} placeholder="username" />
                    </div>
                  )}
                  <div style={styles.field}>
                    <label style={styles.label}>Full Name</label>
                    <input style={styles.input} value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Password {modal.edit && '(leave blank to keep current)'}</label>
                    <input style={styles.input} type="password" value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})} placeholder="Password" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Role</label>
                    <select style={styles.input} value={form.role}
                      onChange={e => setForm({...form, role: e.target.value})}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {err && <div style={styles.err}>{err}</div>}
                </div>
                <div style={styles.modalBtns}>
                  <button onClick={() => setModal(null)} style={styles.cancelBtn}>Cancel</button>
                  <button onClick={modal === 'create' ? handleCreate : handleEdit} style={styles.saveBtn}>
                    {modal === 'create' ? 'Create User' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
            {/* Delete confirm */}
            {modal.del && (
              <>
                <h2 style={styles.modalTitle}>Delete User?</h2>
                <p style={{ color: '#86a98a', fontSize: '14px', margin: '12px 0 20px' }}>
                  Are you sure you want to delete <strong style={{ color: '#e8f5e9' }}>{modal.del.name}</strong> (@{modal.del.username})?
                  This cannot be undone.
                </p>
                <div style={styles.modalBtns}>
                  <button onClick={() => setModal(null)} style={styles.cancelBtn}>Cancel</button>
                  <button onClick={handleDelete} style={{ ...styles.saveBtn, background: 'linear-gradient(135deg, #991b1b, #f87171)' }}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page:   { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: '200px', minWidth: '200px', background: '#161f18', borderRight: '1px solid #243d28', display: 'flex', flexDirection: 'column', padding: '20px 14px', gap: '8px' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #243d28' },
  logoIcon: { width: '34px', height: '34px', minWidth: '34px', background: '#0d1410', border: '1px solid #243d28', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoName: { fontWeight: '700', fontSize: '13px', color: '#e8f5e9', letterSpacing: '-0.02em' },
  userBox: { display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1410', border: '1px solid #1a2e1d', borderRadius: '10px', padding: '8px 10px' },
  avatar: { width: '28px', height: '28px', minWidth: '28px', background: 'linear-gradient(135deg, #166534, #22c55e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: '#fff' },
  userName: { fontWeight: '600', fontSize: '12px', color: '#e8f5e9' },
  userRole: { fontSize: '10px', color: '#86a98a' },
  logoutBtn: { background: 'none', border: '1px solid #1a2e1d', borderRadius: '8px', padding: '8px 10px', color: '#4a6b4e', fontFamily: "'Outfit', sans-serif", fontSize: '12px', cursor: 'pointer', textAlign: 'left' },
  main: { flex: 1, overflow: 'auto', padding: '28px' },
  mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em' },
  sub:   { fontSize: '12px', color: '#4a6b4e', marginTop: '3px' },
  createBtn: { background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  table: { background: '#161f18', border: '1px solid #243d28', borderRadius: '14px', overflow: 'hidden' },
  thead: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr', padding: '12px 20px', background: '#0d1410', borderBottom: '1px solid #243d28' },
  th: { fontSize: '10px', fontWeight: '700', color: '#4a6b4e', textTransform: 'uppercase', letterSpacing: '0.06em' },
  trow: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr', padding: '14px 20px', borderBottom: '1px solid #1a2e1d', alignItems: 'center' },
  tdName: { display: 'flex', alignItems: 'center', gap: '10px' },
  td: { fontSize: '13px', color: '#e8f5e9' },
  editBtn: { background: '#0d1410', border: '1px solid #243d28', borderRadius: '6px', padding: '5px 12px', color: '#86a98a', fontFamily: "'Outfit', sans-serif", fontSize: '12px', cursor: 'pointer' },
  delBtn:  { background: '#7f1d1d22', border: '1px solid #991b1b', borderRadius: '6px', padding: '5px 12px', color: '#f87171', fontFamily: "'Outfit', sans-serif", fontSize: '12px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal: { background: '#161f18', border: '1px solid #243d28', borderRadius: '16px', padding: '28px', width: '400px', boxShadow: '0 16px 64px rgba(0,0,0,0.6)' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#e8f5e9', letterSpacing: '-0.03em', marginBottom: '16px' },
  fields: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '11px', fontWeight: '600', color: '#86a98a', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { background: '#0d1410', border: '1px solid #243d28', borderRadius: '8px', padding: '9px 12px', color: '#e8f5e9', fontFamily: "'Outfit', sans-serif", fontSize: '14px', outline: 'none' },
  err: { color: '#f87171', fontSize: '13px', background: '#7f1d1d22', border: '1px solid #991b1b', borderRadius: '8px', padding: '8px 12px' },
  modalBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: { background: 'none', border: '1px solid #243d28', borderRadius: '8px', padding: '9px 18px', color: '#86a98a', fontFamily: "'Outfit', sans-serif", fontSize: '13px', cursor: 'pointer' },
  saveBtn: { background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', borderRadius: '8px', padding: '9px 20px', color: '#fff', fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
}
