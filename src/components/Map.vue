<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { MapGenerator } from '../map/MapGenerator';
import { MapPersistence, type MapSaveRecord } from '../map/storage/MapPersistence';

const mapContainer = ref<HTMLDivElement | null>(null);
const isGenerating = ref(false);
const isSaving = ref(false);
const isLoadingSave = ref(false);
const isHeightmapMode = ref(false);
const hasMap = ref(false);
const erosionEnabled = ref(false);
const seedInput = ref('');
const saveMessage = ref('');
let mapGenerator: MapGenerator | null = null;

const createRandomSeed = (): number => {
  const randomPart = Math.floor(Math.random() * 1_000_000_000);
  const timestampPart = Date.now() & 0xffffffff;
  return (randomPart ^ timestampPart) >>> 0;
};

const applyRandomSeed = (): number => {
  const seed = createRandomSeed();
  seedInput.value = seed.toString();
  return seed;
};

const resolveSeed = (): number => {
  const raw = seedInput.value.trim();
  const parsed = Number(raw);
  if (raw !== '' && Number.isFinite(parsed)) {
    const normalized = Math.trunc(parsed);
    seedInput.value = normalized.toString();
    return normalized;
  }
  return applyRandomSeed();
};

applyRandomSeed();

const SAVE_SLOT_ID = 'latest';

const saveCurrentMap = async () => {
  if (!mapGenerator) {
    saveMessage.value = '没有可保存的地图';
    return;
  }

  const payload = mapGenerator.createSavePayload();
  if (!payload) {
    saveMessage.value = '没有可保存的数据';
    return;
  }

  const record: MapSaveRecord = {
    id: SAVE_SLOT_ID,
    title: `种子 ${payload.seed} 的存档`,
    ...payload,
  };

  isSaving.value = true;
  try {
    await MapPersistence.save(record);
    saveMessage.value = '已保存到本地 IndexedDB（覆盖 latest 槽位）';
    console.log('💾 已保存本地存档', record);
  } catch (error) {
    console.error('保存存档失败', error);
    saveMessage.value = '保存失败，请查看控制台';
  } finally {
    isSaving.value = false;
  }
};

const loadLatestSave = async () => {
  if (!mapContainer.value) return;
  if (isGenerating.value || isSaving.value || isLoadingSave.value) return;

  isLoadingSave.value = true;
  try {
    const record = await MapPersistence.latest();
    if (!record) {
      saveMessage.value = '没有可用的本地存档';
      return;
    }

    if (mapGenerator) {
      mapGenerator.destroy();
      mapGenerator = null;
    }

    mapGenerator = new MapGenerator();
    await mapGenerator.loadFromSave(mapContainer.value, record);

    seedInput.value = record.seed.toString();
    erosionEnabled.value = record.enableErosion;
    isHeightmapMode.value = false;
    hasMap.value = true;
    saveMessage.value = `已读取本地存档（${new Date(record.createdAt).toLocaleString()}）`;

    if (typeof window !== 'undefined') {
      (window as any).mapGenerator = mapGenerator;
    }
  } catch (error) {
    console.error('读取存档失败', error);
    saveMessage.value = '读取失败，请查看控制台';
  } finally {
    isLoadingSave.value = false;
  }
};

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

    const seed = resolveSeed();

    await mapGenerator.initialize({
      container: mapContainer.value,
      width: 1024,
      height: 1024,
      seed,
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

const randomizeSeed = () => {
  applyRandomSeed();
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
        <p class="empty-tip">点击左上角的「生成」按钮（可设置随机种子）开始创建。</p>
      </div>
    </div>

    <!-- Optional UI overlay for controls -->
    <div class="map-controls">
      <div class="control-panel">
        <h2>地图生成器</h2>
        <p class="hint">🖱️ 拖动平移 • 滚轮缩放</p>
        <p class="hint">👣 点击地图任意位置，玩家会沿道路的最短路径前进</p>

        <div class="seed-row">
          <span class="option-label">随机种子</span>
          <div class="seed-controls">
            <input
              class="seed-input"
              v-model="seedInput"
              type="text"
              :disabled="isGenerating"
              placeholder="输入或生成种子"
            >
            <button
              class="seed-random-btn"
              type="button"
              @click="randomizeSeed"
              :disabled="isGenerating"
            >
              🎲 生成
            </button>
          </div>
        </div>

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
            {{ isGenerating ? '生成中...' : '⚙️ 生成' }}
          </button>

          <button
            class="toggle-btn"
            @click="toggleViewMode"
            :disabled="isGenerating || !hasMap"
          >
            {{ isHeightmapMode ? '🎨 彩色地图' : '📊 高度图' }}
          </button>

          <button
            class="save-btn"
            @click="saveCurrentMap"
            :disabled="isSaving || isGenerating || !hasMap"
          >
            {{ isSaving ? '保存中...' : '💾 保存到本地' }}
          </button>

          <button
            class="load-btn"
            @click="loadLatestSave"
            :disabled="isLoadingSave || isGenerating || isSaving || !mapContainer"
          >
            {{ isLoadingSave ? '读取中...' : '📂 读取本地存档' }}
          </button>

          <p v-if="saveMessage" class="save-hint">{{ saveMessage }}</p>
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

.seed-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.seed-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seed-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.seed-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.35);
}

.seed-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.seed-random-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #ff9f48 0%, #ff6a3d 100%);
  box-shadow: 0 2px 8px rgba(255, 159, 72, 0.3);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.seed-random-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 159, 72, 0.5);
}

.seed-random-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(135deg, #555 0%, #666 100%);
  box-shadow: none;
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

.save-btn,
.load-btn {
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

.save-btn {
  background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.55);
}

.load-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.35);
}

.load-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.55);
}

.save-btn:disabled,
.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(135deg, #555 0%, #666 100%);
  box-shadow: none;
}

.save-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ae6b4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
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
