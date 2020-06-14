/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';
import transformStyle from './transformStyle';

var transformNone = 'none';
var displayInline = 'inline';
var displayNone = 'none';
var displayStyle = 'display';

/**
 * Returns true if element is transformed, false if not. In practice the
 * element's display value must be anything else than "none" or "inline" as
 * well as have a valid transform value applied in order to be counted as a
 * transformed element.
 *
 * Borrowed from Mezr (v0.6.1):
 * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L661
 *
 * @param {HTMLElement} element
 * @returns {Boolean}
 */
export default function isTransformed(element) {
  var transform = getStyle(element, transformStyle);
  if (!transform || transform === transformNone) return false;

  var display = getStyle(element, displayStyle);
  if (display === displayInline || display === displayNone) return false;

  return true;
}
