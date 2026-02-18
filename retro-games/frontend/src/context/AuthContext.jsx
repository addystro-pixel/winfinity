import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userLogin, getUser } from '../api/client'

const AuthContext = createContext(null)
const TOKEN_KEY = 'winfinity_user_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  const login = useCallback(async (email, password) => {
    const data = await userLogin(email, password)
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    try {
      const u = await getUser(token)
      setUser(u)
      return u
    } catch {
      logout()
    }
  }, [token, logout])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    getUser(token)
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!token,
    isVerified: !!user?.verified,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
