

export default class Runner {
  static instance_: Runner;

  /**
   * Default game configuration.
   * Shared config for all  versions of the game. Additional parameters are
   * defined in Runner.normalConfig and Runner.slowConfig.
   */
  static config = {
    AUDIOCUE_PROXIMITY_THRESHOLD: 190,
    AUDIOCUE_PROXIMITY_THRESHOLD_MOBILE_A11Y: 250,
    BG_CLOUD_SPEED: 0.2,
    BOTTOM_PAD: 10,
    // Scroll Y threshold at which the game can be activated.
    CANVAS_IN_VIEW_OFFSET: -10,
    CLEAR_TIME: 3000,
    CLOUD_FREQUENCY: 0.5,
    FADE_DURATION: 1,
    FLASH_DURATION: 1000,
    GAMEOVER_CLEAR_TIME: 1200,
    INITIAL_JUMP_VELOCITY: 12,
    INVERT_FADE_DURATION: 12000,
    MAX_BLINK_COUNT: 3,
    MAX_CLOUDS: 6,
    MAX_OBSTACLE_LENGTH: 3,
    MAX_OBSTACLE_DUPLICATION: 2,
    RESOURCE_TEMPLATE_ID: "audio-resources",
    SPEED: 6,
    SPEED_DROP_COEFFICIENT: 3,
    ARCADE_MODE_INITIAL_TOP_POSITION: 35,
    ARCADE_MODE_TOP_POSITION_PERCENT: 0.1,
  };

  static normalConfig = {
    ACCELERATION: 0.001,
    AUDIOCUE_PROXIMITY_THRESHOLD: 190,
    AUDIOCUE_PROXIMITY_THRESHOLD_MOBILE_A11Y: 250,
    GAP_COEFFICIENT: 0.6,
    INVERT_DISTANCE: 700,
    MAX_SPEED: 13,
    MOBILE_SPEED_COEFFICIENT: 1.2,
    SPEED: 6,
  };

  static slowConfig = {
    ACCELERATION: 0.0005,
    AUDIOCUE_PROXIMITY_THRESHOLD: 170,
    AUDIOCUE_PROXIMITY_THRESHOLD_MOBILE_A11Y: 220,
    GAP_COEFFICIENT: 0.3,
    INVERT_DISTANCE: 350,
    MAX_SPEED: 9,
    MOBILE_SPEED_COEFFICIENT: 1.5,
    SPEED: 4.2,
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
    ARCADE_MODE: "arcade-mode",
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
   * @enum {string}
   */
  static sounds = {
    BUTTON_PRESS: "offline-sound-press",
    HIT: "offline-sound-hit",
    SCORE: "offline-sound-reached",
  };

  /**
   * Key code mapping.
   * @enum {Object}
   */
  static keycodes = {
    JUMP: { 38: 1, 32: 1 }, // Up, spacebar
    DUCK: { 40: 1 }, // Down
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
    GAMEPADCONNECTED: "gamepadconnected",
  };

  /**
 * Updates the canvas size taking into
 * account the backing store pixel ratio and
 * the device pixel ratio.
 *
 * See article by Paul Lewis:
 * http://www.html5rocks.com/en/tutorials/canvas/hidpi/
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number=} optWidth
 * @param {number=} optWeight
 * @return {boolean} Whether the canvas was scaled.
 */
static updateCanvasScaling(
  canvas: HTMLCanvasElement,
  optWidth?: number,
  optWeight?: number,
): boolean {
  const context: CanvasRenderingContext2D =
    /** @type {CanvasRenderingContext2D} */ canvas.getContext("2d");

  // Query the various pixel ratios
  const devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
  /** @suppress {missingProperties} */
  const backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) ||
    1;
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
};

  outerContainerEl: HTMLDivElement;
  containerEl: HTMLDivElement;
  snackbarEl: HTMLDivElement;
  // A div to intercept touch events. Only set while (playing && useTouch).
  touchController: HTMLDivElement;

  config: object;
  // Logical dimensions of the container.
  dimensions: object;

  gameType: null;
  altGameImageSprite: null;
  altGameModeActive: false;
  altGameModeFlashTimer: null;
  fadeInTimer: number;

  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;

  tRex: Trex;

  distanceMeter: DistanceMeter;
  distanceRan: number;

  highestScore: number;
  syncHighestScore: boolean;

  time: number;
  runningTime: number;
  msPerFrame: number;
  currentSpeed: number;

  obstacles: Obstacle[];

  activated: boolean; // Whether the easter egg has been activated.
  playing: boolean; // Whether the game is currently in play state.
  crashed: boolean;
  paused: boolean;
  inverted: boolean;
  invertTimer: number;
  resizeTimerId_: number;

  playCount: number;

  // Sound FX.
  audioBuffer: AudioBuffer;

  /** @type {Object} */
  soundFx: object;
  generatedSoundFx: GeneratedSoundFx;

  // Global web audio context for playing sounds.
  audioContext: AudioContext;

  // Images.
  images: object;
  imagesLoaded: number;

  // Gamepad state.
  pollingGamepads: boolean;
  gamepadIndex: number;
  previousGamepad: Gamepad;

  /**
   * T-Rex runner.
   * @param outerContainerId Outer containing element id.
   * @param optConfig
   * @implements {EventListener}
   */
  constructor(outerContainerId: string, optConfig?: object) {
    // Singleton
    if (Runner.instance_) {
      return Runner.instance_;
    }
    Runner.instance_ = this;

    this.outerContainerEl = document.querySelector(outerContainerId);
    this.containerEl = null;
    this.snackbarEl = null;
    // A div to intercept touch events. Only set while (playing && useTouch).
    this.touchController = null;

    this.config = optConfig ||
      Object.assign(Runner.config, Runner.normalConfig);
    // Logical dimensions of the container.
    this.dimensions = Runner.defaultDimensions;

    this.gameType = null;
    Runner.spriteDefinition = Runner.spriteDefinitionByType["original"];

    this.altGameImageSprite = null;
    this.altGameModeActive = false;
    this.altGameModeFlashTimer = null;
    this.fadeInTimer = 0;

    this.canvas = null;
    this.canvasCtx = null;

    this.tRex = null;

    this.distanceMeter = null;
    this.distanceRan = 0;

    this.highestScore = 0;
    this.syncHighestScore = false;

    this.time = 0;
    this.runningTime = 0;
    this.msPerFrame = 1000 / FPS;
    this.currentSpeed = this.config.SPEED;
    Runner.slowDown = false;

    this.obstacles = [];

    this.activated = false; // Whether the easter egg has been activated.
    this.playing = false; // Whether the game is currently in play state.
    this.crashed = false;
    this.paused = false;
    this.inverted = false;
    this.invertTimer = 0;
    this.resizeTimerId_ = null;

    this.playCount = 0;

    // Sound FX.
    this.audioBuffer = null;

    /** @type {Object} */
    this.soundFx = {};
    this.generatedSoundFx = null;

    // Global web audio context for playing sounds.
    this.audioContext = null;

    // Images.
    this.images = {};
    this.imagesLoaded = 0;

    // Gamepad state.
    this.pollingGamepads = false;
    this.gamepadIndex = undefined;
    this.previousGamepad = null;

    this.loadImages();

    window["initializeEasterEggHighScore"] = this.initializeHighScore.bind(
      this,
    );
  }

  /**
   * Setting individual settings for debugging.
   * @param {string} setting
   * @param {number|string} value
   */
  updateConfigSetting(setting: string, value: number | string) {
    if (setting in this.config && value !== undefined) {
      this.config[setting] = value;

      switch (setting) {
        case "GRAVITY":
        case "MIN_JUMP_HEIGHT":
        case "SPEED_DROP_COEFFICIENT":
          this.tRex.config[setting] = value;
          break;
        case "INITIAL_JUMP_VELOCITY":
          this.tRex.setJumpVelocity(value);
          break;
        case "SPEED":
          this.setSpeed(/** @type {number} */ value);
          break;
      }
    }
  }

  /**
   * Creates an on page image element from the base 64 encoded string source.
   * @param {string} resourceName Name in data object,
   * @return {HTMLImageElement} The created element.
   */
  createImageElement(resourceName: string): HTMLImageElement {
    const imgSrc = loadTimeData && loadTimeData.valueExists(resourceName)
      ? loadTimeData.getString(resourceName)
      : null;

    if (imgSrc) {
      const el: HTMLImageElement = /** @type {HTMLImageElement} */ document
        .createElement("img");
      el.id = resourceName;
      el.src = imgSrc;
      document.getElementById("offline-resources").appendChild(el);
      return el;
    }
    return null;
  }

  /**
   * Cache the appropriate image sprite from the page and get the sprite sheet
   * definition.
   */
  loadImages() {
    let scale = "1x";
    this.spriteDef = Runner.spriteDefinition.LDPI;
    if (IS_HIDPI) {
      scale = "2x";
      this.spriteDef = Runner.spriteDefinition.HDPI;
    }

    Runner.imageSprite =
      /** @type {HTMLImageElement} */
      document.getElementById(RESOURCE_POSTFIX + scale);

    if (this.gameType) {
      Runner.altGameImageSprite =
        /** @type {HTMLImageElement} */
        this.createImageElement("altGameSpecificImage" + scale);
      Runner.altCommonImageSprite =
        /** @type {HTMLImageElement} */
        this.createImageElement("altGameCommonImage" + scale);
    }
    Runner.origImageSprite = Runner.imageSprite;

    // Disable the alt game mode if the sprites can't be loaded.
    if (!Runner.altGameImageSprite || !Runner.altCommonImageSprite) {
      this.altGameModeActive = false;
    }

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

      const resourceTemplate = document.getElementById(
        this.config.RESOURCE_TEMPLATE_ID,
      ).content;

      for (const sound in Runner.sounds) {
        const soundSrc = resourceTemplate.getElementById(
          Runner.sounds[sound],
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
   * @param {number=} opt_speed
   */
  setSpeed(opt_speed: number | undefined) {
    const speed = opt_speed || this.currentSpeed;

    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
      const mobileSpeed = Runner.slowDown
        ? speed
        : ((speed * this.dimensions.WIDTH) / DEFAULT_WIDTH) *
          this.config.MOBILE_SPEED_COEFFICIENT;
      this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
    } else if (opt_speed) {
      this.currentSpeed = opt_speed;
    }
  }

  /**
   * Game initialiser.
   */
  init() {
    this.adjustDimensions();
    this.setSpeed();

    this.containerEl = document.createElement("div");
    this.containerEl.setAttribute("role", IS_MOBILE ? "button" : "application");
    this.containerEl.setAttribute("tabindex", "0");

    this.containerEl.className = Runner.classes.CONTAINER;

    // Player canvas container.
    this.canvas = createCanvas(
      this.containerEl,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
    );

    this.generatedSoundFx = new GeneratedSoundFx();

    this.canvasCtx = /** @type {CanvasRenderingContext2D} */ this.canvas
      .getContext("2d");
    this.canvasCtx.fillStyle = "#f7f7f7";
    this.canvasCtx.fill();
    Runner.updateCanvasScaling(this.canvas);

    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(
      this.canvas,
      this.spriteDef,
      this.dimensions,
      this.config.GAP_COEFFICIENT,
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

    // Handle dark mode
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );
    this.isDarkMode = darkModeMediaQuery && darkModeMediaQuery.matches;
    darkModeMediaQuery.addListener((e) => {
      this.isDarkMode = e.matches;
    });
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
    this.resizeTimerId_ = null;

    const boxStyles = window.getComputedStyle(this.outerContainerEl);
    const padding = Number(
      boxStyles.paddingLeft.substr(0, boxStyles.paddingLeft.length - 2),
    );

    this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;
    if (this.isArcadeMode()) {
      this.dimensions.WIDTH = Math.min(DEFAULT_WIDTH, this.dimensions.WIDTH);
      if (this.activated) {
        this.setArcadeModeContainerScale();
      }
    }

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
        this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
        this.gameOverPanel.draw(this.altGameModeActive, this.tRex);
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
    if (this.isArcadeMode()) {
      this.setArcadeMode();
    }
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
   * Enable the alt game mode. Switching out the sprites.
   */
  enableAltGameMode() {
    Runner.imageSprite = Runner.altGameImageSprite;
    Runner.spriteDefinition = Runner.spriteDefinitionByType[Runner.gameType];

    if (IS_HIDPI) {
      this.spriteDef = Runner.spriteDefinition.HDPI;
    } else {
      this.spriteDef = Runner.spriteDefinition.LDPI;
    }

    this.altGameModeActive = true;
    this.tRex.enableAltGameMode(this.spriteDef.TREX);
    this.horizon.enableAltGameMode(this.spriteDef);
    this.generatedSoundFx.background();
  }

  /**
   * Update the game frame and schedules the next one.
   */
  update() {
    this.updatePending = false;

    const now = getTimeStamp();
    let deltaTime = now - (this.time || now);

    // Flashing when switching game modes.
    if (this.altGameModeFlashTimer < 0 || this.altGameModeFlashTimer === 0) {
      this.altGameModeFlashTimer = null;
      this.tRex.setFlashing(false);
      this.enableAltGameMode();
    } else if (this.altGameModeFlashTimer > 0) {
      this.altGameModeFlashTimer -= deltaTime;
      this.tRex.update(deltaTime);
      deltaTime = 0;
    }

    this.time = now;

    if (this.playing) {
      this.clearCanvas();

      // Additional fade in - Prevents jump when switching sprites
      if (
        this.altGameModeActive &&
        this.fadeInTimer <= this.config.FADE_DURATION
      ) {
        this.fadeInTimer += deltaTime / 1000;
        this.canvasCtx.globalAlpha = this.fadeInTimer;
      } else {
        this.canvasCtx.globalAlpha = 1;
      }

      if (this.tRex.jumping) {
        this.tRex.updateJump(deltaTime);
      }

      this.runningTime += deltaTime;
      const hasObstacles = this.runningTime > this.config.CLEAR_TIME;

      // First jump triggers the intro.
      if (this.tRex.jumpCount === 1 && !this.playingIntro) {
        this.playIntro();
      }

      // The horizon doesn't move until the intro is over.
      if (this.playingIntro) {
        this.horizon.update(0, this.currentSpeed, hasObstacles);
      } else if (!this.crashed) {
        const showNightMode = this.isDarkMode ^ this.inverted;
        deltaTime = !this.activated ? 0 : deltaTime;
        this.horizon.update(
          deltaTime,
          this.currentSpeed,
          hasObstacles,
          showNightMode,
        );
      }

      // Check for collisions.
      let collision = hasObstacles &&
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

        if (this.currentSpeed < this.config.MAX_SPEED) {
          this.currentSpeed += this.config.ACCELERATION;
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
      if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
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
          this.invertTrigger = !(actualDistance % this.config.INVERT_DISTANCE);

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
    return function (evtType, events) {
      switch (evtType) {
        case events.KEYDOWN:
        case events.TOUCHSTART:
        case events.POINTERDOWN:
          this.onKeyDown(e);
          break;
        case events.KEYUP:
        case events.TOUCHEND:
        case events.POINTERUP:
          this.onKeyUp(e);
          break;
        case events.GAMEPADCONNECTED:
          this.onGamepadConnected(e);
          break;
      }
    }.bind(this)(e.type, Runner.events);
  }

  /**
   * Initialize audio cues if activated by focus on the canvas element.
   * @param {Event} e
   */
  handleCanvasKeyPress(e: Event) {
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
   * @param {Event} e
   */
  preventScrolling(e: Event) {
    if (e.keyCode === 32) {
      e.preventDefault();
    }
  }

  /**
   * Toggle speed setting if toggle is shown.
   */
  toggleSpeed() {
    if (Runner.audioCues) {
      const speedChange = Runner.slowDown != this.slowSpeedCheckbox.checked;

      if (speedChange) {
        Runner.slowDown = this.slowSpeedCheckbox.checked;
        const updatedConfig = Runner.slowDown
          ? Runner.slowConfig
          : Runner.normalConfig;

        Runner.config = Object.assign(Runner.config, updatedConfig);
        this.currentSpeed = updatedConfig.SPEED;
        this.tRex.enableSlowConfig();
        this.horizon.adjustObstacleSpeed();
      }
    }
  }

  /**
   * Bind relevant key / mouse / touch listeners.
   */
  startListening() {
    // A11y keyboard / screen reader activation.
    this.containerEl.addEventListener(
      Runner.events.KEYDOWN,
      this.handleCanvasKeyPress.bind(this),
    );
    this.canvas.addEventListener(
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

    if (this.isArcadeMode()) {
      // Gamepad
      window.addEventListener(Runner.events.GAMEPADCONNECTED, this);
    }
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

    if (this.isArcadeMode()) {
      window.removeEventListener(Runner.events.GAMEPADCONNECTED, this);
    }
  }

  /**
   * Process keydown.
   * @param {Event} e
   */
  onKeyDown(e: Event) {
    // Prevent native page scrolling whilst tapping on mobile.
    if (IS_MOBILE && this.playing) {
      e.preventDefault();
    }

    if (this.isCanvasInView()) {
      // Allow toggling of speed toggle.
      if (
        Runner.keycodes.JUMP[e.keyCode] &&
        e.target == this.slowSpeedCheckbox
      ) {
        return;
      }

      if (!this.crashed && !this.paused) {
        // For a11y, screen reader activation.
        const isMobileMouseInput = (IS_MOBILE &&
          e.type === Runner.events.POINTERDOWN &&
          e.pointerType == "mouse" &&
          e.target == this.containerEl) ||
          (IS_IOS &&
            e.pointerType == "touch" &&
            document.activeElement == this.containerEl);

        if (
          Runner.keycodes.JUMP[e.keyCode] ||
          e.type === Runner.events.TOUCHSTART ||
          isMobileMouseInput ||
          (Runner.keycodes.DUCK[e.keyCode] && this.altGameModeActive)
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
            if (window.errorPageController) {
              errorPageController.trackEasterEgg();
            }
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
          // Ducking is disabled on alt game modes.
        } else if (
          !this.altGameModeActive &&
          this.playing &&
          Runner.keycodes.DUCK[e.keyCode]
        ) {
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
  }

  /**
   * Process key up.
   * @param {Event} e
   */
  onKeyUp(e: Event) {
    const keyCode = String(e.keyCode);
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
          this.isLeftClickOnCanvas(e) ||
          (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
            Runner.keycodes.JUMP[keyCode]))
      ) {
        this.handleGameOverClicks(e);
      }
    } else if (this.paused && isjumpKey) {
      // Reset the jump state
      this.tRex.reset();
      this.play();
    }
  }

  /**
   * Process gamepad connected event.
   * @param {Event} e
   */
  onGamepadConnected(e: Event) {
    if (!this.pollingGamepads) {
      this.pollGamepadState();
    }
  }

  /**
   * rAF loop for gamepad polling.
   */
  pollGamepadState() {
    const gamepads = navigator.getGamepads();
    this.pollActiveGamepad(gamepads);

    this.pollingGamepads = true;
    requestAnimationFrame(this.pollGamepadState.bind(this));
  }

  /**
   * Polls for a gamepad with the jump button pressed. If one is found this
   * becomes the "active" gamepad and all others are ignored.
   * @param gamepads
   */
  pollForActiveGamepad(gamepads: Gamepad[]) {
    for (let i = 0; i < gamepads.length; ++i) {
      if (
        gamepads[i] &&
        gamepads[i].buttons.length > 0 &&
        gamepads[i].buttons[0].pressed
      ) {
        this.gamepadIndex = i;
        this.pollActiveGamepad(gamepads);
        return;
      }
    }
  }

  /**
   * Polls the chosen gamepad for button presses and generates KeyboardEvents
   * to integrate with the rest of the game logic.
   * @param {!Array<Gamepad>} gamepads
   */
  pollActiveGamepad(gamepads: Array<Gamepad>) {
    if (this.gamepadIndex === undefined) {
      this.pollForActiveGamepad(gamepads);
      return;
    }

    const gamepad = gamepads[this.gamepadIndex];
    if (!gamepad) {
      this.gamepadIndex = undefined;
      this.pollForActiveGamepad(gamepads);
      return;
    }

    // The gamepad specification defines the typical mapping of physical buttons
    // to button indicies: https://w3c.github.io/gamepad/#remapping
    this.pollGamepadButton(gamepad, 0, 38); // Jump
    if (gamepad.buttons.length >= 2) {
      this.pollGamepadButton(gamepad, 1, 40); // Duck
    }
    if (gamepad.buttons.length >= 10) {
      this.pollGamepadButton(gamepad, 9, 13); // Restart
    }

    this.previousGamepad = gamepad;
  }

  /**
   * Generates a key event based on a gamepad button.
   * @param {!Gamepad} gamepad
   * @param {number} buttonIndex
   * @param {number} keyCode
   */
  pollGamepadButton(gamepad: Gamepad, buttonIndex: number, keyCode: number) {
    const state = gamepad.buttons[buttonIndex].pressed;
    let previousState = false;
    if (this.previousGamepad) {
      previousState = this.previousGamepad.buttons[buttonIndex].pressed;
    }
    // Generate key events on the rising and falling edge of a button press.
    if (state !== previousState) {
      const e = new KeyboardEvent(
        state ? Runner.events.KEYDOWN : Runner.events.KEYUP,
        { keyCode: keyCode },
      );
      document.dispatchEvent(e);
    }
  }

  /**
   * Handle interactions on the game over screen state.
   * A user is able to tap the high score twice to reset it.
   * @param {Event} e
   */
  handleGameOverClicks(e: Event) {
    if (e.target != this.slowSpeedCheckbox) {
      e.preventDefault();
      if (this.distanceMeter.hasClickedOnHighScore(e) && this.highestScore) {
        if (this.distanceMeter.isHighScoreFlashing()) {
          // Subsequent click, reset the high score.
          this.saveHighScore(0, true);
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
  }

  /**
   * Returns whether the event was a left click on canvas.
   * On Windows right click is registered as a click.
   * @param {Event} e
   * @return {boolean}
   */
  isLeftClickOnCanvas(e: Event): boolean {
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
      if (window.errorPageController) {
        errorPageController.updateEasterEggHighScore(this.highestScore);
      }
      return;
    }
    this.highestScore = highScore;
    this.distanceMeter.setHighScore(this.highestScore);
  }

  /**
   * Sets the current high score and saves to the profile if available.
   * @param {number} distanceRan Total distance ran.
   * @param {boolean=} opt_resetScore Whether to reset the score.
   */
  saveHighScore(distanceRan: number, opt_resetScore: boolean | undefined) {
    this.highestScore = Math.ceil(distanceRan);
    this.distanceMeter.setHighScore(this.highestScore);

    // Store the new high score in the profile.
    if (this.syncHighestScore && window.errorPageController) {
      if (opt_resetScore) {
        errorPageController.resetEasterEggHighScore();
      } else {
        errorPageController.updateEasterEggHighScore(this.highestScore);
      }
    }
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

    this.tRex.update(100, Trex.status.CRASHED);

    // Game over panel.
    if (!this.gameOverPanel) {
      const origSpriteDef = IS_HIDPI
        ? Runner.spriteDefinitionByType.original.HDPI
        : Runner.spriteDefinitionByType.original.LDPI;

      if (this.canvas) {
        this.gameOverPanel = new GameOverPanel(
          this.canvas,
          origSpriteDef.TEXT_SPRITE,
          origSpriteDef.RESTART,
          this.dimensions,
        );
      }
    }

    this.gameOverPanel.draw(this.altGameModeActive, this.tRex);

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
      this.tRex.update(0, Trex.status.RUNNING);
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
      this.setSpeed(this.config.SPEED);
      this.time = getTimeStamp();
      this.containerEl.classList.remove(Runner.classes.CRASHED);
      this.clearCanvas();
      this.distanceMeter.reset();
      this.horizon.reset();
      this.tRex.reset();
      this.playSound(this.soundFx.BUTTON_PRESS);
      this.invert(true);
      this.flashTimer = null;
      this.update();
      this.gameOverPanel.reset();
      this.generatedSoundFx.background();
    }
  }

  setPlayStatus(isPlaying) {
    if (this.touchController) {
      this.touchController.classList.toggle("hidden", !isPlaying);
    }
    this.playing = isPlaying;
  }

  /**
   * Whether the game should go into arcade mode.
   * @return {boolean}
   */
  isArcadeMode(): boolean {
    // In RTL languages the title is wrapped with the left to right mark
    // control characters &#x202A; and &#x202C but are invisible.
    return true;
  }

  /**
   * Hides offline messaging for a fullscreen game only experience.
   */
  setArcadeMode() {
    document.body.classList.add(Runner.classes.ARCADE_MODE);
    this.setArcadeModeContainerScale();
  }

  /**
   * Sets the scaling for arcade mode.
   */
  setArcadeModeContainerScale() {
    const windowHeight = window.innerHeight;
    const scaleHeight = windowHeight / this.dimensions.HEIGHT;
    const scaleWidth = window.innerWidth / this.dimensions.WIDTH;
    const scale = Math.max(1, Math.min(scaleHeight, scaleWidth));
    const scaledCanvasHeight = this.dimensions.HEIGHT * scale;
    // Positions the game container at 10% of the available vertical window
    // height minus the game container height.
    const translateY = Math.ceil(
      Math.max(
        0,
        (windowHeight -
          scaledCanvasHeight -
          Runner.config.ARCADE_MODE_INITIAL_TOP_POSITION) *
          Runner.config.ARCADE_MODE_TOP_POSITION_PERCENT,
      ),
    ) * window.devicePixelRatio;

    this.containerEl.style.transform = "scale(" + scale + ") translateY(" +
      translateY + "px)";
  }

  /**
   * Pause the game if the tab is not in focus.
   */
  onVisibilityChange(e) {
    if (
      document.hidden ||
      document.webkitHidden ||
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
   * @param {AudioBuffer} soundBuffer
   */
  playSound(soundBuffer: AudioBuffer) {
    if (soundBuffer) {
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = soundBuffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.start(0);
    }
  }

  /**
   * Inverts the current page / canvas colors.
   * @param {boolean} reset Whether to reset colors.
   */
  invert(reset: boolean) {
    const htmlEl = document.firstElementChild;

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
