<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import { useMapGenerator } from '../composables/useMapGenerator';
import SetupPanel from './SetupPanel.vue';
import PlayingPanel from './PlayingPanel.vue';
import EmptyMapHint from './EmptyMapHint.vue';

const { isSetupPhase, isPlayingPhase, startGame, returnToSetup } = useGameStore();

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
  randomizeSeed
} = useMapGenerator();
</script>

<template>
  <div class="map-wrapper">
    <!-- Full-screen canvas container -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- 设置阶段：控制面板在角落，地图可见 -->
    <div v-if="isSetupPhase" class="map-controls">
      <SetupPanel
        :seed-input="seedInput"
        :erosion-enabled="erosionEnabled"
        :is-generating="isGenerating"
        :is-loading-save="isLoadingSave"
        :is-saving="isSaving"
        :has-map="hasMap"
        :save-message="saveMessage"
        @generate="generateMap"
        @load="loadLatestSave"
        @start="startGame"
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
        @return-setup="returnToSetup"
      />
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
</style>
