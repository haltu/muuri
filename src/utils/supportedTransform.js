/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

// Set up the default export values.
export var transformStyle = 'transform';
export var transformProp = 'transform';

// Find the supported transform prop and style names.
var docElemStyle = window.document.documentElement.style;
var style = 'transform';
var styleCap = 'Transform';
var found = false;
['', 'Webkit', 'Moz', 'O', 'ms'].forEach(function(prefix) {
  if (found) return;
  var propName = prefix ? prefix + styleCap : style;
  if (docElemStyle[propName] !== undefined) {
    prefix = prefix.toLowerCase();
    transformStyle = prefix ? '-' + prefix + '-' + style : style;
    transformProp = propName;
    found = true;
  }
});
