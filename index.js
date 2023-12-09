"use strict";

import Acorn from "./acorn.js";
import KaitaiStream from "./KaitaiStream.js";

const $DEBUG = true;

export default class OakRuntime {
    /**
     * @param {ArrayBuffer} arrayBuffer ArrayBuffer to read acorn from.
     * @param {?Number} arrayBufferOffset Offset from arrayBuffer beginning.
     */
    constructor(arrayBuffer, arrayBufferOffset = 0) {
        this._acorn = new Acorn(new KaitaiStream(arrayBuffer, arrayBufferOffset));
        this._externals = {};
        this._cachedExpressions = {};
        this._closureIndex = 0n;
        this._exportsMap = this._acorn.exports.reduce((acc, x) => {
            acc[x.name.value] = x.address;
            return acc;
        }, {});
        for (let fn of this._acorn.funcs) {
            fn.kind = INSTANCE_KIND_FUNC;
        }
        this.externalSelfContext = this;
        if ($DEBUG) {
            this._stack = [];
        }
    }

    INSTANCE_KIND_UNIT = INSTANCE_KIND_UNIT
    INSTANCE_KIND_CHAR = INSTANCE_KIND_CHAR
    INSTANCE_KIND_INT = INSTANCE_KIND_INT
    INSTANCE_KIND_FLOAT = INSTANCE_KIND_FLOAT
    INSTANCE_KIND_STRING = INSTANCE_KIND_STRING
    INSTANCE_KIND_RECORD = INSTANCE_KIND_RECORD
    INSTANCE_KIND_TUPLE = INSTANCE_KIND_TUPLE
    INSTANCE_KIND_LIST = INSTANCE_KIND_LIST
    INSTANCE_KIND_OPTION = INSTANCE_KIND_OPTION
    INSTANCE_KIND_FUNC = INSTANCE_KIND_FUNC
    INSTANCE_KIND_EXTERN = INSTANCE_KIND_EXTERN

    /**
     * @param {String} moduleName Full module name, e.g. Oak.Core.Basics
     * @param {{[String]: function}} definitions Map of external defined functions
     */
    register(moduleName, definitions) {
        for (let name in definitions) {
            this._externals[this.qualifierIdentifier(moduleName, name)] = definitions[name];
        }
    }

    /**
     * @param {Number|String|Array|{}|null} value
     * @return {Readonly<{}>}
     */
    wrap = wrap

    /**
     * @param {Readonly<{}>} x
     * @return {Number|String|Array|{}|null}
     */
    unwrap = unwrap

    unwrapShallow = unwrapShallow
    /**
     * @param {*} value
     * @return {Readonly<{}>}
     */
    extern = extern

    /**
     * @return {Readonly<{}>}
     */
    unit = unit

    /**
     * @param {Number} value
     * @return {Readonly<{}>}
     */
    char = char

    /**
     * @param {Number} value
     * @return {Readonly<{}>}
     */
    int = int

    /**
     * @param {Number} value
     * @return {Readonly<{}>}
     */
    float = float

    /**
     * @param {String} value
     * @return {Readonly<{}>}
     */
    string = string

    /**
     * @param {Object} value
     * @return {Readonly<{}>}
     */
    record = record
    recordShallow = recordShallow

    /**
     * @param {Array<Readonly<{}>>} value
     * @return {Readonly<{}>}
     */
    list = list
    listShallow = listShallow

    /**
     * @param {Array<Readonly<{}>>} value
     * @return {Readonly<{}>}
     */
    tuple = tuple
    tupleShallow = tupleShallow

    /**
     * @param {String} qualifiedIdentifier data type name
     * @param {String} name option name
     * @param {Array<Readonly<{}>>?} values option type arguments
     * @return {Readonly<{}>}
     */
    option = option
    optionShallow = optionShallow

    bool = bool

    /**
     * Returns qualifier definition identifier to use in execute method
     * @param {String} module Full module name, like `Oak.Core.Basics`
     * @param {String} definition Definition name, like `identity`
     * @return {String}
     */
    qualifierIdentifier = qualifierIdentifier

    listItem = listItem

    /**
     * Executes function
     * @param {String} qualifiedIdentifier
     * @param  {Array<Readonly<{}>>} args
     * @return {Readonly<{}>}
     */
    execute(qualifiedIdentifier, ...args) {
        try {
            const fnIndex = this._exportsMap[qualifiedIdentifier];
            if (fnIndex === undefined) {
                throw(`[oak] Definition '${qualifiedIdentifier}' is not exported by loaded binary`)
            }
            const fn = this._acorn.funcs[fnIndex];
            if (args.length !== fn.numArgs) {
                throw(`[oak] Function '${qualifiedIdentifier}' requires ${fn.numArgs} arguments, but ${args.length} given`);
            }
            const objectStack = args.slice();
            this._executeFn(fn, objectStack, [], {}, qualifiedIdentifier);
            return objectStack.pop();
        } catch (e) {
            this._throwStack(e);
        }
    }

    executeFn(fn, args) {
        try {
            if (fn.curriedFn) {
                const numCurriedArgs = fn.curriedArgs && fn.curriedArgs.length || 0;
                const requiredArgs = fn.numArgs - numCurriedArgs;
                if (requiredArgs === args.length) {
                    const stack = fn.curriedArgs.concat(args);
                    this._executeFn(fn.curriedFn, stack, []);
                    return stack.pop();
                } else if (requiredArgs > args.length) {
                    return Object.freeze({
                        curriedFn: fn.curriedFn,
                        numArgs: fn.numArgs,
                        kind: this.INSTANCE_KIND_FUNC,
                        curriedArgs: fn.curriedArgs.concat(args),
                        index: ++this._closureIndex,
                    });
                } else {
                    const topArgs = args.slice(0, requiredArgs);
                    const stack = fn.curriedArgs.concat(topArgs);
                    this._executeFn(fn.curriedFn, stack, []);
                    return this.executeFn(stack.pop(), args.slice(requiredArgs));
                }
            } else {
                if (fn.numArgs === args.length) {
                    this._executeFn(fn, args, []);
                    return args.pop();
                } else if (fn.numArgs > args.length) {
                    return Object.freeze({
                        curriedFn: fn,
                        numArgs: fn.numArgs,
                        kind: this.INSTANCE_KIND_FUNC,
                        curriedArgs: args,
                        index: ++this._closureIndex,
                    });
                } else {
                    const stack = args.slice(0, fn.numArgs);
                    this._executeFn(fn, stack, []);
                    return this.executeFn(stack.pop(), args.slice(fn.numArgs));
                }
            }
        } catch (e) {
            this._throwStack(e);
        }
    }

    _executeFn(fn, objectStack, patternStack, fnName) {
        if ($DEBUG) {
            this._stack.push({fn: fnName});
        }

        let locals = {};
        let index = 0;
        while (index < fn.ops.length) {
            if ($DEBUG) {
                this._stack[this._stack.length - 1].file = fn.filePath.value + ":" + fn.locations[index].line;
            }
            const op = fn.ops[index];
            switch (op.kind) {
                case Acorn.OpKind.LOAD_LOCAL: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    const local = locals[name];
                    if ($DEBUG) {
                        if (!name) {
                            throw(`[oak:debug] Local variable name is empty`);
                        }
                        if (!local) {
                            throw(`[oak:debug] Local variable '${name}' is not defined`);
                        }
                        if (!local.kind) {
                            throw(`[oak:debug] Local variable '${name}' in not wrapped`);
                        }
                    }
                    objectStack.push(local);
                    break
                }
                case Acorn.OpKind.LOAD_GLOBAL: {
                    const glob = this._acorn.funcs[op.aPointer];
                    if ($DEBUG) {
                        if (!glob) {
                            throw(`[oak:debug] Global function '${op.aPointer}' is not defined`);
                        } else {
                            glob.$DebugName = Object.keys(this._exportsMap).filter(k => this._exportsMap[k] === op.aPointer)[0];
                            glob.$DebugPointer = op.aPointer;
                        }
                    }
                    if (glob.numArgs === 0) {
                        const c = this._cachedExpressions[op.aPointer];
                        if (c === undefined) {
                            this._executeFn(glob, objectStack, patternStack);
                            if ($DEBUG) {
                                if (objectStack.length === 0) {
                                    throw(`[oak:debug] Stack is empty after '${glob.$DebugName}'`);
                                }
                            }
                            this._cachedExpressions[op.aPointer] = objectStack[objectStack.length - 1];
                        } else {
                            objectStack.push(c);
                        }
                    } else {
                        objectStack.push(glob);
                    }
                    break
                }
                case Acorn.OpKind.LOAD_CONST: {
                    let stack;
                    switch (op.bStackKind) {
                        case Acorn.StackKind.OBJECT: {
                            stack = objectStack;
                            break
                        }
                        case Acorn.StackKind.PATTERN: {
                            stack = patternStack;
                            break
                        }
                    }
                    switch (op.cConstKind) {
                        case Acorn.ConstKind.UNIT: {
                            stack.push(this.unit());
                            break
                        }
                        case Acorn.ConstKind.CHAR: {
                            stack.push(this.char(op.aConstPointerValueHash));
                            break
                        }
                        case Acorn.ConstKind.INT: {
                            const c = this._acorn.consts[op.aConstPointerValueHash];
                            stack.push(this.int(c.intValue));
                            break
                        }
                        case Acorn.ConstKind.FLOAT: {
                            const c = this._acorn.consts[op.aConstPointerValueHash];
                            stack.push(this.float(c.floatValue));
                            break
                        }
                        case Acorn.ConstKind.STRING: {
                            const c = this._acorn.strings[op.aConstPointerValueHash].value;
                            stack.push(this.string(c));
                            break
                        }
                    }
                    break
                }
                case Acorn.OpKind.APPLY: {
                    if ($DEBUG) {
                        if (objectStack.length === 0) {
                            throw(`[oak:debug] Stack is empty when applying function`);
                        }
                    }
                    const afn = objectStack.pop();
                    const n = op.bNumArgs;
                    const start = objectStack.length - n;
                    const numCurriedArgs = afn.curriedArgs && afn.curriedArgs.length || 0;
                    if ((numCurriedArgs > 0) && (afn.numArgs - numCurriedArgs === n)) {
                        objectStack.splice(start, 0, ...afn.curriedArgs);
                        this._executeFn(afn.curriedFn, objectStack, patternStack);
                    } else if (afn.numArgs === n) {
                        if ($DEBUG) {
                            const fnStack = objectStack.slice(start);
                            objectStack.splice(start);
                            this._executeFn(afn, fnStack, [], afn.locals || locals);
                            objectStack.push(...fnStack);
                        } else {
                            this._executeFn(afn, objectStack, patternStack);
                        }
                    } else {
                        if ($DEBUG) {
                            if (objectStack.length < n) {
                                throw(`[oak:debug] Stack is not big enough to curry '${afn.$DebugName}'`);
                            }
                        }
                        const args = objectStack.slice(start);
                        objectStack.splice(start);
                        let curried = Object.freeze({
                            curriedFn: afn.curriedFn || afn,
                            numArgs: afn.numArgs,
                            kind: this.INSTANCE_KIND_FUNC,
                            curriedArgs: numCurriedArgs === 0 ? args : afn.curriedArgs.concat(args),
                            index: ++this._closureIndex,
                        });
                        objectStack.push(curried);
                    }
                    break
                }
                case Acorn.OpKind.CALL: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    if ($DEBUG) {
                        if (!name) {
                            throw(`[oak:debug] External function name is empty`);
                        }
                        if (objectStack.length < op.bNumArgs) {
                            throw(`[oak:debug] Stack is not big enough to call '${name}'`);
                        }
                    }
                    const cfn = this._externals[name];
                    if (cfn === undefined) {
                        throw(`[oak] External function '${name}' is not registered`);
                    }
                    if (op.bNumArgs === 0) {
                        objectStack.push(cfn);
                    } else {
                        const n = objectStack.length;
                        const start = n - op.bNumArgs;
                        let args = objectStack.slice(start);
                        objectStack.splice(start);
                        let result = cfn.apply(this.externalSelfContext, args);
                        objectStack.push(result);
                    }
                    break
                }
                case Acorn.OpKind.MATCH: {
                    if (!this._match(patternStack.pop(), objectStack[objectStack.length - 1], locals)) {
                        if ($DEBUG) {
                            if (op.aJumpDelta === 0) {
                                throw(`[oak:debug] Pattern match fail with jump delta 0 should not happen`);
                            }
                        }
                        index += op.aJumpDelta;
                    }
                    break
                }
                case Acorn.OpKind.JUMP: {
                    index += op.aJumpDelta;
                    break
                }
                case Acorn.OpKind.MAKE_OBJECT: {
                    switch (op.bObjectKind) {
                        case Acorn.ObjectKind.LIST: {
                            if (0 === op.aNumItems) {
                                objectStack.push(listItem())
                            } else {
                                const n = objectStack.length;
                                if ($DEBUG) {
                                    if (n < op.aNumItems) {
                                        throw(`[oak:debug] Stack is not big enough to make list with ${op.aNumItems} items`);
                                    }
                                }
                                const start = n - op.aNumItems;
                                let list = undefined;
                                for (let i = n - 1; i >= start; i--) {
                                    list = listItem(objectStack[i], list);
                                }
                                objectStack.splice(start);
                                objectStack.push(list);
                            }
                            break
                        }
                        case Acorn.ObjectKind.TUPLE: {
                            if ($DEBUG) {
                                if (objectStack.length < op.aNumItems) {
                                    throw(`[oak:debug] Stack is not big enough to make tuple with ${op.aNumItems} items`);
                                }
                            }
                            const start = objectStack.length - op.aNumItems;
                            const items = objectStack.slice(start);
                            objectStack.splice(start);
                            const tuple = tupleShallow(items);
                            objectStack.push(tuple);
                            break
                        }
                        case Acorn.ObjectKind.RECORD: {
                            if ($DEBUG) {
                                if (objectStack.length < op.aNumItems) {
                                    throw(`[oak:debug] Stack is not big enough to make record with ${op.aNumItems} items`);
                                }
                            }
                            if (0 === op.aNumItems) {
                                objectStack.push(recordFiled());
                            } else {
                                const n = objectStack.length;
                                if ($DEBUG) {
                                    if (n < op.aNumItems * 2) {
                                        throw(`[oak:debug] Stack is not big enough to make record with ${op.aNumItems} fields`);
                                    }
                                }

                                let rec = undefined;
                                for (let i = 0; i < op.aNumItems; i++) {
                                    const objName = objectStack.pop();
                                    const name = this.unwrap(objName);
                                    const value = objectStack.pop();
                                    rec = recordFiled(name, value, rec);
                                }
                                objectStack.push(rec);
                            }
                            break
                        }
                        case Acorn.ObjectKind.DATA: {
                            if ($DEBUG) {
                                if (objectStack.length === 0) {
                                    throw(`[oak:debug] Stack is empty when making data option`);
                                }
                            }
                            const objName = objectStack.pop();
                            const name = this.unwrap(objName);
                            const start = objectStack.length - op.aNumItems;
                            if ($DEBUG) {
                                if (objectStack.length < op.aNumItems) {
                                    throw(`[oak:debug] Stack is not big enough to make data with ${op.aNumItems} items`);
                                }
                            }
                            const items = objectStack.slice(start);
                            objectStack.splice(start);
                            const opt = optionImpl(name, items);
                            objectStack.push(opt);
                            break
                        }
                    }
                    break
                }
                case Acorn.OpKind.MAKE_PATTERN: {
                    let name = undefined;
                    let items = undefined;
                    switch (op.bPatternKind) {
                        case Acorn.PatternKind.ALIAS: {
                            name = this._acorn.strings[op.aStringHash].value;
                            if ($DEBUG) {
                                if (!name) {
                                    throw(`[oak:debug] Pattern alias name is empty`);
                                }
                                if (patternStack.length === 0) {
                                    throw(`[oak:debug] Stack is empty when making pattern alias`);
                                }
                            }
                            items = [patternStack.pop()];
                            break;
                        }
                        case Acorn.PatternKind.ANY: {
                            break;
                        }
                        case Acorn.PatternKind.CONS: {
                            if ($DEBUG) {
                                if (patternStack.length < 2) {
                                    throw(`[oak:debug] Stack is not big enough to make pattern cons`);
                                }
                            }
                            items = [patternStack.pop(), patternStack.pop()];
                            break;
                        }
                        case Acorn.PatternKind.CONST: {
                            if ($DEBUG) {
                                if (patternStack.length === 0) {
                                    throw(`[oak:debug] Stack is empty when making pattern const`);
                                }
                            }
                            items = [patternStack.pop()];
                            break;
                        }
                        case Acorn.PatternKind.DATA_OPTION: {
                            name = this._acorn.strings[op.aStringHash].value;
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            if ($DEBUG) {
                                if (!name) {
                                    throw(`[oak:debug] Pattern data option name is empty`);
                                }
                                if (patternStack.length < n) {
                                    throw(`[oak:debug] Stack is not big enough to make pattern data option with ${n} items`);
                                }
                            }
                            items = patternStack.slice(start);
                            patternStack.splice(start);
                            break;
                        }
                        case Acorn.PatternKind.LIST: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            if ($DEBUG) {
                                if (patternStack.length < n) {
                                    throw(`[oak:debug] Stack is not big enough to make pattern list with ${n} items`);
                                }
                            }
                            items = patternStack.slice(start);
                            patternStack.splice(start);
                            break;
                        }
                        case Acorn.PatternKind.NAMED: {
                            name = this._acorn.strings[op.aStringHash].value;
                            if ($DEBUG) {
                                if (!name) {
                                    throw(`[oak:debug] Pattern named name is empty`);
                                }
                            }
                            break;
                        }
                        case Acorn.PatternKind.RECORD: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            if ($DEBUG) {
                                if (patternStack.length < n) {
                                    throw(`[oak:debug] Stack is not big enough to make pattern record with ${n} items`);
                                }
                            }
                            items = patternStack.slice(start).map(unwrap);
                            patternStack.splice(start);
                            break;
                        }
                        case Acorn.PatternKind.TUPLE: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            if ($DEBUG) {
                                if (patternStack.length < n) {
                                    throw(`[oak:debug] Stack is not big enough to make pattern tuple with ${n} items`);
                                }
                            }
                            items = patternStack.slice(start);
                            patternStack.splice(start);
                            break;
                        }
                    }
                    const pattern = Object.freeze({kind: op.bPatternKind, name, items: Object.freeze(items)});
                    patternStack.push(pattern);
                    break
                }
                case Acorn.OpKind.ACCESS: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    if ($DEBUG) {
                        if (!name) {
                            throw(`[oak:debug] Field name is empty`);
                        }
                        if (objectStack.length === 0) {
                            throw(`[oak:debug] Stack is empty when accessing field`);
                        }
                    }
                    const rec = objectStack.pop();
                    const field = getField(rec, name);
                    objectStack.push(field);
                    break
                }
                case Acorn.OpKind.UPDATE: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    if ($DEBUG) {
                        if (!name) {
                            throw(`[oak:debug] Field name is empty`);
                        }
                        if (objectStack.length < 2) {
                            throw(`[oak:debug] Stack is not big enough to update field`);
                        }
                    }
                    const value = objectStack.pop();
                    const rec = objectStack.pop();
                    const updated = recordFiled(name, value, rec);
                    objectStack.push(updated);
                    break
                }
                case Acorn.OpKind.SWAP_POP: {
                    if (op.bSwapPopMode === Acorn.SwapPopMode.BOTH) {
                        if ($DEBUG) {
                            if (objectStack.length < 2) {
                                throw(`[oak:debug] Stack is not big enough to swap-pop (both)`);
                            }
                        }
                        objectStack.splice(objectStack.length - 2, 1);
                    } else {
                        if ($DEBUG) {
                            if (objectStack.length === 0) {
                                throw(`[oak:debug] Stack is not big enough to swap-pop (pop)`);
                            }
                        }
                        objectStack.pop();
                    }
                    break
                }
            }
            index++
        }

        if ($DEBUG) {
            this._stack.pop();
        }
    }

    _match(pattern, obj, locals) {
        switch (pattern.kind) {
            case Acorn.PatternKind.ALIAS: {
                locals[pattern.name] = obj;
                if ($DEBUG) {
                    if (pattern.items.length !== 1) {
                        throw(`[oak:debug] Alias pattern should have exactly one item`);
                    }
                }
                return this._match(pattern.items[0], obj, locals);
            }
            case Acorn.PatternKind.ANY: {
                return true;
            }
            case Acorn.PatternKind.CONS: {
                if ($DEBUG) {
                    if (pattern.items.length !== 2) {
                        throw(`[oak:debug] Cons pattern should have exactly two items`);
                    }
                }
                let matched = obj.kind === INSTANCE_KIND_LIST && obj.value !== undefined;
                matched &= this._match(pattern.items[0], obj.value, locals);
                matched &= this._match(pattern.items[1], (obj.next === undefined ? listItem() : obj.next), locals);
                return matched;
            }
            case Acorn.PatternKind.CONST: {
                if ($DEBUG) {
                    if (pattern.items.length !== 1) {
                        throw(`[oak:debug] Const pattern should have exactly one item`);
                    }
                }
                return constEqual(obj, pattern.items[0]);
            }
            case Acorn.PatternKind.DATA_OPTION: {
                const olen = obj.values && obj.values.length || 0;
                const plen = pattern.items && pattern.items.length || 0;
                let matched = obj.kind === INSTANCE_KIND_OPTION &&
                    obj.name === pattern.name &&
                    olen === plen;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= this._match(pattern.items[i], obj.values[i], locals);
                }
                return matched;
            }
            case Acorn.PatternKind.LIST: {
                let matched = obj.kind === INSTANCE_KIND_LIST;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= obj !== undefined &&
                        obj.value !== undefined &&
                        this._match(pattern.items[i], obj.value, locals);
                    obj = obj.next;
                }
                matched &= obj === undefined || obj.value === undefined;
                return matched;
            }
            case Acorn.PatternKind.NAMED: {
                locals[pattern.name] = obj;
                return true;
            }
            case Acorn.PatternKind.RECORD: {
                let matched = obj.kind === INSTANCE_KIND_RECORD;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    const name = pattern.items[i];
                    const field = getField(obj, unwrap(name));
                    matched &= field !== undefined;
                    locals[name] = field;
                }
                return matched;
            }
            case Acorn.PatternKind.TUPLE: {
                if ($DEBUG) {
                    const pl = pattern.items && pattern.items.length || 0;
                    const vl = obj.value && obj.value.length || 0;
                    if (pl !== vl) {
                        throw(`[oak:debug] Tuple pattern mismatch object items length`);
                    }
                }
                let matched = obj.kind === INSTANCE_KIND_TUPLE;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= this._match(pattern.items[i], obj.value[i], locals);
                }
                return matched;
            }
        }
    }

    _throwStack(err) {
        if ($DEBUG) {
            throw err + "\n" + this._stack.reverse().map(x => `${x.fn} ${x.file}`).join("\n");
        }
    }
}

const INSTANCE_KIND_UNIT = 1
const INSTANCE_KIND_CHAR = 2
const INSTANCE_KIND_INT = 3
const INSTANCE_KIND_FLOAT = 4
const INSTANCE_KIND_STRING = 5
const INSTANCE_KIND_RECORD = 6
const INSTANCE_KIND_TUPLE = 7
const INSTANCE_KIND_LIST = 8
const INSTANCE_KIND_OPTION = 9
const INSTANCE_KIND_FUNC = 10
const INSTANCE_KIND_EXTERN = 11

const _True = option(qualifierIdentifier("Oak.Core.Basics", "Bool"), "True");
const _False = option(qualifierIdentifier("Oak.Core.Basics", "Bool"), "False");

function extern(x) {
    return Object.freeze({kind: INSTANCE_KIND_EXTERN, value: x});
}

function wrap(value) {
    if (value === null) {
        return unit()
    }
    if (Array.isArray(value)) {
        return list(value);
    }
    let t = typeof value;
    if (t === "number") {
        return float(value);
    }
    if (t === "object") {
        return record(value);
    }
    if (t === "boolean") {
        return value ? _True : _False;
    }
    if (t === "string") {
        return string(value);
    }
    if (isNaN(value)) {
        return float(value)
    }
    throw "given object cannot be wrapped and used in oak code";
}

function unwrap(x) {
    const result = unwrapShallow(x);

    switch (x.kind) {
        case INSTANCE_KIND_LIST: {
            return result.map(unwrap);
        }
        case INSTANCE_KIND_TUPLE: {
            return result.map(unwrap);
        }
        case INSTANCE_KIND_RECORD: {
            return Object.keys(result).reduce((acc, k) => {
                acc[k] = unwrap(result[k]);
                return acc;
            }, {});
        }
    }
    return result;
}

function unwrapShallow(x) {
    switch (x.kind) {
        case INSTANCE_KIND_LIST: {
            let head = x;
            let list = [];
            while (head !== undefined && head.value !== undefined) {
                list.push(head.value);
                head = head.next;
            }

            return list;
        }
        case INSTANCE_KIND_RECORD: {
            let field = x;
            let rec = {};
            while (field !== undefined && field.key !== undefined) {
                if (rec[field.key] === undefined) {
                    rec[field.key] = field.value;
                }
                field = field.parent;
            }
            return rec;
        }
        case INSTANCE_KIND_OPTION: {
            if (x.name === _True.name) {
                return true;
            }
            if (x.name === _False.name) {
                return false;
            }
            return {$name: x.name, $values: x.values};
        }
        case INSTANCE_KIND_FUNC: {
            return {$func: x};
        }
    }
    return x.value;
}

function unit() {
    return Object.freeze({kind: INSTANCE_KIND_UNIT, value: null});
}

function char(value) {
    if ($DEBUG) {
        if (typeof (value) !== "number") {
            throw(`[oak:debug] Char value is not number`);
        }
    }
    return Object.freeze({kind: INSTANCE_KIND_CHAR, value});
}

function int(value) {
    if ($DEBUG) {
        if (typeof (value) !== "number") {
            throw(`[oak:debug] Int value is not number`);
        }
    }
    return Object.freeze({kind: INSTANCE_KIND_INT, value});
}

function float(value) {
    if ($DEBUG) {
        if (typeof (value) !== "number") {
            throw(`[oak:debug] Float value is not number`);
        }
    }
    return Object.freeze({kind: INSTANCE_KIND_FLOAT, value});
}

function string(value) {
    if ($DEBUG) {
        if (typeof (value) !== "string") {
            throw(`[oak:debug] String value is not string`);
        }
    }
    return Object.freeze({kind: INSTANCE_KIND_STRING, value});
}

function record(value) {
    return recordShallow(Object.keys(value).reduce((acc, k) => {
        acc[k] = wrap(value[k]);
        return acc;
    }, {}));
}

function recordShallow(value) {
    let rec = undefined;
    for (const n in value) {
        rec = recordFiled(n, value[n], rec);
    }
    if (rec === undefined) {
        rec = recordFiled();
    }
    return rec;
}

function list(value) {
    return listShallow(value.map(wrap));
}

function listShallow(value) {
    let list = undefined;
    for (let i = value.length - 1; i >= 0; i--) {
        list = listItem(value[i], list);
    }
    if (list === undefined) {
        list = listItem();
    }
    return list;
}

function tuple(value) {
    return tupleShallow(value.map(wrap));
}

function tupleShallow(value) {
    return Object.freeze({kind: INSTANCE_KIND_TUPLE, value: Object.freeze(value)});
}

function option(qualifiedIdentifier, name, values) {
    return optionShallow(qualifiedIdentifier, name, (values || []).map(wrap));
}

function optionShallow(qualifiedIdentifier, name, values) {
    return optionImpl(`${qualifiedIdentifier}#${name}`, values);
}

function optionImpl(name, values) {
    return Object.freeze({
        kind: INSTANCE_KIND_OPTION,
        name: name,
        values: Object.freeze(values || [])
    });
}

function bool(value) {
    return value ? _True : _False;
}

function qualifierIdentifier(module, definition) {
    return `${module}.${definition}`;
}

function recordFiled(key, value, parent) {
    return Object.freeze({kind: INSTANCE_KIND_RECORD, key, value, parent})
}

function listItem(value, next) {
    return Object.freeze({kind: INSTANCE_KIND_LIST, value, next})
}

function getField(rec, fieldName) {
    if (rec === undefined) {
        return undefined;
    }
    if (fieldName === rec.key) {
        return rec.value;
    }
    return getField(rec.parent, fieldName);
}

function constEqual(a, b) {
    return a.value === b.value && (a.kind === b.kind);
}
