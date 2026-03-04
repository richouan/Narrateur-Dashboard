<template>
  <div class="layout-default">
    <slot />
    <NotificationContainer />
    <Notebook v-if="authStore.isAuthenticated" />
    <MusicPlayer v-if="authStore.isAuthenticated" />
    <ToolsPanel v-if="authStore.isAuthenticated" />
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
</script>

<style lang="scss">
.layout-default {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
</style>
