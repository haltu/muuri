(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - refreshContainer');

  QUnit.test('Muuri instance should have a refreshContainer method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.refreshContainer, 'function');
  });

})(this);