/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var unprefixRegEx = /^(webkit|moz|ms|o|Webkit|Moz|MS|O)(?=[A-Z])/;

/**
 * Remove any potential vendor prefixes from a property name.
 *
 * @param {String} prop
 * @returns {String}
 */
export default function getUnprefixedPropName(prop) {
  var result = prop.replace(unprefixRegEx, '');

  if (result === prop) {
    return prop;
  }

  return result[0].toLowerCase() + result.slice(1);
}
