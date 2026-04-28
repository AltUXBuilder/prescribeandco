'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { authService, type User, type AuthTokens } from './api'

interface AuthState {
  user:         User | null
  accessToken:  string | null
  refreshToken: string | null
  expiresAt:    number | null
}

interface AuthContextValue extends AuthState {
  login:    (email: string, password: string) => Promise<void>
  logout:   () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  getToken: () => Promise<string | null>
  isLoading: boolean
}

interface RegisterData {
  email:       string
  password:    string
  firstName:   string
  lastName:    string
  nhsNumber?:  string
  dateOfBirth?: string
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'pco_auth'

function loadFromStorage(): AuthState {
  if (typeof window === 'undefined') return { user: null, accessToken: null, refreshToken: null, expiresAt: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { user: null, accessToken: null, refreshToken: null, expiresAt: null }
    return JSON.parse(raw) as AuthState
  } catch {
    return { user: null, accessToken: null, refreshToken: null, expiresAt: null }
  }
}

function saveToStorage(state: AuthState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState]       = useState<AuthState>(() => loadFromStorage())
  const [isLoading, setLoading] = useState(false)

  const setAuth = useCallback((user: User, tokens: AuthTokens) => {
    const next: AuthState = {
      user,
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt:    Date.now() + tokens.expiresIn * 1000,
    }
    setState(next)
    saveToStorage(next)
  }, [])

  const clearAuth = useCallback(() => {
    setState({ user: null, accessToken: null, refreshToken: null, expiresAt: null })
    clearStorage()
  }, [])

  const getToken = useCallback(async (): Promise<string | null> => {
    const { accessToken, refreshToken, expiresAt } = state
    if (!accessToken || !refreshToken) return null
    const needsRefresh = !expiresAt || Date.now() > expiresAt - 60_000
    if (!needsRefresh) return accessToken
    try {
      const tokens = await authService.refresh(refreshToken)
      const next: AuthState = { ...state, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: Date.now() + tokens.expiresIn * 1000 }
      setState(next)
      saveToStorage(next)
      return tokens.accessToken
    } catch {
      clearAuth()
      return null
    }
  }, [state, clearAuth])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await authService.login(email, password)
      setAuth(response.user, { accessToken: response.accessToken, refreshToken: response.refreshToken, expiresIn: response.expiresIn })
    } finally {
      setLoading(false)
    }
  }, [setAuth])

  const register = useCallback(async (data: RegisterData) => {
    setLoading(true)
    try {
      await authService.register(data)
      const response = await authService.login(data.email, data.password)
      setAuth(response.user, { accessToken: response.accessToken, refreshToken: response.refreshToken, expiresIn: response.expiresIn })
    } finally {
      setLoading(false)
    }
  }, [setAuth])

  const logout = useCallback(async () => {
    const { accessToken, refreshToken } = state
    if (accessToken && refreshToken) {
      try { await authService.logout(refreshToken, accessToken) } catch { /* clear locally regardless */ }
    }
    clearAuth()
  }, [state, clearAuth])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, getToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
