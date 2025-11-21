import * as PIXI from 'pixi.js';

export interface PlayerMoveOptions {
  speed?: number;
  onArrive?: () => void;
}

/**
 * 玩家标记与沿路移动的渲染层
 */
export class PlayerLayer {
  private container: PIXI.Container;
  private pathGraphics: PIXI.Graphics;
  private markerContainer: PIXI.Container;
  private marker: PIXI.Graphics;
  private shadow: PIXI.Graphics;
  private app: PIXI.Application;

  private currentPath: Array<{ x: number; y: number }> = [];
  private segmentIndex = 0;
  private segmentProgress = 0;
  private moveSpeed = 140; // 像素/秒
  private onArrive: (() => void) | null = null;
  private tickerHandler: ((ticker: PIXI.Ticker) => void) | null = null;

  constructor(app: PIXI.Application) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.sortableChildren = false;
    this.container.zIndex = 1000;
    this.container.eventMode = 'none';

    this.pathGraphics = new PIXI.Graphics();
    this.pathGraphics.eventMode = 'none';

    this.markerContainer = new PIXI.Container();
    this.markerContainer.eventMode = 'none';
    this.marker = new PIXI.Graphics();
    this.shadow = new PIXI.Graphics();
    this.marker.eventMode = 'none';
    this.shadow.eventMode = 'none';
    this.markerContainer.addChild(this.shadow, this.marker);

    this.container.addChild(this.pathGraphics, this.markerContainer);
    this.drawMarker();
  }

  addToContainer(parent: PIXI.Container): void {
    parent.addChild(this.container);
  }

  /**
   * 立即将玩家移动到指定位置
   */
  setPosition(x: number, y: number): void {
    this.markerContainer.position.set(x, y);
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.markerContainer.x,
      y: this.markerContainer.y,
    };
  }

  /**
   * 按路径移动玩家
   */
  moveAlongPath(path: Array<{ x: number; y: number }>, options: PlayerMoveOptions = {}): void {
    this.stopMovement();
    if (!path.length) return;

    this.moveSpeed = Math.max(20, options.speed ?? this.moveSpeed);
    this.onArrive = options.onArrive ?? null;
    this.currentPath = path;
    this.segmentIndex = 0;
    this.segmentProgress = 0;

    this.drawPath(path);
    const first = path[0]!;
    this.setPosition(first.x, first.y);

    if (path.length < 2) {
      this.finishMovement();
      return;
    }

    this.tickerHandler = (ticker) => this.update(ticker);
    this.app.ticker.add(this.tickerHandler, this);
  }

  stopMovement(): void {
    if (this.tickerHandler) {
      this.app.ticker.remove(this.tickerHandler, this);
      this.tickerHandler = null;
    }
  }

  private update(ticker: PIXI.Ticker): void {
    if (this.currentPath.length < 2) {
      this.finishMovement();
      return;
    }

    let remaining = this.moveSpeed * (ticker.deltaMS / 1000);
    while (remaining > 0 && this.segmentIndex < this.currentPath.length - 1) {
      const start = this.currentPath[this.segmentIndex]!;
      const end = this.currentPath[this.segmentIndex + 1]!;
      const segLen = this.distance(start, end);

      if (segLen <= 0.0001) {
        this.segmentIndex++;
        this.segmentProgress = 0;
        continue;
      }

      const distToEnd = segLen - this.segmentProgress;
      if (remaining < distToEnd) {
        this.segmentProgress += remaining;
        remaining = 0;
        const t = this.segmentProgress / segLen;
        this.applyPosition(start, end, t);
      } else {
        remaining -= distToEnd;
        this.segmentIndex++;
        this.segmentProgress = 0;
        this.setPosition(end.x, end.y);
      }
    }

    if (this.segmentIndex >= this.currentPath.length - 1) {
      this.finishMovement();
    }
  }

  private drawMarker(): void {
    this.marker.clear();
    this.shadow.clear();

    this.shadow.circle(0, 0, 8);
    this.shadow.fill({ color: 0x000000, alpha: 0.28 });
    this.shadow.scale.set(1.15, 0.6);
    this.shadow.position.set(0, 5);

    this.marker.circle(0, 0, 6);
    this.marker.fill({ color: 0x3b82f6, alpha: 1 });
    this.marker.stroke({ color: 0xffffff, width: 2, alpha: 0.95 });

    // 顶部方向尖角
    this.marker.moveTo(0, -10);
    this.marker.lineTo(4, -2);
    this.marker.lineTo(-4, -2);
    this.marker.closePath();
    this.marker.fill({ color: 0x60a5fa, alpha: 0.95 });
  }

  private drawPath(path: Array<{ x: number; y: number }>): void {
    this.pathGraphics.clear();
    if (path.length < 2) return;

    const [first, ...rest] = path;
    this.pathGraphics.moveTo(first!.x, first!.y);
    for (const p of rest) {
      this.pathGraphics.lineTo(p.x, p.y);
    }

    this.pathGraphics.stroke({
      color: 0x3b82f6,
      width: 2.2,
      alpha: 0.9,
      alignment: 0.5,
      cap: 'round',
      join: 'round',
    });
  }

  private applyPosition(
    start: { x: number; y: number },
    end: { x: number; y: number },
    t: number
  ): void {
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    this.setPosition(x, y);
  }

  private finishMovement(): void {
    this.stopMovement();
    if (this.currentPath.length) {
      const last = this.currentPath[this.currentPath.length - 1]!;
      this.setPosition(last.x, last.y);
    }
    this.currentPath = [];
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.pathGraphics.clear();
    this.onArrive?.();
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy(): void {
    this.stopMovement();
    this.container.destroy({
      children: true,
      texture: false,
    });
  }
}
