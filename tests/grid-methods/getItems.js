(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('getItems: should return the instance`s items', function (assert) {

    assert.expect(14);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {dragEnabled: true});
    var items = grid.getItems();
    var item = items[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    assert.notStrictEqual(grid.getItems(), grid._items, 'should return a new array and not a reference to the internal array');
    assert.deepEqual(grid.getItems(), grid._items, 'should return all items in correct order if no arguments are provided');
    assert.deepEqual(grid.getItems(0), [items[0]], 'should allow providing an index as the first argument');
    assert.deepEqual(grid.getItems(items[0].getElement()), [items[0]], 'should allow providing an element as the first argument');
    assert.deepEqual(grid.getItems(items[0]), [items[0]], 'should allow providing an item as the first argument');
    assert.deepEqual(grid.getItems([0, items[1].getElement(), items[2]]), [items[0], items[1], items[2]], 'should allow providing an array of indices, elements and items as the first argument');

    // Positioning state.
    grid.move(6, 7, {action: 'swap'});
    items = grid.getItems();
    assert.deepEqual(grid.getItems('positioning'), [items[6], items[7]], 'should allow providing "positioning" state as the first argument');

    // Hidden/hiding state.
    grid.show(items, {instant: true, layout: 'instant'}).hide([0, 1], {instant: true, layout: 'instant'}).hide([2, 3], {layout: 'instant'});
    assert.deepEqual(grid.getItems('hidden'), [items[0], items[1], items[2], items[3]], 'should allow providing "hidden" state as the first argument');
    assert.deepEqual(grid.getItems('hiding'), [items[2], items[3]], 'should allow providing "hiding" state as the first argument');

    // Visible/active/showing state.
    grid.hide(items, {instant: true, layout: 'instant'}).show([0, 1], {instant: true, layout: 'instant'}).show([2, 3], {layout: 'instant'});
    assert.deepEqual(grid.getItems('visible'), [items[0], items[1], items[2], items[3]], 'should allow providing "visible" state as the first argument');
    assert.deepEqual(grid.getItems('active'), [items[0], items[1], items[2], items[3]], 'should allow providing "active" state as the first argument');
    assert.deepEqual(grid.getItems('showing'), [items[2], items[3]], 'should allow providing "showing" state as the first argument');

    // Dragging/releasing state.
    grid.show(items, {instant: true, layout: 'instant'});
    grid.on('dragStart', function () {
      assert.deepEqual(grid.getItems('dragging'), [item], 'should allow providing "dragging" state as the first argument');
    });
    grid.on('dragReleaseStart', function () {
      assert.deepEqual(grid.getItems('releasing'), [item], 'should allow providing "releasing" state as the first argument');
    });
    utils.dragElement(item.getElement(), 100, 100, teardown);

  });

})(this);