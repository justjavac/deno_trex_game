// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import { IS_IOS, IS_MOBILE } from "./constants.ts";
import CollisionBox from "./CollisionBox.ts";
import Runner from "./Runner.ts";
import Obstacle from "./Obstacle.ts";
import Trex from "./Trex.ts";

/**
 * 获取指定范围内的随机数字。
 * @param min 最小值
 * @param max 最大值
 */
export function getRandomNum(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 在手机设备上震动。
 * @param duration 震动的持续时间，单位毫秒。
 */
export function vibrate(duration: number) {
  if (IS_MOBILE && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
  }
}

/** 创建 canvas 元素标签 */
export function createCanvas(
  container: Element,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.className = Runner.classes.CANVAS;
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);

  return canvas;
}

/** 获取当前时间 */
export function getTimeStamp() {
  return IS_IOS ? Date.now() : performance.now();
}

/**
 * Check for a collision.
 * @param obstacle
 * @param tRex T-rex object.
 * @param optCanvasCtx Optional canvas context for
 *    drawing collision boxes.
 */
export function checkForCollision(
  obstacle: Obstacle,
  tRex: Trex,
  optCanvasCtx?: CanvasRenderingContext2D,
): Array<CollisionBox> | undefined {
  // Adjustments are made to the bounding box as there is a 1 pixel white
  // border around the t-rex and obstacles.
  const tRexBox = new CollisionBox(
    tRex.xPos + 1,
    tRex.yPos + 1,
    tRex.config.WIDTH - 2,
    tRex.config.HEIGHT - 2,
  );

  const obstacleBox = new CollisionBox(
    obstacle.xPos + 1,
    obstacle.yPos + 1,
    obstacle.typeConfig.width * obstacle.size - 2,
    obstacle.typeConfig.height - 2,
  );

  // Debug outer box
  if (optCanvasCtx) {
    drawCollisionBoxes(optCanvasCtx, tRexBox, obstacleBox);
  }

  // Simple outer bounds check.
  if (boxCompare(tRexBox, obstacleBox)) {
    const collisionBoxes = obstacle.collisionBoxes;
    const tRexCollisionBoxes = tRex.ducking
      ? Trex.collisionBoxes.DUCKING
      : Trex.collisionBoxes.RUNNING;

    // Detailed axis aligned box check.
    for (let t = 0; t < tRexCollisionBoxes.length; t++) {
      for (let i = 0; i < collisionBoxes.length; i++) {
        // Adjust the box to actual positions.
        const adjTrexBox = createAdjustedCollisionBox(
          tRexCollisionBoxes[t],
          tRexBox,
        );
        const adjObstacleBox = createAdjustedCollisionBox(
          collisionBoxes[i],
          obstacleBox,
        );
        const crashed = boxCompare(adjTrexBox, adjObstacleBox);

        // Draw boxes for debug.
        if (optCanvasCtx) {
          drawCollisionBoxes(optCanvasCtx, adjTrexBox, adjObstacleBox);
        }

        if (crashed) {
          return [adjTrexBox, adjObstacleBox];
        }
      }
    }
  }
}

/**
 * 调整碰撞盒子
 * @param box 原始盒子
 * @param adjustment 调整盒子
 * @return 调整之后的盒子
 */
function createAdjustedCollisionBox(
  box: CollisionBox,
  adjustment: CollisionBox,
) {
  return new CollisionBox(
    box.x + adjustment.x,
    box.y + adjustment.y,
    box.width,
    box.height,
  );
}

/**
 * 绘制碰撞盒子用于调试
 */
function drawCollisionBoxes(
  canvasCtx: CanvasRenderingContext2D,
  tRexBox: CollisionBox,
  obstacleBox: CollisionBox,
) {
  canvasCtx.save();
  canvasCtx.strokeStyle = "#f00";
  canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

  canvasCtx.strokeStyle = "#0f0";
  canvasCtx.strokeRect(
    obstacleBox.x,
    obstacleBox.y,
    obstacleBox.width,
    obstacleBox.height,
  );
  canvasCtx.restore();
}

/** 判断两个盒子是否碰撞 */
function boxCompare(tRexBox: CollisionBox, obstacleBox: CollisionBox) {
  return (
    tRexBox.x < obstacleBox.x + obstacleBox.width &&
    tRexBox.x + tRexBox.width > obstacleBox.x &&
    tRexBox.y < obstacleBox.y + obstacleBox.height &&
    tRexBox.height + tRexBox.y > obstacleBox.y
  );
}
