<template>
  <div class="layout-default">
    <slot />
    <NotificationContainer />
  </div>
</template>

<style lang="scss">
.layout-default {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
</style>
