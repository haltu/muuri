(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - getItems');

  QUnit.test('Muuri instance should have a getItems method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.getItems, 'function');
  });

})(this);