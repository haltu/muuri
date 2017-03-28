(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('send: Muuri instance should have a send method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.send, 'function');
  });

})(this);