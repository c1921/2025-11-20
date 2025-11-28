<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import MapComponent from './components/Map.vue';

// 全局禁用默认右键菜单
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
};

onMounted(() => {
  document.addEventListener('contextmenu', handleContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('contextmenu', handleContextMenu);
});
</script>

<template>
  <MapComponent />
</template>

<style>
/* Global styles to remove margins */
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  margin: 0;
  padding: 0;
}
</style>
