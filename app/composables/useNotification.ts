import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration: number
}

const notifications = ref<Notification[]>([])
const confirmState = ref<{
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  doubleConfirm: boolean
  doubleConfirmText: string
  onConfirm: () => void
  onCancel: () => void
} | null>(null)

export const useNotification = () => {
  const showNotification = (message: string, type: NotificationType = 'info', duration = 3000) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const notification: Notification = {
      id,
      type,
      message,
      duration,
    }

    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const success = (message: string, duration = 3000) => {
    return showNotification(message, 'success', duration)
  }

  const error = (message: string, duration = 4000) => {
    return showNotification(message, 'error', duration)
  }

  const warning = (message: string, duration = 3500) => {
    return showNotification(message, 'warning', duration)
  }

  const info = (message: string, duration = 3000) => {
    return showNotification(message, 'info', duration)
  }

  const confirm = (
    message: string,
    title = 'Confirmation',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    options?: { doubleConfirm?: boolean; doubleConfirmText?: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmState.value = {
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        doubleConfirm: options?.doubleConfirm ?? false,
        doubleConfirmText: options?.doubleConfirmText ?? 'Confirmer définitivement',
        onConfirm: () => {
          confirmState.value = null
          resolve(true)
        },
        onCancel: () => {
          confirmState.value = null
          resolve(false)
        },
      }
    })
  }

  return {
    notifications,
    confirmState,
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
    confirm,
  }
}
