(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragSortWith: should be null by default (items should not be draggable between grids)', function (assert) {

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

  QUnit.test('dragSortWith: should accept an array of grid instances', function (assert) {

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
    var grids = [];
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSortWith: grids,
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSortWith: grids,
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