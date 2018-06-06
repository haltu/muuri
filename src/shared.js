/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Ticker from './Ticker/Ticker.js';

// Library namespace (mainly for error messages).
export var namespace = 'Muuri';

// Keep track of Grid instances.
export var gridInstances = {};

// Shared ticker instance.
export var ticker = new Ticker();

// Event names.
export var eventSynchronize = 'synchronize';
export var eventLayoutStart = 'layoutStart';
export var eventLayoutEnd = 'layoutEnd';
export var eventAdd = 'add';
export var eventRemove = 'remove';
export var eventShowStart = 'showStart';
export var eventShowEnd = 'showEnd';
export var eventHideStart = 'hideStart';
export var eventHideEnd = 'hideEnd';
export var eventFilter = 'filter';
export var eventSort = 'sort';
export var eventMove = 'move';
export var eventSend = 'send';
export var eventBeforeSend = 'beforeSend';
export var eventReceive = 'receive';
export var eventBeforeReceive = 'beforeReceive';
export var eventDragInit = 'dragInit';
export var eventDragStart = 'dragStart';
export var eventDragMove = 'dragMove';
export var eventDragScroll = 'dragScroll';
export var eventDragEnd = 'dragEnd';
export var eventDragReleaseStart = 'dragReleaseStart';
export var eventDragReleaseEnd = 'dragReleaseEnd';
export var eventDestroy = 'destroy';
