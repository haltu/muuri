(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('hide: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.hide(0), grid);
    teardown();

  });

  QUnit.test('hide: should accept an item, element or an index (or an array of them) as the first argument', function (assert) {

    assert.expect(5);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.getItems('hidden').length, 0, 'there should be no hidden items before the tests commence');

    grid.hide(0);
    assert.deepEqual(idList(grid.getItems('hidden')), idList(items.slice(0, 1)), 'should accept an index as the first argument');

    grid.hide(items[1]);
    assert.deepEqual(idList(grid.getItems('hidden')), idList(items.slice(0, 2)), 'should accept an item as the first argument');

    grid.hide(items[2].getElement());
    assert.deepEqual(idList(grid.getItems('hidden')), idList(items.slice(0, 3)), 'should accept an element as the first argument');

    grid.hide([3, items[4].getElement(), items[5]]);
    assert.deepEqual(idList(grid.getItems('hidden')), idList(items.slice(0, 6)), 'should accept an array of items, elements and indices as the first argument');

    teardown();

  });

  QUnit.test('hide: should not hide instantly by default', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(0);
    assert.deepEqual(idList(grid.getItems('hiding')), idList(items.slice(0, 1)));

    teardown();

  });

  QUnit.test('hide: should hide instantly if instant option is true', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(0, {instant: true});
    assert.strictEqual(items[0].isHiding(), false);
    assert.strictEqual(items[0].isVisible(), false);

    teardown();

  });

  QUnit.test('hide: should call the onFinish callback once the animation is finished', function (assert) {

    assert.expect(5);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var argItems = null;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid
    .on('hideEnd', function (completedItems) {
      assert.deepEqual(idList(completedItems), idList(argItems), 'callback: the received items should match the items of show event callback');
      teardown();
    })
    .hide(0, {onFinish: function (completedItems) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.deepEqual(idList(completedItems), idList(items.slice(0, 1)), 'callback: should receive the hidden items as it`s first argument');
      assert.strictEqual(completedItems[0].isVisible(), false, 'callback: the received items should not be in "visible" state');
      assert.strictEqual(completedItems[0].isHiding(), false, 'callback: the received items should not be in "hiding" state');
      argItems = completedItems;
    }});

  });

})(this);