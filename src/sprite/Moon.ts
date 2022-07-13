// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import Sprite from "./Sprite.ts";

const defaultConfig = {
  WIDTH: 20,
  HEIGHT: 40,
  SPEED: 0.35,
} as const;

export default class Moon extends Sprite<typeof defaultConfig> {
  /**
   * 月亮 🌛
   *
   * 和障碍物(Obstacle)类似，但是没有碰撞盒子。
   */
  constructor(canvas: HTMLCanvasElement) {
    super(canvas, "MOON");
  }

  override init() {
    this.config = defaultConfig;
    this.y = 30;
    this.phases = [
      [140, 0],
      [120, 0],
      [100, 0],
      [60, 0],
      [40, 0],
      [20, 0],
      [0, 0],
    ];
  }

  override update() {
    super.update(this.config.SPEED, true);
  }
}
