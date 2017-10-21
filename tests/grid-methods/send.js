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

  QUnit.test('send: should move an item from a grid to another to the specified index', function (assert) {
    
    assert.expect(3);

    var containerA = utils.createGrid();
    var containerB = utils.createGrid();
    var gridA = new Muuri(containerA);
    var gridB = new Muuri(containerB);
    var item = gridA.getItems()[0];
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
    };

    gridA.send(item, gridB, 0);
    assert.strictEqual(gridB.getItems(0)[0], item);

    gridB.send(item, gridA, -1);
    assert.strictEqual(gridA.getItems(-1)[0], item);

    gridA.send(item, gridB, 2);
    assert.strictEqual(gridB.getItems(2)[0], item);

    teardown();

  });

  QUnit.test('send: appendTo option', function (assert) {

    assert.expect(2);

    var containerA = utils.createGrid();
    var containerB = utils.createGrid();
    var gridA = new Muuri(containerA);
    var gridB = new Muuri(containerB);
    var item = gridA.getItems()[0];
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
    };

    gridA.send(item, gridB, 0);
    assert.strictEqual(item.getElement().parentNode, document.body, 'appendTo should be by default document.body');

    gridB.send(item, gridA, 0, {appendTo: containerA});
    assert.strictEqual(item.getElement().parentNode, containerA, 'item element is appended to the element that is provided for the appendTo option');

    teardown();

  });

  // TODO: option layoutSender
  // TODO: option layoutReceiver

})(this);