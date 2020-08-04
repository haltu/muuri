/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

export var GRID_INSTANCES = {};
export var ITEM_ELEMENT_MAP = typeof Map === 'function' ? new Map() : null;

export var ACTION_SWAP = 'swap';
export var ACTION_MOVE = 'move';

export var EVENT_SYNCHRONIZE = 'synchronize';
export var EVENT_LAYOUT_START = 'layoutStart';
export var EVENT_LAYOUT_END = 'layoutEnd';
export var EVENT_LAYOUT_ABORT = 'layoutAbort';
export var EVENT_ADD = 'add';
export var EVENT_REMOVE = 'remove';
export var EVENT_SHOW_START = 'showStart';
export var EVENT_SHOW_END = 'showEnd';
export var EVENT_HIDE_START = 'hideStart';
export var EVENT_HIDE_END = 'hideEnd';
export var EVENT_FILTER = 'filter';
export var EVENT_SORT = 'sort';
export var EVENT_MOVE = 'move';
export var EVENT_SEND = 'send';
export var EVENT_BEFORE_SEND = 'beforeSend';
export var EVENT_RECEIVE = 'receive';
export var EVENT_BEFORE_RECEIVE = 'beforeReceive';
export var EVENT_DRAG_INIT = 'dragInit';
export var EVENT_DRAG_START = 'dragStart';
export var EVENT_DRAG_MOVE = 'dragMove';
export var EVENT_DRAG_SCROLL = 'dragScroll';
export var EVENT_DRAG_END = 'dragEnd';
export var EVENT_DRAG_RELEASE_START = 'dragReleaseStart';
export var EVENT_DRAG_RELEASE_END = 'dragReleaseEnd';
export var EVENT_DESTROY = 'destroy';

export var HAS_TOUCH_EVENTS = 'ontouchstart' in window;
export var HAS_POINTER_EVENTS = !!window.PointerEvent;
export var HAS_MS_POINTER_EVENTS = !!window.navigator.msPointerEnabled;

export var UA = window.navigator.userAgent.toLowerCase();
export var IS_EDGE = UA.indexOf('edge') > -1;
export var IS_IE = UA.indexOf('trident') > -1;
export var IS_FIREFOX = UA.indexOf('firefox') > -1;
export var IS_ANDROID = UA.indexOf('android') > -1;
export var IS_IOS =
  /^(iPad|iPhone|iPod)/.test(window.navigator.platform) ||
  (/^Mac/.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1);

export var MAX_SAFE_FLOAT32_INTEGER = 16777216;

export var VIEWPORT_THRESHOLD = 100;
