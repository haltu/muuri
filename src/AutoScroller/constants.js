/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

export var AXIS_X = 1;
export var AXIS_Y = 2;
export var FORWARD = 4;
export var BACKWARD = 8;
export var LEFT = AXIS_X | BACKWARD;
export var RIGHT = AXIS_X | FORWARD;
export var UP = AXIS_Y | BACKWARD;
export var DOWN = AXIS_Y | FORWARD;
