document.addEventListener('DOMContentLoaded', function () {

  var docElem = document.documentElement;
  var kanban = document.querySelector('.kanban-demo');
  var board = kanban.querySelector('.board');
  var itemContainers = Array.prototype.slice.call(kanban.querySelectorAll('.board-column-content'));
  var columnGrids = [];
  var dragCounter = 0;
  var boardGrid;

  itemContainers.forEach(function (container) {

    var muuri = new Muuri(container, {
      items: '.board-item',
      dragEnabled: true,
      dragSortGroup: 'column',
      dragSortWith: 'column',
      dragContainer: document.body
    })
    .on('dragStart', function (item) {
      ++dragCounter;
      docElem.classList.add('dragging');
      item.getElement().style.width = item.getWidth() + 'px';
      item.getElement().style.height = item.getHeight() + 'px';
    })
    .on('dragEnd', function (item) {
      if (--dragCounter < 1) {
        docElem.classList.remove('dragging');
      }
    })
    .on('dragReleaseEnd', function (item) {
      item.getElement().style.width = '';
      item.getElement().style.height = '';
      columnGrids.forEach(function (muuri) {
        muuri.refreshItems();
      });
    })
    .on('layoutStart', function () {
      window.setTimeout(function () {
        boardGrid.refreshItems().layout();
      }, 0);
    });

    columnGrids.push(muuri);

  });

  boardGrid = new Muuri(board, {
    dragEnabled: true,
    dragStartPredicate: {
      handle: '.board-column-header'
    }
  });

});