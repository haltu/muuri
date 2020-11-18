/**
 * Forked from hammer.js:
 * https://github.com/hammerjs/hammer.js/blob/563b5b1e4bfbb5796798dd286cd57b7c56f1eb9e/src/utils/prefixed.js
 */

// Playing it safe here, test all potential prefixes capitalized and lowercase.
const vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];
const cache = new Map<string, string>();

/**
 * Get prefixed CSS property name when given a non-prefixed CSS property name.
 * Returns null if the property is not supported at all.
 *
 * @param {CSSStyleDeclaration} style
 * @param {string} prop
 * @returns {string}
 */
export default function getPrefixedPropName(style: CSSStyleDeclaration, styleProp: string) {
  let prefixedProp = cache.get(styleProp);
  if (prefixedProp) return prefixedProp;

  const camelProp = styleProp[0].toUpperCase() + styleProp.slice(1);
  let i = 0;
  while (i < vendorPrefixes.length) {
    prefixedProp = vendorPrefixes[i] ? vendorPrefixes[i] + camelProp : styleProp;
    if (prefixedProp in style) {
      cache.set(styleProp, prefixedProp);
      return prefixedProp;
    }
    ++i;
  }

  return '';
}
