(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('add: should return the added items', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(idList(grid.add(elem)), idList(grid.getItems(elem)));
    teardown();

  });

  QUnit.test('add: should accept an element or an array of elements as the first argument', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elemA = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var elemB = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var elemC = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(idList(grid.add(elemA)), idList(grid.getItems(elemA)));
    assert.deepEqual(idList(grid.add([elemB, elemC])), idList(grid.getItems([elemB, elemC])));
    teardown();

  });

  QUnit.test('add: should add the item to the last index by default', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var item = grid.add(elem)[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.getItems().indexOf(item), 10);
    teardown();

  });

  QUnit.test('add: should allow defining the index where the items are inserted to', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var item = grid.add(elem, {index: 1})[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.getItems().indexOf(item), 1);
    teardown();

  });

  QUnit.test('add: should automatically layout the grid after add', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('layoutStart', function () {
      assert.strictEqual(true, true);
      teardown();
    });
    grid.add(elem);

  });

  QUnit.test('add: should not trigger layout after add when layout option is set to false', function (assert) {

    assert.expect(0);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('layoutStart', function () {
      assert.strictEqual(true, false);
    });
    grid.add(elem, {layout: false});
    teardown();

  });

  QUnit.test('add: should trigger unanimated layout after add when layout option is set to "instant"', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('layoutEnd', function () {
      assert.strictEqual(true, true);
      teardown();
    });
    grid.add(elem, {layout: 'instant'});

  });

  QUnit.test('add: should trigger layout and call callback function after add when a callback function is provided to the layout option', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };
    var args;

    grid.on('layoutEnd', function (items) {
      assert.notStrictEqual(args, items, 'layout callback items argument should not the same object as the layoutEnd event callback`s argument');
      assert.deepEqual(idList(args), idList(items), 'layout callback should receive the same items as the layoutEnd event callback');
      teardown();
    });

    grid.add(elem, {layout: function (isInterrupted, items) {
      args = items;
    }});

  });

})(this);