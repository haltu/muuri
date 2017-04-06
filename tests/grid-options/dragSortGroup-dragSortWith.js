(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragSortWith-dragSortGroup: should not allow items to other grids by default', function (assert) {

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

    utils.dragElement({
      element: item.getElement(),
      move: {left: 70, top: 0},
      onRelease: function () {
        teardown();
      }
    });

  });

  QUnit.test('dragSortWith-dragSortGroup: should allow items to be dragged to the defined sort groups', function (assert) {

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

    utils.dragElement({
      element: item.getElement(),
      move: {left: 70, top: 0},
      onRelease: function () {
        teardown();
      }
    });

  });

  QUnit.test('dragSortWith-dragSortGroup: should not allow items to be dragged to sort groups that do not match the sort connection', function (assert) {

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
      dragSortWith: ['a'],
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

    utils.dragElement({
      element: item.getElement(),
      move: {left: 70, top: 0},
      onRelease: function () {
        teardown();
      }
    });

  });

})(this);