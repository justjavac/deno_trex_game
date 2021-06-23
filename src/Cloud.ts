import { IS_HIDPI } from "./constants.ts";
import Runner from "./Runner.ts";
import { Position } from "./Sprite.ts";
import { getRandomNum } from "./utils.ts";

enum CloudConfig {
  HEIGHT = 14,
  MAX_CLOUD_GAP = 400,
  MAX_SKY_LEVEL = 30,
  MIN_CLOUD_GAP = 100,
  MIN_SKY_LEVEL = 71,
  WIDTH = 46,
}

export default class Cloud {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  spritePos: Position;
  containerWidth: number;
  xPos: number;
  yPos: number;
  remove: boolean;
  gap: number;

  /**
   * 云 ☁️
   *
   * 和障碍物(Obstacle)类似，但是没有碰撞盒子。
   * @param canvas Canvas element.
   * @param spritePos Position of image in sprite.
   * @param containerWidth
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: Position,
    containerWidth: number,
  ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext("2d")!;
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.gap = getRandomNum(
      CloudConfig.MIN_CLOUD_GAP,
      CloudConfig.MAX_CLOUD_GAP,
    );

    this.init();
  }

  /**
   * Initialise the cloud. Sets the Cloud height.
   */
  init() {
    this.yPos = getRandomNum(
      CloudConfig.MAX_SKY_LEVEL,
      CloudConfig.MIN_SKY_LEVEL,
    );
    this.draw();
  }

  /**
   * Draw the cloud.
   */
  draw() {
    this.canvasCtx.save();
    let sourceWidth = CloudConfig.WIDTH;
    let sourceHeight = CloudConfig.HEIGHT;
    const outputWidth = sourceWidth;
    const outputHeight = sourceHeight;
    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2;
      sourceHeight = sourceHeight * 2;
    }

    this.canvasCtx.drawImage(
      Runner.imageSprite,
      this.spritePos.x,
      this.spritePos.y,
      sourceWidth,
      sourceHeight,
      this.xPos,
      this.yPos,
      outputWidth,
      outputHeight,
    );

    this.canvasCtx.restore();
  }

  /**
   * 更新云的位置 ☁️
   * @param speed 速度
   */
  update(speed: number) {
    if (this.remove) {
      return;
    }

    this.xPos -= Math.ceil(speed);
    this.draw();

    // 如果在画布上不可见，将其移除
    if (!this.isVisible()) {
      this.remove = true;
    }
  }

  /** 检查元素是否在舞台(stage)上可见。*/
  isVisible() {
    return this.xPos + CloudConfig.WIDTH > 0;
  }
}
