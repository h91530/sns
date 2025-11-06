'use client'

import { useState } from 'react'

interface ConfirmAlertProps {
  message: string
  title?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
  isLoading?: boolean
}

export default function ConfirmAlert({
  message,
  title,
  onConfirm,
  onCancel,
  confirmText = '확인',
  cancelText = '취소',
  type = 'warning',
  isLoading = false,
}: ConfirmAlertProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const typeStyles = {
    warning: {
      bgColor: '#fffbeb',
      borderColor: '#fde047',
      titleColor: '#92400e',
      textColor: '#b45309',
      icon: '!',
      confirmBg: '#fbbf24',
      confirmHover: '#f59e0b',
      confirmText: '#000',
    },
    danger: {
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      titleColor: '#991b1b',
      textColor: '#dc2626',
      icon: '⚠',
      confirmBg: '#ef4444',
      confirmHover: '#dc2626',
      confirmText: '#fff',
    },
    info: {
      bgColor: '#f0f9ff',
      borderColor: '#bae6fd',
      titleColor: '#0c4a6e',
      textColor: '#0369a1',
      icon: 'ⓘ',
      confirmBg: '#0ea5e9',
      confirmHover: '#0284c7',
      confirmText: '#fff',
    },
  }

  const style = typeStyles[type]

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={() => !isProcessing && onCancel()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          border: `1px solid ${style.borderColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: style.bgColor,
              border: `2px solid ${style.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: style.titleColor,
              fontWeight: 'bold',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            {style.icon}
          </div>
          {title && (
            <h2
              style={{
                margin: 0,
                color: style.titleColor,
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              {title}
            </h2>
          )}
        </div>

        {/* 메시지 */}
        <p
          style={{
            margin: '0 0 24px 0',
            color: style.textColor,
            fontSize: '14px',
            lineHeight: '1.5',
            paddingLeft: title ? '44px' : '0',
          }}
        >
          {message}
        </p>

        {/* 버튼 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isProcessing || isLoading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              cursor: isProcessing || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: isProcessing || isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isProcessing && !isLoading) {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || isLoading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: style.confirmBg,
              color: style.confirmText,
              cursor: isProcessing || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              opacity: isProcessing || isLoading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isProcessing && !isLoading) {
                e.currentTarget.style.backgroundColor = style.confirmHover
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = style.confirmBg
            }}
          >
            {isProcessing || isLoading ? '처리 중...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
