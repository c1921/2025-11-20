<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useWorld } from '../composables/useWorld';
import type { World } from '../world/World';
import type { Settlement } from '../map/core/types';
import type { Character } from '../world/systems/CharacterTypes';
import MapContainer from '../components/layout/MapContainer.vue';
import MenuPanel from '../components/panels/MenuPanel.vue';
import SetupPanel from '../components/panels/SetupPanel.vue';
import WorldDebugPanel from '../components/panels/WorldDebugPanel.vue';
import TravelInfo from '../components/ui/TravelInfo.vue';
import EmptyMapHint from '../components/ui/EmptyMapHint.vue';
import TopBar from '../components/ui/TopBar.vue';
import BottomBar from '../components/ui/BottomBar.vue';
import GameDrawer from '../components/ui/GameDrawer.vue';
import SettlementContextMenu from '../components/overlays/SettlementContextMenu.vue';

const { isMenuPhase, isSetupPhase, isPlayingPhase, goToSetup, startGame, returnToMenu } = useGameStore();

const { world, snapshot, createWorld, startWorld, pauseWorld, destroyWorld, saveWorld, loadLatestSave } = useWorld();

// 地图容器引用
const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null);

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

// UI 面板状态
const selectedSettlement = ref<Settlement | null>(null);
const selectedSettlementIndex = ref<number | null>(null);
const selectedCharacter = ref<Character | null>(null);
const allCharacters = computed(() => world.value?.getCharacterManager()?.getAll() || []);

// 右键菜单状态
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuSettlement = ref<Settlement | null>(null);
const contextMenuSettlementIndex = ref<number | null>(null);

// 计算属性
const hasMap = computed(() => snapshot.value.isInitialized);
const isDev = import.meta.env.DEV;

// 获取地图容器元素
const getMapContainerElement = () => {
  return mapContainerRef.value?.getContainerElement() ?? null;
};

// 生成地图
const generateMap = async () => {
  const container = getMapContainerElement();
  if (!container) {
    console.error('地图容器未准备好');
    return;
  }

  isGenerating.value = true;
  try {
    const seed = parseInt(seedInput.value) || Date.now();

    await createWorld({
      mapConfig: {
        container,
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

// 处理定居点点击 - 打开抽屉显示定居点信息
const handleSettlementClick = (settlement: Settlement, index: number) => {
  selectedSettlement.value = settlement;
  selectedSettlementIndex.value = index;
  selectedCharacter.value = null;
  console.log('🏠 左键点击定居点:', settlement.category, 'index:', index);

  // 检查抽屉是否已打开，如果没打开才触发打开
  setTimeout(() => {
    const drawer = document.querySelector('#game-drawer');
    const isDrawerOpen = drawer?.classList.contains('open') || drawer?.classList.contains('overlay-open');

    if (!isDrawerOpen) {
      const drawerTrigger = document.querySelector('[data-overlay="#game-drawer"]');
      if (drawerTrigger) {
        (drawerTrigger as HTMLElement).click();
      }
    }
  }, 0);
};

// 处理定居点右键点击
const handleSettlementRightClick = (settlement: Settlement, index: number, event: any) => {
  const screenPos = event.global;
  contextMenuPosition.value = { x: screenPos.x, y: screenPos.y };
  contextMenuSettlement.value = settlement;
  contextMenuSettlementIndex.value = index;
  contextMenuVisible.value = true;

  // 清空信息面板状态，确保不显示信息面板
  selectedSettlement.value = null;
  selectedSettlementIndex.value = null;
  selectedCharacter.value = null;

  console.log('🖱️ 右键点击定居点:', settlement.category, 'index:', index);
};

// 处理角色选择
const handleSelectCharacter = (character: Character) => {
  selectedCharacter.value = character;
  // 角色选择时确保抽屉已打开
  setTimeout(() => {
    const drawer = document.querySelector('#game-drawer');
    const isDrawerOpen = drawer?.classList.contains('open') || drawer?.classList.contains('overlay-open');

    if (!isDrawerOpen) {
      const drawerTrigger = document.querySelector('[data-overlay="#game-drawer"]');
      if (drawerTrigger) {
        (drawerTrigger as HTMLElement).click();
      }
    }
  }, 0);
};

// 关闭角色详情（返回定居点）
const handleCloseCharacter = () => {
  selectedCharacter.value = null;
};

// 处理"移动到此处"
const handleMoveTo = () => {
  if (contextMenuSettlementIndex.value === null) return;

  const generator = world.value?.getMapSystem()?.getGenerator();
  if (generator) {
    generator.moveToSettlement(contextMenuSettlementIndex.value);
  }

  // 关闭菜单
  closeContextMenu();
};

// 关闭上下文菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false;
  contextMenuSettlement.value = null;
  contextMenuSettlementIndex.value = null;
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
  const container = getMapContainerElement();
  if (!container) {
    console.error('地图容器未准备好');
    return;
  }

  isLoadingSave.value = true;
  saveMessage.value = '';

  try {
    const success = await loadLatestSave(container);
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

// 点击其他地方关闭菜单
const handleGlobalClick = (event: MouseEvent) => {
  if (contextMenuVisible.value) {
    // 检查点击是否在菜单外
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu')) {
      closeContextMenu();
    }
  }
};

// 监听游戏阶段，控制世界运行
watch(isPlayingPhase, (playing) => {
  if (playing) {
    startWorld();
    // 添加全局点击监听
    setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 0);
    // 重新初始化 overlay 组件（只初始化新渲染的抽屉，而不是整个页面）
    setTimeout(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit(['overlay']);
      }
    }, 100);
  } else {
    pauseWorld();
    // 移除全局点击监听
    document.removeEventListener('click', handleGlobalClick);
  }
});

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
});
</script>

<template>
  <div class="game-view">
    <!-- 地图容器（始终渲染，提供 Canvas DOM） -->
    <MapContainer
      ref="mapContainerRef"
      :world="worldValue"
      @settlement-click="handleSettlementClick"
      @settlement-right-click="handleSettlementRightClick"
    />

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

    <!-- 游戏阶段：顶部栏 -->
    <TopBar v-if="isPlayingPhase" :world="worldValue" />

    <!-- 游戏阶段：底部栏（包含时间控制和游戏控制） -->
    <BottomBar
      v-if="isPlayingPhase"
      :world="worldValue"
      :is-heightmap-mode="isHeightmapMode"
      :is-generating="isGenerating"
      :is-saving="isSaving"
      :save-message="saveMessage"
      @toggle-view="toggleViewMode"
      @save="saveCurrentMap"
      @return-menu="handleReturnToMenu"
    />

    <!-- 游戏阶段：旅行信息显示在左下角 -->
    <div v-if="isPlayingPhase" class="travel-panel">
      <TravelInfo :player-layer="getPlayerLayer()" />
    </div>

    <!-- 开发模式：World 调试面板显示在右下角 -->
    <div v-if="isDev && hasMap" class="debug-panel">
      <WorldDebugPanel :world="worldValue" :snapshot="snapshot" />
    </div>

    <!-- 游戏阶段：定居点右键菜单 -->
    <SettlementContextMenu
      v-if="isPlayingPhase && contextMenuVisible"
      :settlement="contextMenuSettlement"
      :settlement-index="contextMenuSettlementIndex"
      :position="contextMenuPosition"
      @move-to="handleMoveTo"
      @close="closeContextMenu"
    />

    <!-- 游戏抽屉（定居点信息/角色详情/游戏设置） -->
    <GameDrawer
      v-if="isPlayingPhase"
      :world="worldValue"
      :settlement="selectedSettlement"
      :settlement-index="selectedSettlementIndex"
      :characters="allCharacters"
      :selected-character="selectedCharacter"
      @select-character="handleSelectCharacter"
      @close-character="handleCloseCharacter"
    />
  </div>
</template>

<style scoped>
.game-view {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0a0a0f;
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

.travel-panel {
  position: absolute;
  bottom: 80px;
  left: 20px;
  z-index: 100;
}

.debug-panel {
  position: absolute;
  bottom: 80px;
  right: 20px;
  z-index: 100;
}
</style>
