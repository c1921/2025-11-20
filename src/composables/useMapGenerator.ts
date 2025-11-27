/**
 * @deprecated 此文件已废弃，请使用 src/composables/useWorld.ts 代替
 *
 * 旧版地图生成器组合式函数
 * 已被统一的 World 系统取代
 *
 * 迁移指南：
 * - useMapGenerator() -> useWorld()
 * - mapGenerator.generateMap() -> world.createWorld()
 * - mapGenerator.saveCurrentMap() -> saveWorld()
 * - mapGenerator.loadLatestSave() -> loadLatestSave()
 * - mapGenerator.hasMap -> snapshot.isInitialized
 *
 * 此文件保留仅用于参考，未来版本将删除
 */

import { ref, onUnmounted } from 'vue';
import { MapGenerator } from '../map/MapGenerator';
import { MapPersistence, type MapSaveRecord } from '../map/storage/MapPersistence';
import { useTimeStore } from '../stores/timeStore';

const SAVE_SLOT_ID = 'latest';

export function useMapGenerator() {
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

  // 获取时间系统状态
  const timeStore = useTimeStore();

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

  // 初始化随机种子
  applyRandomSeed();

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

    // 添加时间系统状态
    const record: MapSaveRecord = {
      id: SAVE_SLOT_ID,
      title: `种子 ${payload.seed} 的存档`,
      ...payload,
      time: timeStore.getState(),
    };

    isSaving.value = true;
    try {
      await MapPersistence.save(record);
      saveMessage.value = '已保存到本地 IndexedDB（覆盖 latest 槽位）';
      console.log('💾 已保存本地存档（含时间状态）', record);
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

      // 加载时间系统状态
      if (record.time) {
        timeStore.loadState(record.time);
        console.log('🕐 已加载时间状态', record.time);
      } else {
        // 旧版存档没有时间数据，重置为初始状态
        timeStore.reset(0);
        console.log('🕐 旧版存档，时间系统已重置');
      }

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

      if (mapGenerator) {
        mapGenerator.destroy();
        mapGenerator = null;
      }

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

  const cleanup = () => {
    if (mapGenerator) {
      mapGenerator.destroy();
      mapGenerator = null;
    }
    hasMap.value = false;
  };

  // 清理地图（返回主菜单时调用）
  const clearMap = () => {
    cleanup();
    saveMessage.value = '';
    isHeightmapMode.value = false;
    console.log('🗑️ 地图已清理');
  };

  // 重置配置（创建新游戏时调用）
  const resetConfig = () => {
    applyRandomSeed();
    erosionEnabled.value = false;
    saveMessage.value = '';
    console.log('🔄 配置已重置');
  };

  onUnmounted(cleanup);

  // 暴露给调试
  if (typeof window !== 'undefined') {
    (window as any).mapGenerator = mapGenerator;
  }

  // 获取玩家图层实例
  const getPlayerLayer = () => {
    return mapGenerator?.getPlayerLayer() ?? null;
  };

  return {
    // Refs
    mapContainer,
    isGenerating,
    isSaving,
    isLoadingSave,
    isHeightmapMode,
    hasMap,
    erosionEnabled,
    seedInput,
    saveMessage,

    // Methods
    generateMap,
    loadLatestSave,
    saveCurrentMap,
    toggleViewMode,
    randomizeSeed,
    clearMap,
    resetConfig,
    cleanup,
    getPlayerLayer
  };
}
