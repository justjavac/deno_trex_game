// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import CollisionBox from "../CollisionBox.ts";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Dimensions {
  WIDTH: number;
  HEIGHT: number;
}

/**
 * Obstacle definitions.
 * minGap: minimum pixel space between obstacles.
 * multipleSpeed: Speed at which multiples are allowed.
 * speedOffset: speed faster / slower than the horizon.
 * minSpeed: Minimum speed which the obstacle can make an appearance.
 */
export interface ObstacleType {
  type: keyof SpritePosition;
  width: number;
  height: number;
  yPos: number | number[];
  yPosMobile?: number | number[];
  multipleSpeed: number;
  minGap: number;
  minSpeed: number;
  collisionBoxes: CollisionBox[];
  numFrames?: number;
  frameRate?: number;
  speedOffset?: number;
}

export interface SpritePosition {
  CACTUS_LARGE: Position;
  CACTUS_SMALL: Position;
  OBSTACLE_2: Position;
  OBSTACLE: Position;
  CLOUD: Position;
  HORIZON: Position;
  MOON: Position;
  PTERODACTYL: Position;
  RESTART: Position;
  TEXT_SPRITE: Position;
  TREX: Position;
  STAR: Position;
  COLLECTABLE: Position;
}

export interface Offset {
  x: number;
  w: number;
  h: number;
  xOffset: number;
}

export interface TrexSprite {
  WAITING_1: Offset;
  WAITING_2: Offset;
  RUNNING_1: Offset;
  RUNNING_2: Offset;
  JUMPING: Offset;
  CRASHED: Offset;
  COLLISION_BOXES: CollisionBox[];
}

export interface CloudSprite {
  HEIGHT: number;
  MAX_CLOUD_GAP: number;
  MAX_SKY_LEVEL: number;
  MIN_CLOUD_GAP: number;
  MIN_SKY_LEVEL: number;
  OFFSET: number;
  WIDTH: number;
  X_POS: number;
  Y_POS: number;
}

export interface LineSprite {
  SOURCE_X: number;
  SOURCE_Y: number;
  WIDTH: number;
  HEIGHT: number;
  YPOS: number;
}

export interface SpritePositoninition {
  LDPI: SpritePosition;
  HDPI: SpritePosition;
  TREX: TrexSprite;
  OBSTACLES: ObstacleType[];
  LINES: LineSprite[];
}

/**
 * T-Rex runner sprite definitions.
 */
const Config: SpritePositoninition = {
  LDPI: {
    CACTUS_LARGE: { x: 332, y: 2 },
    CACTUS_SMALL: { x: 228, y: 2 },
    OBSTACLE_2: { x: 332, y: 2 },
    OBSTACLE: { x: 228, y: 2 },
    CLOUD: { x: 86, y: 2 },
    HORIZON: { x: 2, y: 54 },
    MOON: { x: 484, y: 2 },
    PTERODACTYL: { x: 134, y: 2 },
    RESTART: { x: 2, y: 68 },
    TEXT_SPRITE: { x: 655, y: 2 },
    TREX: { x: 848, y: 2 },
    STAR: { x: 645, y: 2 },
    COLLECTABLE: { x: 2, y: 2 },
  },
  HDPI: {
    CACTUS_LARGE: { x: 652, y: 2 },
    CACTUS_SMALL: { x: 446, y: 2 },
    OBSTACLE_2: { x: 652, y: 2 },
    OBSTACLE: { x: 446, y: 2 },
    CLOUD: { x: 166, y: 2 },
    HORIZON: { x: 2, y: 104 },
    MOON: { x: 954, y: 2 },
    PTERODACTYL: { x: 260, y: 2 },
    RESTART: { x: 2, y: 130 },
    TEXT_SPRITE: { x: 1294, y: 2 },
    TREX: { x: 1678, y: 2 },
    STAR: { x: 1276, y: 2 },
    COLLECTABLE: { x: 4, y: 4 },
  },
  TREX: {
    WAITING_1: { x: 44, w: 44, h: 47, xOffset: 0 },
    WAITING_2: { x: 0, w: 44, h: 47, xOffset: 0 },
    RUNNING_1: { x: 88, w: 44, h: 47, xOffset: 0 },
    RUNNING_2: { x: 132, w: 44, h: 47, xOffset: 0 },
    JUMPING: { x: 0, w: 44, h: 47, xOffset: 0 },
    CRASHED: { x: 220, w: 44, h: 47, xOffset: 0 },
    COLLISION_BOXES: [
      new CollisionBox(22, 0, 17, 16),
      new CollisionBox(1, 18, 30, 9),
      new CollisionBox(10, 35, 14, 8),
      new CollisionBox(1, 24, 29, 5),
      new CollisionBox(5, 30, 21, 4),
      new CollisionBox(9, 34, 15, 4),
    ],
  },
  OBSTACLES: [
    {
      type: "CACTUS_SMALL",
      width: 17,
      height: 35,
      yPos: 105,
      multipleSpeed: 4,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [
        new CollisionBox(0, 7, 5, 27),
        new CollisionBox(4, 0, 6, 34),
        new CollisionBox(10, 4, 7, 14),
      ],
    },
    {
      type: "CACTUS_LARGE",
      width: 25,
      height: 50,
      yPos: 90,
      multipleSpeed: 7,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [
        new CollisionBox(0, 12, 7, 38),
        new CollisionBox(8, 0, 7, 49),
        new CollisionBox(13, 10, 10, 38),
      ],
    },
    {
      type: "PTERODACTYL",
      width: 46,
      height: 40,
      yPos: [100, 75, 50], // Variable height.
      yPosMobile: [100, 50], // Variable height mobile.
      multipleSpeed: 999,
      minSpeed: 8.5,
      minGap: 150,
      collisionBoxes: [
        new CollisionBox(15, 15, 16, 5),
        new CollisionBox(18, 21, 24, 6),
        new CollisionBox(2, 14, 4, 3),
        new CollisionBox(6, 10, 4, 7),
        new CollisionBox(10, 8, 6, 9),
      ],
      numFrames: 2,
      frameRate: 1000 / 6,
      speedOffset: 0.8,
    },
    {
      type: "COLLECTABLE",
      width: 12,
      height: 38,
      yPos: 90,
      multipleSpeed: 999,
      minGap: 999,
      minSpeed: 0,
      collisionBoxes: [new CollisionBox(0, 0, 12, 38)],
    },
  ],
  LINES: [{ SOURCE_X: 2, SOURCE_Y: 52, WIDTH: 600, HEIGHT: 12, YPOS: 127 }],
};

export default Config;
