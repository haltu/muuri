/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

export default function Pool(createItem, releaseItem) {
  this.pool = [];
  this.createItem = createItem;
  this.releaseItem = releaseItem;
}

Pool.prototype.pick = function () {
  return this.pool.pop() || this.createItem();
};

Pool.prototype.release = function (item) {
  this.releaseItem(item);
  if (this.pool.indexOf(item) !== -1) return;
  this.pool.push(item);
};

Pool.prototype.reset = function () {
  this.pool.length = 0;
};
