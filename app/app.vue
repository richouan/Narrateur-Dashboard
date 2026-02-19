<template>
  <div id="app-root">
    <!-- Reduced animated particles for better performance -->
    <div class="particles-bg" aria-hidden="true">
      <div v-for="i in 8" :key="i" class="particle" />
    </div>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

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
