import Sprite from "./Sprite.ts";

const defaultConfig = {
  HEIGHT: 9,
  WIDTH: 9,
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
}
