(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

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

    assert.notStrictEqual(idList(grid.getItems()), idList(grid._items), 'should return a new array and not a reference to the internal array');
    assert.deepEqual(idList(grid.getItems()), idList(grid._items), 'should return all items in correct order if no arguments are provided');
    assert.deepEqual(idList(grid.getItems(0)), idList([items[0]]), 'should allow providing an index as the first argument');
    assert.deepEqual(idList(grid.getItems(items[0].getElement())), idList([items[0]]), 'should allow providing an element as the first argument');
    assert.deepEqual(idList(grid.getItems(items[0])), idList([items[0]]), 'should allow providing an item as the first argument');
    assert.deepEqual(idList(grid.getItems([0, items[1].getElement(), items[2]])), idList([items[0], items[1], items[2]]), 'should allow providing an array of indices, elements and items as the first argument');

    // Hidden/hiding state.
    grid.show(items, {instant: true, layout: 'instant'}).hide([0, 1], {instant: true, layout: 'instant'}).hide([2, 3], {layout: 'instant'});
    assert.deepEqual(idList(grid.getItems('hidden')), idList([items[0], items[1], items[2], items[3]]), 'should allow providing "hidden" state as the first argument');
    assert.deepEqual(idList(grid.getItems('hiding')), idList([items[2], items[3]]), 'should allow providing "hiding" state as the first argument');

    // Visible/active/showing state.
    grid.hide(items, {instant: true, layout: 'instant'}).show([0, 1], {instant: true, layout: 'instant'}).show([2, 3], {layout: 'instant'});
    assert.deepEqual(idList(grid.getItems('visible')), idList([items[0], items[1], items[2], items[3]]), 'should allow providing "visible" state as the first argument');
    assert.deepEqual(idList(grid.getItems('active')), idList([items[0], items[1], items[2], items[3]]), 'should allow providing "active" state as the first argument');
    assert.deepEqual(idList(grid.getItems('showing')), idList([items[2], items[3]]), 'should allow providing "showing" state as the first argument');
    grid.show(items, {instant: true, layout: 'instant'});

    // Positioning state.
    grid.move(6, 7, {action: 'swap'});
    utils.raf(function () {
      assert.deepEqual(idList(grid.getItems('positioning')), idList([items[7], items[6]]), 'should allow providing "positioning" state as the first argument');
    });

    // Dragging/releasing state.
    grid.on('dragStart', function () {
      assert.deepEqual(idList(grid.getItems('dragging')), idList([item]), 'should allow providing "dragging" state as the first argument');
    });
    grid.on('dragReleaseStart', function () {
      assert.deepEqual(idList(grid.getItems('releasing')), idList([item]), 'should allow providing "releasing" state as the first argument');
    });
    utils.dragElement(item.getElement(), 100, 100, teardown);

  });

})(this);