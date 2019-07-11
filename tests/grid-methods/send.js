(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('send: should return the instance', function (assert) {

    assert.expect(1);

    var containerA = utils.createGridElements();
    var containerB = utils.createGridElements();
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

    var containerA = utils.createGridElements();
    var containerB = utils.createGridElements();
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

    var containerA = utils.createGridElements();
    var containerB = utils.createGridElements();
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

  QUnit.test('send: layoutSender/layoutReceiver options', function (assert) {

    assert.expect(8);

    var containerA = utils.createGridElements();
    var containerB = utils.createGridElements();
    var gridA = new Muuri(containerA);
    var gridB = new Muuri(containerB);
    var gridALayoutId;
    var gridBLayoutId;
    var teardown = function () {
      gridA.destroy();
      gridB.destroy();
      containerA.parentNode.removeChild(containerA);
      containerB.parentNode.removeChild(containerB);
    };

    gridALayoutId = gridA._layout.id;
    gridBLayoutId = gridB._layout.id;
    gridA.send(0, gridB, 0);
    assert.notStrictEqual(gridA._layout.id, gridALayoutId, 'The sender grid should be laid out by default.');
    assert.notStrictEqual(gridB._layout.id, gridBLayoutId, 'The receiver grid should be laid out by default.');

    gridALayoutId = gridA._layout.id;
    gridBLayoutId = gridB._layout.id;
    gridA.send(0, gridB, 0, {
      layoutSender: false,
      layoutReceiver: false
    });
    assert.strictEqual(gridA._layout.id, gridALayoutId, 'The sender grid should not be laid out when layoutSender is `false`.');
    assert.strictEqual(gridB._layout.id, gridBLayoutId, 'The receiver grid should not be laid out when layoutReceiver is `false`.');

    gridALayoutId = gridA._layout.id;
    gridBLayoutId = gridB._layout.id;
    gridA.send(0, gridB, 0, {
      layoutSender: 'instant',
      layoutReceiver: 'instant'
    });
    assert.notStrictEqual(gridA._layout.id, gridALayoutId, 'The sender grid should be laid out when layoutSender is `"instant"`.');
    assert.notStrictEqual(gridB._layout.id, gridBLayoutId, 'The receiver grid should be laid out when layoutReceiver is `"instant"`.');

    gridALayoutId = gridA._layout.id;
    gridBLayoutId = gridB._layout.id;
    gridA.send(0, gridB, 0, {
      layoutSender: function () {},
      layoutReceiver: function () {}
    });
    assert.notStrictEqual(gridA._layout.id, gridALayoutId, 'The sender grid should be laid out when layoutSender is a function.');
    assert.notStrictEqual(gridB._layout.id, gridBLayoutId, 'The receiver grid should be laid out when layoutReceiver is a function.');

    // TODO: Test that animations work as supposed to also with all the different options.

    teardown();

  });

})(this);