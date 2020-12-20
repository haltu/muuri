/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getUnprefixedPropName from '../utils/getUnprefixedPropName';
import isFunction from '../utils/isFunction';
import isNative from '../utils/isNative';
import setStyles from '../utils/setStyles';

export interface AnimationProperties {
  [key: string]: string;
}

export interface AnimationOptions {
  duration?: number;
  easing?: string;
  onFinish?: Function;
}

const HAS_WEB_ANIMATIONS = isFunction(Element.prototype.animate);
const HAS_NATIVE_WEB_ANIMATIONS = isNative(Element.prototype.animate);

function createKeyframe(props: AnimationProperties, prefix: boolean) {
  const keyframe: AnimationProperties = {};
  let prop: string;
  for (prop in props) {
    keyframe[prefix ? prop : getUnprefixedPropName(prop)] = props[prop];
  }
  return keyframe;
}

/**
 * Item animation handler powered by Web Animations API.
 */
export default class Animator {
  element: HTMLElement | null;
  animation: Animation | null;
  _finishCallback: Function | null;

  constructor(element?: HTMLElement) {
    this.element = element || null;
    this.animation = null;
    this._finishCallback = null;
    this._onFinish = this._onFinish.bind(this);
  }

  /**
   * Animation end handler.
   */
  _onFinish() {
    const { _finishCallback } = this;
    this.animation = this._finishCallback = null;
    _finishCallback && _finishCallback();
  }

  /**
   * Start instance's animation. Automatically stops current animation if it is
   * running.
   */
  start(propsFrom: AnimationProperties, propsTo: AnimationProperties, options?: AnimationOptions) {
    if (!this.element) return;

    const { element } = this;
    const { duration, easing, onFinish } = options || {};

    // If we don't have web animations available let's not animate.
    if (!HAS_WEB_ANIMATIONS) {
      setStyles(element, propsTo);
      this._finishCallback = isFunction(onFinish) ? onFinish : null;
      this._onFinish();
      return;
    }

    // Cancel existing animation.
    if (this.animation) this.animation.cancel();

    // Start the animation. We need to provide unprefixed property names to the
    // Web Animations polyfill if it is being used. If we have native Web
    // Animations available we need to provide prefixed properties instead.
    this.animation = element.animate(
      [
        createKeyframe(propsFrom, HAS_NATIVE_WEB_ANIMATIONS),
        createKeyframe(propsTo, HAS_NATIVE_WEB_ANIMATIONS),
      ],
      {
        duration: duration || 300,
        easing: easing || 'ease',
      }
    );

    // Set animation finish callback.
    this._finishCallback = isFunction(onFinish) ? onFinish : null;
    this.animation.onfinish = this._onFinish;

    // Set the end styles. This makes sure that the element stays at the end
    // values after animation is finished.
    setStyles(element, propsTo);
  }

  /**
   * Stop instance's current animation if running.
   */
  stop() {
    if (!this.element || !this.animation) return;
    this.animation.cancel();
    this.animation = this._finishCallback = null;
  }

  /**
   * Check if the instance is animating.
   */
  isAnimating() {
    return !!this.animation;
  }

  /**
   * Destroy the instance and stop current animation if it is running.
   */
  destroy() {
    if (!this.element) return;
    this.stop();
    this.element = null;
  }
}
