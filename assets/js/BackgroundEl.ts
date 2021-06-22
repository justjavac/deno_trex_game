import { IS_HIDPI } from "./constants";
import Runner from "./Runner";
import Sprite from "./sprite";
import { getRandomNum } from "./utils";

/**
 * Background element object config.
 * Real values assigned when game type changes.
 * @enum {number}
 */
enum BackgroundElConfig {
  MAX_BG_ELS = 0,
  MAX_GAP = 0,
  MIN_GAP = 0,
  POS = 0,
  SPEED = 0,
  Y_POS = 0,
  MS_PER_FRAME = 0, // only needed when BACKGROUND_EL.FIXED is true
}

export default class BackgroundEl {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  spritePos: object;
  containerWidth: number;
  xPos: number;
  yPos: number;
  remove: boolean;
  type: string;
  gap: number;
  animTimer: number;
  switchFrames: boolean;
  spriteConfig: object;

  /**
   * 背景元素
   * 和云类似(cloud)，但是没有随机的 y 坐标
   * @param {HTMLCanvasElement} canvas Canvas element.
   * @param {Object} spritePos Position of image in sprite.
   * @param {number} containerWidth
   * @param {string} type Element type.
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: object,
    containerWidth: number,
    type: string,
  ) {
    this.canvas = canvas;
    this.canvasCtx = /** @type {CanvasRenderingContext2D} */ this.canvas
      .getContext("2d");
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.type = type;
    this.gap = getRandomNum(
      BackgroundElConfig.MIN_GAP,
      BackgroundElConfig.MAX_GAP,
    );
    this.animTimer = 0;
    this.switchFrames = false;

    this.spriteConfig = {};
    this.init();
  }

  /**
   * Initialise the element setting the y position.
   */
  init() {
    this.spriteConfig = Sprite.BACKGROUND_EL[this.type];
    if (this.spriteConfig.FIXED) {
      this.xPos = this.spriteConfig.FIXED_X_POS;
    }
    this.yPos = BackgroundElConfig.Y_POS -
      this.spriteConfig.HEIGHT +
      this.spriteConfig.OFFSET;
    this.draw();
  }

  draw() {
    this.canvasCtx.save();
    let sourceWidth = this.spriteConfig.WIDTH;
    let sourceHeight = this.spriteConfig.HEIGHT;
    let sourceX = this.spriteConfig.X_POS;
    const outputWidth = sourceWidth;
    const outputHeight = sourceHeight;

    if (IS_HIDPI) {
      sourceWidth *= 2;
      sourceHeight *= 2;
      sourceX *= 2;
    }

    this.canvasCtx.drawImage(
      Runner.imageSprite,
      sourceX,
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
   * 更新背景元素位置
   * @param speed 速度
   */
  update(speed: number) {
    // 如果该元素已经移除了，不处理
    if (this.remove) {
      return;
    }

    if (!this.spriteConfig.FIXED) {
      // Fixed speed, regardless of actual game speed.
      this.xPos -= BackgroundElConfig.SPEED;
    } else {
      this.animTimer += speed;
      if (this.animTimer > BackgroundElConfig.MS_PER_FRAME) {
        this.animTimer = 0;
        this.switchFrames = !this.switchFrames;
      }

      this.yPos = this.switchFrames
        ? this.spriteConfig.FIXED_Y_POS_1
        : this.spriteConfig.FIXED_Y_POS_2;
    }
    this.draw();

    // 如果在画布上不可见，将其移除
    if (!this.isVisible()) {
      this.remove = true;
    }
  }

  /** 检查元素是否在舞台(stage)上可见。*/
  isVisible() {
    return this.xPos + this.spriteConfig.WIDTH > 0;
  }
}
