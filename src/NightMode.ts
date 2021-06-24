import { IS_HIDPI } from "./constants.ts";
import Runner from "./Runner.ts";
import Sprite, { Position } from "./sprite/Config.ts";
import { getRandomNum } from "./utils.ts";

interface NightModeConfig {
  /** 渐变速度 */
  FADE_SPEED: number;
  /** 宽度 */
  HEIGHT: number;
  /** 高 */
  WIDTH: number;
  /** 月亮的速度 */
  MOON_SPEED: number;
  /** 星星的数量 */
  NUM_STARS: number;
  /** 星星的大小 */
  STAR_SIZE: number;
  /** 星星的速度 */
  STAR_SPEED: number;
  /** 星星的最大 y 坐标 */
  STAR_MAX_Y: number;
}

/** 星星 ✨ */
interface Star {
  x: number;
  y: number;
  sourceY: number;
}

export default class NightMode {
  static config: NightModeConfig = {
    FADE_SPEED: 0.035,
    HEIGHT: 40,
    MOON_SPEED: 0.25,
    NUM_STARS: 2,
    STAR_SIZE: 9,
    STAR_SPEED: 0.3,
    STAR_MAX_Y: 70,
    WIDTH: 20,
  };
  /** 月相 */
  static phases: number[] = [140, 120, 100, 60, 40, 20, 0];

  /** sprite 位置 */
  spritePos: Position;
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  /** x 坐标 */
  xPos: number;
  /** y 坐标 */
  yPos: number;
  /** 当前月相 */
  currentPhase: number;
  /** 透明度 */
  opacity: number;
  containerWidth: number;
  stars: Star[];
  drawStars: boolean;

  /**
   * Nightmode shows a moon and stars on the horizon.
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: Position,
    containerWidth: number,
  ) {
    this.spritePos = spritePos;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
    this.xPos = containerWidth - 50;
    this.yPos = 30;
    this.currentPhase = 0;
    this.opacity = 0;
    this.containerWidth = containerWidth;
    this.stars = [];
    this.drawStars = false;
    this.placeStars();
  }

  /**
   * 移动月亮，并修改月相
   * @param activated 当前是否为黑夜模式
   */
  update(activated: boolean) {
    // 每次进入黑夜模式后切换一个月相
    if (activated && this.opacity === 0) {
      this.currentPhase++;

      if (this.currentPhase >= NightMode.phases.length) {
        this.currentPhase = 0;
      }
    }

    // Fade in / out.
    if (activated && (this.opacity < 1 || this.opacity === 0)) {
      this.opacity += NightMode.config.FADE_SPEED;
    } else if (this.opacity > 0) {
      this.opacity -= NightMode.config.FADE_SPEED;
    }

    // 设置月亮的位置
    if (this.opacity > 0) {
      this.xPos = this.updateXPos(this.xPos, NightMode.config.MOON_SPEED);

      // 更新星星位置
      if (this.drawStars) {
        for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
          this.stars[i].x = this.updateXPos(
            this.stars[i].x,
            NightMode.config.STAR_SPEED,
          );
        }
      }
      this.draw();
    } else {
      this.opacity = 0;
      this.placeStars();
    }

    this.drawStars = true;
  }

  updateXPos(currentPos: number, speed: number) {
    if (currentPos < -NightMode.config.WIDTH) {
      currentPos = this.containerWidth;
    } else {
      currentPos -= speed;
    }
    return currentPos;
  }

  draw() {
    let moonSourceWidth = this.currentPhase === 3
      ? NightMode.config.WIDTH * 2
      : NightMode.config.WIDTH;
    let moonSourceHeight = NightMode.config.HEIGHT;
    let moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase];
    const moonOutputWidth = moonSourceWidth;
    let starSize = NightMode.config.STAR_SIZE;
    let starSourceX = Sprite.LDPI.STAR.x;

    if (IS_HIDPI) {
      moonSourceWidth *= 2;
      moonSourceHeight *= 2;
      moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase] * 2;
      starSize *= 2;
      starSourceX = Sprite.HDPI.STAR.x;
    }

    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = this.opacity;

    // 绘制星星 ✨
    if (this.drawStars) {
      for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
        this.canvasCtx.drawImage(
          Runner.origImageSprite,
          starSourceX,
          this.stars[i].sourceY,
          starSize,
          starSize,
          Math.round(this.stars[i].x),
          this.stars[i].y,
          NightMode.config.STAR_SIZE,
          NightMode.config.STAR_SIZE,
        );
      }
    }

    // 绘制月亮 🌛
    this.canvasCtx.drawImage(
      Runner.origImageSprite,
      moonSourceX,
      this.spritePos.y,
      moonSourceWidth,
      moonSourceHeight,
      Math.round(this.xPos),
      this.yPos,
      moonOutputWidth,
      NightMode.config.HEIGHT,
    );

    this.canvasCtx.globalAlpha = 1;
    this.canvasCtx.restore();
  }

  // 放置星星
  placeStars() {
    const segmentSize = Math.round(
      this.containerWidth / NightMode.config.NUM_STARS,
    );

    for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
      const x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
      const y = getRandomNum(0, NightMode.config.STAR_MAX_Y);
      const sourceY = IS_HIDPI
        ? Sprite.HDPI.STAR.y + NightMode.config.STAR_SIZE * 2 * i
        : Sprite.LDPI.STAR.y + NightMode.config.STAR_SIZE * i;

      this.stars[i] = { x, y, sourceY };
    }
  }

  reset() {
    this.currentPhase = 0;
    this.opacity = 0;
    this.update(false);
  }
}
