/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var id = 0;

/**
 * Returns a unique numeric id (increments a base value on every call).
 * @returns {Number}
 */
export default function createUid() {
  return ++id;
}
