var fengari_interop =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = fengari;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

if(typeof util === 'undefined') {var e = new Error("Cannot find module \"util\""); e.code = 'MODULE_NOT_FOUND'; throw e;}
module.exports = util;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

const fengari = __webpack_require__(1);
const lua     = fengari.lua;
const lauxlib = fengari.lauxlib;
const lualib  = fengari.lualib;

let custom_inspect_symbol;
try { /* for node.js */
	custom_inspect_symbol = __webpack_require__(2).inspect.custom;
} catch (e) {}

const apply = Reflect.apply;
const construct = Reflect.construct;

const toString = function(o) {
	return ""+o;
};

const isobject = function(o) {
	return typeof o === "object" ? o !== null : typeof o === "function";
};

const js_tname = lua.to_luastring("js object");

const testjs = function(L, idx) {
	let u = lauxlib.luaL_testudata(L, idx, js_tname);
	if (u)
		return u.data;
	else
		return void 0;
};

const checkjs = function(L, idx) {
	return lauxlib.luaL_checkudata(L, idx, js_tname).data;
};

const pushjs = function(L, v) {
	let b = lua.lua_newuserdata(L);
	b.data = v;
	lauxlib.luaL_setmetatable(L, js_tname);
};

const getmainthread = function(L) {
	lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, lua.LUA_RIDX_MAINTHREAD);
	let mainL = lua.lua_tothread(L, -1);
	lua.lua_pop(L, 1);
	return mainL;
};

/* weak map from states to proxy objects (for each object) in that state */
const states = new WeakMap();

const atnativeerror = function(L) {
	let u = lua.lua_touserdata(L, 1);
	push(L, u);
	return 1;
};

const push = function(L, v) {
	switch (typeof v) {
	case "undefined":
		lua.lua_pushnil(L);
		break;
	case "number":
		lua.lua_pushnumber(L, v);
		break;
	case "string":
		lua.lua_pushstring(L, lua.to_luastring(v));
		break;
	case "boolean":
		lua.lua_pushboolean(L, v);
		break;
	case "symbol":
		lua.lua_pushlightuserdata(L, v);
		break;
	case "function":
		if (lua.lua_isproxy(v, L)) {
			v(L);
			break;
		}
		/* fall through */
	case "object":
		if (v === null) {
			/* can't use null in a WeakMap; grab from registry */
			lua.lua_rawgetp(L, lua.LUA_REGISTRYINDEX, null);
			break;
		}
		/* fall through */
	default:
		/* Try and push same object again */
		let objects_seen = states.get(getmainthread(L));
		let p = objects_seen.get(v);
		if (p) {
			p(L);
		} else {
			pushjs(L, v);
			p = lua.lua_toproxy(L, -1);
			objects_seen.set(v, p);
		}
	}
};

const tojs = function(L, idx) {
	switch(lua.lua_type(L, idx)) {
	case lua.LUA_TNONE:
	case lua.LUA_TNIL:
		return void 0;
	case lua.LUA_TBOOLEAN:
		return lua.lua_toboolean(L, idx);
	case lua.LUA_TLIGHTUSERDATA:
		return lua.lua_touserdata(L, idx);
	case lua.LUA_TNUMBER:
		return lua.lua_tonumber(L, idx);
	case lua.LUA_TSTRING:
		return lua.lua_tojsstring(L, idx);
	case lua.LUA_TUSERDATA:
		let u = testjs(L, idx);
		if (u !== void 0)
			return u;
		/* fall through */
	case lua.LUA_TTABLE:
	case lua.LUA_TFUNCTION:
	case lua.LUA_TTHREAD:
		/* fall through */
	default:
		return wrap(getmainthread(L), lua.lua_toproxy(L, idx));
	}
};


const invoke = function(L, p, thisarg, args, n_results) {
	lauxlib.luaL_checkstack(L, 2+args.length);
	if ((n_results === void 0) || (n_results === null)) {
		n_results = lua.LUA_MULTRET;
	}
	let base = lua.lua_gettop(L);
	p(L);
	push(L, thisarg);
	for (let i=0; i<args.length; i++) {
		push(L, args[i]);
	}
	lua.lua_call(L, 1+args.length, n_results);
	let nres = lua.lua_gettop(L)-base;
	let res = new Array(nres);
	for (let i=0; i<nres; i++) {
		res[i] = tojs(L, base+i+1);
	}
	lua.lua_settop(L, base);
	return res;
};

const get = function(L, p, prop) {
	lauxlib.luaL_checkstack(L, 2);
	p(L);
	push(L, prop);
	lua.lua_gettable(L, -2);
	let r = tojs(L, -1);
	lua.lua_pop(L, 2);
	return r;
};

const has = function(L, p, prop) {
	lauxlib.luaL_checkstack(L, 2);
	p(L);
	push(L, prop);
	lua.lua_gettable(L, -2);
	let r = lua.lua_isnil(L, -1);
	lua.lua_pop(L, 2);
	return r;
};

const set = function(L, p, prop, value) {
	lauxlib.luaL_checkstack(L, 3);
	p(L);
	push(L, prop);
	push(L, value);
	lua.lua_settable(L, -3);
	lua.lua_pop(L, 1);
};

const deleteProperty = function(L, p, prop) {
	lauxlib.luaL_checkstack(L, 3);
	p(L);
	push(L, prop);
	lua.lua_pushnil(L);
	lua.lua_settable(L, -3);
	lua.lua_pop(L, 1);
};

const tostring = function(L, p) {
	lauxlib.luaL_checkstack(L, 1);
	p(L);
	let r = lauxlib.luaL_tolstring(L, -1);
	lua.lua_pop(L, 2);
	return lua.to_jsstring(r);
};

/* implements lua's "Generic For" protocol */
const iter_next = function() {
	lauxlib.luaL_checkstack(this.L, 3);
	let top = lua.lua_gettop(this.L);
	this.iter(this.L);
	this.state(this.L);
	this.last(this.L);
	lua.lua_call(this.L, 2, lua.LUA_MULTRET);
	this.last = lua.lua_toproxy(this.L, top+1);
	let r;
	if (lua.lua_isnil(this.L, -1)) {
		r = {
			done: true,
			value: void 0
		};
	} else {
		let n_results = lua.lua_gettop(this.L) - top;
		let result = new Array(n_results);
		for (let i=0; i<n_results; i++) {
			result[i] = tojs(this.L, top+i+1);
		}
		r = {
			done: false,
			value: result
		};
	}
	lua.lua_settop(this.L, top);
	return r;
};

/* make iteration use pairs() */
const jsiterator = function(L, p) {
	lauxlib.luaL_requiref(L, lua.to_luastring("_G"), lualib.luaopen_base, 0);
	lua.lua_getfield(L, -1, lua.to_luastring("pairs"));
	lua.lua_remove(L, -2);
	p(L);
	lua.lua_call(L, 1, 3);
	let iter = lua.lua_toproxy(L, -3);
	let state = lua.lua_toproxy(L, -2);
	let last = lua.lua_toproxy(L, -1);
	lua.lua_pop(L, 3);
	return {
		L: L,
		iter: iter,
		state: state,
		last: last,
		next: iter_next
	};
};

const wrap = function(L, p) {
	/* we need `typeof js_proxy` to be "function" so that it's acceptable to native apis */
	let js_proxy = function() {
		/* only get one result */
		return invoke(L, p, this, arguments, 1)[0];
	};
	js_proxy.apply = function(thisarg, args) {
		/* only get one result */
		return invoke(L, p, thisarg, args, 1)[0];
	};
	js_proxy.invoke = function(thisarg, args) {
		return invoke(L, p, thisarg, args, lua.LUA_MULTRET);
	};
	js_proxy.get = function(k) {
		return get(L, p, k);
	};
	js_proxy.has = function(k) {
		return has(L, p, k);
	};
	js_proxy.set = function(k, v) {
		return set(L, p, k, v);
	};
	js_proxy.delete = function(k) {
		return deleteProperty(L, p, k);
	};
	js_proxy.toString = function() {
		return tostring(L, p);
	};
	js_proxy[Symbol.toStringTag] = "Fengari object";
	js_proxy[Symbol.iterator] = function() {
		return jsiterator(L, p);
	};
	if (Symbol.toPrimitive) {
		js_proxy[Symbol.toPrimitive] = function(hint) {
			if (hint === "string") {
				return tostring(L, p);
			}
		};
	}
	if (custom_inspect_symbol) {
		js_proxy[custom_inspect_symbol] = js_proxy.toString;
	}
	return js_proxy;
};

const proxy_handlers = {
	apply: function(target, thisarg, args) {
		return invoke(target.L, target.p, thisarg, args, 1)[0];
	},
	get: function(target, k) {
		return get(target.L, target.p, k);
	},
	has: function(target, k) {
		return has(target.L, target.p, k);
	},
	set: function(target, k, v) {
		return set(target.L, target.p, k, v);
	},
	deleteProperty: function(target, k) {
		return deleteProperty(target.L, target.p, k);
	}
};

const createproxy = function(L, p) {
	/* target should be a function so that `typeof proxy` is "function"
	 * we want `typeof js_proxy` to be "function" so that it's acceptable to native apis */
	let target = function(){ return p(L); };
	target.p = p;
	target.L = L;
	let js_proxy = new Proxy(target, proxy_handlers);
	return js_proxy;
};

const get_iterator = function(L, idx) {
	let u = checkjs(L, idx);
	let getiter = u[Symbol.iterator];
	if (!getiter)
		lauxlib.luaL_argerror(L, idx, lua.to_luastring("object not iterable"));
	let iter = apply(getiter, u, []);
	if (!isobject(iter))
		lauxlib.luaL_argerror(L, idx, lua.to_luastring("Result of the Symbol.iterator method is not an object"));
	return iter;
};

const next = function(L) {
	let iter = checkjs(L, 1);
	let r = iter.next();
	if (r.done) {
		return 0;
	} else {
		push(L, r.value);
		return 1;
	}
};

let jslib = {
	"new": function(L) {
		let u = checkjs(L, 1);
		let nargs = lua.lua_gettop(L)-1;
		let args = new Array(nargs);
		for (let i = 0; i < nargs; i++) {
			args[i] = tojs(L, i+2);
		}
		push(L, construct(u, args));
		return 1;
	},
	"of": function(L) {
		let iter = get_iterator(L, 1);
		lua.lua_pushcfunction(L, next);
		push(L, iter);
		return 2;
	},
	"createproxy": function(L) {
		lauxlib.luaL_checkany(L, 1);
		let proxy = createproxy(getmainthread(L), lua.lua_toproxy(L, 1));
		push(L, proxy);
		return 1;
	},
	"tonumber": function(L) {
		let u = checkjs(L, 1);
		lua.lua_pushnumber(L, +u);
		return 1;
	}
};

let jsmt = {
	__index: function(L) {
		let u = checkjs(L, 1);
		let k = tojs(L, 2);
		push(L, u[k]);
		return 1;
	},
	__newindex: function(L) {
		let u = checkjs(L, 1);
		let k = tojs(L, 2);
		let v = tojs(L, 3);
		if (v === void 0)
			delete u[k];
		else
			u[k] = v;
		return 0;
	},
	__tostring: function(L) {
		let u = checkjs(L, 1);
		let s = toString(u);
		lua.lua_pushstring(L, lua.to_luastring(s));
		return 1;
	},
	__call: function(L) {
		let u = checkjs(L, 1);
		let nargs = lua.lua_gettop(L)-1;
		let thisarg, args;
		if (nargs > 0) {
			thisarg = tojs(L, 2);
			if (nargs-- > 0) {
				args = new Array(nargs);
				for (let i = 0; i < nargs; i++) {
					args[i] = tojs(L, i+3);
				}
			}
		}
		push(L, apply(u, thisarg, args));
		return 1;
	}
};

const luaopen_js = function(L) {
	/* Add weak map to track objects seen */
	states.set(getmainthread(L), new WeakMap());

	lua.lua_atnativeerror(L, atnativeerror);

	lauxlib.luaL_newlib(L, jslib);

	lauxlib.luaL_newmetatable(L, js_tname);
	lauxlib.luaL_setfuncs(L, jsmt, 0);
	lua.lua_pop(L, 1);

	pushjs(L, null);
	/* Store null object in registry under lightuserdata null */
	lua.lua_pushvalue(L, -1);
	lua.lua_rawsetp(L, lua.LUA_REGISTRYINDEX, null);
	lua.lua_setfield(L, -2, lua.to_luastring("null"));

	push(L, global);
	lua.lua_setfield(L, -2, lua.to_luastring("global"));

	return 1;
};

module.exports.checkjs = checkjs;
module.exports.testjs = testjs;
module.exports.pushjs = pushjs;
module.exports.push = push;
module.exports.tojs = tojs;
module.exports.luaopen_js = luaopen_js;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ })
/******/ ]);