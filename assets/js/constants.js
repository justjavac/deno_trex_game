const HIDDEN_CLASS = "hidden";

/**
 * Default game width.
 * @const
 */
const DEFAULT_WIDTH = 600;

/**
  * Frames per second.
  * @const
  */
const FPS = 60;

/** @const */
const IS_HIDPI = window.devicePixelRatio > 1;

/** @const */
const IS_IOS = /CriOS/.test(window.navigator.userAgent);

/** @const */
const IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

/** @const */
const IS_RTL = document.querySelector("html").dir == "rtl";

/** @const */
const RESOURCE_POSTFIX = "offline-resources-";

/** @const */
const A11Y_STRINGS = {
  ariaLabel: "dinoGameA11yAriaLabel",
  description: "dinoGameA11yDescription",
  gameOver: "dinoGameA11yGameOver",
  highScore: "dinoGameA11yHighScore",
  jump: "dinoGameA11yJump",
  started: "dinoGameA11yStartGame",
  speedLabel: "dinoGameA11ySpeedToggle",
};
