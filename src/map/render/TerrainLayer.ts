import * as PIXI from 'pixi.js';

/**
 * 将地形渲染为单个 Pixi.js 精灵
 * 这不是基于瓦片的渲染器 - 它显示一个完整的位图纹理
 */
export class TerrainLayer {
  private sprite: PIXI.Sprite;

  /**
   * 从纹理创建地形层
   *
   * @param texture - 完整的地形位图纹理
   */
  constructor(texture: PIXI.Texture) {
    // 从地形纹理创建精灵
    this.sprite = new PIXI.Sprite(texture);

    // 禁用交互 - 地形纯粹是视觉的
    this.sprite.eventMode = 'none';

    // 可选：将锚点设置为左上角（默认）
    this.sprite.anchor.set(0, 0);
  }

  /**
   * 将地形精灵添加到容器
   *
   * @param container - Pixi 容器（通常是视口）
   */
  addToContainer(container: PIXI.Container): void {
    container.addChild(this.sprite);
  }

  /**
   * 从其父容器中移除地形精灵
   */
  removeFromContainer(): void {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
  }

  /**
   * 获取底层精灵以进行高级操作
   */
  getSprite(): PIXI.Sprite {
    return this.sprite;
  }

  /**
   * 设置地形层的不透明度
   *
   * @param alpha - 不透明度值（0.0 到 1.0）
   */
  setAlpha(alpha: number): void {
    this.sprite.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * 设置地形层的可见性
   *
   * @param visible - 该层是否应可见
   */
  setVisible(visible: boolean): void {
    this.sprite.visible = visible;
  }

  /**
   * 对地形应用滤镜以实现视觉效果
   * 例如：光照、颜色调整等
   *
   * @param filter - 要应用的 Pixi 滤镜
   */
  addFilter(filter: PIXI.Filter): void {
    if (!this.sprite.filters) {
      this.sprite.filters = [filter];
    } else {
      this.sprite.filters = [...this.sprite.filters, filter];
    }
  }

  /**
   * 从地形中移除所有滤镜
   */
  clearFilters(): void {
    this.sprite.filters = null;
  }

  /**
   * 销毁地形层并释放资源
   */
  destroy(): void {
    this.sprite.destroy({
      texture: false, // 不销毁共享纹理
      children: true,
    });
  }
}
