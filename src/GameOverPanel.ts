import { IS_HIDPI } from "./constants.ts";
import Runner from "./Runner.ts";
import { Dimensions, Position } from "./sprite/Config.ts";
import GameOverText from "./sprite/GameOverText.ts";
import { getTimeStamp } from "./utils.ts";

const RESTART_ANIM_DURATION = 875;
const LOGO_PAUSE_DURATION = 875;

/**
 * Animation frames spec.
 */
const AnimConfig = {
  frames: [0, 36, 72, 108, 144, 180, 216, 252],
  msPerFrame: RESTART_ANIM_DURATION / 8,
};

/**
 * Dimensions used in the panel.
 */
const GameOverPanelDimensions = {
  RESTART_WIDTH: 36,
  RESTART_HEIGHT: 32,
};

export default class GameOverPanel {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  canvasDimensions: Dimensions;

  textImgPos: Position;
  restartImgPos: Position;

  // Retry animation.
  frameTimeStamp: number;
  animTimer: number;
  currentFrame: number;

  gameOverRafId?: number;
  gameOverTex: GameOverText;

  flashTimer: number;
  flashCounter: number;

  /**
   * Game over panel.
   * @param canvas
   * @param textImgPos
   * @param restartImgPos
   * @param dimensions Canvas dimensions.
   */
  constructor(
    canvas: HTMLCanvasElement,
    textImgPos: Position,
    restartImgPos: Position,
    dimensions: Dimensions,
  ) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
    this.canvasDimensions = dimensions;
    this.textImgPos = textImgPos;
    this.restartImgPos = restartImgPos;

    // Retry animation.
    this.frameTimeStamp = 0;
    this.animTimer = 0;
    this.currentFrame = 0;

    this.flashTimer = 0;
    this.flashCounter = 0;
    this.gameOverTex = new GameOverText(this.canvas);
  }

  /**
   * Update the panel dimensions.
   * @param width New canvas width.
   * @param optHeight Optional new canvas height.
   */
  updateDimensions(width: number, optHeight?: number) {
    this.canvasDimensions.WIDTH = width;
    if (optHeight) {
      this.canvasDimensions.HEIGHT = optHeight;
    }
    this.currentFrame = AnimConfig.frames.length - 1;
  }

  /**
   * Draw restart button.
   */
  drawRestartButton() {
    let framePosX = AnimConfig.frames[this.currentFrame];
    let restartSourceWidth = GameOverPanelDimensions.RESTART_WIDTH;
    let restartSourceHeight = GameOverPanelDimensions.RESTART_HEIGHT;
    const restartTargetX = this.canvasDimensions.WIDTH / 2 -
      GameOverPanelDimensions.RESTART_WIDTH / 2;
    const restartTargetY = this.canvasDimensions.HEIGHT / 2;

    if (IS_HIDPI) {
      restartSourceWidth *= 2;
      restartSourceHeight *= 2;
      framePosX *= 2;
    }

    this.canvasCtx.save();

    this.canvasCtx.drawImage(
      Runner.origImageSprite,
      this.restartImgPos.x + framePosX,
      this.restartImgPos.y,
      restartSourceWidth,
      restartSourceHeight,
      restartTargetX,
      restartTargetY,
      GameOverPanelDimensions.RESTART_WIDTH,
      GameOverPanelDimensions.RESTART_HEIGHT,
    );
    this.canvasCtx.restore();
  }

  /**
   * Draw the panel.
   */
  draw() {
    // this.drawGameOverText(GameOverPanelDimensions);
    this.gameOverTex.draw();
    this.drawRestartButton();
    this.update();
  }

  /**
   * Update animation frames.
   */
  update() {
    const now = getTimeStamp();
    const deltaTime = now - (this.frameTimeStamp || now);

    this.frameTimeStamp = now;
    this.animTimer += deltaTime;
    this.flashTimer += deltaTime;

    // Restart Button
    if (this.currentFrame == 0 && this.animTimer > LOGO_PAUSE_DURATION) {
      this.animTimer = 0;
      this.currentFrame++;
      this.drawRestartButton();
    } else if (
      this.currentFrame > 0 &&
      this.currentFrame < AnimConfig.frames.length
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
