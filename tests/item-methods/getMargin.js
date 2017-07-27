(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('getMargin: should return the instance element`s cached margins', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(item.getMargin(), {left: 10, right: 10, top: 10, bottom: 10}, 'The margins should be retrieved from the DOM on init');
    item.getElement().style.margin = '0px';
    assert.deepEqual(item.getMargin(), {left: 10, right: 10, top: 10, bottom: 10}, 'The returned margins are cached and not necessarilly the element`s current margins in DOM');
    teardown();

  });

})(this);