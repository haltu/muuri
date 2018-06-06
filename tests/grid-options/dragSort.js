(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragSort: should be enabled by default', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('move', function () {
      assert.strictEqual(true, true);
    });

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSort: should be disabled if false is provided', function (assert) {

    assert.expect(0);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSort: false
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('move', function () {
      assert.strictEqual(true, false, 'items should not be moved');
    });

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSort: by default items should not be draggable between grids', function (assert) {
    
    assert.expect(0);

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
    });
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
    });
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
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
      assert.strictEqual(true, false);
    });

    utils.dragElement(item.getElement(), 70, 0, teardown);

  });

  QUnit.test('dragSort: should accept a function that returns an array of grid instances', function (assert) {

    assert.expect(1);

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
    });
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
    });
    var grids = [];
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSort: function () {
        return grids;
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
        return grids;
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

    gridB.on('receive', function (data) {
      assert.strictEqual(true, true);
    });

    utils.dragElement(item.getElement(), 70, 0, teardown);

  });

})(this);