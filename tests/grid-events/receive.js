(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('receive: should be triggered, for the receiving grid, after grid.send()', function (assert) {

    assert.expect(8);

    var containerA = utils.createGridElements().container;
    var containerB = utils.createGridElements().container;
    var gridA = new Muuri(containerA);
    var gridB = new Muuri(containerB);
    var item = gridA.getItems()[0];
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
    };

    gridB.on('receive', function (data) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: the argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 5, 'callback: the argument should have 5 properties');
      assert.strictEqual(data.item, item, 'callback: the argument item property should be the moved item');
      assert.strictEqual(data.fromGrid, gridA, 'callback: the argument fromGrid property should be the sending grid instance');
      assert.strictEqual(data.fromIndex, 0, 'callback: the argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toGrid, gridB, 'callback: the argument toGrid property should be the receiving grid instance');
      assert.strictEqual(data.toIndex, 1, 'callback: the argument toIndex property should be the index where the item was moved to');
    });
    gridA.on('receive', function () {
      assert.ok(false, 'should not be triggered for the sending grid');
    });
    gridA.send(item, gridB, 1, {layout: false});
    teardown();

  });

  QUnit.test('receive: should be triggered, for the receiving grid, when an item is dragged into another grid', function (assert) {

    assert.expect(8);

    var done = assert.async();
    var containerA = utils.createGridElements({
      containerStyles: {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '50px'
      },
      itemStyles: {
        position: 'absolute',
        height: '50px',
        width: '100%',
        margin: '10px',
        background: '#000'
      }
    }).container;
    var containerB = utils.createGridElements({
      containerStyles: {
        position: 'absolute',
        left: '70px',
        top: '0px',
        width: '50px'
      },
      itemStyles: {
        position: 'absolute',
        height: '50px',
        width: '100%',
        margin: '10px',
        background: '#000'
      }
    }).container;
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSortGroup: '*',
      dragSortWith: ['*'],
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSortGroup: '*',
      dragSortWith: ['*'],
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var item = gridA.getItems()[0];
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
      done();
    };

    gridB.on('receive', function (data) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: the argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 5, 'callback: the argument should have 5 properties');
      assert.strictEqual(data.item, item, 'callback: the argument item property should be the dragged item');
      assert.strictEqual(data.fromGrid, gridA, 'callback: the argument fromGrid property should be the sending grid instance');
      assert.strictEqual(data.fromIndex, 0, 'callback: the argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toGrid, gridB, 'callback: the argument toGrid property should be the receiving grid instance');
      assert.strictEqual(data.toIndex, 0, 'callback: the argument toIndex property should be the index where the item was moved to');
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 70,
        top: 0
      },
      onRelease: function () {
        teardown();
      }
    });

  });

})(this);