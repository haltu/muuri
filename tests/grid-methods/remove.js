(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('remove: Muuri instance should have a remove method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.remove, 'function');
  });

})(this);