import * as PIXI from 'pixi.js';
import { HeightmapGenerator } from './core/HeightmapGenerator';
import { TerrainRenderer } from './core/TerrainRenderer';
import { TerrainLayer } from './render/TerrainLayer';
import { MapViewport } from './render/MapViewport';
import type { MapData } from './core/types';

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
  private terrainLayer!: TerrainLayer;

  private mapData: MapData | null = null;
  private config!: Required<MapGeneratorConfig>;

  private isShowingHeightmap: boolean = false;
  private coloredTexture: PIXI.Texture | null = null;
  private heightmapTexture: PIXI.Texture | null = null;

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
      container: config.container,
    };

    console.log('🗺️ 地图生成器：正在初始化...');

    // 步骤 1：创建 Pixi 应用
    await this.createPixiApp();

    // 步骤 2：生成高度图
    console.log('🏔️ 正在生成高度图...');
    const heightmap = this.generateHeightmap();

    // 步骤 3：将高度图转换为纹理
    console.log('🎨 正在渲染地形纹理...');
    const terrainTexture = this.createTerrainTexture(heightmap);

    // 生成高度图灰度纹理
    this.heightmapTexture = this.createGrayscaleHeightmapTexture(heightmap);
    this.coloredTexture = terrainTexture;

    // 存储地图数据
    this.mapData = {
      heightmap,
      width: this.config.width,
      height: this.config.height,
      terrainTexture,
    };

    // 步骤 4：设置视口
    console.log('📷 正在设置视口...');
    this.setupViewport();

    // 步骤 5：创建渲染层
    console.log('🖼️ 正在创建渲染层...');
    this.createRenderLayers(terrainTexture);

    // 步骤 6：处理窗口大小调整
    this.setupResizeHandler();

    console.log('✅ 地图生成器：初始化完成！');
    console.log(`   - 地图大小：${this.config.width}x${this.config.height}`);
    console.log(`   - 种子：${this.config.seed}`);
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
   * 创建灰度高度图纹理（用于调试和可视化）
   */
  private createGrayscaleHeightmapTexture(heightmap: Float32Array): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = this.config.width;
    canvas.height = this.config.height;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(this.config.width, this.config.height);
    const pixels = imageData.data;

    for (let i = 0; i < heightmap.length; i++) {
      const height = heightmap[i] ?? 0;
      const gray = Math.floor(height * 255);
      const pixelIdx = i * 4;
      pixels[pixelIdx + 0] = gray;
      pixels[pixelIdx + 1] = gray;
      pixels[pixelIdx + 2] = gray;
      pixels[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    return texture;
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
  private createRenderLayers(terrainTexture: PIXI.Texture): void {
    // 创建地形层（单个位图精灵）
    this.terrainLayer = new TerrainLayer(terrainTexture);
    this.terrainLayer.addToContainer(this.viewport.viewport);
  }

  /**
   * 设置窗口大小调整处理器
   */
  private setupResizeHandler(): void {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 调整 Pixi 渲染器大小
      this.app.renderer.resize(width, height);

      // 调整视口大小
      this.viewport.handleResize(width, height);
    };

    window.addEventListener('resize', handleResize);
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
    const terrainTexture = this.createTerrainTexture(heightmap);

    // 生成高度图灰度纹理
    this.heightmapTexture = this.createGrayscaleHeightmapTexture(heightmap);
    this.coloredTexture = terrainTexture;

    // 更新地图数据
    this.mapData = {
      heightmap,
      width: this.config.width,
      height: this.config.height,
      terrainTexture,
    };

    // 销毁旧层
    this.terrainLayer.destroy();

    // 根据当前模式选择纹理
    const textureToUse = this.isShowingHeightmap ? this.heightmapTexture : this.coloredTexture;

    // 创建新层
    this.createRenderLayers(textureToUse);

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
   * 获取用于相机控制的视口
   */
  getViewport(): MapViewport {
    return this.viewport;
  }

  /**
   * 切换显示模式：灰度高度图 <-> 彩色地形图
   */
  toggleViewMode(): void {
    if (!this.coloredTexture || !this.heightmapTexture) {
      console.warn('纹理未初始化');
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
   * 销毁地图并清理所有资源
   */
  destroy(): void {
    console.log('🗑️ 正在销毁地图生成器...');

    this.terrainLayer?.destroy();
    this.viewport?.destroy();

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }

    this.mapData = null;
    this.coloredTexture = null;
    this.heightmapTexture = null;
  }
}
