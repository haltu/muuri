/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { Ticker } from 'tikki';

export const PHASE_READ = Symbol();
export const PHASE_READ_TAIL = Symbol();
export const PHASE_WRITE = Symbol();

export const ticker = new Ticker<string | symbol | number>({
  phases: [PHASE_READ, PHASE_READ_TAIL, PHASE_WRITE],
});
