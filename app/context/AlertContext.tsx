'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import CustomAlert from '@/components/CustomAlert'
import ConfirmAlert from '@/components/ConfirmAlert'

interface Alert {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ConfirmOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

interface AlertContextType {
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void
  showConfirm: (message: string, onConfirm: () => void | Promise<void>, options?: ConfirmOptions) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

interface ConfirmState {
  id: string
  message: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  title?: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
  isLoading?: boolean
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const showAlert = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3000
  ) => {
    const id = Date.now().toString()
    const newAlert: Alert = { id, message, type, duration }
    setAlerts((prev) => [...prev, newAlert])

    if (duration > 0) {
      setTimeout(() => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id))
      }, duration)
    }
  }

  const showConfirm = (
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: ConfirmOptions
  ) => {
    const id = Date.now().toString()
    setConfirmState({
      id,
      message,
      onConfirm: async () => {
        setConfirmState((prev) => (prev ? { ...prev, isLoading: true } : null))
        try {
          await onConfirm()
        } finally {
          setConfirmState(null)
        }
      },
      onCancel: () => setConfirmState(null),
      title: options?.title,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      type: options?.type || 'warning',
      isLoading: false,
    })
  }

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
        {alerts.map((alert) => (
          <div key={alert.id} style={{ marginBottom: '12px' }}>
            <CustomAlert
              message={alert.message}
              type={alert.type}
              duration={alert.duration}
              onClose={() => removeAlert(alert.id)}
            />
          </div>
        ))}
      </div>
      {confirmState && (
        <ConfirmAlert
          message={confirmState.message}
          title={confirmState.title}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          type={confirmState.type}
          isLoading={confirmState.isLoading}
        />
      )}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider')
  }
  return context
}
