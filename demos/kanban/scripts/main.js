$(function () {

  var muuriInstances = [];

  $('.board-column-items').each(function () {

    var container = this;
    var muuri = new Muuri(container, {
      items: '.board-item',
      dragEnabled: true,
      dragSortGroup: 'column',
      dragSortWith: 'column',
      dragContainer: document.body
    });

    muuriInstances.push(muuri);

    muuri
    .on('dragStart', function (item) {
      document.body.classList.add('dragging');
      item.getElement().style.width = item.getWidth() + 'px';
      item.getElement().style.height = item.getHeight() + 'px';
    })
    .on('dragEnd', function (item) {
      document.body.classList.remove('dragging');
    })
    .on('dragReleaseEnd', function (item) {
      item.getElement().style.width = '';
      item.getElement().style.height = '';
      muuriInstances.forEach(function (muuri) {
        muuri.refreshItems();
      });
    });

  });

});