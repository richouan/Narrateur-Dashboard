import { defineStore } from 'pinia'

interface AuthUser {
  id: string
  username: string
  email?: string
  role: 'ADMIN' | 'NARRATEUR'
  avatar?: string
  isOwner?: boolean
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isOwner: (state) => state.user?.isOwner === true,
    displayName: (state) => state.user?.username || 'Narrateur',
  },

  actions: {
    async fetchMe() {
      const wasLoading = this.loading
      try {
        if (!wasLoading) this.loading = true
        const { data } = await useFetch<{ success: boolean; data: AuthUser }>('/api/auth/me')
        if (data.value?.success) {
          this.user = data.value.data
        }
      } catch {
        this.user = null
      } finally {
        if (!wasLoading) this.loading = false
        this.initialized = true
      }
    },

    async login(email: string, password: string) {
      this.loading = true
      try {
        const res = await $fetch<any>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        if (res.success) {
          // Fetch full user data including isOwner flag
          await this.fetchMe()
          navigateTo('/dashboard')
        }
        return res
      } catch (error: any) {
        throw error
      } finally {
        this.loading = false
      }
    },

    async loginWithKey(key: string) {
      this.loading = true
      try {
        const res = await $fetch<any>('/api/auth/narrateur-key', {
          method: 'POST',
          body: { key },
        })
        if (res.success) {
          // Fetch full user data including isOwner flag
          await this.fetchMe()
          navigateTo('/dashboard')
        }
        return res
      } catch (error: any) {
        throw error
      } finally {
        this.loading = false
      }
    },

    async loginWithPassword(password: string) {
      this.loading = true
      try {
        const res = await $fetch<any>('/api/auth/password', {
          method: 'POST',
          body: { password },
        })
        if (res.success) {
          // Fetch full user data including isOwner flag
          await this.fetchMe()
          navigateTo('/dashboard')
        }
        return res
      } catch (error: any) {
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      this.user = null
      navigateTo('/login')
    },
  },
})
