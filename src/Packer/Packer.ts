/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import createPackerProcessor from './createPackerProcessor';
import { createWorkerProcessors, destroyWorkerProcessors } from './workerUtils';
import { StyleDeclaration } from '../types';

export interface PackerLayoutOptions {
  fillGaps?: boolean;
  horizontal?: boolean;
  alignRight?: boolean;
  alignBottom?: boolean;
  rounding?: boolean;
}

export interface PackerLayoutSettingsMasks {
  readonly fillGaps: 1;
  readonly horizontal: 2;
  readonly alignRight: 4;
  readonly alignBottom: 8;
  readonly rounding: 16;
}

export interface PackerLayoutPacket {
  readonly id: 0;
  readonly width: 1;
  readonly height: 2;
  readonly settings: 3;
  readonly slots: 4;
}

export interface PackerContainerData {
  width: number;
  height: number;
  borderLeft?: number;
  borderRight?: number;
  borderTop?: number;
  borderBottom?: number;
  boxSizing?: 'content-box' | 'border-box' | '';
}

export type PackerLayoutId = number;

export type PackerLayoutCallback = (layout: PackerLayoutData) => void;

export interface PackerLayoutItem {
  width: number;
  height: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  [key: string]: any;
}

export interface PackerLayoutData {
  id: PackerLayoutId;
  items: PackerLayoutItem[];
  width: number;
  height: number;
  slots: Float32Array;
  styles: StyleDeclaration;
}

interface PackerLayoutWorkerData extends PackerLayoutData {
  container: PackerContainerData;
  settings: number;
  callback: PackerLayoutCallback;
  packet: Float32Array;
  aborted: boolean;
  worker?: Worker;
}

const SETTINGS: PackerLayoutSettingsMasks = {
  fillGaps: 1,
  horizontal: 2,
  alignRight: 4,
  alignBottom: 8,
  rounding: 16,
};

const PACKET_INDEX: PackerLayoutPacket = {
  id: 0,
  width: 1,
  height: 2,
  settings: 3,
  slots: 4,
};

const PACKER_PROCESSOR = createPackerProcessor();

export default class Packer {
  protected _settings: number;
  protected _asyncMode: boolean;
  protected _layoutWorkerQueue: PackerLayoutId[];
  protected _layoutsProcessing: Set<PackerLayoutId>;
  protected _layoutWorkerData: Map<PackerLayoutId, PackerLayoutWorkerData>;
  protected _workers: Worker[];

  constructor(numWorkers = 0, options?: PackerLayoutOptions) {
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

  updateSettings(options: PackerLayoutOptions) {
    let fillGaps = this._settings & SETTINGS.fillGaps;
    if (typeof options.fillGaps === 'boolean') {
      fillGaps = options.fillGaps ? SETTINGS.fillGaps : 0;
    }

    let horizontal = this._settings & SETTINGS.horizontal;
    if (typeof options.horizontal === 'boolean') {
      horizontal = options.horizontal ? SETTINGS.horizontal : 0;
    }

    let alignRight = this._settings & SETTINGS.alignRight;
    if (typeof options.alignRight === 'boolean') {
      alignRight = options.alignRight ? SETTINGS.alignRight : 0;
    }

    let alignBottom = this._settings & SETTINGS.alignBottom;
    if (typeof options.alignBottom === 'boolean') {
      alignBottom = options.alignBottom ? SETTINGS.alignBottom : 0;
    }

    let rounding = this._settings & SETTINGS.rounding;
    if (typeof options.rounding === 'boolean') {
      rounding = options.rounding ? SETTINGS.rounding : 0;
    }

    this._settings = fillGaps | horizontal | alignRight | alignBottom | rounding;
  }

  createLayout(
    layoutId: PackerLayoutId,
    items: PackerLayoutItem[],
    containerData: PackerContainerData,
    callback: PackerLayoutCallback
  ) {
    if (this._layoutWorkerData.has(layoutId)) {
      throw new Error('A layout with the provided id is currently being processed.');
    }

    const useSyncProcessing = !this._asyncMode || !items.length;
    const isHorizontal = this._settings & SETTINGS.horizontal;
    const layout: PackerLayoutData = {
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
    const packet = new Float32Array(PACKET_INDEX.slots + items.length * 2);

    // Add headers to packet.
    packet[PACKET_INDEX.id] = layoutId;
    packet[PACKET_INDEX.width] = layout.width;
    packet[PACKET_INDEX.height] = layout.height;
    packet[PACKET_INDEX.settings] = this._settings;

    // Add items packet.
    let i = 0;
    let j = PACKET_INDEX.slots - 1;
    for (; i < items.length; i++) {
      const item = items[i];
      packet[++j] = item.width + (item.marginLeft || 0) + (item.marginRight || 0);
      packet[++j] = item.height + (item.marginTop || 0) + (item.marginBottom || 0);
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

  cancelLayout(layoutId: PackerLayoutId) {
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

  protected _sendToWorker() {
    if (!this._layoutWorkerQueue.length || !this._workers.length) return;

    const worker = this._workers.pop() as Worker;
    const layoutId = this._layoutWorkerQueue.shift() as PackerLayoutId;
    const workerData = this._layoutWorkerData.get(layoutId) as PackerLayoutWorkerData;

    workerData.worker = worker;
    this._layoutsProcessing.add(layoutId);

    const { buffer } = workerData.packet;
    worker.postMessage(buffer, [buffer]);
  }

  protected _onWorkerMessage(msg: { data: ArrayBufferLike }) {
    const data = new Float32Array(msg.data);
    const layoutId = data[PACKET_INDEX.id] as PackerLayoutId;
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
      const layout: PackerLayoutData = {
        id: layoutId,
        items: layoutData.items,
        slots: data.subarray(PACKET_INDEX.slots, data.length),
        width: data[PACKET_INDEX.width],
        height: data[PACKET_INDEX.height],
        styles: {},
      };
      this._setContainerStyles(layout, layoutData.container, layoutData.settings);
      layoutData.callback(layout);
    }

    // Finally try to process the next layout in the queue.
    if (worker) this._sendToWorker();
  }

  protected _setContainerStyles(
    layout: PackerLayoutData,
    containerData: PackerContainerData,
    settings: number
  ) {
    const isHorizontal = !!(settings & SETTINGS.horizontal);
    const isBorderBox = containerData.boxSizing === 'border-box';
    const { borderLeft = 0, borderRight = 0, borderTop = 0, borderBottom = 0 } = containerData;
    const { styles, width, height } = layout;

    if (isHorizontal) {
      styles.width = (isBorderBox ? width + borderLeft + borderRight : width) + 'px';
    } else {
      styles.height = (isBorderBox ? height + borderTop + borderBottom : height) + 'px';
    }
  }
}
