/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { Item, Grid } from './types';

export const GRID_INSTANCES: { [gridId: number]: Grid } = {};
export const ITEM_ELEMENT_MAP: Map<HTMLElement, Item> = new Map();

export const ACTION_SWAP = 'swap';
export const ACTION_MOVE = 'move';

export const EVENT_SYNCHRONIZE = 'synchronize';
export const EVENT_LAYOUT_START = 'layoutStart';
export const EVENT_LAYOUT_END = 'layoutEnd';
export const EVENT_LAYOUT_ABORT = 'layoutAbort';
export const EVENT_ADD = 'add';
export const EVENT_REMOVE = 'remove';
export const EVENT_SHOW_START = 'showStart';
export const EVENT_SHOW_END = 'showEnd';
export const EVENT_HIDE_START = 'hideStart';
export const EVENT_HIDE_END = 'hideEnd';
export const EVENT_FILTER = 'filter';
export const EVENT_SORT = 'sort';
export const EVENT_MOVE = 'move';
export const EVENT_SEND = 'send';
export const EVENT_BEFORE_SEND = 'beforeSend';
export const EVENT_RECEIVE = 'receive';
export const EVENT_BEFORE_RECEIVE = 'beforeReceive';
export const EVENT_DRAG_INIT = 'dragInit';
export const EVENT_DRAG_START = 'dragStart';
export const EVENT_DRAG_MOVE = 'dragMove';
export const EVENT_DRAG_SCROLL = 'dragScroll';
export const EVENT_DRAG_END = 'dragEnd';
export const EVENT_DRAG_RELEASE_START = 'dragReleaseStart';
export const EVENT_DRAG_RELEASE_END = 'dragReleaseEnd';
export const EVENT_DESTROY = 'destroy';

export const HAS_TOUCH_EVENTS = 'ontouchstart' in window;
export const HAS_POINTER_EVENTS = !!window.PointerEvent;
export const HAS_MS_POINTER_EVENTS = !!window.navigator.msPointerEnabled;

export const UA = window.navigator.userAgent.toLowerCase();
export const IS_EDGE = UA.indexOf('edge') > -1;
export const IS_IE = UA.indexOf('trident') > -1;
export const IS_FIREFOX = UA.indexOf('firefox') > -1;
export const IS_ANDROID = UA.indexOf('android') > -1;
export const IS_IOS =
  /^(iPad|iPhone|iPod)/.test(window.navigator.platform) ||
  (/^Mac/.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1);

export const MAX_SAFE_FLOAT32_INTEGER = 16777216;

export const VIEWPORT_THRESHOLD = 100;
