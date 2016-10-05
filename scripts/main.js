palikka
.define(['jQuery'], function () {

  return window[this.id];

})
.define('docReady', ['jQuery'], function ($) {

  return palikka.defer(function (resolve) {
    $(resolve);
  });

})
.define('demo', ['jQuery',  'docReady'], function ($) {

  var m = {};
  var $grid = $('.grid');
  var $root = $('html');
  var $filterField = $('.filter-field');
  var $searchField = $('.search-field');
  var $sortField = $('.sort-field');
  var $layoutField = $('.layout-field');
  var $addItems = $('.add-more-items');
  var characters = 'abcdefghijklmnopqrstuvwxyz';
  var uuid = 0;

  // Keep the current sort value memorized.
  var currentSortValue = $sortField.val();

  // Keep drag order memorized.
  var dragOrder = [];

  // Get filter option values.
  var filterOptions = $filterField.find('option').map(function () {
    return $(this).attr('value');
  }).filter(function (val) {
    return val;
  });

  m.grid = null;

  m.init = function () {

    init();

    // Reset search field.
    $searchField.val('');

    // Reset select field filters.
    $sortField.add($filterField).add($layoutField).each(function () {
      $(this).val($(this).find('option:first').val());
    });

    // Nasty hackery needed for supporting IE9 backspace.
    // Ideally we would do just: $searchField.on('input', filter);
    var currentSearchValue = $searchField.val();
    $searchField.on('keyup', function () {
      var newSearchValue = $searchField.val();
      if (currentSearchValue !== newSearchValue) {
        currentSearchValue = newSearchValue;
        filter();
      }
    });

    $filterField.on('change', filter);
    $sortField.on('change', sort);
    $layoutField.on('change', changeLayout);
    $grid.on('click', '.card-remove', removeItem);
    $addItems.on('click', addItems);

    return m;

  };

  //
  // Helper utilities
  //

  function init() {

    if (!m.grid) {

      var dragCounter = 0;

      m.grid = new Muuri({
        container: $grid.get(0),
        items: generateElements(20),
        positionDuration: 625,
        positionEasing: [500, 20],
        dragEnabled: true,
        dragContainer: document.body,
        dragReleaseDuration: 625,
        dragReleaseEasing: [500, 20],
        dragPredicate: function (e, item, resolve) {
          var isDraggable = currentSortValue === 'order';
          var isRemoveAction = $(e.target).closest('.card-remove').length;
          if (isDraggable && !isRemoveAction && !this.isResolved) {
            this.isResolved = true;
            resolve(e);
          }
        }
      });

      m.grid
      .on('dragstart', function () {
        ++dragCounter;
        $root.addClass('dragging');
      })
      .on('dragend', function () {
        if (--dragCounter < 1) {
          $root.removeClass('dragging');
        }
      })
      .on('move', function () {
        updateIndices();
      });

    }

  }

  function filter() {

    var items = m.grid.get();
    var activeFilter = $filterField.val() || '';
    var searchQuery = $searchField.val() || '';
    var itemsToShow = [];
    var itemsToHide = [];

    // Check which items need to be shown/hidden
    if (activeFilter || searchQuery) {
      items.forEach(function (item) {
        var $elem = $(item._element);
        var isSearchMatch = searchQuery ? ($elem.attr('data-title') || '').indexOf(searchQuery) > -1 : true;
        var isFilterMatch = activeFilter ? $elem.attr('data-color') === activeFilter : true;
        (isSearchMatch && isFilterMatch ? itemsToShow : itemsToHide).push(item);
      });
    }
    else {
      itemsToShow = items;
    }

    m.grid.hide(itemsToHide);
    m.grid.show(itemsToShow);

  }

  function sort() {

    var items = m.grid._items;
    var sortValue = $sortField.val();

    // Do nothing if sort value did not change.
    if (currentSortValue === sortValue) {
      return;
    }

    // If we are changing from "order" sorting to something else
    // let's store the drag order.
    if (currentSortValue === 'order') {
      dragOrder = m.grid.get();
    }

    // Sort the items.
    if (sortValue === 'title') {
      items.sort(compareItemTitle);
    }
    else if (sortValue === 'color') {
      items.sort(compareItemColor);
    }
    else {
      Array.prototype.splice.apply(items, [0, items.length].concat(dragOrder));
    }

    // Update current sort value.
    currentSortValue = sortValue;

    // Update UI indices.
    updateIndices();

    // Do layout.
    m.grid.layout();

  }

  function addItems() {

    // Generate new elements.
    var newElems = generateElements(5);

    // Set the display of the new elements to "none" so it will be hidden by
    // default.
    newElems.forEach(function (item) {
      item.style.display = 'none';
    });

    // Add the elements to the grid.
    var newItems = m.grid.add(newElems);

    // Get current sort value.
    var sortValue = $sortField.val();

    // Update UI indices.
    updateIndices();

    // Sort the items only if needed.
    if (sortValue !== 'order') {

      // Get all items.
      var items = m.grid._items;

      // Sort the items.
      if (sortValue === 'title') {
        items.sort(compareItemTitle);
      }
      else if (sortValue === 'color') {
        items.sort(compareItemColor);
      }

      // Add the new items to the cached drag order.
      dragOrder = dragOrder.concat(newItems);

    }

    // Filter the grid.
    filter();

  }

  function removeItem(e) {

    var elem = $(this).closest('.item').get(0);

    m.grid.hide(elem, function (items) {

      var item = items[0];

      m.grid.remove(item, true);

      if (currentSortValue !== 'order') {

        var itemIndex = dragOrder.indexOf(item);

        if (itemIndex > -1) {
          dragOrder.splice(itemIndex, 1);
        }

      }

    });

    updateIndices();

  }

  function changeLayout() {

    var layoutVal = $layoutField.val();

    m.grid._settings.layout = ['firstFit', {
      horizontal: false,
      alignRight: layoutVal.indexOf('right') > -1,
      alignBottom: layoutVal.indexOf('bottom') > -1,
      fillGaps: layoutVal.indexOf('fillgaps') > -1
    }];

    m.grid.layout();

  }

  //
  // Utils
  //

  function generateElements(amount) {

    var ret = [];

    for (var i = 0, len = amount || 1; i < amount; i++) {

      // Generate item data.
      var id = ++uuid;
      var color = getRandomItem(filterOptions);
      var title = generateRandomWord(2);
      var width = Math.floor(Math.random() * 2) + 1;
      var height = Math.floor(Math.random() * 2) + 1;

      // Generate item.
      var item =  $('<div class="item h' + height + ' w' + width + ' ' + color + '" data-id="' + id + '" data-color="' + color + '" data-title="' + title + '">' +
                    '<div class="item-content">' +
                      '<div class="card">' +
                        '<div class="card-id">' + id + '</div>' +
                        '<div class="card-title">' + title + '</div>' +
                        '<div class="card-remove"><i class="material-icons">&#xE5CD;</i></div>' +
                      '</div>' +
                    '</div>' +
                  '</div>').get(0);

      ret.push(item);

    }

    return ret;

  }

  function getRandomItem(array) {

    return array[Math.floor(Math.random() * array.length)];

  }

  function generateRandomWord(length) {

    var ret = '';

    for (var i = 0; i < length; i++) {
      ret += getRandomItem(characters);
    }

    return ret;

  }

  function compareItemTitle(a, b) {

    var aVal = ($(a._element).attr('data-title') || '');
    var bVal = ($(b._element).attr('data-title') || '');
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

  }

  function compareItemColor(a, b) {

    var aVal = ($(a._element).attr('data-color') || '');
    var bVal = ($(b._element).attr('data-color') || '');
    return aVal < bVal ? -1 : aVal > bVal ? 1 : compareItemTitle(a, b);

  }

  function updateIndices() {

    m.grid.get().forEach(function (item, i) {
      $(item._element).attr('data-id', i + 1).find('.card-id').text(i + 1);
    });

  }

  return m.init();

});