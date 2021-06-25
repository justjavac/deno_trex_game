import Sprite from "./Sprite.ts";
import { getRandomNum } from "../utils.ts";

const defaultConfig = {
  WIDTH: 46,
  HEIGHT: 14,
  /** 最大间隔 */
  MAX_CLOUD_GAP: 200,
  /** 最小间隔 */
  MIN_CLOUD_GAP: 100,
  MAX_SKY_LEVEL: 30,
  MIN_SKY_LEVEL: 71,
} as const;

export default class Cloud extends Sprite<typeof defaultConfig> {
  gap: number;

  /**
   * 云 ☁️
   *
   * 和障碍物(Obstacle)类似，但是没有碰撞盒子。
   */
  constructor(canvas: HTMLCanvasElement, containerWidth: number) {
    super(canvas, containerWidth, "CLOUD");
    // 设置云出现的间隙
    this.gap = getRandomNum(
      this.config.MIN_CLOUD_GAP,
      this.config.MAX_CLOUD_GAP,
    );
  }

  override init() {
    this.config = defaultConfig;
    // 设置云的随机高度
    this.y = getRandomNum(
      this.config.MAX_SKY_LEVEL,
      this.config.MIN_SKY_LEVEL,
    );
  }
}
