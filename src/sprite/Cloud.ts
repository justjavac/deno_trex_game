import Sprite from "./Sprite.ts";
import { getRandomNum } from "../utils.ts";

interface CloudConfig {
  HEIGHT: number;
  WIDTH: number;
  /** 最大间隔 */
  MAX_CLOUD_GAP: number;
  /** 最小间隔 */
  MIN_CLOUD_GAP: number;
  MAX_SKY_LEVEL: number;
  MIN_SKY_LEVEL: number;
}

const defaultConfig: CloudConfig = {
  HEIGHT: 14,
  WIDTH: 46,
  MAX_CLOUD_GAP: 400,
  MIN_CLOUD_GAP: 100,
  MAX_SKY_LEVEL: 30,
  MIN_SKY_LEVEL: 71,
};

export default class Cloud extends Sprite<CloudConfig> {
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
