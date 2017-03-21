(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods - getPosition');

  QUnit.test('item.getPosition() should return the Item element`s cached position in the grid', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({
      itemCount: 4,
      itemStyles: {
        width: '10px',
        height: '10px',
        margin: '5px'
      },
      containerStyles: {
        position: 'relative',
        width: '40px'
      }
    }).container;
    var grid = new Muuri(container);
    var items = grid.getItems();
    var itemA = items[0];
    var itemB = items[1];
    var itemC = items[2];
    var itemD = items[3];

    assert.deepEqual(itemA.getPosition(), {left: 0, top: 0});
    assert.deepEqual(itemB.getPosition(), {left: 20, top: 0});
    assert.deepEqual(itemC.getPosition(), {left: 0, top: 20});
    assert.deepEqual(itemD.getPosition(), {left: 20, top: 20});

    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);