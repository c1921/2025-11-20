import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

/**
 * 管理平移、缩放和相机控制的视口
 * 使用特定于游戏的配置包装 pixi-viewport
 */
export class MapViewport {
  public viewport: Viewport;
  private worldWidth: number;
  private worldHeight: number;

  /**
   * 为地图创建视口
   *
   * @param app - Pixi 应用实例
   * @param worldWidth - 地图的世界单位宽度
   * @param worldHeight - 地图的世界单位高度
   */
  constructor(app: PIXI.Application, worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    // 使用初始屏幕和世界尺寸创建视口
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: worldWidth,
      worldHeight: worldHeight,
      events: app.renderer.events,
    });

    // 将视口添加到舞台
    app.stage.addChild(this.viewport);

    // 配置视口插件
    this.setupViewportPlugins();

    // 设置初始相机位置（居中）
    this.centerCamera();
  }

  /**
   * 配置视口交互插件
   */
  private setupViewportPlugins(): void {
    this.viewport
      // 启用拖动平移
      .drag({
        mouseButtons: 'left', // 左键拖动
      })

      // 在触摸设备上启用捏合缩放
      .pinch()

      // 启用鼠标滚轮缩放
      .wheel({
        smooth: 3, // 平滑滚动
        percent: 0.1, // 缩放速度
      })

      // 添加减速（惯性/动量）
      .decelerate({
        friction: 0.95, // 更高 = 更多摩擦力，停止更快
      })

      // 将视口限制在世界边界内
      .clamp({
        left: 0,
        right: this.worldWidth,
        top: 0,
        bottom: this.worldHeight,
        direction: 'all',
      })

      // 限制缩放级别
      .clampZoom({
        minScale: 0.3, // 最大缩小
        maxScale: 4.0, // 最大放大
      });
  }

  /**
   * 将相机居中在地图上
   */
  centerCamera(): void {
    this.viewport.moveCenter(this.worldWidth / 2, this.worldHeight / 2);
  }

  /**
   * 将相机移动到特定世界位置
   *
   * @param x - 世界 X 坐标
   * @param y - 世界 Y 坐标
   * @param smooth - 是否为移动添加动画
   */
  moveTo(x: number, y: number, smooth: boolean = true): void {
    if (smooth) {
      this.viewport.animate({
        position: { x, y },
        time: 500, // 动画持续时间（毫秒）
        ease: 'easeInOutQuad',
      });
    } else {
      this.viewport.moveCenter(x, y);
    }
  }

  /**
   * 设置缩放级别
   *
   * @param scale - 缩放比例（1.0 = 正常，2.0 = 2倍放大）
   * @param smooth - 是否为缩放添加动画
   */
  setZoom(scale: number, smooth: boolean = true): void {
    const clampedScale = Math.max(0.3, Math.min(4.0, scale));

    if (smooth) {
      this.viewport.animate({
        scale: clampedScale,
        time: 300,
        ease: 'easeInOutQuad',
      });
    } else {
      this.viewport.setZoom(clampedScale);
    }
  }

  /**
   * 缩放以适应整个世界视图
   */
  zoomToFit(): void {
    this.viewport.fit(true, this.worldWidth, this.worldHeight);
    this.centerCamera();
  }

  /**
   * 处理窗口大小调整事件
   *
   * @param width - 新的屏幕宽度
   * @param height - 新的屏幕高度
   */
  handleResize(width: number, height: number): void {
    this.viewport.resize(width, height);
  }

  /**
   * 将屏幕坐标转换为世界坐标
   * 对于准确的鼠标交互至关重要
   *
   * @param screenX - 屏幕 X 坐标
   * @param screenY - 屏幕 Y 坐标
   * @returns 世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return this.viewport.toWorld(screenX, screenY);
  }

  /**
   * 将世界坐标转换为屏幕坐标
   *
   * @param worldX - 世界 X 坐标
   * @param worldY - 世界 Y 坐标
   * @returns 屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return this.viewport.toScreen(worldX, worldY);
  }

  /**
   * 获取当前相机位置
   */
  getCameraPosition(): { x: number; y: number } {
    return {
      x: this.viewport.center.x,
      y: this.viewport.center.y,
    };
  }

  /**
   * 获取当前缩放级别
   */
  getZoom(): number {
    return this.viewport.scale.x; // 假设均匀缩放
  }

  /**
   * 启用或禁用视口交互
   *
   * @param enabled - 是否应启用交互
   */
  setInteractive(enabled: boolean): void {
    this.viewport.pause = !enabled;
  }

  /**
   * 获取可见的世界边界
   * 用于剔除或确定屏幕上的内容
   */
  getVisibleBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    const corner = this.viewport.corner;
    return {
      left: corner.x,
      right: corner.x + this.viewport.worldScreenWidth,
      top: corner.y,
      bottom: corner.y + this.viewport.worldScreenHeight,
    };
  }

  /**
   * 将视口重置为初始状态
   */
  reset(): void {
    this.centerCamera();
    this.setZoom(1.0, false);
  }

  /**
   * 销毁视口并清理资源
   */
  destroy(): void {
    this.viewport.destroy({
      children: true,
    });
  }
}
