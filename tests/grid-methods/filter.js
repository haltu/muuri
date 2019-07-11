(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('filter: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.filter(function () {}), grid);

    teardown();

  });

  QUnit.test('filter: should accept a function as the first argument', function (assert) {

    assert.expect(12);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var firstItem = items[0];
    var i = 0;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.filter(function (item) {
      assert.strictEqual(item._id, items[i]._id, 'predicate function should be called in ascending order for each item');
      ++i;
      return item === firstItem;
    });

    assert.strictEqual(i, 10, 'predicate function should be called for each item');
    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList([firstItem]), 'the items for which true were returned should be shown and others hidden');

    teardown();

  });

  QUnit.test('filter: should accept a selector as the first argument', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var firstItem = items[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    firstItem.getElement().classList.add('foo');
    grid.filter('.foo');

    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList([firstItem]));

    teardown();

  });

  QUnit.test('filter: should not show/hide items instantly by default', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid
    .hide(0, {instant: true})
    .filter(function (item) {
      return item === items[0];
    });

    assert.deepEqual(idList(utils.getShowingItems(grid)), idList(items.slice(0, 1)));
    assert.deepEqual(idList(utils.getHidingItems(grid)), idList(items.slice(1)));

    teardown();

  });

  QUnit.test('filter: should show/hide items instantly if instant option is true', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid
    .hide(0, {instant: true})
    .filter(function (item) {
      return item === items[0];
    }, {instant: true});

    assert.strictEqual(utils.getShowingItems(grid).length, 0);
    assert.strictEqual(utils.getHidingItems(grid).length, 0);
    assert.deepEqual(idList(utils.getVisibleItems(grid)), idList(items.slice(0, 1)));
    assert.deepEqual(idList(utils.getHiddenItems(grid)), idList(items.slice(1)));

    teardown();

  });

  QUnit.test('filter: should call the onFinish callback once the animations are finished', function (assert) {

    assert.expect(5);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid
    .hide(0, {instant: true})
    .filter(function (item) {
      return item === items[0];
    }, {onFinish: function (itemsToShow, itemsToHide) {
      assert.strictEqual(arguments.length, 2, 'callback: should receive two arguments');
      assert.deepEqual(idList(itemsToShow), idList(items.slice(0, 1)), 'callback: should receive the shown items as it`s first argument');
      assert.deepEqual(idList(itemsToHide), idList(items.slice(1)), 'callback: should receive the hidden items as it`s second argument');
      assert.strictEqual(items[0].isVisible(), true, 'callback: the first argument items should be visible');
      assert.strictEqual(items[1].isVisible(), false, 'callback: the second argument items should be hidden');
      teardown();
    }});

  });

})(this);