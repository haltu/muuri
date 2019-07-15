/**
 * Forked from hammer.js:
 * https://github.com/hammerjs/hammer.js/blob/563b5b1e4bfbb5796798dd286cd57b7c56f1eb9e/src/utils/prefixed.js
 */

var vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];

/**
 * Get prefixed CSS property name when given a non-prefixed CSS property name.
 * @param {Object} elemStyle
 * @param {String} propName
 * @returns {!String}
 */
export default function getPrefixedPropName(elemStyle, propName) {
  var camelPropName = propName[0].toUpperCase() + propName.slice(1);
  var i = 0;
  var prefix;
  var prefixedPropName;

  while (i < vendorPrefixes.length) {
    prefix = vendorPrefixes[i];
    prefixedPropName = prefix ? prefix + camelPropName : propName;
    if (prefixedPropName in elemStyle) return prefixedPropName;
    ++i;
  }

  return null;
}
