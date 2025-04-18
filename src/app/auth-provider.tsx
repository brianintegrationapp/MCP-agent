"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { AuthCustomer } from "@/lib/auth"
import { ensureAuth, storeAuth } from "@/lib/auth"

interface AuthContextType {
  customerId: string | null
  customerName: string | null
  setCustomerName: (name: string) => void
}

export const AuthContext = createContext<AuthContextType>({
  customerId: null,
  customerName: null,
  setCustomerName: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthCustomer | null>(null)

  useEffect(() => {
    // Ensure we have auth on mount
    const currentAuth = ensureAuth()
    setAuth(currentAuth)
  }, [])

  const setCustomerName = (name: string) => {
    if (!auth) return
    const newAuth = { ...auth, customerName: name }
    storeAuth(newAuth)
    setAuth(newAuth)
  }

  return (
    <AuthContext.Provider
      value={{
        customerId: auth?.customerId ?? null,
        customerName: auth?.customerName ?? null,
        setCustomerName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Helper function to get auth headers for API calls
export function getAuthHeaders(): HeadersInit {
  const auth = ensureAuth()
  return {
    "x-auth-id": auth.customerId,
    "x-customer-name": auth.customerName || "",
  }
}
