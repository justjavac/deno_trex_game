// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import Sprite from "./Sprite.ts";

const defaultConfig = {
  HEIGHT: 12,
  WIDTH: 1200,
} as const;

export default class HorizonLine extends Sprite<typeof defaultConfig> {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas, "HORIZON");
  }

  override init() {
    this.config = defaultConfig;
    this.x = 0;
    this.y = 127;
  }

  override update(speed: number) {
    super.update(speed, true);
  }

  override draw() {
    super.draw();
    this.setX(this.x + this.config.WIDTH);
    super.draw();
    this.setX(this.x - this.config.WIDTH);
  }

  override reset() {
    this.x = 0;
  }
}
