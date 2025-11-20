/**
 * 地图生成系统的核心类型定义
 */
import * as PIXI from 'pixi.js';

/**
 * 地形类型定义，包含颜色和高度阈值
 */
export interface TerrainType {
  /** 红色分量 (0-255) */
  r: number;

  /** 绿色分量 (0-255) */
  g: number;

  /** 蓝色分量 (0-255) */
  b: number;

  /** 该地形类型的最小高度阈值 (0.0-1.0) */
  threshold: number;
}

/**
 * 高度图生成配置
 */
export interface HeightmapConfig {
  /** 地图宽度（像素） */
  width: number;

  /** 地图高度（像素） */
  height: number;

  /** 用于可重现生成的随机种子 */
  seed: number;

  /** 噪声八度数量（默认：6） */
  octaves?: number;

  /** 每个八度的振幅衰减（默认：0.5） */
  persistence?: number;

  /** 每个八度的频率倍增器（默认：2.0） */
  lacunarity?: number;

  /** 应用岛屿遮罩以创建大陆形状（默认：true） */
  applyIslandMask?: boolean;
}

/**
 * 包含所有生成数据的地图生成结果
 */
export interface MapData {
  /** 生成的高度图数据 */
  heightmap: Float32Array;

  /** 地图尺寸 */
  width: number;
  height: number;

  /** 用于渲染的地形纹理 */
  terrainTexture: PIXI.Texture | null;
}
