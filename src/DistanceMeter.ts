// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import { IS_HIDPI } from "./constants.ts";
import { getTimeStamp } from "./utils.ts";
import Runner from "./Runner.ts";
import { Position } from "./sprite/Config.ts";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

enum Dimensions {
  WIDTH = 10,
  HEIGHT = 13,
  DEST_WIDTH = 11,
}

/**
 * Distance meter config.
 */
enum DistanceMeterConfig {
  // Number of digits.
  MAX_DISTANCE_UNITS = 5,

  // Distance that causes achievement animation.
  ACHIEVEMENT_DISTANCE = 100,

  // Used for conversion from pixel distance to a scaled unit.
  COEFFICIENT = 0.025,

  // Flash duration in milliseconds.
  FLASH_DURATION = 1000 / 4,

  // Flash iterations for achievement animation.
  FLASH_ITERATIONS = 3,

  // Padding around the high score hit area.
  HIGH_SCORE_HIT_AREA_PADDING = 4,
}

export default class DistanceMeter {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  image: HTMLImageElement;
  spritePos: Position;
  x: number;
  y: number;

  currentDistance: number;
  maxScore: number;
  highScore: string | string[];
  distance?: number;
  container: null;

  digits: string[];
  achievement: boolean;
  defaultString: string;
  flashTimer: number;
  flashIterations: number;
  invertTrigger: boolean;
  flashingRafId?: number;
  highScoreBounds: Bounds;
  highScoreFlashing: boolean;
  frameTimeStamp: number;

  maxScoreUnits = DistanceMeterConfig.MAX_DISTANCE_UNITS;

  /**
   * Y positioning of the digits in the sprite sheet.
   *
   * X position is always 0.
   */
  static yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];

  /**
   * Handles displaying the distance meter.
   * @param canvas
   * @param spritePos Image position in sprite.
   * @param canvasWidth
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: Position,
    canvasWidth: number,
  ) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
    this.image = Runner.imageSprite;
    this.spritePos = spritePos;
    this.x = 0;
    this.y = 5;

    this.currentDistance = 0;
    this.maxScore = 0;
    this.highScore = "0";
    this.container = null;

    this.digits = [];
    this.achievement = false;
    this.defaultString = "";
    this.flashTimer = 0;
    this.flashIterations = 0;
    this.invertTrigger = false;
    this.flashingRafId = 0;
    this.highScoreBounds = this.getHighScoreBounds();
    this.highScoreFlashing = false;
    this.frameTimeStamp = getTimeStamp();

    this.maxScoreUnits = DistanceMeterConfig.MAX_DISTANCE_UNITS;
    this.init(canvasWidth);
  }

  /**
   * 初始化距离为 '00000'.
   */
  init(width: number) {
    let maxDistanceStr = "";

    this.calcXPos(width);
    this.maxScore = this.maxScoreUnits;
    for (let i = 0; i < this.maxScoreUnits; i++) {
      this.draw(i, 0);
      this.defaultString += "0";
      maxDistanceStr += "9";
    }

    this.maxScore = parseInt(maxDistanceStr, 10);
  }

  /**
   * 计算 xPos in the canvas.
   */
  calcXPos(canvasWidth: number) {
    this.x = canvasWidth - Dimensions.DEST_WIDTH * (this.maxScoreUnits + 1);
  }

  /**
   * Draw a digit to canvas.
   * @param digitPos Position of the digit.
   * @param value Digit value 0-9.
   * @param optHighScore Whether drawing the high score.
   */
  draw(digitPos: number, value: number, optHighScore?: boolean) {
    let sourceWidth = Dimensions.WIDTH;
    let sourceHeight = Dimensions.HEIGHT;
    let sourceX = Dimensions.WIDTH * value;
    let sourceY = 0;

    const targetX = digitPos * Dimensions.DEST_WIDTH;
    const targetY = this.y;
    const targetWidth = Dimensions.WIDTH;
    const targetHeight = Dimensions.HEIGHT;

    // For high DPI we 2x source values.
    if (IS_HIDPI) {
      sourceWidth *= 2;
      sourceHeight *= 2;
      sourceX *= 2;
    }

    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    this.canvasCtx.save();

    const highScoreX = this.x - this.maxScoreUnits * 2 * Dimensions.WIDTH;
    if (optHighScore) {
      this.canvasCtx.translate(highScoreX, this.y);
    } else {
      this.canvasCtx.translate(this.x, this.y);
    }

    this.canvasCtx.drawImage(
      this.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      targetX,
      targetY,
      targetWidth,
      targetHeight,
    );

    this.canvasCtx.restore();
  }

  /**
   * 将距离由像素值转换为真实值
   * @param distance Pixel distance ran.
   */
  getActualDistance(distance: number): number {
    return distance
      ? Math.round(distance * DistanceMeterConfig.COEFFICIENT)
      : 0;
  }

  /**
   * 更新距离计数器
   * @param distance
   * @param deltaTime
   * @return 是否播放声音
   */
  update(deltaTime: number, distance: number): boolean {
    let paint = true;
    let playSound = false;

    if (!this.achievement) {
      distance = this.getActualDistance(distance);
      // Score has gone beyond the initial digit count.
      if (
        distance > this.maxScore &&
        this.maxScoreUnits == DistanceMeterConfig.MAX_DISTANCE_UNITS
      ) {
        this.maxScoreUnits++;
        this.maxScore = parseInt(this.maxScore + "9", 10);
      } else {
        this.distance = 0;
      }

      if (distance > 0) {
        // Achievement unlocked.
        if (distance % DistanceMeterConfig.ACHIEVEMENT_DISTANCE === 0) {
          // Flash score and play sound.
          this.achievement = true;
          this.flashTimer = 0;
          playSound = true;
        }

        // Create a string representation of the distance with leading 0.
        const distanceStr = (this.defaultString + distance).substr(
          -this.maxScoreUnits,
        );
        this.digits = distanceStr.split("");
      } else {
        this.digits = this.defaultString.split("");
      }
    } else {
      // Control flashing of the score on reaching acheivement.
      if (this.flashIterations <= DistanceMeterConfig.FLASH_ITERATIONS) {
        this.flashTimer += deltaTime;

        if (this.flashTimer < DistanceMeterConfig.FLASH_DURATION) {
          paint = false;
        } else if (this.flashTimer > DistanceMeterConfig.FLASH_DURATION * 2) {
          this.flashTimer = 0;
          this.flashIterations++;
        }
      } else {
        this.achievement = false;
        this.flashIterations = 0;
        this.flashTimer = 0;
      }
    }

    // Draw the digits if not flashing.
    if (paint) {
      for (let i = this.digits.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.digits[i], 10));
      }
    }

    this.drawHighScore();
    return playSound;
  }

  /**
   * 绘制最高分
   */
  drawHighScore() {
    if (parseInt(String(this.highScore), 10) > 0) {
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = 0.8;
      for (let i = this.highScore.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.highScore[i], 10), true);
      }
      this.canvasCtx.restore();
    }
  }

  /**
   * Set the highscore as a array string.
   * Position of char in the sprite: H - 10, I - 11.
   * @param {number} distance Distance ran in pixels.
   */
  setHighScore(distance: number) {
    distance = this.getActualDistance(distance);
    const highScoreStr = (this.defaultString + distance).substr(
      -this.maxScoreUnits,
    );

    this.highScore = ["10", "11", ""].concat(highScoreStr.split(""));
  }

  /**
   * 是否点击了最高分
   * @param e Event object.
   */
  hasClickedOnHighScore(e: TouchEvent | MouseEvent) {
    let x = 0;
    let y = 0;

    if (isTouchEvent(e)) {
      // Bounds for touch differ from pointer.
      const canvasBounds = this.canvas.getBoundingClientRect();
      x = e.touches[0].clientX - canvasBounds.left;
      y = e.touches[0].clientY - canvasBounds.top;
    } else {
      x = e.offsetX;
      y = e.offsetY;
    }

    this.highScoreBounds = this.getHighScoreBounds();
    return (
      x >= this.highScoreBounds.x &&
      x <= this.highScoreBounds.x + this.highScoreBounds.width &&
      y >= this.highScoreBounds.y &&
      y <= this.highScoreBounds.y + this.highScoreBounds.height
    );
  }

  /**
   * 获取最高分显示区域边界
   */
  getHighScoreBounds(): Bounds {
    return {
      x: this.x -
        this.maxScoreUnits * 2 * Dimensions.WIDTH -
        DistanceMeterConfig.HIGH_SCORE_HIT_AREA_PADDING,
      y: this.y,
      width: Dimensions.WIDTH * (this.highScore.length + 1) +
        DistanceMeterConfig.HIGH_SCORE_HIT_AREA_PADDING,
      height: Dimensions.HEIGHT +
        DistanceMeterConfig.HIGH_SCORE_HIT_AREA_PADDING * 2,
    };
  }

  /**
   * Animate flashing the high score to indicate ready for resetting.
   * The flashing stops following `DistanceMeterConfig.FLASH_ITERATIONS x 2` flashes.
   */
  flashHighScore() {
    const now = getTimeStamp();
    const deltaTime = now - (this.frameTimeStamp || now);
    let paint = true;
    this.frameTimeStamp = now;

    // Reached the max number of flashes.
    if (this.flashIterations > DistanceMeterConfig.FLASH_ITERATIONS * 2) {
      this.cancelHighScoreFlashing();
      return;
    }

    this.flashTimer += deltaTime;

    if (this.flashTimer < DistanceMeterConfig.FLASH_DURATION) {
      paint = false;
    } else if (this.flashTimer > DistanceMeterConfig.FLASH_DURATION * 2) {
      this.flashTimer = 0;
      this.flashIterations++;
    }

    if (paint) {
      this.drawHighScore();
    } else {
      this.clearHighScoreBounds();
    }
    // Frame update.
    this.flashingRafId = requestAnimationFrame(this.flashHighScore.bind(this));
  }

  /**
   * 绘制一个空的最高分矩形
   */
  clearHighScoreBounds() {
    this.canvasCtx.save();
    this.canvasCtx.fillStyle = "#fff";
    this.canvasCtx.rect(
      this.highScoreBounds.x,
      this.highScoreBounds.y,
      this.highScoreBounds.width,
      this.highScoreBounds.height,
    );
    this.canvasCtx.fill();
    this.canvasCtx.restore();
  }

  /**
   * 开始刷新最高分
   */
  startHighScoreFlashing() {
    this.highScoreFlashing = true;
    this.flashHighScore();
  }

  /**
   * 最高分是否在刷新
   */
  isHighScoreFlashing() {
    return this.highScoreFlashing;
  }

  /**
   * 停止刷新最高分
   */
  cancelHighScoreFlashing() {
    if (this.flashingRafId) {
      cancelAnimationFrame(this.flashingRafId);
    }
    this.flashIterations = 0;
    this.flashTimer = 0;
    this.highScoreFlashing = false;
    this.clearHighScoreBounds();
    this.drawHighScore();
  }

  /**
   * 清除最高分
   */
  resetHighScore() {
    this.setHighScore(0);
    this.cancelHighScoreFlashing();
  }

  /**
   * 将距离重置为 '00000'.
   */
  reset() {
    this.update(0, 0);
    this.achievement = false;
  }
}

function isTouchEvent(e: TouchEvent | MouseEvent): e is TouchEvent {
  return Boolean((e as TouchEvent).touches);
}
