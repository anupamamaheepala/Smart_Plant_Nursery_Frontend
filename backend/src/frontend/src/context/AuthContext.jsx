import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    const role  = localStorage.getItem('role')
    const name  = localStorage.getItem('name')
    return token ? { token, role, name } : null
  })

  const login = ({ access_token, role, name }) => {
    localStorage.setItem('token', access_token)
    localStorage.setItem('role', role)
    localStorage.setItem('name', name)
    setUser({ token: access_token, role, name })
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
