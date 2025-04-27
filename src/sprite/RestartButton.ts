// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import Sprite from "./Sprite.ts";
import { getTimeStamp } from "../utils.ts";

const defaultConfig = {
  WIDTH: 36,
  HEIGHT: 32,
} as const;

const RESTART_ANIM_DURATION = 875;
const LOGO_PAUSE_DURATION = 875;

export default class RestartButton extends Sprite<typeof defaultConfig> {
  msPerFrame: number;

  // Retry animation.
  frameTimeStamp: number;
  animTimer: number;

  gameOverRafId?: number;

  flashTimer: number;
  flashCounter: number;

  /** RestartButton */
  constructor(canvas: HTMLCanvasElement) {
    super(canvas, "RESTART");
    this.phases = [
      [0, 0],
      [36, 0],
      [72, 0],
      [108, 0],
      [144, 0],
      [180, 0],
      [216, 0],
      [252, 0],
    ];
    this.msPerFrame = RESTART_ANIM_DURATION / this.phases.length;

    // Retry animation.
    this.frameTimeStamp = 0;
    this.animTimer = 0;

    this.flashTimer = 0;
    this.flashCounter = 0;
  }

  override init() {
    this.config = defaultConfig;
    this.x = (this.container.width - this.config.WIDTH) / 2;
    this.y = (this.container.height - this.config.HEIGHT) / 2 + 15;
  }

  override update() {
    const now = getTimeStamp();
    const deltaTime = now - (this.frameTimeStamp || now);

    this.frameTimeStamp = now;
    this.animTimer += deltaTime;
    this.flashTimer += deltaTime;

    // Restart Button
    if (this.currentPhase == 0 && this.animTimer > LOGO_PAUSE_DURATION) {
      this.animTimer = 0;
      this.draw();
      this.nextPhase();
    } else if (
      this.currentPhase > 0 &&
      this.currentPhase < this.phases.length
    ) {
      if (this.animTimer >= this.msPerFrame) {
        this.draw();
        this.nextPhase();
      }
    } else if (this.currentPhase == this.phases.length) {
      this.reset();
      return;
    }

    this.gameOverRafId = requestAnimationFrame(this.update.bind(this));
  }

  reset() {
    if (this.gameOverRafId) {
      cancelAnimationFrame(this.gameOverRafId);
      this.gameOverRafId = undefined;
    }
    this.animTimer = 0;
    this.frameTimeStamp = 0;
    this.flashTimer = 0;
    this.flashCounter = 0;
    this.resetPhase();
  }
}
