(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - refreshSortData');

  QUnit.test('Muuri instance should have a refreshSortData method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.refreshSortData, 'function');
  });

})(this);