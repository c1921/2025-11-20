import { ref, readonly, onUnmounted } from 'vue';
import { World } from '../world/World';
import type { WorldConfig, WorldSnapshot, WorldSaveData } from '../world/types';
import { MapPersistence } from '../map/storage/MapPersistence';

/**
 * World 的 Vue 集成层
 * 提供响应式状态和方法供组件使用
 */
export function useWorld() {
  // ==================== 响应式状态 ====================
  const worldRef = ref<World | null>(null);
  const snapshot = ref<WorldSnapshot>({
    isInitialized: false,
    isRunning: false,
    currentTime: null,
    playerPosition: null,
  });

  // ==================== 生命周期 ====================
  let animationFrameId: number | null = null;

  /**
   * 创建新世界
   */
  async function createWorld(config: WorldConfig): Promise<void> {
    destroyWorld();

    const world = new World(config);
    await world.initialize();

    worldRef.value = world;
    updateSnapshot();

    // 开发环境调试
    if (import.meta.env.DEV) {
      (window as any).__world__ = world;
    }
  }

  /**
   * 启动世界循环
   */
  function startWorld(): void {
    if (!worldRef.value) return;

    worldRef.value.start();
    startGameLoop();
  }

  /**
   * 暂停世界
   */
  function pauseWorld(): void {
    worldRef.value?.pause();
    stopGameLoop();
  }

  /**
   * 销毁世界
   */
  function destroyWorld(): void {
    stopGameLoop();
    worldRef.value?.destroy();
    worldRef.value = null;
    snapshot.value = {
      isInitialized: false,
      isRunning: false,
      currentTime: null,
      playerPosition: null,
    };
  }

  // ==================== 游戏循环 ====================

  function startGameLoop(): void {
    if (animationFrameId !== null) return;

    function loop(timestamp: number) {
      worldRef.value?.tick(timestamp);
      updateSnapshot();
      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
    console.log('🎮 游戏循环已启动');
  }

  function stopGameLoop(): void {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      console.log('🛑 游戏循环已停止');
    }
  }

  function updateSnapshot(): void {
    if (!worldRef.value) return;
    snapshot.value = worldRef.value.getSnapshot();
  }

  // ==================== 存档/读档 ====================

  /**
   * 保存当前世界到 IndexedDB
   */
  async function saveWorld(): Promise<void> {
    if (!worldRef.value) {
      throw new Error('没有可保存的世界');
    }

    const saveData = worldRef.value.createSaveData();

    // 转换为 MapSaveRecord 格式
    await MapPersistence.save({
      id: 'world-save-' + saveData.createdAt,
      version: saveData.map.version, // 使用 MapSavePayload 的版本号
      seed: saveData.map.seed,
      width: saveData.map.width,
      height: saveData.map.height,
      useShading: saveData.map.useShading,
      enableErosion: saveData.map.enableErosion,
      createdAt: saveData.createdAt,
      map: saveData.map.map,
      player: saveData.map.player,
      time: saveData.time,
    });

    console.log('💾 世界已保存');
  }

  /**
   * 从 IndexedDB 加载最新存档
   */
  async function loadLatestSave(container: HTMLElement): Promise<boolean> {
    const latestSave = await MapPersistence.latest();

    if (!latestSave) {
      console.log('📂 没有找到存档');
      return false;
    }

    destroyWorld();

    // 转换 MapSaveRecord 为 WorldSaveData
    const worldSaveData: WorldSaveData = {
      version: latestSave.version,
      createdAt: latestSave.createdAt,
      time: latestSave.time ?? { totalDays: 0, timeSpeed: 0 },
      map: {
        version: latestSave.version,
        seed: latestSave.seed,
        width: latestSave.width,
        height: latestSave.height,
        useShading: latestSave.useShading,
        enableErosion: latestSave.enableErosion,
        createdAt: latestSave.createdAt,
        map: latestSave.map,
        player: latestSave.player,
        time: latestSave.time,
      },
      // 旧存档没有角色数据，使用空数组
      characters: {
        characters: [],
        nextId: 1,
      },
    };

    const world = new World({
      mapConfig: {
        container,
        width: latestSave.width,
        height: latestSave.height,
        seed: latestSave.seed,
        useShading: latestSave.useShading,
        enableErosion: latestSave.enableErosion,
      },
    });

    await world.loadFromSave(container, worldSaveData);

    worldRef.value = world;
    updateSnapshot();

    if (import.meta.env.DEV) {
      (window as any).__world__ = world;
    }

    console.log('📂 存档加载完成');
    return true;
  }

  // ==================== 清理 ====================

  onUnmounted(() => {
    destroyWorld();
  });

  // ==================== 返回 API ====================

  return {
    // 状态 - 直接返回 ref，让组件自己决定如何使用
    world: worldRef,
    snapshot: readonly(snapshot),

    // 方法
    createWorld,
    startWorld,
    pauseWorld,
    destroyWorld,
    saveWorld,
    loadLatestSave,
  };
}
