(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - sort');

  QUnit.test('Muuri instance should have a sort method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.sort, 'function');
  });

})(this);