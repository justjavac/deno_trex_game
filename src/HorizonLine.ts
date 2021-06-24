import { FPS, IS_HIDPI } from "./constants.ts";
import { LineSprite } from "./sprite/Config.ts";
import Runner from "./Runner.ts";

interface HorizonLineDimensions {
  WIDTH: number;
  HEIGHT: number;
  YPOS: number;
}

interface Position {
  x: number;
  y: number;
}

export default class HorizonLine {
  /** Horizon line dimensions. */
  static dimensions: HorizonLineDimensions = {
    WIDTH: 600,
    HEIGHT: 12,
    YPOS: 127,
  };

  spritePos: Position;
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  sourceDimensions: HorizonLineDimensions;
  dimensions: HorizonLineDimensions;

  sourceXPos: [number, number];
  xPos: number[];
  yPos: number;
  bumpThreshold: number;

  /**
   * Horizon Line.
   * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
   * @param canvas
   * @param lineConfig Configuration object.
   */
  constructor(canvas: HTMLCanvasElement, lineConfig: LineSprite) {
    let sourceX = lineConfig.SOURCE_X;
    let sourceY = lineConfig.SOURCE_Y;

    if (IS_HIDPI) {
      sourceX *= 2;
      sourceY *= 2;
    }

    this.spritePos = { x: sourceX, y: sourceY };
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
    this.sourceDimensions = { WIDTH: 0, HEIGHT: 0, YPOS: 0 };
    this.dimensions = lineConfig;

    this.sourceXPos = [
      this.spritePos.x,
      this.spritePos.x + this.dimensions.WIDTH,
    ];
    this.xPos = [];
    this.yPos = 0;
    this.bumpThreshold = 0.5;

    this.setSourceDimensions(lineConfig);
    this.draw();
  }

  /**
   * Set the source dimensions of the horizon line.
   */
  setSourceDimensions(newDimensions: LineSprite) {
    let dimension: keyof LineSprite;
    for (dimension in newDimensions) {
      if (dimension !== "SOURCE_X" && dimension !== "SOURCE_Y") {
        if (IS_HIDPI) {
          if (dimension !== "YPOS") {
            this.sourceDimensions[dimension] = newDimensions[dimension] * 2;
          }
        } else {
          this.sourceDimensions[dimension] = newDimensions[dimension];
        }
        this.dimensions[dimension] = newDimensions[dimension];
      }
    }

    this.xPos = [0, newDimensions.WIDTH];
    this.yPos = newDimensions.YPOS;
  }

  /**
   * Return the crop x position of a type.
   */
  getRandomType() {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
  }

  /**
   * Draw the horizon line.
   */
  draw() {
    this.canvasCtx.drawImage(
      Runner.imageSprite,
      this.sourceXPos[0],
      this.spritePos.y,
      this.sourceDimensions.WIDTH,
      this.sourceDimensions.HEIGHT,
      this.xPos[0],
      this.yPos,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    );

    this.canvasCtx.drawImage(
      Runner.imageSprite,
      this.sourceXPos[1],
      this.spritePos.y,
      this.sourceDimensions.WIDTH,
      this.sourceDimensions.HEIGHT,
      this.xPos[1],
      this.yPos,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    );
  }

  /**
   * Update the x position of an indivdual piece of the line.
   * @param {number} pos Line position.
   * @param {number} increment
   */
  updateXPos(pos: number, increment: number) {
    const line1 = pos;
    const line2 = pos === 0 ? 1 : 0;

    this.xPos[line1] -= increment;
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
      this.xPos[line1] += this.dimensions.WIDTH * 2;
      this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
      this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
    }
  }

  /**
   * Update the horizon line.
   * @param {number} deltaTime
   * @param {number} speed
   */
  update(deltaTime: number, speed: number) {
    const increment = Math.floor(speed * (FPS / 1000) * deltaTime);

    if (this.xPos[0] <= 0) {
      this.updateXPos(0, increment);
    } else {
      this.updateXPos(1, increment);
    }
    this.draw();
  }

  /**
   * Reset horizon to the starting position.
   */
  reset() {
    this.xPos[0] = 0;
    this.xPos[1] = this.dimensions.WIDTH;
  }
}
