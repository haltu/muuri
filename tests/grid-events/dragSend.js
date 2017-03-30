(function (window) {

  var Muuri = window.Muuri;
  var Simulator = window.Simulator;

  QUnit.module('Grid events');

  QUnit.test('dragSend: should be triggered when item is dragged to another grid', function (assert) {

    assert.expect(8);

    var done = assert.async();
    var containerA = utils.createGridElements({
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
    }).container;
    var containerB = utils.createGridElements({
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
    }).container;
    var gridA = new Muuri(containerA, {
      dragEnabled: true,
      dragSortGroup: '*',
      dragSortConnections: ['*'],
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var gridB = new Muuri(containerB, {
      dragEnabled: true,
      dragSortGroup: '*',
      dragSortConnections: ['*'],
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

    gridA.on('dragSend', function (ev, data) {
      assert.strictEqual(arguments.length, 2, 'callback: should receive two arguments');
      assert.strictEqual(utils.isHammerEvent(ev), true, 'callback: first argument should be a hammer event object');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: second argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 4, 'callback: second argument should have 4 properties');
      assert.strictEqual(data.item, item, 'callback: second argument item property should be the dragged item');
      assert.strictEqual(data.toGrid, gridB, 'callback: second argument toGrid property should be the receiving grid instance');
      assert.strictEqual(data.fromIndex, 0, 'callback: second argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toIndex, 0, 'callback: second argument toIndex property should be the index where the item was moved to');
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 70,
        top: 0
      },
      onRelease: function () {
        teardown();
      }
    });

  });

})(this);