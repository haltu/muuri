/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

const unprefixRegEx = /^(webkit|moz|ms|o|Webkit|Moz|MS|O)(?=[A-Z])/;
const cache = new Map<string, string>();

/**
 * Remove any potential vendor prefixes from a property name.
 *
 * @param {string} prop
 * @returns {string}
 */
export default function getUnprefixedPropName(prop: string) {
  let result = cache.get(prop);
  if (result) return result;

  result = prop.replace(unprefixRegEx, '');

  if (result !== prop) {
    result = result[0].toLowerCase() + result.slice(1);
  }

  cache.set(prop, result);

  return result;
}
