/**
 * Muuri Emitter
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Emitter/LICENSE.md
 */

export type EventName = string;
export type EventListener = Function;

/**
 * Event emitter.
 */
export default class Emitter {
  _events: { [event: string]: EventListener[] } | null;
  _queue: EventListener[];
  _counter: number;
  _clearOnEmit: boolean;

  constructor() {
    this._events = {};
    this._queue = [];
    this._counter = 0;
    this._clearOnEmit = false;
  }

  /**
   * Bind an event listener.
   */
  on(event: EventName, listener: EventListener): this {
    if (!this._events) return this;

    // Get listeners queue and create it if it does not exist.
    const listeners = this._events[event] || [];
    this._events[event] = listeners;

    // Add the listener to the queue.
    listeners.push(listener);

    return this;
  }

  /**
   * Unbind all event listeners that match the provided listener function.
   */
  off(event: EventName, listener: EventListener): this {
    if (!this._events) return this;

    // Get listeners and return immediately if none is found.
    const listeners = this._events[event];
    if (!listeners || !listeners.length) return this;

    // Remove all matching listeners.
    let index = 0;
    while ((index = listeners.indexOf(listener)) !== -1) {
      listeners.splice(index, 1);
    }

    return this;
  }

  /**
   * Unbind all listeners of the provided event.
   */
  clear(event: EventName): this {
    if (!this._events) return this;

    const listeners = this._events[event];
    if (listeners) {
      listeners.length = 0;
      delete this._events[event];
    }

    return this;
  }

  /**
   * Emit all listeners in a specified event with the provided arguments.
   */
  emit(event: EventName, ...args: any[]): this {
    if (!this._events) {
      this._clearOnEmit = false;
      return this;
    }

    // Get event listeners and quit early if there's no listeners.
    const listeners = this._events[event];
    if (!listeners || !listeners.length) {
      this._clearOnEmit = false;
      return this;
    }

    const queue = this._queue;
    const startIndex = queue.length;

    // Add the current listeners to the callback queue before we process them.
    // This is necessary to guarantee that all of the listeners are called in
    // correct order even if new event listeners are removed/added during
    // processing and/or events are emitted during processing.
    queue.push(...listeners);

    // Reset the event's listeners if need be.
    if (this._clearOnEmit) {
      listeners.length = 0;
      this._clearOnEmit = false;
    }

    // Increment queue counter. This is needed for the scenarios where emit is
    // triggered while the queue is already processing. We need to keep track of
    // how many "queue processors" there are active so that we can safely reset
    // the queue in the end when the last queue processor is finished.
    ++this._counter;

    // Process the queue (the specific part of it for this emit).
    let i = startIndex;
    const endIndex = queue.length;
    for (; i < endIndex; i++) {
      queue[i](...args);
      // Stop processing if the emitter is destroyed.
      if (!this._events) return this;
    }

    // Decrement queue process counter.
    --this._counter;

    // Reset the queue if there are no more queue processes running.
    if (!this._counter) queue.length = 0;

    return this;
  }

  /**
   * Emit all listeners in a specified event with the provided arguments and
   * remove the event's listeners just before calling the them. This method
   * allows the emitter to serve as a queue where all listeners are called only
   * once.
   */
  burst(event: EventName, ...args: any[]): this {
    if (!this._events) return this;
    this._clearOnEmit = true;
    return this.emit(event, ...args);
  }

  /**
   * Check how many listeners there are for a specific event.
   */
  countListeners(event: EventName) {
    if (!this._events) return 0;
    const listeners = this._events[event];
    return listeners ? listeners.length : 0;
  }

  /**
   * Destroy emitter instance. Basically just removes all bound listeners.
   */
  destroy(): this {
    if (!this._events) return this;
    this._queue.length = this._counter = 0;
    this._events = null;
    return this;
  }
}
