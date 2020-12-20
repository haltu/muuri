/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import Grid, { LayoutOptions } from '../Grid/Grid';
import Item from '../Item/Item';
import createPackerProcessor, {
  LayoutData as ProcessorLayoutData,
  LayoutSettingsMasks,
  LayoutPacket,
} from './createPackerProcessor';

import { StyleDeclaration } from '../types';

import { createWorkerProcessors, destroyWorkerProcessors } from './workerUtils';

interface ContainerData {
  width: number;
  height: number;
  borderLeft?: number;
  borderRight?: number;
  borderTop?: number;
  borderBottom?: number;
  boxSizing?: 'content-box' | 'border-box' | '';
}

type LayoutId = number;

type LayoutCallback = (layout: LayoutData) => any;

interface LayoutData extends ProcessorLayoutData {
  id: LayoutId;
  styles: StyleDeclaration;
  items: Item[];
}

interface LayoutWorkerData extends LayoutData {
  container: ContainerData;
  settings: number;
  callback: LayoutCallback;
  packet: Float32Array;
  aborted: boolean;
  worker?: Worker;
}

const FILL_GAPS: LayoutSettingsMasks['fillGaps'] = 1;
const HORIZONTAL: LayoutSettingsMasks['horizontal'] = 2;
const ALIGN_RIGHT: LayoutSettingsMasks['alignRight'] = 4;
const ALIGN_BOTTOM: LayoutSettingsMasks['alignBottom'] = 8;
const ROUNDING: LayoutSettingsMasks['rounding'] = 16;

const PACKET_INDEX_ID: LayoutPacket['id'] = 0;
const PACKET_INDEX_WIDTH: LayoutPacket['width'] = 1;
const PACKET_INDEX_HEIGHT: LayoutPacket['height'] = 2;
const PACKET_INDEX_SETTINGS: LayoutPacket['settings'] = 3;
const PACKET_HEADER_SLOTS: LayoutPacket['slots'] = 4;

const PACKER_PROCESSOR = createPackerProcessor();

export default class Packer {
  _settings: number;
  _asyncMode: boolean;
  _layoutWorkerQueue: LayoutId[];
  _layoutsProcessing: Set<LayoutId>;
  _layoutWorkerData: Map<LayoutId, LayoutWorkerData>;
  _workers: Worker[];

  constructor(numWorkers = 0, options?: LayoutOptions) {
    this._settings = 0;
    this._asyncMode = true;
    this._workers = [];
    this._layoutWorkerQueue = [];
    this._layoutsProcessing = new Set();
    this._layoutWorkerData = new Map();
    this._onWorkerMessage = this._onWorkerMessage.bind(this);

    // Set initial options.
    if (options) this.updateSettings(options);

    // Try to init the workers.
    try {
      this._workers = createWorkerProcessors(numWorkers, this._onWorkerMessage);
      this._asyncMode = !!this._workers.length;
    } catch (e) {}
  }

  _sendToWorker() {
    if (!this._layoutWorkerQueue.length || !this._workers.length) return;

    const worker = this._workers.pop() as Worker;
    const layoutId = this._layoutWorkerQueue.shift() as LayoutId;
    const workerData = this._layoutWorkerData.get(layoutId) as LayoutWorkerData;

    workerData.worker = worker;
    this._layoutsProcessing.add(layoutId);

    const { buffer } = workerData.packet;
    worker.postMessage(buffer, [buffer]);
  }

  _onWorkerMessage(msg: { data: ArrayBufferLike }) {
    const data = new Float32Array(msg.data);
    const layoutId = data[PACKET_INDEX_ID] as LayoutId;
    const layoutData = this._layoutWorkerData.get(layoutId);

    // Delete internal references.
    this._layoutWorkerData.delete(layoutId);
    this._layoutsProcessing.delete(layoutId);

    // If we don't have layout data for some reason, there's nothing we can do.
    if (!layoutData) return;

    // Return worker to the pool.
    const { worker } = layoutData;
    if (worker) this._workers.push(worker);

    // If layout has not been aborted let's finish things up.
    if (!layoutData.aborted) {
      const layout: LayoutData = {
        id: layoutId,
        items: layoutData.items,
        slots: data.subarray(PACKET_HEADER_SLOTS, data.length),
        width: data[PACKET_INDEX_WIDTH],
        height: data[PACKET_INDEX_HEIGHT],
        styles: {},
      };
      this._setContainerStyles(layout, layoutData.container, layoutData.settings);
      layoutData.callback(layout);
    }

    // Finally try to process the next layout in the queue.
    if (worker) this._sendToWorker();
  }

  _setContainerStyles(layout: LayoutData, containerData: ContainerData, settings: number) {
    const isHorizontal = !!(settings & HORIZONTAL);
    const isBorderBox = containerData.boxSizing === 'border-box';
    const { borderLeft = 0, borderRight = 0, borderTop = 0, borderBottom = 0 } = containerData;
    const { styles, width, height } = layout;

    if (isHorizontal) {
      styles.width = (isBorderBox ? width + borderLeft + borderRight : width) + 'px';
    } else {
      styles.height = (isBorderBox ? height + borderTop + borderBottom : height) + 'px';
    }
  }

  updateSettings(options: LayoutOptions) {
    let fillGaps = this._settings & FILL_GAPS;
    if (typeof options.fillGaps === 'boolean') {
      fillGaps = options.fillGaps ? FILL_GAPS : 0;
    }

    let horizontal = this._settings & HORIZONTAL;
    if (typeof options.horizontal === 'boolean') {
      horizontal = options.horizontal ? HORIZONTAL : 0;
    }

    let alignRight = this._settings & ALIGN_RIGHT;
    if (typeof options.alignRight === 'boolean') {
      alignRight = options.alignRight ? ALIGN_RIGHT : 0;
    }

    let alignBottom = this._settings & ALIGN_BOTTOM;
    if (typeof options.alignBottom === 'boolean') {
      alignBottom = options.alignBottom ? ALIGN_BOTTOM : 0;
    }

    let rounding = this._settings & ROUNDING;
    if (typeof options.rounding === 'boolean') {
      rounding = options.rounding ? ROUNDING : 0;
    }

    this._settings = fillGaps | horizontal | alignRight | alignBottom | rounding;
  }

  createLayout(
    grid: Grid,
    layoutId: LayoutId,
    items: Item[],
    width: number,
    height: number,
    callback: LayoutCallback
  ) {
    if (this._layoutWorkerData.has(layoutId)) {
      throw new Error('A layout with the provided id is currently being processed.');
    }

    const containerData: ContainerData = {
      width: width,
      height: height,
      borderLeft: grid._borderLeft,
      borderRight: grid._borderRight,
      borderTop: grid._borderTop,
      borderBottom: grid._borderBottom,
      boxSizing: grid._boxSizing,
    };

    const useSyncProcessing = !this._asyncMode || !items.length;
    const isHorizontal = this._settings & HORIZONTAL;
    const layout: LayoutData = {
      id: layoutId,
      items: items,
      slots: new Float32Array(useSyncProcessing ? items.length * 2 : 0),
      width: isHorizontal ? 0 : containerData.width,
      height: !isHorizontal ? 0 : containerData.height,
      styles: {},
    };

    // Compute layout synchronously if needed.
    if (useSyncProcessing) {
      if (items.length) PACKER_PROCESSOR.computeLayout(layout, this._settings);
      this._setContainerStyles(layout, containerData, this._settings);
      callback(layout);
      return;
    }

    // Create worker packet.
    const packet = new Float32Array(PACKET_HEADER_SLOTS + items.length * 2);

    // Add headers to packet.
    packet[PACKET_INDEX_ID] = layoutId;
    packet[PACKET_INDEX_WIDTH] = layout.width;
    packet[PACKET_INDEX_HEIGHT] = layout.height;
    packet[PACKET_INDEX_SETTINGS] = this._settings;

    // Add items packet.
    let i = 0;
    let j = PACKET_HEADER_SLOTS - 1;
    for (; i < items.length; i++) {
      const item = items[i];
      packet[++j] = item._width + (item._marginLeft || 0) + (item._marginRight || 0);
      packet[++j] = item._height + (item._marginTop || 0) + (item._marginBottom || 0);
    }

    // Store the layout data and add it to worker queue.
    this._layoutWorkerQueue.push(layoutId);
    this._layoutWorkerData.set(layoutId, {
      ...layout,
      container: containerData,
      settings: this._settings,
      callback: callback,
      packet: packet,
      aborted: false,
    });

    // Try to send the next layout to worker for processing.
    this._sendToWorker();

    // Return the cancel method for this specific layout.
    return this.cancelLayout.bind(this, layoutId);
  }

  cancelLayout(layoutId: LayoutId) {
    const data = this._layoutWorkerData.get(layoutId);
    if (!data || data.aborted) return;

    // If the layout is queueing to worker we can safely just remove
    // all the refences to it, otherwise let's mark it as aborted.
    if (data.worker) {
      data.aborted = true;
    } else {
      const queueIndex = this._layoutWorkerQueue.indexOf(layoutId);
      this._layoutWorkerQueue.splice(queueIndex, 1);
      this._layoutWorkerData.delete(layoutId);
    }
  }

  destroy() {
    // Cancel all queueing and processing layouts, and move all currently used
    // workers back into the workers array.
    this._layoutWorkerData.forEach((data) => {
      this.cancelLayout(data.id);
      if (data.worker) this._workers.push(data.worker);
    });

    // Reset all the worker related data.
    this._layoutWorkerData.clear();
    this._layoutsProcessing.clear();
    this._layoutWorkerQueue.length = 0;

    // Destroy all workers.
    destroyWorkerProcessors(this._workers);
    this._workers.length = 0;
  }
}
