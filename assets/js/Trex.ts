import CollisionBox from "./CollisionBox";
import { FPS, IS_HIDPI } from "./constants";
import { getTimeStamp } from "./utils";

/**
 * T-rex player config.
 */
interface TrexConfig {
  DROP_VELOCITY: number;
  FLASH_OFF: number;
  FLASH_ON: number;
  HEIGHT: number;
  HEIGHT_DUCK: number;
  INTRO_DURATION: number;
  SPEED_DROP_COEFFICIENT: number;
  SPRITE_WIDTH: number;
  START_X_POS: number;
  WIDTH: number;
  WIDTH_DUCK: number;
}

interface JumpConfig {
  GRAVITY: number;
  MAX_JUMP_HEIGHT: number;
  MIN_JUMP_HEIGHT: number;
  INITIAL_JUMP_VELOCITY: number;
}

interface JumpConfig {
  GRAVITY: number;
  MAX_JUMP_HEIGHT: number;
  MIN_JUMP_HEIGHT: number;
  INITIAL_JUMP_VELOCITY: number;
}

/**
 * Animation states.
 */

enum TrexStatus {
  CRASHED = "CRASHED",
  DUCKING = "DUCKING",
  JUMPING = "JUMPING",
  RUNNING = "RUNNING",
  WAITING = "WAITING",
}
/**
 * Blinking coefficient.
 */

const TREX_BLINK_TIMING = 7000;

type AnimFrames = Record<TrexStatus, { frames: number[]; msPerFrame: number }>;

export default class Trex {
  /** T-rex player config. */
  static config: TrexConfig = {
    DROP_VELOCITY: -5,
    FLASH_OFF: 175,
    FLASH_ON: 100,
    HEIGHT: 47,
    HEIGHT_DUCK: 25,
    INTRO_DURATION: 1500,
    SPEED_DROP_COEFFICIENT: 3,
    SPRITE_WIDTH: 262,
    START_X_POS: 50,
    WIDTH: 44,
    WIDTH_DUCK: 59,
  };

  static slowJumpConfig: JumpConfig = {
    GRAVITY: 0.25,
    MAX_JUMP_HEIGHT: 50,
    MIN_JUMP_HEIGHT: 45,
    INITIAL_JUMP_VELOCITY: -20,
  };

  static normalJumpConfig: JumpConfig = {
    GRAVITY: 0.6,
    MAX_JUMP_HEIGHT: 30,
    MIN_JUMP_HEIGHT: 30,
    INITIAL_JUMP_VELOCITY: -10,
  };

  /** 用于碰撞检测 */
  static collisionBoxes: Record<
    TrexStatus.DUCKING | TrexStatus.RUNNING,
    CollisionBox[]
  > = {
    DUCKING: [new CollisionBox(1, 18, 55, 25)],
    RUNNING: [
      new CollisionBox(22, 0, 17, 16),
      new CollisionBox(1, 18, 30, 9),
      new CollisionBox(10, 35, 14, 8),
      new CollisionBox(1, 24, 29, 5),
      new CollisionBox(5, 30, 21, 4),
      new CollisionBox(9, 34, 15, 4),
    ],
  };

  /** 不同状态的动画配置 */
  static animFrames: AnimFrames = {
    WAITING: {
      frames: [44, 0],
      msPerFrame: 1000 / 3,
    },
    RUNNING: {
      frames: [88, 132],
      msPerFrame: 1000 / 12,
    },
    CRASHED: {
      frames: [220],
      msPerFrame: 1000 / 60,
    },
    JUMPING: {
      frames: [0],
      msPerFrame: 1000 / 60,
    },
    DUCKING: {
      frames: [264, 323],
      msPerFrame: 1000 / 8,
    },
  };

  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  spritePos: object;
  xPos: number;
  yPos: number;
  xInitialPos: number;
  // Position when on the ground.
  groundYPos: number;
  currentFrame: number;
  currentAnimFrames: number[];
  blinkDelay: number;
  blinkCount: number;
  animStartTime: number;
  timer: number;
  msPerFrame: number;
  config: TrexConfig & JumpConfig;
  // Current status.
  status: TrexStatus;
  jumping: boolean;
  minJumpHeight: number;
  ducking: boolean;
  jumpVelocity: number;
  reachedMinHeight: boolean;
  speedDrop: boolean;
  jumpCount: number;
  jumpspotX: number;
  altGameModeEnabled: boolean;
  flashing: boolean;
  midair: boolean;
  playingIntro: boolean;

  /**
   * T-rex game character.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} spritePos Positioning within image sprite.
   */
  constructor(canvas: HTMLCanvasElement, spritePos: object) {
    this.canvas = canvas;
    this.canvasCtx = /** @type {CanvasRenderingContext2D} */ canvas.getContext(
      "2d",
    );
    this.spritePos = spritePos;
    this.xPos = 0;
    this.yPos = 0;
    this.xInitialPos = 0;
    // Position when on the ground.
    this.groundYPos = 0;
    this.currentFrame = 0;
    this.currentAnimFrames = [];
    this.blinkDelay = 0;
    this.blinkCount = 0;
    this.animStartTime = 0;
    this.timer = 0;
    this.msPerFrame = 1000 / FPS;
    this.config = Object.assign(Trex.config, Trex.normalJumpConfig);
    // Current status.
    this.status = TrexStatus.WAITING;
    this.jumping = false;
    this.ducking = false;
    this.jumpVelocity = 0;
    this.reachedMinHeight = false;
    this.speedDrop = false;
    this.jumpCount = 0;
    this.jumpspotX = 0;
    this.altGameModeEnabled = false;
    this.flashing = false;

    this.init();
  }

  /**
   * T-rex player initaliser.
   * Sets the t-rex to blink at random intervals.
   */
  init() {
    this.groundYPos = Runner.defaultDimensions.HEIGHT -
      this.config.HEIGHT -
      Runner.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;

    this.draw(0, 0);
    this.update(0, TrexStatus.WAITING);
  }

  /**
   * Assign the appropriate jump parameters based on the game speed.
   */
  enableSlowConfig() {
    const jumpConfig = Runner.slowDown
      ? Trex.slowJumpConfig
      : Trex.normalJumpConfig;
    Trex.config = Object.assign(Trex.config, jumpConfig);

    this.adjustAltGameConfigForSlowSpeed();
  }

  /**
   * Enables the alternative game. Redefines the dino config.
   * @param {Object} spritePos New positioning within image sprite.
   */
  enableAltGameMode(spritePos: object) {
    this.altGameModeEnabled = true;
    this.spritePos = spritePos;
    const spriteDefinition = Runner.spriteDefinition["TREX"];

    // Update animation frames.
    Trex.animFrames.RUNNING.frames = [
      spriteDefinition.RUNNING_1.x,
      spriteDefinition.RUNNING_2.x,
    ];
    Trex.animFrames.CRASHED.frames = [spriteDefinition.CRASHED.x];

    if (typeof spriteDefinition.JUMPING.x == "object") {
      Trex.animFrames.JUMPING.frames = spriteDefinition.JUMPING.x;
    } else {
      Trex.animFrames.JUMPING.frames = [spriteDefinition.JUMPING.x];
    }

    Trex.animFrames.DUCKING.frames = [
      spriteDefinition.RUNNING_1.x,
      spriteDefinition.RUNNING_2.x,
    ];

    // Update Trex config
    Trex.config.GRAVITY = spriteDefinition.GRAVITY || Trex.config.GRAVITY;
    (Trex.config.HEIGHT = spriteDefinition.RUNNING_1.h),
      (Trex.config.INITIAL_JUMP_VELOCITY =
        spriteDefinition.INITIAL_JUMP_VELOCITY);
    Trex.config.MAX_JUMP_HEIGHT = spriteDefinition.MAX_JUMP_HEIGHT;
    Trex.config.MIN_JUMP_HEIGHT = spriteDefinition.MIN_JUMP_HEIGHT;
    Trex.config.WIDTH = spriteDefinition.RUNNING_1.w;
    Trex.config.WIDTH_JUMP = spriteDefinition.JUMPING.w;
    Trex.config.INVERT_JUMP = spriteDefinition.INVERT_JUMP;

    this.adjustAltGameConfigForSlowSpeed(spriteDefinition.GRAVITY);
    this.config = Trex.config;

    // Adjust bottom horizon placement.
    this.groundYPos = Runner.defaultDimensions.HEIGHT -
      this.config.HEIGHT -
      Runner.spriteDefinition["BOTTOM_PAD"];
    this.yPos = this.groundYPos;
    this.reset();
  }

  /**
   * Slow speeds adjustments for the alt game modes.
   * @param optGravityValue
   */
  adjustAltGameConfigForSlowSpeed(optGravityValue?: number) {
    if (Runner.slowDown) {
      if (optGravityValue) {
        Trex.config.GRAVITY = optGravityValue / 1.5;
      }
      Trex.config.MIN_JUMP_HEIGHT *= 1.5;
      Trex.config.MAX_JUMP_HEIGHT *= 1.5;
      Trex.config.INITIAL_JUMP_VELOCITY = Trex.config.INITIAL_JUMP_VELOCITY *
        1.5;
    }
  }

  /**
   * Setter whether dino is flashing.
   * @param {boolean} status
   */
  setFlashing(status: boolean) {
    this.flashing = status;
  }

  /**
   * Setter for the jump velocity.
   * The approriate drop velocity is also set.
   * @param {number} setting
   */
  setJumpVelocity(setting: number) {
    this.config.INIITAL_JUMP_VELOCITY = -setting;
    this.config.DROP_VELOCITY = -setting / 2;
  }

  /**
   * Set the animation status.
   * @param {!number} deltaTime
   * @param {TrexStatus=} optStatus Optional status to switch to.
   */
  update(deltaTime: number, optStatus?: TrexStatus) {
    this.timer += deltaTime;

    // Update the status.
    if (optStatus) {
      this.status = optStatus;
      this.currentFrame = 0;
      this.msPerFrame = Trex.animFrames[optStatus].msPerFrame;
      this.currentAnimFrames = Trex.animFrames[optStatus].frames;

      if (optStatus === TrexStatus.WAITING) {
        this.animStartTime = getTimeStamp();
        this.setBlinkDelay();
      }
    }
    // Game intro animation, T-rex moves in from the left.
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
      this.xPos += Math.round(
        (this.config.START_X_POS / this.config.INTRO_DURATION) * deltaTime,
      );
      this.xInitialPos = this.xPos;
    }

    if (this.status === TrexStatus.WAITING) {
      this.blink(getTimeStamp());
    } else {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }

    // Update the frame position.
    if (!this.flashing && this.timer >= this.msPerFrame) {
      this.currentFrame = this.currentFrame == this.currentAnimFrames.length - 1
        ? 0
        : this.currentFrame + 1;
      this.timer = 0;
    }

    if (!this.altGameModeEnabled) {
      // Speed drop becomes duck if the down key is still being pressed.
      if (this.speedDrop && this.yPos === this.groundYPos) {
        this.speedDrop = false;
        this.setDuck(true);
      }
    }
  }

  /**
   * Draw the t-rex to a particular position.
   * @param {number} x
   * @param {number} y
   */
  draw(x: number, y: number) {
    let sourceX = x;
    let sourceY = y;
    let sourceWidth = this.ducking && this.status !== TrexStatus.CRASHED
      ? this.config.WIDTH_DUCK
      : this.config.WIDTH;
    let sourceHeight = this.config.HEIGHT;
    const outputHeight = sourceHeight;

    let jumpOffset = Runner.spriteDefinition.TREX.JUMPING.xOffset;

    // Width of sprite changes on jump.
    if (
      this.altGameModeEnabled &&
      this.jumping &&
      this.status !== TrexStatus.CRASHED
    ) {
      sourceWidth = this.config.WIDTH_JUMP;
    }

    if (IS_HIDPI) {
      sourceX *= 2;
      sourceY *= 2;
      sourceWidth *= 2;
      sourceHeight *= 2;
      jumpOffset *= 2;
    }

    // Adjustments for sprite sheet position.
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    // Flashing.
    if (this.flashing) {
      if (this.timer < this.config.FLASH_ON) {
        this.canvasCtx.globalAlpha = 0.5;
      } else if (this.timer > this.config.FLASH_OFF) {
        this.timer = 0;
      }
    }

    // Ducking.
    if (
      !this.altGameModeEnabled &&
      this.ducking &&
      this.status !== TrexStatus.CRASHED
    ) {
      this.canvasCtx.drawImage(
        Runner.imageSprite,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        this.xPos,
        this.yPos,
        this.config.WIDTH_DUCK,
        outputHeight,
      );
    } else if (
      this.altGameModeEnabled &&
      this.jumping &&
      this.status !== TrexStatus.CRASHED
    ) {
      // Jumping with adjustments.
      this.canvasCtx.drawImage(
        Runner.imageSprite,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        this.xPos - jumpOffset,
        this.yPos,
        this.config.WIDTH_JUMP,
        outputHeight,
      );
    } else {
      // Crashed whilst ducking. Trex is standing up so needs adjustment.
      if (this.ducking && this.status === TrexStatus.CRASHED) {
        this.xPos++;
      }
      // Standing / running
      this.canvasCtx.drawImage(
        Runner.imageSprite,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        this.xPos,
        this.yPos,
        this.config.WIDTH,
        outputHeight,
      );
    }
    this.canvasCtx.globalAlpha = 1;
  }

  /**
   * Sets a random time for the blink to happen.
   */
  setBlinkDelay() {
    this.blinkDelay = Math.ceil(Math.random() * TREX_BLINK_TIMING);
  }

  /**
   * Make t-rex blink at random intervals.
   * @param {number} time Current time in milliseconds.
   */
  blink(time: number) {
    const deltaTime = time - this.animStartTime;

    if (deltaTime >= this.blinkDelay) {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);

      if (this.currentFrame === 1) {
        // Set new random delay to blink.
        this.setBlinkDelay();
        this.animStartTime = time;
        this.blinkCount++;
      }
    }
  }

  /**
   * Initialise a jump.
   * @param {number} speed
   */
  startJump(speed: number) {
    if (!this.jumping) {
      this.update(0, TrexStatus.JUMPING);
      // Tweak the jump velocity based on the speed.
      this.jumpVelocity = this.config.INITIAL_JUMP_VELOCITY - speed / 10;
      this.jumping = true;
      this.reachedMinHeight = false;
      this.speedDrop = false;

      if (this.config.INVERT_JUMP) {
        this.minJumpHeight = this.groundYPos + this.config.MIN_JUMP_HEIGHT;
      }
    }
  }

  /**
   * Jump is complete, falling down.
   */
  endJump() {
    if (
      this.reachedMinHeight &&
      this.jumpVelocity < this.config.DROP_VELOCITY
    ) {
      this.jumpVelocity = this.config.DROP_VELOCITY;
    }
  }

  /**
   * Update frame for a jump.
   * @param {number} deltaTime
   */
  updateJump(deltaTime: number) {
    const msPerFrame = Trex.animFrames[this.status].msPerFrame;
    const framesElapsed = deltaTime / msPerFrame;

    // Speed drop makes Trex fall faster.
    if (this.speedDrop) {
      this.yPos += Math.round(
        this.jumpVelocity * this.config.SPEED_DROP_COEFFICIENT * framesElapsed,
      );
    } else if (this.config.INVERT_JUMP) {
      this.yPos -= Math.round(this.jumpVelocity * framesElapsed);
    } else {
      this.yPos += Math.round(this.jumpVelocity * framesElapsed);
    }

    this.jumpVelocity += this.config.GRAVITY * framesElapsed;

    // Minimum height has been reached.
    if (
      (this.config.INVERT_JUMP && this.yPos > this.minJumpHeight) ||
      (!this.config.INVERT_JUMP && this.yPos < this.minJumpHeight) ||
      this.speedDrop
    ) {
      this.reachedMinHeight = true;
    }

    // Reached max height.
    if (
      (this.config.INVERT_JUMP && this.yPos > -this.config.MAX_JUMP_HEIGHT) ||
      (!this.config.INVERT_JUMP && this.yPos < this.config.MAX_JUMP_HEIGHT) ||
      this.speedDrop
    ) {
      this.endJump();
    }

    // Back down at ground level. Jump completed.
    if (
      (this.config.INVERT_JUMP && this.yPos) < this.groundYPos ||
      (!this.config.INVERT_JUMP && this.yPos) > this.groundYPos
    ) {
      this.reset();
      this.jumpCount++;

      if (Runner.audioCues) {
        Runner.generatedSoundFx.loopFootSteps();
      }
    }
  }

  /**
   * Set the speed drop. Immediately cancels the current jump.
   */
  setSpeedDrop() {
    this.speedDrop = true;
    this.jumpVelocity = 1;
  }

  setDuck(isDucking: boolean) {
    if (isDucking && this.status !== TrexStatus.DUCKING) {
      this.update(0, TrexStatus.DUCKING);
      this.ducking = true;
    } else if (this.status === TrexStatus.DUCKING) {
      this.update(0, TrexStatus.RUNNING);
      this.ducking = false;
    }
  }

  reset() {
    this.xPos = this.xInitialPos;
    this.yPos = this.groundYPos;
    this.jumpVelocity = 0;
    this.jumping = false;
    this.ducking = false;
    this.update(0, TrexStatus.RUNNING);
    this.midair = false;
    this.speedDrop = false;
    this.jumpCount = 0;
  }
}
