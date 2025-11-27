import { MapGenerator } from '../../map/MapGenerator';
import type { PlayerLayer } from '../../map/render/PlayerLayer';
import type { MapSavePayload } from '../../map/storage/MapPersistence';
import type { TimeSystem } from './TimeSystem';

/**
 * 地图系统（整合 MapGenerator + PlayerLayer）
 * 作为 World 和 MapGenerator 之间的适配层
 */
export class MapSystem {
  private generator: MapGenerator;
  private playerLayer: PlayerLayer | null = null;
  private config: MapSystemConfig;
  private timeSystem: TimeSystem | null = null;

  constructor(config: MapSystemConfig) {
    this.config = config;
    this.generator = new MapGenerator();
  }

  /**
   * 设置时间系统引用（由 World 注入，解耦依赖）
   */
  setTimeSystem(timeSystem: TimeSystem): void {
    this.timeSystem = timeSystem;

    if (this.playerLayer) {
      this.playerLayer.setTimeSystem(timeSystem);
    }
  }

  /**
   * 初始化地图
   */
  async initialize(): Promise<void> {
    await this.generator.initialize(this.config);
    this.playerLayer = this.generator.getPlayerLayer();

    if (this.playerLayer && this.timeSystem) {
      this.playerLayer.setTimeSystem(this.timeSystem);
    }
  }

  /**
   * 从存档加载地图
   */
  async loadFromSave(save: MapSystemSaveData): Promise<void> {
    await this.generator.loadFromSave(this.config.container, save);
    this.playerLayer = this.generator.getPlayerLayer();

    if (this.playerLayer && this.timeSystem) {
      this.playerLayer.setTimeSystem(this.timeSystem);
    }
  }

  /**
   * 生成存档数据
   */
  createSaveData(): MapSystemSaveData {
    const payload = this.generator.createSavePayload();
    if (!payload) throw new Error('无法生成存档数据');
    return payload;
  }

  /**
   * 获取玩家位置
   */
  getPlayerPosition(): { x: number; y: number } | null {
    return this.playerLayer?.getPosition() ?? null;
  }

  /**
   * 获取地图生成器（供 UI 访问）
   */
  getGenerator(): MapGenerator {
    return this.generator;
  }

  /**
   * 获取玩家图层（供 UI 访问）
   */
  getPlayerLayer(): PlayerLayer | null {
    return this.playerLayer;
  }

  /**
   * 销毁地图系统
   */
  destroy(): void {
    this.generator.destroy();
    this.playerLayer = null;
    this.timeSystem = null;
  }
}

/**
 * 地图系统配置
 */
export interface MapSystemConfig {
  container: HTMLElement;
  width: number;
  height: number;
  seed: number;
  useShading: boolean;
  enableErosion: boolean;
}

/**
 * 地图系统存档数据
 */
export type MapSystemSaveData = MapSavePayload;
