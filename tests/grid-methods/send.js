(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('send: should return the instance', function (assert) {

    assert.expect(1);

    var containerA = utils.createGrid();
    var containerB = utils.createGrid();
    var gridA = new Muuri(containerA);
    var gridB = new Muuri(containerB);
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
    };

    assert.strictEqual(gridA.send(0, gridB, 0), gridA);
    teardown();

  });

})(this);