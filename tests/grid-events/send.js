(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('send: should be triggered in the end of the send procedure (for the sending grid)', function (assert) {

    assert.expect(11);

    var containerA = utils.createGrid();
    var containerB = utils.createGrid();
    var gridA = new Muuri(containerA);
    var gridB = new Muuri(containerB);
    var item = gridA.getItems()[0];
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
    };

    gridA.on('send', function (data) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: the argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 5, 'callback: the argument should have 5 properties');
      assert.strictEqual(data.item, item, 'callback: the argument item property should be the moved item');
      assert.strictEqual(data.fromGrid, gridA, 'callback: the argument fromGrid property should be the sending grid instance');
      assert.strictEqual(data.fromIndex, 0, 'callback: the argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toGrid, gridB, 'callback: the argument toGrid property should be the receiving grid instance');
      assert.strictEqual(data.toIndex, 1, 'callback: the argument toIndex property should be the index where the item was moved to');
      assert.strictEqual(data.toGrid.getItems().indexOf(data.item), data.toIndex, 'callback: the item should be included in the target grid in correct position');
      assert.strictEqual(data.fromGrid.getItems().indexOf(data.item), -1, 'callback: the item should not be included in the source grid');
      assert.strictEqual(data.item.getElement().parentNode, document.body, 'callback: the item element should be appended to the send container');
    });
    gridB.on('send', function () {
      assert.ok(false, 'should not be triggered for the receiving grid');
    });
    gridA.send(item, gridB, 1, {layout: false});
    teardown();

  });

  QUnit.test('send: should be triggered when an item is dragged into another grid (for the sending grid)', function (assert) {

    assert.expect(11);

    var done = assert.async();
    var containerA = utils.createGrid({
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
    });
    var containerB = utils.createGrid({
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
    });
    var grids = [];
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSort: function () {
        return grids
      },
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSort: function () {
        return grids
      },
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

    grids.push(gridA, gridB);

    gridA.on('send', function (data) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: the argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 5, 'callback: the argument should have 5 properties');
      assert.strictEqual(data.item, item, 'callback: the argument item property should be the dragged item');
      assert.strictEqual(data.fromGrid, gridA, 'callback: the argument fromGrid property should be the sending grid instance');
      assert.strictEqual(data.fromIndex, 0, 'callback: the argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toGrid, gridB, 'callback: the argument toGrid property should be the receiving grid instance');
      assert.strictEqual(data.toIndex, 0, 'callback: the argument toIndex property should be the index where the item was moved to');
      assert.strictEqual(data.toGrid.getItems().indexOf(data.item), data.toIndex, 'callback: the item should be included in the target grid in correct position');
      assert.strictEqual(data.fromGrid.getItems().indexOf(data.item), -1, 'callback: the item should not be included in the source grid');
      assert.strictEqual(data.item.isDragging(), true, 'callback: the item should be in dragging state');
    });

    utils.dragElement(item.getElement(), 70, 0, teardown);

  });

})(this);