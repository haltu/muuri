document.addEventListener('DOMContentLoaded', function () {
  const dragContainer = document.querySelector('.drag-container');
  const boardContainer = document.querySelector('.kanban-demo .board-container');
  const board = document.querySelector('.kanban-demo .board');
  const colTemplate = document.querySelector('.board-column-template');
  const itemTemplate = document.querySelector('.board-item-template');
  const colGrids = [];

  let colDragCounter = 0;

  //
  // INIT BOARD GRID
  //

  const boardGrid = new Muuri(board, {
    layoutDuration: 300,
    layoutEasing: 'cubic-bezier(0.625, 0.225, 0.100, 0.890)',
    layout: (grid, layoutId, items, width, height, callback) => {
      Muuri.defaultPacker.setOptions({ horizontal: true });
      return Muuri.defaultPacker.createLayout(
        grid,
        layoutId,
        items,
        width,
        height,
        (layoutData) => {
          delete layoutData.styles;
          callback(layoutData);
        }
      );
    },
    dragEnabled: true,
    dragAxis: 'x',
    dragSortHeuristics: {
      sortInterval: 0,
    },
    dragHandle: '.board-column-title',
    dragRelease: {
      duration: 300,
      esaing: 'cubic-bezier(0.625, 0.225, 0.100, 0.890)',
      useDragContainer: false,
    },
    dragAutoScroll: {
      targets: [{ element: boardContainer, axis: Muuri.AutoScroller.AXIS_X }],
    },
  })
    .on('dragInit', () => {
      if (!colDragCounter) {
        const width = boardGrid.getItems().reduce((a, item) => a + item.getWidth(), 0);
        board.style.width = `${width}px`;
        board.style.overflow = 'hidden';
      }
      ++colDragCounter;
    })
    .on('dragEnd', () => {
      --colDragCounter;
    })
    .on('dragReleaseEnd', () => {
      if (!colDragCounter) {
        board.style.width = '';
        board.style.overflow = '';
      }
    });

  //
  // CREATE INITIAL COLUMN GRIDS
  //

  [
    {
      name: 'to do',
      type: 'todo',
      items: [
        "Figure out how to get more sponsors to support Muuri's development",
        'Prioritize non-coding activities on leisure time',
      ],
    },
    { name: 'working', type: 'working', items: ['Fix bugs', 'Make demos'] },
    {
      name: 'done',
      type: 'done',
      items: ['Release Muuri v0.9.0'],
    },
  ].forEach(({ name, type, items }, i) => {
    window.setTimeout(() => {
      addCol(name, type, (grid) => {
        items.reverse().forEach((item, i) => {
          window.setTimeout(() => {
            addColItem(grid, item);
          }, i * 100);
        });
      });
    }, i * 100);
  });

  //
  // BIND ACTIONS
  //

  // Toggle edit.
  let selectedItemElem = null;
  let selectedTitleElem = null;
  board.addEventListener('click', (e) => {
    if (e.target.matches('.board-item-action.edit')) {
      const editElem = e.target;
      const itemElem = editElem.closest('.board-item');
      const titleElem = itemElem.querySelector('.board-item-title');
      const activate = selectedItemElem !== itemElem;

      if (selectedItemElem) {
        selectedItemElem.classList.remove('editing');
        selectedTitleElem.setAttribute('contenteditable', false);
        selectedTitleElem.setAttribute('focusable', false);
        selectedTitleElem.setAttribute('tabindex', '');
        selectedTitleElem.blur();
        selectedItemElem = null;
        selectedTitleElem = null;
      }

      if (activate) {
        selectedItemElem = itemElem;
        selectedTitleElem = titleElem;
        selectedItemElem.classList.add('editing');
        selectedTitleElem.setAttribute('contenteditable', true);
        selectedTitleElem.setAttribute('focusable', true);
        selectedTitleElem.setAttribute('tabindex', 0);
        selectedTitleElem.focus();
      }
    }
  });

  // Add column item.
  board.addEventListener('click', (e) => {
    if (e.target.matches('.board-column-action.add')) {
      const gridElem = e.target.closest('.board-column').querySelector('.board-column-items');
      const grid = colGrids.reduce((acc, grid) => {
        if (acc) return acc;
        return grid.getElement() === gridElem ? grid : undefined;
      }, undefined);
      addColItem(grid, 'Hello world!');
    }
  });

  // Remove column item.
  board.addEventListener('click', (e) => {
    if (e.target.matches('.board-item-action.delete')) {
      const itemElem = e.target.closest('.board-item');
      const item = colGrids.reduce((acc, grid) => acc || grid.getItem(itemElem), undefined);
      const grid = item.getGrid();
      grid.hide([item], {
        onFinish: () => {
          grid.remove([], { removeElements: true });
        },
      });
    }
  });

  // Update layout when title is modified.
  board.addEventListener('input', (e) => {
    if (e.target.matches('.board-item-title')) {
      const itemElem = e.target.closest('.board-item');
      const item = colGrids.reduce((acc, grid) => acc || grid.getItem(itemElem), undefined);
      const width = item.getWidth();
      const height = item.getHeight();
      const grid = item.getGrid();

      grid.refreshItems([item]);

      if (width !== item.getWidth() || height !== item.getHeight()) {
        grid.layout();
      }
    }
  });

  //
  // UTILS
  //

  function addCol(title = '', type = 'todo', onReady = null) {
    // Create column element.
    const colElem = document.importNode(colTemplate.content.children[0], true);
    colElem.classList.add(type);
    colElem.querySelector('.board-column-title').innerHTML = title;

    // Add column to the board.
    boardGrid.show(
      boardGrid.add([colElem], {
        active: false,
      }),
      {
        onFinish: () => {
          const grid = new Muuri(colElem.querySelector('.board-column-items'), {
            items: '.board-item',
            showDuration: 300,
            showEasing: 'ease',
            hideDuration: 300,
            hideEasing: 'ease',
            layoutDuration: 300,
            layoutEasing: 'cubic-bezier(0.625, 0.225, 0.100, 0.890)',
            dragEnabled: true,
            dragSort: () => colGrids,
            dragContainer: dragContainer,
            dragHandle: '.board-item-handle',
            dragRelease: {
              duration: 300,
              easing: 'cubic-bezier(0.625, 0.225, 0.100, 0.890)',
              useDragContainer: true,
            },
            dragPlaceholder: {
              enabled: true,
              createElement: (item) => item.getElement().cloneNode(true),
            },
            dragAutoScroll: {
              targets: (item) => {
                return [
                  window,
                  {
                    element: boardContainer,
                    priority: 1,
                    axis: Muuri.AutoScroller.AXIS_X,
                  },
                  {
                    element: item.getGrid().getElement().parentNode,
                    priority: 1,
                    axis: Muuri.AutoScroller.AXIS_Y,
                  },
                ];
              },
              sortDuringScroll: false,
            },
          })
            .on('dragInit', (item) => {
              const style = item.getElement().style;
              style.width = item.getWidth() + 'px';
              style.height = item.getHeight() + 'px';
            })
            .on('beforeSend', ({ item, toGrid }) => {
              const style = item.getElement().style;
              style.width = toGrid._width - 20 + 'px';
              toGrid.refreshItems([item]);
            })
            .on('dragReleaseEnd', (item) => {
              const style = item.getElement().style;
              style.width = '';
              style.height = '';
              grid.refreshItems([item]);
            })
            .on('layoutEnd', () => {
              boardGrid.layout();
            });

          colGrids.push(grid);

          if (onReady) onReady(grid);
        },
      }
    );
  }

  function addColItem(colGrid, title = '', onReady = null) {
    const itemElem = document.importNode(itemTemplate.content.children[0], true);
    const titleElem = itemElem.querySelector('.board-item-title');
    titleElem.innerHTML = title;
    colGrid.show(
      colGrid.add([itemElem], {
        active: false,
        index: 0,
        onFinish: (items) => {
          if (onReady) onReady(items[0]);
        },
      })
    );
  }
});
