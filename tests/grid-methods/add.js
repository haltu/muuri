(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('add: should return the added items', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var elem = document.createElement('div').appendChild(document.createElement('div')).parentNode;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(grid.add(elem), grid.getItems(elem));
    teardown();

  });

})(this);