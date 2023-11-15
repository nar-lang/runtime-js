import Acorn from "./acorn_debug";
import KaitaiStream from "kaitai-struct/KaitaiStream";

class OakRuntime {
    /**
     * @param {{[String]: function}} externals Map of external defined functions
     * @param {ArrayBuffer} arrayBuffer ArrayBuffer to read acorn from.
     * @param {?Number} arrayBufferOffset Offset from arrayBuffer beginning.
     */
    constructor(externals, arrayBuffer, arrayBufferOffset = 0) {
        this._acorn = new Acorn(new KaitaiStream(arrayBuffer, arrayBufferOffset));
        this._externals = Object.assign({}, externals);
        this._cachedExpressions = {};
    }

    externalSelfContext = {}

    INSTANCE_KIND_UNIT = 1
    INSTANCE_KIND_CHAR = 2
    INSTANCE_KIND_INT = 3
    INSTANCE_KIND_FLOAT = 4
    INSTANCE_KIND_STRING = 5
    INSTANCE_KIND_RECORD = 6
    INSTANCE_KIND_TUPLE = 7
    INSTANCE_KIND_LIST = 8
    INSTANCE_KIND_OPTION = 9
    INSTANCE_KIND_FUNC = 10

    /**
     * @param {Number|BigInt|String|Array|{}|null} value
     * @returns {Readonly<{}>}
     */
    wrap(value) {
        if (value === null) {
            return this.unit()
        }
        if (Array.isArray(value)) {
            return this.list(value);
        }
        let t = typeof value;
        if (t === "number") {
            return this.float(value);
        }
        if (t === "bigint") {
            return this.int(value);
        }
        if (t === "object") {
            return this.record(t);
        }
        if (t === "boolean") {
            //todo:
        }
        throw "given object cannot be wrapped and used in oak code";
    }

    /**
     * @param {Readonly<{}>} x
     * @return {Number|String|Array|{}|null}
     */
    unwrap(x) {
        switch (x.kind) {
            case this.INSTANCE_KIND_LIST: {
                let head = x.value;
                let list = [];
                while (head !== undefined && head.value !== undefined) {
                    list.push(head.value);
                    head = head.next;
                }

                return list;
            }
            case this.INSTANCE_KIND_RECORD: {
                let field = x.value;
                let rec = {};
                while (field !== undefined && field.name !== undefined) {
                    if (rec[field.key] === undefined) {
                        rec[field.key] = field.value;
                    }
                }
                return rec;
            }
            default: {
                return x.value;
            }
        }
    }

    /**
     * @returns {Readonly<{}>}
     */
    unit() {
        return Object.freeze({kind: this.INSTANCE_KIND_UNIT, value: null});
    }

    /**
     * @param {Number} value
     * @returns {Readonly<{}>}
     */
    char(value) {
        return Object.freeze({kind: this.INSTANCE_KIND_CHAR, value});
    }

    /**
     * @param {BigInt} value
     * @returns {Readonly<{}>}
     */
    int(value) {
        return Object.freeze({kind: this.INSTANCE_KIND_INT, value});
    }

    /**
     * @param {Number} value
     * @returns {Readonly<{}>}
     */
    float(value) {
        return Object.freeze({kind: this.INSTANCE_KIND_FLOAT, value});
    }

    /**
     * @param {String} value
     * @returns {Readonly<{}>}
     */
    string(value) {
        return Object.freeze({kind: this.INSTANCE_KIND_STRING, value});
    }

    /**
     * @param {Object} value
     * @returns {Readonly<{}>}
     */
    record(value) {
        let rec = undefined;
        for (const n in value) {
            rec = this._recordFiled(n, value[n], rec);
        }
        if (rec === undefined) {
            rec = this._recordFiled();
        }
        return rec;
    }

    /**
     * @param {Array<Readonly<{}>>} value
     */
    list(value) {
        let list = undefined;
        for (let i = value.length - 1; i >= 0; i--) {
            list = this._listItem(value[i], list);
        }
        if (list === undefined) {
            list = this._listItem();
        }
        return list;
    }

    /**
     * @param {Array<Readonly<{}>>} value
     */
    tuple(value) {
        return Object.freeze({kind: this.INSTANCE_KIND_TUPLE, value: Object.freeze(value)});
    }

    /**
     * @param {String} name
     * @param {Array<Readonly<{}>>} values
     */
    option(name, values) {
        return Object.freeze({kind: this.INSTANCE_KIND_OPTION, name, values: Object.freeze(values)});
    }

    /**
     * Returns qualifier definition identifier to use in execute method
     * @param {String} module Full module name, like `Oak.Core.Basics`
     * @param {String} definition Definition name, like `identity`
     * @returns {String}
     */
    makeName(module, definition) {
        return `${module}:${definition}`;
    }

    execute(qualifiedIdentifier, ...args) {
        const fnIndex = this._acorn.exports[name];
        if (fnIndex === undefined) {
            console.error(`[oak] Definition '${name}' is not exported by loaded binary`)
        }

        const objectStack = args.slice();
        this._executeFn(this._acorn.funcs[fnIndex], objectStack, [], {});
        return objectStack.pop();
    }

    _executeFn(fn, objectStack, patternStack, parentLocals) {
        let locals = Object.create({}, parentLocals);
        let index = 0;
        while (index < fn.ops.length) {
            const op = fn.ops[index];
            switch (op.kind) {
                case Acorn.OpKind.LOAD_LOCAL: {
                    const name = this._acorn.strings[op.aStringHash];
                    const local = locals[name];
                    objectStack.push(local);
                    break
                }
                case Acorn.OpKind.LOAD_GLOBAL: {
                    const name = this._acorn.strings[op.aStringHash];
                    const fn = this._acorn.funcs[name];
                    if (fn.numArgs === 0) {
                        const c = this._cachedExpressions[name];
                        if (c === undefined) {
                            this._executeFn(fn, objectStack, patternStack, undefined);
                            this._cachedExpressions[name] = objectStack[objectStack.length - 1];
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
                            const c = this._acorn.strings[op.aConstPointerValueHash];
                            stack.push(this.string(c));
                            break
                        }
                    }
                    break
                }
                case Acorn.OpKind.UNLOAD_LOCAL: {
                    const name = this._acorn.strings[op.aStringHash];
                    locals[name] = objectStack.pop();
                    break
                }
                case Acorn.OpKind.APPLY: {
                    const fn = objectStack.pop();
                    const n = op.bNumArgs;
                    const start = objectStack.length - n;
                    const args = objectStack.slice(start);
                    objectStack.splice(start);

                    const numCurriedArgs = fn.curriedArgs === undefined ? 0 : fn.curriedArgs.length;
                    if (fn.numArgs - numCurriedArgs === n) {
                        objectStack.push(...fn.curriedArgs);
                        objectStack.push(...args);
                        this._executeFn(fn, objectStack, patternStack, fn.locals || locals);
                    } else { //currying
                        let curried = Object.freeze(
                            Object.create({
                                curriedArgs: numCurriedArgs === 0 ? args : numCurriedArgs.concat(args),
                                locals: locals,
                            }, fn));
                        objectStack.push(curried);
                    }
                    break
                }
                case Acorn.OpKind.CALL: {
                    const name = this._acorn.strings[op.aStringHash];
                    const n = objectStack.length;
                    const start = n - op.aNumItems;
                    let args = [];
                    for (let i = n - 1; i >= start; i--) {
                        let arg = objectStack[i];
                        args.push(arg);
                    }
                    objectStack.splice(start);
                    const fn = this._externals[name];
                    let result = fn.apply(this.externalSelfContext, args);
                    objectStack.push(result);
                    break
                }
                case Acorn.OpKind.MATCH: {
                    if (!this._match(patternStack, objectStack, locals)) {
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
                                objectStack.push(this._listItem())
                            } else {
                                const n = objectStack.length;
                                const start = n - op.aNumItems;
                                let list = undefined;
                                for (let i = n - 1; i >= start; i--) {
                                    list = this._listItem(objectStack[i], list);
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
                            const tuple = this.tuple(items);
                            objectStack.push(tuple);
                            break
                        }
                        case Acorn.ObjectKind.RECORD: {
                            const n = op.aNumItems;
                            let rec = undefined;
                            for (let i = 0; i < n; i++) {
                                const objName = stack.pop();
                                const name = this.unwrap(objName);
                                const value = stack.pop();
                                rec = this._recordFiled(name, value, rec);
                            }
                            objectStack.push(rec);
                            break
                        }
                        case Acorn.ObjectKind.DATA: {
                            const objName = stack.pop();
                            const name = this.unwrap(objName);
                            const start = objectStack.length - op.aNumItems;
                            const items = objectStack.slice(start);
                            objectStack.splice(start);
                            items.reverse();
                            const option = this.option(name, items);
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
                            name = this._acorn.strigns[op.aStringHash];
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
                            name = this._acorn.strigns[op.aStringHash];
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
                            name = this._acorn.strigns[op.aStringHash];
                            break;
                        }
                        case Acorn.PatternKind.RECORD: {
                            const n = op.cNumNested;
                            const start = patternStack.length - n;
                            items = patternStack.slice(start).map(this.unwrap);
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
                    const name = this._acorn.strings[op.aStringHash];
                    const field = this._getField(rec, name);
                    objectStack.push(field);
                    break
                }
                case Acorn.OpKind.UPDATE: {
                    const value = objectStack.pop();
                    const rec = objectStack.pop();
                    const name = this._acorn.strings[op.aStringHash];
                    const updated = this._recordFiled(name, value, rec);
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
                let matched = obj.kind = this.INSTANCE_KIND_LIST && obj.value !== undefined;
                matched &= this._match(pattern.items[0], obj.value, locals);
                matched &= this._match(pattern.items[1], (obj.next === undefined ? this._listItem() : obj.next), locals);
                return matched;
            }
            case Acorn.PatternKind.CONST: {
                return this._constEqual(obj, pattern.items[0]);
            }
            case Acorn.PatternKind.DATA_OPTION: {
                let matched = obj.kind === this.INSTANCE_KIND_OPTION && obj.name === pattern.name;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= this._match(pattern.items[i], obj.values[i], locals);
                }
                return matched;
            }
            case Acorn.PatternKind.LIST: {
                let matched = obj.kind === this.INSTANCE_KIND_LIST;
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
                let matched = obj.kind === this.INSTANCE_KIND_RECORD;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    const name = pattern.items[i];
                    const field = this._getField(obj,);
                    matched &= field !== undefined;
                    locals[name] = field;
                }
                return matched;
            }
            case Acorn.PatternKind.TUPLE: {
                let matched = obj.kind === this.INSTANCE_KIND_TUPLE;
                for (let i = 0; i < pattern.items.length && matched; i++) {
                    matched &= this._match(pattern.items[i], obj.values[i], locals);
                }
                return matched;
            }
        }
    }

    _recordFiled(key, value, parent) {
        return Object.freeze({kind: this.INSTANCE_KIND_RECORD, key, value, parent})
    }

    _listItem(value, next) {
        return Object.freeze({kind: this.INSTANCE_KIND_LIST, value, next})
    }

    _getField(rec, fieldName) {
        if (rec === undefined) {
            return undefined;
        }
        if (fieldName === rec.fieldName) {
            return rec.value;
        }
        return this._getField(rec.parent, fieldName);
    }

    _constEqual(a, b) {
        return a.kind === b.kind && a.value === b.value;
    }
}
