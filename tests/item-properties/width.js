(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Item properties');

  QUnit.test(
    'item.width: should be the instance element`s cached width that includes paddings and borders',
    function (assert) {
      assert.expect(2);

      var container = utils.createGridElements();
      var grid = new Muuri(container);
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };

      assert.strictEqual(
        item.width,
        50,
        'Width is equal to the element`s content width + left/right paddings + left/right borders size'
      );
      item.element.style.padding = '0px';
      assert.strictEqual(
        item.width,
        50,
        'Width is the cached width and not the element`s current width in DOM'
      );
      teardown();
    }
  );
})(this);
