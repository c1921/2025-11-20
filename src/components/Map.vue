<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useTimeStore } from '../stores/timeStore';
import { useMapGenerator } from '../composables/useMapGenerator';
import MenuPanel from './MenuPanel.vue';
import SetupPanel from './SetupPanel.vue';
import PlayingPanel from './PlayingPanel.vue';
import EmptyMapHint from './EmptyMapHint.vue';
import TimeDisplay from './TimeDisplay.vue';
import TravelInfo from './TravelInfo.vue';

const { isMenuPhase, isSetupPhase, isPlayingPhase, goToSetup, startGame, returnToMenu } = useGameStore();
const timeStore = useTimeStore();

const {
  mapContainer,
  isGenerating,
  isSaving,
  isLoadingSave,
  isHeightmapMode,
  hasMap,
  erosionEnabled,
  seedInput,
  saveMessage,
  generateMap,
  loadLatestSave,
  saveCurrentMap,
  toggleViewMode,
  randomizeSeed,
  clearMap,
  resetConfig,
  getPlayerLayer
} = useMapGenerator();

// 创建新游戏（重置配置并进入设置阶段）
const handleNewGame = () => {
  resetConfig();
  goToSetup();
};

// 加载存档后直接进入游戏
const handleLoadAndPlay = async () => {
  await loadLatestSave();
  if (hasMap.value) {
    startGame();
  }
};

// 返回主菜单（清理地图）
const handleReturnToMenu = () => {
  clearMap();
  returnToMenu();
};

// 游戏主循环
let animationFrameId: number | null = null;

function gameLoop(timestamp: number) {
  // 更新时间系统
  if (isPlayingPhase.value) {
    timeStore.update(timestamp);
  }

  // 继续循环
  animationFrameId = requestAnimationFrame(gameLoop);
}

// 启动和停止游戏循环
onMounted(() => {
  animationFrameId = requestAnimationFrame(gameLoop);
  console.log('🎮 游戏循环已启动');
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log('🛑 游戏循环已停止');
  }
});

// 当进入游戏阶段时，初始化时间系统
watch(isPlayingPhase, (playing) => {
  if (playing) {
    // 如果是新游戏，重置时间
    if (timeStore.totalDays.value === 0) {
      timeStore.reset(0);
      console.log('🕐 时间系统已初始化');
    }
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
      <TimeDisplay />
    </div>

    <!-- 游戏阶段：旅行信息显示在左下角 -->
    <div v-if="isPlayingPhase" class="travel-panel">
      <TravelInfo :player-layer="getPlayerLayer()" />
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
</style>
