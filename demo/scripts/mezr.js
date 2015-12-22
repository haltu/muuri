/*!
 * mezr v0.4.0
 * https://github.com/niklasramo/mezr
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

(function (global, factory) {

  if (typeof define === 'function' && define.amd) {

    define('mezr', [], factory);

  }
  else if (typeof module === 'object' && module.exports) {

    module.exports = global.document ?
      factory(global) :
      function (win) {

        if (!win.document) {
          throw new Error('Mezr requires a window with a document');
        }

        return factory(win);

      };

  }
  else {

    global.mezr = factory(global);

  }

}(typeof window === 'object' && window.window || this, function (win, undefined) {

  'use strict';

  var

  // Cache reference to window, needs some special love to work properly within AMD modules,
  // hence the "|| window" in the end.
  win = win || window,

  // Cache window document and root element.
  doc = win.document,
  root = doc.documentElement,

  // Cache some often used native functions.
  toString = ({}).toString,
  MATH = Math,
  ABS = MATH.abs,
  MAX = MATH.max,
  MIN = MATH.min,

  // Mappings for element edges.
  elemLayers = {
    core: 0,
    padding: 1,
    scroll: 2,
    border: 3,
    margin: 4
  },

  /** @global */
  mezr = {
    width: getWidth,
    height: getHeight,
    offsetParent: getOffsetParent,
    offset: getOffset,
    distance: getDistance,
    intersection: getIntersection,
    place: getPlace
  };

  /**
   * The browser's window object.
   * @typedef {Object} Window
   */

  /**
   * The document contained in browser's window object.
   * @typedef {Object} Document
   */

  /**
   * Any HTML element including root and body elements.
   * @typedef {Object} Element
   */

  /**
   * Any HTML element including root and body elements, window object or document object.
   * @typedef {Object} ElWinDoc
   */

  /**
   * @typedef {Object} Rectangle
   * @property {Number} left - Element's horizontal distance from the left edge of the root element.
   * @property {Number} top - Element's vertical distance from the top edge of the root element.
   * @property {Number} width - Element's height.
   * @property {Number} width - Element's width.
   */

  /**
   * @typedef {object} Offset
   * @property {Number} left - Element's horizontal distance from the left edge of the root element.
   * @property {Number} top - Element's vertical distance from the top edge of the root element.
   */

  /**
   * @typedef {object} Position
   * @property {Number} left - Element's horizontal distance from the left edge of another element.
   * @property {Number} top - Element's vertical distance from the top edge of another element.
   */

  /**
   * @typedef {object} Overlap
   * @property {Number} left
   * @property {Number} top
   * @property {Number} right
   * @property {Number} bottom
   */

  /**
   * All properties accepts the following values: "push", "forcePush" and "none".
   *
   * @typedef {object} Collision
   * @property {string} [left='push']
   * @property {string} [right='push']
   * @property {string} [top='push']
   * @property {string} [bottom='push']
   */

  /**
   * @typedef {Object} PlaceOptions
   * @property {String} [my='left top']
   * @property {String} [at='left top']
   * @property {Array|ElWinDoc|Rectangle} [of=window]
   * @property {?Array|ElWinDoc|Rectangle} [within=null]
   * @property {Number} [offsetX=0]
   * @property {Number} [offsetY=0]
   * @property {?Collision} [collision]
   */

  /**
   * @typedef {Object} PlaceData
   * @property {Number} left - Target element's new left position.
   * @property {Number} top - Target element's new top position.
   * @property {Rectangle} target - Target's dimension and offset data.
   * @property {Rectangle} anchor - Anchor's dimension and offset data.
   * @property {Rectangle} container - Container's dimension and offset data.
   */

  /**
    * Describe an element's vertical or horizontal placement relative to another element. For
    * example, if we wanted to place target's left side to the anchor's right side we would write:
    * "lr", which is short from  "left" and "right".
    * left   -> "l"
    * right  -> "r"
    * top    -> "t"
    * bottom -> "b"
    * center -> "c"
    *
    * @typedef {String} Placement
    */

  /**
   * Returns type of any object in lowercase letters. If "isType" is provided the function will
   * compare the type directly and returns a boolean.
   *
   * @param {Object} obj
   * @param {String} [isType]
   * @returns {Boolean|String}
   */
  function typeOf(obj, isType) {

    var
    type = typeof obj;

    type = type !== 'object' ? type : toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();

    return isType ? type === isType : type;

  }

  /**
   * Check if an object is a DOM HTML element that can be visible and have styling. More accurately
   * this method specifically checks if the provided object is the root element, body element or an
   * element within the body element.
   *
   * @param {Object} elem
   * @returns {Boolean}
   */
  function isElem(elem) {

    return elem === root || elem === doc.body || (typeOf(elem).indexOf('html') > -1 && doc.body.contains(elem));

  }

  /**
   * Customized parseFloat function which returns 0 instead of NaN.
   *
   * @param {Number|String} val
   * @returns {Number}
   */
  function toFloat(val) {

    return parseFloat(val) || 0;

  }

  /**
   * Sanitize edge layer argument.
   *
   * @param {Number|String} edgeLayer
   * @returns {Number}
   */
  function sanitizeEdgeLayer(edgeLayer) {

    edgeLayer = typeOf(edgeLayer, 'number') ? edgeLayer : elemLayers[edgeLayer] !== undefined ? elemLayers[edgeLayer] : 3;

    return edgeLayer > -1 && edgeLayer < 5 ? edgeLayer : 3;

  }

  /**
   * Deep merge an array of objects into a new object.
   *
   * @param {Array} array
   * @returns {Object}
   */
  function mergeObjects(array) {

    var
    obj = {},
    len = array.length,
    propName,
    propType,
    propVal,
    i;

    for (i = 0; i < len; i++) {

      for (propName in array[i]) {

        if (array[i].hasOwnProperty(propName)) {

          propVal = array[i][propName];
          propType = typeOf(propVal);
          obj[propName] = propType === 'object' ? mergeObjects([propVal]) :
                          propType === 'array'  ? propVal.slice() :
                                                  propVal;

        }

      }

    }

    return obj;

  }

  /**
   * Returns the computed value of an element's style property as a string.
   *
   * @param {Element} el
   * @param {String} style
   * @returns {String}
   */
  function getStyle(el, style) {

    return win.getComputedStyle(el, null).getPropertyValue(style);

  }

  /**
   * Returns an object containing the provided element's dimensions and offsets. If element is an
   * array the function uses the array's values as arguments for internal getWidth and getHeight
   * functions. Returns null if falsy parameter is provided.
   *
   * @param {Array|ElWinDoc|Rectangle} el
   * @returns {?Rectangle}
   */
  function getRect(el) {

    if (!el) {

      return null;

    }

    var
    type = typeOf(el),
    offset,
    elem,
    edgeLayer,
    ret;

    if (type === 'object') {

      return el;

    }
    else {

      if (type === 'array') {

        elem = el[0];
        edgeLayer = sanitizeEdgeLayer(el[1]);

      }
      else {

        elem = el;

      }

      ret = getOffset(elem, edgeLayer);
      ret.width = getWidth(elem, edgeLayer);
      ret.height = getHeight(elem, edgeLayer);

      return ret;

    }

  }

  /**
   * Calculates how much element overlaps another element from each side.
   *
   * @param {Array|ElWinDoc|Rectangle} a
   * @param {Array|ElWinDoc|Rectangle} b
   * @returns {Overlap}
   */
  function getOverlap(a, b) {

    a = getRect(a);
    b = getRect(b);

    return {
      left: a.left - b.left,
      right: (b.left + b.width) - (a.left + a.width),
      top: a.top - b.top,
      bottom: (b.top + b.height) - (a.top + a.height)
    };

  }

  /**
   * Calculates the distance between two points in 2D space.
   *
   * @param {Number} aLeft
   * @param {Number} aTop
   * @param {Number} bLeft
   * @param {Number} bTop
   * @returns {Number}
   */
  function getPointDistance(aLeft, aTop, bLeft, bTop) {

    return MATH.sqrt(MATH.pow(bLeft - aLeft, 2) + MATH.pow(bTop - aTop, 2));

  }

  /**
   * Calculates the distance between two unrotated rectangles in 2D space. This function assumes
   * that the rectangles do not intersect.
   *
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   */
  function getRectDistance(a, b) {

    var
    ret = 0,
    aLeft = a.left,
    aRight = aLeft + b.width,
    aTop = a.top,
    aBottom = aTop + b.height,
    bLeft = b.left,
    bRight = bLeft + b.width,
    bTop = b.top,
    bBottom = bTop + b.height;

    // Calculate shortest corner distance
    if ((bLeft > aRight || bRight < aLeft) && (bTop > aBottom || bBottom < aTop)) {

      if (bLeft > aRight) {

        ret = bBottom < aTop ? getPointDistance(aRight, aTop, bLeft, bBottom) : getPointDistance(aRight, aBottom, bLeft, bTop);

      }
      else {

        ret = bBottom < aTop ? getPointDistance(aLeft, aTop, bRight, bBottom) : getPointDistance(aLeft, aBottom, bRight, bTop);

      }

    }

    // Calculate shortest edge distance
    else {

      ret = bBottom < aTop ? aTop - bBottom :
            bLeft > aRight ? bLeft - aRight :
            bTop > aBottom ? bTop - aBottom :
                             aLeft - bRight ;

    }

    return ret;

  }

  /**
   * Returns the height/width of an element in pixels. The function also accepts the window object
   * (for obtaining the viewport dimensions) and the document object (for obtaining the dimensions
   * of the document) in place of element. Note that this function considers root element's
   * scrollbars as the document's and window's scrollbars also. Since the root element's
   * scrollbars are always stuck on the right/bottom edge of the window (even if you specify width
   * and/or height to root element) they are generally referred to as viewport scrollbars in the
   * docs. Also note that negative margins are ignored when includeMargin argument is true.
   *
   * @param {String} dimension - Accepts "width" or "height".
   * @param {ElWinDoc} el
   * @param {Boolean} [includeScrollbar=false]
   * @param {Boolean} [includePadding=false]
   * @param {Boolean} [includeBorder=false]
   * @param {Boolean} [includeMargin=false]
   * @returns {Number}
   */
  function getDimension(dimension, el, includeScrollbar, includePadding, includeBorder, includeMargin) {

    var
    ret,
    isHeight = dimension === 'height',
    dimensionCapitalized = isHeight ? 'Height' : 'Width',
    innerDimension = 'inner' + dimensionCapitalized,
    clientDimension = 'client' + dimensionCapitalized,
    scrollDimension = 'scroll' + dimensionCapitalized,
    sbSize,
    edgeA,
    edgeB,
    borderA,
    borderB,
    marginA,
    marginB;

    if (el.self === win.self) {

      ret = includeScrollbar ? win[innerDimension] : root[clientDimension];

    }
    else if (el === doc) {

      if (includeScrollbar) {

        sbSize = win[innerDimension] - root[clientDimension];
        ret = MAX(root[scrollDimension] + sbSize, doc.body[scrollDimension] + sbSize, win[innerDimension]);

      } else {

        ret = MAX(root[scrollDimension], doc.body[scrollDimension], root[clientDimension]);

      }

    }
    else {

      ret = el.getBoundingClientRect()[dimension];
      edgeA = isHeight ? 'top' : 'left';
      edgeB = isHeight ? 'bottom' : 'right';

      if (!includeScrollbar) {

        if (el === root) {

          ret -= win[innerDimension] - root[clientDimension];

        }
        else {

          borderA = toFloat(getStyle(el, 'border-' + edgeA + '-width'));
          borderB = toFloat(getStyle(el, 'border-' + edgeB + '-width'));
          ret -= MATH.round(ret) - el[clientDimension] - borderA - borderB;

        }

      }

      if (!includePadding) {

        ret -= toFloat(getStyle(el, 'padding-' + edgeA));
        ret -= toFloat(getStyle(el, 'padding-' + edgeB));

      }

      if (!includeBorder) {

        ret -= borderA !== undefined ? borderA : toFloat(getStyle(el, 'border-' + edgeA + '-width'));
        ret -= borderB !== undefined ? borderB : toFloat(getStyle(el, 'border-' + edgeB + '-width'));

      }

      if (includeMargin) {

        marginA = toFloat(getStyle(el, 'margin-' + edgeA));
        marginB = toFloat(getStyle(el, 'margin-' + edgeB));
        ret += marginA > 0 ? marginA : 0;
        ret += marginB > 0 ? marginB : 0;

      }

    }

    return ret;

  }

  /**
   * Returns the width of an element in pixels. Accepts also the window object (for getting the
   * viewport width) and the document object (for getting the document width) in place of element.
   *
   * Edges:
   * 0 -> "core"
   * 1 -> "padding"
   * 2 -> "scroll"
   * 3 -> "border" (default)
   * 4 -> "margin"
   *
   * @param {ElWinDoc} el
   * @param {Number} [edgeLayer='border']
   * @returns {Number}
   */
  function getWidth(el, edgeLayer) {

    edgeLayer = sanitizeEdgeLayer(edgeLayer);

    return getDimension('width', el, edgeLayer > 1, edgeLayer > 0, edgeLayer > 2, edgeLayer > 3);

  }

  /**
   * Returns the height of an element in pixels. Accepts also the window object (for getting the
   * viewport height) and the document object (for getting the document height) in place of element.
   *
   * Edges:
   * 0 -> "core"
   * 1 -> "padding"
   * 2 -> "scroll"
   * 3 -> "border" (default)
   * 4 -> "margin"
   *
   * @param {ElWinDoc} el
   * @param {Number} [edgeLayer='border']
   * @returns {Number}
   */
  function getHeight(el, edgeLayer) {

    edgeLayer = sanitizeEdgeLayer(edgeLayer);

    return getDimension('height', el, edgeLayer > 1, edgeLayer > 0, edgeLayer > 2, edgeLayer > 3);

  }

  /**
   * Returns the element's offset, which in practice means the vertical and horizontal distance
   * between the element's northwest corner and the document's northwest corner. The edgeLayer
   * argument controls which layer (core, padding, scroll, border, margin) of the element is
   * considered as the edge of the element for calculations. For example, if the edgeLayer is set to
   * 1 or "padding" the element's margins and borders will be added to the offsets. Note that
   * setting the edgeLayer value to "padding" or "scroll" will always produce identical result here
   * due to the way scrollbars behave, but the "scroll" option is left here intentionally to match
   * with the syntax of width and height methods.
   *
   * Edges:
   * 0 -> "core"
   * 1 -> "padding"
   * 2 -> "scroll"
   * 3 -> "border" (default)
   * 4 -> "margin"
   *
   * @param {ElWinDoc} el
   * @param {Number} [edgeLayer='border']
   * @returns {Offset}
   */
  function getOffset(el, edgeLayer) {

    var
    offsetLeft = 0,
    offsetTop = 0,
    viewportScrollLeft = toFloat(win.pageXOffset),
    viewportScrollTop = toFloat(win.pageYOffset),
    gbcr,
    marginLeft,
    marginTop;

    // Sanitize edgeLayer argument.
    edgeLayer = sanitizeEdgeLayer(edgeLayer);

    // For window we just need to get viewport's scroll distance.
    if (el.self === win.self) {

      offsetLeft = viewportScrollLeft;
      offsetTop = viewportScrollTop;

    }

    // For all elements except the document and window we can use the combination of gbcr and
    // viewport's scroll distance.
    else if (el !== doc) {

      gbcr = el.getBoundingClientRect();
      offsetLeft += gbcr.left + viewportScrollLeft;
      offsetTop += gbcr.top + viewportScrollTop;

      // Exclude element's positive margin size from the offset.
      if (edgeLayer === 4) {

        marginLeft = toFloat(getStyle(el, 'margin-left'));
        marginTop = toFloat(getStyle(el, 'margin-top'));
        offsetLeft -=  marginLeft > 0 ? marginLeft : 0;
        offsetTop -= marginTop > 0 ? marginTop : 0;

      }

      // Include element's border size to the offset.
      if (edgeLayer < 3) {

        offsetLeft += toFloat(getStyle(el, 'border-left-width'));
        offsetTop += toFloat(getStyle(el, 'border-top-width'));

      }

      // Include element's padding size to the offset.
      if (edgeLayer === 0) {

        offsetLeft += toFloat(getStyle(el, 'padding-left'));
        offsetTop += toFloat(getStyle(el, 'padding-top'));

      }

    }

    return {
      left: offsetLeft,
      top: offsetTop
    };

  }

  /**
   * Returns an element's northwest offset which in this case means the element's offset in a state
   * where the element's left and top CSS properties are set to 0.
   *
   * @param {Array|ElWinDoc} el
   * @returns {Offset}
   */
  function getNorthwestOffset(el) {

    var
    isArray = typeOf(el, 'array'),
    elem = isArray ? el[0] : el,
    edgeLayer = sanitizeEdgeLayer(isArray && el[1]),
    position = getStyle(elem, 'position'),
    offset,
    left,
    right,
    top,
    bottom;

    if (position === 'relative') {

      offset = getOffset(elem, edgeLayer);
      left = getStyle(elem, 'left');
      right = getStyle(elem, 'right');
      top = getStyle(elem, 'top');
      bottom = getStyle(elem, 'bottom');

      if (left !== 'auto' || right !== 'auto') {

        offset.left -= left === 'auto' ? -toFloat(right) : toFloat(left);

      }

      if (top !== 'auto' || bottom !== 'auto') {

        offset.top -= top === 'auto' ? -toFloat(bottom) : toFloat(top);

      }

    } else if (position === 'static') {

      offset = getOffset(elem, edgeLayer);

    } else {

      offset = getOffset(getOffsetParent(elem) || doc, 'padding');

      var
      marginLeft = toFloat(getStyle(elem, 'margin-left')),
      marginTop = toFloat(getStyle(elem, 'margin-top')),
      borderLeft,
      borderTop,
      paddingLeft,
      paddingTop;

      // If edge layer is "margin" remove negative left/top
      // margins from offset to account for their effect on
      // position.
      if (edgeLayer > 3) {

        offset.left -= ABS(MIN(marginLeft, 0));
        offset.top -= ABS(MIN(marginTop, 0));

      }

      // If edge layer is "border" or smaller add positive
      // left/top margins and remove negative left/top margins
      // from offset to account for their effect on position.
      if (edgeLayer < 4) {

        offset.left += marginLeft;
        offset.top += marginTop;

      }

      // If edge layer is "scroll" or smaller add left/top
      // borders to offset to account for their effect on position.
      if (edgeLayer < 3) {

        borderLeft = toFloat(getStyle(elem, 'border-left-width'));
        borderTop = toFloat(getStyle(elem, 'border-top-width'));
        offset.left += borderLeft;
        offset.top += borderTop;

      }

      // If edge layer is "core" add left/top paddings to
      // offset to account for their effect on position.
      if (edgeLayer < 1) {

        paddingLeft = toFloat(getStyle(elem, 'padding-left'));
        paddingTop = toFloat(getStyle(elem, 'padding-top'));
        offset.left += paddingLeft;
        offset.top += paddingTop;

      }

    }

    return offset;

  }

  /**
   * Returns the element's offset parent. This function works in the same manner as the native
   * elem.offsetParent method with a few tweaks and logic changes. The function accepts the window
   * object and the document object in addition to DOM elements. Document object is considered as
   * the base offset point against which the element/window offsets are compared to. This in turn
   * means that the document object does not have an offset parent and returns null if provided as
   * the element. Document is also considered as the window's offset parent. Window is considered as
   * the offset parent of all fixed elements. Root and body elements are treated equally with all
   * other DOM elements. For example body's offset parent is the root element if root element is
   * positioned, but if the root element is static the body's offset parent is the document object.
   *
   * @param {ElWinDoc} el
   * @returns {?ElWinDoc}
   */
  function getOffsetParent(el) {

    var
    body = doc.body,
    isDomElement = isElem(el),
    pos = isDomElement && getStyle(el, 'position'),
    offsetParent = pos === 'fixed' ? win :
                   el === body ? root :
                   el === root || el === win ? doc :
                   isDomElement ? el.offsetParent :
                   null;

    while (offsetParent && isElem(offsetParent) && getStyle(offsetParent, 'position') === 'static') {

      offsetParent = offsetParent === body ? root : offsetParent.offsetParent || doc;

    }

    return offsetParent;

  }

  /**
   * Calculate the distance between two elements or rectangles. The element data is fetched with
   * internal getRect function which means you can specify an element directly, use an array for
   * more control over paddings and borders (see arguments for mezr.width/height()) or just provide
   * dimensions and offset directly in an object. Returns a number. If the elements/rectangles
   * overlap the function returns always -1. In other cases the function returns the distance in
   * pixels (fractional) between the the two elements/rectangles.
   *
   * @param {Array|ElWinDoc|Rectangle} a
   * @param {Array|ElWinDoc|Rectangle} b
   * @returns {Number}
   */
  function getDistance(a, b) {

    var
    aRect = getRect(a),
    bRect = getRect(b);

    return getIntersection(aRect, bRect) ? -1 : getRectDistance(aRect, bRect);

  }

  /**
   * Detect if two elements overlap and calculate the possible intersection area's dimensions and
   * offsets. Returns a boolean by default which indicates whether or not the two elements overlap.
   * Optionally one can set the third argument *returnData* to true and make the function return the
   * intersection's dimensions and offsets.
   *
   * @param {Array|ElWinDoc|Rectangle} a
   * @param {Array|ElWinDoc|Rectangle} b
   * @param {Boolean} [returnData=false]
   * @returns {?Boolean|Rectangle}
   */
  function getIntersection(a, b, returnData) {

    var
    aRect = getRect(a),
    bRect = getRect(b),
    overlap = getOverlap(aRect, bRect),
    intWidth = MAX(aRect.width + MIN(overlap.left, 0) + MIN(overlap.right, 0), 0),
    intHeight = MAX(aRect.height + MIN(overlap.top, 0) + MIN(overlap.bottom, 0), 0),
    hasIntersection = intWidth > 0 && intHeight > 0;

    return !returnData ? hasIntersection : !hasIntersection ? null : {
      width: intWidth,
      height: intHeight,
      left: aRect.left + ABS(MIN(overlap.left, 0)),
      top: aRect.top + ABS(MIN(overlap.top, 0))
    };

  }

  /**
   * Calculate an element's position (left/top CSS properties) when positioned relative to another
   * element, window or the document.
   *
   * @param {Array|ElWinDoc} el
   * @param {PlaceOptions} [options]
   * @returns {PlaceData}
   */
  function getPlace(el, options) {

    var
    o = getPlaceOptions(el, options),
    collision = o.collision,
    target = getRect(el),
    anchor = getRect(o.of),
    container = getRect(o.within),
    targetNwOffset = getNorthwestOffset(el),
    containerOverlap,
    ret = {
      target: target,
      anchor: anchor,
      container: container
    };

    // Calculate element's new position (left/top coordinates).
    ret.left = getPlacePosition(o.my[0] + o.at[0], anchor.width, anchor.left, target.width, targetNwOffset.left, o.offsetX);
    ret.top = getPlacePosition(o.my[1] + o.at[1], anchor.height, anchor.top, target.height, targetNwOffset.top, o.offsetY);

    // Update element offset data to match the newly calculated position.
    target.left = ret.left + targetNwOffset.left;
    target.top = ret.top + targetNwOffset.top;

    // If container is defined, let's add overlap data and handle collisions.
    if (container !== null) {

      containerOverlap = getOverlap(target, container);

      if (collision) {

        ret.left += getPlaceCollision(collision, containerOverlap);
        ret.top += getPlaceCollision(collision, containerOverlap, 1);
        target.left = ret.left + targetNwOffset.left;
        target.top = ret.left + targetNwOffset.top;

      }

    }

    return ret;

  }

  /**
   * Merges default options with the instance options and sanitizes the new options.
   *
   * @param {ElWinDoc} el
   * @param {PlaceOptions} [options]
   * @returns {Object}
   */
  function getPlaceOptions(el, options) {

    var
    defaults = getPlace.defaults,
    optName,
    optType,
    optVal;

    // Merge user options with default options.
    options = mergeObjects(typeOf(options, 'object') ? [defaults, options] : [defaults]);

    for (optName in options) {

      optVal = options[optName];
      optType = typeOf(optVal);

      // If option is declared as a function let's execute it right here.
      if (optType === 'function') {

        options[optName] = optVal(el);

      }

      // Transform my and at positions into an array using the first character of the position's
      // name. For example, "center top" becomes ["c", "t"].
      if (optName === 'my' || optName === 'at') {

        optVal = optVal.split(' ');
        optVal[0] = optVal[0].charAt(0);
        optVal[1] = optVal[1].charAt(0);
        options[optName] = optVal;

      }

      // Make sure offsets are numbers.
      if (optName === 'offsetX' || optName === 'offsetY') {

        options[optName] = toFloat(optVal);

      }

      // Make sure collision is an object or null.
      if (optName === 'collision' && optType !== 'object') {

        options[optName] = null;

      }

    }

    return options;

  }

  /**
   * Returns the horizontal or vertical base position of a target element relative to an anchor
   * element. In other words, this function returns the value which should set as the target
   * element's left/top CSS value in order to position it according to the placement argument.
   *
   * @param {Placement} placement
   * @param {Number} anchorSize - Target's width/height in pixels.
   * @param {Number} anchorOffset - Target's left/top offset in pixels.
   * @param {Number} targetSize - Target's width/height in pixels.
   * @param {Number} targetNwOffset - Target's left/top northwest offset in pixels.
   * @param {Number} extraOffset - Additional left/top offset in pixels.
   * @returns {Number}
   */
  function getPlacePosition(placement, anchorSize, anchorOffset, targetSize, targetNwOffset, extraOffset) {

    var
    northwestPoint = anchorOffset + extraOffset - targetNwOffset;

    return placement === 'll' || placement === 'tt' ? northwestPoint :
           placement === 'lc' || placement === 'tc' ? northwestPoint + (anchorSize / 2) :
           placement === 'lr' || placement === 'tb' ? northwestPoint + anchorSize :
           placement === 'cl' || placement === 'ct' ? northwestPoint - (targetSize / 2) :
           placement === 'cr' || placement === 'cb' ? northwestPoint + anchorSize - (targetSize / 2) :
           placement === 'rl' || placement === 'bt' ? northwestPoint - targetSize :
           placement === 'rc' || placement === 'bc' ? northwestPoint - targetSize + (anchorSize / 2) :
           placement === 'rr' || placement === 'bb' ? northwestPoint - targetSize + anchorSize :
                                                      northwestPoint + (anchorSize / 2) - (targetSize / 2);

  }

  /**
   * Calculates the distance in pixels that the target element needs to be moved in order to be
   * aligned correctly if the target element overlaps with the container.
   *
   * @param {Collision} collision
   * @param {Overlap} targetOverlap
   * @param {Boolean} isVertical
   * @returns {Number}
   */
  function getPlaceCollision(collision, targetOverlap, isVertical) {

    var
    ret = 0,
    push = 'push',
    forcePush = 'forcePush',
    sideA = isVertical ? 'top' : 'left',
    sideB = isVertical ? 'bottom' : 'right',
    sideACollision = collision[sideA],
    sideBCollision = collision[sideB],
    sideAOverlap = targetOverlap[sideA],
    sideBOverlap = targetOverlap[sideB],
    sizeDifference = sideAOverlap + sideBOverlap;

    // If pushing is needed from both sides.
    if ((sideACollision === push || sideACollision === forcePush) && (sideBCollision === push || sideBCollision === forcePush) && (sideAOverlap < 0 || sideBOverlap < 0)) {

      // Do push correction from opposite sides with equal force.
      if (sideAOverlap < sideBOverlap) {

        ret -= sizeDifference < 0 ? sideAOverlap + ABS(sizeDifference / 2) : sideAOverlap;

      }

      // Do push correction from opposite sides with equal force.
      if (sideBOverlap < sideAOverlap) {

        ret += sizeDifference < 0 ? sideBOverlap + ABS(sizeDifference / 2) : sideBOverlap;

      }

      // Update overlap data.
      sideAOverlap += ret;
      sideBOverlap -= ret;

      // Check if left/top side forced push correction is needed.
      if (sideACollision === forcePush && sideBCollision != forcePush && sideAOverlap < 0) {

        ret -= sideAOverlap;

      }

      // Check if right/top side forced push correction is needed.
      if (sideBCollision === forcePush && sideACollision != forcePush && sideBOverlap < 0) {

        ret += sideBOverlap;

      }

    }

    // Check if pushing is needed from left or top side only.
    else if ((sideACollision === forcePush || sideACollision === push) && sideAOverlap < 0) {

      ret -= sideAOverlap;

    }

    // Check if pushing is needed from right or bottom side only.
    else if ((sideBCollision === forcePush || sideBCollision === push) && sideBOverlap < 0) {

      ret += sideBOverlap;

    }

    return ret;

  }

  // Define default options for getPlace method.
  getPlace.defaults = {
    my: 'left top',
    at: 'left top',
    of: win,
    within: null,
    offsetX: 0,
    offsetY: 0,
    collision: {
      left: 'push',
      right: 'push',
      top: 'push',
      bottom: 'push'
    }
  };

  return mezr;

}));