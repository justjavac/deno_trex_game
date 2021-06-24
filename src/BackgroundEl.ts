import { IS_HIDPI } from "./constants.ts";
import Runner from "./Runner.ts";
import Sprite, { CloudSprite, Position } from "./SpriteConfig.ts";
import { getRandomNum } from "./utils.ts";

export default class BackgroundEl {
  /**
   * Background element object config.
   * Real values assigned when game type changes.
   */
  static config = {
    MAX_BG_ELS: 0,
    MAX_GAP: 0,
    MIN_GAP: 0,
    POS: 0,
    SPEED: 0,
    Y_POS: 0,
  };

  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  spritePos: Position;
  containerWidth: number;
  xPos: number;
  yPos: number;
  remove: boolean;
  type: string;
  gap: number;
  animTimer: number;
  switchFrames: boolean;
  spriteConfig: CloudSprite;

  /**
   * 背景元素
   * 和云类似(cloud)，但是没有随机的 y 坐标
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: Position,
    containerWidth: number,
    type: string,
  ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext("2d")!;
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.type = type;
    this.gap = getRandomNum(
      BackgroundEl.config.MIN_GAP,
      BackgroundEl.config.MAX_GAP,
    );
    this.animTimer = 0;
    this.switchFrames = false;
    this.spriteConfig = Sprite.BACKGROUND_EL[this.type as "CLOUD"];
    this.init();
  }

  /**
   * Initialise the element setting the y position.
   */
  init() {
    this.yPos = BackgroundEl.config.Y_POS -
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
   */
  update() {
    // 如果该元素已经移除了，不处理
    if (this.remove) {
      return;
    }

    this.xPos -= BackgroundEl.config.SPEED;
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
