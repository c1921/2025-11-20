<script setup lang="ts">
import { ref, watch } from 'vue';
import type { World } from '../../world/World';
import type { Settlement } from '../../map/core/types';

interface Props {
  world: World | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'settlement-click': [settlement: Settlement, index: number];
  'settlement-right-click': [settlement: Settlement, index: number, event: any];
}>();

const mapContainer = ref<HTMLDivElement | null>(null);

// 监听 world 变化，设置点击回调
watch(() => props.world, (newWorld) => {
  if (newWorld) {
    const generator = newWorld.getMapSystem()?.getGenerator();
    if (generator) {
      generator.onSettlementClick = (settlement, index) => {
        emit('settlement-click', settlement, index);
      };
      generator.onSettlementRightClick = (settlement, index, event) => {
        emit('settlement-right-click', settlement, index, event);
      };
    }
  }
});

// 暴露容器元素给父组件
defineExpose({
  getContainerElement: () => mapContainer.value
});
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  position: absolute;
  inset: 0;
}
</style>
