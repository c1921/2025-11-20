import * as PIXI from 'pixi.js';
import type { RoadSegment } from '../core/types';

/**
 * 道路渲染层（折线+平滑）
 */
export class RoadLayer {
  private graphics: PIXI.Graphics;

  constructor(roads: RoadSegment[]) {
    this.graphics = new PIXI.Graphics();
    this.graphics.eventMode = 'none';
    this.drawRoads(roads);
  }

  addToContainer(container: PIXI.Container): void {
    container.addChild(this.graphics);
  }

  /**
   * 从父容器移除并释放图形资源
   */
  destroy(): void {
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
    this.graphics.destroy({
      children: true,
    });
  }

  private drawRoads(roads: RoadSegment[]): void {
    this.graphics.clear();
    if (!roads.length) return;

    for (const road of roads) {
      const pts = road.points && road.points.length >= 2
        ? road.points
        : [
            { x: road.x1, y: road.y1 },
            { x: road.x2, y: road.y2 },
          ];

      const smooth = this.smoothPolyline(pts, 6);

      this.graphics.stroke({
        color: 0xf1f5f9,
        width: 1.3,
        alpha: 0.8,
        alignment: 0.5,
      });

      for (let i = 0; i < smooth.length - 1; i++) {
        const a = smooth[i]!;
        const b = smooth[i + 1]!;
        this.graphics.moveTo(a.x, a.y);
        this.graphics.lineTo(b.x, b.y);
      }
    }
  }

  /**
   * 使用 Catmull-Rom 样条对折线做简单平滑
   */
  private smoothPolyline(
    points: Array<{ x: number; y: number }>,
    samplesPerSegment: number
  ): Array<{ x: number; y: number }> {
    if (points.length < 3 || samplesPerSegment <= 1) {
      return points;
    }

    const result: Array<{ x: number; y: number }> = [];
    const p = points;
    const get = (i: number): { x: number; y: number } =>
      p[Math.max(0, Math.min(p.length - 1, i))]!;

    for (let i = 0; i < p.length - 1; i++) {
      const p0 = get(i - 1);
      const p1 = get(i);
      const p2 = get(i + 1);
      const p3 = get(i + 2);

      for (let j = 0; j < samplesPerSegment; j++) {
        const t = j / samplesPerSegment;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        result.push({ x, y });
      }
    }

    // 追加终点，确保对齐
    result.push(points[points.length - 1]!);
    return result;
  }
}
