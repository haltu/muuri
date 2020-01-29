/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getPrefixedPropName from './getPrefixedPropName';

var transformProp = getPrefixedPropName(document.documentElement.style, 'transform') || 'transform';

export default transformProp;
