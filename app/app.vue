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
    <template v-if="authStore.isAuthenticated && !isLoginPage">
      <Notebook />
      <MusicPlayer />
      <ToolsPanel />
    </template>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')
</script>

<style lang="scss">
#app-root {
  min-height: 100vh;
  position: relative;
  
  > :not(.particles-bg) {
    position: relative;
    z-index: 2;
  }
}
</style>
