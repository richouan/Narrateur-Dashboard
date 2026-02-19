<template>
  <!-- Toast Notifications -->
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification-toast', `notification-${notification.type}`]"
          @click="removeNotification(notification.id)"
        >
          <div class="notification-icon">
            <span v-if="notification.type === 'success'">✅</span>
            <span v-else-if="notification.type === 'error'">❌</span>
            <span v-else-if="notification.type === 'warning'">⚠️</span>
            <span v-else>ℹ️</span>
          </div>
          <div class="notification-message">{{ notification.message }}</div>
          <div class="notification-close">✕</div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Confirmation Modal -->
    <Transition name="modal-fade">
      <div
        v-if="confirmState?.isOpen"
        class="confirmation-overlay"
        @click="confirmState?.onCancel()"
      >
        <div class="confirmation-modal" @click.stop>
          <div class="confirmation-header">
            <h3 class="confirmation-title">{{ confirmState.title }}</h3>
          </div>
          <div class="confirmation-body">
            <p class="confirmation-message">{{ confirmState.message }}</p>
          </div>
          <div class="confirmation-footer">
            <button
              class="btn-confirm-cancel"
              @click="confirmState.onCancel()"
            >
              {{ confirmState.cancelText }}
            </button>
            <button
              class="btn-confirm-ok"
              @click="confirmState.onConfirm()"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { notifications, confirmState, removeNotification } = useNotification()
</script>

<style lang="scss" scoped>
@use '~/assets/scss/variables' as *;

// ─── Notification Container ─────────────────────────────────
.notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.notification-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  max-width: 450px;
  padding: 14px 18px;
  border-radius: $radius-lg;
  background: rgba(20, 20, 35, 0.98);
  border: 1px solid;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;
  transition: all $transition-base;

  &:hover {
    transform: translateX(-4px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
}

.notification-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.notification-close {
  font-size: 1rem;
  opacity: 0.5;
  flex-shrink: 0;
  transition: opacity $transition-fast;

  .notification-toast:hover & {
    opacity: 1;
  }
}

.notification-success {
  border-color: rgba($village-green, 0.5);
  background: rgba(20, 20, 35, 0.95);
  
  .notification-icon {
    color: $village-green;
  }
}

.notification-error {
  border-color: rgba($wolf-red, 0.5);
  background: rgba(20, 20, 35, 0.95);
  
  .notification-icon {
    color: $wolf-red;
  }
}

.notification-warning {
  border-color: rgba($day-accent, 0.5);
  background: rgba(20, 20, 35, 0.95);
  
  .notification-icon {
    color: $day-accent;
  }
}

.notification-info {
  border-color: rgba($violet-400, 0.5);
  background: rgba(20, 20, 35, 0.95);
  
  .notification-icon {
    color: $violet-400;
  }
}

// Notification animations
.notification-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notification-leave-active {
  transition: all 0.2s ease-out;
}

.notification-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}

// ─── Confirmation Modal ─────────────────────────────────────
.confirmation-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
}

.confirmation-modal {
  background: rgba(20, 20, 35, 0.98);
  border: 1px solid rgba($violet-400, 0.3);
  border-radius: $radius-xl;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.confirmation-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba($violet-400, 0.2);
}

.confirmation-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.confirmation-body {
  padding: 1.5rem;
}

.confirmation-message {
  font-size: 0.95rem;
  color: $text-secondary;
  line-height: 1.6;
  margin: 0;
}

.confirmation-footer {
  display: flex;
  gap: 12px;
  padding: 1.5rem;
  border-top: 1px solid rgba($violet-400, 0.2);
}

.btn-confirm-cancel,
.btn-confirm-ok {
  flex: 1;
  padding: 12px 24px;
  border-radius: $radius-lg;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid;
}

.btn-confirm-cancel {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba($violet-400, 0.3);
  color: $text-secondary;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: $violet-400;
    color: $text-primary;
    transform: translateY(-2px);
  }
}

.btn-confirm-ok {
  background: rgba($violet-500, 0.2);
  border-color: rgba($violet-400, 0.5);
  color: $violet-100;

  &:hover {
    background: rgba($violet-500, 0.3);
    border-color: $violet-400;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

// Modal animations
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;

  .confirmation-modal {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .confirmation-modal {
    transform: scale(0.9) translateY(-20px);
  }
}
</style>
