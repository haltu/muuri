/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var styleNameRegEx = /([A-Z])/g;

/**
 * Transforms a camel case style property to kebab case style property.
 *
 * @param {String} string
 * @returns {String}
 */
export default function getStyleName(string) {
  return string.replace(styleNameRegEx, '-$1').toLowerCase();
}
