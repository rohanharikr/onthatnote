
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { window: window_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    // (142:1) {#if taskExists }
    function create_if_block_3(ctx) {
    	let div;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Task already exists";
    			attr_dev(div, "class", "errorMessage svelte-47pcpb");
    			add_location(div, file, 141, 18, 3127);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(142:1) {#if taskExists }",
    		ctx
    	});

    	return block;
    }

    // (143:1) {#if maxWordLimitReached }
    function create_if_block_2(ctx) {
    	let div;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Reached maximum length";
    			attr_dev(div, "class", "errorMessage svelte-47pcpb");
    			add_location(div, file, 142, 27, 3228);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(143:1) {#if maxWordLimitReached }",
    		ctx
    	});

    	return block;
    }

    // (144:1) {#if completedTaskExists}
    function create_if_block_1(ctx) {
    	let div;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Task already completed";
    			attr_dev(div, "class", "errorMessage svelte-47pcpb");
    			add_location(div, file, 143, 26, 3331);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(144:1) {#if completedTaskExists}",
    		ctx
    	});

    	return block;
    }

    // (145:1) {#if isTasksVisible}
    function create_if_block(ctx) {
    	let div;
    	let ul0;
    	let li0;
    	let t0;
    	let t1_value = /*tasks*/ ctx[7].length + "";
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let ul1;
    	let li1;
    	let t7;
    	let t8_value = /*completedTasks*/ ctx[8].length + "";
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let div_transition;
    	let current;
    	let each_value_1 = /*tasks*/ ctx[7];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*completedTasks*/ ctx[8];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			t0 = text("In Progress (");
    			t1 = text(t1_value);
    			t2 = text("/");
    			t3 = text(/*total*/ ctx[6]);
    			t4 = text(")");
    			t5 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			t7 = text("Completed (");
    			t8 = text(t8_value);
    			t9 = text("/");
    			t10 = text(/*total*/ ctx[6]);
    			t11 = text(")");
    			t12 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(li0, "class", "listTitle svelte-47pcpb");
    			add_location(li0, file, 147, 5, 3497);
    			attr_dev(ul0, "class", "pending svelte-47pcpb");
    			add_location(ul0, file, 146, 4, 3471);
    			attr_dev(li1, "class", "listTitle svelte-47pcpb");
    			add_location(li1, file, 155, 5, 3828);
    			attr_dev(ul1, "class", "completed svelte-47pcpb");
    			add_location(ul1, file, 154, 4, 3800);
    			attr_dev(div, "class", "flex svelte-47pcpb");
    			add_location(div, file, 145, 2, 3432);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, t0);
    			append_dev(li0, t1);
    			append_dev(li0, t2);
    			append_dev(li0, t3);
    			append_dev(li0, t4);
    			append_dev(ul0, t5);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul0, null);
    			}

    			append_dev(div, t6);
    			append_dev(div, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, t7);
    			append_dev(li1, t8);
    			append_dev(li1, t9);
    			append_dev(li1, t10);
    			append_dev(li1, t11);
    			append_dev(ul1, t12);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*tasks*/ 128) && t1_value !== (t1_value = /*tasks*/ ctx[7].length + "")) set_data_dev(t1, t1_value);
    			if (!current || dirty & /*total*/ 64) set_data_dev(t3, /*total*/ ctx[6]);

    			if (dirty & /*deleteTodo, tasks, done*/ 10368) {
    				each_value_1 = /*tasks*/ ctx[7];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(ul0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if ((!current || dirty & /*completedTasks*/ 256) && t8_value !== (t8_value = /*completedTasks*/ ctx[8].length + "")) set_data_dev(t8, t8_value);
    			if (!current || dirty & /*total*/ 64) set_data_dev(t10, /*total*/ ctx[6]);

    			if (dirty & /*uncheck, completedTasks*/ 1280) {
    				each_value = /*completedTasks*/ ctx[8];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(145:1) {#if isTasksVisible}",
    		ctx
    	});

    	return block;
    }

    // (149:5) {#each tasks as task}
    function create_each_block_1(ctx) {
    	let div;
    	let li;
    	let t0_value = /*task*/ ctx[25] + "";
    	let t0;
    	let img;
    	let img_src_value;
    	let t1;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			li = element("li");
    			t0 = text(t0_value);
    			img = element("img");
    			t1 = space();
    			attr_dev(li, "class", "svelte-47pcpb");
    			add_location(li, file, 150, 7, 3644);
    			attr_dev(img, "class", "deleteTask svelte-47pcpb");
    			if (img.src !== (img_src_value = "deleteIcon.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 150, 44, 3681);
    			attr_dev(div, "class", "taskWrapper svelte-47pcpb");
    			add_location(div, file, 149, 6, 3594);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, li);
    			append_dev(li, t0);
    			append_dev(div, img);
    			append_dev(div, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						li,
    						"click",
    						function () {
    							if (is_function(/*done*/ ctx[13](/*task*/ ctx[25]))) /*done*/ ctx[13](/*task*/ ctx[25]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						img,
    						"click",
    						function () {
    							if (is_function(/*deleteTodo*/ ctx[11](/*task*/ ctx[25], true))) /*deleteTodo*/ ctx[11](/*task*/ ctx[25], true).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*tasks*/ 128) && t0_value !== (t0_value = /*task*/ ctx[25] + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(149:5) {#each tasks as task}",
    		ctx
    	});

    	return block;
    }

    // (157:5) {#each completedTasks as completedTask}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*completedTask*/ ctx[22] + "";
    	let t;
    	let li_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-47pcpb");
    			add_location(li, file, 157, 6, 3950);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(
    					li,
    					"click",
    					function () {
    						if (is_function(/*uncheck*/ ctx[10](/*completedTask*/ ctx[22]))) /*uncheck*/ ctx[10](/*completedTask*/ ctx[22]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*completedTasks*/ 256) && t_value !== (t_value = /*completedTask*/ ctx[22] + "")) set_data_dev(t, t_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, true);
    				li_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, false);
    			li_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (detaching && li_transition) li_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(157:5) {#each completedTasks as completedTask}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let title_value;
    	let t0;
    	let main;
    	let input0;
    	let t1;
    	let div1;
    	let div0;
    	let t2_value = /*newNote*/ ctx[0].length + "";
    	let t2;
    	let t3;
    	let t4;
    	let input1;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let footer;
    	let li0;
    	let t11;
    	let li1;
    	let t12;
    	let t13;
    	let t14;
    	let li2;
    	let t16;
    	let li3;
    	let current;
    	let mounted;
    	let dispose;
    	document.title = title_value = /*title*/ ctx[9] || "on that note";
    	let if_block0 = /*taskExists*/ ctx[2] && create_if_block_3(ctx);
    	let if_block1 = /*maxWordLimitReached*/ ctx[4] && create_if_block_2(ctx);
    	let if_block2 = /*completedTaskExists*/ ctx[3] && create_if_block_1(ctx);
    	let if_block3 = /*isTasksVisible*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			input0 = element("input");
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t2 = text(t2_value);
    			t3 = text("/35");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			if (if_block2) if_block2.c();
    			t8 = space();
    			if (if_block3) if_block3.c();
    			t9 = space();
    			footer = element("footer");
    			li0 = element("li");
    			li0.textContent = "Delete history / Make a new list";
    			t11 = space();
    			li1 = element("li");
    			t12 = text("Code on Github • ");
    			t13 = text(/*id*/ ctx[5]);
    			t14 = space();
    			li2 = element("li");
    			li2.textContent = "Hosted on now";
    			t16 = space();
    			li3 = element("li");
    			li3.textContent = "Made with Svelte by rohanharikr";
    			attr_dev(input0, "class", "title svelte-47pcpb");
    			add_location(input0, file, 136, 1, 2880);
    			attr_dev(div0, "class", "limit svelte-47pcpb");
    			add_location(div0, file, 138, 2, 2954);
    			attr_dev(input1, "placeholder", "add a new task");
    			attr_dev(input1, "maxlength", "35");
    			attr_dev(input1, "class", "svelte-47pcpb");
    			add_location(input1, file, 139, 2, 3001);
    			add_location(div1, file, 137, 1, 2946);
    			attr_dev(main, "class", "svelte-47pcpb");
    			add_location(main, file, 135, 0, 2872);
    			attr_dev(li0, "class", "svelte-47pcpb");
    			add_location(li0, file, 164, 1, 4083);
    			attr_dev(li1, "class", "secondary svelte-47pcpb");
    			add_location(li1, file, 165, 1, 4147);
    			attr_dev(li2, "class", "secondary svelte-47pcpb");
    			add_location(li2, file, 166, 1, 4282);
    			attr_dev(li3, "class", "secondary svelte-47pcpb");
    			add_location(li3, file, 167, 1, 4324);
    			attr_dev(footer, "class", "svelte-47pcpb");
    			add_location(footer, file, 163, 0, 4073);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, input0);
    			set_input_value(input0, /*title*/ ctx[9]);
    			append_dev(main, t1);
    			append_dev(main, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*newNote*/ ctx[0]);
    			append_dev(main, t5);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t6);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t7);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t8);
    			if (if_block3) if_block3.m(main, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, li0);
    			append_dev(footer, t11);
    			append_dev(footer, li1);
    			append_dev(li1, t12);
    			append_dev(li1, t13);
    			append_dev(footer, t14);
    			append_dev(footer, li2);
    			append_dev(footer, t16);
    			append_dev(footer, li3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "click", /*makeNote*/ ctx[15], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[17]),
    					listen_dev(input0, "keyup", /*storeLocally*/ ctx[12], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[18]),
    					listen_dev(input1, "keydown", /*handleKeydown*/ ctx[14], false, false, false),
    					listen_dev(li0, "click", /*startOver*/ ctx[16], false, false, false),
    					listen_dev(li1, "click", /*click_handler*/ ctx[19], false, false, false),
    					listen_dev(li3, "click", /*click_handler_1*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*title*/ 512) && title_value !== (title_value = /*title*/ ctx[9] || "on that note")) {
    				document.title = title_value;
    			}

    			if (dirty & /*title*/ 512 && input0.value !== /*title*/ ctx[9]) {
    				set_input_value(input0, /*title*/ ctx[9]);
    			}

    			if ((!current || dirty & /*newNote*/ 1) && t2_value !== (t2_value = /*newNote*/ ctx[0].length + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*newNote*/ 1 && input1.value !== /*newNote*/ ctx[0]) {
    				set_input_value(input1, /*newNote*/ ctx[0]);
    			}

    			if (/*taskExists*/ ctx[2]) {
    				if (if_block0) {
    					if (dirty & /*taskExists*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(main, t6);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*maxWordLimitReached*/ ctx[4]) {
    				if (if_block1) {
    					if (dirty & /*maxWordLimitReached*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t7);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*completedTaskExists*/ ctx[3]) {
    				if (if_block2) {
    					if (dirty & /*completedTaskExists*/ 8) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, t8);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*isTasksVisible*/ ctx[1]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*isTasksVisible*/ 2) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(main, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*id*/ 32) set_data_dev(t13, /*id*/ ctx[5]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let newNote = "";
    	let isTasksVisible = false;
    	let taskExists = false;
    	let completedTaskExists = false;
    	let maxWordLimitReached = false;
    	let id;

    	onMount(async () => {
    		if (window.localStorage.length !== 0) {
    			$$invalidate(9, title = localStorage.getItem("title"));
    			let localTasks = localStorage.getItem("inProgress");
    			$$invalidate(7, tasks = localTasks.split(","));
    			let localCompletedTasks = localStorage.getItem("completed");
    			$$invalidate(8, completedTasks = localCompletedTasks.split(","));
    			$$invalidate(6, total = localStorage.getItem("count"));
    			$$invalidate(1, isTasksVisible = true);
    		}

    		if (localStorage.getItem("input")) {
    			$$invalidate(0, newNote = localStorage.getItem("input"));
    		}

    		await fetch("https://api.github.com/repos/rohanharikr/onthatnote/commits").then(response => response.json()).then(data => {
    			$$invalidate(5, id = data[0].sha.slice(0, 7));
    		});
    	});

    	function addTodo() {
    		if (!tasks.includes(newNote) && !completedTasks.includes(newNote)) {
    			$$invalidate(7, tasks = [...tasks, newNote]);
    			$$invalidate(0, newNote = "");
    			$$invalidate(6, total++, total);
    			storeLocally();
    		} else if (completedTasks.includes(newNote)) {
    			$$invalidate(3, completedTaskExists = true);
    			setTimeout(() => $$invalidate(3, completedTaskExists = false), 2000);
    		} else if (tasks.includes(newNote)) {
    			$$invalidate(2, taskExists = true);
    			setTimeout(() => $$invalidate(2, taskExists = false), 2000);
    		}
    	}

    	function uncheck(i) {
    		$$invalidate(7, tasks = [...tasks, i]);

    		$$invalidate(8, completedTasks = completedTasks.filter(function (value) {
    			return value !== i;
    		}));

    		storeLocally();
    	}

    	function deleteTodo(i, del) {
    		$$invalidate(7, tasks = tasks.filter(function (value) {
    			return value !== i;
    		}));

    		storeLocally();

    		if (tasks.length === 0 && completedTasks.length === 0) {
    			$$invalidate(1, isTasksVisible = false);
    		}

    		if (del == true) {
    			$$invalidate(6, total--, total);
    		}
    	}

    	function storeLocally() {
    		localStorage.setItem("title", title);
    		localStorage.setItem("inProgress", tasks);
    		localStorage.setItem("completed", completedTasks);
    		localStorage.setItem("count", total);
    		localStorage.setItem("input", newNote);
    	}

    	function done(i) {
    		$$invalidate(8, completedTasks = [...completedTasks, i]);
    		deleteTodo(i);
    		storeLocally();
    	}

    	function handleKeydown(event) {
    		let key = event.key;
    		let keyCode = event.keyCode;

    		if (keyCode === 13 && newNote) {
    			addTodo();
    			$$invalidate(1, isTasksVisible = true);
    		}

    		if (newNote.length >= 35) {
    			$$invalidate(4, maxWordLimitReached = true);
    			setTimeout(() => $$invalidate(4, maxWordLimitReached = false), 5000);
    		} else {
    			$$invalidate(4, maxWordLimitReached = false);
    		}

    		storeLocally();
    	}

    	function makeNote() {
    		if (newNote) {
    			addTodo();
    			$$invalidate(1, isTasksVisible = true);
    			$$invalidate(6, total++, total);
    		}
    	}

    	function startOver() {
    		 $$invalidate(6, total = 0);
    		 $$invalidate(7, tasks = []);
    		 $$invalidate(8, completedTasks = []);
    		$$invalidate(1, isTasksVisible = false);
    		$$invalidate(9, title = "on that note");
    		localStorage.clear();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		title = this.value;
    		$$invalidate(9, title);
    	}

    	function input1_input_handler() {
    		newNote = this.value;
    		$$invalidate(0, newNote);
    	}

    	const click_handler = () => location.href = "https://github.com/rohanharikr/onthatnote/tree/svelte";
    	const click_handler_1 = () => location.href = "https://www.twitter.com/rohanharikr";

    	$$self.$capture_state = () => ({
    		slide,
    		fade,
    		onMount,
    		newNote,
    		isTasksVisible,
    		taskExists,
    		completedTaskExists,
    		maxWordLimitReached,
    		id,
    		addTodo,
    		uncheck,
    		deleteTodo,
    		storeLocally,
    		done,
    		handleKeydown,
    		makeNote,
    		startOver,
    		total,
    		tasks,
    		completedTasks,
    		title
    	});

    	$$self.$inject_state = $$props => {
    		if ("newNote" in $$props) $$invalidate(0, newNote = $$props.newNote);
    		if ("isTasksVisible" in $$props) $$invalidate(1, isTasksVisible = $$props.isTasksVisible);
    		if ("taskExists" in $$props) $$invalidate(2, taskExists = $$props.taskExists);
    		if ("completedTaskExists" in $$props) $$invalidate(3, completedTaskExists = $$props.completedTaskExists);
    		if ("maxWordLimitReached" in $$props) $$invalidate(4, maxWordLimitReached = $$props.maxWordLimitReached);
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("total" in $$props) $$invalidate(6, total = $$props.total);
    		if ("tasks" in $$props) $$invalidate(7, tasks = $$props.tasks);
    		if ("completedTasks" in $$props) $$invalidate(8, completedTasks = $$props.completedTasks);
    		if ("title" in $$props) $$invalidate(9, title = $$props.title);
    	};

    	let total;
    	let tasks;
    	let completedTasks;
    	let title;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	 $$invalidate(6, total = 0);
    	 $$invalidate(7, tasks = []);
    	 $$invalidate(8, completedTasks = []);
    	 $$invalidate(9, title = "on that note");

    	return [
    		newNote,
    		isTasksVisible,
    		taskExists,
    		completedTaskExists,
    		maxWordLimitReached,
    		id,
    		total,
    		tasks,
    		completedTasks,
    		title,
    		uncheck,
    		deleteTodo,
    		storeLocally,
    		done,
    		handleKeydown,
    		makeNote,
    		startOver,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
