<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useWorld } from '../composables/useWorld';
import type { World } from '../world/World';
import MenuPanel from './MenuPanel.vue';
import SetupPanel from './SetupPanel.vue';
import PlayingPanel from './PlayingPanel.vue';
import EmptyMapHint from './EmptyMapHint.vue';
import TimeDisplay from './TimeDisplay.vue';
import TravelInfo from './TravelInfo.vue';
import WorldDebugPanel from './WorldDebugPanel.vue';

const { isMenuPhase, isSetupPhase, isPlayingPhase, goToSetup, startGame, returnToMenu } = useGameStore();

const { world, snapshot, createWorld, startWorld, pauseWorld, destroyWorld, saveWorld, loadLatestSave } = useWorld();

// 地图容器引用
const mapContainer = ref<HTMLDivElement | null>(null);

// 提供给模板使用的 world 值
const worldValue = computed(() => world.value as World | null);

// 地图配置
const seedInput = ref(Date.now().toString());
const erosionEnabled = ref(false);
const isHeightmapMode = ref(false);

// 状态标志
const isGenerating = ref(false);
const isSaving = ref(false);
const isLoadingSave = ref(false);
const saveMessage = ref('');

// 计算属性
const hasMap = computed(() => snapshot.value.isInitialized);
const isDev = import.meta.env.DEV;

// 生成地图
const generateMap = async () => {
  if (!mapContainer.value) {
    console.error('地图容器未准备好');
    return;
  }

  isGenerating.value = true;
  try {
    const seed = parseInt(seedInput.value) || Date.now();

    await createWorld({
      mapConfig: {
        container: mapContainer.value,
        width: 1024,
        height: 1024,
        seed,
        useShading: true,
        enableErosion: erosionEnabled.value,
      },
    });

    console.log('✅ 地图生成完成');
  } catch (error) {
    console.error('地图生成失败:', error);
  } finally {
    isGenerating.value = false;
  }
};

// 切换视图模式
const toggleViewMode = () => {
  const generator = world.value?.getMapSystem()?.getGenerator();
  if (generator) {
    generator.toggleViewMode();
    isHeightmapMode.value = !isHeightmapMode.value;
  }
};

// 保存地图
const saveCurrentMap = async () => {
  if (!world.value) {
    saveMessage.value = '❌ 没有可保存的地图';
    return;
  }

  isSaving.value = true;
  saveMessage.value = '';

  try {
    await saveWorld();
    saveMessage.value = '✅ 保存成功！';
    setTimeout(() => {
      saveMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('保存失败:', error);
    saveMessage.value = '❌ 保存失败';
  } finally {
    isSaving.value = false;
  }
};

// 加载存档
const loadSave = async () => {
  if (!mapContainer.value) {
    console.error('地图容器未准备好');
    return;
  }

  isLoadingSave.value = true;
  saveMessage.value = '';

  try {
    const success = await loadLatestSave(mapContainer.value);
    if (success) {
      saveMessage.value = '✅ 存档加载成功！';
      setTimeout(() => {
        saveMessage.value = '';
      }, 3000);
    } else {
      saveMessage.value = '❌ 没有找到存档';
    }
  } catch (error) {
    console.error('加载失败:', error);
    saveMessage.value = '❌ 加载失败';
  } finally {
    isLoadingSave.value = false;
  }
};

// 随机种子
const randomizeSeed = () => {
  seedInput.value = Date.now().toString();
};

// 重置配置
const resetConfig = () => {
  seedInput.value = Date.now().toString();
  erosionEnabled.value = false;
  isHeightmapMode.value = false;
};

// 清除地图
const clearMap = () => {
  destroyWorld();
};

// 获取玩家图层
const getPlayerLayer = () => {
  return world.value?.getMapSystem()?.getPlayerLayer() ?? null;
};

// 创建新游戏（重置配置并进入设置阶段）
const handleNewGame = () => {
  resetConfig();
  goToSetup();
};

// 加载存档后直接进入游戏
const handleLoadAndPlay = async () => {
  await loadSave();
  if (hasMap.value) {
    startGame();
  }
};

// 返回主菜单（清理地图）
const handleReturnToMenu = () => {
  clearMap();
  returnToMenu();
};

// 监听游戏阶段，控制世界运行
watch(isPlayingPhase, (playing) => {
  if (playing) {
    startWorld();
  } else {
    pauseWorld();
  }
});
</script>

<template>
  <div class="map-wrapper">
    <!-- Full-screen canvas container -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- 主菜单阶段：居中显示 -->
    <div v-if="isMenuPhase" class="menu-state">
      <MenuPanel
        :is-loading-save="isLoadingSave"
        :is-saving="isSaving"
        :save-message="saveMessage"
        @new-game="handleNewGame"
        @load="handleLoadAndPlay"
        @settings="() => {}"
      />
    </div>

    <!-- 设置阶段：控制面板在角落，地图可见 -->
    <div v-if="isSetupPhase" class="map-controls">
      <SetupPanel
        :seed-input="seedInput"
        :erosion-enabled="erosionEnabled"
        :is-generating="isGenerating"
        :has-map="hasMap"
        :save-message="saveMessage"
        @generate="generateMap"
        @start="startGame"
        @back="handleReturnToMenu"
        @randomize="randomizeSeed"
        @update:seed-input="seedInput = $event"
        @update:erosion-enabled="erosionEnabled = $event"
      />
    </div>

    <!-- 设置阶段无地图时的提示 -->
    <div v-if="isSetupPhase && !hasMap" class="empty-state">
      <EmptyMapHint />
    </div>

    <!-- 游戏阶段：控制面板在角落 -->
    <div v-if="isPlayingPhase" class="map-controls">
      <PlayingPanel
        :is-heightmap-mode="isHeightmapMode"
        :is-generating="isGenerating"
        :is-saving="isSaving"
        :save-message="saveMessage"
        @toggle-view="toggleViewMode"
        @save="saveCurrentMap"
        @return-menu="handleReturnToMenu"
      />
    </div>

    <!-- 游戏阶段：时间显示在右上角 -->
    <div v-if="isPlayingPhase" class="time-panel">
      <TimeDisplay :world="worldValue" />
    </div>

    <!-- 游戏阶段：旅行信息显示在左下角 -->
    <div v-if="isPlayingPhase" class="travel-panel">
      <TravelInfo :player-layer="getPlayerLayer()" />
    </div>

    <!-- 开发模式：World 调试面板显示在右下角 -->
    <div v-if="isDev && hasMap" class="debug-panel">
      <WorldDebugPanel :world="worldValue" :snapshot="snapshot" />
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0a0a0f;
}

.map-container {
  position: absolute;
  inset: 0;
}

.map-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
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

.menu-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background: #0a0a0f;
}

.time-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.travel-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 100;
}

.debug-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}
</style>
