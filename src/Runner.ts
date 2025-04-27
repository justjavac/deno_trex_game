// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import {
  DEFAULT_WIDTH,
  FPS,
  IS_HIDPI,
  IS_IOS,
  IS_MOBILE,
  RESOURCE_POSTFIX,
} from "./constants.ts";
import DistanceMeter from "./DistanceMeter.ts";
import GameOverPanel from "./GameOverPanel.ts";
import GeneratedSoundFx from "./GeneratedSoundFx.ts";
import Horizon from "./Horizon.ts";
import Sprite from "./sprite/Config.ts";
import type { SpritePosition } from "./sprite/Config.ts";
import Trex, { TrexStatus } from "./Trex.ts";
import {
  checkForCollision,
  createCanvas,
  getTimeStamp,
  vibrate,
} from "./utils.ts";

declare type WebkitCanvasRenderingContext2D = CanvasRenderingContext2D & {
  webkitBackingStorePixelRatio: number;
};

export default class Runner {
  static imageSprite: HTMLImageElement;

  static config = {
    /** 声音提示的阈值 */
    AUDIOCUE_PROXIMITY_THRESHOLD: 190,
    AUDIOCUE_PROXIMITY_THRESHOLD_MOBILE_A11Y: 250,
    BOTTOM_PAD: 10,
    // Scroll Y threshold at which the game can be activated.
    CANVAS_IN_VIEW_OFFSET: -10,
    CLEAR_TIME: 3000,
    FLASH_DURATION: 1000,
    GAMEOVER_CLEAR_TIME: 1200,
    INITIAL_JUMP_VELOCITY: 12,
    INVERT_FADE_DURATION: 12000,
    MAX_BLINK_COUNT: 3,
    MAX_OBSTACLE_DUPLICATION: 2,
    RESOURCE_TEMPLATE_ID: "audio-resources",
    /** 速度 */
    SPEED: 6,
    /** 加速度 */
    ACCELERATION: 0.001,
    /** 最大速度 */
    MAX_SPEED: 13,
    GAP_COEFFICIENT: 0.6,
    INVERT_DISTANCE: 700,
    MOBILE_SPEED_COEFFICIENT: 1.2,
  };

  /**
   * Default dimensions.
   */
  static defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150,
  };

  /**
   * CSS class names.
   * @enum {string}
   */
  static classes = {
    CANVAS: "runner-canvas",
    CONTAINER: "runner-container",
    CRASHED: "crashed",
    ICON: "icon-offline",
    INVERTED: "inverted",
    SNACKBAR: "snackbar",
    SNACKBAR_SHOW: "snackbar-show",
    TOUCH_CONTROLLER: "controller",
  };

  /**
   * Sound FX. Reference to the ID of the audio tag on interstitial page.
   */
  static sounds: Record<string, string> = {
    BUTTON_PRESS: "offline-sound-press",
    HIT: "offline-sound-hit",
    SCORE: "offline-sound-reached",
  };

  /**
   * Key code mapping.
   */
  static keycodes: Record<string, Record<number, number>> = {
    JUMP: { 38: 1, 32: 1, 87: 1 }, // Up, spacebar, w
    DUCK: { 40: 1, 83: 1 }, // Down, s
    RESTART: { 13: 1 }, // Enter
  };

  /**
   * Runner event names.
   * @enum {string}
   */
  static events = {
    ANIM_END: "webkitAnimationEnd",
    CLICK: "click",
    KEYDOWN: "keydown",
    KEYUP: "keyup",
    POINTERDOWN: "pointerdown",
    POINTERUP: "pointerup",
    RESIZE: "resize",
    TOUCHEND: "touchend",
    TOUCHSTART: "touchstart",
    VISIBILITY: "visibilitychange",
    BLUR: "blur",
    FOCUS: "focus",
    LOAD: "load",
  } as const;

  static origImageSprite: HTMLImageElement;
  static audioCues: boolean;
  static isMobileMouseInput: boolean;
  static generatedSoundFx: GeneratedSoundFx;

  /**
   * Updates the canvas size taking into
   * account the backing store pixel ratio and
   * the device pixel ratio.
   *
   * See article by Paul Lewis:
   * http://www.html5rocks.com/en/tutorials/canvas/hidpi/
   *
   * @return Whether the canvas was scaled.
   */
  static updateCanvasScaling(
    canvas: HTMLCanvasElement,
    optWidth?: number,
    optWeight?: number,
  ): boolean {
    const context = canvas.getContext("2d")! as WebkitCanvasRenderingContext2D;

    // Query the various pixel ratios
    const devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
    /** @suppress {missingProperties} */
    const backingStoreRatio =
      Math.floor(context.webkitBackingStorePixelRatio) || 1;
    const ratio = devicePixelRatio / backingStoreRatio;

    // Upscale the canvas if the two ratios don't match
    if (devicePixelRatio !== backingStoreRatio) {
      const oldWidth = optWidth || canvas.width;
      const oldHeight = optWeight || canvas.height;

      canvas.width = oldWidth * ratio;
      canvas.height = oldHeight * ratio;

      canvas.style.width = oldWidth + "px";
      canvas.style.height = oldHeight + "px";

      // Scale the context to counter the fact that we've manually scaled
      // our canvas element.
      context.scale(ratio, ratio);
      return true;
    } else if (devicePixelRatio === 1) {
      // Reset the canvas width / height. Fixes scaling bug when the page is
      // zoomed and the devicePixelRatio changes accordingly.
      canvas.style.width = canvas.width + "px";
      canvas.style.height = canvas.height + "px";
    }
    return false;
  }

  outerContainerEl: HTMLDivElement;
  containerEl!: HTMLDivElement;
  // A div to intercept touch events. Only set while (playing && useTouch).
  touchController?: HTMLDivElement;

  // Logical dimensions of the container.
  dimensions: typeof Runner.defaultDimensions;

  fadeInTimer: number;

  canvas!: HTMLCanvasElement;
  canvasCtx!: CanvasRenderingContext2D;

  tRex!: Trex;

  distanceMeter!: DistanceMeter;
  distanceRan: number;

  highestScore: number;
  syncHighestScore: boolean;

  time: number;
  runningTime: number;
  msPerFrame: number;
  currentSpeed: number;

  activated: boolean; // Whether the easter egg has been activated.
  playing: boolean; // Whether the game is currently in play state.
  crashed: boolean;
  paused: boolean;
  inverted: boolean;
  invertTimer: number;
  resizeTimerId_: number;

  playCount: number;

  soundFx: Record<string, AudioBuffer>;

  generatedSoundFx: GeneratedSoundFx;

  // Global web audio context for playing sounds.
  audioContext!: AudioContext;

  spriteDef: SpritePosition;
  gameOverPanel!: GameOverPanel;
  horizon!: Horizon;
  isDarkMode: boolean;
  playingIntro?: boolean;
  updatePending?: boolean;
  invertTrigger?: boolean;
  raqId: number;

  /**
   * T-Rex runner.
   * @param outerContainerId Outer containing element id.
   * @param optConfig
   * @implements {EventListener}
   */
  constructor(outerContainerId: string) {
    this.outerContainerEl = document.querySelector(outerContainerId)!;

    // Logical dimensions of the container.
    this.dimensions = Runner.defaultDimensions;

    this.fadeInTimer = 0;
    this.raqId = 0;

    this.distanceRan = 0;

    this.highestScore = 0;
    this.syncHighestScore = false;

    this.time = 0;
    this.runningTime = 0;
    this.msPerFrame = 1000 / FPS;
    this.currentSpeed = Runner.config.SPEED;

    this.activated = false; // Whether the easter egg has been activated.
    this.playing = false; // Whether the game is currently in play state.
    this.crashed = false;
    this.paused = false;
    this.inverted = false;
    this.invertTimer = 0;
    this.resizeTimerId_ = 0;

    this.playCount = 0;
    this.raqId = 0;

    this.soundFx = {};

    this.spriteDef = IS_HIDPI ? Sprite.HDPI : Sprite.LDPI;

    this.containerEl = document.createElement("div");
    this.containerEl.setAttribute("role", IS_MOBILE ? "button" : "application");
    this.containerEl.setAttribute("tabindex", "0");

    this.containerEl.className = Runner.classes.CONTAINER;

    this.generatedSoundFx = new GeneratedSoundFx();

    // 处理黑夜模式
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.isDarkMode = mediaQuery && mediaQuery.matches;
    mediaQuery.addListener((e) => this.isDarkMode = e.matches);

    this.loadImages();
  }

  /**
   * Cache the appropriate image sprite from the page and get the sprite sheet
   * definition.
   */
  loadImages() {
    const scale = IS_HIDPI ? "2x" : "1x";

    Runner.imageSprite = document.getElementById(
      RESOURCE_POSTFIX + scale,
    ) as HTMLImageElement;
    Runner.origImageSprite = Runner.imageSprite;

    if (Runner.imageSprite.complete) {
      this.init();
    } else {
      // If the images are not yet loaded, add a listener.
      Runner.imageSprite.addEventListener(
        Runner.events.LOAD,
        this.init.bind(this),
      );
    }
  }

  /**
   * Load and decode base 64 encoded sounds.
   */
  loadSounds() {
    if (!IS_IOS) {
      this.audioContext = new AudioContext();

      const resourceTemplate = (
        document.getElementById(
          Runner.config.RESOURCE_TEMPLATE_ID,
        ) as HTMLTemplateElement
      ).content;

      for (const sound in Runner.sounds) {
        const soundSrc = (
          resourceTemplate.getElementById(
            Runner.sounds[sound],
          ) as HTMLAudioElement
        ).src;
        fetch(soundSrc)
          .then((response) => {
            return response.arrayBuffer();
          })
          .then((buffer) => {
            return this.audioContext.decodeAudioData(buffer);
          })
          .then((audioData) => {
            this.soundFx[sound] = audioData;
          });
      }
    }
  }

  /**
   * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
   * @param {number=} optSpeed
   */
  setSpeed(optSpeed?: number) {
    const speed = optSpeed || this.currentSpeed;

    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
      const mobileSpeed = ((speed * this.dimensions.WIDTH) / DEFAULT_WIDTH) *
        Runner.config.MOBILE_SPEED_COEFFICIENT;
      this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
    } else if (optSpeed) {
      this.currentSpeed = optSpeed;
    }
  }

  /**
   * Game initialiser.
   */
  init() {
    this.adjustDimensions();
    this.setSpeed();

    // Player canvas container.
    this.canvas = createCanvas(
      this.containerEl,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    );

    this.canvasCtx = this.canvas.getContext("2d")!;
    this.canvasCtx.fillStyle = "#f7f7f7";
    this.canvasCtx.fill();
    Runner.updateCanvasScaling(this.canvas);

    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(
      this.canvas,
      this.spriteDef,
      this.dimensions,
      Runner.config.GAP_COEFFICIENT,
    );

    // Distance meter
    this.distanceMeter = new DistanceMeter(
      this.canvas,
      this.spriteDef.TEXT_SPRITE,
      this.dimensions.WIDTH,
    );

    // Draw t-rex
    this.tRex = new Trex(this.canvas, this.spriteDef.TREX);

    this.outerContainerEl.appendChild(this.containerEl);

    this.startListening();
    this.update();

    window.addEventListener(
      Runner.events.RESIZE,
      this.debounceResize.bind(this),
    );
  }

  /**
   * Create the touch controller. A div that covers whole screen.
   */
  createTouchController() {
    this.touchController = document.createElement("div");
    this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
    this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
    this.touchController.addEventListener(Runner.events.TOUCHEND, this);
    this.outerContainerEl.appendChild(this.touchController);
  }

  /**
   * Debounce the resize event.
   */
  debounceResize() {
    if (!this.resizeTimerId_) {
      this.resizeTimerId_ = setInterval(this.adjustDimensions.bind(this), 250);
    }
  }

  /**
   * Adjust game space dimensions on resize.
   */
  adjustDimensions() {
    clearInterval(this.resizeTimerId_);
    this.resizeTimerId_ = 0;

    const boxStyles = window.getComputedStyle(this.outerContainerEl);
    const padding = Number(
      boxStyles.paddingLeft.substr(0, boxStyles.paddingLeft.length - 2),
    );

    this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;

    // Redraw the elements back onto the canvas.
    if (this.canvas) {
      this.canvas.width = this.dimensions.WIDTH;
      this.canvas.height = this.dimensions.HEIGHT;

      Runner.updateCanvasScaling(this.canvas);

      this.distanceMeter.calcXPos(this.dimensions.WIDTH);
      this.clearCanvas();
      this.horizon.update(0, 0, true);
      this.tRex.update(0);

      // Outer container and distance meter.
      if (this.playing || this.crashed || this.paused) {
        this.containerEl.style.width = this.dimensions.WIDTH + "px";
        this.containerEl.style.height = this.dimensions.HEIGHT + "px";
        this.distanceMeter.update(0, Math.ceil(this.distanceRan));
        this.stop();
      } else {
        this.tRex.draw(0, 0);
      }

      // Game over panel.
      if (this.crashed && this.gameOverPanel) {
        this.gameOverPanel.draw();
      }
    }
  }

  /**
   * Play the game intro.
   * Canvas container width expands out to the full width.
   */
  playIntro() {
    if (!this.activated && !this.crashed) {
      this.playingIntro = true;
      this.tRex.playingIntro = true;

      // CSS animation definition.
      const keyframes = "@-webkit-keyframes intro { " +
        "from { width:" +
        Trex.config.WIDTH +
        "px }" +
        "to { width: " +
        this.dimensions.WIDTH +
        "px }" +
        "}";
      document.styleSheets[0].insertRule(keyframes, 0);

      this.containerEl.addEventListener(
        Runner.events.ANIM_END,
        this.startGame.bind(this),
      );

      this.containerEl.style.webkitAnimation = "intro .4s ease-out 1 both";
      this.containerEl.style.width = this.dimensions.WIDTH + "px";

      this.setPlayStatus(true);
      this.activated = true;
    } else if (this.crashed) {
      this.restart();
    }
  }

  /**
   * Update the game status to started.
   */
  startGame() {
    this.toggleSpeed();
    this.runningTime = 0;
    this.playingIntro = false;
    this.tRex.playingIntro = false;
    this.containerEl.style.webkitAnimation = "";
    this.playCount++;
    this.generatedSoundFx.background();

    // Handle tabbing off the page. Pause the current game.
    document.addEventListener(
      Runner.events.VISIBILITY,
      this.onVisibilityChange.bind(this),
    );

    window.addEventListener(
      Runner.events.BLUR,
      this.onVisibilityChange.bind(this),
    );

    window.addEventListener(
      Runner.events.FOCUS,
      this.onVisibilityChange.bind(this),
    );
  }

  clearCanvas() {
    this.canvasCtx.clearRect(
      0,
      0,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    );
  }

  /**
   * Checks whether the canvas area is in the viewport of the browser
   * through the current scroll position.
   * @return boolean.
   */
  isCanvasInView() {
    return (
      this.containerEl.getBoundingClientRect().top >
        Runner.config.CANVAS_IN_VIEW_OFFSET
    );
  }

  /**
   * Update the game frame and schedules the next one.
   */
  update() {
    this.updatePending = false;

    const now = getTimeStamp();
    let deltaTime = now - (this.time || now);

    this.time = now;

    if (this.playing) {
      this.clearCanvas();

      this.canvasCtx.globalAlpha = 1;

      if (this.tRex.jumping) {
        this.tRex.updateJump(deltaTime);
      }

      this.runningTime += deltaTime;
      const hasObstacles = this.runningTime > Runner.config.CLEAR_TIME;

      // First jump triggers the intro.
      if (this.tRex.jumpCount === 1 && !this.playingIntro) {
        this.playIntro();
      }

      // The horizon doesn't move until the intro is over.
      if (this.playingIntro) {
        this.horizon.update(0, this.currentSpeed, hasObstacles);
      } else if (!this.crashed) {
        const showNightMode = this.isDarkMode !== this.inverted;
        deltaTime = !this.activated ? 0 : deltaTime;
        this.horizon.update(
          deltaTime,
          this.currentSpeed,
          hasObstacles,
          showNightMode,
        );
      }

      // Check for collisions.
      const collision = hasObstacles &&
        checkForCollision(this.horizon.obstacles[0], this.tRex);

      // For a11y, audio cues.
      if (Runner.audioCues && hasObstacles) {
        const jumpObstacle =
          this.horizon.obstacles[0].typeConfig.type != "COLLECTABLE";

        if (!this.horizon.obstacles[0].jumpAlerted) {
          const threshold = Runner.isMobileMouseInput
            ? Runner.config.AUDIOCUE_PROXIMITY_THRESHOLD_MOBILE_A11Y
            : Runner.config.AUDIOCUE_PROXIMITY_THRESHOLD;
          const adjProximityThreshold = threshold +
            threshold * Math.log10(this.currentSpeed / Runner.config.SPEED);

          if (this.horizon.obstacles[0].xPos < adjProximityThreshold) {
            if (jumpObstacle) {
              this.generatedSoundFx.jump();
            }
            this.horizon.obstacles[0].jumpAlerted = true;
          }
        }
      }

      if (!collision) {
        this.distanceRan += (this.currentSpeed * deltaTime) / this.msPerFrame;

        if (this.currentSpeed < Runner.config.MAX_SPEED) {
          this.currentSpeed += Runner.config.ACCELERATION;
        }
      } else {
        this.gameOver();
      }

      const playAchievementSound = this.distanceMeter.update(
        deltaTime,
        Math.ceil(this.distanceRan),
      );

      if (!Runner.audioCues && playAchievementSound) {
        this.playSound(this.soundFx.SCORE);
      }

      // Night mode.
      if (this.invertTimer > Runner.config.INVERT_FADE_DURATION) {
        this.invertTimer = 0;
        this.invertTrigger = false;
        this.invert(false);
      } else if (this.invertTimer) {
        this.invertTimer += deltaTime;
      } else {
        const actualDistance = this.distanceMeter.getActualDistance(
          Math.ceil(this.distanceRan),
        );

        if (actualDistance > 0) {
          this.invertTrigger =
            !(actualDistance % Runner.config.INVERT_DISTANCE);

          if (this.invertTrigger && this.invertTimer === 0) {
            this.invertTimer += deltaTime;
            this.invert(false);
          }
        }
      }
    }

    if (
      this.playing ||
      (!this.activated && this.tRex.blinkCount < Runner.config.MAX_BLINK_COUNT)
    ) {
      this.tRex.update(deltaTime);
      this.scheduleNextUpdate();
    }
  }

  /**
   * Event handler.
   * @param {Event} e
   */
  handleEvent(e: Event) {
    return ((evtType, events) => {
      switch (evtType) {
        case events.KEYDOWN:
        case events.TOUCHSTART:
        case events.POINTERDOWN:
          this.onKeyDown(e as KeyboardEvent);
          break;
        case events.KEYUP:
        case events.TOUCHEND:
        case events.POINTERUP:
          this.onKeyUp(e as KeyboardEvent);
          break;
      }
    })(e.type, Runner.events);
  }

  /**
   * Initialize audio cues if activated by focus on the canvas element.
   * @param {Event} e
   */
  handleCanvasKeyPress(e: KeyboardEvent) {
    if (!this.activated) {
      this.toggleSpeed();
      Runner.audioCues = true;
      this.generatedSoundFx.init();
      Runner.generatedSoundFx = this.generatedSoundFx;
      Runner.config.CLEAR_TIME *= 1.2;
    } else if (e.keyCode && Runner.keycodes.JUMP[e.keyCode]) {
      this.onKeyDown(e);
    }
  }

  /**
   * Prevent space key press from scrolling.
   */
  preventScrolling(e: KeyboardEvent) {
    if (e.keyCode === 32) {
      e.preventDefault();
    }
  }

  /**
   * Toggle speed setting if toggle is shown.
   */
  toggleSpeed() {
    if (Runner.audioCues) {
      this.currentSpeed = Runner.config.SPEED;
    }
  }

  /**
   * Bind relevant key / mouse / touch listeners.
   */
  startListening() {
    // A11y keyboard / screen reader activation.
    this.containerEl.addEventListener(
      Runner.events.KEYDOWN,
      (e: Event) => {
        this.handleCanvasKeyPress(e as KeyboardEvent);
      },
    );
    this.canvas.addEventListener<"keydown">(
      Runner.events.KEYDOWN,
      this.preventScrolling.bind(this),
    );
    this.canvas.addEventListener(
      Runner.events.KEYUP,
      this.preventScrolling.bind(this),
    );

    // Keys.
    document.addEventListener(Runner.events.KEYDOWN, this);
    document.addEventListener(Runner.events.KEYUP, this);

    // Touch / pointer.
    this.containerEl.addEventListener(Runner.events.TOUCHSTART, this);
    document.addEventListener(Runner.events.POINTERDOWN, this);
    document.addEventListener(Runner.events.POINTERUP, this);
  }

  /**
   * Remove all listeners.
   */
  stopListening() {
    document.removeEventListener(Runner.events.KEYDOWN, this);
    document.removeEventListener(Runner.events.KEYUP, this);

    if (this.touchController) {
      this.touchController.removeEventListener(Runner.events.TOUCHSTART, this);
      this.touchController.removeEventListener(Runner.events.TOUCHEND, this);
    }

    this.containerEl.removeEventListener(Runner.events.TOUCHSTART, this);
    document.removeEventListener(Runner.events.POINTERDOWN, this);
    document.removeEventListener(Runner.events.POINTERUP, this);
  }

  /**
   * Process keydown.
   */
  onKeyDown(e: KeyboardEvent) {
    // Prevent native page scrolling whilst tapping on mobile.
    if (IS_MOBILE && this.playing) {
      e.preventDefault();
    }

    if (this.isCanvasInView() && !this.crashed && !this.paused) {
      // For a11y, screen reader activation.
      const isMobileMouseInput = (IS_MOBILE &&
        e.type === Runner.events.POINTERDOWN &&
        e.target == this.containerEl) ||
        (IS_IOS && document.activeElement == this.containerEl);

      if (
        Runner.keycodes.JUMP[e.keyCode] ||
        e.type === Runner.events.TOUCHSTART ||
        isMobileMouseInput
      ) {
        e.preventDefault();
        // Starting the game for the first time.
        if (!this.playing) {
          // Started by touch so create a touch controller.
          if (!this.touchController && e.type === Runner.events.TOUCHSTART) {
            this.createTouchController();
          }

          if (isMobileMouseInput) {
            this.handleCanvasKeyPress(e);
          }
          this.loadSounds();
          this.setPlayStatus(true);
          this.update();
        }
        // Start jump.
        if (!this.tRex.jumping && !this.tRex.ducking) {
          if (Runner.audioCues) {
            this.generatedSoundFx.cancelFootSteps();
          } else {
            this.playSound(this.soundFx.BUTTON_PRESS);
          }
          this.tRex.startJump(this.currentSpeed);
        }
      } else if (this.playing && Runner.keycodes.DUCK[e.keyCode]) {
        e.preventDefault();
        if (this.tRex.jumping) {
          // Speed drop, activated only when jump key is not pressed.
          this.tRex.setSpeedDrop();
        } else if (!this.tRex.jumping && !this.tRex.ducking) {
          // Duck.
          this.tRex.setDuck(true);
        }
      }
    }
  }

  /**
   * Process key up.
   */
  onKeyUp(e: KeyboardEvent) {
    const keyCode = e.keyCode;
    const isjumpKey = Runner.keycodes.JUMP[keyCode] ||
      e.type === Runner.events.TOUCHEND ||
      e.type === Runner.events.POINTERUP;

    if (this.isRunning() && isjumpKey) {
      this.tRex.endJump();
    } else if (Runner.keycodes.DUCK[keyCode]) {
      this.tRex.speedDrop = false;
      this.tRex.setDuck(false);
    } else if (this.crashed) {
      // Check that enough time has elapsed before allowing jump key to restart.
      const deltaTime = getTimeStamp() - this.time;

      if (
        this.isCanvasInView() &&
        (Runner.keycodes.RESTART[keyCode] ||
          this.isLeftClickOnCanvas(e as unknown as MouseEvent) ||
          (deltaTime >= Runner.config.GAMEOVER_CLEAR_TIME &&
            Runner.keycodes.JUMP[keyCode]))
      ) {
        this.handleGameOverClicks(e as unknown as MouseEvent);
      }
    } else if (this.paused && isjumpKey) {
      // Reset the jump state
      this.tRex.reset();
      this.play();
    }
  }

  /**
   * Handle interactions on the game over screen state.
   * A user is able to tap the high score twice to reset it.
   */
  handleGameOverClicks(e: MouseEvent) {
    e.preventDefault();
    if (this.distanceMeter.hasClickedOnHighScore(e) && this.highestScore) {
      if (this.distanceMeter.isHighScoreFlashing()) {
        // Subsequent click, reset the high score.
        this.saveHighScore(0);
        this.distanceMeter.resetHighScore();
      } else {
        // First click, flash the high score.
        this.distanceMeter.startHighScoreFlashing();
      }
    } else {
      this.distanceMeter.cancelHighScoreFlashing();
      this.restart();
    }
  }

  /**
   * Returns whether the event was a left click on canvas.
   * On Windows right click is registered as a click.
   */
  isLeftClickOnCanvas(e: MouseEvent): boolean {
    return (
      e.button != null &&
      e.button < 2 &&
      e.type === Runner.events.POINTERUP &&
      (e.target === this.canvas ||
        (IS_MOBILE && Runner.audioCues && e.target === this.containerEl))
    );
  }

  /**
   * RequestAnimationFrame wrapper.
   */
  scheduleNextUpdate() {
    if (!this.updatePending) {
      this.updatePending = true;
      this.raqId = requestAnimationFrame(this.update.bind(this));
    }
  }

  /**
   * Whether the game is running.
   * @return {boolean}
   */
  isRunning(): boolean {
    return !!this.raqId;
  }

  /**
   * Set the initial high score as stored in the user's profile.
   * @param {number} highScore
   */
  initializeHighScore(highScore: number) {
    this.syncHighestScore = true;
    highScore = Math.ceil(highScore);
    if (highScore < this.highestScore) {
      return;
    }
    this.highestScore = highScore;
    this.distanceMeter.setHighScore(this.highestScore);
  }

  /**
   * Sets the current high score and saves to the profile if available.
   * @param distanceRan Total distance ran.
   */
  saveHighScore(distanceRan: number) {
    this.highestScore = Math.ceil(distanceRan);
    this.distanceMeter.setHighScore(this.highestScore);
    localStorage.setItem("highestScore", String(this.highestScore));
  }

  /**
   * Game over state.
   */
  gameOver() {
    this.playSound(this.soundFx.HIT);
    vibrate(200);

    this.stop();
    this.crashed = true;
    this.distanceMeter.achievement = false;

    this.tRex.update(100, TrexStatus.CRASHED);

    // Game over panel.
    if (!this.gameOverPanel) {
      if (this.canvas) {
        this.gameOverPanel = new GameOverPanel(
          this.canvas,
        );
      }
    }

    this.gameOverPanel.draw();

    // Update the high score.
    if (this.distanceRan > this.highestScore) {
      this.saveHighScore(this.distanceRan);
    }

    // Reset the time clock.
    this.time = getTimeStamp();

    if (Runner.audioCues) {
      this.generatedSoundFx.stopAll();
    }
  }

  stop() {
    this.setPlayStatus(false);
    this.paused = true;
    cancelAnimationFrame(this.raqId);
    this.raqId = 0;
    this.generatedSoundFx.stopAll();
  }

  play() {
    if (!this.crashed) {
      this.setPlayStatus(true);
      this.paused = false;
      this.tRex.update(0, TrexStatus.RUNNING);
      this.time = getTimeStamp();
      this.update();
      this.generatedSoundFx.background();
    }
  }

  restart() {
    if (!this.raqId) {
      this.playCount++;
      this.runningTime = 0;
      this.setPlayStatus(true);
      this.toggleSpeed();
      this.paused = false;
      this.crashed = false;
      this.distanceRan = 0;
      this.setSpeed(Runner.config.SPEED);
      this.time = getTimeStamp();
      this.containerEl.classList.remove(Runner.classes.CRASHED);
      this.clearCanvas();
      this.distanceMeter.reset();
      this.horizon.reset();
      this.tRex.reset();
      this.playSound(this.soundFx.BUTTON_PRESS);
      this.invert(true);
      this.update();
      this.gameOverPanel.reset();
      this.generatedSoundFx.background();
    }
  }

  setPlayStatus(isPlaying: boolean) {
    if (this.touchController) {
      this.touchController.classList.toggle("hidden", !isPlaying);
    }
    this.playing = isPlaying;
  }

  /**
   * Pause the game if the tab is not in focus.
   */
  onVisibilityChange(e: Event) {
    if (
      document.hidden ||
      e.type === "blur" ||
      document.visibilityState !== "visible"
    ) {
      this.stop();
    } else if (!this.crashed) {
      this.tRex.reset();
      this.play();
    }
  }

  /**
   * Play a sound.
   */
  playSound(soundBuffer?: AudioBuffer) {
    if (soundBuffer) {
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = soundBuffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.start(0);
    }
  }

  /**
   * Inverts the current page / canvas colors.
   * @param reset Whether to reset colors.
   */
  invert(reset: boolean) {
    const htmlEl = document.firstElementChild!;

    if (reset) {
      htmlEl.classList.toggle(Runner.classes.INVERTED, false);
      this.invertTimer = 0;
      this.inverted = false;
    } else {
      this.inverted = htmlEl.classList.toggle(
        Runner.classes.INVERTED,
        this.invertTrigger,
      );
    }
  }
}
