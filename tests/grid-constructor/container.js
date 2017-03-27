(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid instance');

  QUnit.test('Muuri constructor should not accept an invalid container element', function (assert) {

    assert.expect(5);

    assert.throws(function () {
      new Muuri();
    }, 'Should throw an error when no arguments are provided');

    assert.throws(function () {
      new Muuri(document);
    }, 'Should throw an error when document is set as container');

    assert.throws(function () {
      new Muuri(document.documentElement);
    }, 'Should throw an error when documentElement is set as container');

    assert.throws(function () {
      new Muuri(document.createElement('div'));
    }, 'Should throw an error when an element which is not in the DOM is set as the container');

    assert.throws(function () {
      new Muuri('.does-not-exist');
    }, 'Should throw an error when a valid element matching selector query string is not found');

  });

  QUnit.test('Muuri constructor should accept document body as container', function (assert) {

    var muuri = new Muuri(document.body, {items: []});
    assert.strictEqual(muuri instanceof Muuri, true, 'Should initiate succesfully when body element is set as the container');
    muuri.destroy();

  });

  QUnit.test('Muuri constructor should accept any descendant of document body as container', function (assert) {

    var element = document.createElement('div');
    document.body.appendChild(element);

    var childElement = document.createElement('div');
    element.appendChild(childElement);

    var muuri = new Muuri(childElement);
    assert.strictEqual(muuri instanceof Muuri, true, 'Should initiate succesfully when an element which is not a direct child but a descendant of document body is set as the container');
    muuri.destroy();

    element.parentNode.removeChild(element);

  });

  QUnit.test('Muuri constructor should accept a selector string as container and query it', function (assert) {

    var element = document.createElement('div');
    document.body.appendChild(element);

    var childElement = document.createElement('div');
    childElement.classList.add('muuri-grid');
    element.appendChild(childElement);

    var muuri = new Muuri('.muuri-grid');
    assert.strictEqual(muuri instanceof Muuri, true, 'Should initiate succesfully when a selector string is passed as the container parameter');
    muuri.destroy();

    element.parentNode.removeChild(element);

  });

})(this);