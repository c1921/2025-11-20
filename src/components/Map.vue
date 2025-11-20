<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { MapGenerator } from '../map/MapGenerator';

const mapContainer = ref<HTMLDivElement | null>(null);
const isGenerating = ref(false);
const isHeightmapMode = ref(false);
let mapGenerator: MapGenerator | null = null;

const generateMap = async () => {
  if (!mapContainer.value || isGenerating.value) return;

  isGenerating.value = true;

  try {
    console.log('🚀 Starting map generation...');

    // Destroy existing map if present
    if (mapGenerator) {
      mapGenerator.destroy();
      mapGenerator = null;
    }

    // Create and initialize new map generator
    mapGenerator = new MapGenerator();

    await mapGenerator.initialize({
      container: mapContainer.value,
      width: 2048,
      height: 2048,
      seed: Date.now(),
      useShading: true,
    });

    // Reset view mode
    isHeightmapMode.value = false;

    console.log('✨ Map generation complete!');
    console.log('💡 Try dragging/zooming the map');
  } finally {
    isGenerating.value = false;
  }
};

const toggleViewMode = () => {
  if (!mapGenerator) return;

  mapGenerator.toggleViewMode();
  isHeightmapMode.value = mapGenerator.isHeightmapMode();
};

onMounted(async () => {
  // Generate initial map
  await generateMap();
});

onUnmounted(() => {
  // Clean up resources when component is destroyed
  if (mapGenerator) {
    mapGenerator.destroy();
    mapGenerator = null;
  }
});

// Expose map generator for debugging in console
if (typeof window !== 'undefined') {
  (window as any).mapGenerator = mapGenerator;
}
</script>

<template>
  <div class="map-wrapper">
    <!-- Full-screen canvas container -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- Optional UI overlay for controls -->
    <div class="map-controls">
      <div class="control-panel">
        <h2>地图生成器</h2>
        <p class="hint">🖱️ 拖动平移 • 滚轮缩放</p>

        <div class="button-group">
          <button
            class="generate-btn"
            @click="generateMap"
            :disabled="isGenerating"
          >
            {{ isGenerating ? '生成中...' : '🎲 随机生成' }}
          </button>

          <button
            class="toggle-btn"
            @click="toggleViewMode"
            :disabled="isGenerating"
          >
            {{ isHeightmapMode ? '🎨 彩色地图' : '📊 高度图' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0f;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.map-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  pointer-events: none;
  z-index: 100;
}

.control-panel {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px 20px;
  color: #fff;
  pointer-events: auto;
  max-width: 300px;
}

.control-panel h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
}

.control-panel .hint {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #aaa;
  line-height: 1.4;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.generate-btn,
.toggle-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.toggle-btn {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}

.toggle-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.5);
}

.generate-btn:active:not(:disabled),
.toggle-btn:active:not(:disabled) {
  transform: translateY(0);
}

.generate-btn:disabled,
.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(135deg, #555 0%, #666 100%);
}
</style>
