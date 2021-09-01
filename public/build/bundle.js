
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    (function() {
        const env = {"ENVIRONMENT":"production","API_URL":"http://localhost:8080/"};
        try {
            if (process) {
                process.env = Object.assign({}, process.env);
                Object.assign(process.env, env);
                return;
            }
        } catch (e) {} // avoid ReferenceError: process is not defined
        globalThis.process = { env:env };
    })();

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var page = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	 module.exports = factory() ;
    }(commonjsGlobal, (function () {
    var isarray = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };

    /**
     * Expose `pathToRegexp`.
     */
    var pathToRegexp_1 = pathToRegexp;
    var parse_1 = parse;
    var compile_1 = compile;
    var tokensToFunction_1 = tokensToFunction;
    var tokensToRegExp_1 = tokensToRegExp;

    /**
     * The main path matching regexp utility.
     *
     * @type {RegExp}
     */
    var PATH_REGEXP = new RegExp([
      // Match escaped characters that would otherwise appear in future matches.
      // This allows the user to escape special characters that won't transform.
      '(\\\\.)',
      // Match Express-style parameters and un-named parameters with a prefix
      // and optional suffixes. Matches appear as:
      //
      // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
      // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
      // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
      '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    /**
     * Parse a string for the raw tokens.
     *
     * @param  {String} str
     * @return {Array}
     */
    function parse (str) {
      var tokens = [];
      var key = 0;
      var index = 0;
      var path = '';
      var res;

      while ((res = PATH_REGEXP.exec(str)) != null) {
        var m = res[0];
        var escaped = res[1];
        var offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;

        // Ignore already escaped sequences.
        if (escaped) {
          path += escaped[1];
          continue
        }

        // Push the current path onto the tokens.
        if (path) {
          tokens.push(path);
          path = '';
        }

        var prefix = res[2];
        var name = res[3];
        var capture = res[4];
        var group = res[5];
        var suffix = res[6];
        var asterisk = res[7];

        var repeat = suffix === '+' || suffix === '*';
        var optional = suffix === '?' || suffix === '*';
        var delimiter = prefix || '/';
        var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

        tokens.push({
          name: name || key++,
          prefix: prefix || '',
          delimiter: delimiter,
          optional: optional,
          repeat: repeat,
          pattern: escapeGroup(pattern)
        });
      }

      // Match any characters still remaining.
      if (index < str.length) {
        path += str.substr(index);
      }

      // If the path exists, push it onto the end.
      if (path) {
        tokens.push(path);
      }

      return tokens
    }

    /**
     * Compile a string to a template function for the path.
     *
     * @param  {String}   str
     * @return {Function}
     */
    function compile (str) {
      return tokensToFunction(parse(str))
    }

    /**
     * Expose a method for transforming tokens into the path function.
     */
    function tokensToFunction (tokens) {
      // Compile all the tokens into regexps.
      var matches = new Array(tokens.length);

      // Compile all the patterns before compilation.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] === 'object') {
          matches[i] = new RegExp('^' + tokens[i].pattern + '$');
        }
      }

      return function (obj) {
        var path = '';
        var data = obj || {};

        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];

          if (typeof token === 'string') {
            path += token;

            continue
          }

          var value = data[token.name];
          var segment;

          if (value == null) {
            if (token.optional) {
              continue
            } else {
              throw new TypeError('Expected "' + token.name + '" to be defined')
            }
          }

          if (isarray(value)) {
            if (!token.repeat) {
              throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
            }

            if (value.length === 0) {
              if (token.optional) {
                continue
              } else {
                throw new TypeError('Expected "' + token.name + '" to not be empty')
              }
            }

            for (var j = 0; j < value.length; j++) {
              segment = encodeURIComponent(value[j]);

              if (!matches[i].test(segment)) {
                throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
              }

              path += (j === 0 ? token.prefix : token.delimiter) + segment;
            }

            continue
          }

          segment = encodeURIComponent(value);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += token.prefix + segment;
        }

        return path
      }
    }

    /**
     * Escape a regular expression string.
     *
     * @param  {String} str
     * @return {String}
     */
    function escapeString (str) {
      return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     *
     * @param  {String} group
     * @return {String}
     */
    function escapeGroup (group) {
      return group.replace(/([=!:$\/()])/g, '\\$1')
    }

    /**
     * Attach the keys as a property of the regexp.
     *
     * @param  {RegExp} re
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function attachKeys (re, keys) {
      re.keys = keys;
      return re
    }

    /**
     * Get the flags for a regexp from the options.
     *
     * @param  {Object} options
     * @return {String}
     */
    function flags (options) {
      return options.sensitive ? '' : 'i'
    }

    /**
     * Pull out keys from a regexp.
     *
     * @param  {RegExp} path
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function regexpToRegexp (path, keys) {
      // Use a negative lookahead to match only capturing groups.
      var groups = path.source.match(/\((?!\?)/g);

      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          keys.push({
            name: i,
            prefix: null,
            delimiter: null,
            optional: false,
            repeat: false,
            pattern: null
          });
        }
      }

      return attachKeys(path, keys)
    }

    /**
     * Transform an array into a regexp.
     *
     * @param  {Array}  path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function arrayToRegexp (path, keys, options) {
      var parts = [];

      for (var i = 0; i < path.length; i++) {
        parts.push(pathToRegexp(path[i], keys, options).source);
      }

      var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

      return attachKeys(regexp, keys)
    }

    /**
     * Create a path regexp from string input.
     *
     * @param  {String} path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function stringToRegexp (path, keys, options) {
      var tokens = parse(path);
      var re = tokensToRegExp(tokens, options);

      // Attach keys back to the regexp.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] !== 'string') {
          keys.push(tokens[i]);
        }
      }

      return attachKeys(re, keys)
    }

    /**
     * Expose a function for taking tokens and returning a RegExp.
     *
     * @param  {Array}  tokens
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function tokensToRegExp (tokens, options) {
      options = options || {};

      var strict = options.strict;
      var end = options.end !== false;
      var route = '';
      var lastToken = tokens[tokens.length - 1];
      var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

      // Iterate over the tokens and create our regexp string.
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          route += escapeString(token);
        } else {
          var prefix = escapeString(token.prefix);
          var capture = token.pattern;

          if (token.repeat) {
            capture += '(?:' + prefix + capture + ')*';
          }

          if (token.optional) {
            if (prefix) {
              capture = '(?:' + prefix + '(' + capture + '))?';
            } else {
              capture = '(' + capture + ')?';
            }
          } else {
            capture = prefix + '(' + capture + ')';
          }

          route += capture;
        }
      }

      // In non-strict mode we allow a slash at the end of match. If the path to
      // match already ends with a slash, we remove it for consistency. The slash
      // is valid at the end of a path match, not in the middle. This is important
      // in non-ending mode, where "/test/" shouldn't match "/test//route".
      if (!strict) {
        route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
      }

      if (end) {
        route += '$';
      } else {
        // In non-ending mode, we need the capturing groups to match as much as
        // possible by using a positive lookahead to the end or next path segment.
        route += strict && endsWithSlash ? '' : '(?=\\/|$)';
      }

      return new RegExp('^' + route, flags(options))
    }

    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     *
     * @param  {(String|RegExp|Array)} path
     * @param  {Array}                 [keys]
     * @param  {Object}                [options]
     * @return {RegExp}
     */
    function pathToRegexp (path, keys, options) {
      keys = keys || [];

      if (!isarray(keys)) {
        options = keys;
        keys = [];
      } else if (!options) {
        options = {};
      }

      if (path instanceof RegExp) {
        return regexpToRegexp(path, keys)
      }

      if (isarray(path)) {
        return arrayToRegexp(path, keys, options)
      }

      return stringToRegexp(path, keys, options)
    }

    pathToRegexp_1.parse = parse_1;
    pathToRegexp_1.compile = compile_1;
    pathToRegexp_1.tokensToFunction = tokensToFunction_1;
    pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

    /**
       * Module dependencies.
       */

      

      /**
       * Short-cuts for global-object checks
       */

      var hasDocument = ('undefined' !== typeof document);
      var hasWindow = ('undefined' !== typeof window);
      var hasHistory = ('undefined' !== typeof history);
      var hasProcess = typeof process !== 'undefined';

      /**
       * Detect click event
       */
      var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

      /**
       * To work properly with the URL
       * history.location generated polyfill in https://github.com/devote/HTML5-History-API
       */

      var isLocation = hasWindow && !!(window.history.location || window.location);

      /**
       * The page instance
       * @api private
       */
      function Page() {
        // public things
        this.callbacks = [];
        this.exits = [];
        this.current = '';
        this.len = 0;

        // private things
        this._decodeURLComponents = true;
        this._base = '';
        this._strict = false;
        this._running = false;
        this._hashbang = false;

        // bound functions
        this.clickHandler = this.clickHandler.bind(this);
        this._onpopstate = this._onpopstate.bind(this);
      }

      /**
       * Configure the instance of page. This can be called multiple times.
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.configure = function(options) {
        var opts = options || {};

        this._window = opts.window || (hasWindow && window);
        this._decodeURLComponents = opts.decodeURLComponents !== false;
        this._popstate = opts.popstate !== false && hasWindow;
        this._click = opts.click !== false && hasDocument;
        this._hashbang = !!opts.hashbang;

        var _window = this._window;
        if(this._popstate) {
          _window.addEventListener('popstate', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('popstate', this._onpopstate, false);
        }

        if (this._click) {
          _window.document.addEventListener(clickEvent, this.clickHandler, false);
        } else if(hasDocument) {
          _window.document.removeEventListener(clickEvent, this.clickHandler, false);
        }

        if(this._hashbang && hasWindow && !hasHistory) {
          _window.addEventListener('hashchange', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('hashchange', this._onpopstate, false);
        }
      };

      /**
       * Get or set basepath to `path`.
       *
       * @param {string} path
       * @api public
       */

      Page.prototype.base = function(path) {
        if (0 === arguments.length) return this._base;
        this._base = path;
      };

      /**
       * Gets the `base`, which depends on whether we are using History or
       * hashbang routing.

       * @api private
       */
      Page.prototype._getBase = function() {
        var base = this._base;
        if(!!base) return base;
        var loc = hasWindow && this._window && this._window.location;

        if(hasWindow && this._hashbang && loc && loc.protocol === 'file:') {
          base = loc.pathname;
        }

        return base;
      };

      /**
       * Get or set strict path matching to `enable`
       *
       * @param {boolean} enable
       * @api public
       */

      Page.prototype.strict = function(enable) {
        if (0 === arguments.length) return this._strict;
        this._strict = enable;
      };


      /**
       * Bind with the given `options`.
       *
       * Options:
       *
       *    - `click` bind to click events [true]
       *    - `popstate` bind to popstate [true]
       *    - `dispatch` perform initial dispatch [true]
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.start = function(options) {
        var opts = options || {};
        this.configure(opts);

        if (false === opts.dispatch) return;
        this._running = true;

        var url;
        if(isLocation) {
          var window = this._window;
          var loc = window.location;

          if(this._hashbang && ~loc.hash.indexOf('#!')) {
            url = loc.hash.substr(2) + loc.search;
          } else if (this._hashbang) {
            url = loc.search + loc.hash;
          } else {
            url = loc.pathname + loc.search + loc.hash;
          }
        }

        this.replace(url, null, true, opts.dispatch);
      };

      /**
       * Unbind click and popstate event handlers.
       *
       * @api public
       */

      Page.prototype.stop = function() {
        if (!this._running) return;
        this.current = '';
        this.len = 0;
        this._running = false;

        var window = this._window;
        this._click && window.document.removeEventListener(clickEvent, this.clickHandler, false);
        hasWindow && window.removeEventListener('popstate', this._onpopstate, false);
        hasWindow && window.removeEventListener('hashchange', this._onpopstate, false);
      };

      /**
       * Show `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} dispatch
       * @param {boolean=} push
       * @return {!Context}
       * @api public
       */

      Page.prototype.show = function(path, state, dispatch, push) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        if (false !== dispatch) this.dispatch(ctx, prev);
        if (false !== ctx.handled && false !== push) ctx.pushState();
        return ctx;
      };

      /**
       * Goes back in the history
       * Back should always let the current route push state and then go back.
       *
       * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
       * @param {Object=} state
       * @api public
       */

      Page.prototype.back = function(path, state) {
        var page = this;
        if (this.len > 0) {
          var window = this._window;
          // this may need more testing to see if all browsers
          // wait for the next tick to go back in history
          hasHistory && window.history.back();
          this.len--;
        } else if (path) {
          setTimeout(function() {
            page.show(path, state);
          });
        } else {
          setTimeout(function() {
            page.show(page._getBase(), state);
          });
        }
      };

      /**
       * Register route to redirect from one path to other
       * or just redirect to another route
       *
       * @param {string} from - if param 'to' is undefined redirects to 'from'
       * @param {string=} to
       * @api public
       */
      Page.prototype.redirect = function(from, to) {
        var inst = this;

        // Define route from a path to another
        if ('string' === typeof from && 'string' === typeof to) {
          page.call(this, from, function(e) {
            setTimeout(function() {
              inst.replace(/** @type {!string} */ (to));
            }, 0);
          });
        }

        // Wait for the push state and replace it with another
        if ('string' === typeof from && 'undefined' === typeof to) {
          setTimeout(function() {
            inst.replace(from);
          }, 0);
        }
      };

      /**
       * Replace `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} init
       * @param {boolean=} dispatch
       * @return {!Context}
       * @api public
       */


      Page.prototype.replace = function(path, state, init, dispatch) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        ctx.init = init;
        ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch) this.dispatch(ctx, prev);
        return ctx;
      };

      /**
       * Dispatch the given `ctx`.
       *
       * @param {Context} ctx
       * @api private
       */

      Page.prototype.dispatch = function(ctx, prev) {
        var i = 0, j = 0, page = this;

        function nextExit() {
          var fn = page.exits[j++];
          if (!fn) return nextEnter();
          fn(prev, nextExit);
        }

        function nextEnter() {
          var fn = page.callbacks[i++];

          if (ctx.path !== page.current) {
            ctx.handled = false;
            return;
          }
          if (!fn) return unhandled.call(page, ctx);
          fn(ctx, nextEnter);
        }

        if (prev) {
          nextExit();
        } else {
          nextEnter();
        }
      };

      /**
       * Register an exit route on `path` with
       * callback `fn()`, which will be called
       * on the previous context when a new
       * page is visited.
       */
      Page.prototype.exit = function(path, fn) {
        if (typeof path === 'function') {
          return this.exit('*', path);
        }

        var route = new Route(path, null, this);
        for (var i = 1; i < arguments.length; ++i) {
          this.exits.push(route.middleware(arguments[i]));
        }
      };

      /**
       * Handle "click" events.
       */

      /* jshint +W054 */
      Page.prototype.clickHandler = function(e) {
        if (1 !== this._which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;

        // ensure link
        // use shadow dom when available if not, fall back to composedPath()
        // for browsers that only have shady
        var el = e.target;
        var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

        if(eventPath) {
          for (var i = 0; i < eventPath.length; i++) {
            if (!eventPath[i].nodeName) continue;
            if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
            if (!eventPath[i].href) continue;

            el = eventPath[i];
            break;
          }
        }

        // continue ensure link
        // el.nodeName for svg links are 'a' instead of 'A'
        while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
        if (!el || 'A' !== el.nodeName.toUpperCase()) return;

        // check if link is inside an svg
        // in this case, both href and target are always inside an object
        var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if(!this._hashbang && this._samePath(el) && (el.hash || '#' === link)) return;

        // Check for mailto: in the href
        if (link && link.indexOf('mailto:') > -1) return;

        // check target
        // svg target is an object and its desired value is in .baseVal property
        if (svg ? el.target.baseVal : el.target) return;

        // x-origin
        // note: svg links that are not relative don't call click events (and skip page.js)
        // consequently, all svg links tested inside page.js are relative and in the same origin
        if (!svg && !this.sameOrigin(el.href)) return;

        // rebuild path
        // There aren't .pathname and .search properties in svg links, so we use href
        // Also, svg href is an object and its desired value is in .baseVal property
        var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

        path = path[0] !== '/' ? '/' + path : path;

        // strip leading "/[drive letter]:" on NW.js on Windows
        if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
          path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        // same page
        var orig = path;
        var pageBase = this._getBase();

        if (path.indexOf(pageBase) === 0) {
          path = path.substr(pageBase.length);
        }

        if (this._hashbang) path = path.replace('#!', '');

        if (pageBase && orig === path && (!isLocation || this._window.location.protocol !== 'file:')) {
          return;
        }

        e.preventDefault();
        this.show(orig);
      };

      /**
       * Handle "populate" events.
       * @api private
       */

      Page.prototype._onpopstate = (function () {
        var loaded = false;
        if ( ! hasWindow ) {
          return function () {};
        }
        if (hasDocument && document.readyState === 'complete') {
          loaded = true;
        } else {
          window.addEventListener('load', function() {
            setTimeout(function() {
              loaded = true;
            }, 0);
          });
        }
        return function onpopstate(e) {
          if (!loaded) return;
          var page = this;
          if (e.state) {
            var path = e.state.path;
            page.replace(path, e.state);
          } else if (isLocation) {
            var loc = page._window.location;
            page.show(loc.pathname + loc.search + loc.hash, undefined, undefined, false);
          }
        };
      })();

      /**
       * Event button.
       */
      Page.prototype._which = function(e) {
        e = e || (hasWindow && this._window.event);
        return null == e.which ? e.button : e.which;
      };

      /**
       * Convert to a URL object
       * @api private
       */
      Page.prototype._toURL = function(href) {
        var window = this._window;
        if(typeof URL === 'function' && isLocation) {
          return new URL(href, window.location.toString());
        } else if (hasDocument) {
          var anc = window.document.createElement('a');
          anc.href = href;
          return anc;
        }
      };

      /**
       * Check if `href` is the same origin.
       * @param {string} href
       * @api public
       */
      Page.prototype.sameOrigin = function(href) {
        if(!href || !isLocation) return false;

        var url = this._toURL(href);
        var window = this._window;

        var loc = window.location;

        /*
           When the port is the default http port 80 for http, or 443 for
           https, internet explorer 11 returns an empty string for loc.port,
           so we need to compare loc.port with an empty string if url.port
           is the default port 80 or 443.
           Also the comparition with `port` is changed from `===` to `==` because
           `port` can be a string sometimes. This only applies to ie11.
        */
        return loc.protocol === url.protocol &&
          loc.hostname === url.hostname &&
          (loc.port === url.port || loc.port === '' && (url.port == 80 || url.port == 443)); // jshint ignore:line
      };

      /**
       * @api private
       */
      Page.prototype._samePath = function(url) {
        if(!isLocation) return false;
        var window = this._window;
        var loc = window.location;
        return url.pathname === loc.pathname &&
          url.search === loc.search;
      };

      /**
       * Remove URL encoding from the given `str`.
       * Accommodates whitespace in both x-www-form-urlencoded
       * and regular percent-encoded form.
       *
       * @param {string} val - URL component to decode
       * @api private
       */
      Page.prototype._decodeURLEncodedURIComponent = function(val) {
        if (typeof val !== 'string') { return val; }
        return this._decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
      };

      /**
       * Create a new `page` instance and function
       */
      function createPage() {
        var pageInstance = new Page();

        function pageFn(/* args */) {
          return page.apply(pageInstance, arguments);
        }

        // Copy all of the things over. In 2.0 maybe we use setPrototypeOf
        pageFn.callbacks = pageInstance.callbacks;
        pageFn.exits = pageInstance.exits;
        pageFn.base = pageInstance.base.bind(pageInstance);
        pageFn.strict = pageInstance.strict.bind(pageInstance);
        pageFn.start = pageInstance.start.bind(pageInstance);
        pageFn.stop = pageInstance.stop.bind(pageInstance);
        pageFn.show = pageInstance.show.bind(pageInstance);
        pageFn.back = pageInstance.back.bind(pageInstance);
        pageFn.redirect = pageInstance.redirect.bind(pageInstance);
        pageFn.replace = pageInstance.replace.bind(pageInstance);
        pageFn.dispatch = pageInstance.dispatch.bind(pageInstance);
        pageFn.exit = pageInstance.exit.bind(pageInstance);
        pageFn.configure = pageInstance.configure.bind(pageInstance);
        pageFn.sameOrigin = pageInstance.sameOrigin.bind(pageInstance);
        pageFn.clickHandler = pageInstance.clickHandler.bind(pageInstance);

        pageFn.create = createPage;

        Object.defineProperty(pageFn, 'len', {
          get: function(){
            return pageInstance.len;
          },
          set: function(val) {
            pageInstance.len = val;
          }
        });

        Object.defineProperty(pageFn, 'current', {
          get: function(){
            return pageInstance.current;
          },
          set: function(val) {
            pageInstance.current = val;
          }
        });

        // In 2.0 these can be named exports
        pageFn.Context = Context;
        pageFn.Route = Route;

        return pageFn;
      }

      /**
       * Register `path` with callback `fn()`,
       * or route `path`, or redirection,
       * or `page.start()`.
       *
       *   page(fn);
       *   page('*', fn);
       *   page('/user/:id', load, user);
       *   page('/user/' + user.id, { some: 'thing' });
       *   page('/user/' + user.id);
       *   page('/from', '/to')
       *   page();
       *
       * @param {string|!Function|!Object} path
       * @param {Function=} fn
       * @api public
       */

      function page(path, fn) {
        // <callback>
        if ('function' === typeof path) {
          return page.call(this, '*', path);
        }

        // route <path> to <callback ...>
        if ('function' === typeof fn) {
          var route = new Route(/** @type {string} */ (path), null, this);
          for (var i = 1; i < arguments.length; ++i) {
            this.callbacks.push(route.middleware(arguments[i]));
          }
          // show <path> with [state]
        } else if ('string' === typeof path) {
          this['string' === typeof fn ? 'redirect' : 'show'](path, fn);
          // start [options]
        } else {
          this.start(path);
        }
      }

      /**
       * Unhandled `ctx`. When it's not the initial
       * popstate then redirect. If you wish to handle
       * 404s on your own use `page('*', callback)`.
       *
       * @param {Context} ctx
       * @api private
       */
      function unhandled(ctx) {
        if (ctx.handled) return;
        var current;
        var page = this;
        var window = page._window;

        if (page._hashbang) {
          current = isLocation && this._getBase() + window.location.hash.replace('#!', '');
        } else {
          current = isLocation && window.location.pathname + window.location.search;
        }

        if (current === ctx.canonicalPath) return;
        page.stop();
        ctx.handled = false;
        isLocation && (window.location.href = ctx.canonicalPath);
      }

      /**
       * Escapes RegExp characters in the given string.
       *
       * @param {string} s
       * @api private
       */
      function escapeRegExp(s) {
        return s.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
      }

      /**
       * Initialize a new "request" `Context`
       * with the given `path` and optional initial `state`.
       *
       * @constructor
       * @param {string} path
       * @param {Object=} state
       * @api public
       */

      function Context(path, state, pageInstance) {
        var _page = this.page = pageInstance || page;
        var window = _page._window;
        var hashbang = _page._hashbang;

        var pageBase = _page._getBase();
        if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
        var i = path.indexOf('?');

        this.canonicalPath = path;
        var re = new RegExp('^' + escapeRegExp(pageBase));
        this.path = path.replace(re, '') || '/';
        if (hashbang) this.path = this.path.replace('#!', '') || '/';

        this.title = (hasDocument && window.document.title);
        this.state = state || {};
        this.state.path = path;
        this.querystring = ~i ? _page._decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
        this.pathname = _page._decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
        this.params = {};

        // fragment
        this.hash = '';
        if (!hashbang) {
          if (!~this.path.indexOf('#')) return;
          var parts = this.path.split('#');
          this.path = this.pathname = parts[0];
          this.hash = _page._decodeURLEncodedURIComponent(parts[1]) || '';
          this.querystring = this.querystring.split('#')[0];
        }
      }

      /**
       * Push state.
       *
       * @api private
       */

      Context.prototype.pushState = function() {
        var page = this.page;
        var window = page._window;
        var hashbang = page._hashbang;

        page.len++;
        if (hasHistory) {
            window.history.pushState(this.state, this.title,
              hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Save the context state.
       *
       * @api public
       */

      Context.prototype.save = function() {
        var page = this.page;
        if (hasHistory) {
            page._window.history.replaceState(this.state, this.title,
              page._hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Initialize `Route` with the given HTTP `path`,
       * and an array of `callbacks` and `options`.
       *
       * Options:
       *
       *   - `sensitive`    enable case-sensitive routes
       *   - `strict`       enable strict matching for trailing slashes
       *
       * @constructor
       * @param {string} path
       * @param {Object=} options
       * @api private
       */

      function Route(path, options, page) {
        var _page = this.page = page || globalPage;
        var opts = options || {};
        opts.strict = opts.strict || _page._strict;
        this.path = (path === '*') ? '(.*)' : path;
        this.method = 'GET';
        this.regexp = pathToRegexp_1(this.path, this.keys = [], opts);
      }

      /**
       * Return route middleware with
       * the given callback `fn()`.
       *
       * @param {Function} fn
       * @return {Function}
       * @api public
       */

      Route.prototype.middleware = function(fn) {
        var self = this;
        return function(ctx, next) {
          if (self.match(ctx.path, ctx.params)) {
            ctx.routePath = self.path;
            return fn(ctx, next);
          }
          next();
        };
      };

      /**
       * Check if this route matches `path`, if so
       * populate `params`.
       *
       * @param {string} path
       * @param {Object} params
       * @return {boolean}
       * @api private
       */

      Route.prototype.match = function(path, params) {
        var keys = this.keys,
          qsIndex = path.indexOf('?'),
          pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
          m = this.regexp.exec(decodeURIComponent(pathname));

        if (!m) return false;

        delete params[0];

        for (var i = 1, len = m.length; i < len; ++i) {
          var key = keys[i - 1];
          var val = this.page._decodeURLEncodedURIComponent(m[i]);
          if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
            params[key.name] = val;
          }
        }

        return true;
      };


      /**
       * Module exports.
       */

      var globalPage = createPage();
      var page_js = globalPage;
      var default_1 = globalPage;

    page_js.default = default_1;

    return page_js;

    })));
    });

    function dec2hex(s) {
        return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
    }

    function hex2dec(s) {
        return parseInt(s, 16);
    }

    function base32tohex(base32) {
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";

        for (var i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += leftpad(val.toString(2), 5, '0');
        }

        for (var i = 0; i + 4 <= bits.length; i += 4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16);
        }
        return hex;

    }

    function leftpad(str, len, pad) {
        if (len + 1 >= str.length) {
            str = Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
    }

    function stringInsert(string, index, insertValue) {
        if (index > 0)
            return string.substring(0, index) + insertValue + string.substring(index, string.length);
        else
            return insertValue + string;
    }
    // this function was borrowed from a stackoverflow post
    function copyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
      
        //
        // *** This styling is an extra step which is likely not required. ***
        //
        // Why is it here? To ensure:
        // 1. the element is able to have focus and selection.
        // 2. if the element was to flash render it has minimal visual impact.
        // 3. less flakyness with selection and copying which **might** occur if
        //    the textarea element is not visible.
        //
        // The likelihood is the element won't even render, not even a
        // flash, so some of these are just precautions. However in
        // Internet Explorer the element is visible whilst the popup
        // box asking the user for permission for the web page to
        // copy to the clipboard.
        //
      
        // Place in the top-left corner of screen regardless of scroll position.
        textArea.style.position = 'fixed';
        textArea.style.top = 0;
        textArea.style.left = 0;
      
        // Ensure it has a small width and height. Setting to 1px / 1em
        // doesn't work as this gives a negative w/h on some browsers.
        textArea.style.width = '2em';
        textArea.style.height = '2em';
      
        // We don't need padding, reducing the size if it does flash render.
        textArea.style.padding = 0;
      
        // Clean up any borders.
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
      
        // Avoid flash of the white box if rendered for any reason.
        textArea.style.background = 'transparent';
      
      
        textArea.value = text;
      
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
      
        try {
          document.execCommand('copy');
        } catch (err) {
          console.log(`unable to copy: ${err}`);
        }
      
        document.body.removeChild(textArea);
      }
      

    const Utils = {
        dec2hex,
        hex2dec,
        base32tohex,
        leftpad,
        stringInsert,
        copyTextToClipboard
    };

    var sha = createCommonjsModule(function (module, exports) {
    (function(U){function z(a,b,c){var e=0,f=[0],k="",h=null,k=c||"UTF8";if("UTF8"!==k&&"UTF16BE"!==k&&"UTF16LE"!==k)throw "encoding must be UTF8, UTF16BE, or UTF16LE";if("HEX"===b){if(0!==a.length%2)throw "srcString of HEX type must be in byte increments";h=D(a);e=h.binLen;f=h.value;}else if("TEXT"===b||"ASCII"===b)h=L(a,k),e=h.binLen,f=h.value;else if("B64"===b)h=M(a),e=h.binLen,f=h.value;else if("BYTES"===b)h=N(a),e=h.binLen,f=h.value;else throw "inputFormat must be HEX, TEXT, ASCII, B64, or BYTES";
    this.getHash=function(a,b,c,k){var h=null,d=f.slice(),n=e,m;3===arguments.length?"number"!==typeof c&&(k=c,c=1):2===arguments.length&&(c=1);if(c!==parseInt(c,10)||1>c)throw "numRounds must a integer >= 1";switch(b){case "HEX":h=O;break;case "B64":h=P;break;case "BYTES":h=Q;break;default:throw "format must be HEX, B64, or BYTES";}if("SHA-1"===a)for(m=0;m<c;m+=1)d=A(d,n),n=160;else if("SHA-224"===a)for(m=0;m<c;m+=1)d=w(d,n,a),n=224;else if("SHA-256"===a)for(m=0;m<c;m+=1)d=w(d,n,a),n=256;else if("SHA-384"===
    a)for(m=0;m<c;m+=1)d=w(d,n,a),n=384;else if("SHA-512"===a)for(m=0;m<c;m+=1)d=w(d,n,a),n=512;else throw "Chosen SHA variant is not supported";return h(d,R(k))};this.getHMAC=function(a,b,c,h,q){var d,n,m,t,r=[],u=[];d=null;switch(h){case "HEX":h=O;break;case "B64":h=P;break;case "BYTES":h=Q;break;default:throw "outputFormat must be HEX, B64, or BYTES";}if("SHA-1"===c)n=64,t=160;else if("SHA-224"===c)n=64,t=224;else if("SHA-256"===c)n=64,t=256;else if("SHA-384"===c)n=128,t=384;else if("SHA-512"===c)n=
    128,t=512;else throw "Chosen SHA variant is not supported";if("HEX"===b)d=D(a),m=d.binLen,d=d.value;else if("TEXT"===b||"ASCII"===b)d=L(a,k),m=d.binLen,d=d.value;else if("B64"===b)d=M(a),m=d.binLen,d=d.value;else if("BYTES"===b)d=N(a),m=d.binLen,d=d.value;else throw "inputFormat must be HEX, TEXT, ASCII, B64, or BYTES";a=8*n;b=n/4-1;if(n<m/8){for(d="SHA-1"===c?A(d,m):w(d,m,c);d.length<=b;)d.push(0);d[b]&=4294967040;}else if(n>m/8){for(;d.length<=b;)d.push(0);d[b]&=4294967040;}for(n=0;n<=b;n+=1)r[n]=d[n]^
    909522486,u[n]=d[n]^1549556828;c="SHA-1"===c?A(u.concat(A(r.concat(f),a+e)),a+t):w(u.concat(w(r.concat(f),a+e,c)),a+t,c);return h(c,R(q))};}function q(a,b){this.a=a;this.b=b;}function L(a,b){var c=[],e,f=[],k=0,h,p,q;if("UTF8"===b)for(h=0;h<a.length;h+=1)for(e=a.charCodeAt(h),f=[],128>e?f.push(e):2048>e?(f.push(192|e>>>6),f.push(128|e&63)):55296>e||57344<=e?f.push(224|e>>>12,128|e>>>6&63,128|e&63):(h+=1,e=65536+((e&1023)<<10|a.charCodeAt(h)&1023),f.push(240|e>>>18,128|e>>>12&63,128|e>>>6&63,128|e&63)),
    p=0;p<f.length;p+=1){for(q=k>>>2;c.length<=q;)c.push(0);c[q]|=f[p]<<24-k%4*8;k+=1;}else if("UTF16BE"===b||"UTF16LE"===b)for(h=0;h<a.length;h+=1){e=a.charCodeAt(h);"UTF16LE"===b&&(p=e&255,e=p<<8|e>>8);for(q=k>>>2;c.length<=q;)c.push(0);c[q]|=e<<16-k%4*8;k+=2;}return {value:c,binLen:8*k}}function D(a){var b=[],c=a.length,e,f,k;if(0!==c%2)throw "String of HEX type must be in byte increments";for(e=0;e<c;e+=2){f=parseInt(a.substr(e,2),16);if(isNaN(f))throw "String of HEX type contains invalid characters";
    for(k=e>>>3;b.length<=k;)b.push(0);b[e>>>3]|=f<<24-e%8*4;}return {value:b,binLen:4*c}}function N(a){var b=[],c,e,f;for(e=0;e<a.length;e+=1)c=a.charCodeAt(e),f=e>>>2,b.length<=f&&b.push(0),b[f]|=c<<24-e%4*8;return {value:b,binLen:8*a.length}}function M(a){var b=[],c=0,e,f,k,h,p;if(-1===a.search(/^[a-zA-Z0-9=+\/]+$/))throw "Invalid character in base-64 string";f=a.indexOf("=");a=a.replace(/\=/g,"");if(-1!==f&&f<a.length)throw "Invalid '=' found in base-64 string";for(f=0;f<a.length;f+=4){p=a.substr(f,4);
    for(k=h=0;k<p.length;k+=1)e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(p[k]),h|=e<<18-6*k;for(k=0;k<p.length-1;k+=1){for(e=c>>>2;b.length<=e;)b.push(0);b[e]|=(h>>>16-8*k&255)<<24-c%4*8;c+=1;}}return {value:b,binLen:8*c}}function O(a,b){var c="",e=4*a.length,f,k;for(f=0;f<e;f+=1)k=a[f>>>2]>>>8*(3-f%4),c+="0123456789abcdef".charAt(k>>>4&15)+"0123456789abcdef".charAt(k&15);return b.outputUpper?c.toUpperCase():c}function P(a,b){var c="",e=4*a.length,f,k,h;for(f=0;f<e;f+=
    3)for(h=f+1>>>2,k=a.length<=h?0:a[h],h=f+2>>>2,h=a.length<=h?0:a[h],h=(a[f>>>2]>>>8*(3-f%4)&255)<<16|(k>>>8*(3-(f+1)%4)&255)<<8|h>>>8*(3-(f+2)%4)&255,k=0;4>k;k+=1)c=8*f+6*k<=32*a.length?c+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(h>>>6*(3-k)&63):c+b.b64Pad;return c}function Q(a){var b="",c=4*a.length,e,f;for(e=0;e<c;e+=1)f=a[e>>>2]>>>8*(3-e%4)&255,b+=String.fromCharCode(f);return b}function R(a){var b={outputUpper:!1,b64Pad:"="};try{a.hasOwnProperty("outputUpper")&&
    (b.outputUpper=a.outputUpper),a.hasOwnProperty("b64Pad")&&(b.b64Pad=a.b64Pad);}catch(c){}if("boolean"!==typeof b.outputUpper)throw "Invalid outputUpper formatting option";if("string"!==typeof b.b64Pad)throw "Invalid b64Pad formatting option";return b}function x(a,b){return a<<b|a>>>32-b}function r(a,b){return a>>>b|a<<32-b}function u(a,b){var c=null,c=new q(a.a,a.b);return c=32>=b?new q(c.a>>>b|c.b<<32-b&4294967295,c.b>>>b|c.a<<32-b&4294967295):new q(c.b>>>b-32|c.a<<64-b&4294967295,c.a>>>b-32|c.b<<64-
    b&4294967295)}function S(a,b){var c=null;return c=32>=b?new q(a.a>>>b,a.b>>>b|a.a<<32-b&4294967295):new q(0,a.a>>>b-32)}function V(a,b,c){return a&b^~a&c}function W(a,b,c){return new q(a.a&b.a^~a.a&c.a,a.b&b.b^~a.b&c.b)}function T(a,b,c){return a&b^a&c^b&c}function X(a,b,c){return new q(a.a&b.a^a.a&c.a^b.a&c.a,a.b&b.b^a.b&c.b^b.b&c.b)}function Y(a){return r(a,2)^r(a,13)^r(a,22)}function Z(a){var b=u(a,28),c=u(a,34);a=u(a,39);return new q(b.a^c.a^a.a,b.b^c.b^a.b)}function $(a){return r(a,6)^r(a,11)^
    r(a,25)}function aa(a){var b=u(a,14),c=u(a,18);a=u(a,41);return new q(b.a^c.a^a.a,b.b^c.b^a.b)}function ba(a){return r(a,7)^r(a,18)^a>>>3}function ca(a){var b=u(a,1),c=u(a,8);a=S(a,7);return new q(b.a^c.a^a.a,b.b^c.b^a.b)}function da(a){return r(a,17)^r(a,19)^a>>>10}function ea(a){var b=u(a,19),c=u(a,61);a=S(a,6);return new q(b.a^c.a^a.a,b.b^c.b^a.b)}function C(a,b){var c=(a&65535)+(b&65535);return ((a>>>16)+(b>>>16)+(c>>>16)&65535)<<16|c&65535}function fa(a,b,c,e){var f=(a&65535)+(b&65535)+(c&65535)+
    (e&65535);return ((a>>>16)+(b>>>16)+(c>>>16)+(e>>>16)+(f>>>16)&65535)<<16|f&65535}function E(a,b,c,e,f){var k=(a&65535)+(b&65535)+(c&65535)+(e&65535)+(f&65535);return ((a>>>16)+(b>>>16)+(c>>>16)+(e>>>16)+(f>>>16)+(k>>>16)&65535)<<16|k&65535}function ga(a,b){var c,e,f;c=(a.b&65535)+(b.b&65535);e=(a.b>>>16)+(b.b>>>16)+(c>>>16);f=(e&65535)<<16|c&65535;c=(a.a&65535)+(b.a&65535)+(e>>>16);e=(a.a>>>16)+(b.a>>>16)+(c>>>16);return new q((e&65535)<<16|c&65535,f)}function ha(a,b,c,e){var f,k,h;f=(a.b&65535)+(b.b&
    65535)+(c.b&65535)+(e.b&65535);k=(a.b>>>16)+(b.b>>>16)+(c.b>>>16)+(e.b>>>16)+(f>>>16);h=(k&65535)<<16|f&65535;f=(a.a&65535)+(b.a&65535)+(c.a&65535)+(e.a&65535)+(k>>>16);k=(a.a>>>16)+(b.a>>>16)+(c.a>>>16)+(e.a>>>16)+(f>>>16);return new q((k&65535)<<16|f&65535,h)}function ia(a,b,c,e,f){var k,h,p;k=(a.b&65535)+(b.b&65535)+(c.b&65535)+(e.b&65535)+(f.b&65535);h=(a.b>>>16)+(b.b>>>16)+(c.b>>>16)+(e.b>>>16)+(f.b>>>16)+(k>>>16);p=(h&65535)<<16|k&65535;k=(a.a&65535)+(b.a&65535)+(c.a&65535)+(e.a&65535)+(f.a&
    65535)+(h>>>16);h=(a.a>>>16)+(b.a>>>16)+(c.a>>>16)+(e.a>>>16)+(f.a>>>16)+(k>>>16);return new q((h&65535)<<16|k&65535,p)}function A(a,b){var c=[],e,f,k,h,p,q,r,s,u,d=[1732584193,4023233417,2562383102,271733878,3285377520];for(e=(b+65>>>9<<4)+15;a.length<=e;)a.push(0);a[b>>>5]|=128<<24-b%32;a[e]=b;u=a.length;for(r=0;r<u;r+=16){e=d[0];f=d[1];k=d[2];h=d[3];p=d[4];for(s=0;80>s;s+=1)c[s]=16>s?a[s+r]:x(c[s-3]^c[s-8]^c[s-14]^c[s-16],1),q=20>s?E(x(e,5),f&k^~f&h,p,1518500249,c[s]):40>s?E(x(e,5),f^k^h,p,1859775393,
    c[s]):60>s?E(x(e,5),T(f,k,h),p,2400959708,c[s]):E(x(e,5),f^k^h,p,3395469782,c[s]),p=h,h=k,k=x(f,30),f=e,e=q;d[0]=C(e,d[0]);d[1]=C(f,d[1]);d[2]=C(k,d[2]);d[3]=C(h,d[3]);d[4]=C(p,d[4]);}return d}function w(a,b,c){var e,f,k,h,p,r,u,s,y,d,n,m,t,w,x,v,z,A,F,G,H,I,J,K,g,B=[],D,l=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,
    1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];d=[3238371032,914150663,812702999,4144912697,4290775857,
    1750603025,1694076839,3204075428];f=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];if("SHA-224"===c||"SHA-256"===c)n=64,e=(b+65>>>9<<4)+15,w=16,x=1,g=Number,v=C,z=fa,A=E,F=ba,G=da,H=Y,I=$,K=T,J=V,d="SHA-224"===c?d:f;else if("SHA-384"===c||"SHA-512"===c)n=80,e=(b+128>>>10<<5)+31,w=32,x=2,g=q,v=ga,z=ha,A=ia,F=ca,G=ea,H=Z,I=aa,K=X,J=W,l=[new g(l[0],3609767458),new g(l[1],602891725),new g(l[2],3964484399),new g(l[3],2173295548),new g(l[4],4081628472),new g(l[5],
    3053834265),new g(l[6],2937671579),new g(l[7],3664609560),new g(l[8],2734883394),new g(l[9],1164996542),new g(l[10],1323610764),new g(l[11],3590304994),new g(l[12],4068182383),new g(l[13],991336113),new g(l[14],633803317),new g(l[15],3479774868),new g(l[16],2666613458),new g(l[17],944711139),new g(l[18],2341262773),new g(l[19],2007800933),new g(l[20],1495990901),new g(l[21],1856431235),new g(l[22],3175218132),new g(l[23],2198950837),new g(l[24],3999719339),new g(l[25],766784016),new g(l[26],2566594879),
    new g(l[27],3203337956),new g(l[28],1034457026),new g(l[29],2466948901),new g(l[30],3758326383),new g(l[31],168717936),new g(l[32],1188179964),new g(l[33],1546045734),new g(l[34],1522805485),new g(l[35],2643833823),new g(l[36],2343527390),new g(l[37],1014477480),new g(l[38],1206759142),new g(l[39],344077627),new g(l[40],1290863460),new g(l[41],3158454273),new g(l[42],3505952657),new g(l[43],106217008),new g(l[44],3606008344),new g(l[45],1432725776),new g(l[46],1467031594),new g(l[47],851169720),new g(l[48],
    3100823752),new g(l[49],1363258195),new g(l[50],3750685593),new g(l[51],3785050280),new g(l[52],3318307427),new g(l[53],3812723403),new g(l[54],2003034995),new g(l[55],3602036899),new g(l[56],1575990012),new g(l[57],1125592928),new g(l[58],2716904306),new g(l[59],442776044),new g(l[60],593698344),new g(l[61],3733110249),new g(l[62],2999351573),new g(l[63],3815920427),new g(3391569614,3928383900),new g(3515267271,566280711),new g(3940187606,3454069534),new g(4118630271,4000239992),new g(116418474,
    1914138554),new g(174292421,2731055270),new g(289380356,3203993006),new g(460393269,320620315),new g(685471733,587496836),new g(852142971,1086792851),new g(1017036298,365543100),new g(1126000580,2618297676),new g(1288033470,3409855158),new g(1501505948,4234509866),new g(1607167915,987167468),new g(1816402316,1246189591)],d="SHA-384"===c?[new g(3418070365,d[0]),new g(1654270250,d[1]),new g(2438529370,d[2]),new g(355462360,d[3]),new g(1731405415,d[4]),new g(41048885895,d[5]),new g(3675008525,d[6]),
    new g(1203062813,d[7])]:[new g(f[0],4089235720),new g(f[1],2227873595),new g(f[2],4271175723),new g(f[3],1595750129),new g(f[4],2917565137),new g(f[5],725511199),new g(f[6],4215389547),new g(f[7],327033209)];else throw "Unexpected error in SHA-2 implementation";for(;a.length<=e;)a.push(0);a[b>>>5]|=128<<24-b%32;a[e]=b;D=a.length;for(m=0;m<D;m+=w){b=d[0];e=d[1];f=d[2];k=d[3];h=d[4];p=d[5];r=d[6];u=d[7];for(t=0;t<n;t+=1)16>t?(y=t*x+m,s=a.length<=y?0:a[y],y=a.length<=y+1?0:a[y+1],B[t]=new g(s,y)):B[t]=
    z(G(B[t-2]),B[t-7],F(B[t-15]),B[t-16]),s=A(u,I(h),J(h,p,r),l[t],B[t]),y=v(H(b),K(b,e,f)),u=r,r=p,p=h,h=v(k,s),k=f,f=e,e=b,b=v(s,y);d[0]=v(b,d[0]);d[1]=v(e,d[1]);d[2]=v(f,d[2]);d[3]=v(k,d[3]);d[4]=v(h,d[4]);d[5]=v(p,d[5]);d[6]=v(r,d[6]);d[7]=v(u,d[7]);}if("SHA-224"===c)a=[d[0],d[1],d[2],d[3],d[4],d[5],d[6]];else if("SHA-256"===c)a=d;else if("SHA-384"===c)a=[d[0].a,d[0].b,d[1].a,d[1].b,d[2].a,d[2].b,d[3].a,d[3].b,d[4].a,d[4].b,d[5].a,d[5].b];else if("SHA-512"===c)a=[d[0].a,d[0].b,d[1].a,d[1].b,d[2].a,
    d[2].b,d[3].a,d[3].b,d[4].a,d[4].b,d[5].a,d[5].b,d[6].a,d[6].b,d[7].a,d[7].b];else throw "Unexpected error in SHA-2 implementation";return a}module.exports?module.exports=exports=z:exports=z;})();
    });

    function updateOtp(secret, secretType, otpLength, otpWindow) {
        var key = '';
        if(secretType === 'Base32') {
            key = Utils.base32tohex(secret);
        }
        if(secretType === 'HEX') {
            key = secret;
        }
        var epoch = Math.round(new Date().getTime() / 1000.0);
        var time = Utils.leftpad(Utils.dec2hex(Math.floor(epoch / otpWindow)), 16, '0');

        var hmacObj = new sha(time, 'HEX');
        var hmac = hmacObj.getHMAC(key, 'HEX', 'SHA-1', "HEX");
        var offset = Utils.hex2dec(hmac.substring(hmac.length - 1));

        var o  = (Utils.hex2dec(hmac.substr(offset * 2, 8)) & Utils.hex2dec('7fffffff')) + '';
        o = (o).substr(o.length - otpLength, otpLength);

        return o   
    }

    function getQRURL(secret, otpWindow, otpLength) {
        return 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=200x200&chld=M|0&cht=qr&chl=otpauth%3A%2F%2Ftotp%2FUser%3Fsecret%3D' + secret + '%26issuer%3DOTPNinja%26period%3D' + otpWindow + '%26digits%3D' + otpLength;
    }

    const TOTP = {
        updateOtp: updateOtp,
        getQRURL: getQRURL
    };

    function create_if_block(ctx) {
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div6;
    	let div5;
    	let div2;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let button;
    	let t4;
    	let div4;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "OTP Ninja";
    			t1 = space();
    			div0 = element("div");
    			button = element("button");

    			button.innerHTML = `<span class="sr-only">Close panel</span> 
                      
                      <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

    			t4 = space();
    			div4 = element("div");

    			div4.innerHTML = `<div class="absolute inset-0 px-4 sm:px-6 text-sm"><p>OTP Ninja is a static site for generating one time passwords (OTP). It is intended to be used as a testing utility, not for real world use. Please only use it for testing. None of the data entered is sent to the backend. The OTP&#39;s are generated in the browser, on your machine.</p> 
                      <p class="mt-4">Clicking on the OTP will copy it to your clipboard. Clicking on the clipboard in the bottom left corner will copy a shareable link to the OTP configured.</p> 
                      <p class="mt-4">The first version was created in 2015, with a refresh in 2021. It is currently hosted on DigitalOcean App Platform and built using TailwindCSS and SvelteJS.</p></div>`;

    			attr(h2, "class", "text-lg font-medium text-gray-900");
    			attr(h2, "id", "slide-over-title");
    			attr(button, "type", "button");
    			attr(button, "class", "bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500");
    			attr(div0, "class", "ml-3 h-7 flex items-center");
    			attr(div1, "class", "flex items-start justify-between");
    			attr(div2, "class", "px-4 sm:px-6");
    			attr(div4, "class", "mt-6 relative flex-1 px-4 sm:px-6");
    			attr(div5, "class", "h-full flex flex-col py-6 bg-white shadow-xl overflow-y-scroll");
    			attr(div6, "class", "w-screen max-w-md");
    			attr(div7, "class", "fixed inset-y-0 right-0 pl-10 max-w-full flex");
    			attr(div8, "class", "absolute inset-0");
    			attr(div8, "aria-hidden", "true");
    			attr(div9, "class", "absolute inset-0 overflow-hidden");
    			attr(div10, "class", "fixed inset-0 overflow-hidden");
    			attr(div10, "aria-labelledby", "slide-over-title");
    			attr(div10, "role", "dialog");
    			attr(div10, "aria-modal", "true");
    		},
    		m(target, anchor) {
    			insert(target, div10, anchor);
    			append(div10, div9);
    			append(div9, div8);
    			append(div8, div7);
    			append(div7, div6);
    			append(div6, div5);
    			append(div5, div2);
    			append(div2, div1);
    			append(div1, h2);
    			append(div1, t1);
    			append(div1, div0);
    			append(div0, button);
    			append(div5, t4);
    			append(div5, div4);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_8*/ ctx[19]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div10);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div22;
    	let div21;
    	let div19;
    	let div0;
    	let t0;
    	let div3;
    	let div1;
    	let button0;
    	let span0;
    	let t1_value = Utils.stringInsert(/*otp*/ ctx[5], /*otpLength*/ ctx[0] / 2, " ") + "";
    	let t1;
    	let t2;
    	let svg0;
    	let path0;
    	let t3;
    	let div2;
    	let svg1;
    	let path1;
    	let t4;
    	let span1;
    	let t5;
    	let t6;
    	let div10;
    	let div6;
    	let div5;
    	let span2;
    	let t8;
    	let div4;
    	let span3;
    	let button1;
    	let t10;
    	let button2;
    	let t12;
    	let div9;
    	let div8;
    	let span4;
    	let t14;
    	let div7;
    	let span5;
    	let button3;
    	let t16;
    	let button4;
    	let t18;
    	let button5;
    	let t20;
    	let div14;
    	let div13;
    	let label0;
    	let t22;
    	let div12;
    	let div11;
    	let label1;
    	let t24;
    	let select;
    	let option0;
    	let option1;
    	let t27;
    	let input;
    	let t28;
    	let div17;
    	let div15;
    	let t30;
    	let div16;
    	let img1;
    	let img1_src_value;
    	let t31;
    	let div18;
    	let button6;
    	let t32;
    	let button7;
    	let t33;
    	let div20;
    	let t37;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*showInfoPanel*/ ctx[4] && create_if_block(ctx);

    	return {
    		c() {
    			div22 = element("div");
    			div21 = element("div");
    			div19 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<img class="mx-auto h-20 w-auto" src="./logo.png" alt="Workflow"/>`;
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			span0 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t3 = space();
    			div2 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t4 = space();
    			span1 = element("span");
    			t5 = text(/*otpCountdown*/ ctx[6]);
    			t6 = space();
    			div10 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			span2 = element("span");
    			span2.textContent = "OTP Length";
    			t8 = space();
    			div4 = element("div");
    			span3 = element("span");
    			button1 = element("button");
    			button1.textContent = "6";
    			t10 = space();
    			button2 = element("button");
    			button2.textContent = "8";
    			t12 = space();
    			div9 = element("div");
    			div8 = element("div");
    			span4 = element("span");
    			span4.textContent = "OTP Window";
    			t14 = space();
    			div7 = element("div");
    			span5 = element("span");
    			button3 = element("button");
    			button3.textContent = "30";
    			t16 = space();
    			button4 = element("button");
    			button4.textContent = "45";
    			t18 = space();
    			button5 = element("button");
    			button5.textContent = "60";
    			t20 = space();
    			div14 = element("div");
    			div13 = element("div");
    			label0 = element("label");
    			label0.textContent = "Secret";
    			t22 = space();
    			div12 = element("div");
    			div11 = element("div");
    			label1 = element("label");
    			label1.textContent = "secret_type";
    			t24 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Base32";
    			option1 = element("option");
    			option1.textContent = "HEX";
    			t27 = space();
    			input = element("input");
    			t28 = space();
    			div17 = element("div");
    			div15 = element("div");
    			div15.innerHTML = `<label for="secret" class="block text-sm font-medium text-gray-700">QR Code</label>`;
    			t30 = space();
    			div16 = element("div");
    			img1 = element("img");
    			t31 = space();
    			div18 = element("div");
    			button6 = element("button");
    			button6.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`;
    			t32 = space();
    			button7 = element("button");
    			button7.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    			t33 = space();
    			div20 = element("div");

    			div20.innerHTML = `<a href="https://jonfriesen.ca" target="_blank">Jon Friesen 2021</a> 
          <a href="https://www.digitalocean.com/?refcode=cd77e6593231&amp;utm_campaign=Referral_Invite&amp;utm_medium=Referral_Program&amp;utm_source=badge" target="_blank">Powered by DigitalOcean App Platform</a>`;

    			t37 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(div0, "class", "sm:mx-auto sm:w-full sm:max-w-md");
    			attr(span0, "class", "block text-4xl font-medium text-gray-700 group-hover:text-gray-500 mr-2");
    			attr(path0, "stroke-linecap", "round");
    			attr(path0, "stroke-linejoin", "round");
    			attr(path0, "stroke-width", "2");
    			attr(path0, "d", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2");
    			attr(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg0, "class", "h-9 w-9 group-hover:text-green-500 text-green-700");
    			attr(svg0, "fill", "none");
    			attr(svg0, "viewBox", "0 0 24 24");
    			attr(svg0, "stroke", "currentColor");
    			attr(button0, "class", "group flex justify-center");
    			attr(div1, "class", "flex items-center justify-center");
    			attr(path1, "stroke-linecap", "round");
    			attr(path1, "stroke-linejoin", "round");
    			attr(path1, "stroke-width", "2");
    			attr(path1, "d", "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z");
    			attr(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg1, "class", "h-10 w-10 text-gray-700 mr-2");
    			attr(svg1, "fill", "none");
    			attr(svg1, "viewBox", "0 0 24 24");
    			attr(svg1, "stroke", "currentColor");
    			attr(span1, "class", "block w-12 text-4xl font-medium text-gray-700");
    			toggle_class(span1, "text-yellow-500", /*otpCountdown*/ ctx[6] > 5 && /*otpCountdown*/ ctx[6] <= 10);
    			toggle_class(span1, "text-red-500", /*otpCountdown*/ ctx[6] <= 5);
    			attr(div2, "class", "mt-4 flex justify-center");
    			attr(div3, "class", "mt-12");
    			attr(span2, "class", "block text-sm font-medium text-gray-700");
    			attr(button1, "type", "button");
    			attr(button1, "class", "relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500");
    			toggle_class(button1, "bg-green-100", /*otpLength*/ ctx[0] === 6);
    			attr(button2, "type", "button");
    			attr(button2, "class", "-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500");
    			toggle_class(button2, "bg-green-100", /*otpLength*/ ctx[0] === 8);
    			attr(span3, "class", "relative z-0 inline-flex shadow-sm rounded-md");
    			attr(div4, "class", "mt-1");
    			attr(span4, "class", "block text-sm font-medium text-gray-700");
    			attr(button3, "type", "button");
    			attr(button3, "class", "relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500");
    			toggle_class(button3, "bg-green-100", /*otpWindow*/ ctx[1] === 30);
    			attr(button4, "type", "button");
    			attr(button4, "class", "-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500");
    			toggle_class(button4, "bg-green-100", /*otpWindow*/ ctx[1] === 45);
    			attr(button5, "type", "button");
    			attr(button5, "class", "-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500");
    			toggle_class(button5, "bg-green-100", /*otpWindow*/ ctx[1] === 60);
    			attr(span5, "class", "relative z-0 inline-flex shadow-sm rounded-md");
    			attr(div7, "class", "mt-1");
    			attr(div10, "class", "mt-6 flex justify-between");
    			attr(label0, "for", "secret");
    			attr(label0, "class", "block text-sm font-medium text-gray-700");
    			attr(label1, "for", "secret_type");
    			attr(label1, "class", "sr-only");
    			option0.__value = "base32";
    			option0.value = option0.__value;
    			option1.__value = "hex";
    			option1.value = option1.__value;
    			attr(select, "id", "secret_type");
    			attr(select, "name", "secret_type");
    			attr(select, "class", "focus:ring-green-500 focus:border-green-500 h-full py-0 pl-3 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-md");
    			if (/*secretType*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[15].call(select));
    			attr(div11, "class", "absolute inset-y-0 left-0 flex items-center");
    			attr(input, "type", "text");
    			attr(input, "name", "secret");
    			attr(input, "id", "secret");
    			attr(input, "class", "focus:ring-green-500 focus:border-green-500 block w-full pl-28 sm:text-sm border-gray-300 rounded-md");
    			attr(input, "placeholder", "FLS5AJRNEQ6IODOCY3N4E5SY6DORTNGL");
    			attr(div12, "class", "mt-1 relative rounded-md shadow-sm");
    			attr(div14, "class", "mt-6");
    			attr(img1, "alt", "qr code");
    			if (img1.src !== (img1_src_value = /*qrURL*/ ctx[7])) attr(img1, "src", img1_src_value);
    			attr(div16, "class", "flex justify-center ");
    			attr(div17, "class", "mt-6");
    			attr(button6, "class", "text-gray-700 hover:text-gray-400");
    			attr(button6, "tooltip", "Copy shareable URL to clipboard");
    			attr(button7, "class", "text-gray-700 hover:text-gray-400");
    			attr(button7, "tooltip", "Copy shareable URL to clipboard");
    			attr(div18, "class", "mt-6 flex justify-between");
    			attr(div19, "class", "bg-white py-8 px-4 md:shadow md:rounded-lg sm:px-10");
    			attr(div20, "class", "flex justify-between text-xs text-gray-400 mt-1");
    			attr(div21, "class", "md:mt-8 sm:mx-auto sm:w-2/5 sm:max-w-md");
    			attr(div22, "class", "min-h-screen md:bg-gray-50 flex  justify-center md:py-12 sm:py-1 sm:px-6 lg:px-8");
    		},
    		m(target, anchor) {
    			insert(target, div22, anchor);
    			append(div22, div21);
    			append(div21, div19);
    			append(div19, div0);
    			append(div19, t0);
    			append(div19, div3);
    			append(div3, div1);
    			append(div1, button0);
    			append(button0, span0);
    			append(span0, t1);
    			append(button0, t2);
    			append(button0, svg0);
    			append(svg0, path0);
    			append(div3, t3);
    			append(div3, div2);
    			append(div2, svg1);
    			append(svg1, path1);
    			append(div2, t4);
    			append(div2, span1);
    			append(span1, t5);
    			append(div19, t6);
    			append(div19, div10);
    			append(div10, div6);
    			append(div6, div5);
    			append(div5, span2);
    			append(div5, t8);
    			append(div5, div4);
    			append(div4, span3);
    			append(span3, button1);
    			append(span3, t10);
    			append(span3, button2);
    			append(div10, t12);
    			append(div10, div9);
    			append(div9, div8);
    			append(div8, span4);
    			append(div8, t14);
    			append(div8, div7);
    			append(div7, span5);
    			append(span5, button3);
    			append(span5, t16);
    			append(span5, button4);
    			append(span5, t18);
    			append(span5, button5);
    			append(div19, t20);
    			append(div19, div14);
    			append(div14, div13);
    			append(div13, label0);
    			append(div13, t22);
    			append(div13, div12);
    			append(div12, div11);
    			append(div11, label1);
    			append(div11, t24);
    			append(div11, select);
    			append(select, option0);
    			append(select, option1);
    			select_option(select, /*secretType*/ ctx[3]);
    			append(div12, t27);
    			append(div12, input);
    			set_input_value(input, /*secret*/ ctx[2]);
    			append(div19, t28);
    			append(div19, div17);
    			append(div17, div15);
    			append(div17, t30);
    			append(div17, div16);
    			append(div16, img1);
    			append(div19, t31);
    			append(div19, div18);
    			append(div18, button6);
    			append(div18, t32);
    			append(div18, button7);
    			append(div21, t33);
    			append(div21, div20);
    			insert(target, t37, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[9]),
    					listen(button1, "click", /*click_handler_1*/ ctx[10]),
    					listen(button2, "click", /*click_handler_2*/ ctx[11]),
    					listen(button3, "click", /*click_handler_3*/ ctx[12]),
    					listen(button4, "click", /*click_handler_4*/ ctx[13]),
    					listen(button5, "click", /*click_handler_5*/ ctx[14]),
    					listen(select, "change", /*select_change_handler*/ ctx[15]),
    					listen(input, "input", /*input_input_handler*/ ctx[16]),
    					listen(button6, "click", /*click_handler_6*/ ctx[17]),
    					listen(button7, "click", /*click_handler_7*/ ctx[18])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*otp, otpLength*/ 33 && t1_value !== (t1_value = Utils.stringInsert(/*otp*/ ctx[5], /*otpLength*/ ctx[0] / 2, " ") + "")) set_data(t1, t1_value);
    			if (dirty & /*otpCountdown*/ 64) set_data(t5, /*otpCountdown*/ ctx[6]);

    			if (dirty & /*otpCountdown*/ 64) {
    				toggle_class(span1, "text-yellow-500", /*otpCountdown*/ ctx[6] > 5 && /*otpCountdown*/ ctx[6] <= 10);
    			}

    			if (dirty & /*otpCountdown*/ 64) {
    				toggle_class(span1, "text-red-500", /*otpCountdown*/ ctx[6] <= 5);
    			}

    			if (dirty & /*otpLength*/ 1) {
    				toggle_class(button1, "bg-green-100", /*otpLength*/ ctx[0] === 6);
    			}

    			if (dirty & /*otpLength*/ 1) {
    				toggle_class(button2, "bg-green-100", /*otpLength*/ ctx[0] === 8);
    			}

    			if (dirty & /*otpWindow*/ 2) {
    				toggle_class(button3, "bg-green-100", /*otpWindow*/ ctx[1] === 30);
    			}

    			if (dirty & /*otpWindow*/ 2) {
    				toggle_class(button4, "bg-green-100", /*otpWindow*/ ctx[1] === 45);
    			}

    			if (dirty & /*otpWindow*/ 2) {
    				toggle_class(button5, "bg-green-100", /*otpWindow*/ ctx[1] === 60);
    			}

    			if (dirty & /*secretType*/ 8) {
    				select_option(select, /*secretType*/ ctx[3]);
    			}

    			if (dirty & /*secret*/ 4 && input.value !== /*secret*/ ctx[2]) {
    				set_input_value(input, /*secret*/ ctx[2]);
    			}

    			if (dirty & /*qrURL*/ 128 && img1.src !== (img1_src_value = /*qrURL*/ ctx[7])) {
    				attr(img1, "src", img1_src_value);
    			}

    			if (/*showInfoPanel*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div22);
    			if (detaching) detach(t37);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let otpLength = 8;
    	let otpWindow = 30;
    	let secret = "FLS5AJRNEQ6IODOCY3N4E5SY6DORTNGL";
    	let secretType = "base32";
    	let showInfoPanel = false;
    	let otp = "";
    	let otpCountdown = "";
    	let qrURL = "";
    	let shareURL = "";

    	// Start a timer
    	setInterval(timer, 1000);

    	function timer() {
    		var epoch = Math.round(new Date().getTime() / 1000);
    		var countDown = otpWindow - epoch % otpWindow;
    		if (epoch % otpWindow == 0) TOTP.updateOtp();
    		$$invalidate(6, otpCountdown = countDown);
    	}

    	function createShareURL() {
    		return `https://otp.ninja?secret=${secret}&window=${otpWindow}&length=${otpLength}&type=${secretType.toLocaleLowerCase()}`;
    	}

    	onMount(async () => {
    		const params = new URLSearchParams(window.location.search);

    		if (params.has("secret")) {
    			$$invalidate(2, secret = params.get("secret"));
    			console.log(`param secret: ${secret}`);
    		}

    		if (params.has("window")) {
    			let w = params.get("window");

    			if (w === "30" || w === "45" || w === "60") {
    				$$invalidate(1, otpWindow = Number(w));
    			}

    			console.log(`param otpWindow: ${otpWindow}`);
    		}

    		if (params.has("length")) {
    			let l = params.get("length");

    			if (l === "6" || l === "8") {
    				$$invalidate(0, otpLength = Number(l));
    			}

    			console.log(`param otpLength: ${otpLength}`);
    		}

    		if (params.has("type")) {
    			let t = params.get("type");

    			if (t === "base32" || t === "hex") {
    				$$invalidate(3, secretType = t);
    			}

    			console.log(`param secret type: ${secretType}`);
    		}

    		$$invalidate(5, otp = TOTP.updateOtp(secret, secretType, otpLength, otpWindow));
    		$$invalidate(7, qrURL = TOTP.getQRURL(secret, otpWindow, otpLength));
    		$$invalidate(8, shareURL = createShareURL());
    	});

    	const click_handler = () => Utils.copyTextToClipboard(otp);
    	const click_handler_1 = () => $$invalidate(0, otpLength = 6);
    	const click_handler_2 = () => $$invalidate(0, otpLength = 8);
    	const click_handler_3 = () => $$invalidate(1, otpWindow = 30);
    	const click_handler_4 = () => $$invalidate(1, otpWindow = 45);
    	const click_handler_5 = () => $$invalidate(1, otpWindow = 60);

    	function select_change_handler() {
    		secretType = select_value(this);
    		$$invalidate(3, secretType);
    	}

    	function input_input_handler() {
    		secret = this.value;
    		$$invalidate(2, secret);
    	}

    	const click_handler_6 = () => Utils.copyTextToClipboard(shareURL);
    	const click_handler_7 = () => $$invalidate(4, showInfoPanel = true);
    	const click_handler_8 = () => $$invalidate(4, showInfoPanel = false);

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*otpLength, otpWindow, secret, secretType*/ 15) {
    			// Monitor for param changes
    			 {
    				$$invalidate(5, otp = TOTP.updateOtp(secret, secretType, otpLength, otpWindow));
    				$$invalidate(7, qrURL = TOTP.getQRURL(secret, otpWindow, otpLength));
    			}
    		}
    	};

    	return [
    		otpLength,
    		otpWindow,
    		secret,
    		secretType,
    		showInfoPanel,
    		otp,
    		otpCountdown,
    		qrURL,
    		shareURL,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		select_change_handler,
    		input_input_handler,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8
    	];
    }

    class Home extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    function create_fragment$1(ctx) {
    	let h1;

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Error";
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(h1);
    		}
    	};
    }

    class Error$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    var routes = [
      {
        path: '/',
        component: Home
      },
      {
        path: '*',
        component: Error$1
      }
    ];

    function create_fragment$2(ctx) {
    	let main;
    	let switch_instance;
    	let current;
    	var switch_value = /*page*/ ctx[0];

    	function switch_props(ctx) {
    		return { props: { params: /*params*/ ctx[1] } };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	return {
    		c() {
    			main = element("main");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, main, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*params*/ 2) switch_instance_changes.params = /*params*/ ctx[1];

    			if (switch_value !== (switch_value = /*page*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, main, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let page$1;
    	let params;

    	// Loop around all of the routes and create a new instance of
    	// router for reach one with some rudimentary checks.
    	routes.forEach(route => {
    		page(
    			route.path,
    			// Set the params variable to the context.
    			// We use this on the component initialisation
    			(ctx, next) => {
    				$$invalidate(1, params = ctx.params);
    				next();
    			},
    			// Check if auth is valid. If so, set the page to the component
    			// otherwise redirect to login.
    			() => {
    				$$invalidate(0, page$1 = route.component);
    			}
    		);
    	});

    	// Set up the router to start and actively watch for changes
    	page.start();

    	return [page$1, params];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
