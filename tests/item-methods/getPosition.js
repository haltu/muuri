(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('getPosition: should return the instance element`s cached position in the grid', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
    var grid = new Muuri(container);
    var items = grid.getItems();
    var itemA = items[0];
    var itemB = items[1];
    var itemC = items[2];
    var itemD = items[3];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(itemA.getPosition(), {left: 0, top: 0});
    assert.deepEqual(itemB.getPosition(), {left: 70, top: 0});
    assert.deepEqual(itemC.getPosition(), {left: 0, top: 70});
    assert.deepEqual(itemD.getPosition(), {left: 70, top: 70});
    teardown();

  });

})(this);