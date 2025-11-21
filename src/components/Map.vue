<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { MapGenerator } from '../map/MapGenerator';

const mapContainer = ref<HTMLDivElement | null>(null);
const isGenerating = ref(false);
const isHeightmapMode = ref(false);
const hasMap = ref(false);
const erosionEnabled = ref(false);
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
      width: 1024,
      height: 1024,
      seed: Date.now(),
      useShading: true,
      enableErosion: erosionEnabled.value,
    });

    // Reset view mode
    isHeightmapMode.value = false;
    hasMap.value = true;
    if (typeof window !== 'undefined') {
      (window as any).mapGenerator = mapGenerator;
    }

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

onUnmounted(() => {
  // Clean up resources when component is destroyed
  if (mapGenerator) {
    mapGenerator.destroy();
    mapGenerator = null;
  }
  hasMap.value = false;
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
    <div v-if="!hasMap" class="empty-state">
      <div class="empty-card">
        <p class="empty-title">暂无地图</p>
        <p class="empty-tip">点击左上角的「随机生成」按钮开始创建。</p>
      </div>
    </div>

    <!-- Optional UI overlay for controls -->
    <div class="map-controls">
      <div class="control-panel">
        <h2>地图生成器</h2>
        <p class="hint">🖱️ 拖动平移 • 滚轮缩放</p>

        <div class="option-row">
          <span class="option-label">侵蚀效果</span>
          <label class="switch">
            <input type="checkbox" v-model="erosionEnabled" :disabled="isGenerating">
            <span class="slider"></span>
          </label>
        </div>

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
            :disabled="isGenerating || !hasMap"
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

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #ddd;
  font-size: 13px;
}

.option-label {
  font-weight: 600;
  letter-spacing: 0.2px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: linear-gradient(135deg, #444, #666);
  transition: background 0.2s ease;
  border-radius: 999px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
}

.slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.switch input:checked + .slider {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.switch input:checked + .slider::before {
  transform: translateX(22px);
}

.switch input:disabled + .slider {
  opacity: 0.6;
  cursor: not-allowed;
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

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.empty-card {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 18px;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.empty-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.empty-tip {
  margin: 0;
  font-size: 13px;
  color: #ccc;
  text-align: center;
  line-height: 1.5;
}
</style>
