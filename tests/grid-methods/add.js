(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('add: Muuri instance should have an add method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.add, 'function');
  });

})(this);