import * as PIXI from 'pixi.js';
import type { Settlement } from '../core/types';

export type SettlementLayerOptions = {
  /** 悬停回调，传入 null 表示离开 */
  onHover?: (settlement: Settlement | null) => void;

  /** 点击选择回调 */
  onClick?: (settlement: Settlement) => void;
};

/**
 * 以 Pixi 图形层方式展示定居点（矢量且可交互）
 */
export class SettlementLayer {
  private container: PIXI.Container;
  private baseGraphics: PIXI.Graphics;
  private highlightGraphics: PIXI.Graphics;
  private hoverGraphics: PIXI.Graphics;
  private hitContainer: PIXI.Container;
  private options: SettlementLayerOptions;

  constructor(settlements: Settlement[], options: SettlementLayerOptions = {}) {
    this.options = options;
    this.container = new PIXI.Container();
    this.container.sortableChildren = false;
    this.container.eventMode = 'auto';

    // 可见的标记层
    this.baseGraphics = new PIXI.Graphics();
    this.highlightGraphics = new PIXI.Graphics();
    this.hoverGraphics = new PIXI.Graphics();

    // 用于独立命中测试的透明层（每个定居点一个矢量图形）
    this.hitContainer = new PIXI.Container();
    this.hitContainer.eventMode = 'static';
    this.hitContainer.interactiveChildren = true;

    this.container.addChild(
      this.baseGraphics,
      this.highlightGraphics,
      this.hoverGraphics,
      this.hitContainer
    );

    this.drawSettlements(settlements);
  }

  /**
   * 将图层添加到舞台/视口
   */
  addToContainer(parent: PIXI.Container): void {
    parent.addChild(this.container);
  }

  /**
   * 绘制定居点标记并附加交互
   */
  private drawSettlements(settlements: Settlement[]): void {
    this.baseGraphics.clear();
    this.highlightGraphics.clear();
    this.hoverGraphics.clear();
    this.hitContainer.removeChildren();

    if (!settlements.length) return;

    // 底层主标记
    for (const settlement of settlements) {
      const baseRadius = 2 + settlement.suitability * 2.2;
      this.baseGraphics.circle(settlement.x, settlement.y, baseRadius);
    }
    this.baseGraphics.fill({ color: 0xffffff, alpha: 0.9 });
    this.baseGraphics.stroke({ color: 0x0a1625, width: 1.2, alpha: 0.55 });

    // 内部高亮，强调核心
    for (const settlement of settlements) {
      const highlightRadius = 0.9 + settlement.suitability;
      this.highlightGraphics.circle(settlement.x, settlement.y, highlightRadius);
    }
    this.highlightGraphics.fill({ color: 0xffc857, alpha: 0.9 });

    // 交互层：透明命中区，保持矢量图形，可捕获指针事件
    for (const settlement of settlements) {
      const hoverRadius = 4 + settlement.suitability * 2.2;
      const hitArea = new PIXI.Graphics();
      hitArea.circle(settlement.x, settlement.y, hoverRadius);
      hitArea.fill({ color: 0xffffff, alpha: 0.001 });
      hitArea.eventMode = 'static';
      hitArea.cursor = 'pointer';

      hitArea.on('pointerover', () => this.handleHover(settlement, hoverRadius));
      hitArea.on('pointerout', () => this.handleHover(null));
      hitArea.on('pointertap', () => {
        this.options.onClick?.(settlement);
      });

      this.hitContainer.addChild(hitArea);
    }
  }

  private handleHover(settlement: Settlement | null, radius: number = 6): void {
    this.hoverGraphics.clear();

    if (!settlement) {
      this.options.onHover?.(null);
      return;
    }

    this.options.onHover?.(settlement);

    // 绘制悬停描边
    this.hoverGraphics.circle(settlement.x, settlement.y, radius + 1.5);
    this.hoverGraphics.stroke({
      color: 0xffd166,
      width: 2,
      alpha: 0.95,
      alignment: 0.5,
    });
  }

  /**
   * 设置图层可见性
   */
  setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * 移除并销毁
   */
  destroy(): void {
    this.container.destroy({
      children: true,
      texture: false,
    });
  }
}
