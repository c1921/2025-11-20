<script setup lang="ts">
import { onMounted } from 'vue';
import GameView from './views/GameView.vue'

onMounted(() => {
  setTimeout(() => window.HSStaticMethods.autoInit(), 100)
});

// 禁用全局右键菜单
document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
})
</script>

<template>
  <GameView />
</template>

<style>
body,
#app {
  margin: 0;
  padding: 0;
}
</style>
