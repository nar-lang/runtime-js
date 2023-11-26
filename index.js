"use strict";

import Acorn from "./acorn.js";
import KaitaiStream from "./KaitaiStream.js";

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
    }


    static _True = OakRuntime.option(OakRuntime.qualifierIdentifier("Oak.Core.Basics", "Bool"), "True");
    static _False = OakRuntime.option(OakRuntime.qualifierIdentifier("Oak.Core.Basics", "Bool"), "False");

    externalSelfContext = {}

    static INSTANCE_KIND_UNIT = 1
    static INSTANCE_KIND_CHAR = 2
    static INSTANCE_KIND_INT = 3
    static INSTANCE_KIND_FLOAT = 4
    static INSTANCE_KIND_STRING = 5
    static INSTANCE_KIND_RECORD = 6
    static INSTANCE_KIND_TUPLE = 7
    static INSTANCE_KIND_LIST = 8
    static INSTANCE_KIND_OPTION = 9
    static INSTANCE_KIND_FUNC = 10

    /**
     * @param {String} moduleName Full module name, e.g. Oak.Core.Basics
     * @param {{[String]: function}} definitions Map of external defined functions
     */
    register(moduleName, definitions) {
        for (let name in definitions) {
            this._externals[OakRuntime.qualifierIdentifier(moduleName, name)] = definitions[name];
        }
    }

    /**
     * @param {Number|BigInt|String|Array|{}|null} value
     * @return {Readonly<{}>}
     */
    static wrap(value) {
        if (value === null) {
            return OakRuntime.unit()
        }
        if (Array.isArray(value)) {
            return OakRuntime.list(value);
        }
        let t = typeof value;
        if (t === "number") {
            return OakRuntime.float(value);
        }
        if (t === "bigint") {
            return OakRuntime.int(value);
        }
        if (t === "object") {
            return OakRuntime.record(t);
        }
        if (t === "boolean") {
            return value ? OakRuntime._True : OakRuntime._False;
        }
        throw "given object cannot be wrapped and used in oak code";
    }

    /**
     * @param {Readonly<{}>} x
     * @return {Number|String|Array|{}|null}
     */
    static unwrap(x) {
        switch (x.kind) {
            case OakRuntime.INSTANCE_KIND_LIST: {
                let head = x.value;
                let list = [];
                while (head !== undefined && head.value !== undefined) {
                    list.push(head.value);
                    head = head.next;
                }

                return list;
            }
            case OakRuntime.INSTANCE_KIND_RECORD: {
                let field = x.value;
                let rec = {};
                while (field !== undefined && field.name !== undefined) {
                    if (rec[field.key] === undefined) {
                        rec[field.key] = field.value;
                    }
                }
                return rec;
            }
            case OakRuntime.INSTANCE_KIND_OPTION: {
                if (x.name === OakRuntime._True.name) {
                    return true;
                }
                if (x.name === OakRuntime._False.name) {
                    return false;
                }
            }
        }
        return x.value;
    }

    /**
     * @return {Readonly<{}>}
     */
    static unit() {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_UNIT, value: null});
    }

    /**
     * @param {Number} value
     * @return {Readonly<{}>}
     */
    static char(value) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_CHAR, value});
    }

    /**
     * @param {BigInt} value
     * @return {Readonly<{}>}
     */
    static int(value) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_INT, value});
    }

    /**
     * @param {Number} value
     * @return {Readonly<{}>}
     */
    static float(value) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_FLOAT, value});
    }

    /**
     * @param {String} value
     * @return {Readonly<{}>}
     */
    static string(value) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_STRING, value});
    }

    /**
     * @param {Object} value
     * @return {Readonly<{}>}
     */
    static record(value) {
        let rec = undefined;
        for (const n in value) {
            rec = OakRuntime._recordFiled(n, OakRuntime.wrap(value[n]), rec);
        }
        if (rec === undefined) {
            rec = OakRuntime._recordFiled();
        }
        return rec;
    }

    /**
     * @param {Array<Readonly<{}>>} value
     * @return {Readonly<{}>}
     */
    static list(value) {
        let list = undefined;
        for (let i = value.length - 1; i >= 0; i--) {
            list = OakRuntime._listItem(OakRuntime.wrap(value[i]), list);
        }
        if (list === undefined) {
            list = OakRuntime._listItem();
        }
        return list;
    }

    /**
     * @param {Array<Readonly<{}>>} value
     * @return {Readonly<{}>}
     */
    static tuple(value) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_TUPLE, value: Object.freeze(value.map(OakRuntime.wrap))});
    }

    /**
     * @param {String} qualifiedIdentifier data type name
     * @param {String} name option name
     * @param {Array<Readonly<{}>>?} values option type arguments
     * @return {Readonly<{}>}
     */
    static option(qualifiedIdentifier, name, values) {
        return Object.freeze({
            kind: OakRuntime.INSTANCE_KIND_OPTION,
            name: `${qualifiedIdentifier}#${name}`,
            values: Object.freeze(values)
        });
    }

    static bool(value) {
        return value ? OakRuntime._True : OakRuntime._False;
    }

    /**
     * Returns qualifier definition identifier to use in execute method
     * @param {String} module Full module name, like `Oak.Core.Basics`
     * @param {String} definition Definition name, like `identity`
     * @return {String}
     */
    static qualifierIdentifier(module, definition) {
        return `${module}.${definition}`;
    }

    /**
     * Executes function
     * @param {String} qualifiedIdentifier
     * @param  {Array<Readonly<{}>>} args
     * @return {Readonly<{}>}
     */
    execute(qualifiedIdentifier, ...args) {
        const fnIndex = this._exportsMap[qualifiedIdentifier];
        if (fnIndex === undefined) {
            console.error(`[oak] Definition '${qualifiedIdentifier}' is not exported by loaded binary`)
        }

        const objectStack = args.slice();
        this._executeFn(this._acorn.funcs[fnIndex], objectStack, [], {});
        return objectStack.pop();
    }

    executeFn(fn, args) {
        this._executeFn(fn, args, [], {});
        return args.pop();
    }

    _executeFn(fn, objectStack, patternStack, parentLocals) {
        let locals = Object.create(parentLocals);
        let index = 0;
        while (index < fn.ops.length) {
            const op = fn.ops[index];
            switch (op.kind) {
                case Acorn.OpKind.LOAD_LOCAL: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    const local = locals[name];
                    objectStack.push(local);
                    break
                }
                case Acorn.OpKind.LOAD_GLOBAL: {
                    const fn = this._acorn.funcs[op.aPointer];
                    if (fn.numArgs === 0) {
                        const c = this._cachedExpressions[op.aPointer];
                        if (c === undefined) {
                            this._executeFn(fn, objectStack, patternStack, {});
                            this._cachedExpressions[op.aPointer] = objectStack[objectStack.length - 1];
                        } else {
                            objectStack.push(c);
                        }
                    } else {
                        objectStack.push(fn);
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
                            stack.push(OakRuntime.unit());
                            break
                        }
                        case Acorn.ConstKind.CHAR: {
                            stack.push(OakRuntime.char(op.aConstPointerValueHash));
                            break
                        }
                        case Acorn.ConstKind.INT: {
                            const c = this._acorn.consts[op.aConstPointerValueHash];
                            stack.push(OakRuntime.int(c.intValue));
                            break
                        }
                        case Acorn.ConstKind.FLOAT: {
                            const c = this._acorn.consts[op.aConstPointerValueHash];
                            stack.push(OakRuntime.float(c.floatValue));
                            break
                        }
                        case Acorn.ConstKind.STRING: {
                            const c = this._acorn.strings[op.aConstPointerValueHash].value;
                            stack.push(OakRuntime.string(c));
                            break
                        }
                    }
                    break
                }
                case Acorn.OpKind.UNLOAD_LOCAL: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    locals[name] = objectStack.pop();
                    break
                }
                case Acorn.OpKind.APPLY: {
                    const fn = objectStack.pop();
                    const n = op.bNumArgs;
                    const start = objectStack.length - n;
                    const numCurriedArgs = fn.curriedArgs === undefined ? 0 : fn.curriedArgs.length;
                    if ((numCurriedArgs > 0) && (fn.numArgs - numCurriedArgs === n)) {
                        objectStack.splice(start, 0, ...fn.curriedArgs);
                        this._executeFn(fn, objectStack, patternStack, fn.locals || locals);
                    } else if (fn.numArgs === n) {
                        this._executeFn(fn, objectStack, patternStack, fn.locals || locals);
                    } else {
                        const args = objectStack.slice(start);
                        objectStack.splice(start);
                        let curried = Object.freeze(
                            Object.create(fn, {
                                kind: OakRuntime.INSTANCE_KIND_FUNC,
                                curriedArgs: numCurriedArgs === 0 ? args : numCurriedArgs.concat(args),
                                locals: locals,
                                index: ++this._closureIndex,
                            }));
                        objectStack.push(curried);
                    }
                    break
                }
                case Acorn.OpKind.CALL: {
                    const name = this._acorn.strings[op.aStringHash].value;
                    const n = objectStack.length;
                    const start = n - op.bNumArgs;
                    let args = objectStack.slice(start);
                    objectStack.splice(start);
                    const fn = this._externals[name];
                    if (fn === undefined) {
                        console.error(`[oak] External function '${name}' is not registered`);
                    }
                    let result = fn.apply(this.externalSelfContext, args);
                    objectStack.push(result);
                    break
                }
                case Acorn.OpKind.MATCH: {
                    if (!this._match(patternStack.pop(), objectStack.pop(), locals)) {
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
                                objectStack.push(OakRuntime._listItem())
                            } else {
                                const n = objectStack.length;
                                const start = n - op.aNumItems;
                                let list = undefined;
                                for (let i = n - 1; i >= start; i--) {
                                    list = OakRuntime._listItem(objectStack[i], list);
                                }
                                objectStack.splice(start);
                                objectStack.push(list);
                            }
                            break
                        }
                        case Acorn.ObjectKind.TUPLE: {
                            const start = objectStack.length - op.aNumItems;
                            const items = objectStack.slice(start);
                            objectStack.splice(start);
                            items.reverse();
                            const tuple = OakRuntime.tuple(items);
                            objectStack.push(tuple);
                            break
                        }
                        case Acorn.ObjectKind.RECORD: {
                            const n = op.aNumItems;
                            let rec = undefined;
                            for (let i = 0; i < n; i++) {
                                const objName = stack.pop();
                                const name = OakRuntime.unwrap(objName);
                                const value = stack.pop();
                                rec = OakRuntime._recordFiled(name, value, rec);
                            }
                            objectStack.push(rec);
                            break
                        }
                        case Acorn.ObjectKind.DATA: {
                            const objName = stack.pop();
                            const name = OakRuntime.unwrap(objName);
                            const start = objectStack.length - op.aNumItems;
                            const items = objectStack.slice(start);
                            objectStack.splice(start);
                            items.reverse();
                            const option = OakRuntime.option(name, items);
                            objectStack.push(option);
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
                            items = [patternStack.pop()];
                            break;
                        }
                        case Acorn.PatternKind.ANY: {
                            break;
                        }
                        case Acorn.PatternKind.CONS: {
                            items = [patternStack.pop(), patternStack.pop()];
                            break;
                        }
                        case Acorn.PatternKind.CONST: {
                            items = [patternStack.pop()];
                            break;
                        }
                        case Acorn.PatternKind.DATA_OPTION: {
                            name = this._acorn.strings[op.aStringHash].value;
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            items = patternStack.slice(start);
                            patternStack.splice(start);
                            break;
                        }
                        case Acorn.PatternKind.LIST: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            items = patternStack.slice(start);
                            patternStack.splice(start);
                            break;
                        }
                        case Acorn.PatternKind.NAMED: {
                            name = this._acorn.strings[op.aStringHash].value;
                            break;
                        }
                        case Acorn.PatternKind.RECORD: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            items = patternStack.slice(start).map(OakRuntime.unwrap);
                            patternStack.splice(start);
                            break;
                        }
                        case Acorn.PatternKind.TUPLE: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
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
                    const rec = objectStack.pop();
                    const name = this._acorn.strings[op.aStringHash].value;
                    const field = OakRuntime._getField(rec, name);
                    objectStack.push(field);
                    break
                }
                case Acorn.OpKind.UPDATE: {
                    const value = objectStack.pop();
                    const rec = objectStack.pop();
                    const name = this._acorn.strings[op.aStringHash].value;
                    const updated = OakRuntime._recordFiled(name, value, rec);
                    objectStack.push(updated);
                    break
                }
                case Acorn.OpKind.DUPLICATE: {
                    objectStack.push(objectStack[objectStack.length - 1]);
                    break
                }
            }
            index++
        }
    }

    _match(pattern, obj, locals) {
        switch (pattern.kind) {
            case Acorn.PatternKind.ALIAS: {
                locals[pattern.name] = obj;
                return this._match(pattern.items[0], obj, locals);
            }
            case Acorn.PatternKind.ANY: {
                return true;
            }
            case Acorn.PatternKind.CONS: {
                let matched = obj.kind = OakRuntime.INSTANCE_KIND_LIST && obj.value !== undefined;
                matched &= this._match(pattern.items[0], obj.value, locals);
                matched &= this._match(pattern.items[1], (obj.next === undefined ? OakRuntime._listItem() : obj.next), locals);
                return matched;
            }
            case Acorn.PatternKind.CONST: {
                return OakRuntime._constEqual(obj, pattern.items[0]);
            }
            case Acorn.PatternKind.DATA_OPTION: {
                let matched = obj.kind === OakRuntime.INSTANCE_KIND_OPTION && obj.name === pattern.name;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= this._match(pattern.items[i], obj.values[i], locals);
                }
                return matched;
            }
            case Acorn.PatternKind.LIST: {
                let matched = obj.kind === OakRuntime.INSTANCE_KIND_LIST;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= obj !== undefined &&
                        obj.value !== undefined &&
                        this._match(pattern.items[i], obj.value, locals);
                    obj = obj.next;
                }
                return matched;
            }
            case Acorn.PatternKind.NAMED: {
                locals[pattern.name] = obj;
                return true;
            }
            case Acorn.PatternKind.RECORD: {
                let matched = obj.kind === OakRuntime.INSTANCE_KIND_RECORD;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    const name = pattern.items[i];
                    const field = OakRuntime._getField(obj,);
                    matched &= field !== undefined;
                    locals[name] = field;
                }
                return matched;
            }
            case Acorn.PatternKind.TUPLE: {
                let matched = obj.kind === OakRuntime.INSTANCE_KIND_TUPLE;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= this._match(pattern.items[i], obj.values[i], locals);
                }
                return matched;
            }
        }
    }

    static _recordFiled(key, value, parent) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_RECORD, key, value, parent})
    }

    static _listItem(value, next) {
        return Object.freeze({kind: OakRuntime.INSTANCE_KIND_LIST, value, next})
    }

    static _getField(rec, fieldName) {
        if (rec === undefined) {
            return undefined;
        }
        if (fieldName === rec.fieldName) {
            return rec.value;
        }
        return OakRuntime._getField(rec.parent, fieldName);
    }

    static _constEqual(a, b) {
        return a.kind === b.kind && a.value === b.value;
    }
}
