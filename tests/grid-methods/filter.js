(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('filter: Muuri instance should have a filter method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.filter, 'function');
  });

})(this);