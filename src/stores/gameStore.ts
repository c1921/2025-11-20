import { ref, computed } from 'vue';
import { GamePhase } from '../map/core/types';

/**
 * 游戏状态管理 Store
 * 使用 Vue Composition API 实现简单的状态管理
 */

// 当前游戏阶段
const currentPhase = ref<GamePhase>(GamePhase.SETUP);

// 计算属性
const isSetupPhase = computed(() => currentPhase.value === GamePhase.SETUP);
const isPlayingPhase = computed(() => currentPhase.value === GamePhase.PLAYING);

/**
 * 开始游戏（从设置阶段进入游戏阶段）
 */
function startGame() {
  if (currentPhase.value === GamePhase.SETUP) {
    currentPhase.value = GamePhase.PLAYING;
    console.log('🎮 进入游戏阶段');
  }
}

/**
 * 返回设置阶段
 */
function returnToSetup() {
  if (currentPhase.value === GamePhase.PLAYING) {
    currentPhase.value = GamePhase.SETUP;
    console.log('⚙️ 返回设置阶段');
  }
}

/**
 * 重置为初始状态
 */
function reset() {
  currentPhase.value = GamePhase.SETUP;
}

export function useGameStore() {
  return {
    // 状态
    currentPhase,

    // 计算属性
    isSetupPhase,
    isPlayingPhase,

    // 方法
    startGame,
    returnToSetup,
    reset
  };
}
