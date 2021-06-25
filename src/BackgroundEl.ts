import { IS_HIDPI } from "./constants.ts";
import Runner from "./Runner.ts";
import Sprite, { CloudSprite, Position } from "./sprite/Config.ts";
import { getRandomNum } from "./utils.ts";

export default class BackgroundEl {
  static config = {
    MAX_BG_ELS: 1,
    MAX_GAP: 400,
    MIN_GAP: 100,
    POS: 0,
    SPEED: 0.5,
    Y_POS: 125,
  };

  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  spritePos: Position;
  containerWidth: number;
  x: number;
  y: number;
  type: string;
  gap: number;
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
    this.x = containerWidth;
    this.y = 0;
    this.type = type;
    this.gap = getRandomNum(
      BackgroundEl.config.MIN_GAP,
      BackgroundEl.config.MAX_GAP,
    );
    this.spriteConfig = Sprite.BACKGROUND_EL[this.type as "CLOUD"];
    this.init();
  }

  /**
   * Initialise the element setting the y position.
   */
  init() {
    this.y = BackgroundEl.config.Y_POS -
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
      this.x,
      this.y,
      outputWidth,
      outputHeight,
    );

    this.canvasCtx.restore();
  }

  update() {
    // 如果该元素已经移除了，不处理
    if (!this.isVisible()) {
      return;
    }

    this.x -= BackgroundEl.config.SPEED;
    this.draw();
  }

  /** 检查元素是否在画布上可见。*/
  isVisible() {
    return this.x + this.spriteConfig.WIDTH > 0;
  }
}
