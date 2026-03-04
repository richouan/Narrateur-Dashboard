<template>
  <div class="layout-default">
    <slot />
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss">
.layout-default {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
</style>
