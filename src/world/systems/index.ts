/**
 * World 系统模块统一导出
 */

export { CharacterManager } from './CharacterManager';
export { TimeSystem } from './TimeSystem';
export { MapSystem } from './MapSystem';

export type {
  Character,
  CharacterId,
  CharacterAttributes,
  CharacterManagerState,
} from './CharacterTypes';

export type { TimeSystemState } from './TimeSystem';
export type { MapSystemConfig, MapSystemSaveData } from './MapSystem';
