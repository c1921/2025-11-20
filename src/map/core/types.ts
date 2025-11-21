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
 * 基于高度图生成的定居点
 */
export interface Settlement {
  /** 世界坐标 X（像素） */
  x: number;

  /** 世界坐标 Y（像素） */
  y: number;

  /** 该点的海拔（0-1） */
  elevation: number;

  /** 适宜度，数值越高越适合居住（0-1） */
  suitability: number;

  /** 所在岛屿的编号（从 0 开始），无则为 -1 */
  islandId?: number;

  /** 所在岛屿的面积（以格子数计） */
  islandArea?: number;

  /** 与路网结合后的度数（直连邻居数量） */
  roadDegree?: number;

  /** 通过二跳可触达的节点数量，用于衡量辐射范围 */
  secondHopReach?: number;

  /** 成为城市的综合评分（0-1） */
  cityScore?: number;

  /** 分类结果 */
  category?: SettlementCategory;
}

/** 定居点的等级分类 */
export type SettlementCategory = 'village' | 'town' | 'city';

/**
 * 基于流积累的侵蚀配置
 */
export interface FlowErosionConfig {
  /** 是否启用侵蚀（默认：true） */
  enabled?: boolean;

  /** 是否在控制台输出侵蚀调试信息（默认：false） */
  logDebug?: boolean;

  /** 侵蚀迭代次数（默认：1，增加可叠加侵蚀效果） */
  erosionIterations?: number;

  /** 每个格子的基础降水量（默认：1.0） */
  rainfall?: number;

  /** 侵蚀强度系数（默认：0.0005） */
  strength?: number;

  /** 流量的指数缩放，抑制过大河流（默认：0.45） */
  flowExponent?: number;

  /** 忽略过于平缓的坡度（默认：0.0001） */
  minSlope?: number;

  /** 侵蚀后平滑迭代次数（默认：1） */
  smoothingIterations?: number;

  /** 平滑混合因子，0-1 越大越接近邻域平均（默认：0.45） */
  smoothingBlend?: number;
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

  /** 基于流向和流量的侵蚀参数 */
  erosion?: FlowErosionConfig;
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

  /** 根据高度图推算出的定居点 */
  settlements: Settlement[];

  /** 根据定居点生成的道路网络 */
  roads: RoadSegment[];
}

/**
 * 道路线段
 */
export interface RoadSegment {
  /** 起点世界坐标（像素） */
  x1: number;
  y1: number;

  /** 终点世界坐标（像素） */
  x2: number;
  y2: number;

  /** 距离（像素） */
  length: number;

  /** 关联的定居点索引 */
  aIndex: number;
  bIndex: number;

  /** 具体走向的折线路径，含起终点（像素坐标） */
  points: Array<{ x: number; y: number }>;
}
