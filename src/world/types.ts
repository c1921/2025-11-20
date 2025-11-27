import type { GameTime } from '../time/types';
import type { MapSavePayload } from '../map/storage/MapPersistence';
import type { TimeSystemState } from './systems/TimeSystem';

/**
 * World 配置
 */
export interface WorldConfig {
  mapConfig: {
    container: HTMLElement;
    width: number;
    height: number;
    seed: number;
    useShading: boolean;
    enableErosion: boolean;
  };
}

/**
 * World 状态快照（用于 UI 响应式绑定）
 */
export interface WorldSnapshot {
  isInitialized: boolean;
  isRunning: boolean;
  currentTime: GameTime | null;
  playerPosition: { x: number; y: number } | null;
}

/**
 * World 存档数据
 */
export interface WorldSaveData {
  version: 1;
  createdAt: number;
  time: TimeSystemState;
  map: MapSavePayload;
}
