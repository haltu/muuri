/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import PackerProcessor from './PackerProcessor';
import {
  PACKET_INDEX_WIDTH,
  PACKET_INDEX_HEIGHT,
  PACKET_INDEX_OPTIONS,
  PACKET_HEADER_SLOTS
} from './constants';

var processor = new PackerProcessor();

onmessage = function(msg) {
  var data = new Float32Array(msg.data);
  var items = data.subarray(PACKET_HEADER_SLOTS, data.length);
  var slots = new Float32Array(items.length);
  var layout = {
    items: items,
    slots: slots,
    width: data[PACKET_INDEX_WIDTH],
    height: data[PACKET_INDEX_HEIGHT],
    settings: data[PACKET_INDEX_OPTIONS]
  };

  // Fill the layout (width / height / slots).
  processor.fillLayout(layout);

  // Copy layout data to the return data.
  data[PACKET_INDEX_WIDTH] = layout.width;
  data[PACKET_INDEX_HEIGHT] = layout.height;
  data.set(layout.slots, PACKET_HEADER_SLOTS);

  // Send layout back to the main thread.
  postMessage(data.buffer, [data.buffer]);
};
