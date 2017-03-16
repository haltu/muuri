(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - refreshItems');

  QUnit.test('Muuri instance should have a refreshItems method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.refreshItems, 'function');
  });

})(this);