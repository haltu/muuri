/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

import Dragger, { DraggerStartEvent } from './Dragger';

const pointerOut = 'pointerout';
const waitDuration = 100;

/**
 * If you happen to use Legacy Edge or IE on a touch capable device there is a
 * a specific case where pointercancel and pointerend events are never emitted,
 * even though one of them should always be emitted when you release your finger
 * from the screen. The bug appears specifically when Muuri shifts the dragged
 * element's position in the DOM after pointerdown event, IE and Edge don't like
 * that behaviour and quite often forget to emit the pointerend/pointercancel
 * event. But, they do emit pointerout event so we utilize that here.
 * Specifically, if there has been no pointermove event within 100 milliseconds
 * since the last pointerout event we force cancel the drag operation. This hack
 * works surprisingly well 99% of the time. There is that 1% chance there still
 * that dragged items get stuck but it is what it is.
 *
 * @class
 * @param {Dragger} dragger
 */
export default class EdgeHack {
  private _dragger: Dragger;
  private _timeout: number | null;
  private _outEvent: PointerEvent | TouchEvent | MouseEvent | null;
  private _isActive: boolean;

  constructor(dragger: Dragger) {
    this._dragger = dragger;
    this._timeout = null;
    this._outEvent = null;
    this._isActive = false;

    this._addBehaviour = this._addBehaviour.bind(this);
    this._removeBehaviour = this._removeBehaviour.bind(this);
    this._onTimeout = this._onTimeout.bind(this);
    this._resetData = this._resetData.bind(this);
    this._onStart = this._onStart.bind(this);
    this._onOut = this._onOut.bind(this);

    this._dragger.on('start', this._onStart);
  }

  private _addBehaviour() {
    if (this._isActive) return;
    this._isActive = true;
    this._dragger.on('move', this._resetData);
    this._dragger.on('cancel', this._removeBehaviour);
    this._dragger.on('end', this._removeBehaviour);
    window.addEventListener(pointerOut, this._onOut);
  }

  private _removeBehaviour() {
    if (!this._isActive) return;
    this._dragger.off('move', this._resetData);
    this._dragger.off('cancel', this._removeBehaviour);
    this._dragger.off('end', this._removeBehaviour);
    window.removeEventListener(pointerOut, this._onOut);
    this._resetData();
    this._isActive = false;
  }

  private _resetData() {
    if (this._timeout !== null) {
      window.clearTimeout(this._timeout);
      this._timeout = null;
    }
    this._outEvent = null;
  }

  private _onStart(e: DraggerStartEvent) {
    if (e.pointerType === 'mouse') return;
    this._addBehaviour();
  }

  private _onOut(e: PointerEvent | TouchEvent | MouseEvent) {
    if (!this._dragger.getTrackedTouch(e)) return;
    this._resetData();
    this._outEvent = e;
    this._timeout = window.setTimeout(this._onTimeout, waitDuration);
  }

  private _onTimeout() {
    const outEvent = this._outEvent;
    this._resetData();
    if (outEvent && this._dragger.isActive()) this._dragger.onCancel(outEvent);
  }

  public destroy() {
    this._dragger.off('start', this._onStart);
    this._removeBehaviour();
  }
}
