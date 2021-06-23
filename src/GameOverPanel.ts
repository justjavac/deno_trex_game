import { IS_HIDPI } from "./constants.ts";
import Runner from "./Runner.ts";
import { Dimensions, Position } from "./Sprite.ts";
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
  TEXT_X: 0,
  TEXT_Y: 13,
  TEXT_WIDTH: 191,
  TEXT_HEIGHT: 11,
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

  flashTimer: number;
  flashCounter: number;
  originalText: boolean;

  /**
   * Game over panel.
   * @param canvas
   * @param textImgPos
   * @param restartImgPos
   * @param dimensions Canvas dimensions.
   * @param optAltGameEndImgPos
   * @param optAltGameActive
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
    this.originalText = true;
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

  drawGameOverText(dimensions: typeof GameOverPanelDimensions) {
    const centerX = this.canvasDimensions.WIDTH / 2;
    let textSourceX = dimensions.TEXT_X;
    let textSourceY = dimensions.TEXT_Y;
    let textSourceWidth = dimensions.TEXT_WIDTH;
    let textSourceHeight = dimensions.TEXT_HEIGHT;

    const textTargetX = Math.round(centerX - dimensions.TEXT_WIDTH / 2);
    const textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
    const textTargetWidth = dimensions.TEXT_WIDTH;
    const textTargetHeight = dimensions.TEXT_HEIGHT;

    if (IS_HIDPI) {
      textSourceY *= 2;
      textSourceX *= 2;
      textSourceWidth *= 2;
      textSourceHeight *= 2;
    }

    textSourceX += this.textImgPos.x;
    textSourceY += this.textImgPos.y;
    this.canvasCtx.save();

    // Game over text from sprite.
    this.canvasCtx.drawImage(
      Runner.origImageSprite,
      textSourceX,
      textSourceY,
      textSourceWidth,
      textSourceHeight,
      textTargetX,
      textTargetY,
      textTargetWidth,
      textTargetHeight,
    );

    this.canvasCtx.restore();
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
    this.drawGameOverText(GameOverPanelDimensions);
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

  /**
   * Clear game over text.
   */
  clearGameOverTextBounds() {
    this.canvasCtx.save();

    this.canvasCtx.clearRect(
      Math.round(
        this.canvasDimensions.WIDTH / 2 -
          GameOverPanelDimensions.TEXT_WIDTH / 2,
      ),
      Math.round((this.canvasDimensions.HEIGHT - 25) / 3),
      GameOverPanelDimensions.TEXT_WIDTH,
      GameOverPanelDimensions.TEXT_HEIGHT + 4,
    );
    this.canvasCtx.restore();
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
    this.originalText = true;
  }
}
