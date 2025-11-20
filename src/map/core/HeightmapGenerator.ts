import { makeNoise2D } from 'open-simplex-noise';
import type { FlowErosionConfig, HeightmapConfig } from './types';

type InternalHeightmapConfig = Omit<Required<HeightmapConfig>, 'erosion'> & {
  erosion: Required<FlowErosionConfig>;
};

/**
 * 使用多八度 simplex 噪声生成高度图
 * 创建具有岛屿遮罩的逼真地形以形成大陆状形状
 */
export class HeightmapGenerator {
  private noise2D: ReturnType<typeof makeNoise2D>;
  private config: InternalHeightmapConfig;

  constructor(config: HeightmapConfig) {
    // 使用种子初始化噪声生成器
    this.noise2D = makeNoise2D(config.seed);

    const erosionConfig: Required<FlowErosionConfig> = {
      enabled: config.erosion?.enabled ?? true,
      logDebug: config.erosion?.logDebug ?? false,
      erosionIterations: Math.max(1, Math.floor(config.erosion?.erosionIterations ?? 1)),
      rainfall: config.erosion?.rainfall ?? 1.0,
      strength: config.erosion?.strength ?? 0.0005,
      flowExponent: config.erosion?.flowExponent ?? 0.45,
      minSlope: config.erosion?.minSlope ?? 0.0001,
      smoothingIterations: config.erosion?.smoothingIterations ?? 1,
      smoothingBlend: config.erosion?.smoothingBlend ?? 0.45,
    };

    // 为可选参数设置默认值
    this.config = {
      width: config.width,
      height: config.height,
      seed: config.seed,
      octaves: config.octaves ?? 6,
      persistence: config.persistence ?? 0.5,
      lacunarity: config.lacunarity ?? 2.0,
      applyIslandMask: config.applyIslandMask ?? true,
      erosion: erosionConfig,
    };
  }

  /**
   * 使用多八度 simplex 噪声生成高度图
   * @returns 包含归一化高度值 (0.0 到 1.0) 的 Float32Array
   */
  generate(): Float32Array {
    const { width, height, octaves, persistence, lacunarity, applyIslandMask } = this.config;
    const data = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // 将坐标归一化到 0-1 范围
        const nx = x / width;
        const ny = y / height;

        // 生成多八度噪声值
        let value = this.generateOctaveNoise(nx, ny, octaves, persistence, lacunarity);

        // 如果启用，则应用岛屿遮罩
        if (applyIslandMask) {
          value *= this.calculateIslandMask(nx, ny);
        }

        // 限制在 0-1 范围内
        data[idx] = Math.max(0, Math.min(1, value));
      }
    }

    return this.finalizeHeightmap(data);
  }

  /**
   * 使用多个八度生成噪声值以创建逼真地形
   */
  private generateOctaveNoise(
    nx: number,
    ny: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0; // 用于归一化

    for (let octave = 0; octave < octaves; octave++) {
      // 在当前频率下采样噪声
      const sampleX = nx * frequency * 8; // 合理细节的缩放因子
      const sampleY = ny * frequency * 8;

      // 获取噪声值 (-1 到 1)
      const noiseValue = this.noise2D(sampleX, sampleY);

      // 累积加权噪声
      value += noiseValue * amplitude;
      maxValue += amplitude;

      // 为下一个八度更新
      amplitude *= persistence; // 减小振幅
      frequency *= lacunarity;  // 增加频率
    }

    // 归一化到 0-1 范围
    return (value / maxValue + 1) / 2;
  }

  /**
   * 计算岛屿遮罩值以创建大陆状形状
   * 使用从中心开始的径向渐变，具有可配置的衰减
   */
  private calculateIslandMask(nx: number, ny: number): number {
    // 计算距离中心 (0.5, 0.5) 的距离
    const centerX = nx - 0.5;
    const centerY = ny - 0.5;
    const distanceFromCenter = Math.sqrt(centerX * centerX + centerY * centerY);

    // 径向渐变衰减
    // 乘数控制岛屿大小（越高 = 越小的岛屿）
    const falloffMultiplier = 1.0; // 减小值以创建更大的陆地
    const mask = Math.max(0, 1 - distanceFromCenter * falloffMultiplier);

    // 应用幂函数调整陆地面积
    // 指数越高 = 陆地面积越小
    // 1.2 是一个经验值，可以根据需要进行调整
    return Math.pow(mask, 1.2);
  }

  /**
   * 增强高度图的对比度
   * 保持平原以下(0-0.48)不变,只拉伸平原以上(0.48-1.0)的高度
   */
  private enhanceContrast(data: Float32Array): Float32Array {
    // 平原阈值,与 TerrainRenderer 的 plains threshold 对应
    const plainsThreshold = 0.48;

    // 找到平原以上区域的最小值和最大值
    let minAbovePlains = Infinity;
    let maxAbovePlains = -Infinity;

    for (let i = 0; i < data.length; i++) {
      const value = data[i]!;
      if (value > plainsThreshold) {
        if (value < minAbovePlains) minAbovePlains = value;
        if (value > maxAbovePlains) maxAbovePlains = value;
      }
    }

    // 如果没有平原以上的区域,或范围太小,直接返回
    if (minAbovePlains === Infinity || maxAbovePlains - minAbovePlains < 0.001) {
      return data;
    }

    // 对平原以上区域进行直方图拉伸
    const range = maxAbovePlains - minAbovePlains;
    const enhanced = new Float32Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const value = data[i]!;

      if (value <= plainsThreshold) {
        // 平原以下保持不变
        enhanced[i] = value;
      } else {
        // 平原以上: 将 [minAbovePlains, maxAbovePlains] 映射到 [plainsThreshold, 1.0]
        const normalized = (value - minAbovePlains) / range;

        // 应用 S 曲线增强山地对比度
        // 使用 smoothstep 函数: 3x² - 2x³
        const contrast = normalized * normalized * (3 - 2 * normalized);

        // 映射到 [plainsThreshold, 1.0] 范围
        enhanced[i] = plainsThreshold + contrast * (1.0 - plainsThreshold);
      }
    }

    return enhanced;
  }

  /**
   * 应用侵蚀和对比度等后处理
   */
  private finalizeHeightmap(heightmap: Float32Array): Float32Array {
    const iterations = this.config.erosion.erosionIterations;
    let current = heightmap;

    for (let i = 0; i < iterations; i++) {
      current = this.applyFlowBasedErosion(current, i);
    }

    return this.enhanceContrast(current);
  }

  /**
   * 基于流向/流量的简单水蚀：
   * 1) 计算 D8 流向和坡度
   * 2) 按高度排序累积降水得到流量
   * 3) 侵蚀量 ~ flow^exp * slope
   * 4) 简单平滑模拟沉积
   */
  private applyFlowBasedErosion(heightmap: Float32Array, iteration: number): Float32Array {
    const { width, height, erosion } = this.config;
    if (!erosion.enabled) {
      return heightmap;
    }

    const size = width * height;
    const flowDirection = new Int32Array(size);
    const slopes = new Float32Array(size);
    flowDirection.fill(-1);

    // Step 1: D8 流向和坡度（最陡的邻居）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const currentHeight = heightmap[idx] ?? 0;

        let bestSlope = 0;
        let bestIndex = -1;

        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) continue;

            const nx = x + offsetX;
            const ny = y + offsetY;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            const neighborIndex = ny * width + nx;
            const neighborHeight = heightmap[neighborIndex] ?? currentHeight;
            const drop = currentHeight - neighborHeight;
            if (drop <= 0) continue;

            const distance = offsetX === 0 || offsetY === 0 ? 1 : Math.SQRT2;
            const slope = drop / distance;

            if (slope > bestSlope) {
              bestSlope = slope;
              bestIndex = neighborIndex;
            }
          }
        }

        flowDirection[idx] = bestIndex;
        slopes[idx] = bestSlope;
      }
    }

    // Step 2: 高到低累积流量
    const order = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      order[i] = i;
    }
    order.sort((a, b) => {
      const hb = heightmap[b] ?? 0;
      const ha = heightmap[a] ?? 0;
      return hb - ha;
    });

    const flow = new Float32Array(size);
    flow.fill(erosion.rainfall);

    for (let i = 0; i < size; i++) {
      const idx = order[i] ?? 0;
      const target = flowDirection[idx] ?? -1;
      if (target >= 0) {
        flow[target] = (flow[target] ?? 0) + (flow[idx] ?? 0);
      }
    }

    // Step 3: 基于流量和坡度的侵蚀
    const eroded = new Float32Array(size);
    let minErosion = Infinity;
    let maxErosion = 0;
    let totalErosion = 0;
    for (let i = 0; i < size; i++) {
      const slope = slopes[i] ?? 0;
      const flowAmount = flow[i] ?? 0;

      let erosionAmount = 0;
      if (slope > erosion.minSlope) {
        erosionAmount =
          erosion.strength *
          Math.pow(flowAmount, erosion.flowExponent) *
          slope;
      }

      const baseHeight = heightmap[i] ?? 0;
      const newHeight = baseHeight - erosionAmount;
      eroded[i] = Math.max(0, Math.min(1, newHeight));

      minErosion = Math.min(minErosion, erosionAmount);
      maxErosion = Math.max(maxErosion, erosionAmount);
      totalErosion += erosionAmount;
    }

    // Step 4: 简单平滑，模拟沉积/搬运
    const result =
      erosion.smoothingIterations <= 0 || erosion.smoothingBlend <= 0
        ? eroded
        : this.smoothHeightmap(eroded, erosion.smoothingIterations, erosion.smoothingBlend);

    this.logErosionSummary(erosion, {
      minErosion,
      maxErosion,
      totalErosion,
      maxFlow: this.findMaxFlow(flow),
    }, iteration);

    return result;
  }

  private logErosionSummary(
    erosion: FlowErosionConfig,
    stats: { minErosion: number; maxErosion: number; totalErosion: number; maxFlow: number },
    iteration: number
  ): void {
    if (!erosion.logDebug) return;

    const { minErosion, maxErosion, totalErosion, maxFlow } = stats;
    const totalCells = this.config.width * this.config.height;
    const avgErosion = totalErosion / Math.max(1, totalCells);

    console.log(
      '[Erosion] 完成流向/流量侵蚀',
      {
        iteration,
        rainfall: erosion.rainfall,
        strength: erosion.strength,
        flowExponent: erosion.flowExponent,
        minSlope: erosion.minSlope,
        smoothingIterations: erosion.smoothingIterations,
        smoothingBlend: erosion.smoothingBlend,
      }
    );
    console.log(
      '[Erosion] 统计',
      {
        iteration,
        minErosion: Number(minErosion.toFixed(6)),
        maxErosion: Number(maxErosion.toFixed(6)),
        avgErosion: Number(avgErosion.toFixed(6)),
        maxFlow: Number(maxFlow.toFixed(2)),
      }
    );
  }

  private findMaxFlow(flow: Float32Array): number {
    let max = 0;
    for (let i = 0; i < flow.length; i++) {
      const value = flow[i] ?? 0;
      if (value > max) {
        max = value;
      }
    }
    return max;
  }

  /**
   * 邻域平均的平滑，避免侵蚀产生的尖锐噪声
   */
  private smoothHeightmap(heightmap: Float32Array, iterations: number, blend: number): Float32Array {
    const { width, height } = this.config;
    const clampedBlend = Math.max(0, Math.min(1, blend));

    let current: Float32Array = heightmap;

    for (let iter = 0; iter < iterations; iter++) {
      const next = new Float32Array(current.length);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;

          let sum = current[idx] ?? 0;
          let count = 1;

          for (let offsetY = -1; offsetY <= 1; offsetY++) {
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
              if (offsetX === 0 && offsetY === 0) continue;

              const nx = x + offsetX;
              const ny = y + offsetY;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

              sum += current[ny * width + nx] ?? 0;
              count++;
            }
          }

          const average = sum / count;
          const blended = (current[idx] ?? 0) * (1 - clampedBlend) + average * clampedBlend;
          next[idx] = Math.max(0, Math.min(1, blended));
        }
      }

      current = next;
    }

    return current;
  }

  /**
   * 使用自定义噪声函数生成具有域扭曲的高度图
   * 这将创建更有机、扭曲的地形特征
   */
  generateWithDomainWarping(warpStrength: number = 0.1): Float32Array {
    const { width, height, octaves, persistence, lacunarity, applyIslandMask } = this.config;
    const data = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // 归一化坐标
        const nx = x / width;
        const ny = y / height;

        // 域扭曲：使用噪声偏移采样坐标
        const warpX = this.noise2D(nx * 4, ny * 4) * warpStrength;
        const warpY = this.noise2D(nx * 4 + 100, ny * 4 + 100) * warpStrength;

        const warpedX = nx + warpX;
        const warpedY = ny + warpY;

        // 在扭曲坐标处生成噪声
        let value = this.generateOctaveNoise(warpedX, warpedY, octaves, persistence, lacunarity);

        // 应用岛屿遮罩
        if (applyIslandMask) {
          value *= this.calculateIslandMask(nx, ny);
        }

        data[idx] = Math.max(0, Math.min(1, value));
      }
    }

    return this.finalizeHeightmap(data);
  }

  /**
   * 创建高度图的灰度值调试预览
   * 用于在没有地形颜色的情况下可视化高度图
   */
  static createDebugPreview(
    heightmap: Float32Array,
    width: number,
    height: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    for (let i = 0; i < heightmap.length; i++) {
      const height = heightmap[i] ?? 0;
      const gray = Math.floor(height * 255);
      const pixelIdx = i * 4;
      pixels[pixelIdx + 0] = gray; // 红色
      pixels[pixelIdx + 1] = gray; // 绿色
      pixels[pixelIdx + 2] = gray; // 蓝色
      pixels[pixelIdx + 3] = 255;  // 透明度
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}
