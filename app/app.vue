<template>
  <div id="app-root">
    <!-- Reduced animated particles for better performance -->
    <div class="particles-bg" aria-hidden="true">
      <div v-for="i in 8" :key="i" class="particle" />
    </div>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Global persistent components — never remount on page/layout change -->
    <NotificationContainer />
    <!-- Impersonation banner -->
    <Transition name="imp-bar">
      <div v-if="impersonation.active" class="impersonation-bar">
        <span class="imp-bar-text">👁️ Connecté en tant que <strong>{{ authStore.displayName }}</strong> — compte de <strong>{{ impersonation.ownerUsername }}</strong></span>
        <button class="imp-bar-btn" @click="exitImpersonation" :disabled="impersonation.exiting">{{ impersonation.exiting ? '...' : '⬅ Retour à mon compte' }}</button>
      </div>
    </Transition>

    <!-- Wrapper keeps these out of the `> :not(.particles-bg)` position:relative rule -->
    <div class="global-panels" v-if="authStore.initialized && authStore.isAuthenticated && !isLoginPage">
      <Notebook />
      <MusicPlayer />
      <ToolsPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')

// ── Impersonation state ──────────────────────────────────────────
const impersonation = reactive({ active: false, ownerUsername: '', exiting: false })

async function checkImpersonation() {
  try {
    const res = await $fetch<{ active: boolean; ownerUsername?: string }>('/api/admin/impersonate-status')
    impersonation.active = res.active
    impersonation.ownerUsername = res.ownerUsername ?? ''
  } catch {}
}

async function exitImpersonation() {
  impersonation.exiting = true
  try {
    await $fetch('/api/admin/impersonate-exit', { method: 'POST' })
    impersonation.active = false
    await authStore.fetchMe()
    navigateTo('/settings')
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Erreur')
  } finally {
    impersonation.exiting = false
  }
}

onMounted(() => {
  if (authStore.initialized) checkImpersonation()
})

// Re-check when auth changes (login/logout/impersonate)
watch(() => authStore.initialized, (v) => { if (v) checkImpersonation() })
watch(() => authStore.user?.id, () => { checkImpersonation() })
</script>

<style lang="scss">
#app-root {
  min-height: 100vh;
  position: relative;
  
  > :not(.particles-bg):not(.global-panels) {
    position: relative;
    z-index: 2;
  }
}

/* ── Impersonation banner ── */
.impersonation-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 20px;
  background: linear-gradient(90deg, rgba(109,40,217,0.97) 0%, rgba(124,58,237,0.97) 100%);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(167,139,250,0.4);
  box-shadow: 0 2px 16px rgba(109,40,217,0.35);
  font-size: 0.82rem;
  color: #ede9fe;
  flex-wrap: wrap;
}
.imp-bar-text { opacity: 0.92; }
.imp-bar-btn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;
  white-space: nowrap;
  &:hover { background: rgba(255,255,255,0.25); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
.imp-bar-enter-active, .imp-bar-leave-active { transition: all 250ms ease; }
.imp-bar-enter-from, .imp-bar-leave-to { opacity: 0; transform: translateY(-100%); }

/* Must NOT be position:relative — inner components use position:fixed vs viewport */
.global-panels {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999;
  overflow: visible;

  /* Re-enable clicks on the actual trigger tabs / panels / mini-bar */
  > * {
    pointer-events: all;
  }
}
</style>
