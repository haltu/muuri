/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import { createPackerProcessor } from './createPackerProcessor';

// Cache packer processor's blob url so we don't have to create multiple times
// for nothing.
let blobUrl = '';

// Keep track of all spawned workers.
const allWorkers: Set<Worker> = new Set();

export function createWorkerProcessors(
  amount: number,
  onmessage: (e: { data: Float32Array }) => void
) {
  const workers: Worker[] = [];

  if (amount > 0) {
    if (!blobUrl) {
      blobUrl = URL.createObjectURL(
        new Blob(['(' + createPackerProcessor.toString() + ')(true)'], {
          type: 'application/javascript',
        })
      );
    }

    let i = 0;
    for (; i < amount; i++) {
      const worker = new Worker(blobUrl);
      worker.onmessage = onmessage;
      workers.push(worker);
      allWorkers.add(worker);
    }
  }

  return workers;
}

export function destroyWorkerProcessors(workers: Worker[]) {
  let i = 0;
  for (; i < workers.length; i++) {
    const worker = workers[i];
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    allWorkers.delete(worker);
  }

  if (blobUrl && !allWorkers.size) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = '';
  }
}
