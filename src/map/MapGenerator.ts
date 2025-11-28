import * as PIXI from 'pixi.js';
import { HeightmapGenerator } from './core/HeightmapGenerator';
import { TerrainRenderer } from './core/TerrainRenderer';
import { SettlementGenerator } from './core/SettlementGenerator';
import { RoadGenerator } from './core/RoadGenerator';
import { TerrainLayer } from './render/TerrainLayer';
import { MapViewport } from './render/MapViewport';
import { SettlementLayer } from './render/SettlementLayer';
import { RoadLayer } from './render/RoadLayer';
import { SettlementClassifier } from './core/SettlementClassifier';
import { PlayerLayer } from './render/PlayerLayer';
import { RoadPathfinder } from './core/RoadPathfinder';
import type { RoadGraph } from './core/RoadPathfinder';
import type { MapData, Settlement, RoadSegment } from './core/types';
import type { MapSavePayload } from './storage/MapPersistence';
import { RoadSerializer } from './storage/RoadSerializer';

/**
 * 地图生成配置
 */
export interface MapGeneratorConfig {
  /** 地图宽度（像素） */
  width?: number;

  /** 地图高度（像素） */
  height?: number;

  /** 用于可重现地图的随机种子 */
  seed?: number;

  /** 启用地形阴影以实现光照效果 */
  useShading?: boolean;

  /** 是否启用基于流向/流量的侵蚀 */
  enableErosion?: boolean;

  /** Pixi 画布的容器元素 */
  container: HTMLElement;
}

/**
 * 地图生成和渲染的主控制器
 * 协调所有子系统以创建完整的交互式地图
 */
export class MapGenerator {
  private app!: PIXI.Application;
  private viewport!: MapViewport;
  private terrainLayer: TerrainLayer | null = null;
  private settlementLayer: SettlementLayer | null = null;
  private roadLayer: RoadLayer | null = null;
  private playerLayer: PlayerLayer | null = null;

  private mapData: MapData | null = null;
  private config!: Required<MapGeneratorConfig>;

  private isShowingHeightmap: boolean = false;
  private coloredTexture: PIXI.Texture | null = null;
  private heightmapTexture: PIXI.Texture | null = null;
  private roadGraph: RoadGraph | null = null;
  private currentSettlementIndex: number | null = null;
  private mapTapHandler: ((event: PIXI.FederatedPointerEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  // 定居点点击回调（由外部设置）
  public onSettlementClick: ((settlement: Settlement, index: number) => void) | null = null;
  public onSettlementRightClick: ((settlement: Settlement, index: number, event: PIXI.FederatedPointerEvent) => void) | null = null;

  /**
   * 初始化并生成地图
   *
   * @param config - 地图生成配置
   */
  async initialize(config: MapGeneratorConfig): Promise<void> {
    // 设置默认配置
    this.config = {
      width: config.width ?? 2048,
      height: config.height ?? 2048,
      seed: config.seed ?? Date.now(),
      useShading: config.useShading ?? true,
      enableErosion: config.enableErosion ?? false,
      container: config.container,
    };

    console.log('🗺️ 地图生成器：正在初始化...');

    // 步骤 1：创建 Pixi 应用
    await this.createPixiApp();

    // 步骤 2：生成高度图
    console.log('🏔️ 正在生成高度图...');
    const heightmap = this.generateHeightmap();
    const settlements = this.generateSettlements(heightmap);
    const roads = this.generateRoads(heightmap, settlements);
    this.classifySettlements(settlements, roads);

    this.resetLayerState();
    this.renderMap(heightmap, settlements, roads);

    console.log('✅ 地图生成器：初始化完成！');
    console.log(`   - 地图大小：${this.config.width}x${this.config.height}`);
    console.log(`   - 种子：${this.config.seed}`);
    console.log(`   - 侵蚀：${this.config.enableErosion ? '开启' : '关闭'}`);
  }

  /**
   * 创建并配置 Pixi.js 应用
   */
  private async createPixiApp(): Promise<void> {
    this.app = new PIXI.Application();

    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // 将画布添加到 DOM
    this.config.container.appendChild(this.app.canvas as HTMLCanvasElement);
  }

  /**
   * 使用 simplex 噪声生成高度图
   */
  private generateHeightmap(): Float32Array {
    const generator = new HeightmapGenerator({
      width: this.config.width,
      height: this.config.height,
      seed: this.config.seed,
      octaves: 6,
      persistence: 0.5,
      lacunarity: 2.0,
      applyIslandMask: true,
      erosion: {
        enabled: this.config.enableErosion,
        logDebug: true, // 输出侵蚀统计，便于观察效果
        erosionIterations: 100, // 多步叠加侵蚀
        strength: 0.0015, // 单步强度稍降，多轮叠加
        flowExponent: 0.8, // 提高大河刻蚀能力
        smoothingIterations: 0, // 先观察裸侵蚀效果
      },
    });

    // 使用域扭曲生成更有机的地形
    return generator.generateWithDomainWarping(0.08);
  }

  /**
   * 将高度图转换为 Pixi 纹理
   */
  private createTerrainTexture(heightmap: Float32Array): PIXI.Texture {
    if (this.config.useShading) {
      return TerrainRenderer.heightmapToTextureWithShading(
        heightmap,
        this.config.width,
        this.config.height
      );
    } else {
      return TerrainRenderer.heightmapToTexture(
        heightmap,
        this.config.width,
        this.config.height,
        true // 使用插值
      );
    }
  }

  /**
   * 根据高度图生成定居点数据
   */
  private generateSettlements(heightmap: Float32Array): Settlement[] {
    return SettlementGenerator.generate(
      heightmap,
      this.config.width,
      this.config.height,
      this.config.seed,
      {
        coastThreshold: 0.35, // 与地形海岸线保持一致
        fadeOutHeight: 0.92,
        stride: 4,
        baseChance: 0.1,
        maxSettlements: 10000,
      }
    );
  }

  /**
   * 根据定居点生成道路网络
   */
  private generateRoads(heightmap: Float32Array, settlements: Settlement[]): RoadSegment[] {
    return RoadGenerator.generate(settlements, {
      kNearest: 6,
      maxDistance: 360,
      forceMST: true,
      pathFactor: 1.15,
      heightmap,
      mapWidth: this.config.width,
      mapHeight: this.config.height,
      gridStep: 1,
      slopeCost: 15,
      waterThreshold: 0.35,
      waterPenalty: 8,
    });
  }

  /**
   * 根据适宜度与路网对定居点分类并生成城市分数
   */
  private classifySettlements(settlements: Settlement[], roads: RoadSegment[]): void {
    SettlementClassifier.classify(settlements, roads, {
      minCityHops: 4,
      cityShare: 0.05,
      minCities: 5,
      maxCities: 75,
    });
  }

  /**
   * 创建灰度高度图纹理（用于调试和可视化）
   * 复用 HeightmapGenerator 的调试预览功能
   */
  private createGrayscaleHeightmapTexture(heightmap: Float32Array): PIXI.Texture {
    // 使用 HeightmapGenerator 的静态方法生成灰度预览
    const canvas = HeightmapGenerator.createDebugPreview(heightmap, this.config.width, this.config.height);

    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    return texture;
  }

  /**
   * 基于给定数据渲染地图与各层
   */
  private renderMap(heightmap: Float32Array, settlements: Settlement[], roads: RoadSegment[]): void {
    console.log('🎨 正在渲染地形纹理...');
    const terrainTexture = this.createTerrainTexture(heightmap);
    const grayscaleTexture = this.createGrayscaleHeightmapTexture(heightmap);

    this.coloredTexture = terrainTexture;
    this.heightmapTexture = grayscaleTexture;

    this.mapData = {
      heightmap,
      width: this.config.width,
      height: this.config.height,
      terrainTexture,
      settlements,
      roads,
    };

    if (!this.viewport) {
      console.log('📷 正在设置视口...');
      this.setupViewport();
      this.setupResizeHandler();
    }

    const initialTexture =
      this.isShowingHeightmap && grayscaleTexture ? grayscaleTexture : terrainTexture;

    console.log('🖼️ 正在创建渲染层...');
    this.createRenderLayers(initialTexture, settlements, roads);

    console.log('🧭 正在配置导航...');
    this.setupNavigation(settlements, roads);
  }

  /**
   * 清理渲染层与交互状态（保留 Pixi 应用与视口）
   */
  private resetLayerState(): void {
    this.detachPointerHandler();
    this.terrainLayer?.destroy();
    this.settlementLayer?.destroy();
    this.roadLayer?.destroy();
    this.playerLayer?.destroy();

    this.terrainLayer = null;
    this.settlementLayer = null;
    this.roadLayer = null;
    this.playerLayer = null;
    this.roadGraph = null;
    this.currentSettlementIndex = null;
    this.mapData = null;
    this.coloredTexture = null;
    this.heightmapTexture = null;
  }


  /**
   * 设置平移和缩放的视口
   */
  private setupViewport(): void {
    this.viewport = new MapViewport(this.app, this.config.width, this.config.height);
  }

  /**
   * 创建地形渲染层
   */
  private createRenderLayers(
    terrainTexture: PIXI.Texture,
    settlements: Settlement[],
    roads: RoadSegment[]
  ): void {
    // 创建地形层（单个位图精灵）
    this.terrainLayer = new TerrainLayer(terrainTexture);
    this.terrainLayer.addToContainer(this.viewport.viewport);

    // 道路层
    this.roadLayer = new RoadLayer(roads);
    this.roadLayer.addToContainer(this.viewport.viewport);

    // 创建定居点层（叠加在地形之上）
    this.settlementLayer = new SettlementLayer(settlements, {
      onClick: (settlement) => {
        const index = settlements.indexOf(settlement);
        this.onSettlementClick?.(settlement, index);
      },
      onRightClick: (settlement, event) => {
        const index = settlements.indexOf(settlement);
        this.onSettlementRightClick?.(settlement, index, event);
      },
    });
    this.settlementLayer.addToContainer(this.viewport.viewport);
  }

  /**
   * 配置玩家标记、路网图以及点击交互
   */
  private setupNavigation(settlements: Settlement[], roads: RoadSegment[]): void {
    if (!this.viewport) return;

    this.detachPointerHandler();
    this.roadGraph = RoadPathfinder.buildGraph(roads, settlements.length);

    this.playerLayer?.destroy();
    this.playerLayer = new PlayerLayer(this.app);
    this.playerLayer.addToContainer(this.viewport.viewport);
    this.currentSettlementIndex = null;

    const spawnIdx = this.pickSpawnSettlementIndex(settlements);
    if (spawnIdx !== null) {
      const spawn = settlements[spawnIdx];
      if (spawn) {
        this.playerLayer.setPosition(spawn.x, spawn.y);
        this.currentSettlementIndex = spawnIdx;
        this.viewport.moveTo(spawn.x, spawn.y, false);
      }
    }

    // 注释掉地图点击移动功能，改用右键菜单触发移动
    // this.attachPointerHandler();
  }

  /**
   * 选择一个靠近中心且分数较高的定居点作为初始出生点
   */
  private pickSpawnSettlementIndex(settlements: Settlement[]): number | null {
    if (!settlements.length) return null;
    const cx = this.config.width * 0.5;
    const cy = this.config.height * 0.5;
    const maxDist = Math.max(1, Math.hypot(this.config.width, this.config.height));

    let best: { idx: number; score: number } | null = null;
    for (let i = 0; i < settlements.length; i++) {
      const s = settlements[i];
      if (!s) continue;
      const dist = Math.hypot(s.x - cx, s.y - cy);
      const distPenalty = (dist / maxDist) * 0.4;
      const categoryBoost =
        s.category === 'city' ? 0.6 : s.category === 'town' ? 0.3 : 0;
      const suitability = s.cityScore ?? s.suitability ?? 0;
      const score = suitability + categoryBoost - distPenalty;
      if (!best || score > best.score) {
        best = { idx: i, score };
      }
    }
    return best?.idx ?? null;
  }

  private findNearestSettlement(
    x: number,
    y: number,
    settlements: Settlement[],
  ): { index: number; settlement: Settlement; distance: number } | null {
    if (!settlements.length) return null;
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < settlements.length; i++) {
      const s = settlements[i];
      if (!s) continue;
      const dx = s.x - x;
      const dy = s.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) return null;
    return { index: bestIdx, settlement: settlements[bestIdx]!, distance: bestDist };
  }

  private findNearestSettlementIndex(
    x: number,
    y: number,
    settlements: Settlement[]
  ): number | null {
    const result = this.findNearestSettlement(x, y, settlements);
    return result ? result.index : null;
  }

  // private attachPointerHandler(): void {
  //   if (!this.viewport?.viewport) return;
  //   this.mapTapHandler = (event: PIXI.FederatedPointerEvent) => this.handleMapTap(event);
  //   this.viewport.viewport.on('pointertap', this.mapTapHandler);
  // }

  private detachPointerHandler(): void {
    if (this.mapTapHandler && this.viewport?.viewport) {
      this.viewport.viewport.off('pointertap', this.mapTapHandler);
    }
    this.mapTapHandler = null;
  }

  // private handleMapTap(event: PIXI.FederatedPointerEvent): void {
  //   if (!this.mapData || !this.playerLayer || !this.roadGraph) return;

  //   const world = this.viewport.screenToWorld(event.global.x, event.global.y);
  //   const target = this.findNearestSettlement(world.x, world.y, this.mapData.settlements);
  //   if (!target) return;

  //   const playerPos = this.playerLayer.getPosition();
  //   if (this.currentSettlementIndex === target.index && this.isSamePoint(playerPos, target.settlement)) {
  //     return; // 已在目标点附近
  //   }

  //   // 如果正在移动，先停止当前移动，重新规划路径
  //   if (this.playerLayer.isMoving) {
  //     console.log('🔄 中断当前移动，重新规划路径');
  //     this.playerLayer.stopMovement();
  //   }

  //   const startIdx = this.findNearestSettlementIndex(
  //     playerPos.x,
  //     playerPos.y,
  //     this.mapData.settlements
  //   );

  //   if (startIdx === null) return;

  //   const route = RoadPathfinder.shortestPath(startIdx, target.index, this.roadGraph);
  //   if (!route) {
  //     console.warn('未找到可通行的道路路径');
  //     return;
  //   }

  //   const path = RoadPathfinder.buildPointPath(
  //     route.nodes,
  //     this.mapData.roads,
  //     this.roadGraph,
  //     this.mapData.settlements
  //   );

  //   if (!path || !path.length) {
  //     console.warn('无法构建移动路径');
  //     return;
  //   }

  //   if (!this.isSamePoint(playerPos, path[0]!)) {
  //     path.unshift(playerPos);
  //   }

  //   this.playerLayer.moveAlongPath(path, {
  //     targetSettlement: target.index,
  //     onArrive: () => {
  //       this.currentSettlementIndex = target.index;
  //       console.log(`✅ 已到达 ${target.index} 号定居点`);
  //     },
  //   });

  //   console.log(`📍 前往 ${target.index} 号定居点`);
  // }

  /**
   * 移动到指定定居点（公开方法，供外部调用）
   * @param targetIndex 目标定居点索引
   */
  public moveToSettlement(targetIndex: number): void {
    if (!this.mapData || !this.playerLayer || !this.roadGraph) return;

    const target = this.mapData.settlements[targetIndex];
    if (!target) {
      console.error('❌ 目标定居点不存在');
      return;
    }

    const playerPos = this.playerLayer.getPosition();

    // 如果已在目标位置，不移动
    if (this.currentSettlementIndex === targetIndex &&
        this.isSamePoint(playerPos, target)) {
      console.log('⚠️ 已在目标位置');
      return;
    }

    // 中断当前移动
    if (this.playerLayer.isMoving) {
      console.log('🔄 中断当前移动，重新规划路径');
      this.playerLayer.stopMovement();
    }

    // 确定起点
    const startIdx = this.currentSettlementIndex ??
      this.findNearestSettlementIndex(playerPos.x, playerPos.y, this.mapData.settlements);

    if (startIdx === null) {
      console.error('❌ 无法确定起点');
      return;
    }

    // 寻路
    const route = RoadPathfinder.shortestPath(startIdx, targetIndex, this.roadGraph);
    if (!route) {
      console.error('❌ 无法找到路径');
      return;
    }

    // 构建点路径
    const path = RoadPathfinder.buildPointPath(
      route.nodes,
      this.mapData.roads,
      this.roadGraph,
      this.mapData.settlements
    );

    if (!path || !path.length) {
      console.error('❌ 无法构建路径点');
      return;
    }

    // 如果起点不在路径开始位置，添加当前位置
    if (!this.isSamePoint(playerPos, path[0]!)) {
      path.unshift(playerPos);
    }

    // 启动移动
    this.playerLayer.moveAlongPath(path, {
      targetSettlement: targetIndex,
      onArrive: () => {
        this.currentSettlementIndex = targetIndex;
        console.log(`✅ 已到达 ${targetIndex} 号定居点`);
      },
    });

    console.log(`🚀 开始移动: ${startIdx} → ${targetIndex}，总计 ${route.distance.toFixed(1)} 像素`);
  }

  private isSamePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy < 0.01;
  }

  /**
   * 设置窗口大小调整处理器
   */
  private setupResizeHandler(): void {
    if (this.resizeHandler) return;

    this.resizeHandler = () => {
      if (!this.app || !this.viewport) return;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 调整 Pixi 渲染器大小
      this.app.renderer.resize(width, height);

      // 调整视口大小
      this.viewport.handleResize(width, height);
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * 使用新种子重新生成地图
   *
   * @param seed - 新的随机种子
   */
  async regenerate(seed?: number): Promise<void> {
    console.log('🔄 正在重新生成地图...');

    this.config.seed = seed ?? Date.now();

    // 生成新数据
    const heightmap = this.generateHeightmap();
    const settlements = this.generateSettlements(heightmap);
    const roads = this.generateRoads(heightmap, settlements);
    this.classifySettlements(settlements, roads);

    this.resetLayerState();

    // 创建新层
    this.renderMap(heightmap, settlements, roads);

    console.log('✅ 地图已使用种子重新生成:', this.config.seed);
  }

  /**
   * 将当前地图导出为 PNG 图像
   */
  async exportMapImage(): Promise<void> {
    if (!this.app.renderer) return;

    // 渲染为图像
    const image = await this.app.renderer.extract.image(this.viewport.viewport);

    // 下载图像
    const link = document.createElement('a');
    link.download = `map-${this.config.seed}.png`;
    link.href = (image as HTMLImageElement).src;
    link.click();
  }

  /**
   * 获取当前地图数据
   */
  getMapData(): MapData | null {
    return this.mapData;
  }

  /**
   * 生成用于存档的纯数据快照（不含 PIXI 纹理）
   */
  createSavePayload(): MapSavePayload | null {
    if (!this.mapData || !this.config) return null;

    const heightmapCopy = new Float32Array(this.mapData.heightmap.length);
    heightmapCopy.set(this.mapData.heightmap);

    // 序列化道路数据
    const serializedRoads = RoadSerializer.serialize(this.mapData.roads);

    // 将 settlements 转换为纯对象数组（移除 Vue 的 Proxy 包装）
    const plainSettlements = this.mapData.settlements.map(s => ({
      x: s.x,
      y: s.y,
      elevation: s.elevation,
      suitability: s.suitability,
      islandId: s.islandId,
      islandArea: s.islandArea,
      roadDegree: s.roadDegree,
      secondHopReach: s.secondHopReach,
      cityScore: s.cityScore,
      category: s.category,
    }));

    return {
      version: 2,
      seed: this.config.seed,
      width: this.config.width,
      height: this.config.height,
      useShading: this.config.useShading,
      enableErosion: this.config.enableErosion,
      createdAt: Date.now(),
      map: {
        heightmap: heightmapCopy.buffer,
        settlements: plainSettlements,
        roadsData: serializedRoads,
      },
      player: this.playerLayer
        ? {
            ...this.playerLayer.getPosition(),
            currentSettlementIndex: this.currentSettlementIndex ?? null,
          }
        : undefined,
    };
  }

  /**
   * 使用存档快照初始化地图（绕过生成流程）
   */
  async loadFromSave(container: HTMLElement, save: MapSavePayload): Promise<void> {
    this.config = {
      width: save.width,
      height: save.height,
      seed: save.seed,
      useShading: save.useShading,
      enableErosion: save.enableErosion,
      container,
    };

    console.log('📂 正在从存档加载地图...');

    // 创建 Pixi 应用
    await this.createPixiApp();

    // 用存档覆盖当前层
    this.resetLayerState();

    const heightmap = new Float32Array(save.map.heightmap);
    const settlements = save.map.settlements ?? [];

    // 处理道路数据
    let roads: RoadSegment[];
    if (save.map.roadsData) {
      // 从序列化数据恢复
      roads = RoadSerializer.deserialize(save.map.roadsData);
    } else if (save.map.roads) {
      // 旧格式直接使用
      roads = save.map.roads;
    } else {
      roads = [];
    }

    // 使用已有视口直接渲染
    this.renderMap(heightmap, settlements, roads);

    // 恢复玩家位置
    if (save.player && this.playerLayer) {
      this.playerLayer.setPosition(save.player.x, save.player.y);
      this.currentSettlementIndex = save.player.currentSettlementIndex ?? null;
      this.viewport.moveTo(save.player.x, save.player.y, false);
    }

    this.isShowingHeightmap = false;
  }

  /**
   * 获取用于相机控制的视口
   */
  getViewport(): MapViewport {
    return this.viewport;
  }

  /**
   * 切换显示模式：灰度高度图 <-> 彩色地形图
   */
  toggleViewMode(): void {
    if (!this.coloredTexture || !this.heightmapTexture || !this.terrainLayer) {
      console.warn('纹理或地形层未初始化');
      return;
    }

    this.isShowingHeightmap = !this.isShowingHeightmap;

    // 获取当前要显示的纹理
    const newTexture = this.isShowingHeightmap ? this.heightmapTexture : this.coloredTexture;

    // 更新地形层的纹理
    const sprite = this.terrainLayer.getSprite();
    sprite.texture = newTexture;

    console.log(`📊 切换到${this.isShowingHeightmap ? '高度图' : '彩色地图'}模式`);
  }

  /**
   * 获取当前显示模式
   */
  isHeightmapMode(): boolean {
    return this.isShowingHeightmap;
  }

  /**
   * 获取玩家图层实例
   */
  getPlayerLayer(): PlayerLayer | null {
    return this.playerLayer;
  }

  /**
   * 销毁地图并清理所有资源
   */
  destroy(): void {
    console.log('🗑️ 正在销毁地图生成器...');

    this.detachPointerHandler();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.terrainLayer?.destroy();
    this.settlementLayer?.destroy();
    this.roadLayer?.destroy();
    this.playerLayer?.destroy();
    this.viewport?.destroy();

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }

    this.mapData = null;
    this.coloredTexture = null;
    this.heightmapTexture = null;
    this.settlementLayer = null;
    this.roadLayer = null;
    this.playerLayer = null;
    this.roadGraph = null;
    this.currentSettlementIndex = null;
  }
}
