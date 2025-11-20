import * as PIXI from 'pixi.js';
import type { TerrainType } from './types';

/**
 * 将高度图数据转换为彩色地形纹理
 * 将整个地图渲染为单个位图（非基于瓦片）
 */
export class TerrainRenderer {
  /**
   * 带有高度阈值的地形颜色定义
   */
  private static readonly TERRAIN_COLORS: Record<string, TerrainType> = {
    deepOcean: { r: 25, g: 45, b: 95, threshold: 0.0 },
    ocean: { r: 44, g: 76, b: 130, threshold: 0.25 }, // 降低海洋阈值
    shallowOcean: { r: 60, g: 95, b: 150, threshold: 0.32 }, // 降低浅海阈值
    beach: { r: 210, g: 190, b: 130, threshold: 0.35 }, // 降低海滩阈值（海陆分界线）
    plains: { r: 85, g: 140, b: 55, threshold: 0.42 },
    grassland: { r: 95, g: 150, b: 65, threshold: 0.52 },
    hills: { r: 100, g: 125, b: 75, threshold: 0.65 },
    highlands: { r: 115, g: 110, b: 90, threshold: 0.75 },
    mountains: { r: 135, g: 125, b: 115, threshold: 0.85 },
    peaks: { r: 200, g: 200, b: 210, threshold: 0.95 },
  };

  /**
   * 将高度图转换为 Pixi.js 纹理
   * 从高度数据创建单个位图纹理
   *
   * @param heightmap - 包含归一化高度值 (0.0-1.0) 的 Float32Array
   * @param width - 地图宽度（像素）
   * @param height - 地图高度（像素）
   * @param useInterpolation - 启用地形类型之间的平滑颜色过渡
   * @returns 准备作为精灵渲染的 PIXI.Texture
   */
  static heightmapToTexture(
    heightmap: Float32Array,
    width: number,
    height: number,
    useInterpolation: boolean = true
  ): PIXI.Texture {
    // 创建用于像素操作的离屏画布
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!;

    // 获取可写图像数据缓冲区
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    // 将每个高度值转换为 RGB 颜色
    for (let i = 0; i < heightmap.length; i++) {
      const heightValue = heightmap[i]!;

      let color: TerrainType;
      if (useInterpolation) {
        color = this.getInterpolatedTerrainColor(heightValue);
      } else {
        color = this.getTerrainColor(heightValue);
      }

      // 写入 RGBA 值
      const pixelIdx = i * 4;
      pixels[pixelIdx + 0] = color.r;
      pixels[pixelIdx + 1] = color.g;
      pixels[pixelIdx + 2] = color.b;
      pixels[pixelIdx + 3] = 255; // 完全不透明
    }

    // 将像素数据写入画布
    ctx.putImageData(imageData, 0, 0);

    // 将画布转换为 Pixi.js GPU 纹理
    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'linear'; // 缩放时平滑缩放
    return texture;
  }

  /**
   * 根据高度阈值获取地形颜色（离散）
   */
  private static getTerrainColor(height: number): TerrainType {
    const terrainTypes = Object.values(this.TERRAIN_COLORS);

    // 查找仍低于高度值的最高阈值
    for (let i = terrainTypes.length - 1; i >= 0; i--) {
      const terrain = terrainTypes[i];
      if (terrain && height >= terrain.threshold) {
        return terrain;
      }
    }

    // 回退到最深的海洋
    return terrainTypes[0]!;
  }

  /**
   * 获取插值地形颜色以实现平滑过渡
   */
  private static getInterpolatedTerrainColor(height: number): TerrainType {
    const terrainTypes = Object.values(this.TERRAIN_COLORS);

    // 查找要在其间插值的两种地形类型
    let lowerType = terrainTypes[0]!;
    let upperType = terrainTypes[0]!;

    for (let i = 0; i < terrainTypes.length - 1; i++) {
      const currentTerrain = terrainTypes[i];
      const nextTerrain = terrainTypes[i + 1];

      if (currentTerrain && nextTerrain && height >= currentTerrain.threshold && height < nextTerrain.threshold) {
        lowerType = currentTerrain;
        upperType = nextTerrain;
        break;
      } else if (height >= terrainTypes[terrainTypes.length - 1]!.threshold) {
        // 高于最高阈值
        return terrainTypes[terrainTypes.length - 1]!;
      }
    }

    // 计算插值因子
    const range = upperType.threshold - lowerType.threshold;
    const t = range > 0 ? (height - lowerType.threshold) / range : 0;

    // 颜色之间的线性插值
    return {
      r: Math.round(lowerType.r + (upperType.r - lowerType.r) * t),
      g: Math.round(lowerType.g + (upperType.g - lowerType.g) * t),
      b: Math.round(lowerType.b + (upperType.b - lowerType.b) * t),
      threshold: height,
    };
  }

  /**
   * 基于坡度应用简单阴影以获得更逼真的外观
   * 可选增强 - 在山脉上创建光照效果
   */
  static heightmapToTextureWithShading(
    heightmap: Float32Array,
    width: number,
    height: number
  ): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const heightValue = heightmap[idx]!;

        // 获取基础地形颜色
        const color = this.getInterpolatedTerrainColor(heightValue);

        // 计算基于坡度的阴影
        const shadingFactor = this.calculateShading(heightmap, x, y, width, height);

        // 将阴影应用于颜色
        const pixelIdx = idx * 4;
        pixels[pixelIdx + 0] = Math.min(255, color.r * shadingFactor);
        pixels[pixelIdx + 1] = Math.min(255, color.g * shadingFactor);
        pixels[pixelIdx + 2] = Math.min(255, color.b * shadingFactor);
        pixels[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    return texture;
  }

  /**
   * 基于高度梯度（坡度）计算阴影因子
   * 模拟来自左上方向的光照
   */
  private static calculateShading(
    heightmap: Float32Array,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const getHeight = (px: number, py: number): number => {
      if (px < 0 || px >= width || py < 0 || py >= height) {
        return heightmap[y * width + x]!; // 当前高度作为回退
      }
      return heightmap[py * width + px]!;
    };

    const currentHeight = getHeight(x, y);
    const rightHeight = getHeight(x + 1, y);
    const bottomHeight = getHeight(x, y + 1);

    // 计算梯度
    const dx = rightHeight - currentHeight;
    const dy = bottomHeight - currentHeight;

    // 模拟来自左上方的光照 (-1, -1, 1 方向)
    const lightDotProduct = -dx - dy + 0.5;

    // 转换为阴影因子（0.7 到 1.3 范围）
    const shadingFactor = 1.0 + lightDotProduct * 0.3;

    return Math.max(0.7, Math.min(1.3, shadingFactor));
  }

  /**
   * 获取给定高度值的地形类型名称
   * 用于调试和游戏逻辑
   */
  static getTerrainTypeName(height: number): string {
    const entries = Object.entries(this.TERRAIN_COLORS);

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry && height >= entry[1].threshold) {
        return entry[0];
      }
    }

    return 'deepOcean';
  }

  /**
   * 导出当前地形配色方案
   * 用于 UI 图例或模组支持
   */
  static getTerrainColorScheme(): Record<string, TerrainType> {
    return { ...this.TERRAIN_COLORS };
  }
}
