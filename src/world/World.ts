import type { WorldConfig, WorldSnapshot, WorldSaveData } from './types';
import { TimeSystem } from './systems/TimeSystem';
import { MapSystem } from './systems/MapSystem';
import { CharacterManager } from './systems/CharacterManager';

/**
 * 游戏世界的核心状态系统
 * 负责协调地图、时间、角色、事件等所有子系统
 */
export class World {
  private isInitialized = false;
  private isRunning = false;
  private readonly config: WorldConfig;
  private timeSystem: TimeSystem | null = null;
  private mapSystem: MapSystem | null = null;
  private characterManager: CharacterManager | null = null;

  constructor(config: WorldConfig) {
    this.config = config;
    console.log('🌍 World: 已创建');
  }

  /**
   * 初始化世界（创建新游戏）
   */
  async initialize(): Promise<void> {
    this.timeSystem = new TimeSystem();
    this.mapSystem = new MapSystem(this.config.mapConfig);
    this.characterManager = new CharacterManager();

    await this.mapSystem.initialize();
    this.mapSystem.setTimeSystem(this.timeSystem);

    // 生成角色并分布到地图上
    const settlements = this.mapSystem.getGenerator().getMapData()?.settlements || [];
    if (settlements.length > 0) {
      this.characterManager.generateRandomCharacters(100, settlements.length);
    }

    this.isInitialized = true;
    console.log('✅ World: 所有系统已初始化');
  }

  /**
   * 从存档加载世界
   */
  async loadFromSave(container: HTMLElement, save: WorldSaveData): Promise<void> {
    this.destroy();

    this.timeSystem = new TimeSystem();
    this.timeSystem.loadState(save.time);

    this.mapSystem = new MapSystem({
      container,
      width: save.map.width,
      height: save.map.height,
      seed: save.map.seed,
      useShading: save.map.useShading,
      enableErosion: save.map.enableErosion,
    });

    await this.mapSystem.loadFromSave(save.map);
    this.mapSystem.setTimeSystem(this.timeSystem);

    this.characterManager = new CharacterManager();
    if (save.characters) {
      this.characterManager.loadState(save.characters);
    }

    this.isInitialized = true;
    console.log('✅ World: 从存档加载完成');
  }

  /**
   * 启动世界（开始 tick 循环）
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('World 未初始化');
    }
    this.isRunning = true;
    console.log('▶️ World: 已启动');
  }

  /**
   * 暂停世界
   */
  pause(): void {
    this.isRunning = false;
    console.log('⏸️ World: 已暂停');
  }

  /**
   * 销毁世界（清理所有资源）
   */
  destroy(): void {
    console.log('🗑️ World: 正在销毁...');
    this.mapSystem?.destroy();
    this.timeSystem = null;
    this.mapSystem = null;
    this.characterManager = null;
    this.isInitialized = false;
    this.isRunning = false;
    console.log('✅ World: 已销毁');
  }

  /**
   * 世界的主更新循环
   * @param timestamp 当前时间戳（毫秒）
   */
  tick(timestamp: number): void {
    if (!this.isRunning || !this.timeSystem) return;
    this.timeSystem.update(timestamp);
  }

  /**
   * 获取时间系统（供 UI 访问）
   */
  getTimeSystem(): TimeSystem | null {
    return this.timeSystem;
  }

  /**
   * 获取地图系统（供 UI 访问）
   */
  getMapSystem(): MapSystem | null {
    return this.mapSystem;
  }

  /**
   * 获取角色管理器（供 UI 访问）
   */
  getCharacterManager(): CharacterManager | null {
    return this.characterManager;
  }

  /**
   * 获取配置信息
   */
  getConfig(): WorldConfig {
    return this.config;
  }

  /**
   * 获取世界状态快照（用于 UI 绑定）
   */
  getSnapshot(): WorldSnapshot {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      currentTime: this.timeSystem?.getCurrentTime() ?? null,
      playerPosition: this.mapSystem?.getPlayerPosition() ?? null,
    };
  }

  /**
   * 生成存档数据
   */
  createSaveData(): WorldSaveData {
    if (!this.isInitialized || !this.timeSystem || !this.mapSystem || !this.characterManager) {
      throw new Error('World 未初始化，无法创建存档');
    }

    const mapSaveData = this.mapSystem.createSaveData();
    const characterData = this.characterManager.getState();

    return {
      version: 1,
      createdAt: Date.now(),
      time: this.timeSystem.getState(),
      map: mapSaveData,
      characters: characterData,
    };
  }
}
