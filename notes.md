# RELEASE NOTES

The _public_ API is pretty much untouched, but internally there's been a _major_ refactoring process. So if you relied on any of the internal APIs please make sure to revise those parts before upgrading to this version from an older version.

This release contains _a lot_ of memory allocation optimizations, which should also lead to better performance as there is _much_ less garbage collection going on than before. Also the codebase has now better structure as it's split into logical modules. We are now using Rollup as the build tool and Prettier as the code formatter.

## Some highlights

* `grid.getItems()` does not accept the state parameter anymore. Just use `.filter()` on the items when needed, much simpler and less maintaining.

* Default layout algorithm refactored and internal API changed.
  - `grid._layout.slots` is now an array (instead of an object) in the format of: [itemLeft, itemTop, itemWidth, itemHeight, ...etc].
  - `grid._layout` object is mutated instead of replaced. It now contains an id property which is inceremented on every layout.

* `grid.add()` is not safeguarded against adding the same element twice in the grid anymore. If you do that some weird stuff will happen, probably. It was removed due to performance reasons (that check was pretty heavy) and there was no easy way to make it faster. The responsibility to check that is now in the userland.

* All the item layout logic is moved from `Item` to `ItemLayout` (new internal constructor).

* Most of item visibility switching logic (show/hide) has now been moved from the `Item` and `Grid` to `ItemVisibility` (new internal constructor).

* Safeguards for sorting items by refrence array are now removed. Instead Muuri will throw an error if the items do not match in the arrays.

* We now have a proper build process powered by Rollup. All the functionality is split into logical modules. Makes developing a bit more easier and approachable.

* Prettier was embraced as the code formatter.

* We no longer keep a collection of item instances internally. Instead we store the item reference directly.

* `ItemDrag` is completely refactored.

* Removed `bower.json`.

* Minified file is now also unit tested to prevent possible breakage in the minfication process.

## Todo

* Check filter and sort methods with care, because they seem a bit buggy on mac chrome and firefox in the demo. However, the search filtering is smooth.

* The new layout system is glitching sometimes a bit, an item is moved over another item accidentally. Make sure edge cases are checked.

* Take a look at the current drag start predicate, it's a bit huge. Could we simplify it a bit?

* Migrations are a bit painful on perf. Let's try to make them less so. Also there's a bunch of overlapping logic within drag's migrate and the actual `ItemMigrate`.