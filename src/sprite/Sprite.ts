import { DPI_TYPE, PIXEL_RATIO } from "../constants.ts";
import Runner from "../Runner.ts";
import Config, { Position, SpritePosition } from "./Config.ts";

export interface SpriteConfig {
  /** 宽度 */
  HEIGHT: number;
  /** 高 */
  WIDTH: number;
  /** 渐变速度 */
  FADE_SPEED?: number; // TODO
}

export default abstract class Sprite<T extends SpriteConfig> {
  config!: T;
  spritePos: Position;
  canvas: HTMLCanvasElement;
  containerWidth: number;
  alpha: number;
  x: number;
  y: number;
  /** 多个 sprite 图，记录每个 sprite 的偏移量 */
  phases: [number, number][];
  private currentPhase: number;

  constructor(
    canvas: HTMLCanvasElement,
    containerWidth: number,
    type: keyof SpritePosition,
  ) {
    this.spritePos = Config[DPI_TYPE][type];
    this.canvas = canvas;
    this.containerWidth = containerWidth;
    this.alpha = 1;
    this.x = containerWidth;
    this.y = 0;
    this.phases = [[0, 0]];
    this.currentPhase = 0;
    this.init();
  }

  /**
   * 该方法做初始化的操作，需要：
   *
   * 1. 设置 `this.config`
   *
   * 除了这 2 个属性之外，还可以设置：
   *
   * 1. `x` - x 坐标
   * 2. `y` - y 坐标
   * 3. `phases` - 多个 sprite 图，记录每个 sprite 的偏移量
   */
  abstract init(): void;

  setSpritePositon(spritePos: Position) {
    this.spritePos = spritePos;
  }

  setPositon(position: Position) {
    this.setX(position.x);
    this.setY(position.y);
  }

  setX(x: number) {
    this.x = x;
  }

  setY(y: number) {
    this.y = y;
  }

  setPhase(phase: number) {
    const length = this.phases.length;
    if (phase < 0) phase += length;
    this.currentPhase = phase % length;
  }

  next() {
    this.setPhase(this.currentPhase + 1);
  }

  prev() {
    this.setPhase(this.currentPhase - 1);
  }

  setAlpha(alpha: number) {
    this.alpha = alpha;
  }

  update(speed: number, loop = false) {
    if (!this.isVisible()) {
      if (loop) {
        this.x = this.containerWidth;
      } else {
        return;
      }
    }

    this.x -= Math.ceil(speed);
    this.draw();
  }

  /** 检查元素是否在画布上可见。*/
  isVisible() {
    return this.x + this.config.WIDTH > 0;
  }

  reset() {
    this.currentPhase = 0;
  }

  draw() {
    const canvasCtx = this.canvas.getContext("2d")!;
    canvasCtx.save();
    canvasCtx.globalAlpha = this.alpha;

    const xOffset = this.phases[this.currentPhase][0] * PIXEL_RATIO;
    const yOffset = this.phases[this.currentPhase][1] * PIXEL_RATIO;

    canvasCtx.drawImage(
      Runner.imageSprite,
      this.spritePos.x + xOffset,
      this.spritePos.y + yOffset,
      this.config.WIDTH * PIXEL_RATIO,
      this.config.HEIGHT * PIXEL_RATIO,
      this.x,
      this.y,
      this.config.WIDTH,
      this.config.HEIGHT,
    );

    canvasCtx.globalAlpha = 1;
    canvasCtx.restore();
  }
}
