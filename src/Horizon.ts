// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import Cloud from "./sprite/Cloud.ts";
import Obstacle from "./Obstacle.ts";
import Runner from "./Runner.ts";
import HorizonLine from "./sprite/HorizonLine.ts";
import Sprite, { Dimensions, SpritePosition } from "./sprite/Config.ts";
import NightMode from "./NightMode.ts";
import { getRandomNum } from "./utils.ts";
import { FPS } from "./constants.ts";

enum HorizonConfig {
  /** 云和背景的移动速度 */
  BG_CLOUD_SPEED = 0.2,
  BUMPY_THRESHOLD = 0.3,
  HORIZON_HEIGHT = 16,
}

export default class Horizon {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  dimensions: Dimensions;
  gapCoefficient: number;
  obstacles: Obstacle[];
  obstacleHistory: string[];
  horizonOffsets: [number, number];
  spritePos: SpritePosition;
  nightMode: NightMode;

  clouds: Cloud[];

  // Background elements
  lastEl?: string;
  backgroundSpeed: number;

  // Horizon
  horizonLine: HorizonLine;
  /**
   * Horizon background class.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} spritePos Sprite positioning.
   * @param {Object} dimensions Canvas dimensions.
   * @param {number} gapCoefficient
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: SpritePosition,
    dimensions: Dimensions,
    gapCoefficient: number,
  ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext("2d")!;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.obstacleHistory = [];
    this.horizonOffsets = [0, 0];
    this.spritePos = spritePos;

    // Cloud
    this.clouds = [];

    this.backgroundSpeed = HorizonConfig.BG_CLOUD_SPEED;

    // Horizon
    this.horizonLine = new HorizonLine(this.canvas);
    Obstacle.types = Sprite.OBSTACLES;
    this.addCloud();
    this.nightMode = new NightMode(this.canvas, this.dimensions.WIDTH);
  }

  /**
   * @param updateObstacles Used as an override to prevent
   *     the obstacles from being updated / added. This happens in the
   *     ease in section.
   * @param showNightMode Night mode activated.
   */
  update(
    deltaTime: number,
    currentSpeed: number,
    updateObstacles: boolean,
    showNightMode = false,
  ) {
    this.nightMode.update(showNightMode);
    this.updateHorizonLine(deltaTime, currentSpeed);
    this.updateClouds(deltaTime, currentSpeed);

    if (updateObstacles) {
      this.updateObstacles(deltaTime, currentSpeed);
    }
  }

  /**
   * 更新云的位置
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateClouds(deltaTime: number, speed: number) {
    const elSpeed = Math.ceil(
      (HorizonConfig.BG_CLOUD_SPEED / 1000) * deltaTime * speed,
    );

    if (this.needAdded()) {
      this.addCloud();
    }

    // 更新云
    this.clouds.forEach((x) => x.update(elSpeed));
    // 移除在画布中不可见的云
    this.clouds = this.clouds.filter((obj) => obj.isVisible());
  }

  /**
   * 更新 HorizonLine 的位置
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateHorizonLine(deltaTime: number, speed: number) {
    const increment = Math.floor(speed * (FPS / 1000) * deltaTime);
    this.horizonLine.update(increment);
  }

  /**
   * 是否需要添加云。添加云的条件：
   *
   * 1. 当前画布中没有云
   * 1. 最后一个云的移动距离大于云的间隙
   */
  needAdded() {
    const count = this.clouds.length;

    if (count === 0) {
      return true;
    }

    const last = this.clouds[count - 1];
    return this.dimensions.WIDTH - last.x > last.gap;
  }

  /**
   * Update the obstacle positions.
   * @param {number} deltaTime
   * @param {number} currentSpeed
   */
  updateObstacles(deltaTime: number, currentSpeed: number) {
    const updatedObstacles = this.obstacles.slice(0);

    for (let i = 0; i < this.obstacles.length; i++) {
      const obstacle = this.obstacles[i];
      obstacle.update(deltaTime, currentSpeed);

      // Clean up existing obstacles.
      if (obstacle.remove) {
        updatedObstacles.shift();
      }
    }
    this.obstacles = updatedObstacles;

    if (this.obstacles.length > 0) {
      const lastObstacle = this.obstacles[this.obstacles.length - 1];

      if (
        lastObstacle &&
        !lastObstacle.followingObstacleCreated &&
        lastObstacle.isVisible() &&
        lastObstacle.xPos + lastObstacle.width + lastObstacle.gap <
          this.dimensions.WIDTH
      ) {
        this.addNewObstacle(currentSpeed);
        lastObstacle.followingObstacleCreated = true;
      }
    } else {
      // Create new obstacles.
      this.addNewObstacle(currentSpeed);
    }
  }

  removeFirstObstacle() {
    this.obstacles.shift();
  }

  /**
   * Add a new obstacle.
   * @param {number} currentSpeed
   */
  addNewObstacle(currentSpeed: number) {
    const obstacleCount = Obstacle.types.length - 2;
    const obstacleTypeIndex = obstacleCount > 0
      ? getRandomNum(0, obstacleCount)
      : 0;
    const obstacleType = Obstacle.types[obstacleTypeIndex];

    // Check for multiples of the same type of obstacle.
    // Also check obstacle is available at current speed.
    if (
      (obstacleCount > 0 && this.duplicateObstacleCheck(obstacleType.type)) ||
      currentSpeed < obstacleType.minSpeed
    ) {
      this.addNewObstacle(currentSpeed);
    } else {
      const obstacleSpritePos = this.spritePos[obstacleType.type];

      this.obstacles.push(
        new Obstacle(
          this.canvasCtx,
          obstacleType,
          obstacleSpritePos,
          this.dimensions,
          this.gapCoefficient,
          currentSpeed,
          obstacleType.width,
        ),
      );

      this.obstacleHistory.unshift(obstacleType.type);

      if (this.obstacleHistory.length > 1) {
        this.obstacleHistory.splice(Runner.config.MAX_OBSTACLE_DUPLICATION);
      }
    }
  }

  /**
   * Returns whether the previous two obstacles are the same as the next one.
   * Maximum duplication is set in config value MAX_OBSTACLE_DUPLICATION.
   * @return {boolean}
   */
  duplicateObstacleCheck(nextObstacleType: string): boolean {
    let duplicateCount = 0;

    for (let i = 0; i < this.obstacleHistory.length; i++) {
      duplicateCount = this.obstacleHistory[i] === nextObstacleType
        ? duplicateCount + 1
        : 0;
    }
    return duplicateCount >= Runner.config.MAX_OBSTACLE_DUPLICATION;
  }

  /**
   * Reset the horizon layer.
   * Remove existing obstacles and reposition the horizon line.
   */
  reset() {
    this.obstacles = [];
    this.horizonLine.reset();
    this.nightMode.reset();
  }

  /**
   * Update the canvas width and scaling.
   * @param {number} width Canvas width.
   * @param {number} height Canvas height.
   */
  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Add a new cloud to the horizon.
   */
  addCloud() {
    this.clouds.push(new Cloud(this.canvas));
  }
}
