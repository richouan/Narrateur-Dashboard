export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // Allow access to login and loading
  if (to.path === '/login' || to.path === '/') {
    return
  }

  // Check auth
  if (!authStore.initialized) {
    await authStore.fetchMe()
  }

  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
