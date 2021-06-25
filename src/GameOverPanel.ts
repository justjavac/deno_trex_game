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
