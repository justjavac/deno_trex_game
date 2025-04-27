// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import CollisionBox from "./CollisionBox.ts";
import { FPS, IS_HIDPI, IS_MOBILE } from "./constants.ts";
import Runner from "./Runner.ts";
import { Dimensions, ObstacleType, Position } from "./sprite/Config.ts";
import { getRandomNum } from "./utils.ts";

export default class Obstacle {
  static types: ObstacleType[];
  /** 最大间隙系数. */
  static MAX_GAP_COEFFICIENT = 1.5;

  /** 最大障碍物长度. */
  static MAX_OBSTACLE_LENGTH = 3;

  canvasCtx: CanvasRenderingContext2D;
  spritePos: Position;
  typeConfig: ObstacleType;
  gapCoefficient: number;
  size: number;
  dimensions: Dimensions;
  remove: boolean;
  xPos: number;
  yPos: number;
  width: number;
  collisionBoxes: CollisionBox[];
  gap: number;
  speedOffset: number;
  imageSprite: CanvasImageSource;

  // For animated obstacles.
  currentFrame: number;
  timer: number;
  jumpAlerted?: boolean;
  followingObstacleCreated?: boolean;

  /**
   * Obstacle.
   * @param {number} gapCoefficient Mutipler in determining the gap.
   * @param {number=} optXOffset
   */
  constructor(
    canvasCtx: CanvasRenderingContext2D,
    type: ObstacleType,
    spriteImgPos: Position,
    dimensions: Dimensions,
    gapCoefficient: number,
    speed: number,
    optXOffset: number | undefined,
  ) {
    this.canvasCtx = canvasCtx;
    this.spritePos = spriteImgPos;
    this.typeConfig = type;
    this.gapCoefficient = gapCoefficient;
    this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
    this.dimensions = dimensions;
    this.remove = false;
    this.xPos = dimensions.WIDTH + (optXOffset || 0);
    this.yPos = 0;
    this.width = 0;
    this.collisionBoxes = [];
    this.gap = 0;
    this.speedOffset = 0;
    this.imageSprite = Runner.imageSprite;

    // For animated obstacles.
    this.currentFrame = 0;
    this.timer = 0;

    this.init(speed);
  }

  /**
   * Initialise the DOM for the obstacle.
   * @param {number} speed
   */
  init(speed: number) {
    this.cloneCollisionBoxes();

    // 只有在正确的速度下才允许调整尺寸
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
      this.size = 1;
    }

    this.width = this.typeConfig.width * this.size;

    // 检查障碍物是否能定位在不同高度
    if (Array.isArray(this.typeConfig.yPos)) {
      const yPosConfig = IS_MOBILE
        ? (this.typeConfig.yPosMobile as number[])
        : this.typeConfig.yPos;
      this.yPos = yPosConfig[getRandomNum(0, (yPosConfig).length - 1)];
    } else {
      this.yPos = this.typeConfig.yPos;
    }

    this.draw();

    // 进行碰撞盒调整，
    // Central box is adjusted to the size as one box.
    //      ____        ______        ________
    //    _|   |-|    _|     |-|    _|       |-|
    //   | |<->| |   | |<--->| |   | |<----->| |
    //   | | 1 | |   | |  2  | |   | |   3   | |
    //   |_|___|_|   |_|_____|_|   |_|_______|_|
    //
    if (this.size > 1) {
      this.collisionBoxes[1].width = this.width -
        this.collisionBoxes[0].width -
        this.collisionBoxes[2].width;
      this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
    }

    // 有些障碍物的移动速度和地平线速度不同
    if (this.typeConfig.speedOffset) {
      this.speedOffset = Math.random() > 0.5
        ? this.typeConfig.speedOffset
        : -this.typeConfig.speedOffset;
    }

    this.gap = this.getGap(this.gapCoefficient, speed);

    // Increase gap for audio cues enabled.
    if (Runner.audioCues) {
      this.gap *= 2;
    }
  }

  draw() {
    let sourceWidth = this.typeConfig.width;
    let sourceHeight = this.typeConfig.height;

    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2;
      sourceHeight = sourceHeight * 2;
    }

    // X position in sprite.
    let sourceX = sourceWidth * this.size * (0.5 * (this.size - 1)) +
      this.spritePos.x;

    // Animation frames.
    if (this.currentFrame > 0) {
      sourceX += sourceWidth * this.currentFrame;
    }

    this.canvasCtx.drawImage(
      this.imageSprite,
      sourceX,
      this.spritePos.y,
      sourceWidth * this.size,
      sourceHeight,
      this.xPos,
      this.yPos,
      this.typeConfig.width * this.size,
      this.typeConfig.height,
    );
  }

  /**
   * Obstacle frame update.
   * @param {number} deltaTime
   * @param {number} speed
   */
  update(deltaTime: number, speed: number) {
    if (!this.remove) {
      if (this.typeConfig.speedOffset) {
        speed += this.speedOffset;
      }
      this.xPos -= Math.floor(((speed * FPS) / 1000) * deltaTime);

      // Update frame
      if (this.typeConfig.numFrames) {
        this.timer += deltaTime;
        if (this.timer >= Number(this.typeConfig.frameRate)) {
          this.currentFrame =
            this.currentFrame === this.typeConfig.numFrames - 1
              ? 0
              : this.currentFrame + 1;
          this.timer = 0;
        }
      }
      this.draw();

      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  }

  /**
   * Calculate a random gap size.
   * - Minimum gap gets wider as speed increses
   * @param {number} gapCoefficient
   * @param {number} speed
   * @return {number} The gap size.
   */
  getGap(gapCoefficient: number, speed: number): number {
    const minGap = Math.round(
      this.width * speed + this.typeConfig.minGap * gapCoefficient,
    );
    const maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
    return getRandomNum(minGap, maxGap);
  }

  isVisible() {
    return this.xPos + this.width > 0;
  }

  /**
   * 复制碰撞框，因为这些碰撞框会根据障碍物的类型和大小而改变
   */
  cloneCollisionBoxes() {
    const collisionBoxes = this.typeConfig.collisionBoxes;

    for (let i = collisionBoxes.length - 1; i >= 0; i--) {
      this.collisionBoxes[i] = new CollisionBox(
        collisionBoxes[i].x,
        collisionBoxes[i].y,
        collisionBoxes[i].width,
        collisionBoxes[i].height,
      );
    }
  }
}
