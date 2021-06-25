import Sprite from "./Sprite.ts";
import {PIXEL_RATIO} from '../constants.ts'
import { getTimeStamp } from "../utils.ts";

const defaultConfig = {
  WIDTH: 36,
  HEIGHT: 32,
} as const;

const RESTART_ANIM_DURATION = 875;
const LOGO_PAUSE_DURATION = 875;

export default class RestartButton extends Sprite<typeof defaultConfig> {
  msPerFrame: number;

  // Retry animation.
  frameTimeStamp: number;
  animTimer: number;
  currentFrame: number;

  gameOverRafId?: number;

  flashTimer: number;
  flashCounter: number;

  /** RestartButton */
  constructor(canvas: HTMLCanvasElement) {
    super(canvas, "RESTART");
    this.phases = [[0,0], [36,0], [72,0], [108,0], [144,0], [180,0], [216,0], [252,0]]
    this.msPerFrame = RESTART_ANIM_DURATION / this.phases.length

    // Retry animation.
    this.frameTimeStamp = 0;
    this.animTimer = 0;
    this.currentFrame = 0;

    this.flashTimer = 0;
    this.flashCounter = 0;
  }

  override init() {
    this.config = defaultConfig;
    this.x = (this.canvas.width/PIXEL_RATIO - this.config.WIDTH )/ 2;
    this.y = (this.canvas.height/PIXEL_RATIO - this.config.HEIGHT - 25) / 2
  }

  override update(){
    const now = getTimeStamp();
    const deltaTime = now - (this.frameTimeStamp || now);

    this.frameTimeStamp = now;
    this.animTimer += deltaTime;
    this.flashTimer += deltaTime;

    // Restart Button
    if (this.currentFrame == 0 && this.animTimer > LOGO_PAUSE_DURATION) {
      this.animTimer = 0;
      this.next();
      this.draw();
    } else if (
      this.currentFrame > 0 &&
      this.currentFrame < this.phases.length
    ) {
      if (this.animTimer >= AnimConfig.msPerFrame) {
        this.currentFrame++;
        this.drawRestartButton();
      }
    } else if (this.currentFrame == AnimConfig.frames.length) {
      this.reset();
      return;
    }

    this.gameOverRafId = requestAnimationFrame(this.update.bind(this));
  }

  reset() {
    if (this.gameOverRafId) {
      cancelAnimationFrame(this.gameOverRafId);
      this.gameOverRafId = undefined;
    }
    this.animTimer = 0;
    this.frameTimeStamp = 0;
    this.currentFrame = 0;
    this.flashTimer = 0;
    this.flashCounter = 0;
  }
}