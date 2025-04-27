// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import Sprite from "./Sprite.ts";
import { getRandomNum } from "../utils.ts";

const defaultConfig = {
  HEIGHT: 9,
  WIDTH: 9,
  /** 限制最大 y 坐标，防止星星生成到地面 */
  MAX_Y: 70,
  SPEED: 0.25,
} as const;

export default class Star extends Sprite<typeof defaultConfig> {
  /**
   * 星星 ✨
   *
   * 和障碍物(Obstacle)类似，但是没有碰撞盒子。
   */
  constructor(
    canvas: HTMLCanvasElement,
    currentPhase = 0,
  ) {
    super(canvas, "STAR");
    this.phases = [[0, 0], [0, 9], [0, 18]];
    this.currentPhase = currentPhase;
  }

  override init() {
    this.config = defaultConfig;
    this.y = getRandomNum(0, this.config.MAX_Y);
  }

  override update() {
    super.update(this.config.SPEED, true);
  }
}
