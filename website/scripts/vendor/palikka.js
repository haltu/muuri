/*!
 * @license
 * Palikka v0.4.1
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

(function (undefined) {

  'use strict';

  var

  /**
   * @alias Palikka
   * @global
   */
  palikka = {},

  /** Library namespace. */
  ns = 'palikka',

  /** Generic unique identifier. */
  uid = 0,

  /**
   * @constant {String}
   * @default
   */
  statePending = 'pending',

  /**
   * @constant {String}
   * @default
   */
  stateFulfilled = 'fulfilled',

  /**
   * @constant {String}
   * @default
   */
  stateRejected = 'rejected',

  /**
   * @alias Configuration
   * @public
   */
  config = {

    /**
     * @public
     * @type {Boolean}
     */
    asyncDeferreds: true,

    /**
     * @public
     * @type {Boolean}
     */
    asyncModules: true

  },

  /** Modules stuff: container object, event hub and event names. */
  modules = {},
  moduleEvents,
  evInitiate = 'a',

  /** Cache string representations of object types. */
  typeFunction = 'function',
  typeObject = 'object',
  typeArray = 'array',
  typeArguments = 'arguments',
  typeNumber = 'number',
  typeString = 'string',

  /** Cache native toString and slice methods. */
  toString = {}.toString,
  slice = [].slice,

  /** Check if strict mode is supported. */
  isStrict = !this === true,

  /** Check if we are in Node.js environment. */
  isNode = typeof process === typeObject && typeOf(process, 'process'),

  /** Determine global object. */
  glob = isNode ? global : window,

  /**
   * Execute a function in the next turn of event loop.
   *
   * @alias nextTick
   * @public
   * @param {Function} function
   */
  nextTick = getNextTick(),

  /** Cache class prototypes. */
  eventizerProto = Eventizer.prototype,
  deferredProto = Deferred.prototype;

  /**
   * Eventizer - Constructor
   * ***********************
   */

  /**
   * Eventizer instance constructor.
   *
   * @class
   * @public
   * @param {Object} [listeners] - An object where the instance's event listeners will be stored.
   */
  function Eventizer(listeners) {

    /**
     * The object where all the instance's event listeners are stored in.
     *
     * @protected
     * @type {Object}
     */
    this._listeners = typeOf(listeners, typeObject) ? listeners : {};

  }

  /**
   * @callback Eventizer~listenerCallback
   * @param {Eventizer~listenerData} ev
   * @param {...*} arg
   */

  /**
   * @typedef {Object} Eventizer~listenerData
   * @property {Number} id - The event listener's id.
   * @property {Function} fn - The event listener's callback function.
   * @property {String} type - The event listener's type.
   */

  /**
   * Bind an event listener.
   *
   * @memberof Eventizer.prototype
   * @public
   * @param {String} type - Event's name.
   * @param {Eventizer~callback} callback - Callback function that will be called when the event is emitted.
   * @param {*} [ctx] - Callback function's context.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
   */
  eventizerProto.on = function (type, callback, ctx) {

    var
    listeners = this._listeners;

    if (typeOf(callback, typeFunction)) {

      listeners[type] = listeners[type] || [];
      listeners[type].push({
        id: ++uid,
        fn: callback,
        ctx: ctx
      });

    }

    return this;

  };

  /**
   * Bind an event listener that is called only once.
   *
   * @memberof Eventizer.prototype
   * @public
   * @param {String} type - Event's name.
   * @param {Eventizer~callback} callback - Callback function that will be called when the event is emitted.
   * @param {*} [ctx] - Callback function's context.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
   */
  eventizerProto.one = function (type, callback, ctx) {

    var
    instance = this;

    instance.on(type, function (e) {

      var
      args = cloneArray(arguments);

      /** Propagate the original callback function to the callback's event object. */
      args[0].fn = callback;

      /** Unbind the event listener after execution. */
      instance.off(e.type, e.id);

      /** Call the original callback. */
      callback.apply(this, args);

    }, ctx);

    return instance;

  };

  /**
   * Unbind event listeners. If no target is provided all listeners for the specified event will be removed.
   *
   * @memberof Eventizer.prototype
   * @public
   * @param {String} type - Event's name.
   * @param {Function|Number} [target] - Filter the event listener's to be removed by callback function or id.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
   */
  eventizerProto.off = function (type, target) {

    var
    listeners = this._listeners,
    eventObjects = listeners[type],
    counter = eventObjects && eventObjects.length;

    /** Make sure that at least one event listener exists before unbinding. */
    if (counter) {

      /** If target is defined, let's do a "surgical" unbind. */
      if (target) {

        var
        targetType = typeOf(target),
        targetId = targetType === typeNumber,
        targetFn = targetType === typeFunction,
        eventObject;

        while (counter--) {

          eventObject = eventObjects[counter];

          if ((targetFn && target === eventObject.fn) || (targetId && target === eventObject.id)) {

            eventObjects.splice(counter, 1);

          }

        }

      }
      /** If no target is defined, let's unbind all the event type's listeners. */
      else {

        delete listeners[type];

      }

    }

    return this;

  };

  /**
   * Emit event.
   *
   * @memberof Eventizer.prototype
   * @public
   * @param {String} type - Event's name.
   * @param {Array} [args] - Arguments that will be applied to the event listener callbacks.
   * @param {*} [ctx] - Custom context that will be applied to the event listener callbacks. Overrides custom context
   *                    defined by .on() and .one() methods.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
   */
  eventizerProto.emit = function (type, args, ctx) {

    var
    instance = this,
    eventObjects = instance._listeners[type],
    cbArgs;

    if (eventObjects) {

      /**
       * Loop through a cloned set of event listeners. If the listeners are not cloned before looping there is always
       * the risk that the listeners array gets modified while the loop is being executed, which is something we don't
       * want to happen.
       */
      arrayEach(cloneArray(eventObjects), function (eventObject) {

        /** Safety check (probably unnecessary) just to make sure that the callback function really exists. */
        if (typeOf(eventObject.fn, typeFunction)) {

          /** Clone provided arguments, and add the event data object as the first item. */
          cbArgs = cloneArray(args);
          cbArgs.unshift({
            type: type,
            id: eventObject.id,
            fn: eventObject.fn
          });

          /**
           * Event listener callback context definition:
           * 1. If emit method's ctx argument is defined (-> is not undefined) it is used.
           * 2. Then, if event listener's context is defined, it is used.
           * 3. If no context is defined at all the current instance (this) is used as context.
           */
          eventObject.fn.apply(ctx !== undefined ? ctx : eventObject.ctx !== undefined ? eventObject.ctx : instance, cbArgs);

        }

      });

    }

    return instance;

  };

  /*
   * Eventizer - Helpers
   * *******************
   */

  /**
   * Creates a new Eventizer instance that will be returned directly if no object is provided as the first argument. If
   * an object is provided as the first argument the created Eventizer instance's properties and methods will be
   * propagated to the provided object and the provided object will be returned instead.
   *
   * @public
   * @constructs Eventizer
   * @param {Object} [obj]
   * @param {Object} [listeners]
   * @returns {Object|Eventizer}
   */
  function eventize(obj, listeners) {

    var
    eventizer = new Eventizer(listeners);

    if (typeOf(obj, typeObject)) {

      obj.on = eventizer.on;
      obj.one = eventizer.one;
      obj.off = eventizer.off;
      obj.emit = eventizer.emit;
      obj._listeners = eventizer._listeners;

      return obj;

    }
    else {

      return eventizer;

    }

  }

  /*
   * Deferred - Constructor
   * **********************
   */

  /**
   * Deferred instance constructor.
   *
   * @class
   * @public
   * @param {Function} executor
   */
  function Deferred(executor) {

    var
    instance = this;

    /**
     * Indicates if the instance can be resolved or rejected currently. The instance cannot be resolved or rejected
     * after it's once locked.
     *
     * @protected
     * @type {Boolean}
     */
    instance._locked = false;

    /**
     * The instance's result value.
     *
     * @protected
     * @type {*}
     */
    instance._result = undefined;

    /**
     * Holds the instance's current state: 'pending', 'fulfilled' or 'rejected'.
     *
     * @protected
     * @type {String}
     */
    instance._state = statePending;

    /**
     * Indicates if the instance is currently in asynchronous mode.
     *
     * @protected
     * @type {Boolean}
     */
    instance._async = config.asyncDeferreds;

    /**
     * Callback queue.
     *
     * @protected
     * @type {Deferred~handler[]}
     */
    instance._handlers = [];

    /** Call executor function if provided. */
    if (typeOf(executor, typeFunction)) {

      executor(
        function (val) {

          instance.resolve(val);

        },
        function (reason) {

          instance.reject(reason);

        }
      );

    }

  }

  /**
   * @callback Deferred~handlerCallback
   * @param {*|...*} result - Deferred instance's result.
   */

  /**
   * @typedef {Object} Deferred~handler
   * @property {Deferred~handlerCallback} fn - The handler's callback function.
   * @property {String|Undefined} type - The handler's type: fulfilled', 'rejected' or undefined.
   */

  /**
   * @typedef {Object} Deferred~inspection
   * @property {String} state - Inspected instance's state: 'pending', 'fulfilled' or 'rejected'.
   * @property {*} result - Inspected instance's result.
   * @property {Boolean} locked - Is inspected instance locked?
   * @property {Boolean} async - Is inspected instance in asynchronous mode?
   */

  /**
   * Get current state of the instance.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {String} 'pending', 'fulfilled' or 'rejected'.
   */
  deferredProto.state = function () {

    return this._state;

  };

  /**
   * Get instance's result.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {*}
   */
  deferredProto.result = function () {

    return this._result;

  };

  /**
   * Check if the current instance is set to work asynchronously.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {Boolean}
   */
  deferredProto.isAsync = function () {

    return this._async;

  };

  /**
   * Check if the current instance is locked.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {Boolean}
   */
  deferredProto.isLocked = function () {

    return this._locked;

  };

  /**
   * Get a snapshot of the instances current status.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {Deferred~inspection}
   */
  deferredProto.inspect = function () {

    var
    instance = this;

    return {
      state: instance._state,
      result: instance._result,
      locked: instance._locked,
      async: instance._async
    };

  };

  /**
   * Set current instance to work synchronously.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.sync = function () {

    this._async = false;

    return this;

  };

  /**
   * Set current instance to work asynchronously.
   *
   * @memberof Deferred.prototype
   * @public
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.async = function () {

    this._async = true;

    return this;

  };

  /**
   * Resolve deferred.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {*} [value]
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.resolve = function (value) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      processResolve(instance, value);

    }

    return instance;

  };

  /**
   * Reject Deferred instance.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {*} [reason]
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.reject = function (reason) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      finalizeDeferred(instance, reason, stateRejected);

    }

    return instance;

  };

  /**
   * Execute a callback function when the Deferred instance is resolved.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {Deferred~handlerCallback} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onFulfilled = function (callback) {

    return bindDeferredCallback(this, callback, stateFulfilled);

  };

  /**
   * Execute a callback function when the Deferred instance is rejected.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {Deferred~handlerCallback} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onRejected = function (callback) {

    return bindDeferredCallback(this, callback, stateRejected);

  };

  /**
   * Execute a callback function when the Deferred instance is either resolved or rejected.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {Deferred~handlerCallback} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onSettled = function (callback) {

    return bindDeferredCallback(this, callback);

  };

  /**
   * Returns a new Deferred instance which is settled when the calling instance is settled.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {Deferred~handlerCallback} [onFulfilled]
   * @param {Deferred~handlerCallback} [onRejected]
   * @returns {Deferred} A new Deferred instance.
   */
  deferredProto.then = function (onFulfilled, onRejected) {

    return then(this, onFulfilled, onRejected);

  };

  /**
   * The same as Eventizer.prototype.then() with the exception that if the result of the calling instance is an array
   * it's result is spread over the arguments of the returned instance's callback functions.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {Deferred~handlerCallback} [onFulfilled]
   * @param {Deferred~handlerCallback} [onRejected]
   * @returns {Deferred} A new Deferred instance.
   */
  deferredProto.spread = function (onFulfilled, onRejected) {

    return then(this, onFulfilled, onRejected, 1);

  };

  /**
   * Same as when() with the exception that the calling instance is automatically added as the first value of the values
   * array.
   *
   * @memberof Deferred.prototype
   * @public
   * @param {Array} values
   * @param {Boolean} [resolveImmediately=false]
   * @param {Boolean} [rejectImmediately=true]
   * @returns {Deferred} A new Deferred instance.
   */
  deferredProto.and = function (values, resolveImmediately, rejectImmediately) {

    values.unshift(this);

    return when(values, resolveImmediately, rejectImmediately);

  };

  /**
   * Deferred - Helpers
   * ******************
   */

  /**
   * Return a new Deferred instance.
   *
   * @public
   * @constructs Deferred
   * @param {Function} [executor]
   * @returns {Deferred}
   */
  function defer(executor) {

    return new Deferred(executor);

  }

  /**
   * Process Deferred instance's resolve method.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} value
   */
  function processResolve(instance, value) {

    if (value === instance) {

      finalizeDeferred(instance, TypeError('A promise can not be resolved with itself.'), stateRejected);

    }
    else if (value instanceof Deferred) {

      value.onSettled(function (result) {

        finalizeDeferred(instance, result, value._state);

      });

    }
    else if (typeOf(value, typeFunction) || typeOf(value, typeObject)) {

      processThenable(instance, value);

    }
    else {

      finalizeDeferred(instance, value, stateFulfilled);

    }

  }

  /**
   * Process a thenable object or function.
   *
   * @private
   * @param {Deferred} instance
   * @param {Function|Object} thenable
   */
  function processThenable(instance, thenable) {

    try {

      var
      then = thenable.then,
      thenHandled;

      if (typeOf(then, typeFunction)) {

        try {

          then.call(
            thenable,
            function (value) {

              if (!thenHandled) {

                thenHandled = 1;
                processResolve(instance, value);

              }

            },
            function (reason) {

              if (!thenHandled) {

                thenHandled = 1;
                finalizeDeferred(instance, reason, stateRejected);

              }

            }
          );

        }
        catch (e) {

          if (!thenHandled) {

            thenHandled = 1;
            finalizeDeferred(instance, e, stateRejected);

          }

        }

      }
      else {

        finalizeDeferred(instance, thenable, stateFulfilled);

      }

    }
    catch (e) {

      finalizeDeferred(instance, e, stateRejected);

    }

  }

  /**
   * Finalize Deferred instance's resolve/reject process.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} result
   * @param {String} state
   */
  function finalizeDeferred(instance, result, state) {

    instance._result = result;
    instance._state = state;

    var
    handlersLength = instance._handlers.length;

    if (handlersLength) {

      arrayEach(instance._handlers.splice(0, handlersLength), function (handler) {

        if (!handler.type || handler.type === state) {

          executeDeferredCallback(instance, handler.fn);

        }

      });

    }

  }

  /**
   * Handler for onResolved, onRejected and onSettled methods.
   *
   * @private
   * @param {Deferred} instance
   * @param {Deferred~handlerCallback} callback
   * @param {String} state
   * @returns {Deferred}
   */
  function bindDeferredCallback(instance, callback, state) {

    if (typeOf(callback, typeFunction)) {

      if (instance._state === statePending) {

        instance._handlers.push({type: state, fn: callback});

      }
      else if (!state || instance._state === state) {

        executeDeferredCallback(instance, callback);

      }

    }

    return instance;

  }

  /**
   * Execute a Deferred instance callback function.
   *
   * @private
   * @param {Deferred} instance
   * @param {Deferred~handlerCallback} callback
   */
  function executeDeferredCallback(instance, callback) {

    instance._async ? nextTick(function () { callback(instance._result); }) : callback(instance._result);

  }

  /**
   * Returns a new Deferred instance which is settled when the calling instance is settled.
   *
   * @private
   * @param {Deferred} instance
   * @param {Deferred~handlerCallback} [onFulfilled]
   * @param {Deferred~handlerCallback} [onRejected]
   * @param {Boolean} [spread]
   * @returns {Deferred} A new Deferred instance.
   */
  function then(instance, onFulfilled, onRejected, spread) {

    var
    next = defer(),
    isFulfilled,
    fateCallback;

    instance.onSettled(function (instanceVal) {

      isFulfilled = instance._state === stateFulfilled;
      onFulfilled = isFulfilled && typeOf(onFulfilled, typeFunction) ? onFulfilled : 0;
      onRejected = !isFulfilled && typeOf(onRejected, typeFunction) ? onRejected : 0;
      fateCallback = onFulfilled || onRejected || 0;

      if (fateCallback || isFulfilled) {

        tryCatch(
          function () {

            next.resolve(fateCallback ? (spread && typeOf(instanceVal, typeArray) ? fateCallback.apply(spread, instanceVal) : fateCallback(instanceVal)) : instanceVal);

          },
          function (e) {

            next.reject(e);

          }
        );

      }
      else {

        next.reject(instanceVal);

      }

    });

    return next;

  }

  /**
   * Returns a new Deferred instance that is settled when all provided values are settled. All values which are not
   * instances of Deferred are transformed into Deferred instances and resolved immediately.
   *
   * @public
   * @param {Array} values
   * @param {Boolean} [resolveImmediately=false]
   * @param {Boolean} [rejectImmediately=true]
   * @returns {Deferred} A new Deferred instance.
   */
  function when(values, resolveImmediately, rejectImmediately) {

    typeCheck(values, typeArray);

    resolveImmediately = resolveImmediately === true;
    rejectImmediately = rejectImmediately === undefined || rejectImmediately === true;

    var
    master = defer(),
    results = [],
    inspects = [],
    counter = values.length,
    firstRejection;

    if (counter) {

      arrayEach(values, function (deferred, i) {

        deferred = deferred instanceof Deferred ? deferred : defer().resolve(deferred);

        deferred.onSettled(function () {

          if (master.state() === statePending && !master.isLocked()) {

            --counter;
            firstRejection = firstRejection || (deferred.state() === stateRejected && deferred);
            results[i] = deferred.result();
            inspects[i] = deferred.inspect();

            if (firstRejection && (rejectImmediately || !counter)) {

              master.reject(rejectImmediately ? firstRejection.result() : inspects);

            }

            if (!firstRejection && (resolveImmediately || !counter)) {

              master.resolve(resolveImmediately ? results[i] : results);

            }

          }

        });

      });

    }
    else {

      master.resolve(results);

    }

    return master;

  }

  /**
   * Module - Constructor
   * ********************
   */

  /**
   * Module instance constructor.
   *
   * @class
   * @private
   * @param {String} id
   * @param {Array} dependencies
   * @param {Function|Object} factory
   */
  function Module(id, dependencies, factory) {

    var
    instance = this,
    deferred = defer().sync();

    /** Module data. */
    instance.id = id;
    instance.dependencies = dependencies;
    instance.deferred = deferred;

    /** Add module to modules object. */
    modules[id] = instance;

    /** Load dependencies and resolve factory value. */
    loadDependencies(dependencies, function (depModules, depHash) {

      deferred
      .resolve(typeOf(factory, typeFunction) ? factory.apply({id: id, dependencies: depHash}, depModules) : factory)
      .onFulfilled(function () {

        moduleEvents.emit(evInitiate + id, [instance]);

      });

    });

  }

  /**
   * Module - Helpers
   * ****************
   */

  /**
   * Define a module or multiple modules.
   *
   * @public
   * @param {Array|String} ids
   * @param {Array|String} [dependencies]
   * @param {Function|Object} factory
   * @returns {Palikka}
   */
  function defineModule(ids, dependencies, factory) {

    var
    hasDeps = arguments.length > 2,
    deps,
    circDep;

    /** Validate/sanitize ids. */
    typeCheck(ids, typeArray + '|' + typeString);
    ids = typeOf(ids, typeArray) ? ids : [ids];

    /** Validate/sanitize dependencies. */
    if (hasDeps) {

      typeCheck(dependencies, typeArray + '|' + typeString);
      deps = typeOf(dependencies, typeArray) ? dependencies : [dependencies];

    }
    else {

      deps = [];

    }

    /** Validate/sanitize factory. */
    factory = hasDeps ? factory : dependencies;
    typeCheck(factory, typeFunction + '|' + typeObject);

    /** Define modules. */
    arrayEach(ids, function (id) {

      /** Validate id type. */
      typeCheck(id, typeString);

      /** Make sure id is not empty. */
      if (!id) {

        throw Error('Module must have an id.');

      }

      /** Make sure id is not reserved. */
      if (modules[id]) {

        throw Error('Module ' + id + ' is already defined.');

      }

      /** Detect circular dependencies. */
      if (hasDeps && deps.length) {

        circDep = getCircDependency(id, deps);

        if (circDep) {

          throw Error('Circular dependency between ' + id + ' and ' + circDep + '.');

        }

      }

      /** Define the module. */
      new Module(id, deps, factory);

    });

    return palikka;

  }

  /**
   * Require a module.
   *
   * @public
   * @param {Array|String} dependencies
   * @param {Function} callback
   * @returns {Palikka}
   */
  function requireModule(dependencies, callback) {

    typeCheck(callback, typeFunction);
    typeCheck(dependencies, typeArray + '|' + typeString);
    dependencies = typeOf(dependencies, typeArray) ? dependencies : [dependencies];

    loadDependencies(dependencies, function (depModules, depHash) {

      callback.apply({dependencies: depHash}, depModules);

    });

    return palikka;

  }

  /**
   * Load module dependencies asynchronously.
   *
   * @private
   * @param {Array} dependencies
   * @param {Function} callback
   */
  function loadDependencies(dependencies, callback) {

    var
    defers = [],
    hash = {};

    arrayEach(dependencies, function (depId) {

      typeCheck(depId, typeString);

      defers.push(modules[depId] ? modules[depId].deferred : defer(function (resolve) {

        moduleEvents.one(evInitiate + depId, function (ev, module) {

          resolve(module.deferred.result());

        });

      }).sync());

    });

    when(defers)
    [config.asyncModules ? 'async' : 'sync']()
    .onFulfilled(function (depModules) {

      arrayEach(dependencies, function (depId, i) {

        hash[depId] = depModules[i];

      });

      callback(depModules, hash);

    });

  }

  /**
   * Return the first circular dependency's id or null.
   *
   * @private
   * @param {String} id
   * @param {Array} dependencies
   * @returns {Null|String}
   */
  function getCircDependency(id, dependencies) {

    var
    ret = null;

    arrayEach(dependencies, function (depId) {

      var
      depModule = modules[depId];

      if (depModule) {

        arrayEach(depModule.dependencies, function (depId) {

          if (!ret && depId === id) {

            ret = depModule.id;

            return 1;

          }

        });

      }

      if (ret) {

        return 1;

      }

    });

    return ret;

  }

  /**
   * List modules. Returns an object containing information about all the modules in their current state.
   *
   * @public
   * @returns {Object}
   */
  function listModules() {

    var
    ret = {},
    m,
    id;

    for (id in modules) {

      m = modules[id];

      ret[id] = {
        id: id,
        dependencies: cloneArray(m.dependencies),
        ready: m.deferred.state() === stateFulfilled ? true : false,
        value: m.deferred.result()
      };

    }

    return ret;

  }

  /**
   * Generic helpers
   * ***************
   */

  /**
   * Returns type of any object in lowercase letters. If "isType" is provided the function will compare the type
   * directly and returns a boolean.
   *
   * @public
   * @param {Object} value
   * @param {String} [isType]
   * @returns {String|Boolean}
   */
  function typeOf(value, isType) {

    var
    type = (
      value === null ? 'null' : /** IE 7/8 -> Null check. */
      value === undefined ? 'undefined' : /** IE 7/8 -> Undefined check. */
      typeof value
    );

    type = type !== typeObject ? type : toString.call(value).split(' ')[1].replace(']', '').toLowerCase();

    /** IE 7/8 -> Arguments check. */
    if (!isStrict && type === typeObject) {

      type = typeof value.callee === typeFunction && value === value.callee.arguments ? typeArguments : type;

    }

    return isType ? type === isType : type;

  }

  /**
   * Throw a type error if a value is not of the expected type(s). Check against multiple types by using '|' as a
   * delimiter.
   *
   * @private
   * @param {*} value
   * @param {String} types
   * @throws {TypeError}
   */
  function typeCheck(value, types) {

    var
    ok = false,
    typesArray = types.split('|');

    arrayEach(typesArray, function (type) {

      ok = !ok ? typeOf(value, type) : ok;

    });

    if (!ok) {

      throw TypeError(value + ' is not ' + types);

    }

  }

  /**
   * Clone array or arguments object.
   *
   * @private
   * @param {Array} array
   * @returns {Array}
   */
  function cloneArray(array) {

    var
    arrayType = typeOf(array);

    return (
      arrayType === typeArray ? array.slice(0) :
      arrayType === typeArguments ? slice.call(array) :
      []
    );

  }

  /**
   * Loop array items.
   *
   * @private
   * @param {Array} array
   * @param {Function} callback
   * @returns {Array}
   */
  function arrayEach(array, callback) {

    if (typeOf(callback, typeFunction)) {

      for (var i = 0, len = array.length; i < len; i++) {

        if (callback(array[i], i)) {

          break;

        }

      }

    }

    return array;

  }

  /**
   * Create cross-browser next tick implementation. Returns a function that accepts a function as a parameter.
   *
   * @private
   * @returns {Function}
   */
  function getNextTick() {

    var
    resolvedPromise = isNative(glob.Promise) && glob.Promise.resolve(),
    nodeTick = isNode && (process.nextTick || glob.setImmediate),
    MobServer = isNative(glob.MutationObserver) || isNative(glob.WebKitMutationObserver),
    MobServerTarget,
    queue = [],
    queueActive = 0,
    fireTick,
    nextTickFn = function (cb) {

      if (typeOf(cb, typeFunction)) {

        queue.push(cb);

        if (!queueActive) {

          queueActive = 1;
          fireTick();

        }

      }

      return palikka;

    },
    processQueue = function () {

      queueActive = 0;
      arrayEach(queue.splice(0, queue.length), function (cb) {

        cb();

      });

    };

    if (resolvedPromise) {

      fireTick = function () {

        resolvedPromise.then(processQueue);

      };

    }
    else if (nodeTick) {

      fireTick = function () {

        nodeTick(processQueue);

      };

    }
    else if (MobServer) {

      MobServerTarget = document.createElement('i');
      (new MobServer(processQueue)).observe(MobServerTarget, {attributes: true});

      fireTick = function () {

        MobServerTarget.id = '';

      };

    }
    else {

      fireTick = function () {

        glob.setTimeout(processQueue, 0);

      };

    }

    return nextTickFn;

  }

  /**
   * Check if a function is native code. Returns the passed function if it is native code and otherwise returns false.
   *
   * @private
   * @param {Function} fn
   * @returns {Function|false}
   */
  function isNative(fn) {

    return typeOf(fn, typeFunction) && fn.toString().indexOf('[native') > -1 && fn;

  }

  /**
   * A generic helper to optimize the use of try-catch.
   *
   * @private
   * @param {Function} done
   * @param {Function} fail
   */
  function tryCatch(done, fail) {

    try {

      done();

    }
    catch (e) {

      fail(e);

    }

  }

  /**
   * Public API
   * **********
   */

  /**
   * @public
   * @memberof Palikka
   * @see Eventizer
   */
  palikka.Eventizer = Eventizer;

  /**
   * @public
   * @memberof Palikka
   * @see eventize
   */
  palikka.eventize = eventize;

  /**
   * @public
   * @memberof Palikka
   * @see Deferred
   */
  palikka.Deferred = Deferred;

  /**
   * @public
   * @memberof Palikka
   * @see defer
   */
  palikka.defer = defer;

  /**
   * @public
   * @memberof Palikka
   * @see when
   */
  palikka.when = when;

  /**
   * @public
   * @memberof Palikka
   * @see defineModule
   */
  palikka.define = defineModule;

  /**
   * @public
   * @memberof Palikka
   * @see requireModule
   */
  palikka.require = requireModule;

  /**
   * @public
   * @memberof Palikka
   * @see listModules
   */
  palikka.list = listModules;

  /**
   * @public
   * @memberof Palikka
   * @see typeOf
   */
  palikka.typeOf = typeOf;

  /**
   * @public
   * @memberof Palikka
   * @see nextTick
   */
  palikka.nextTick = nextTick;

  /**
   * @public
   * @memberof Palikka
   * @see Configuration
   */
  palikka.config = config;

  /**
   * Initiate
   * ********
   */

  /** Create module event hub. */
  moduleEvents = eventize();

  /**
   * Initiate library using returnExports UMD pattern.
   * https://github.com/umdjs/umd/blob/master/returnExports.js
   */
  if (typeof define === typeFunction && define.amd) {

    define([], palikka);

  }
  else if (typeof module === typeObject && module.exports) {

    module.exports = palikka;

  }
  else {

    glob[ns] = palikka;

  }

})();