// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *   downloadButtonClick: function(),
 *   reloadButtonClick: function(),
 *   detailsButtonClick: function(),
 *   diagnoseErrorsButtonClick: function(),
 *   trackEasterEgg: function(),
 *   updateEasterEggHighScore: function(number),
 *   resetEasterEggHighScore: function(),
 *   launchOfflineItem: function(string, string),
 *   savePageForLater: function(),
 *   cancelSavePage: function(),
 *   listVisibilityChange: function(boolean),
 * }}
 */
// eslint-disable-next-line no-var
var errorPageController;

const HIDDEN_CLASS = 'hidden';

// Decodes a UTF16 string that is encoded as base64.
function decodeUTF16Base64ToString(encoded_text) {
  const data = atob(encoded_text);
  let result = '';
  for (let i = 0; i < data.length; i += 2) {
    result +=
        String.fromCharCode(data.charCodeAt(i) * 256 + data.charCodeAt(i + 1));
  }
  return result;
}

function toggleHelpBox() {
  const helpBoxOuter = document.getElementById('details');
  helpBoxOuter.classList.toggle(HIDDEN_CLASS);
  const detailsButton = document.getElementById('details-button');
  if (helpBoxOuter.classList.contains(HIDDEN_CLASS)) {
    /** @suppress {missingProperties} */
    detailsButton.innerText = detailsButton.detailsText;
  } else {
    /** @suppress {missingProperties} */
    detailsButton.innerText = detailsButton.hideDetailsText;
  }

  // Details appears over the main content on small screens.
  if (mobileNav) {
    document.getElementById('main-content').classList.toggle(HIDDEN_CLASS);
    const runnerContainer = document.querySelector('.runner-container');
    if (runnerContainer) {
      runnerContainer.classList.toggle(HIDDEN_CLASS);
    }
  }
}

function diagnoseErrors() {
  if (window.errorPageController) {
    errorPageController.diagnoseErrorsButtonClick();
  }
}

// Subframes use a different layout but the same html file.  This is to make it
// easier to support platforms that load the error page via different
// mechanisms (Currently just iOS). We also use the subframe style for portals
// as they are embedded like subframes and can't be interacted with by the user.
if (window.top.location !== window.location || window.portalHost) {
  document.documentElement.setAttribute('subframe', '');
}

// Re-renders the error page using |strings| as the dictionary of values.
// Used by NetErrorTabHelper to update DNS error pages with probe results.
function updateForDnsProbe(strings) {
  const context = new JsEvalContext(strings);
  jstProcess(context, document.getElementById('t'));
  onDocumentLoadOrUpdate();
}

// Given the classList property of an element, adds an icon class to the list
// and removes the previously-
function updateIconClass(classList, newClass) {
  let oldClass;

  if (classList.hasOwnProperty('last_icon_class')) {
    oldClass = classList['last_icon_class'];
    if (oldClass === newClass) {
      return;
    }
  }

  classList.add(newClass);
  if (oldClass !== undefined) {
    classList.remove(oldClass);
  }

  classList['last_icon_class'] = newClass;

  if (newClass === 'icon-offline') {
    document.firstElementChild.classList.add('offline');
    new Runner('.interstitial-wrapper');
  } else {
    document.body.classList.add('neterror');
  }
}

// Does a search using |baseSearchUrl| and the text in the search box.
function search(baseSearchUrl) {
  const searchTextNode = document.getElementById('search-box');
  document.location = baseSearchUrl + searchTextNode.value;
  return false;
}

// Implements button clicks.  This function is needed during the transition
// between implementing these in trunk chromium and implementing them in
// iOS.
function reloadButtonClick(url) {
  if (window.errorPageController) {
    errorPageController.reloadButtonClick();
  } else {
    window.location = url;
  }
}

function downloadButtonClick() {
  if (window.errorPageController) {
    errorPageController.downloadButtonClick();
    const downloadButton = document.getElementById('download-button');
    downloadButton.disabled = true;
    /** @suppress {missingProperties} */
    downloadButton.textContent = downloadButton.disabledText;

    document.getElementById('download-link-wrapper')
        .classList.add(HIDDEN_CLASS);
    document.getElementById('download-link-clicked-wrapper')
        .classList.remove(HIDDEN_CLASS);
  }
}

function detailsButtonClick() {
  if (window.errorPageController) {
    errorPageController.detailsButtonClick();
  }
}

let primaryControlOnLeft = true;
// 
primaryControlOnLeft = false;
// 

function setAutoFetchState(scheduled, can_schedule) {
  document.getElementById('cancel-save-page-button')
      .classList.toggle(HIDDEN_CLASS, !scheduled);
  document.getElementById('save-page-for-later-button')
      .classList.toggle(HIDDEN_CLASS, scheduled || !can_schedule);
}

function savePageLaterClick() {
  errorPageController.savePageForLater();
  // savePageForLater will eventually trigger a call to setAutoFetchState() when
  // it completes.
}

function cancelSavePageClick() {
  errorPageController.cancelSavePage();
  // setAutoFetchState is not called in response to cancelSavePage(), so do it
  // now.
  setAutoFetchState(false, true);
}

function toggleErrorInformationPopup() {
  document.getElementById('error-information-popup-container')
      .classList.toggle(HIDDEN_CLASS);
}

function launchOfflineItem(itemID, name_space) {
  errorPageController.launchOfflineItem(itemID, name_space);
}

function launchDownloadsPage() {
  errorPageController.launchDownloadsPage();
}

function getIconForSuggestedItem(item) {
  // Note: |item.content_type| contains the enum values from
  // chrome::mojom::AvailableContentType.
  switch (item.content_type) {
    case 1:  // kVideo
      return 'image-video';
    case 2:  // kAudio
      return 'image-music-note';
    case 0:  // kPrefetchedPage
    case 3:  // kOtherPage
      return 'image-earth';
  }
  return 'image-file';
}

function getSuggestedContentDiv(item, index) {
  // Note: See AvailableContentToValue in available_offline_content_helper.cc
  // for the data contained in an |item|.
  // TODO(carlosk): Present |snippet_base64| when that content becomes
  // available.
  let thumbnail = '';
  const extraContainerClasses = [];
  // html_inline.py will try to replace src attributes with data URIs using a
  // simple regex. The following is obfuscated slightly to avoid that.
  const source = 'src';
  if (item.thumbnail_data_uri) {
    extraContainerClasses.push('suggestion-with-image');
    thumbnail = `<img ${source}="${item.thumbnail_data_uri}">`;
  } else {
    extraContainerClasses.push('suggestion-with-icon');
    const iconClass = getIconForSuggestedItem(item);
    thumbnail = `<div><img class="${iconClass}"></div>`;
  }

  let favicon = '';
  if (item.favicon_data_uri) {
    favicon = `<img ${source}="${item.favicon_data_uri}">`;
  } else {
    extraContainerClasses.push('no-favicon');
  }

  if (!item.attribution_base64) {
    extraContainerClasses.push('no-attribution');
  }

  return `
  <div class="offline-content-suggestion ${extraContainerClasses.join(' ')}"
    onclick="launchOfflineItem('${item.ID}', '${item.name_space}')">
      <div class="offline-content-suggestion-texts">
        <div id="offline-content-suggestion-title-${index}"
             class="offline-content-suggestion-title">
        </div>
        <div class="offline-content-suggestion-attribution-freshness">
          <div id="offline-content-suggestion-favicon-${index}"
               class="offline-content-suggestion-favicon">
            ${favicon}
          </div>
          <div id="offline-content-suggestion-attribution-${index}"
               class="offline-content-suggestion-attribution">
          </div>
          <div class="offline-content-suggestion-freshness">
            ${item.date_modified}
          </div>
          <div class="offline-content-suggestion-pin-spacer"></div>
          <div class="offline-content-suggestion-pin"></div>
        </div>
      </div>
      <div class="offline-content-suggestion-thumbnail">
        ${thumbnail}
      </div>
  </div>`;
}

/**
 * @typedef {{
 *   ID: string,
 *   name_space: string,
 *   title_base64: string,
 *   snippet_base64: string,
 *   date_modified: string,
 *   attribution_base64: string,
 *   thumbnail_data_uri: string,
 *   favicon_data_uri: string,
 *   content_type: number,
 * }}
 */
let AvailableOfflineContent;

// Populates a list of suggested offline content.
// Note: For security reasons all content downloaded from the web is considered
// unsafe and must be securely handled to be presented on the dino page. Images
// have already been safely re-encoded but textual content -- like title and
// attribution -- must be properly handled here.
// @param {boolean} isShown
// @param {Array<AvailableOfflineContent>} suggestions
function offlineContentAvailable(isShown, suggestions) {
  if (!suggestions || !loadTimeData.valueExists('offlineContentList')) {
    return;
  }

  const suggestionsHTML = [];
  for (let index = 0; index < suggestions.length; index++) {
    suggestionsHTML.push(getSuggestedContentDiv(suggestions[index], index));
  }

  document.getElementById('offline-content-suggestions').innerHTML =
      suggestionsHTML.join('\n');

  // Sets textual web content using |textContent| to make sure it's handled as
  // plain text.
  for (let index = 0; index < suggestions.length; index++) {
    document.getElementById(`offline-content-suggestion-title-${index}`)
        .textContent =
        decodeUTF16Base64ToString(suggestions[index].title_base64);
    document.getElementById(`offline-content-suggestion-attribution-${index}`)
        .textContent =
        decodeUTF16Base64ToString(suggestions[index].attribution_base64);
  }

  const contentListElement = document.getElementById('offline-content-list');
  if (document.dir === 'rtl') {
    contentListElement.classList.add('is-rtl');
  }
  contentListElement.hidden = false;
  // The list is configured as hidden by default. Show it if needed.
  if (isShown) {
    toggleOfflineContentListVisibility(false);
  }
}

function toggleOfflineContentListVisibility(updatePref) {
  if (!loadTimeData.valueExists('offlineContentList')) {
    return;
  }

  const contentListElement = document.getElementById('offline-content-list');
  const isVisible = !contentListElement.classList.toggle('list-hidden');

  if (updatePref && window.errorPageController) {
    errorPageController.listVisibilityChanged(isVisible);
  }
}

// Called on document load, and from updateForDnsProbe().
function onDocumentLoadOrUpdate() {
  const downloadButtonVisible = loadTimeData.valueExists('downloadButton') &&
      loadTimeData.getValue('downloadButton').msg;
  const detailsButton = document.getElementById('details-button');

  // If offline content suggestions will be visible, the usual buttons will not
  // be presented.
  const offlineContentVisible =
      loadTimeData.valueExists('suggestedOfflineContentPresentation');
  if (offlineContentVisible) {
    document.querySelector('.nav-wrapper').classList.add(HIDDEN_CLASS);
    detailsButton.classList.add(HIDDEN_CLASS);

    document.getElementById('download-link').hidden = !downloadButtonVisible;
    document.getElementById('download-links-wrapper')
        .classList.remove(HIDDEN_CLASS);
    document.getElementById('error-information-popup-container')
        .classList.add('use-popup-container', HIDDEN_CLASS);
    document.getElementById('error-information-button')
        .classList.remove(HIDDEN_CLASS);
  }

  const attemptAutoFetch = loadTimeData.valueExists('attemptAutoFetch') &&
      loadTimeData.getValue('attemptAutoFetch');

  const reloadButtonVisible = loadTimeData.valueExists('reloadButton') &&
      loadTimeData.getValue('reloadButton').msg;

  const reloadButton = document.getElementById('reload-button');
  const downloadButton = document.getElementById('download-button');
  if (reloadButton.style.display === 'none' &&
      downloadButton.style.display === 'none') {
    detailsButton.classList.add('singular');
  }

  // Show or hide control buttons.
  const controlButtonDiv = document.getElementById('control-buttons');
  controlButtonDiv.hidden =
      offlineContentVisible || !(reloadButtonVisible || downloadButtonVisible);
}

function onDocumentLoad() {
  // Sets up the proper button layout for the current platform.
  const buttonsDiv = document.getElementById('buttons');
  if (primaryControlOnLeft) {
    buttonsDiv.classList.add('suggested-left');
  } else {
    buttonsDiv.classList.add('suggested-right');
  }

  onDocumentLoadOrUpdate();
}

document.addEventListener('DOMContentLoaded', onDocumentLoad);

// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let mobileNav = false;

/**
 * For small screen mobile the navigation buttons are moved
 * below the advanced text.
 */
function onResize() {
  const helpOuterBox = document.querySelector('#details');
  const mainContent = document.querySelector('#main-content');
  const mediaQuery = '(min-width: 240px) and (max-width: 420px) and ' +
      '(min-height: 401px), ' +
      '(max-height: 560px) and (min-height: 240px) and ' +
      '(min-width: 421px)';

  const detailsHidden = helpOuterBox.classList.contains(HIDDEN_CLASS);
  const runnerContainer = document.querySelector('.runner-container');

  // Check for change in nav status.
  if (mobileNav !== window.matchMedia(mediaQuery).matches) {
    mobileNav = !mobileNav;

    // Handle showing the top content / details sections according to state.
    if (mobileNav) {
      mainContent.classList.toggle(HIDDEN_CLASS, !detailsHidden);
      helpOuterBox.classList.toggle(HIDDEN_CLASS, detailsHidden);
      if (runnerContainer) {
        runnerContainer.classList.toggle(HIDDEN_CLASS, !detailsHidden);
      }
    } else if (!detailsHidden) {
      // Non mobile nav with visible details.
      mainContent.classList.remove(HIDDEN_CLASS);
      helpOuterBox.classList.remove(HIDDEN_CLASS);
      if (runnerContainer) {
        runnerContainer.classList.remove(HIDDEN_CLASS);
      }
    }
  }
}

function setupMobileNav() {
  window.addEventListener('resize', onResize);
  onResize();
}

document.addEventListener('DOMContentLoaded', setupMobileNav);

// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * T-Rex runner.
 * @param {string} outerContainerId Outer containing element id.
 * @param {!Object=} opt_config
 * @constructor
 * @implements {EventListener}
 * @export
 */
function Runner(outerContainerId, opt_config) {
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

  this.config = opt_config || Runner.config;
  // Logical dimensions of the container.
  this.dimensions = Runner.defaultDimensions;

  this.gameType = null;
  Runner.spriteDefinition = Runner.spriteDefinitionByType['original'];

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

  if (this.isDisabled()) {
    this.setupDisabledRunner();
  } else {
    if (Runner.isAltGameModeEnabled()) {
      this.initAltGameType();
      Runner.gameType = this.gameType;
    }
    this.loadImages();

    window['initializeEasterEggHighScore'] =
        this.initializeHighScore.bind(this);
  }
}

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
const IS_RTL = document.querySelector('html').dir == 'rtl';

/** @const */
const ARCADE_MODE_URL = 'chrome://dino/';

/** @const */
const RESOURCE_POSTFIX = 'offline-resources-';

/** @const */
const A11Y_STRINGS = {
  ariaLabel: 'dinoGameA11yAriaLabel',
  gameOver: 'dinoGameA11yGameOver',
  highScore: 'dinoGameA11yHighScore',
  jump: 'dinoGameA11yJump',
  started: 'dinoGameA11yStartGame'
};

/**
 * Default game configuration.
 */
Runner.config = {
  ACCELERATION: 0.001,
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
  GAP_COEFFICIENT: 0.6,
  GRAVITY: 0.6,
  INITIAL_JUMP_VELOCITY: 12,
  INVERT_FADE_DURATION: 12000,
  INVERT_DISTANCE: 700,
  MAX_BLINK_COUNT: 3,
  MAX_CLOUDS: 6,
  MAX_OBSTACLE_LENGTH: 3,
  MAX_OBSTACLE_DUPLICATION: 2,
  MAX_SPEED: 13,
  MIN_JUMP_HEIGHT: 35,
  MOBILE_SPEED_COEFFICIENT: 1.2,
  RESOURCE_TEMPLATE_ID: 'audio-resources',
  SPEED: 6,
  SPEED_DROP_COEFFICIENT: 3,
  ARCADE_MODE_INITIAL_TOP_POSITION: 35,
  ARCADE_MODE_TOP_POSITION_PERCENT: 0.1
};


/**
 * Default dimensions.
 */
Runner.defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 150
};


/**
 * CSS class names.
 * @enum {string}
 */
Runner.classes = {
  ARCADE_MODE: 'arcade-mode',
  CANVAS: 'runner-canvas',
  CONTAINER: 'runner-container',
  CRASHED: 'crashed',
  ICON: 'icon-offline',
  INVERTED: 'inverted',
  SNACKBAR: 'snackbar',
  SNACKBAR_SHOW: 'snackbar-show',
  TOUCH_CONTROLLER: 'controller'
};


/**
 * Sound FX. Reference to the ID of the audio tag on interstitial page.
 * @enum {string}
 */
Runner.sounds = {
  BUTTON_PRESS: 'offline-sound-press',
  HIT: 'offline-sound-hit',
  SCORE: 'offline-sound-reached'
};


/**
 * Key code mapping.
 * @enum {Object}
 */
Runner.keycodes = {
  JUMP: {'38': 1, '32': 1},  // Up, spacebar
  DUCK: {'40': 1},  // Down
  RESTART: {'13': 1}  // Enter
};


/**
 * Runner event names.
 * @enum {string}
 */
Runner.events = {
  ANIM_END: 'webkitAnimationEnd',
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  POINTERDOWN: 'pointerdown',
  POINTERUP: 'pointerup',
  RESIZE: 'resize',
  TOUCHEND: 'touchend',
  TOUCHSTART: 'touchstart',
  VISIBILITY: 'visibilitychange',
  BLUR: 'blur',
  FOCUS: 'focus',
  LOAD: 'load',
  GAMEPADCONNECTED: 'gamepadconnected',
};

Runner.prototype = {
  /**
   * Assign a random game type.
   */
  initAltGameType() {
    this.gameType = loadTimeData && loadTimeData.valueExists('altGameType') ?
        GAME_TYPE[parseInt(loadTimeData.getValue('altGameType'), 10) - 1] :
        '';
  },

  /**
   * Whether the easter egg has been disabled. CrOS enterprise enrolled devices.
   * @return {boolean}
   */
  isDisabled() {
    return loadTimeData && loadTimeData.valueExists('disabledEasterEgg');
  },

  /**
   * For disabled instances, set up a snackbar with the disabled message.
   */
  setupDisabledRunner() {
    this.containerEl = document.createElement('div');
    this.containerEl.className = Runner.classes.SNACKBAR;
    this.containerEl.textContent = loadTimeData.getValue('disabledEasterEgg');
    this.outerContainerEl.appendChild(this.containerEl);

    // Show notification when the activation key is pressed.
    document.addEventListener(Runner.events.KEYDOWN, function(e) {
      if (Runner.keycodes.JUMP[e.keyCode]) {
        this.containerEl.classList.add(Runner.classes.SNACKBAR_SHOW);
        document.querySelector('.icon').classList.add('icon-disabled');
      }
    }.bind(this));
  },

  /**
   * Setting individual settings for debugging.
   * @param {string} setting
   * @param {number|string} value
   */
  updateConfigSetting(setting, value) {
    if (setting in this.config && value !== undefined) {
      this.config[setting] = value;

      switch (setting) {
        case 'GRAVITY':
        case 'MIN_JUMP_HEIGHT':
        case 'SPEED_DROP_COEFFICIENT':
          this.tRex.config[setting] = value;
          break;
        case 'INITIAL_JUMP_VELOCITY':
          this.tRex.setJumpVelocity(value);
          break;
        case 'SPEED':
          this.setSpeed(/** @type {number} */ (value));
          break;
      }
    }
  },

  /**
   * Creates an on page image element from the base 64 encoded string source.
   * @param {string} resourceName Name in data object,
   * @return {HTMLImageElement} The created element.
   */
  createImageElement(resourceName) {
    const imgSrc = loadTimeData && loadTimeData.valueExists(resourceName) ?
        loadTimeData.getString(resourceName) :
        null;

    if (imgSrc) {
      const el =
          /** @type {HTMLImageElement} */ (document.createElement('img'));
      el.id = resourceName;
      el.src = imgSrc;
      document.getElementById('offline-resources').appendChild(el);
      return el;
    }
    return null;
  },

  /**
   * Cache the appropriate image sprite from the page and get the sprite sheet
   * definition.
   */
  loadImages() {
    let scale = '1x';
    this.spriteDef = Runner.spriteDefinition.LDPI;
    if (IS_HIDPI) {
      scale = '2x';
      this.spriteDef = Runner.spriteDefinition.HDPI;
    }

    Runner.imageSprite = /** @type {HTMLImageElement} */
        (document.getElementById(RESOURCE_POSTFIX + scale));

    if (this.gameType) {
      Runner.altGameImageSprite = /** @type {HTMLImageElement} */
          (this.createImageElement('altGameSpecificImage' + scale));
      Runner.altCommonImageSprite = /** @type {HTMLImageElement} */
          (this.createImageElement('altGameCommonImage' + scale));
    }
    Runner.origImageSprite = Runner.imageSprite;

    // Disable the alt game mode if the sprites can't be loaded.
    if (!Runner.altGameImageSprite || !Runner.altCommonImageSprite) {
      Runner.isAltGameModeEnabled = () => false;
      this.altGameModeActive = false;
    }

    if (Runner.imageSprite.complete) {
      this.init();
    } else {
      // If the images are not yet loaded, add a listener.
      Runner.imageSprite.addEventListener(Runner.events.LOAD,
          this.init.bind(this));
    }
  },

  /**
   * Load and decode base 64 encoded sounds.
   */
  loadSounds() {
    if (!IS_IOS) {
      this.audioContext = new AudioContext();

      const resourceTemplate =
          document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

      for (const sound in Runner.sounds) {
        let soundSrc =
            resourceTemplate.getElementById(Runner.sounds[sound]).src;
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
        const buffer = decodeBase64ToArrayBuffer(soundSrc);

        // Async, so no guarantee of order in array.
        this.audioContext.decodeAudioData(buffer, function(index, audioData) {
            this.soundFx[index] = audioData;
          }.bind(this, sound));
      }
    }
  },

  /**
   * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
   * @param {number=} opt_speed
   */
  setSpeed(opt_speed) {
    const speed = opt_speed || this.currentSpeed;

    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
      const mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
          this.config.MOBILE_SPEED_COEFFICIENT;
      this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
    } else if (opt_speed) {
      this.currentSpeed = opt_speed;
    }
  },

  /**
   * Game initialiser.
   */
  init() {
    // Hide the static icon.
    document.querySelector('.' + Runner.classes.ICON).style.visibility =
        'hidden';

    this.adjustDimensions();
    this.setSpeed();

    const ariaLabel = getA11yString(A11Y_STRINGS.ariaLabel);
    this.containerEl = document.createElement('div');
    this.containerEl.setAttribute('role', IS_MOBILE ? 'button' : 'application');
    this.containerEl.setAttribute('tabindex', '0');
    this.containerEl.setAttribute('title', ariaLabel);

    this.containerEl.className = Runner.classes.CONTAINER;

    // Player canvas container.
    this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
        this.dimensions.HEIGHT);

    // Live region for game status updates.
    this.a11yStatusEl = document.createElement('span');
    this.a11yStatusEl.className = 'offline-runner-live-region';
    this.a11yStatusEl.setAttribute('aria-live', 'assertive');
    this.a11yStatusEl.textContent = '';
    Runner.a11yStatusEl = this.a11yStatusEl;

    if (IS_IOS) {
      this.outerContainerEl.appendChild(this.a11yStatusEl);
    } else {
      this.containerEl.appendChild(this.a11yStatusEl);
    }

    this.generatedSoundFx = new GeneratedSoundFx();

    this.canvasCtx =
        /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
    this.canvasCtx.fillStyle = '#f7f7f7';
    this.canvasCtx.fill();
    Runner.updateCanvasScaling(this.canvas);

    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions,
        this.config.GAP_COEFFICIENT);

    // Distance meter
    this.distanceMeter = new DistanceMeter(this.canvas,
          this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);

    // Draw t-rex
    this.tRex = new Trex(this.canvas, this.spriteDef.TREX);

    this.outerContainerEl.appendChild(this.containerEl);

    this.startListening();
    this.update();

    window.addEventListener(Runner.events.RESIZE,
        this.debounceResize.bind(this));

    // Handle dark mode
    const darkModeMediaQuery =
        window.matchMedia('(prefers-color-scheme: dark)');
    this.isDarkMode = darkModeMediaQuery && darkModeMediaQuery.matches;
    darkModeMediaQuery.addListener((e) => {
      this.isDarkMode = e.matches;
    });
  },

  /**
   * Create the touch controller. A div that covers whole screen.
   */
  createTouchController() {
    this.touchController = document.createElement('div');
    this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
    this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
    this.touchController.addEventListener(Runner.events.TOUCHEND, this);
    this.outerContainerEl.appendChild(this.touchController);
  },

  /**
   * Debounce the resize event.
   */
  debounceResize() {
    if (!this.resizeTimerId_) {
      this.resizeTimerId_ =
          setInterval(this.adjustDimensions.bind(this), 250);
    }
  },

  /**
   * Adjust game space dimensions on resize.
   */
  adjustDimensions() {
    clearInterval(this.resizeTimerId_);
    this.resizeTimerId_ = null;

    const boxStyles = window.getComputedStyle(this.outerContainerEl);
    const padding = Number(boxStyles.paddingLeft.substr(0,
        boxStyles.paddingLeft.length - 2));

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
        this.containerEl.style.width = this.dimensions.WIDTH + 'px';
        this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
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
  },

  /**
   * Play the game intro.
   * Canvas container width expands out to the full width.
   */
  playIntro() {
    if (!this.activated && !this.crashed) {
      this.playingIntro = true;
      this.tRex.playingIntro = true;

      // CSS animation definition.
      const keyframes = '@-webkit-keyframes intro { ' +
            'from { width:' + Trex.config.WIDTH + 'px }' +
            'to { width: ' + this.dimensions.WIDTH + 'px }' +
          '}';
      document.styleSheets[0].insertRule(keyframes, 0);

      this.containerEl.addEventListener(Runner.events.ANIM_END,
          this.startGame.bind(this));

      this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';
      this.containerEl.style.width = this.dimensions.WIDTH + 'px';

      this.setPlayStatus(true);
      this.activated = true;
    } else if (this.crashed) {
      this.restart();
    }
  },


  /**
   * Update the game status to started.
   */
  startGame() {
    if (this.isArcadeMode()) {
      this.setArcadeMode();
    }
    this.runningTime = 0;
    this.playingIntro = false;
    this.tRex.playingIntro = false;
    this.containerEl.style.webkitAnimation = '';
    this.playCount++;
    this.generatedSoundFx.background();
    announcePhrase(getA11yString(A11Y_STRINGS.started));

    if (IS_IOS) {
      this.containerEl.setAttribute('title', '');
    }

    // Handle tabbing off the page. Pause the current game.
    document.addEventListener(Runner.events.VISIBILITY,
          this.onVisibilityChange.bind(this));

    window.addEventListener(Runner.events.BLUR,
          this.onVisibilityChange.bind(this));

    window.addEventListener(Runner.events.FOCUS,
          this.onVisibilityChange.bind(this));
  },

  clearCanvas() {
    this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
        this.dimensions.HEIGHT);
  },

  /**
   * Checks whether the canvas area is in the viewport of the browser
   * through the current scroll position.
   * @return boolean.
   */
  isCanvasInView() {
    return this.containerEl.getBoundingClientRect().top >
        Runner.config.CANVAS_IN_VIEW_OFFSET;
  },

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
  },

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
      if (this.altGameModeActive &&
          this.fadeInTimer <= this.config.FADE_DURATION) {
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
            deltaTime, this.currentSpeed, hasObstacles, showNightMode);
      }

      // Check for collisions.
      let collision = hasObstacles &&
          checkForCollision(this.horizon.obstacles[0], this.tRex);

      // For a11y, audio cues.
      if (Runner.audioCues && hasObstacles) {
        const jumpObstacle =
            this.horizon.obstacles[0].typeConfig.type != 'COLLECTABLE';

        if (!this.horizon.obstacles[0].jumpAlerted) {
          const threshold = Runner.isMobileMouseInput ?
              Runner.config.AUDIOCUE_PROXIMITY_THRESHOLD_MOBILE_A11Y :
              Runner.config.AUDIOCUE_PROXIMITY_THRESHOLD;
          const adjProximityThreshold = threshold +
              (threshold * Math.log10(this.currentSpeed / Runner.config.SPEED));

          if (this.horizon.obstacles[0].xPos < adjProximityThreshold) {
            if (jumpObstacle) {
              this.generatedSoundFx.jump();
            }
            this.horizon.obstacles[0].jumpAlerted = true;
          }
        }
      }

      // Activated alt game mode.
      if (Runner.isAltGameModeEnabled() && collision &&
          this.horizon.obstacles[0].typeConfig.type == 'COLLECTABLE') {
        this.horizon.removeFirstObstacle();
        this.tRex.setFlashing(true);
        collision = false;
        this.altGameModeFlashTimer = this.config.FLASH_DURATION;
        this.runningTime = 0;
        this.generatedSoundFx.collect();
      }

      if (!collision) {
        this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

        if (this.currentSpeed < this.config.MAX_SPEED) {
          this.currentSpeed += this.config.ACCELERATION;
        }
      } else {
        this.gameOver();
      }

      const playAchievementSound = this.distanceMeter.update(deltaTime,
          Math.ceil(this.distanceRan));

      if (!Runner.audioCues && playAchievementSound) {
        this.playSound(this.soundFx.SCORE);
      }

      // Night mode.
      if (!Runner.isAltGameModeEnabled()) {
        if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
          this.invertTimer = 0;
          this.invertTrigger = false;
          this.invert(false);
        } else if (this.invertTimer) {
          this.invertTimer += deltaTime;
        } else {
          const actualDistance =
              this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

          if (actualDistance > 0) {
            this.invertTrigger =
                !(actualDistance % this.config.INVERT_DISTANCE);

            if (this.invertTrigger && this.invertTimer === 0) {
              this.invertTimer += deltaTime;
              this.invert(false);
            }
          }
        }
      }
    }

    if (this.playing || (!this.activated &&
        this.tRex.blinkCount < Runner.config.MAX_BLINK_COUNT)) {
      this.tRex.update(deltaTime);
      this.scheduleNextUpdate();
    }
  },

  /**
   * Event handler.
   * @param {Event} e
   */
  handleEvent(e) {
    return (function(evtType, events) {
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
    }.bind(this))(e.type, Runner.events);
  },

  /**
   * Initialize audio cues if activated by focus on the canvas element.
   * @param {Event} e
   */
  handleCanvasKeyPress(e) {
    if (!this.activated) {
      Runner.audioCues = true;
      this.generatedSoundFx.init();
      Runner.generatedSoundFx = this.generatedSoundFx;
      Runner.config.CLEAR_TIME *= 1.2;
    } else if (e.keyCode && Runner.keycodes.JUMP[e.keyCode]) {
      this.onKeyDown(e);
    }
  },

  /**
   * Prevent space key press from scrolling.
   * @param {Event} e
   */
  preventScrolling(e) {
    if (e.keyCode === 32) {
      e.preventDefault();
    }
  },

  /**
   * Bind relevant key / mouse / touch listeners.
   */
  startListening() {
    // A11y keyboard / screen reader activation.
    this.containerEl.addEventListener(
        Runner.events.KEYDOWN, this.handleCanvasKeyPress.bind(this));
    this.canvas.addEventListener(
        Runner.events.KEYDOWN, this.preventScrolling.bind(this));
    this.canvas.addEventListener(
        Runner.events.KEYUP, this.preventScrolling.bind(this));

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
  },

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
  },

  /**
   * Process keydown.
   * @param {Event} e
   */
  onKeyDown(e) {
    // Prevent native page scrolling whilst tapping on mobile.
    if (IS_MOBILE && this.playing) {
      e.preventDefault();
    }

    if (this.isCanvasInView()) {
      if (!this.crashed && !this.paused) {
        // For a11y, screen reader activation.
        const isMobileMouseInput = IS_MOBILE &&
                e.type === Runner.events.POINTERDOWN &&
                e.pointerType == 'mouse' && e.target == this.containerEl ||
            (IS_IOS && e.pointerType == 'touch' &&
             document.activeElement == this.containerEl);

        if (Runner.keycodes.JUMP[e.keyCode] ||
            e.type === Runner.events.TOUCHSTART || isMobileMouseInput ||
            (Runner.keycodes.DUCK[e.keyCode] && this.altGameModeActive)) {
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
            !this.altGameModeActive && this.playing &&
            Runner.keycodes.DUCK[e.keyCode]) {
          e.preventDefault();
          if (this.tRex.jumping) {
            // Speed drop, activated only when jump key is not pressed.
            this.tRex.setSpeedDrop();
          } else if (!this.tRex.jumping && !this.tRex.ducking) {
            // Duck.
            this.tRex.setDuck(true);
          }
        }
        // iOS only triggers touchstart and no pointer events.
      } else if (
          IS_IOS && this.crashed && e.type === Runner.events.TOUCHSTART &&
          e.currentTarget === this.containerEl) {
        this.handleGameOverClicks(e);
      }
    }
  },

  /**
   * Process key up.
   * @param {Event} e
   */
  onKeyUp(e) {
    const keyCode = String(e.keyCode);
    const isjumpKey = Runner.keycodes.JUMP[keyCode] ||
        e.type === Runner.events.TOUCHEND || e.type === Runner.events.POINTERUP;

    if (this.isRunning() && isjumpKey) {
      this.tRex.endJump();
    } else if (Runner.keycodes.DUCK[keyCode]) {
      this.tRex.speedDrop = false;
      this.tRex.setDuck(false);
    } else if (this.crashed) {
      // Check that enough time has elapsed before allowing jump key to restart.
      const deltaTime = getTimeStamp() - this.time;

      if (this.isCanvasInView() &&
          (Runner.keycodes.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
          (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
          Runner.keycodes.JUMP[keyCode]))) {
        this.handleGameOverClicks(e);
      }
    } else if (this.paused && isjumpKey) {
      // Reset the jump state
      this.tRex.reset();
      this.play();
    }
  },

  /**
   * Process gamepad connected event.
   * @param {Event} e
   */
  onGamepadConnected(e) {
    if (!this.pollingGamepads) {
      this.pollGamepadState();
    }
  },

  /**
   * rAF loop for gamepad polling.
   */
  pollGamepadState() {
    const gamepads = navigator.getGamepads();
    this.pollActiveGamepad(gamepads);

    this.pollingGamepads = true;
    requestAnimationFrame(this.pollGamepadState.bind(this));
  },

  /**
   * Polls for a gamepad with the jump button pressed. If one is found this
   * becomes the "active" gamepad and all others are ignored.
   * @param {!Array<Gamepad>} gamepads
   */
  pollForActiveGamepad(gamepads) {
    for (let i = 0; i < gamepads.length; ++i) {
      if (gamepads[i] && gamepads[i].buttons.length > 0 &&
          gamepads[i].buttons[0].pressed) {
        this.gamepadIndex = i;
        this.pollActiveGamepad(gamepads);
        return;
      }
    }
  },

  /**
   * Polls the chosen gamepad for button presses and generates KeyboardEvents
   * to integrate with the rest of the game logic.
   * @param {!Array<Gamepad>} gamepads
   */
  pollActiveGamepad(gamepads) {
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
    this.pollGamepadButton(gamepad, 0, 38);  // Jump
    if (gamepad.buttons.length >= 2) {
      this.pollGamepadButton(gamepad, 1, 40);  // Duck
    }
    if (gamepad.buttons.length >= 10) {
      this.pollGamepadButton(gamepad, 9, 13);  // Restart
    }

    this.previousGamepad = gamepad;
  },

  /**
   * Generates a key event based on a gamepad button.
   * @param {!Gamepad} gamepad
   * @param {number} buttonIndex
   * @param {number} keyCode
   */
  pollGamepadButton(gamepad, buttonIndex, keyCode) {
    const state = gamepad.buttons[buttonIndex].pressed;
    let previousState = false;
    if (this.previousGamepad) {
      previousState = this.previousGamepad.buttons[buttonIndex].pressed;
    }
    // Generate key events on the rising and falling edge of a button press.
    if (state !== previousState) {
      const e = new KeyboardEvent(state ? Runner.events.KEYDOWN
                                      : Runner.events.KEYUP,
                                { keyCode: keyCode });
      document.dispatchEvent(e);
    }
  },

  /**
   * Handle interactions on the game over screen state.
   * A user is able to tap the high score twice to reset it.
   * @param {Event} e
   */
  handleGameOverClicks(e) {
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
  },

  /**
   * Returns whether the event was a left click on canvas.
   * On Windows right click is registered as a click.
   * @param {Event} e
   * @return {boolean}
   */
  isLeftClickOnCanvas(e) {
    return e.button != null && e.button < 2 &&
        e.type === Runner.events.POINTERUP &&
        (e.target === this.canvas ||
         (IS_MOBILE && Runner.audioCues && e.target === this.containerEl));
  },

  /**
   * RequestAnimationFrame wrapper.
   */
  scheduleNextUpdate() {
    if (!this.updatePending) {
      this.updatePending = true;
      this.raqId = requestAnimationFrame(this.update.bind(this));
    }
  },

  /**
   * Whether the game is running.
   * @return {boolean}
   */
  isRunning() {
    return !!this.raqId;
  },

  /**
   * Set the initial high score as stored in the user's profile.
   * @param {number} highScore
   */
  initializeHighScore(highScore) {
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
  },

  /**
   * Sets the current high score and saves to the profile if available.
   * @param {number} distanceRan Total distance ran.
   * @param {boolean=} opt_resetScore Whether to reset the score.
   */
  saveHighScore(distanceRan, opt_resetScore) {
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
  },

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
      const origSpriteDef = IS_HIDPI ?
          Runner.spriteDefinitionByType.original.HDPI :
          Runner.spriteDefinitionByType.original.LDPI;

      if (this.canvas) {
        if (Runner.isAltGameModeEnabled) {
          this.gameOverPanel = new GameOverPanel(
              this.canvas, origSpriteDef.TEXT_SPRITE, origSpriteDef.RESTART,
              this.dimensions, origSpriteDef.ALT_GAME_END,
              this.altGameModeActive);
        } else {
          this.gameOverPanel = new GameOverPanel(
              this.canvas, origSpriteDef.TEXT_SPRITE, origSpriteDef.RESTART,
              this.dimensions);
        }
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
      announcePhrase(
          getA11yString(A11Y_STRINGS.gameOver)
              .replace(
                  '$1',
                  this.distanceMeter.getActualDistance(this.distanceRan)
                      .toString()) +
          ' ' +
          getA11yString(A11Y_STRINGS.highScore)
              .replace(
                  '$1',

                  this.distanceMeter.getActualDistance(this.highestScore)
                      .toString()));
    }
  },

  stop() {
    this.setPlayStatus(false);
    this.paused = true;
    cancelAnimationFrame(this.raqId);
    this.raqId = 0;
    this.generatedSoundFx.stopAll();
  },

  play() {
    if (!this.crashed) {
      this.setPlayStatus(true);
      this.paused = false;
      this.tRex.update(0, Trex.status.RUNNING);
      this.time = getTimeStamp();
      this.update();
      this.generatedSoundFx.background();
    }
  },

  restart() {
    if (!this.raqId) {
      this.playCount++;
      this.runningTime = 0;
      this.setPlayStatus(true);
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
      announcePhrase(getA11yString(A11Y_STRINGS.started));
    }
  },

  setPlayStatus(isPlaying) {
    if (this.touchController) {
      this.touchController.classList.toggle(HIDDEN_CLASS, !isPlaying);
    }
    this.playing = isPlaying;
  },

  /**
   * Whether the game should go into arcade mode.
   * @return {boolean}
   */
  isArcadeMode() {
    // In RTL languages the title is wrapped with the left to right mark
    // control characters &#x202A; and &#x202C but are invisible.
    return IS_RTL ? document.title.indexOf(ARCADE_MODE_URL) == 1 :
                    document.title === ARCADE_MODE_URL;
  },

  /**
   * Hides offline messaging for a fullscreen game only experience.
   */
  setArcadeMode() {
    document.body.classList.add(Runner.classes.ARCADE_MODE);
    this.setArcadeModeContainerScale();
  },

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
    const translateY = Math.ceil(Math.max(0, (windowHeight - scaledCanvasHeight -
        Runner.config.ARCADE_MODE_INITIAL_TOP_POSITION) *
        Runner.config.ARCADE_MODE_TOP_POSITION_PERCENT)) *
        window.devicePixelRatio;

    const cssScale = IS_RTL ? -scale + ',' + scale : scale;
    this.containerEl.style.transform =
        'scale(' + cssScale + ') translateY(' + translateY + 'px)';
  },

  /**
   * Pause the game if the tab is not in focus.
   */
  onVisibilityChange(e) {
    if (document.hidden || document.webkitHidden || e.type === 'blur' ||
        document.visibilityState !== 'visible') {
      this.stop();
    } else if (!this.crashed) {
      this.tRex.reset();
      this.play();
    }
  },

  /**
   * Play a sound.
   * @param {AudioBuffer} soundBuffer
   */
  playSound(soundBuffer) {
    if (soundBuffer) {
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = soundBuffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.start(0);
    }
  },

  /**
   * Inverts the current page / canvas colors.
   * @param {boolean} reset Whether to reset colors.
   */
  invert(reset) {
    const htmlEl = document.firstElementChild;

    if (reset) {
      htmlEl.classList.toggle(Runner.classes.INVERTED,
          false);
      this.invertTimer = 0;
      this.inverted = false;
    } else {
      this.inverted = htmlEl.classList.toggle(
          Runner.classes.INVERTED, this.invertTrigger);
    }
  }
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
 * @param {number=} opt_width
 * @param {number=} opt_height
 * @return {boolean} Whether the canvas was scaled.
 */
Runner.updateCanvasScaling = function(canvas, opt_width, opt_height) {
  const context =
      /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  // Query the various pixel ratios
  const devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
  /** @suppress {missingProperties} */
  const backingStoreRatio =
      Math.floor(context.webkitBackingStorePixelRatio) || 1;
  const ratio = devicePixelRatio / backingStoreRatio;

  // Upscale the canvas if the two ratios don't match
  if (devicePixelRatio !== backingStoreRatio) {
    const oldWidth = opt_width || canvas.width;
    const oldHeight = opt_height || canvas.height;

    canvas.width = oldWidth * ratio;
    canvas.height = oldHeight * ratio;

    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';

    // Scale the context to counter the fact that we've manually scaled
    // our canvas element.
    context.scale(ratio, ratio);
    return true;
  } else if (devicePixelRatio === 1) {
    // Reset the canvas width / height. Fixes scaling bug when the page is
    // zoomed and the devicePixelRatio changes accordingly.
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
  }
  return false;
};


/**
 * Whether events are enabled.
 * @return {boolean}
 */
Runner.isAltGameModeEnabled = function() {
  return loadTimeData && loadTimeData.valueExists('enableAltGameMode');
};


/**
 * Generated sound FX class for audio cues.
 * @constructor
 */
function GeneratedSoundFx() {
  this.audioCues = false;
  this.context = null;
  this.panner = null;
}

GeneratedSoundFx.prototype = {
  init() {
    this.audioCues = true;
    if (!this.context) {
      // iOS only supports the webkit version.
      this.context = window.webkitAudioContext ? new webkitAudioContext() :
                                                 new AudioContext();
      if (IS_IOS) {
        this.context.onstatechange = (function() {
                                       if (this.context.state != 'running') {
                                         this.context.resume();
                                       }
                                     }).bind(this);
        this.context.resume();
      }
      this.panner = this.context.createStereoPanner ?
          this.context.createStereoPanner() :
          null;
    }
  },

  stopAll() {
    this.cancelFootSteps();
  },

  /**
   * Play oscillators at certain frequency and for a certain time.
   * @param {number} frequency
   * @param {number} startTime
   * @param {number} duration
   * @param {?number=} opt_vol
   * @param {number=} opt_pan
   */
  playNote(frequency, startTime, duration, opt_vol, opt_pan) {
    const osc1 = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const volume = this.context.createGain();

    // Set oscillator wave type
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    volume.gain.value = 0.1;

    // Set up node routing
    if (this.panner) {
      this.panner.pan.value = opt_pan || 0;
      osc1.connect(volume).connect(this.panner);
      osc2.connect(volume).connect(this.panner);
      this.panner.connect(this.context.destination);
    } else {
      osc1.connect(volume);
      osc2.connect(volume);
      volume.connect(this.context.destination);
    }

    // Detune oscillators for chorus effect
    osc1.frequency.value = frequency + 1;
    osc2.frequency.value = frequency - 2;

    // Fade out
    volume.gain.setValueAtTime(opt_vol || 0.01, startTime + duration - 0.05);
    volume.gain.linearRampToValueAtTime(0.00001, startTime + duration);

    // Start oscillators
    osc1.start(startTime);
    osc2.start(startTime);
    // Stop oscillators
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  },

  background() {
    if (this.audioCues) {
      const now = this.context.currentTime;
      this.playNote(493.883, now, 0.116);
      this.playNote(659.255, now + 0.116, 0.232);
      this.loopFootSteps();
    }
  },

  loopFootSteps() {
    if (this.audioCues && !this.bgSoundIntervalId) {
      this.bgSoundIntervalId = setInterval(function() {
        this.playNote(73.42, this.context.currentTime, 0.05, 0.16);
        this.playNote(69.30, this.context.currentTime + 0.116, 0.116, 0.16);
      }.bind(this), 280);
    }
  },

  cancelFootSteps() {
    if (this.audioCues && this.bgSoundIntervalId) {
      clearInterval(this.bgSoundIntervalId);
      this.bgSoundIntervalId = null;
      this.playNote(103.83, this.context.currentTime, 0.232, 0.02);
      this.playNote(116.54, this.context.currentTime + 0.116, 0.232, 0.02);
    }
  },

  collect() {
    if (this.audioCues) {
      this.cancelFootSteps();
      const now = this.context.currentTime;
      this.playNote(830.61, now, 0.116);
      this.playNote(1318.51, now + 0.116, 0.232);
    }
  },

  jump() {
    if (this.audioCues) {
      const now = this.context.currentTime;
      this.playNote(659.25, now, 0.116, null, -0.6);
      this.playNote(880, now + 0.116, 0.232, null, -0.6);
    }
  },
};


/**
 * Speak a phrase using Speech Synthesis API for a11y.
 * @param {string} phrase Sentence to speak.
 */
function speakPhrase(phrase) {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(phrase);
    const voices = window.speechSynthesis.getVoices();
    msg.text = phrase;
    speechSynthesis.speak(msg);
  }
}


/**
 * For screen readers make an announcement to the live region.
 * @param {string} phrase Sentence to speak.
 */
function announcePhrase(phrase) {
  if (Runner.a11yStatusEl) {
    Runner.a11yStatusEl.textContent = '';
    Runner.a11yStatusEl.textContent = phrase;
  }
}


/**
 * Returns a string from loadTimeData data object.
 * @param {string} stringName
 * @return {string}
 */
function getA11yString(stringName) {
  return loadTimeData && loadTimeData.valueExists(stringName) ?
      loadTimeData.getString(stringName) :
      '';
}


/**
 * Get random number.
 * @param {number} min
 * @param {number} max
 */
function getRandomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Vibrate on mobile devices.
 * @param {number} duration Duration of the vibration in milliseconds.
 */
function vibrate(duration) {
  if (IS_MOBILE && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
  }
}


/**
 * Create canvas element.
 * @param {Element} container Element to append canvas to.
 * @param {number} width
 * @param {number} height
 * @param {string=} opt_classname
 * @return {HTMLCanvasElement}
 */
function createCanvas(container, width, height, opt_classname) {
  const canvas =
      /** @type {!HTMLCanvasElement} */ (document.createElement('canvas'));
  canvas.className = opt_classname ? Runner.classes.CANVAS + ' ' +
      opt_classname : Runner.classes.CANVAS;
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);

  return canvas;
}


/**
 * Decodes the base 64 audio to ArrayBuffer used by Web Audio.
 * @param {string} base64String
 */
function decodeBase64ToArrayBuffer(base64String) {
  const len = (base64String.length / 4) * 3;
  const str = atob(base64String);
  const arrayBuffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(arrayBuffer);

  for (let i = 0; i < len; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}


/**
 * Return the current timestamp.
 * @return {number}
 */
function getTimeStamp() {
  return IS_IOS ? new Date().getTime() : performance.now();
}


//******************************************************************************


/**
 * Game over panel.
 * @param {!HTMLCanvasElement} canvas
 * @param {Object} textImgPos
 * @param {Object} restartImgPos
 * @param {!Object} dimensions Canvas dimensions.
 * @param {Object=} opt_altGameEndImgPos
 * @param {boolean=} opt_altGameActive
 * @constructor
 */
function GameOverPanel(
    canvas, textImgPos, restartImgPos, dimensions, opt_altGameEndImgPos,
    opt_altGameActive) {
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  this.canvasDimensions = dimensions;
  this.textImgPos = textImgPos;
  this.restartImgPos = restartImgPos;
  this.altGameEndImgPos = opt_altGameEndImgPos;
  this.altGameModeActive = opt_altGameActive;

  // Retry animation.
  this.frameTimeStamp = 0;
  this.animTimer = 0;
  this.currentFrame = 0;

  this.gameOverRafId = null;

  this.flashTimer = 0;
  this.flashCounter = 0;
  this.originalText = true;
}

GameOverPanel.RESTART_ANIM_DURATION = 875;
GameOverPanel.LOGO_PAUSE_DURATION = 875;
GameOverPanel.FLASH_ITERATIONS = 5;

/**
 * Animation frames spec.
 */
GameOverPanel.animConfig = {
  frames: [0, 36, 72, 108, 144, 180, 216, 252],
  msPerFrame: GameOverPanel.RESTART_ANIM_DURATION / 8
};

/**
 * Dimensions used in the panel.
 * @enum {number}
 */
GameOverPanel.dimensions = {
  TEXT_X: 0,
  TEXT_Y: 13,
  TEXT_WIDTH: 191,
  TEXT_HEIGHT: 11,
  RESTART_WIDTH: 36,
  RESTART_HEIGHT: 32
};


GameOverPanel.prototype = {
  /**
   * Update the panel dimensions.
   * @param {number} width New canvas width.
   * @param {number} opt_height Optional new canvas height.
   */
  updateDimensions(width, opt_height) {
    this.canvasDimensions.WIDTH = width;
    if (opt_height) {
      this.canvasDimensions.HEIGHT = opt_height;
    }
    this.currentFrame = GameOverPanel.animConfig.frames.length - 1;
  },

  drawGameOverText(dimensions, opt_useAltText) {
    const centerX = this.canvasDimensions.WIDTH / 2;
    let textSourceX = dimensions.TEXT_X;
    let textSourceY = dimensions.TEXT_Y;
    let textSourceWidth = dimensions.TEXT_WIDTH;
    let textSourceHeight = dimensions.TEXT_HEIGHT;

    const textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
    const textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
    const textTargetWidth = dimensions.TEXT_WIDTH;
    const textTargetHeight = dimensions.TEXT_HEIGHT;

    if (IS_HIDPI) {
      textSourceY *= 2;
      textSourceX *= 2;
      textSourceWidth *= 2;
      textSourceHeight *= 2;
    }

    if (!opt_useAltText) {
      textSourceX += this.textImgPos.x;
      textSourceY += this.textImgPos.y;
    }

    const spriteSource =
        opt_useAltText ? Runner.altCommonImageSprite : Runner.origImageSprite;

    this.canvasCtx.save();

    if (IS_RTL) {
      this.canvasCtx.translate(this.canvas.width / 2, 0);
      this.canvasCtx.scale(-1, 1);
    }

    // Game over text from sprite.
    this.canvasCtx.drawImage(
        spriteSource, textSourceX, textSourceY, textSourceWidth,
        textSourceHeight, textTargetX, textTargetY, textTargetWidth,
        textTargetHeight);

    this.canvasCtx.restore();
  },

  /**
   * Draw additional adornments for alternative game types.
   */
  drawAltGameElements(tRex) {
    // Additional adornments.
    if (this.altGameModeActive) {
      const altGameEndConfig = Runner.spriteDefinition.ALT_GAME_END_CONFIG;

      let altGameEndSourceWidth = altGameEndConfig.WIDTH;
      let altGameEndSourceHeight = altGameEndConfig.HEIGHT;
      const altGameEndTargetX = tRex.xPos + altGameEndConfig.X_OFFSET;
      const altGameEndTargetY = tRex.yPos + altGameEndConfig.Y_OFFSET;

      if (IS_HIDPI) {
        altGameEndSourceWidth *= 2;
        altGameEndSourceHeight *= 2;
      }

      this.canvasCtx.drawImage(
          Runner.altCommonImageSprite, this.altGameEndImgPos.x,
          this.altGameEndImgPos.y, altGameEndSourceWidth,
          altGameEndSourceHeight, altGameEndTargetX, altGameEndTargetY,
          altGameEndConfig.WIDTH, altGameEndConfig.HEIGHT);
    }
  },

  /**
   * Draw restart button.
   */
  drawRestartButton() {
    const dimensions = GameOverPanel.dimensions;
    let framePosX = GameOverPanel.animConfig.frames[this.currentFrame];
    let restartSourceWidth = dimensions.RESTART_WIDTH;
    let restartSourceHeight = dimensions.RESTART_HEIGHT;
    const restartTargetX =
        (this.canvasDimensions.WIDTH / 2) - (dimensions.RESTART_WIDTH / 2);
    const restartTargetY = this.canvasDimensions.HEIGHT / 2;

    if (IS_HIDPI) {
      restartSourceWidth *= 2;
      restartSourceHeight *= 2;
      framePosX *= 2;
    }

    this.canvasCtx.save();

    if (IS_RTL) {
      this.canvasCtx.translate(this.canvas.width / 2, 0);
      this.canvasCtx.scale(-1, 1);
    }

    this.canvasCtx.drawImage(
        Runner.origImageSprite, this.restartImgPos.x + framePosX,
        this.restartImgPos.y, restartSourceWidth, restartSourceHeight,
        restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
        dimensions.RESTART_HEIGHT);
    this.canvasCtx.restore();
  },


  /**
   * Draw the panel.
   * @param {boolean} opt_altGameModeActive
   * @param {!Trex} opt_tRex
   */
  draw(opt_altGameModeActive, opt_tRex) {
    if (opt_altGameModeActive) {
      this.altGameModeActive = opt_altGameModeActive;
    }

    this.drawGameOverText(GameOverPanel.dimensions, false);
    this.drawRestartButton();
    this.drawAltGameElements(opt_tRex);
    this.update();
  },

  /**
   * Update animation frames.
   */
  update() {
    const now = getTimeStamp();
    const deltaTime = now - (this.frameTimeStamp || now);
    const altTextConfig =
        Runner.spriteDefinitionByType.original.ALT_GAME_OVER_TEXT_CONFIG;

    this.frameTimeStamp = now;
    this.animTimer += deltaTime;
    this.flashTimer += deltaTime;

    // Restart Button
    if (this.currentFrame == 0 &&
        this.animTimer > GameOverPanel.LOGO_PAUSE_DURATION) {
      this.animTimer = 0;
      this.currentFrame++;
      this.drawRestartButton();
    } else if (
        this.currentFrame > 0 &&
        this.currentFrame < GameOverPanel.animConfig.frames.length) {
      if (this.animTimer >= GameOverPanel.animConfig.msPerFrame) {
        this.currentFrame++;
        this.drawRestartButton();
      }
    } else if (
        !this.altGameModeActive &&
        this.currentFrame == GameOverPanel.animConfig.frames.length) {
      this.reset();
      return;
    }

    // Game over text
    if (this.altGameModeActive) {
      if (this.flashCounter < GameOverPanel.FLASH_ITERATIONS &&
          this.flashTimer > altTextConfig.FLASH_DURATION) {
        this.flashTimer = 0;
        this.originalText = !this.originalText;

        this.clearGameOverTextBounds();
        if (this.originalText) {
          this.drawGameOverText(GameOverPanel.dimensions, false);
          this.flashCounter++;
        } else {
          this.drawGameOverText(altTextConfig, true);
        }
      } else if (this.flashCounter >= GameOverPanel.FLASH_ITERATIONS) {
        this.reset();
        return;
      }
    }

    this.gameOverRafId = requestAnimationFrame(this.update.bind(this));
  },

  /**
   * Clear game over text.
   */
  clearGameOverTextBounds() {
    this.canvasCtx.save();

    this.canvasCtx.clearRect(
        Math.round(
            this.canvasDimensions.WIDTH / 2 -
            (GameOverPanel.dimensions.TEXT_WIDTH / 2)),
        Math.round((this.canvasDimensions.HEIGHT - 25) / 3),
        GameOverPanel.dimensions.TEXT_WIDTH,
        GameOverPanel.dimensions.TEXT_HEIGHT + 4);
    this.canvasCtx.restore();
  },

  reset() {
    if (this.gameOverRafId) {
      cancelAnimationFrame(this.gameOverRafId);
      this.gameOverRafId = null;
    }
    this.animTimer = 0;
    this.frameTimeStamp = 0;
    this.currentFrame = 0;
    this.flashTimer = 0;
    this.flashCounter = 0;
    this.originalText = true;
  }
};


//******************************************************************************

/**
 * Check for a collision.
 * @param {!Obstacle} obstacle
 * @param {!Trex} tRex T-rex object.
 * @param {CanvasRenderingContext2D=} opt_canvasCtx Optional canvas context for
 *    drawing collision boxes.
 * @return {Array<CollisionBox>|undefined}
 */
function checkForCollision(obstacle, tRex, opt_canvasCtx) {
  const obstacleBoxXPos = Runner.defaultDimensions.WIDTH + obstacle.xPos;

  // Adjustments are made to the bounding box as there is a 1 pixel white
  // border around the t-rex and obstacles.
  const tRexBox = new CollisionBox(
      tRex.xPos + 1,
      tRex.yPos + 1,
      tRex.config.WIDTH - 2,
      tRex.config.HEIGHT - 2);

  const obstacleBox = new CollisionBox(
      obstacle.xPos + 1,
      obstacle.yPos + 1,
      obstacle.typeConfig.width * obstacle.size - 2,
      obstacle.typeConfig.height - 2);

  // Debug outer box
  if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
  }

  // Simple outer bounds check.
  if (boxCompare(tRexBox, obstacleBox)) {
    const collisionBoxes = obstacle.collisionBoxes;
    let tRexCollisionBoxes = [];

    if (Runner.isAltGameModeEnabled()) {
      tRexCollisionBoxes = Runner.spriteDefinition.TREX.COLLISION_BOXES;
    } else {
      tRexCollisionBoxes = tRex.ducking ? Trex.collisionBoxes.DUCKING :
                                          Trex.collisionBoxes.RUNNING;
    }

    // Detailed axis aligned box check.
    for (let t = 0; t < tRexCollisionBoxes.length; t++) {
      for (let i = 0; i < collisionBoxes.length; i++) {
        // Adjust the box to actual positions.
        const adjTrexBox =
            createAdjustedCollisionBox(tRexCollisionBoxes[t], tRexBox);
        const adjObstacleBox =
            createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
        const crashed = boxCompare(adjTrexBox, adjObstacleBox);

        // Draw boxes for debug.
        if (opt_canvasCtx) {
          drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
        }

        if (crashed) {
          return [adjTrexBox, adjObstacleBox];
        }
      }
    }
  }
}


/**
 * Adjust the collision box.
 * @param {!CollisionBox} box The original box.
 * @param {!CollisionBox} adjustment Adjustment box.
 * @return {CollisionBox} The adjusted collision box object.
 */
function createAdjustedCollisionBox(box, adjustment) {
  return new CollisionBox(
      box.x + adjustment.x,
      box.y + adjustment.y,
      box.width,
      box.height);
}


/**
 * Draw the collision boxes for debug.
 */
function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
  canvasCtx.save();
  canvasCtx.strokeStyle = '#f00';
  canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

  canvasCtx.strokeStyle = '#0f0';
  canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
      obstacleBox.width, obstacleBox.height);
  canvasCtx.restore();
}


/**
 * Compare two collision boxes for a collision.
 * @param {CollisionBox} tRexBox
 * @param {CollisionBox} obstacleBox
 * @return {boolean} Whether the boxes intersected.
 */
function boxCompare(tRexBox, obstacleBox) {
  let crashed = false;
  const tRexBoxX = tRexBox.x;
  const tRexBoxY = tRexBox.y;

  const obstacleBoxX = obstacleBox.x;
  const obstacleBoxY = obstacleBox.y;

  // Axis-Aligned Bounding Box method.
  if (tRexBox.x < obstacleBoxX + obstacleBox.width &&
      tRexBox.x + tRexBox.width > obstacleBoxX &&
      tRexBox.y < obstacleBox.y + obstacleBox.height &&
      tRexBox.height + tRexBox.y > obstacleBox.y) {
    crashed = true;
  }

  return crashed;
}


//******************************************************************************

/**
 * Collision box object.
 * @param {number} x X position.
 * @param {number} y Y Position.
 * @param {number} w Width.
 * @param {number} h Height.
 * @constructor
 */
function CollisionBox(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.width = w;
  this.height = h;
}


//******************************************************************************

/**
 * Obstacle.
 * @param {CanvasRenderingContext2D} canvasCtx
 * @param {ObstacleType} type
 * @param {Object} spriteImgPos Obstacle position in sprite.
 * @param {Object} dimensions
 * @param {number} gapCoefficient Mutipler in determining the gap.
 * @param {number} speed
 * @param {number=} opt_xOffset
 * @param {boolean=} opt_isAltGameMode
 * @constructor
 */
function Obstacle(
    canvasCtx, type, spriteImgPos, dimensions, gapCoefficient, speed,
    opt_xOffset, opt_isAltGameMode) {
  this.canvasCtx = canvasCtx;
  this.spritePos = spriteImgPos;
  this.typeConfig = type;
  this.gapCoefficient = gapCoefficient;
  this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
  this.dimensions = dimensions;
  this.remove = false;
  this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
  this.yPos = 0;
  this.width = 0;
  this.collisionBoxes = [];
  this.gap = 0;
  this.speedOffset = 0;
  this.altGameModeActive = opt_isAltGameMode;
  this.imageSprite = this.typeConfig.type == 'COLLECTABLE' ?
      Runner.altCommonImageSprite :
      this.altGameModeActive ? Runner.altGameImageSprite : Runner.imageSprite;

  // For animated obstacles.
  this.currentFrame = 0;
  this.timer = 0;

  this.init(speed);
}

/**
 * Coefficient for calculating the maximum gap.
 */
Obstacle.MAX_GAP_COEFFICIENT = 1.5;

/**
 * Maximum obstacle grouping count.
 */
Obstacle.MAX_OBSTACLE_LENGTH = 3;


Obstacle.prototype = {
  /**
   * Initialise the DOM for the obstacle.
   * @param {number} speed
   */
  init(speed) {
    this.cloneCollisionBoxes();

    // Only allow sizing if we're at the right speed.
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
      this.size = 1;
    }

    this.width = this.typeConfig.width * this.size;

    // Check if obstacle can be positioned at various heights.
    if (Array.isArray(this.typeConfig.yPos)) {
      const yPosConfig =
          IS_MOBILE ? this.typeConfig.yPosMobile : this.typeConfig.yPos;
      this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
    } else {
      this.yPos = this.typeConfig.yPos;
    }

    this.draw();

    // Make collision box adjustments,
    // Central box is adjusted to the size as one box.
    //      ____        ______        ________
    //    _|   |-|    _|     |-|    _|       |-|
    //   | |<->| |   | |<--->| |   | |<----->| |
    //   | | 1 | |   | |  2  | |   | |   3   | |
    //   |_|___|_|   |_|_____|_|   |_|_______|_|
    //
    if (this.size > 1) {
      this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
          this.collisionBoxes[2].width;
      this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
    }

    // For obstacles that go at a different speed from the horizon.
    if (this.typeConfig.speedOffset) {
      this.speedOffset = Math.random() > 0.5 ? this.typeConfig.speedOffset :
                                               -this.typeConfig.speedOffset;
    }

    this.gap = this.getGap(this.gapCoefficient, speed);

    // Increase gap for audio cues enabled.
    if (Runner.audioCues) {
      this.gap *= 2;
    }
  },

  /**
   * Draw and crop based on size.
   */
  draw() {
    let sourceWidth = this.typeConfig.width;
    let sourceHeight = this.typeConfig.height;

    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2;
      sourceHeight = sourceHeight * 2;
    }

    // X position in sprite.
    let sourceX =
        (sourceWidth * this.size) * (0.5 * (this.size - 1)) + this.spritePos.x;

    // Animation frames.
    if (this.currentFrame > 0) {
      sourceX += sourceWidth * this.currentFrame;
    }

    this.canvasCtx.drawImage(
        this.imageSprite, sourceX, this.spritePos.y, sourceWidth * this.size,
        sourceHeight, this.xPos, this.yPos, this.typeConfig.width * this.size,
        this.typeConfig.height);
  },

  /**
   * Obstacle frame update.
   * @param {number} deltaTime
   * @param {number} speed
   */
  update(deltaTime, speed) {
    if (!this.remove) {
      if (this.typeConfig.speedOffset) {
        speed += this.speedOffset;
      }
      this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime);

      // Update frame
      if (this.typeConfig.numFrames) {
        this.timer += deltaTime;
        if (this.timer >= this.typeConfig.frameRate) {
          this.currentFrame =
              this.currentFrame === this.typeConfig.numFrames - 1 ?
              0 :
              this.currentFrame + 1;
          this.timer = 0;
        }
      }
      this.draw();

      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  },

  /**
   * Calculate a random gap size.
   * - Minimum gap gets wider as speed increses
   * @param {number} gapCoefficient
   * @param {number} speed
   * @return {number} The gap size.
   */
  getGap(gapCoefficient, speed) {
    const minGap = Math.round(
        this.width * speed + this.typeConfig.minGap * gapCoefficient);
    const maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
    return getRandomNum(minGap, maxGap);
  },

  /**
   * Check if obstacle is visible.
   * @return {boolean} Whether the obstacle is in the game area.
   */
  isVisible() {
    return this.xPos + this.width > 0;
  },

  /**
   * Make a copy of the collision boxes, since these will change based on
   * obstacle type and size.
   */
  cloneCollisionBoxes() {
    const collisionBoxes = this.typeConfig.collisionBoxes;

    for (let i = collisionBoxes.length - 1; i >= 0; i--) {
      this.collisionBoxes[i] = new CollisionBox(
          collisionBoxes[i].x, collisionBoxes[i].y, collisionBoxes[i].width,
          collisionBoxes[i].height);
    }
  }
};


//******************************************************************************
/**
 * T-rex game character.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} spritePos Positioning within image sprite.
 * @constructor
 */
function Trex(canvas, spritePos) {
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  this.spritePos = spritePos;
  this.xPos = 0;
  this.yPos = 0;
  this.xInitialPos = 0;
  // Position when on the ground.
  this.groundYPos = 0;
  this.currentFrame = 0;
  this.currentAnimFrames = [];
  this.blinkDelay = 0;
  this.blinkCount = 0;
  this.animStartTime = 0;
  this.timer = 0;
  this.msPerFrame = 1000 / FPS;
  this.config = Trex.config;
  // Current status.
  this.status = Trex.status.WAITING;
  this.jumping = false;
  this.ducking = false;
  this.jumpVelocity = 0;
  this.reachedMinHeight = false;
  this.speedDrop = false;
  this.jumpCount = 0;
  this.jumpspotX = 0;
  this.altGameModeEnabled = false;
  this.flashing = false;

  this.init();
}


/**
 * T-rex player config.
 */
Trex.config = {
  DROP_VELOCITY: -5,
  FLASH_OFF: 175,
  FLASH_ON: 100,
  GRAVITY: 0.6,
  HEIGHT: 47,
  HEIGHT_DUCK: 25,
  INITIAL_JUMP_VELOCITY: -10,
  INTRO_DURATION: 1500,
  MAX_JUMP_HEIGHT: 30,
  MIN_JUMP_HEIGHT: 30,
  SPEED_DROP_COEFFICIENT: 3,
  SPRITE_WIDTH: 262,
  START_X_POS: 50,
  WIDTH: 44,
  WIDTH_DUCK: 59
};


/**
 * Used in collision detection.
 * @enum {Array<CollisionBox>}
 */
Trex.collisionBoxes = {
  DUCKING: [
    new CollisionBox(1, 18, 55, 25)
  ],
  RUNNING: [
    new CollisionBox(22, 0, 17, 16),
    new CollisionBox(1, 18, 30, 9),
    new CollisionBox(10, 35, 14, 8),
    new CollisionBox(1, 24, 29, 5),
    new CollisionBox(5, 30, 21, 4),
    new CollisionBox(9, 34, 15, 4)
  ]
};


/**
 * Animation states.
 * @enum {string}
 */
Trex.status = {
  CRASHED: 'CRASHED',
  DUCKING: 'DUCKING',
  JUMPING: 'JUMPING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING'
};

/**
 * Blinking coefficient.
 * @const
 */
Trex.BLINK_TIMING = 7000;


/**
 * Animation config for different states.
 * @enum {Object}
 */
Trex.animFrames = {
  WAITING: {
    frames: [44, 0],
    msPerFrame: 1000 / 3
  },
  RUNNING: {
    frames: [88, 132],
    msPerFrame: 1000 / 12
  },
  CRASHED: {
    frames: [220],
    msPerFrame: 1000 / 60
  },
  JUMPING: {
    frames: [0],
    msPerFrame: 1000 / 60
  },
  DUCKING: {
    frames: [264, 323],
    msPerFrame: 1000 / 8
  }
};


Trex.prototype = {
  /**
   * T-rex player initaliser.
   * Sets the t-rex to blink at random intervals.
   */
  init() {
    this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
        Runner.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;

    this.draw(0, 0);
    this.update(0, Trex.status.WAITING);
  },


  /**
   * Enables the alternative game. Redefines the dino config.
   * @param {Object} spritePos New positioning within image sprite.
   */
  enableAltGameMode: function(spritePos) {
    this.altGameModeEnabled = true;
    this.spritePos = spritePos;
    const spriteDefinition = Runner.spriteDefinition['TREX'];

    // Update animation frames.
    Trex.animFrames.RUNNING.frames =
        [spriteDefinition.RUNNING_1.x, spriteDefinition.RUNNING_2.x];
    Trex.animFrames.CRASHED.frames = [spriteDefinition.CRASHED.x];

    if (typeof spriteDefinition.JUMPING.x == 'object') {
      Trex.animFrames.JUMPING.frames = spriteDefinition.JUMPING.x;
    } else {
      Trex.animFrames.JUMPING.frames = [spriteDefinition.JUMPING.x];
    }

    Trex.animFrames.DUCKING.frames =
        [spriteDefinition.RUNNING_1.x, spriteDefinition.RUNNING_2.x];

    // Update Trex config
    Trex.config.GRAVITY = spriteDefinition.GRAVITY || Trex.config.GRAVITY;
    Trex.config.HEIGHT = spriteDefinition.RUNNING_1.h,
    Trex.config.INITIAL_JUMP_VELOCITY = spriteDefinition.INITIAL_JUMP_VELOCITY;
    Trex.config.MAX_JUMP_HEIGHT = spriteDefinition.MAX_JUMP_HEIGHT;
    Trex.config.MIN_JUMP_HEIGHT = spriteDefinition.MIN_JUMP_HEIGHT;
    Trex.config.WIDTH = spriteDefinition.RUNNING_1.w;
    Trex.config.WIDTH_JUMP = spriteDefinition.JUMPING.w;
    Trex.config.INVERT_JUMP = spriteDefinition.INVERT_JUMP;

    this.config = Trex.config;

    // Adjust bottom horizon placement.
    this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
        Runner.spriteDefinition['BOTTOM_PAD'];
    this.yPos = this.groundYPos;
    this.reset();
  },

  /**
   * Setter whether dino is flashing.
   * @param {boolean} status
   */
  setFlashing: function(status) {
    this.flashing = status;
  },

  /**
   * Setter for the jump velocity.
   * The approriate drop velocity is also set.
   * @param {number} setting
   */
  setJumpVelocity(setting) {
    this.config.INIITAL_JUMP_VELOCITY = -setting;
    this.config.DROP_VELOCITY = -setting / 2;
  },

  /**
   * Set the animation status.
   * @param {!number} deltaTime
   * @param {Trex.status=} opt_status Optional status to switch to.
   */
  update(deltaTime, opt_status) {
    this.timer += deltaTime;

    // Update the status.
    if (opt_status) {
      this.status = opt_status;
      this.currentFrame = 0;
      this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;
      this.currentAnimFrames = Trex.animFrames[opt_status].frames;

      if (opt_status === Trex.status.WAITING) {
        this.animStartTime = getTimeStamp();
        this.setBlinkDelay();
      }
    }
    // Game intro animation, T-rex moves in from the left.
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
      this.xPos += Math.round((this.config.START_X_POS /
          this.config.INTRO_DURATION) * deltaTime);
      this.xInitialPos = this.xPos;
    }

    if (this.status === Trex.status.WAITING) {
      this.blink(getTimeStamp());
    } else {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }

    // Update the frame position.
    if (!this.flashing && this.timer >= this.msPerFrame) {
      this.currentFrame = this.currentFrame ==
          this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
      this.timer = 0;
    }

    if (!this.altGameModeEnabled) {
      // Speed drop becomes duck if the down key is still being pressed.
      if (this.speedDrop && this.yPos === this.groundYPos) {
        this.speedDrop = false;
        this.setDuck(true);
      }
    }
  },

  /**
   * Draw the t-rex to a particular position.
   * @param {number} x
   * @param {number} y
   */
  draw(x, y) {
    let sourceX = x;
    let sourceY = y;
    let sourceWidth = this.ducking && this.status !== Trex.status.CRASHED ?
        this.config.WIDTH_DUCK :
        this.config.WIDTH;
    let sourceHeight = this.config.HEIGHT;
    const outputHeight = sourceHeight;

    let jumpOffset = Runner.spriteDefinition.TREX.JUMPING.xOffset;

    // Width of sprite changes on jump.
    if (this.altGameModeEnabled && this.jumping &&
        this.status !== Trex.status.CRASHED) {
      sourceWidth = this.config.WIDTH_JUMP;
    }

    if (IS_HIDPI) {
      sourceX *= 2;
      sourceY *= 2;
      sourceWidth *= 2;
      sourceHeight *= 2;
      jumpOffset *= 2;
    }

    // Adjustments for sprite sheet position.
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    // Flashing.
    if (this.flashing) {
      if (this.timer < this.config.FLASH_ON) {
        this.canvasCtx.globalAlpha = 0.5;
      } else if (this.timer > this.config.FLASH_OFF) {
        this.timer = 0;
      }
    }

    // Ducking.
    if (!this.altGameModeEnabled && this.ducking &&
        this.status !== Trex.status.CRASHED) {
      this.canvasCtx.drawImage(Runner.imageSprite, sourceX, sourceY,
          sourceWidth, sourceHeight,
          this.xPos, this.yPos,
          this.config.WIDTH_DUCK, outputHeight);
    } else if (
        this.altGameModeEnabled && this.jumping &&
        this.status !== Trex.status.CRASHED) {
      // Jumping with adjustments.
      this.canvasCtx.drawImage(
          Runner.imageSprite, sourceX, sourceY, sourceWidth, sourceHeight,
          this.xPos - jumpOffset, this.yPos, this.config.WIDTH_JUMP,
          outputHeight);
    } else {
      // Crashed whilst ducking. Trex is standing up so needs adjustment.
      if (this.ducking && this.status === Trex.status.CRASHED) {
        this.xPos++;
      }
      // Standing / running
      this.canvasCtx.drawImage(Runner.imageSprite, sourceX, sourceY,
          sourceWidth, sourceHeight,
          this.xPos, this.yPos,
          this.config.WIDTH, outputHeight);
    }
    this.canvasCtx.globalAlpha = 1;
  },

  /**
   * Sets a random time for the blink to happen.
   */
  setBlinkDelay() {
    this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING);
  },

  /**
   * Make t-rex blink at random intervals.
   * @param {number} time Current time in milliseconds.
   */
  blink(time) {
    const deltaTime = time - this.animStartTime;

    if (deltaTime >= this.blinkDelay) {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);

      if (this.currentFrame === 1) {
        // Set new random delay to blink.
        this.setBlinkDelay();
        this.animStartTime = time;
        this.blinkCount++;
      }
    }
  },

  /**
   * Initialise a jump.
   * @param {number} speed
   */
  startJump(speed) {
    if (!this.jumping) {
      this.update(0, Trex.status.JUMPING);
      // Tweak the jump velocity based on the speed.
      this.jumpVelocity = this.config.INITIAL_JUMP_VELOCITY - (speed / 10);
      this.jumping = true;
      this.reachedMinHeight = false;
      this.speedDrop = false;

      if (this.config.INVERT_JUMP) {
        this.minJumpHeight = this.groundYPos + this.config.MIN_JUMP_HEIGHT;
      }
    }
  },

  /**
   * Jump is complete, falling down.
   */
  endJump() {
    if (this.reachedMinHeight &&
        this.jumpVelocity < this.config.DROP_VELOCITY) {
      this.jumpVelocity = this.config.DROP_VELOCITY;
    }
  },

  /**
   * Update frame for a jump.
   * @param {number} deltaTime
   */
  updateJump(deltaTime) {
    const msPerFrame = Trex.animFrames[this.status].msPerFrame;
    const framesElapsed = deltaTime / msPerFrame;

    // Speed drop makes Trex fall faster.
    if (this.speedDrop) {
      this.yPos += Math.round(this.jumpVelocity *
          this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
    } else if (this.config.INVERT_JUMP) {
      this.yPos -= Math.round(this.jumpVelocity * framesElapsed);
    } else {
      this.yPos += Math.round(this.jumpVelocity * framesElapsed);
    }

    this.jumpVelocity += this.config.GRAVITY * framesElapsed;

    // Minimum height has been reached.
    if (this.config.INVERT_JUMP && (this.yPos > this.minJumpHeight) ||
        !this.config.INVERT_JUMP && (this.yPos < this.minJumpHeight) ||
        this.speedDrop) {
      this.reachedMinHeight = true;
    }

    // Reached max height.
    if (this.config.INVERT_JUMP && (this.yPos > -this.config.MAX_JUMP_HEIGHT) ||
        !this.config.INVERT_JUMP && (this.yPos < this.config.MAX_JUMP_HEIGHT) ||
        this.speedDrop) {
      this.endJump();
    }

    // Back down at ground level. Jump completed.
    if ((this.config.INVERT_JUMP && this.yPos) < this.groundYPos ||
        (!this.config.INVERT_JUMP && this.yPos) > this.groundYPos) {
      this.reset();
      this.jumpCount++;

      if (Runner.audioCues) {
        Runner.generatedSoundFx.loopFootSteps();
      }
    }
  },

  /**
   * Set the speed drop. Immediately cancels the current jump.
   */
  setSpeedDrop() {
    this.speedDrop = true;
    this.jumpVelocity = 1;
  },

  /**
   * @param {boolean} isDucking
   */
  setDuck(isDucking) {
    if (isDucking && this.status !== Trex.status.DUCKING) {
      this.update(0, Trex.status.DUCKING);
      this.ducking = true;
    } else if (this.status === Trex.status.DUCKING) {
      this.update(0, Trex.status.RUNNING);
      this.ducking = false;
    }
  },

  /**
   * Reset the t-rex to running at start of game.
   */
  reset() {
    this.xPos = this.xInitialPos;
    this.yPos = this.groundYPos;
    this.jumpVelocity = 0;
    this.jumping = false;
    this.ducking = false;
    this.update(0, Trex.status.RUNNING);
    this.midair = false;
    this.speedDrop = false;
    this.jumpCount = 0;
  }
};


//******************************************************************************

/**
 * Handles displaying the distance meter.
 * @param {!HTMLCanvasElement} canvas
 * @param {Object} spritePos Image position in sprite.
 * @param {number} canvasWidth
 * @constructor
 */
function DistanceMeter(canvas, spritePos, canvasWidth) {
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  this.image = Runner.imageSprite;
  this.spritePos = spritePos;
  this.x = 0;
  this.y = 5;

  this.currentDistance = 0;
  this.maxScore = 0;
  this.highScore = '0';
  this.container = null;

  this.digits = [];
  this.achievement = false;
  this.defaultString = '';
  this.flashTimer = 0;
  this.flashIterations = 0;
  this.invertTrigger = false;
  this.flashingRafId = null;
  this.highScoreBounds = {};
  this.highScoreFlashing = false;

  this.config = DistanceMeter.config;
  this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS;
  this.init(canvasWidth);
}


/**
 * @enum {number}
 */
DistanceMeter.dimensions = {
  WIDTH: 10,
  HEIGHT: 13,
  DEST_WIDTH: 11
};


/**
 * Y positioning of the digits in the sprite sheet.
 * X position is always 0.
 * @type {Array<number>}
 */
DistanceMeter.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];


/**
 * Distance meter config.
 * @enum {number}
 */
DistanceMeter.config = {
  // Number of digits.
  MAX_DISTANCE_UNITS: 5,

  // Distance that causes achievement animation.
  ACHIEVEMENT_DISTANCE: 100,

  // Used for conversion from pixel distance to a scaled unit.
  COEFFICIENT: 0.025,

  // Flash duration in milliseconds.
  FLASH_DURATION: 1000 / 4,

  // Flash iterations for achievement animation.
  FLASH_ITERATIONS: 3,

  // Padding around the high score hit area.
  HIGH_SCORE_HIT_AREA_PADDING: 4
};


DistanceMeter.prototype = {
  /**
   * Initialise the distance meter to '00000'.
   * @param {number} width Canvas width in px.
   */
  init(width) {
    let maxDistanceStr = '';

    this.calcXPos(width);
    this.maxScore = this.maxScoreUnits;
    for (let i = 0; i < this.maxScoreUnits; i++) {
      this.draw(i, 0);
      this.defaultString += '0';
      maxDistanceStr += '9';
    }

    this.maxScore = parseInt(maxDistanceStr, 10);
  },

  /**
   * Calculate the xPos in the canvas.
   * @param {number} canvasWidth
   */
  calcXPos(canvasWidth) {
    this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
        (this.maxScoreUnits + 1));
  },

  /**
   * Draw a digit to canvas.
   * @param {number} digitPos Position of the digit.
   * @param {number} value Digit value 0-9.
   * @param {boolean=} opt_highScore Whether drawing the high score.
   */
  draw(digitPos, value, opt_highScore) {
    let sourceWidth = DistanceMeter.dimensions.WIDTH;
    let sourceHeight = DistanceMeter.dimensions.HEIGHT;
    let sourceX = DistanceMeter.dimensions.WIDTH * value;
    let sourceY = 0;

    const targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
    const targetY = this.y;
    const targetWidth = DistanceMeter.dimensions.WIDTH;
    const targetHeight = DistanceMeter.dimensions.HEIGHT;

    // For high DPI we 2x source values.
    if (IS_HIDPI) {
      sourceWidth *= 2;
      sourceHeight *= 2;
      sourceX *= 2;
    }

    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    this.canvasCtx.save();

    if (IS_RTL) {
      if (opt_highScore) {
        this.canvasCtx.translate(
            (this.canvas.width / 2) -
                (DistanceMeter.dimensions.WIDTH * (this.maxScoreUnits + 3)),
            this.y);
      } else {
        this.canvasCtx.translate(
            this.canvas.width / 2 - DistanceMeter.dimensions.WIDTH, this.y);
      }
      this.canvasCtx.scale(-1, 1);
    } else {
      const highScoreX =
          this.x - (this.maxScoreUnits * 2) * DistanceMeter.dimensions.WIDTH;
      if (opt_highScore) {
        this.canvasCtx.translate(highScoreX, this.y);
      } else {
        this.canvasCtx.translate(this.x, this.y);
      }
    }

    this.canvasCtx.drawImage(this.image, sourceX, sourceY,
        sourceWidth, sourceHeight,
        targetX, targetY,
        targetWidth, targetHeight
      );

    this.canvasCtx.restore();
  },

  /**
   * Covert pixel distance to a 'real' distance.
   * @param {number} distance Pixel distance ran.
   * @return {number} The 'real' distance ran.
   */
  getActualDistance(distance) {
    return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
  },

  /**
   * Update the distance meter.
   * @param {number} distance
   * @param {number} deltaTime
   * @return {boolean} Whether the acheivement sound fx should be played.
   */
  update(deltaTime, distance) {
    let paint = true;
    let playSound = false;

    if (!this.achievement) {
      distance = this.getActualDistance(distance);
      // Score has gone beyond the initial digit count.
      if (distance > this.maxScore && this.maxScoreUnits ==
        this.config.MAX_DISTANCE_UNITS) {
        this.maxScoreUnits++;
        this.maxScore = parseInt(this.maxScore + '9', 10);
      } else {
        this.distance = 0;
      }

      if (distance > 0) {
        // Achievement unlocked.
        if (distance % this.config.ACHIEVEMENT_DISTANCE === 0) {
          // Flash score and play sound.
          this.achievement = true;
          this.flashTimer = 0;
          playSound = true;
        }

        // Create a string representation of the distance with leading 0.
        const distanceStr = (this.defaultString +
            distance).substr(-this.maxScoreUnits);
        this.digits = distanceStr.split('');
      } else {
        this.digits = this.defaultString.split('');
      }
    } else {
      // Control flashing of the score on reaching acheivement.
      if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
        this.flashTimer += deltaTime;

        if (this.flashTimer < this.config.FLASH_DURATION) {
          paint = false;
        } else if (this.flashTimer > this.config.FLASH_DURATION * 2) {
          this.flashTimer = 0;
          this.flashIterations++;
        }
      } else {
        this.achievement = false;
        this.flashIterations = 0;
        this.flashTimer = 0;
      }
    }

    // Draw the digits if not flashing.
    if (paint) {
      for (let i = this.digits.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.digits[i], 10));
      }
    }

    this.drawHighScore();
    return playSound;
  },

  /**
   * Draw the high score.
   */
  drawHighScore() {
    if (parseInt(this.highScore, 10) > 0) {
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = .8;
      for (let i = this.highScore.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.highScore[i], 10), true);
      }
      this.canvasCtx.restore();
    }
  },

  /**
   * Set the highscore as a array string.
   * Position of char in the sprite: H - 10, I - 11.
   * @param {number} distance Distance ran in pixels.
   */
  setHighScore(distance) {
    distance = this.getActualDistance(distance);
    const highScoreStr = (this.defaultString +
        distance).substr(-this.maxScoreUnits);

    this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
  },


  /**
   * Whether a clicked is in the high score area.
   * @param {Event} e Event object.
   * @return {boolean} Whether the click was in the high score bounds.
   */
  hasClickedOnHighScore(e) {
    let x = 0;
    let y = 0;

    if (e.touches) {
      // Bounds for touch differ from pointer.
      const canvasBounds = this.canvas.getBoundingClientRect();
      x = e.touches[0].clientX - canvasBounds.left;
      y = e.touches[0].clientY - canvasBounds.top;
    } else {
      x = e.offsetX;
      y = e.offsetY;
    }

    this.highScoreBounds = this.getHighScoreBounds();
    return x >= this.highScoreBounds.x && x <=
        this.highScoreBounds.x + this.highScoreBounds.width &&
        y >= this.highScoreBounds.y && y <=
        this.highScoreBounds.y + this.highScoreBounds.height;
  },

  /**
   * Get the bounding box for the high score.
   * @return {Object} Object with x, y, width and height properties.
   */
  getHighScoreBounds() {
    return {
      x: (this.x - (this.maxScoreUnits * 2) *
          DistanceMeter.dimensions.WIDTH) -
          DistanceMeter.config.HIGH_SCORE_HIT_AREA_PADDING,
      y: this.y,
      width: DistanceMeter.dimensions.WIDTH * (this.highScore.length + 1) +
          DistanceMeter.config.HIGH_SCORE_HIT_AREA_PADDING,
      height: DistanceMeter.dimensions.HEIGHT +
          (DistanceMeter.config.HIGH_SCORE_HIT_AREA_PADDING * 2)
    };
  },

  /**
   * Animate flashing the high score to indicate ready for resetting.
   * The flashing stops following this.config.FLASH_ITERATIONS x 2 flashes.
   */
  flashHighScore() {
    const now = getTimeStamp();
    const deltaTime = now - (this.frameTimeStamp || now);
    let paint = true;
    this.frameTimeStamp = now;

    // Reached the max number of flashes.
    if (this.flashIterations > this.config.FLASH_ITERATIONS * 2) {
      this.cancelHighScoreFlashing();
      return;
    }

    this.flashTimer += deltaTime;

    if (this.flashTimer < this.config.FLASH_DURATION) {
      paint = false;
    } else if (this.flashTimer > this.config.FLASH_DURATION * 2) {
      this.flashTimer = 0;
      this.flashIterations++;
    }

    if (paint) {
      this.drawHighScore();
    } else {
      this.clearHighScoreBounds();
    }
    // Frame update.
    this.flashingRafId =
        requestAnimationFrame(this.flashHighScore.bind(this));
  },

  /**
   * Draw empty rectangle over high score.
   */
  clearHighScoreBounds() {
    this.canvasCtx.save();
    this.canvasCtx.fillStyle = '#fff';
    this.canvasCtx.rect(this.highScoreBounds.x, this.highScoreBounds.y,
        this.highScoreBounds.width, this.highScoreBounds.height);
    this.canvasCtx.fill();
    this.canvasCtx.restore();
  },

  /**
   * Starts the flashing of the high score.
   */
  startHighScoreFlashing() {
    this.highScoreFlashing = true;
    this.flashHighScore();
  },

  /**
   * Whether high score is flashing.
   * @return {boolean}
   */
  isHighScoreFlashing() {
    return this.highScoreFlashing;
  },

  /**
   * Stop flashing the high score.
   */
  cancelHighScoreFlashing() {
    if (this.flashingRafId) {
      cancelAnimationFrame(this.flashingRafId);
    }
    this.flashIterations = 0;
    this.flashTimer = 0;
    this.highScoreFlashing = false;
    this.clearHighScoreBounds();
    this.drawHighScore();
  },

  /**
   * Clear the high score.
   */
  resetHighScore() {
    this.setHighScore(0);
    this.cancelHighScoreFlashing();
  },

  /**
   * Reset the distance meter back to '00000'.
   */
  reset() {
    this.update(0, 0);
    this.achievement = false;
  }
};


//******************************************************************************

/**
 * Cloud background item.
 * Similar to an obstacle object but without collision boxes.
 * @param {HTMLCanvasElement} canvas Canvas element.
 * @param {Object} spritePos Position of image in sprite.
 * @param {number} containerWidth
 * @constructor
 */
function Cloud(canvas, spritePos, containerWidth) {
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
  this.spritePos = spritePos;
  this.containerWidth = containerWidth;
  this.xPos = containerWidth;
  this.yPos = 0;
  this.remove = false;
  this.gap =
      getRandomNum(Cloud.config.MIN_CLOUD_GAP, Cloud.config.MAX_CLOUD_GAP);

  this.init();
}


/**
 * Cloud object config.
 * @enum {number}
 */
Cloud.config = {
  HEIGHT: 14,
  MAX_CLOUD_GAP: 400,
  MAX_SKY_LEVEL: 30,
  MIN_CLOUD_GAP: 100,
  MIN_SKY_LEVEL: 71,
  WIDTH: 46
};


Cloud.prototype = {
  /**
   * Initialise the cloud. Sets the Cloud height.
   */
  init() {
    this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
        Cloud.config.MIN_SKY_LEVEL);
    this.draw();
  },

  /**
   * Draw the cloud.
   */
  draw() {
    this.canvasCtx.save();
    let sourceWidth = Cloud.config.WIDTH;
    let sourceHeight = Cloud.config.HEIGHT;
    const outputWidth = sourceWidth;
    const outputHeight = sourceHeight;
    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2;
      sourceHeight = sourceHeight * 2;
    }

    this.canvasCtx.drawImage(Runner.imageSprite, this.spritePos.x,
        this.spritePos.y,
        sourceWidth, sourceHeight,
        this.xPos, this.yPos,
        outputWidth, outputHeight);

    this.canvasCtx.restore();
  },

  /**
   * Update the cloud position.
   * @param {number} speed
   */
  update(speed) {
    if (!this.remove) {
      this.xPos -= Math.ceil(speed);
      this.draw();

      // Mark as removeable if no longer in the canvas.
      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  },

  /**
   * Check if the cloud is visible on the stage.
   * @return {boolean}
   */
  isVisible() {
    return this.xPos + Cloud.config.WIDTH > 0;
  }
};


/**
 * Background item.
 * Similar to cloud, without random y position.
 * @param {HTMLCanvasElement} canvas Canvas element.
 * @param {Object} spritePos Position of image in sprite.
 * @param {number} containerWidth
 * @param {string} type Element type.
 * @constructor
 */
function BackgroundEl(canvas, spritePos, containerWidth, type) {
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
  this.spritePos = spritePos;
  this.containerWidth = containerWidth;
  this.xPos = containerWidth;
  this.yPos = 0;
  this.remove = false;
  this.type = type;
  this.gap =
      getRandomNum(BackgroundEl.config.MIN_GAP, BackgroundEl.config.MAX_GAP);
  this.animTimer = 0;
  this.switchFrames = false;

  this.spriteConfig = {};
  this.init();
}

/**
 * Background element object config.
 * Real values assigned when game type changes.
 * @enum {number}
 */
BackgroundEl.config = {
  MAX_BG_ELS: 0,
  MAX_GAP: 0,
  MIN_GAP: 0,
  POS: 0,
  SPEED: 0,
  Y_POS: 0,
  MS_PER_FRAME: 0  // only needed when BACKGROUND_EL.FIXED is true
};


BackgroundEl.prototype = {
  /**
   * Initialise the element setting the y position.
   */
  init() {
    this.spriteConfig = Runner.spriteDefinition.BACKGROUND_EL[this.type];
    if (this.spriteConfig.FIXED) {
      this.xPos = this.spriteConfig.FIXED_X_POS;
    }
    this.yPos = BackgroundEl.config.Y_POS - this.spriteConfig.HEIGHT +
        this.spriteConfig.OFFSET;
    this.draw();
  },

  /**
   * Draw the element.
   */
  draw() {
    this.canvasCtx.save();
    let sourceWidth = this.spriteConfig.WIDTH;
    let sourceHeight = this.spriteConfig.HEIGHT;
    let sourceX = this.spriteConfig.X_POS;
    const outputWidth = sourceWidth;
    const outputHeight = sourceHeight;

    if (IS_HIDPI) {
      sourceWidth *= 2;
      sourceHeight *= 2;
      sourceX *= 2;
    }

    this.canvasCtx.drawImage(
        Runner.imageSprite, sourceX, this.spritePos.y, sourceWidth,
        sourceHeight, this.xPos, this.yPos, outputWidth, outputHeight);

    this.canvasCtx.restore();
  },

  /**
   * Update the background element position.
   * @param {number} speed
   */
  update(speed) {
    if (!this.remove) {
      if (!this.spriteConfig.FIXED) {
        // Fixed speed, regardless of actual game speed.
        this.xPos -= BackgroundEl.config.SPEED;
      } else {
        this.animTimer += speed;
        if (this.animTimer > BackgroundEl.config.MS_PER_FRAME) {
          this.animTimer = 0;
          this.switchFrames = !this.switchFrames;
        }

        this.yPos = this.switchFrames ? this.spriteConfig.FIXED_Y_POS_1 :
                                        this.spriteConfig.FIXED_Y_POS_2;
      }
      this.draw();

      // Mark as removable if no longer in the canvas.
      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  },

  /**
   * Check if the element is visible on the stage.
   * @return {boolean}
   */
  isVisible() {
    return this.xPos + this.spriteConfig.WIDTH > 0;
  }
};



//******************************************************************************

/**
 * Nightmode shows a moon and stars on the horizon.
 * @param {HTMLCanvasElement} canvas
 * @param {number} spritePos
 * @param {number} containerWidth
 * @constructor
 */
function NightMode(canvas, spritePos, containerWidth) {
  this.spritePos = spritePos;
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  this.xPos = containerWidth - 50;
  this.yPos = 30;
  this.currentPhase = 0;
  this.opacity = 0;
  this.containerWidth = containerWidth;
  this.stars = [];
  this.drawStars = false;
  this.placeStars();
}

/**
 * @enum {number}
 */
NightMode.config = {
  FADE_SPEED: 0.035,
  HEIGHT: 40,
  MOON_SPEED: 0.25,
  NUM_STARS: 2,
  STAR_SIZE: 9,
  STAR_SPEED: 0.3,
  STAR_MAX_Y: 70,
  WIDTH: 20
};

NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

NightMode.prototype = {
  /**
   * Update moving moon, changing phases.
   * @param {boolean} activated Whether night mode is activated.
   */
  update(activated) {
    // Moon phase.
    if (activated && this.opacity === 0) {
      this.currentPhase++;

      if (this.currentPhase >= NightMode.phases.length) {
        this.currentPhase = 0;
      }
    }

    // Fade in / out.
    if (activated && (this.opacity < 1 || this.opacity === 0)) {
      this.opacity += NightMode.config.FADE_SPEED;
    } else if (this.opacity > 0) {
      this.opacity -= NightMode.config.FADE_SPEED;
    }

    // Set moon positioning.
    if (this.opacity > 0) {
      this.xPos = this.updateXPos(this.xPos, NightMode.config.MOON_SPEED);

      // Update stars.
      if (this.drawStars) {
        for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
          this.stars[i].x =
              this.updateXPos(this.stars[i].x, NightMode.config.STAR_SPEED);
        }
      }
      this.draw();
    } else {
      this.opacity = 0;
      this.placeStars();
    }
    this.drawStars = true;
  },

  updateXPos(currentPos, speed) {
    if (currentPos < -NightMode.config.WIDTH) {
      currentPos = this.containerWidth;
    } else {
      currentPos -= speed;
    }
    return currentPos;
  },

  draw() {
    let moonSourceWidth = this.currentPhase === 3 ? NightMode.config.WIDTH * 2 :
                                                    NightMode.config.WIDTH;
    let moonSourceHeight = NightMode.config.HEIGHT;
    let moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase];
    const moonOutputWidth = moonSourceWidth;
    let starSize = NightMode.config.STAR_SIZE;
    let starSourceX = Runner.spriteDefinitionByType.original.LDPI.STAR.x;

    if (IS_HIDPI) {
      moonSourceWidth *= 2;
      moonSourceHeight *= 2;
      moonSourceX = this.spritePos.x +
          (NightMode.phases[this.currentPhase] * 2);
      starSize *= 2;
      starSourceX = Runner.spriteDefinitionByType.original.HDPI.STAR.x;
    }

    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = this.opacity;

    // Stars.
    if (this.drawStars) {
      for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
        this.canvasCtx.drawImage(
            Runner.origImageSprite, starSourceX, this.stars[i].sourceY,
            starSize, starSize, Math.round(this.stars[i].x), this.stars[i].y,
            NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE);
      }
    }

    // Moon.
    this.canvasCtx.drawImage(
        Runner.origImageSprite, moonSourceX, this.spritePos.y, moonSourceWidth,
        moonSourceHeight, Math.round(this.xPos), this.yPos, moonOutputWidth,
        NightMode.config.HEIGHT);

    this.canvasCtx.globalAlpha = 1;
    this.canvasCtx.restore();
  },

  // Do star placement.
  placeStars() {
    const segmentSize = Math.round(this.containerWidth /
        NightMode.config.NUM_STARS);

    for (let i = 0; i < NightMode.config.NUM_STARS; i++) {
      this.stars[i] = {};
      this.stars[i].x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
      this.stars[i].y = getRandomNum(0, NightMode.config.STAR_MAX_Y);

      if (IS_HIDPI) {
        this.stars[i].sourceY =
            Runner.spriteDefinitionByType.original.HDPI.STAR.y +
            NightMode.config.STAR_SIZE * 2 * i;
      } else {
        this.stars[i].sourceY =
            Runner.spriteDefinitionByType.original.LDPI.STAR.y +
            NightMode.config.STAR_SIZE * i;
      }
    }
  },

  reset() {
    this.currentPhase = 0;
    this.opacity = 0;
    this.update(false);
  }

};


//******************************************************************************

/**
 * Horizon Line.
 * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} lineConfig Configuration object.
 * @constructor
 */
function HorizonLine(canvas, lineConfig) {
  let sourceX = lineConfig.SOURCE_X;
  let sourceY = lineConfig.SOURCE_Y;

  if (IS_HIDPI) {
    sourceX *= 2;
    sourceY *= 2;
  }

  this.spritePos = {x: sourceX, y: sourceY};
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  this.sourceDimensions = {};
  this.dimensions = lineConfig;

  this.sourceXPos = [this.spritePos.x, this.spritePos.x +
      this.dimensions.WIDTH];
  this.xPos = [];
  this.yPos = 0;
  this.bumpThreshold = 0.5;

  this.setSourceDimensions(lineConfig);
  this.draw();
}


/**
 * Horizon line dimensions.
 * @enum {number}
 */
HorizonLine.dimensions = {
  WIDTH: 600,
  HEIGHT: 12,
  YPOS: 127
};


HorizonLine.prototype = {
  /**
   * Set the source dimensions of the horizon line.
   */
  setSourceDimensions(newDimensions) {
    for (const dimension in newDimensions) {
      if (dimension !== 'SOURCE_X' && dimension !== 'SOURCE_Y') {
        if (IS_HIDPI) {
          if (dimension !== 'YPOS') {
            this.sourceDimensions[dimension] = newDimensions[dimension] * 2;
          }
        } else {
          this.sourceDimensions[dimension] = newDimensions[dimension];
        }
        this.dimensions[dimension] = newDimensions[dimension];
      }
    }

    this.xPos = [0, newDimensions.WIDTH];
    this.yPos = newDimensions.YPOS;
  },

  /**
   * Return the crop x position of a type.
   */
  getRandomType() {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
  },

  /**
   * Draw the horizon line.
   */
  draw() {
    this.canvasCtx.drawImage(Runner.imageSprite, this.sourceXPos[0],
        this.spritePos.y,
        this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
        this.xPos[0], this.yPos,
        this.dimensions.WIDTH, this.dimensions.HEIGHT);

    this.canvasCtx.drawImage(Runner.imageSprite, this.sourceXPos[1],
        this.spritePos.y,
        this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
        this.xPos[1], this.yPos,
        this.dimensions.WIDTH, this.dimensions.HEIGHT);
  },

  /**
   * Update the x position of an indivdual piece of the line.
   * @param {number} pos Line position.
   * @param {number} increment
   */
  updateXPos(pos, increment) {
    const line1 = pos;
    const line2 = pos === 0 ? 1 : 0;

    this.xPos[line1] -= increment;
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
      this.xPos[line1] += this.dimensions.WIDTH * 2;
      this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
      this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
    }
  },

  /**
   * Update the horizon line.
   * @param {number} deltaTime
   * @param {number} speed
   */
  update(deltaTime, speed) {
    const increment = Math.floor(speed * (FPS / 1000) * deltaTime);

    if (this.xPos[0] <= 0) {
      this.updateXPos(0, increment);
    } else {
      this.updateXPos(1, increment);
    }
    this.draw();
  },

  /**
   * Reset horizon to the starting position.
   */
  reset() {
    this.xPos[0] = 0;
    this.xPos[1] = this.dimensions.WIDTH;
  }
};


//******************************************************************************

/**
 * Horizon background class.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} spritePos Sprite positioning.
 * @param {Object} dimensions Canvas dimensions.
 * @param {number} gapCoefficient
 * @constructor
 */
function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
  this.canvas = canvas;
  this.canvasCtx =
      /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
  this.config = Horizon.config;
  this.dimensions = dimensions;
  this.gapCoefficient = gapCoefficient;
  this.obstacles = [];
  this.obstacleHistory = [];
  this.horizonOffsets = [0, 0];
  this.cloudFrequency = this.config.CLOUD_FREQUENCY;
  this.spritePos = spritePos;
  this.nightMode = null;
  this.altGameModeActive = false;

  // Cloud
  this.clouds = [];
  this.cloudSpeed = this.config.BG_CLOUD_SPEED;

  // Background elements
  this.backgroundEls = [];
  this.lastEl = null;
  this.backgroundSpeed = this.config.BG_CLOUD_SPEED;

  // Horizon
  this.horizonLine = null;
  this.horizonLines = [];
  this.init();
}


/**
 * Horizon config.
 * @enum {number}
 */
Horizon.config = {
  BG_CLOUD_SPEED: 0.2,
  BUMPY_THRESHOLD: .3,
  CLOUD_FREQUENCY: .5,
  HORIZON_HEIGHT: 16,
  MAX_CLOUDS: 6
};


Horizon.prototype = {
  /**
   * Initialise the horizon. Just add the line and a cloud. No obstacles.
   */
  init() {
    Obstacle.types = Runner.spriteDefinitionByType.original.OBSTACLES;
    this.addCloud();
    // Multiple Horizon lines
    for (let i = 0; i < Runner.spriteDefinition.LINES.length; i++) {
      this.horizonLines.push(
          new HorizonLine(this.canvas, Runner.spriteDefinition.LINES[i]));
    }

    this.nightMode = new NightMode(this.canvas, this.spritePos.MOON,
        this.dimensions.WIDTH);
  },

  /**
   * Update sprites to correspond to change in sprite sheet.
   * @param {number} spritePos
   */
  enableAltGameMode: function(spritePos) {
    // Clear existing horizon objects.
    this.clouds = [];
    this.backgroundEls = [];

    this.altGameModeActive = true;
    this.spritePos = spritePos;

    Obstacle.types = Runner.spriteDefinition.OBSTACLES;
    Obstacle.MAX_GAP_COEFFICIENT = Runner.spriteDefinition.MAX_GAP_COEFFICIENT;
    Obstacle.MAX_OBSTACLE_LENGTH = Runner.spriteDefinition.MAX_OBSTACLE_LENGTH;

    BackgroundEl.config = Runner.spriteDefinition.BACKGROUND_EL_CONFIG;

    this.horizonLines = [];
    for (let i = 0; i < Runner.spriteDefinition.LINES.length; i++) {
      this.horizonLines.push(
          new HorizonLine(this.canvas, Runner.spriteDefinition.LINES[i]));
    }
    this.reset();
  },

  /**
   * @param {number} deltaTime
   * @param {number} currentSpeed
   * @param {boolean} updateObstacles Used as an override to prevent
   *     the obstacles from being updated / added. This happens in the
   *     ease in section.
   * @param {boolean} showNightMode Night mode activated.
   */
  update(deltaTime, currentSpeed, updateObstacles, showNightMode) {
    this.runningTime += deltaTime;

    if (this.altGameModeActive) {
      this.updateBackgroundEls(deltaTime, currentSpeed);
    }

    for (let i = 0; i < this.horizonLines.length; i++) {
      this.horizonLines[i].update(deltaTime, currentSpeed);
    }

    if (!this.altGameModeActive || Runner.spriteDefinition.HAS_CLOUDS) {
      this.nightMode.update(showNightMode);
      this.updateClouds(deltaTime, currentSpeed);
    }

    if (updateObstacles) {
      this.updateObstacles(deltaTime, currentSpeed);
    }
  },

  /**
   * Update background element positions. Also handles creating new elements.
   * @param {number} elSpeed
   * @param {Array<Object>} bgElArray
   * @param {number} maxBgEl
   * @param {Function} bgElAddFunction
   * @param {number} frequency
   */
  updateBackgroundEl(elSpeed, bgElArray, maxBgEl, bgElAddFunction, frequency) {
    const numElements = bgElArray.length;

    if (numElements) {
      for (let i = numElements - 1; i >= 0; i--) {
        bgElArray[i].update(elSpeed);
      }

      const lastEl = bgElArray[numElements - 1];

      // Check for adding a new element.
      if (numElements < maxBgEl &&
          (this.dimensions.WIDTH - lastEl.xPos) > lastEl.gap &&
          frequency > Math.random()) {
        bgElAddFunction();
      }
    } else {
      bgElAddFunction();
    }
  },

  /**
   * Update the cloud positions.
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateClouds(deltaTime, speed) {
    const elSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
    this.updateBackgroundEl(
        elSpeed, this.clouds, this.config.MAX_CLOUDS, this.addCloud.bind(this),
        this.cloudFrequency);

    // Remove expired elements.
    this.clouds = this.clouds.filter((obj) => !obj.remove);
  },

  /**
   * Update the background element positions.
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateBackgroundEls(deltaTime, speed) {
    this.updateBackgroundEl(
        deltaTime, this.backgroundEls, BackgroundEl.config.MAX_BG_ELS,
        this.addBackgroundEl.bind(this), this.cloudFrequency);

    // Remove expired elements.
    this.backgroundEls = this.backgroundEls.filter((obj) => !obj.remove);
  },

  /**
   * Update the obstacle positions.
   * @param {number} deltaTime
   * @param {number} currentSpeed
   */
  updateObstacles(deltaTime, currentSpeed) {
    const updatedObstacles = this.obstacles.slice(0);

    for (let i = 0; i < this.obstacles.length; i++) {
      const obstacle = this.obstacles[i];
      obstacle.update(deltaTime, currentSpeed);

      // Clean up existing obstacles.
      if (obstacle.remove) {
        updatedObstacles.shift();
      }
    }
    this.obstacles = updatedObstacles;

    if (this.obstacles.length > 0) {
      const lastObstacle = this.obstacles[this.obstacles.length - 1];

      if (lastObstacle && !lastObstacle.followingObstacleCreated &&
          lastObstacle.isVisible() &&
          (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
          this.dimensions.WIDTH) {
        this.addNewObstacle(currentSpeed);
        lastObstacle.followingObstacleCreated = true;
      }
    } else {
      // Create new obstacles.
      this.addNewObstacle(currentSpeed);
    }
  },

  removeFirstObstacle() {
    this.obstacles.shift();
  },

  /**
   * Add a new obstacle.
   * @param {number} currentSpeed
   */
  addNewObstacle(currentSpeed) {
    const obstacleCount =
        Runner.isAltGameModeEnabled() && !this.altGameModeActive ||
            this.altGameModeActive ?
        Obstacle.types.length - 1 :
        Obstacle.types.length - 2;
    const obstacleTypeIndex =
        obstacleCount > 0 ? getRandomNum(0, obstacleCount) : 0;
    const obstacleType = Obstacle.types[obstacleTypeIndex];

    // Check for multiples of the same type of obstacle.
    // Also check obstacle is available at current speed.
    if ((obstacleCount > 0 && this.duplicateObstacleCheck(obstacleType.type)) ||
        currentSpeed < obstacleType.minSpeed) {
      this.addNewObstacle(currentSpeed);
    } else {
      const obstacleSpritePos = this.spritePos[obstacleType.type];

      this.obstacles.push(new Obstacle(
          this.canvasCtx, obstacleType, obstacleSpritePos, this.dimensions,
          this.gapCoefficient, currentSpeed, obstacleType.width,
          this.altGameModeActive));

      this.obstacleHistory.unshift(obstacleType.type);

      if (this.obstacleHistory.length > 1) {
        this.obstacleHistory.splice(Runner.config.MAX_OBSTACLE_DUPLICATION);
      }
    }
  },

  /**
   * Returns whether the previous two obstacles are the same as the next one.
   * Maximum duplication is set in config value MAX_OBSTACLE_DUPLICATION.
   * @return {boolean}
   */
  duplicateObstacleCheck(nextObstacleType) {
    let duplicateCount = 0;

    for (let i = 0; i < this.obstacleHistory.length; i++) {
      duplicateCount =
          this.obstacleHistory[i] === nextObstacleType ? duplicateCount + 1 : 0;
    }
    return duplicateCount >= Runner.config.MAX_OBSTACLE_DUPLICATION;
  },

  /**
   * Reset the horizon layer.
   * Remove existing obstacles and reposition the horizon line.
   */
  reset() {
    this.obstacles = [];
    for (let l = 0; l < this.horizonLines.length; l++) {
      this.horizonLines[l].reset();
    }

    this.nightMode.reset();
  },

  /**
   * Update the canvas width and scaling.
   * @param {number} width Canvas width.
   * @param {number} height Canvas height.
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  },

  /**
   * Add a new cloud to the horizon.
   */
  addCloud() {
    this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
        this.dimensions.WIDTH));
  },

  /**
   * Add a random background element to the horizon.
   */
  addBackgroundEl() {
    const backgroundElTypes =
        Object.keys(Runner.spriteDefinition.BACKGROUND_EL);

    if (backgroundElTypes.length > 0) {
      let index = getRandomNum(0, backgroundElTypes.length - 1);
      let type = backgroundElTypes[index];

      // Add variation if available.
      while (type == this.lastEl && backgroundElTypes.length > 1) {
        index = getRandomNum(0, backgroundElTypes.length - 1);
        type = backgroundElTypes[index];
      }

      this.lastEl = type;
      this.backgroundEls.push(new BackgroundEl(
          this.canvas, this.spritePos.BACKGROUND_EL, this.dimensions.WIDTH,
          type));
    }
  }
};

// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* @const */
const GAME_TYPE = ['type_1', 'type_2', 'type_3', 'type_4', 'type_5'];

/**
 * Obstacle definitions.
 * minGap: minimum pixel space between obstacles.
 * multipleSpeed: Speed at which multiples are allowed.
 * speedOffset: speed faster / slower than the horizon.
 * minSpeed: Minimum speed which the obstacle can make an appearance.
 *
 * @typedef {{
 *   type: string,
 *   width: number,
 *   height: number,
 *   yPos: number,
 *   multipleSpeed: number,
 *   minGap: number,
 *   minSpeed: number,
 *   collisionBoxes: Array<CollisionBox>,
 * }}
 */
let ObstacleType;

/**
 * T-Rex runner sprite definitions.
 */
Runner.spriteDefinitionByType = {
  original: {
    LDPI: {
      BACKGROUND_EL: {x: 86, y: 2},
      CACTUS_LARGE: {x: 332, y: 2},
      CACTUS_SMALL: {x: 228, y: 2},
      OBSTACLE_2: {x: 332, y: 2},
      OBSTACLE: {x: 228, y: 2},
      CLOUD: {x: 86, y: 2},
      HORIZON: {x: 2, y: 54},
      MOON: {x: 484, y: 2},
      PTERODACTYL: {x: 134, y: 2},
      RESTART: {x: 2, y: 68},
      TEXT_SPRITE: {x: 655, y: 2},
      TREX: {x: 848, y: 2},
      STAR: {x: 645, y: 2},
      COLLECTABLE: {x: 2, y: 2},
      ALT_GAME_END: {x: 121, y: 2}
    },
    HDPI: {
      BACKGROUND_EL: {x: 166, y: 2},
      CACTUS_LARGE: {x: 652, y: 2},
      CACTUS_SMALL: {x: 446, y: 2},
      OBSTACLE_2: {x: 652, y: 2},
      OBSTACLE: {x: 446, y: 2},
      CLOUD: {x: 166, y: 2},
      HORIZON: {x: 2, y: 104},
      MOON: {x: 954, y: 2},
      PTERODACTYL: {x: 260, y: 2},
      RESTART: {x: 2, y: 130},
      TEXT_SPRITE: {x: 1294, y: 2},
      TREX: {x: 1678, y: 2},
      STAR: {x: 1276, y: 2},
      COLLECTABLE: {x: 4, y: 4},
      ALT_GAME_END: {x: 242, y: 4}
    },
    MAX_GAP_COEFFICIENT: 1.5,
    MAX_OBSTACLE_LENGTH: 3,
    HAS_CLOUDS: 1,
    BOTTOM_PAD: 10,
    TREX: {
      WAITING_1: {x: 44, w: 44, h: 47, xOffset: 0},
      WAITING_2: {x: 0, w: 44, h: 47, xOffset: 0},
      RUNNING_1: {x: 88, w: 44, h: 47, xOffset: 0},
      RUNNING_2: {x: 132, w: 44, h: 47, xOffset: 0},
      JUMPING: {x: 0, w: 44, h: 47, xOffset: 0},
      CRASHED: {x: 220, w: 44, h: 47, xOffset: 0},
      COLLISION_BOXES: [
        new CollisionBox(22, 0, 17, 16), new CollisionBox(1, 18, 30, 9),
        new CollisionBox(10, 35, 14, 8), new CollisionBox(1, 24, 29, 5),
        new CollisionBox(5, 30, 21, 4), new CollisionBox(9, 34, 15, 4)
      ]
    },
    /** @type {Array<ObstacleType>} */
    OBSTACLES: [
      {
        type: 'CACTUS_SMALL',
        width: 17,
        height: 35,
        yPos: 105,
        multipleSpeed: 4,
        minGap: 120,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(0, 7, 5, 27), new CollisionBox(4, 0, 6, 34),
          new CollisionBox(10, 4, 7, 14)
        ]
      },
      {
        type: 'CACTUS_LARGE',
        width: 25,
        height: 50,
        yPos: 90,
        multipleSpeed: 7,
        minGap: 120,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(0, 12, 7, 38), new CollisionBox(8, 0, 7, 49),
          new CollisionBox(13, 10, 10, 38)
        ]
      },
      {
        type: 'PTERODACTYL',
        width: 46,
        height: 40,
        yPos: [100, 75, 50],    // Variable height.
        yPosMobile: [100, 50],  // Variable height mobile.
        multipleSpeed: 999,
        minSpeed: 8.5,
        minGap: 150,
        collisionBoxes: [
          new CollisionBox(15, 15, 16, 5), new CollisionBox(18, 21, 24, 6),
          new CollisionBox(2, 14, 4, 3), new CollisionBox(6, 10, 4, 7),
          new CollisionBox(10, 8, 6, 9)
        ],
        numFrames: 2,
        frameRate: 1000 / 6,
        speedOffset: .8
      },
      {
        type: 'COLLECTABLE',
        width: 12,
        height: 38,
        yPos: 90,
        multipleSpeed: 999,
        minGap: 999,
        minSpeed: 0,
        collisionBoxes: [new CollisionBox(0, 0, 12, 38)]
      }
    ],
    BACKGROUND_EL: {
      'CLOUD': {
        HEIGHT: 14,
        MAX_CLOUD_GAP: 400,
        MAX_SKY_LEVEL: 30,
        MIN_CLOUD_GAP: 100,
        MIN_SKY_LEVEL: 71,
        OFFSET: 4,
        WIDTH: 46,
        X_POS: 1,
        Y_POS: 120
      }
    },
    BACKGROUND_EL_CONFIG: {
      MAX_BG_ELS: 1,
      MAX_GAP: 400,
      MIN_GAP: 100,
      POS: 0,
      SPEED: 0.5,
      Y_POS: 125
    },
    LINES: [
      {SOURCE_X: 2, SOURCE_Y: 52, WIDTH: 600, HEIGHT: 12, YPOS: 127},
    ],
    ALT_GAME_END_CONFIG: {
      WIDTH: 15,
      HEIGHT: 17,
      X_OFFSET: 0,
      Y_OFFSET: 0,
    },
    ALT_GAME_OVER_TEXT_CONFIG: {
      TEXT_X: 14,
      TEXT_Y: 2,
      TEXT_WIDTH: 108,
      TEXT_HEIGHT: 15,
      FLASH_DURATION: 1500
    }
  },
  type_1: {
    LDPI: {
      OBSTACLE_1: {x: 631, y: 2},
      OBSTACLE_2: {x: 656, y: 2},
      OBSTACLE_3: {x: 697, y: 2},
      OBSTACLE_4: {x: 754, y: 2},
      OBSTACLE_5: {x: 781, y: 2},
      OBSTACLE_6: {x: 826, y: 2},
      BACKGROUND_EL: {x: 0, y: 120},
      CLOUD: {x: 890, y: 2},
      HORIZON: {x: 2, y: 54},
      TREX: {x: 252, y: 2}
    },
    HDPI: {
      OBSTACLE_1: {x: 1262, y: 2},
      OBSTACLE_2: {x: 1312, y: 2},
      OBSTACLE_3: {x: 1394, y: 2},
      OBSTACLE_4: {x: 1508, y: 2},
      OBSTACLE_5: {x: 1562, y: 2},
      OBSTACLE_6: {x: 1652, y: 2},
      BACKGROUND_EL: {x: 0, y: 240},
      CLOUD: {x: 1780, y: 3},
      HORIZON: {x: 4, y: 108},
      TREX: {x: 504, y: 2}
    },
    ALT_GAME_END_CONFIG: {WIDTH: 15, HEIGHT: 17, X_OFFSET: 19, Y_OFFSET: 17},
    MAX_GAP_COEFFICIENT: 0.56,
    MAX_OBSTACLE_LENGTH: 1,
    HAS_CLOUDS: 1,
    BOTTOM_PAD: 10,
    TREX: {
      MAX_JUMP_HEIGHT: 50,
      MIN_JUMP_HEIGHT: 50,
      INITIAL_JUMP_VELOCITY: -10,
      RUNNING_1: {x: 137, w: 44, h: 49, xOffset: 0},
      RUNNING_2: {x: 183, w: 44, h: 47, xOffset: 0},
      CRASHED: {x: 335, w: 44, h: 47, xOffset: 0},
      JUMPING: {x: 230, w: 59, h: 49, xOffset: 6},
      COLLISION_BOXES: [
        new CollisionBox(22, 0, 17, 16), new CollisionBox(0, 16, 32, 9),
        new CollisionBox(3, 24, 27, 6), new CollisionBox(5, 30, 21, 4)
      ]
    },
    OBSTACLES: [
      {
        type: 'OBSTACLE_1',
        width: 24,
        height: 60,
        yPos: 106,
        multipleSpeed: 4,
        minGap: 70,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(0, 0, 3, 26), new CollisionBox(3, 5, 8, 31),
          new CollisionBox(11, 24, 11, 10)
        ]
      },
      {
        type: 'OBSTACLE_2',
        width: 40,
        height: 60,
        yPos: 106,
        multipleSpeed: 4,
        minGap: 90,
        minSpeed: 5,
        collisionBoxes: [
          new CollisionBox(0, 0, 3, 26), new CollisionBox(3, 5, 24, 31),
          new CollisionBox(27, 24, 11, 10)
        ]
      },
      {
        type: 'OBSTACLE_3',
        width: 57,
        height: 60,
        yPos: 106,
        multipleSpeed: 4,
        minGap: 100,
        minSpeed: 7,
        collisionBoxes: [
          new CollisionBox(0, 0, 3, 26), new CollisionBox(3, 5, 40, 31),
          new CollisionBox(27, 43, 11, 10)
        ]
      },
      {
        type: 'OBSTACLE_4',
        width: 27,
        height: 44,
        yPos: 102,
        multipleSpeed: 7,
        minGap: 110,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(0, 0, 3, 26), new CollisionBox(3, 3, 8, 31),
          new CollisionBox(11, 24, 11, 10)
        ]
      },
      {
        type: 'OBSTACLE_5',
        width: 45,
        height: 44,
        yPos: 102,
        multipleSpeed: 7,
        minGap: 120,
        minSpeed: 7.5,
        collisionBoxes: [
          new CollisionBox(0, 0, 4, 26), new CollisionBox(4, 3, 26, 31),
          new CollisionBox(30, 30, 12, 11)
        ]
      },
      {
        type: 'OBSTACLE_6',
        width: 63,
        height: 44,
        yPos: 102,
        multipleSpeed: 7,
        minGap: 140,
        minSpeed: 7.5,
        collisionBoxes: [
          new CollisionBox(0, 0, 3, 26), new CollisionBox(4, 3, 44, 39),
          new CollisionBox(48, 24, 12, 11)
        ]
      }
    ],
    BACKGROUND_EL: {
      'BACKGROUND_0': {HEIGHT: 93, WIDTH: 423, Y_POS: 120, X_POS: 1, OFFSET: 4}
    },
    BACKGROUND_EL_CONFIG: {
      MAX_BG_ELS: 1,
      MAX_GAP: 600,
      MIN_GAP: 600,
      POS: 0,
      SPEED: 0.2,
      Y_POS: 125
    },
    LINES: [
      {SOURCE_X: 2, SOURCE_Y: 54, WIDTH: 600, HEIGHT: 12, YPOS: 125},
      {SOURCE_X: 2, SOURCE_Y: 84, WIDTH: 600, HEIGHT: 12, YPOS: 138}
    ]
  },
  type_2: {
    LDPI: {
      OBSTACLE_1: {x: 655, y: 2},
      BACKGROUND_EL: {x: 0, y: 60},
      CLOUD: {x: 963, y: 3},
      HORIZON: {x: 2, y: 54},
      TREX: {x: 252, y: 2}
    },
    HDPI: {
      OBSTACLE_1: {x: 1310, y: 2},
      BACKGROUND_EL: {x: 0, y: 120},
      CLOUD: {x: 1926, y: 3},
      HORIZON: {x: 4, y: 108},
      TREX: {x: 504, y: 2},
    },
    ALT_GAME_END_CONFIG: {WIDTH: 15, HEIGHT: 17, X_OFFSET: 19, Y_OFFSET: 18},
    MAX_GAP_COEFFICIENT: 0.56,
    MAX_OBSTACLE_LENGTH: 1,
    HAS_CLOUDS: 0,
    BOTTOM_PAD: 10,
    TREX: {
      MAX_JUMP_HEIGHT: 30,
      MIN_JUMP_HEIGHT: 30,
      INITIAL_JUMP_VELOCITY: -19,
      RUNNING_1: {x: 137, w: 44, h: 49, xOffset: 0},
      RUNNING_2: {x: 183, w: 44, h: 49, xOffset: 0},
      CRASHED: {x: 359, w: 44, h: 43, xOffset: 0},
      JUMPING: {x: 228, w: 43, h: 44, xOffset: 2.5},
      COLLISION_BOXES: [
        new CollisionBox(22, 0, 17, 16), new CollisionBox(17, 37, 7, 7),
        new CollisionBox(10, 17, 19, 20)
      ]
    },
    OBSTACLES: [{
      type: 'OBSTACLE_1',
      width: 54,
      height: 54,
      yPos: 90,
      multipleSpeed: 4,
      minGap: 70,
      minSpeed: 0,
      collisionBoxes: [
        new CollisionBox(0, 8, 20, 43), new CollisionBox(21, 6, 8, 42),
        new CollisionBox(32, 2, 18, 49)
      ]
    }],
    BACKGROUND_EL: {
      'BACKGROUND_0': {HEIGHT: 120, WIDTH: 89, Y_POS: 40, X_POS: 1, OFFSET: 4},
      'BACKGROUND_1':
          {HEIGHT: 108, WIDTH: 130, Y_POS: 40, X_POS: 92, OFFSET: 4},
      'BACKGROUND_2':
          {HEIGHT: 28, WIDTH: 204, Y_POS: 40, X_POS: 223, OFFSET: 4},
    },
    BACKGROUND_EL_CONFIG: {
      MAX_BG_ELS: 2,
      MAX_GAP: 550,
      MIN_GAP: 400,
      POS: 0,
      SPEED: 0.5,
      Y_POS: 125
    },
    LINES: [{SOURCE_X: 2, SOURCE_Y: 54, WIDTH: 600, HEIGHT: 5, YPOS: 125}]
  },
  type_3: {
    LDPI: {
      OBSTACLE_1: {x: 611, y: 2},
      OBSTACLE_2: {x: 634, y: 2},
      OBSTACLE_3: {x: 671, y: 2},
      OBSTACLE_4: {x: 722, y: 2},
      OBSTACLE_5: {x: 762, y: 2},
      OBSTACLE_6: {x: 806, y: 2},
      BACKGROUND_EL: {x: 0, y: 65},
      CLOUD: {x: 888, y: 2},
      HORIZON: {x: 2, y: 58},
      TREX: {x: 252, y: 2}
    },
    HDPI: {
      OBSTACLE_1: {x: 1222, y: 2},
      OBSTACLE_2: {x: 1268, y: 2},
      OBSTACLE_3: {x: 1342, y: 2},
      OBSTACLE_4: {x: 1444, y: 2},
      OBSTACLE_5: {x: 1524, y: 2},
      OBSTACLE_6: {x: 1612, y: 2},
      BACKGROUND_EL: {x: 0, y: 130},
      CLOUD: {x: 1776, y: 3},
      HORIZON: {x: 4, y: 116},
      TREX: {x: 504, y: 2}
    },
    ALT_GAME_END_CONFIG: {WIDTH: 15, HEIGHT: 17, X_OFFSET: 23, Y_OFFSET: 17},
    MAX_GAP_COEFFICIENT: 0.56,
    MAX_OBSTACLE_LENGTH: 1,
    BOTTOM_PAD: 10,
    HAS_CLOUDS: 1,
    TREX: {
      MAX_JUMP_HEIGHT: 45,
      MIN_JUMP_HEIGHT: 30,
      INITIAL_JUMP_VELOCITY: -10,
      RUNNING_1: {x: 104, w: 51, h: 57, xOffset: 0},
      RUNNING_2: {x: 156, w: 51, h: 57, xOffset: 0},
      CRASHED: {x: 309, w: 51, h: 57, xOffset: 0},
      JUMPING: {x: 208, w: 51, h: 57, xOffset: 0},
      COLLISION_BOXES:
          [new CollisionBox(28, 35, 19, 11), new CollisionBox(3, 44, 26, 4)]
    },
    OBSTACLES: [
      {
        type: 'OBSTACLE_1',
        width: 24,
        height: 18,
        yPos: 117,
        multipleSpeed: 4,
        minGap: 50,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(11, 2, 3, 2), new CollisionBox(7, 4, 11, 10),
          new CollisionBox(2, 9, 5, 6)
        ]
      },
      {
        type: 'OBSTACLE_2',
        width: 40,
        height: 22,
        yPos: 117,
        multipleSpeed: 4,
        minGap: 60,
        minSpeed: 4.5,
        collisionBoxes: [
          new CollisionBox(11, 2, 3, 2), new CollisionBox(7, 5, 23, 10),
          new CollisionBox(2, 9, 5, 6)
        ]
      },
      {
        type: 'OBSTACLE_3',
        width: 49,
        height: 22,
        yPos: 117,
        multipleSpeed: 4,
        minGap: 80,
        minSpeed: 7,
        collisionBoxes: [
          new CollisionBox(11, 2, 3, 2), new CollisionBox(8, 5, 39, 10),
          new CollisionBox(2, 9, 5, 6)
        ]
      },
      {
        type: 'OBSTACLE_4',
        width: 37,
        height: 26,
        yPos: 113,
        multipleSpeed: 7,
        minGap: 120,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(4, 16, 5, 8), new CollisionBox(9, 12, 7, 12),
          new CollisionBox(16, 5, 10, 19)
        ]
      },
      {
        type: 'OBSTACLE_5',
        width: 45,
        height: 30,
        yPos: 113,
        multipleSpeed: 7,
        minGap: 120,
        minSpeed: 5.5,
        collisionBoxes: [
          new CollisionBox(4, 16, 5, 8), new CollisionBox(9, 12, 7, 12),
          new CollisionBox(16, 5, 10, 19), new CollisionBox(26, 14, 13, 11)
        ]
      },
      {
        type: 'OBSTACLE_6',
        width: 79,
        height: 30,
        yPos: 113,
        multipleSpeed: 7,
        minGap: 150,
        minSpeed: 7,
        collisionBoxes: [
          new CollisionBox(4, 16, 5, 8), new CollisionBox(9, 12, 7, 12),
          new CollisionBox(16, 5, 10, 19), new CollisionBox(26, 14, 13, 11),
          new CollisionBox(40, 18, 10, 6), new CollisionBox(50, 12, 10, 12),
          new CollisionBox(57, 5, 10, 19)
        ]
      }
    ],
    BACKGROUND_EL: {
      'BACKGROUND_0': {
        HEIGHT: 78,
        OFFSET: 6,
        WIDTH: 105,
        X_POS: 425,
        FIXED_X_POS: 0,
        FIXED_Y_POS_1: 54,
        FIXED_Y_POS_2: 51,
        FIXED: true
      }
    },
    BACKGROUND_EL_CONFIG: {
      MAX_BG_ELS: 1,
      MAX_GAP: 550,
      MIN_GAP: 400,
      POS: 0,
      SPEED: 0.2,
      Y_POS: 125,
      MS_PER_FRAME: 250
    },
    LINES: [
      {SOURCE_X: 2, SOURCE_Y: 58, WIDTH: 600, HEIGHT: 8, YPOS: 125},
    ]
  },
  type_4: {
    LDPI: {
      OBSTACLE_1: {x: 514, y: 2},
      OBSTACLE_2: {x: 543, y: 2},
      OBSTACLE_3: {x: 599, y: 2},
      OBSTACLE_4: {x: 643, y: 2},
      BACKGROUND_EL: {x: 811, y: 2},
      CLOUD: {x: 888, y: 2},
      WALL: {x: 2, y: 54},
      HORIZON: {x: 2, y: 81},
      TREX: {x: 252, y: 2}
    },
    HDPI: {
      OBSTACLE_1: {x: 1028, y: 2},
      OBSTACLE_2: {x: 1086, y: 2},
      OBSTACLE_3: {x: 1198, y: 2},
      OBSTACLE_4: {x: 1286, y: 2},
      BACKGROUND_EL: {x: 1622, y: 4},
      CLOUD: {x: 1776, y: 3},
      WALL: {x: 2, y: 108},
      HORIZON: {x: 4, y: 162},
      TREX: {x: 504, y: 2}
    },
    ALT_GAME_END_CONFIG: {WIDTH: 15, HEIGHT: 17, X_OFFSET: 38, Y_OFFSET: 16},
    MAX_GAP_COEFFICIENT: 0.56,
    MAX_OBSTACLE_LENGTH: 1,
    BOTTOM_PAD: 43,
    HAS_CLOUDS: 0,
    TREX: {
      GRAVITY: 0.36,
      MAX_JUMP_HEIGHT: 20,
      MIN_JUMP_HEIGHT: 18,
      INITIAL_JUMP_VELOCITY: -20,
      INVERT_JUMP: 1,
      RUNNING_1: {x: 0, w: 65, h: 30, xOffset: 0},
      RUNNING_2: {x: 67, w: 65, h: 30, xOffset: 0},
      CRASHED: {x: 196, w: 65, h: 30, xOffset: 0},
      JUMPING: {x: 133.5, w: 65, h: 30, xOffset: 0},
      COLLISION_BOXES: [
        new CollisionBox(17, 4, 49, 9), new CollisionBox(20, 17, 23, 4),
        new CollisionBox(19, 20, 10, 7), new CollisionBox(17, 13, 42, 4)
      ]
    },
    OBSTACLES: [
      {
        type: 'OBSTACLE_1',
        width: 27,
        height: 11,
        yPos: 80,
        multipleSpeed: 4,
        minGap: 120,
        minSpeed: 0,
        collisionBoxes: [new CollisionBox(0, 2, 27, 8)]
      },
      {
        type: 'OBSTACLE_2',
        width: 54,
        height: 11,
        yPos: 80,
        multipleSpeed: 4,
        minGap: 140,
        minSpeed: 7,
        collisionBoxes: [new CollisionBox(0, 2, 52, 8)]
      },
      {
        type: 'OBSTACLE_3',
        width: 42,
        height: 16,
        yPos: 76,
        multipleSpeed: 4,
        minGap: 170,
        minSpeed: 3,
        collisionBoxes: [new CollisionBox(0, 2, 40, 14)]
      }
    ],
    BACKGROUND_EL_CONFIG: {
      SPEED: 0.5,
      POS: 0,
      MAX_BG_ELS: 3,
      MIN_GAP: 100,
      MAX_GAP: 400,
      Y_POS: 100
    },
    BACKGROUND_EL: {
      'BACKGROUND_0':
          {HEIGHT: 32, WIDTH: 30, Y_POS: 2, X_POS: 811, OFFSET: -65},
      'BACKGROUND_1':
          {HEIGHT: 37, WIDTH: 40, Y_POS: 2, X_POS: 842, OFFSET: -13},
      'BACKGROUND_2': {HEIGHT: 33, WIDTH: 82, Y_POS: 2, X_POS: 727, OFFSET: -40}
    },
    LINES: [
      {SOURCE_X: 2, SOURCE_Y: 81, WIDTH: 600, HEIGHT: 12, YPOS: 78},
      {SOURCE_X: 2, SOURCE_Y: 54, WIDTH: 600, HEIGHT: 12, YPOS: 56}
    ]
  },
  type_5: {
    LDPI: {
      OBSTACLE_1: {x: 458, y: 2},
      OBSTACLE_2: {x: 458, y: 2},
      BACKGROUND_EL: {x: 0, y: 0},
      CLOUD: {x: 482, y: 2},
      WALL: {x: 2, y: 54},
      HORIZON: {x: 2, y: 77},
      TREX: {x: 252, y: 2}
    },
    HDPI: {
      OBSTACLE_1: {x: 916, y: 2},
      OBSTACLE_2: {x: 916, y: 2},
      BACKGROUND_EL: {x: 0, y: 0},
      CLOUD: {x: 963, y: 3},
      WALL: {x: 2, y: 108},
      HORIZON: {x: 4, y: 154},
      TREX: {x: 504, y: 2}
    },
    ALT_GAME_END_CONFIG: {WIDTH: 15, HEIGHT: 17, X_OFFSET: 24, Y_OFFSET: 23},
    MAX_GAP_COEFFICIENT: 2.5,
    MAX_OBSTACLE_LENGTH: 1,
    BOTTOM_PAD: 12,
    HAS_CLOUDS: 1,
    TREX: {
      MAX_JUMP_HEIGHT: 30,
      MIN_JUMP_HEIGHT: 30,
      INITIAL_JUMP_VELOCITY: -10,
      RUNNING_1: {x: 0, w: 51, h: 67, xOffset: 0},
      RUNNING_2: {x: 50, w: 51, h: 67, xOffset: 0},
      CRASHED: {x: 156, w: 51, h: 67, xOffset: 0},
      JUMPING: {x: 103, w: 54, h: 67, xOffset: 0},
      COLLISION_BOXES: [
        new CollisionBox(35, 30, 13, 9), new CollisionBox(19, 51, 22, 9),
        new CollisionBox(9, 51, 9, 13), new CollisionBox(4, 27, 31, 28)
      ]
    },
    OBSTACLES: [{
      type: 'OBSTACLE_1',
      width: 21,
      height: 57,
      yPos: 93,
      multipleSpeed: 999,
      minGap: 40,
      minSpeed: 0,
      collisionBoxes: [
        new CollisionBox(0, 0, 3, 41), new CollisionBox(3, 5, 14, 39),
        new CollisionBox(16, 7, 4, 43)
      ]
    }],
    BACKGROUND_EL_CONFIG: {
      MAX_BG_ELS: 4,
      MAX_GAP: 420,
      MIN_GAP: 320,
      POS: 0,
      SPEED: 0.3,
      Y_POS: 125
    },
    BACKGROUND_EL: {
      'BACKGROUND_0': {HEIGHT: 40, WIDTH: 170, Y_POS: 100, X_POS: 0, OFFSET: 10}
    },
    LINES: [{SOURCE_X: 2, SOURCE_Y: 71, WIDTH: 600, HEIGHT: 12, YPOS: 123}]
  }
};