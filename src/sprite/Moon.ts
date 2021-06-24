import Sprite from "./Sprite.ts";

const defaultConfig = {
  WIDTH: 20,
  HEIGHT: 40,
  SPEED: 0.25,
};

export default class Moon extends Sprite<typeof defaultConfig> {
  /**
   * 月亮 🌛
   *
   * 和障碍物(Obstacle)类似，但是没有碰撞盒子。
   */
  constructor(canvas: HTMLCanvasElement, containerWidth: number) {
    super(canvas, containerWidth, "MOON");
    this.phases = [
      [140, 0],
      [120, 0],
      [100, 0],
      [60, 0],
      [40, 0],
      [20, 0],
      [0, 0],
    ];
  }

  override init() {
    this.config = defaultConfig;
    this.x = this.containerWidth - 50;
    this.y = 30;
  }

  override update() {
    if (!this.isVisible()) {
      this.x = this.containerWidth;
    }
    super.update(this.config.SPEED);
  }
}
