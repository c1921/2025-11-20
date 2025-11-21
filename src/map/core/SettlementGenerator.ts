import type { Settlement } from './types';

/**
 * 基于高度图的定居点生成器
 * 规则：
 * - 仅在海岸线（默认 0.35）以上生成
 * - 海拔越低概率越高，极高处（默认 >= 0.92）概率衰减为 0
 * - 使用可复现的伪随机生成
 */
export class SettlementGenerator {
  private static readonly DEFAULTS = {
    coastThreshold: 0.35,
    fadeOutHeight: 0.92,
    stride: 4,          // 采样步长，越大越稀疏
    baseChance: 0.003,  // 基础概率，结合适宜度决定最终概率
    maxSettlements: 800,
    islandBaseFactor: 0.35,  // 岛屿加成下限，避免小岛完全无机会
    islandExponent: 0.75,    // 岛屿面积归一化后的指数，数值越低大岛加成越强
    minDistance: 12,         // 定居点之间的最小距离（像素）
  } as const;

  /**
   * 从高度图推算可居住的定居点
   *
   * @param heightmap - 高度图数据（0-1）
   * @param width - 高度图宽度
   * @param height - 高度图高度
   * @param seed - 用于复现结果的随机种子
   * @param overrides - 可选参数，用于调整密度/阈值
   */
  static generate(
    heightmap: Float32Array,
    width: number,
    height: number,
    seed: number,
    overrides: Partial<{
      coastThreshold: number;
      fadeOutHeight: number;
      stride: number;
      baseChance: number;
      maxSettlements: number;
      islandBaseFactor: number;
      islandExponent: number;
      minDistance: number;
    }> = {}
  ): Settlement[] {
    const config = { ...this.DEFAULTS, ...overrides };
    const stride = Math.max(1, Math.floor(config.stride));
    const rng = this.createRng(seed);

    const islandData = this.labelIslands(
      heightmap,
      width,
      height,
      config.coastThreshold
    );
    const { islandIds, islandAreas, maxArea } = islandData;

    const settlements: Settlement[] = [];
    const fadeOutHeight = Math.max(config.coastThreshold + 0.001, config.fadeOutHeight);
    const minDistance = Math.max(0, config.minDistance);
    const spatialIndex = this.createSpatialIndex(width, height, Math.max(minDistance, 1));

    for (let y = 0; y < height; y += stride) {
      const iy = Math.min(height - 1, y);
      for (let x = 0; x < width; x += stride) {
        const ix = Math.min(width - 1, x);
        const idx = iy * width + ix;
        const elevation = heightmap[idx] ?? 0;

        const suitability = this.calculateSuitability(
          elevation,
          config.coastThreshold,
          fadeOutHeight
        );

        if (suitability <= 0) continue;

        const islandId = islandIds[idx] ?? -1;
        const islandArea = islandId >= 0 ? islandAreas[islandId] ?? 0 : 0;
        const islandFactor = this.computeIslandFactor(
          islandArea,
          maxArea,
          config.islandBaseFactor,
          config.islandExponent
        );

        // 低海拔概率高，叠加岛屿面积加成
        const probability = config.baseChance * suitability * suitability * islandFactor;
        if (probability <= 0) continue;

        if (rng() < probability) {
          const worldX = ix + 0.5; // 把点放在像素中心，避免坐标偏移
          const worldY = iy + 0.5;

          // 最近邻过滤，避免过密
          if (!this.canPlace(worldX, worldY, minDistance, settlements, spatialIndex)) {
            continue;
          }

          settlements.push({
            x: worldX,
            y: worldY,
            elevation,
            suitability,
            islandId,
            islandArea,
          });

          this.addToSpatialIndex(worldX, worldY, settlements.length - 1, spatialIndex);

          if (settlements.length >= config.maxSettlements) {
            return settlements;
          }
        }
      }
    }

    return settlements;
  }

  /**
   * 计算海拔对定居适宜度的贡献
   * - 低于海岸线直接为 0
   * - 介于海岸线与高山衰减高度之间做线性衰减
   * - 超出衰减高度则为 0
   */
  private static calculateSuitability(
    height: number,
    coastThreshold: number,
    fadeOutHeight: number
  ): number {
    if (height < coastThreshold) return 0;
    if (height >= fadeOutHeight) return 0;

    const t = (height - coastThreshold) / Math.max(1e-5, fadeOutHeight - coastThreshold);
    const suitability = 1 - Math.min(1, Math.max(0, t));

    return Math.max(0, Math.min(1, suitability));
  }

  /**
   * 简单的可复现随机数生成器（Mulberry32 变体）
   */
  private static createRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 标记所有岛屿并计算面积（4 邻域连通）
   */
  private static labelIslands(
    heightmap: Float32Array,
    width: number,
    height: number,
    coastThreshold: number
  ): { islandIds: Int32Array; islandAreas: number[]; maxArea: number } {
    const size = width * height;
    const islandIds = new Int32Array(size);
    islandIds.fill(-1);
    const islandAreas: number[] = [];

    const stackX: number[] = [];
    const stackY: number[] = [];

    const isLand = (idx: number) => (heightmap[idx] ?? 0) >= coastThreshold;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isLand(idx) || islandIds[idx] !== -1) continue;

        const islandId = islandAreas.length;
        let area = 0;

        stackX.push(x);
        stackY.push(y);

        while (stackX.length) {
          const cx = stackX.pop()!;
          const cy = stackY.pop()!;
          const cIdx = cy * width + cx;

          if (islandIds[cIdx] !== -1 || !isLand(cIdx)) continue;

          islandIds[cIdx] = islandId;
          area++;

          // 4 邻域
          if (cx > 0) {
            stackX.push(cx - 1);
            stackY.push(cy);
          }
          if (cx < width - 1) {
            stackX.push(cx + 1);
            stackY.push(cy);
          }
          if (cy > 0) {
            stackX.push(cx);
            stackY.push(cy - 1);
          }
          if (cy < height - 1) {
            stackX.push(cx);
            stackY.push(cy + 1);
          }
        }

        islandAreas.push(area);
      }
    }

    const maxArea = islandAreas.length > 0 ? Math.max(...islandAreas) : 1;
    return { islandIds, islandAreas, maxArea };
  }

  /**
   * 根据岛屿面积生成概率加成
   */
  private static computeIslandFactor(
    islandArea: number,
    maxArea: number,
    baseFactor: number,
    exponent: number
  ): number {
    if (islandArea <= 0 || maxArea <= 0) return baseFactor;

    const normalized = Math.max(0, Math.min(1, islandArea / maxArea));
    const weighted = Math.pow(normalized, Math.max(0.01, exponent));
    return baseFactor + (1 - baseFactor) * weighted;
  }

  // ---- 空间索引用于最小间距检查 ----
  private static createSpatialIndex(
    width: number,
    height: number,
    cellSize: number
  ): {
    cellSize: number;
    cols: number;
    rows: number;
    buckets: number[][];
  } {
    const cols = Math.max(1, Math.ceil(width / cellSize));
    const rows = Math.max(1, Math.ceil(height / cellSize));
    const buckets = Array.from({ length: cols * rows }, () => []);
    return { cellSize, cols, rows, buckets };
  }

  private static getBucketIndex(
    x: number,
    y: number,
    index: { cellSize: number; cols: number; rows: number }
  ): number {
    const cx = Math.max(0, Math.min(index.cols - 1, Math.floor(x / index.cellSize)));
    const cy = Math.max(0, Math.min(index.rows - 1, Math.floor(y / index.cellSize)));
    return cy * index.cols + cx;
  }

  private static canPlace(
    x: number,
    y: number,
    minDistance: number,
    settlements: Settlement[],
    index: { cellSize: number; cols: number; rows: number; buckets: number[][] }
  ): boolean {
    if (minDistance <= 0) return true;

    const minDistSq = minDistance * minDistance;
    const cx = Math.floor(x / index.cellSize);
    const cy = Math.floor(y / index.cellSize);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= index.cols || ny >= index.rows) continue;
        const bucketIdx = ny * index.cols + nx;
        const bucket = index.buckets[bucketIdx];
        for (const sIdx of bucket) {
          const s = settlements[sIdx];
          if (!s) continue;
          const dx2 = s.x - x;
          const dy2 = s.y - y;
          const distSq = dx2 * dx2 + dy2 * dy2;
          if (distSq < minDistSq) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private static addToSpatialIndex(
    x: number,
    y: number,
    settlementIndex: number,
    index: { cellSize: number; cols: number; rows: number; buckets: number[][] }
  ): void {
    const bucketIdx = this.getBucketIndex(x, y, index);
    index.buckets[bucketIdx].push(settlementIndex);
  }
}
