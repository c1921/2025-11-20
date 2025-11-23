import { ref, computed } from 'vue';
import { GamePhase } from '../map/core/types';

/**
 * 游戏状态管理 Store
 * 使用 Vue Composition API 实现简单的状态管理
 */

// 当前游戏阶段
const currentPhase = ref<GamePhase>(GamePhase.MENU);

// 计算属性
const isMenuPhase = computed(() => currentPhase.value === GamePhase.MENU);
const isSetupPhase = computed(() => currentPhase.value === GamePhase.SETUP);
const isPlayingPhase = computed(() => currentPhase.value === GamePhase.PLAYING);

/**
 * 进入设置阶段（创建新游戏）
 */
function goToSetup() {
  currentPhase.value = GamePhase.SETUP;
  console.log('⚙️ 进入设置阶段');
}

/**
 * 开始游戏（从设置阶段进入游戏阶段）
 */
function startGame() {
  currentPhase.value = GamePhase.PLAYING;
  console.log('🎮 进入游戏阶段');
}

/**
 * 返回设置阶段
 */
function returnToSetup() {
  currentPhase.value = GamePhase.SETUP;
  console.log('⚙️ 返回设置阶段');
}

/**
 * 返回主菜单
 */
function returnToMenu() {
  currentPhase.value = GamePhase.MENU;
  console.log('🏠 返回主菜单');
}

/**
 * 重置为初始状态
 */
function reset() {
  currentPhase.value = GamePhase.MENU;
}

export function useGameStore() {
  return {
    // 状态
    currentPhase,

    // 计算属性
    isMenuPhase,
    isSetupPhase,
    isPlayingPhase,

    // 方法
    goToSetup,
    startGame,
    returnToSetup,
    returnToMenu,
    reset
  };
}
