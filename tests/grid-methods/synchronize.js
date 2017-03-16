(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - synchronize');

  QUnit.test('Muuri instance should have a synchronize method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.synchronize, 'function');
  });

})(this);