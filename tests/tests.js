window.onload = function() {

  //
  // Setup
  //

  var docElem = document.documentElement;
  var body = document.body;
  var Muuri = window.Muuri;

  QUnit.config.reorder = false;

  //
  // Tests
  //

  QUnit.module('new Muuri()');

  QUnit.test('Muuri should be a global function', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Muuri, 'function');

  });

  QUnit.test('Muuri constructor should require a valid container element for succesful initiation and otherwise throw an error', function (assert) {

    assert.expect(7);

    assert.throws(function () {
      new Muuri();
    }, undefined, 'Should throw an error when no arguments are provided');

    assert.throws(function () {
      new Muuri({});
    }, undefined, 'Should throw an error when an empty object is provided as argument');

    assert.throws(function () {
      new Muuri({container: document});
    }, undefined, 'Should throw an error when document is set as container');

    assert.throws(function () {
      new Muuri({container: docElem});
    }, undefined, 'Should throw an error when documentElement is set as container');

    assert.throws(function () {
      new Muuri({container: document.createElement('div')});
    }, undefined, 'Should throw an error when an element (which is not in the DOM) is set as the container');

    var muuri = new Muuri({container: body});
    assert.strictEqual(muuri instanceof Muuri, true, 'Should initiate succesfully when body element is set as the container');
    muuri.destroy();

    var container = document.createElement('div');
    body.appendChild(container);
    var muuri = new Muuri({container: container});
    assert.strictEqual(muuri instanceof Muuri, true, 'Should initiate succesfully when an element (which is in the DOM) is set as the container');
    muuri.destroy();
    container.parentNode.removeChild(container);

  });

  QUnit.module('muuri.on()');

  QUnit.test('Muuri instance should have "on" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('on' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.off()');

  QUnit.test('Muuri instance should have "off" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('off' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.refresh()');

  QUnit.test('Muuri instance should have "refresh" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('refresh' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.get()');

  QUnit.test('Muuri instance should have "get" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('get' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.add()');

  QUnit.test('Muuri instance should have "add" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('add' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.remove()');

  QUnit.test('Muuri instance should have "remove" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('remove' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.synchronize()');

  QUnit.test('Muuri instance should have "synchronize" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('synchronize' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.layout()');

  QUnit.test('Muuri instance should have "layout" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('layout' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.show()');

  QUnit.test('Muuri instance should have "show" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('layout' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.hide()');

  QUnit.test('Muuri instance should have "hide" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('layout' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.indexOf()');

  QUnit.test('Muuri instance should have "indexOf" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('indexOf' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.move()');

  QUnit.test('Muuri instance should have "move" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('move' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.swap()');

  QUnit.test('Muuri instance should have "swap" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('swap' in muuri, true);
    muuri.destroy();

  });

  QUnit.module('muuri.destroy()');

  QUnit.test('Muuri instance should have "destroy" method', function (assert) {

    assert.expect(1);

    var muuri = new Muuri({container: body});
    assert.strictEqual('destroy' in muuri, true);
    muuri.destroy();

  });

};