/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

// Set up the default export values.
export var isTransformSupported = false;
export var transformStyle = 'transform';
export var transformProp = 'transform';

// Find the supported transform prop and style names.
var style = 'transform';
var styleCap = 'Transform';
['', 'Webkit', 'Moz', 'O', 'ms'].forEach(function(prefix) {
  if (isTransformSupported) return;
  var propName = prefix ? prefix + styleCap : style;
  if (document.documentElement.style[propName] !== undefined) {
    prefix = prefix.toLowerCase();
    transformStyle = prefix ? '-' + prefix + '-' + style : style;
    transformProp = propName;
    isTransformSupported = true;
  }
});
