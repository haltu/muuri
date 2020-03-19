/**
 * Forked from hammer.js:
 * https://github.com/hammerjs/hammer.js/blob/563b5b1e4bfbb5796798dd286cd57b7c56f1eb9e/src/utils/prefixed.js
 */

// Playing it safe here, test all potential prefixes capitalized and lowercase.
var vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];
var cache = {};

/**
 * Get prefixed CSS property name when given a non-prefixed CSS property name.
 * Returns null if the property is not supported at all.
 *
 * @param {CSSStyleDeclaration} style
 * @param {String} prop
 * @returns {String}
 */
export default function getPrefixedPropName(style, prop) {
  var prefixedProp = cache[prop] || '';
  if (prefixedProp) return prefixedProp;

  var camelProp = prop[0].toUpperCase() + prop.slice(1);
  var i = 0;
  while (i < vendorPrefixes.length) {
    prefixedProp = vendorPrefixes[i] ? vendorPrefixes[i] + camelProp : prop;
    if (prefixedProp in style) {
      cache[prop] = prefixedProp;
      return prefixedProp;
    }
    ++i;
  }

  return '';
}
