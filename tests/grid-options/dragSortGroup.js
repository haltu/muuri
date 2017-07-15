(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragSortGroup: should be null by default (items should not be draggable between grids)', function (assert) {

    assert.expect(0);

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

  QUnit.test('dragSortGroup: should allow defining a single sort group using a string', function (assert) {

    assert.expect(1);

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
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSortWith: '*',
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSortGroup: '*',
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
      assert.strictEqual(true, true);
    });

    utils.dragElement(item.getElement(), 70, 0, teardown);

  });

  QUnit.test('dragSortGroup: should allow defining multiple sort groups using an array of strings', function (assert) {

    assert.expect(2);

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
    var containerC = utils.createGrid({
      containerStyles: {
        position: 'absolute',
        left: '140px',
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
      dragSortWith: 'a',
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSortWith: 'b',
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridC = new Muuri(containerC, {
      dragEnabled: true,
      dragSortGroup: ['a', 'b'],
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var itemA = gridA.getItems()[0];
    var itemB = gridB.getItems()[0];
    var results = [];
    var moved = 0;
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      gridC.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
      containerC.parentNode.removeChild(containerC);
      done();
    };

    gridC.on('receive', function (data) {
      results.push(data.fromGrid);
      if (results.length === 2) {
        assert.strictEqual(results.indexOf(gridA) > -1, true, 'Received item from gridA');
        assert.strictEqual(results.indexOf(gridB) > -1, true, 'Received item from gridB');
      }
    });

    utils.dragElement(itemA.getElement(), 140, 0, function () {
      ++moved === 2 && teardown();
    });

    utils.dragElement(itemB.getElement(), 70, 0, function () {
      ++moved === 2 && teardown();
    });

  });

  QUnit.test('dragSortGroup: should disallow items to be dragged into the grid from other grids that don`t have a matching dragSortWith option', function (assert) {

    assert.expect(0);

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
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSortWith: 'a',
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSortGroup: 'b',
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

})(this);