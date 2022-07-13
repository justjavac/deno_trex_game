// Copyright (c) 2015 The Chromium Authors. All rights reserved. BSD-style license.
// https://source.chromium.org/chromium/chromium/src/+/main:LICENSE;drc=0125cf675617075bb4216dc1a794b9038be4f63d
//
// Copyright (c) justjavac. All rights reserved. MIT License.

import { IS_IOS } from "./constants.ts";

declare let webkitAudioContext: typeof AudioContext;
declare let window: Window & { webkitAudioContext: AudioContext };

export default class GeneratedSoundFx {
  /** 声音文件是否初始化完成 */
  audioCues: boolean;
  context!: AudioContext;
  panner: StereoPannerNode | null;
  bgSoundIntervalId?: number;

  constructor() {
    this.audioCues = false;
    this.panner = null;
  }

  init() {
    this.audioCues = true;
    if (!this.context) {
      // iOS 只支持 webkitAudioContext
      this.context = window.webkitAudioContext
        ? new webkitAudioContext()
        : new AudioContext();
      if (IS_IOS) {
        this.context.onstatechange = () => {
          if (this.context.state != "running") {
            this.context.resume();
          }
        };
        this.context.resume();
      }
      this.panner = this.context.createStereoPanner
        ? this.context.createStereoPanner()
        : null;
    }
  }

  stopAll() {
    this.cancelFootSteps();
  }

  /**
   * Play oscillators at certain frequency and for a certain time.
   * @param frequency
   * @param startTime
   * @param duration
   * @param optVol
   * @param optPan
   */
  playNote(
    frequency: number,
    startTime: number,
    duration: number,
    optVol = 0.01,
    optPan = 0,
  ) {
    const osc1 = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const volume = this.context.createGain();

    // Set oscillator wave type
    osc1.type = "triangle";
    osc2.type = "triangle";
    volume.gain.value = 0.1;

    // Set up node routing
    if (this.panner) {
      this.panner.pan.value = optPan;
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
    volume.gain.setValueAtTime(optVol, startTime + duration - 0.05);
    volume.gain.linearRampToValueAtTime(0.00001, startTime + duration);

    // Start oscillators
    osc1.start(startTime);
    osc2.start(startTime);
    // Stop oscillators
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  background() {
    if (this.audioCues) {
      const now = this.context.currentTime;
      this.playNote(493.883, now, 0.116);
      this.playNote(659.255, now + 0.116, 0.232);
      this.loopFootSteps();
    }
  }

  loopFootSteps() {
    if (this.audioCues && !this.bgSoundIntervalId) {
      this.bgSoundIntervalId = setInterval(() => {
        this.playNote(73.42, this.context.currentTime, 0.05, 0.16);
        this.playNote(69.3, this.context.currentTime + 0.116, 0.116, 0.16);
      }, 280);
    }
  }

  cancelFootSteps() {
    if (this.audioCues && this.bgSoundIntervalId) {
      clearInterval(this.bgSoundIntervalId);
      this.bgSoundIntervalId = 0;
      this.playNote(103.83, this.context.currentTime, 0.232, 0.02);
      this.playNote(116.54, this.context.currentTime + 0.116, 0.232, 0.02);
    }
  }

  collect() {
    if (this.audioCues) {
      this.cancelFootSteps();
      const now = this.context.currentTime;
      this.playNote(830.61, now, 0.116);
      this.playNote(1318.51, now + 0.116, 0.232);
    }
  }

  jump() {
    if (this.audioCues) {
      const now = this.context.currentTime;
      this.playNote(659.25, now, 0.116, 0.3, -0.6);
      this.playNote(880, now + 0.116, 0.232, 0.3, -0.6);
    }
  }
}
