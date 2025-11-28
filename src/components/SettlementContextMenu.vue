<script setup lang="ts">
import type { Settlement } from '../map/core/types';

interface Props {
  settlement: Settlement | null;
  settlementIndex: number | null;
  position: { x: number; y: number };
}

defineProps<Props>();

const emit = defineEmits<{
  moveTo: [];
  close: [];
}>();

const handleMoveTo = () => {
  emit('moveTo');
};
</script>

<template>
  <div
    v-if="settlement"
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <button type="button" class="menu-item" @click="handleMoveTo">
      <span class="icon-[tabler--route] size-5 shrink-0"></span>
      移动到此处
    </button>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 300;
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  min-width: 160px;
  padding: 4px 0;
  backdrop-filter: blur(8px);
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: none;
  border: none;
  color: #e8e8e8;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item:active {
  background: rgba(255, 255, 255, 0.15);
}

.menu-item .icon-\[tabler--route\] {
  color: #ffd166;
}
</style>
