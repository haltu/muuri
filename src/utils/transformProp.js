/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getPrefixedPropName from './getPrefixedPropName';

var docElemStyle = window.document.documentElement.style;
var transformProp = getPrefixedPropName(docElemStyle, 'transform') || 'transform';

export default transformProp;
