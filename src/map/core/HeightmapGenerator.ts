import { makeNoise2D } from 'open-simplex-noise';
import type { HeightmapConfig } from './types';

/**
 * 使用多八度 simplex 噪声生成高度图
 * 创建具有岛屿遮罩的逼真地形以形成大陆状形状
 */
export class HeightmapGenerator {
  private noise2D: ReturnType<typeof makeNoise2D>;
  private config: Required<HeightmapConfig>;

  constructor(config: HeightmapConfig) {
    // 使用种子初始化噪声生成器
    this.noise2D = makeNoise2D(config.seed);

    // 为可选参数设置默认值
    this.config = {
      width: config.width,
      height: config.height,
      seed: config.seed,
      octaves: config.octaves ?? 6,
      persistence: config.persistence ?? 0.5,
      lacunarity: config.lacunarity ?? 2.0,
      applyIslandMask: config.applyIslandMask ?? true,
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

    // 应用对比度增强以拉开高低差距
    return this.enhanceContrast(data);
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

    // 应用对比度增强以拉开高低差距
    return this.enhanceContrast(data);
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
