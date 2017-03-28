(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('getMargin: should return the instance element`s cached margins', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements({
      itemStyles: {
        width: '10px',
        height: '10px',
        margin: '1px 2px 3px 4px'
      }
    }).container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(item.getMargin(), {left: 4, right: 2, top: 1, bottom: 3});
    item.getElement().style.margin = '0px';
    assert.deepEqual(item.getMargin(), {left: 4, right: 2, top: 1, bottom: 3}, 'The returned margins are cached and not the element`s current margins in DOM');
    teardown();

  });

})(this);