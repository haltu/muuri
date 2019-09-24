var hasPointerEvents = !!window.PointerEvent;
var hasMsPointerEvents = !!window.navigator.msPointerEnabled;
var pointerout = hasPointerEvents ? 'pointerout' : hasMsPointerEvents ? 'MSPointerOut' : '';
var waitDuration = 100;

/**
 * If you happen to use Edge or IE on a touch capable device there is a
 * a specific case where pointercancel and pointerend events are never emitted,
 * even though one them should always be emitted when you release your finger
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
function EdgeHack(dragger) {
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

  if (pointerout) {
    this._dragger.on('start', this._onStart);
  }
}

/**
 * @private
 * @memberof EdgeHack.prototype
 */
EdgeHack.prototype._addBehaviour = function() {
  if (this._isActive) return;
  this._isActive = true;
  this._dragger.on('move', this._resetData);
  this._dragger.on('cancel', this._removeBehaviour);
  this._dragger.on('end', this._removeBehaviour);
  window.addEventListener(pointerout, this._onOut);
};

/**
 * @private
 * @memberof EdgeHack.prototype
 */
EdgeHack.prototype._removeBehaviour = function() {
  if (!this._isActive) return;
  this._dragger.off('move', this._resetData);
  this._dragger.off('cancel', this._removeBehaviour);
  this._dragger.off('end', this._removeBehaviour);
  window.removeEventListener(pointerout, this._onOut);
  this._resetData();
  this._isActive = false;
};

/**
 * @private
 * @memberof EdgeHack.prototype
 */
EdgeHack.prototype._resetData = function() {
  window.clearTimeout(this._timeout);
  this._timeout = null;
  this._outEvent = null;
};

/**
 * @private
 * @memberof EdgeHack.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
EdgeHack.prototype._onStart = function(e) {
  if (e.pointerType === 'mouse') return;
  this._addBehaviour();
};

/**
 * @private
 * @memberof EdgeHack.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
EdgeHack.prototype._onOut = function(e) {
  if (!this._dragger._getTrackedTouch(e)) return;
  this._resetData();
  this._outEvent = e;
  this._timeout = window.setTimeout(this._onTimeout, waitDuration);
};

/**
 * @private
 * @memberof EdgeHack.prototype
 */
EdgeHack.prototype._onTimeout = function() {
  var e = this._outEvent;
  this._resetData();
  if (this._dragger.isActive()) this._dragger._onCancel(e);
};

/**
 * @public
 * @memberof EdgeHack.prototype
 */
EdgeHack.prototype.destroy = function() {
  if (!pointerout) return;
  this._dragger.off('start', this._onStart);
  this._removeBehaviour();
};

export default EdgeHack;
