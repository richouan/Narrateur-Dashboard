<template>
  <div id="app-root">
    <!-- Animated particles background -->
    <div class="particles-bg" aria-hidden="true">
      <div v-for="i in 25" :key="i" class="particle" />
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
