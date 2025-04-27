// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import Moon from "./sprite/Moon.ts";
import Star from "./sprite/Star.ts";
import { getRandomNum } from "./utils.ts";

export default class NightMode {
  static config = {
    /** 渐变速度 */
    FADE_SPEED: 0.035,
    /** 星星的数量 */
    NUM_STARS: 3,
  } as const;

  canvas: HTMLCanvasElement;
  /** 透明度 */
  opacity: number;
  containerWidth: number;
  stars: Star[];
  moon: Moon;

  /**
   * Nightmode shows a moon and stars on the horizon.
   */
  constructor(canvas: HTMLCanvasElement, containerWidth: number) {
    this.canvas = canvas;
    this.opacity = 0;
    this.containerWidth = containerWidth;
    this.stars = [];
    this.moon = new Moon(this.canvas);
    this.placeStars();
  }

  /**
   * 移动月亮，并修改月相
   * @param activated 当前是否为黑夜模式
   */
  update(activated: boolean) {
    // 每次进入黑夜模式后切换一个月相
    // FIXME: 有 bug，月相无法切换，疑似 opacity 处理逻辑存在问题
    if (activated && this.opacity === 0) {
      this.moon.nextPhase(true);
    }

    // Fade in / out.
    if (activated && (this.opacity < 1 || this.opacity === 0)) {
      this.opacity += NightMode.config.FADE_SPEED;
    } else if (this.opacity > 0) {
      this.opacity -= NightMode.config.FADE_SPEED;
    }

    // 设置月亮的位置
    if (this.opacity > 0) {
      this.moon.update();

      // 更新星星位置
      if (activated) {
        for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
          this.stars[i].update();
        }
      }
    } else {
      this.opacity = 0;
      this.placeStars();
    }
  }

  // 放置星星
  placeStars() {
    const segmentSize = Math.round(
      this.containerWidth / NightMode.config.NUM_STARS,
    );

    for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
      const x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
      this.stars[i] = new Star(this.canvas, i);
      this.stars[i].setX(x);
    }
  }

  reset() {
    this.moon.reset();
    this.opacity = 0;
    this.update(false);
  }
}
