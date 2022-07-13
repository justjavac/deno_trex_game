// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import GameOverText from "./sprite/GameOverText.ts";
import RestartButton from "./sprite/RestartButton.ts";

export default class GameOverPanel {
  canvas: HTMLCanvasElement;
  gameOverTex: GameOverText;
  restartButton: RestartButton;

  /**
   * Game over panel.
   * @param canvas
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gameOverTex = new GameOverText(this.canvas);
    this.restartButton = new RestartButton(this.canvas);
  }

  draw() {
    this.gameOverTex.draw();
    this.restartButton.update();
  }

  reset() {
    this.gameOverTex.clear();
    this.restartButton.reset();
  }
}
