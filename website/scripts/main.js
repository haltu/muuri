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
  var uuid = 0;
  var characters = 'abcdefghijklmnopqrstuvwxyz';

  // Keep the current sort value memorized.
  var currentSortValue = $sortField.val();

  // Keep sort item order memorized.
  var currentOrder = [];

  // Get filter option values.
  var filterOptions = $filterField.find('option').map(function () {
    return $(this).attr('value');
  }).filter(function (val) {
    return val;
  });

  m.grid = null;

  m.init = function () {

    init();

    // Bind events.
    $filterField.add($searchField).on('input', filter);
    $sortField.on('input', sort);
    $grid.on('click', '.card-remove', removeItem);

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
        items: generateElements(50),
        positionDuration: 625,
        positionEasing: [500, 20],
        dragEnabled: true,
        dragReleaseDuration: 625,
        dragReleaseEasing: [500, 20],
        dragContainer: document.body,
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
      });

    }

  }

  function filter(e) {

    // TODO: Handle dragged item being hidden.

    var $field = $(this);
    var items = m.grid.get();
    var activeFilter = $filterField.val() || '';
    var searchQuery = $searchField.val() || '';
    var itemsToShow = [];
    var itemsToHide = [];

    // Check which items need to be shown/hidden
    if (activeFilter || searchQuery) {
      items.forEach(function (item) {
        var isSearchMatch = searchQuery ? (item._element.dataset.title || '').indexOf(searchQuery) > -1 : true;
        var isFilterMatch = activeFilter ? item._element.dataset.color === activeFilter : true;
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
    // let's store the item order.
    if (currentSortValue === 'order') {
      currentOrder = m.grid.get();
    }

    // Sort the items.
    if (sortValue === 'title') {
      items.sort(compareItemTitle);
    }
    else if (sortValue === 'color') {
      items.sort(compareItemColor);
    }
    else if (sortValue === 'id') {
      items.sort(compareItemId);
    }
    else {
      Array.prototype.splice.apply(items, [0, items.length].concat(currentOrder));
    }

    // Update current sort value.
    currentSortValue = sortValue;

    // Do layout.
    m.grid.layout();

  }

  function add() {

    if (m.grid) {
      var items = generateElements(5);
      items.forEach(function (item) {
        item.style.display = 'none';
      });
      m.grid.show(m.grid.add(items), function (items) {
        console.log('CALLBACK: Added ' + items.length + ' items');
      });
    }

  }

  function removeItem(e) {

    var elem = $(this).closest('.item').get(0);
    m.grid.hide(elem, function (items) {
      var item = items[0];
      m.grid.remove(item, true);
      if (currentSortValue !== 'order') {
        var itemIndex = currentOrder.indexOf(item);
        if (itemIndex > -1) {
          currentOrder.splice(itemIndex, 1);
        }
      }
    });

  }

  //
  // Utils
  //


  var set = ["243-252", "270-251", "160-166", "228-219", "123-102", "210-276", "153-263", "163-146", "155-110", "192-287", "252-102", "123-238", "252-193", "147-102", "239-131", "198-252", "279-228", "234-118", "122-216", "116-162", "101-180", "137-178", "203-251", "172-199", "178-230", "222-235", "246-131", "221-204", "211-271", "241-169", "109-183", "177-218", "236-271", "267-172", "214-157", "182-126", "238-182", "286-127", "147-293", "242-229", "289-280", "165-175", "263-131", "214-274", "180-274", "145-175", "234-263", "225-257", "206-238", "294-116", "224-209", "199-231", "228-116", "259-187", "216-157", "238-269", "289-208", "201-155", "171-175", "103-187", "182-204", "133-155", "141-190", "123-273", "204-117", "131-178", "105-247", "121-258", "186-295", "131-117", "188-234", "236-154", "263-240", "114-290", "205-262", "132-138", "114-293", "178-285", "113-180", "280-219", "190-279", "132-162", "196-132", "183-197", "190-171", "102-192", "283-224", "116-190", "165-243", "166-219", "158-255", "171-185", "243-147", "154-199", "265-160", "239-188", "130-294", "279-296", "118-196", "290-107"];
  var set = null;

  function generateElements(amount) {

    var ret = [];
    var setLog = [];

    for (var i = 0, len = amount || 1; i < amount; i++) {

      // Generate item data.
      var id = ++uuid;
      var color = getRandomItem(filterOptions);
      var title = generateRandomWord(2);
      var width = Math.floor(Math.random() * 2) + 1;
      var height = Math.floor(Math.random() * 2) + 1;
      var w = set ? set[i].split('-')[0] : (Math.floor(Math.random() * 200) + 100);
      var h = set ? set[i].split('-')[1] : (Math.floor(Math.random() * 200) + 100);

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

      /*
      $(item).css({
        width: w + 'px',
        height: h + 'px',
        lineHeight: h + 'px'
      });
      */

      setLog.push(w + '-' + h);

      ret.push(item);

    }

    // console.log(setLog);

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

  function compareItemId(a, b) {

    var aVal = parseInt(a._element.dataset.id) || 0;
    var bVal = parseInt(b._element.dataset.id) || 0;
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

  }

  function compareItemTitle(a, b) {

    var aVal = (a._element.dataset.title || '');
    var bVal = (b._element.dataset.title || '');
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

  }

  function compareItemColor(a, b) {

    var aVal = (a._element.dataset.color || '');
    var bVal = (b._element.dataset.color || '');
    return aVal < bVal ? -1 : aVal > bVal ? 1 : compareItemTitle(a, b);

  }

  return m.init();

});