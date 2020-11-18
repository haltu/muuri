/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

const styleNameRegEx = /([A-Z])/g;
const prefixRegex = /^(webkit-|moz-|ms-|o-)/;
const msPrefixRegex = /^(-m-s-)/;

/**
 * Transforms a camel case style property to kebab case style property. Handles
 * vendor prefixed properties elegantly as well, e.g. "WebkitTransform" and
 * "webkitTransform" are both transformed into "-webkit-transform".
 *
 * @param {string} property
 * @returns {string}
 */
export default function getStyleName(styleProp: string) {
  // Initial slicing, turns "fooBarProp" into "foo-bar-prop".
  let styleName = styleProp.replace(styleNameRegEx, '-$1').toLowerCase();

  // Handle properties that start with "webkit", "moz", "ms" or "o" prefix (we
  // need to add an extra '-' to the beginnig).
  styleName = styleName.replace(prefixRegex, '-$1');

  // Handle properties that start with "MS" prefix (we need to transform the
  // "-m-s-" into "-ms-").
  styleName = styleName.replace(msPrefixRegex, '-ms-');

  return styleName;
}
