import BackgroundEl from "./BackgroundEl.js";
import Cloud from "./Cloud.js";
import Obstacle from "./Obstacle.js";
import Runner from "./Runner.js";
import HorizonLine from "./HorizonLine.js";
import Sprite, { Dimensions, Stage } from "./sprite.js";
import NightMode from "./NightMode.js";
import { getRandomNum } from "./utils.js";

/**
 * Horizon config.
 */
enum HorizonConfig {
  BG_CLOUD_SPEED = 0.2,
  BUMPY_THRESHOLD = 0.3,
  CLOUD_FREQUENCY = 0.5,
  HORIZON_HEIGHT = 16,
  MAX_CLOUDS = 6,
}

export default class Horizon {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  dimensions: Dimensions;
  gapCoefficient: number;
  obstacles: Obstacle[];
  obstacleHistory: string[];
  horizonOffsets: [number, number];
  cloudFrequency: number;
  spritePos: Stage;
  nightMode: NightMode;

  // Cloud
  clouds: Cloud[];
  cloudSpeed: number;

  // Background elements
  backgroundEls: BackgroundEl[];
  lastEl: string;
  backgroundSpeed: number;

  // Horizon
  horizonLine: HorizonLine;
  horizonLines: HorizonLine[];
  runningTime: number;

  /**
   * Horizon background class.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} spritePos Sprite positioning.
   * @param {Object} dimensions Canvas dimensions.
   * @param {number} gapCoefficient
   */
  constructor(
    canvas: HTMLCanvasElement,
    spritePos: Stage,
    dimensions: Dimensions,
    gapCoefficient: number,
  ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext("2d");
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.obstacleHistory = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = HorizonConfig.CLOUD_FREQUENCY;
    this.spritePos = spritePos;
    this.nightMode = null;

    // Cloud
    this.clouds = [];
    this.cloudSpeed = HorizonConfig.BG_CLOUD_SPEED;

    // Background elements
    this.backgroundEls = [];
    this.lastEl = null;
    this.backgroundSpeed = HorizonConfig.BG_CLOUD_SPEED;

    // Horizon
    this.horizonLine = null;
    this.horizonLines = [];
    this.init();
  }

  /**
   * Initialise the horizon. Just add the line and a cloud. No obstacles.
   */
  init() {
    Obstacle.types = Sprite.OBSTACLES;
    this.addCloud();
    // Multiple Horizon lines
    for (let i = 0; i < Sprite.LINES.length; i++) {
      this.horizonLines.push(new HorizonLine(this.canvas, Sprite.LINES[i]));
    }

    this.nightMode = new NightMode(
      this.canvas,
      this.spritePos.MOON,
      this.dimensions.WIDTH,
    );
  }

  /**
   * Update obstacle definitions based on the speed of the game.
   */
  adjustObstacleSpeed() {
    for (let i = 0; i < Obstacle.types.length; i++) {
      if (Runner.slowDown) {
        Obstacle.types[i].multipleSpeed = Obstacle.types[i].multipleSpeed / 2;
        Obstacle.types[i].minGap *= 1.5;
        Obstacle.types[i].minSpeed = Obstacle.types[i].minSpeed / 2;

        // Convert variable y position obstacles to fixed.
        if (typeof Obstacle.types[i].yPos == "object") {
          Obstacle.types[i].yPos = Obstacle.types[i].yPos[0];
          Obstacle.types[i].yPosMobile = Obstacle.types[i].yPos[0];
        }
      }
    }
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
    this.runningTime += deltaTime;

    for (let i = 0; i < this.horizonLines.length; i++) {
      this.horizonLines[i].update(deltaTime, currentSpeed);
    }

    this.nightMode.update(showNightMode);
    this.updateClouds(deltaTime, currentSpeed);

    if (updateObstacles) {
      this.updateObstacles(deltaTime, currentSpeed);
    }
  }

  /**
   * Update background element positions. Also handles creating new elements.
   * @param {number} elSpeed
   * @param {Array<Object>} bgElArray
   * @param {number} maxBgEl
   * @param {Function} bgElAddFunction
   * @param {number} frequency
   */
  updateBackgroundEl(
    elSpeed: number,
    bgElArray: (Cloud | BackgroundEl)[],
    maxBgEl: number,
    bgElAddFunction: () => void,
    frequency: number,
  ) {
    const numElements = bgElArray.length;

    if (numElements) {
      for (let i = numElements - 1; i >= 0; i--) {
        bgElArray[i].update(elSpeed);
      }

      const lastEl = bgElArray[numElements - 1];

      // Check for adding a new element.
      if (
        numElements < maxBgEl &&
        this.dimensions.WIDTH - lastEl.xPos > lastEl.gap &&
        frequency > Math.random()
      ) {
        bgElAddFunction();
      }
    } else {
      bgElAddFunction();
    }
  }

  /**
   * Update the cloud positions.
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateClouds(deltaTime: number, speed: number) {
    const elSpeed = (this.cloudSpeed / 1000) * deltaTime * speed;
    this.updateBackgroundEl(
      elSpeed,
      this.clouds,
      HorizonConfig.MAX_CLOUDS,
      this.addCloud.bind(this),
      this.cloudFrequency,
    );

    // Remove expired elements.
    this.clouds = this.clouds.filter((obj) => !obj.remove);
  }

  /**
   * Update the background element positions.
   * @param {number} deltaTime
   */
  updateBackgroundEls(deltaTime: number) {
    this.updateBackgroundEl(
      deltaTime,
      this.backgroundEls,
      BackgroundEl.config.MAX_BG_ELS,
      this.addBackgroundEl.bind(this),
      this.cloudFrequency,
    );

    // Remove expired elements.
    this.backgroundEls = this.backgroundEls.filter((obj) => !obj.remove);
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
  duplicateObstacleCheck(nextObstacleType): boolean {
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
    for (let l = 0; l < this.horizonLines.length; l++) {
      this.horizonLines[l].reset();
    }

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
    this.clouds.push(
      new Cloud(this.canvas, this.spritePos.CLOUD, this.dimensions.WIDTH),
    );
  }

  /**
   * Add a random background element to the horizon.
   */
  addBackgroundEl() {
    const backgroundElTypes = Object.keys(Sprite.BACKGROUND_EL);

    if (backgroundElTypes.length > 0) {
      let index = getRandomNum(0, backgroundElTypes.length - 1);
      let type = backgroundElTypes[index];

      // Add variation if available.
      while (type == this.lastEl && backgroundElTypes.length > 1) {
        index = getRandomNum(0, backgroundElTypes.length - 1);
        type = backgroundElTypes[index];
      }

      this.lastEl = type;
      this.backgroundEls.push(
        new BackgroundEl(
          this.canvas,
          this.spritePos.BACKGROUND_EL,
          this.dimensions.WIDTH,
          type,
        ),
      );
    }
  }
}
