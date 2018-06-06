(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('show: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.show(0), grid);
    teardown();

  });

  QUnit.test('show: should accept an item, element or an index (or an array of them) as the first argument', function (assert) {

    assert.expect(5);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(items, {instant: true});
    assert.strictEqual(utils.getVisibleItems(grid).length, 0, 'there should be no visible items before the tests commence');

    grid.show(0);
    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList(items.slice(0, 1)), 'should accept an index as the first argument');

    grid.show(items[1]);
    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList(items.slice(0, 2)), 'should accept an item as the first argument');

    grid.show(items[2].getElement());
    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList(items.slice(0, 3)), 'should accept an element as the first argument');

    grid.show([3, items[4].getElement(), items[5]]);
    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList(items.slice(0, 6)), 'should accept an array of items, elements and indices as the first argument');

    teardown();

  });

  QUnit.test('show: should not show instantly by default', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(items, {instant: true}).show(0);
    assert.deepEqual(idList(utils.getShowingItems(grid)), idList(items.slice(0, 1)));

    teardown();

  });

  QUnit.test('show: should show instantly if instant option is true', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(items, {instant: true}).show(0, {instant: true});
    assert.deepEqual(items[0].isShowing(), false);
    assert.deepEqual(items[0].isVisible(), true);

    teardown();

  });

  QUnit.test('show: should call the onFinish callback once the animation is finished', function (assert) {

    assert.expect(5);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var argItems = null;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid
    .on('showEnd', function (completedItems) {
      assert.deepEqual(idList(completedItems), idList(argItems), 'callback: the received items should match the items of show event callback');
      teardown();
    })
    .hide(items, {instant: true})
    .show(0, {onFinish: function (completedItems) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.deepEqual(idList(completedItems), idList(items.slice(0, 1)), 'callback: should receive the shown items as it`s first argument');
      assert.strictEqual(completedItems[0].isVisible(), true, 'callback: the received items should be in "visible" state');
      assert.strictEqual(completedItems[0].isShowing(), false, 'callback: the received items should not be in "showing" state');
      argItems = completedItems;
    }});

  });

})(this);