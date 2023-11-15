// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['kaitai-struct/KaitaiStream'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('kaitai-struct/KaitaiStream'));
    } else {
        root.Acorn = factory(root.KaitaiStream);
    }
}(typeof self !== 'undefined' ? self : this, function (KaitaiStream) {
    var Acorn = (function() {
        Acorn.ObjectKind = Object.freeze({
            LIST: 1,
            TUPLE: 2,
            RECORD: 3,
            DATA: 4,

            1: "LIST",
            2: "TUPLE",
            3: "RECORD",
            4: "DATA",
        });

        Acorn.PatternKind = Object.freeze({
            ALIAS: 1,
            ANY: 2,
            CONS: 3,
            CONST: 4,
            DATA_OPTION: 5,
            LIST: 6,
            NAMED: 7,
            RECORD: 8,
            TUPLE: 9,

            1: "ALIAS",
            2: "ANY",
            3: "CONS",
            4: "CONST",
            5: "DATA_OPTION",
            6: "LIST",
            7: "NAMED",
            8: "RECORD",
            9: "TUPLE",
        });

        Acorn.PackedConstKind = Object.freeze({
            INT: 1,
            FLOAT: 2,

            1: "INT",
            2: "FLOAT",
        });

        Acorn.OpKind = Object.freeze({
            LOAD_LOCAL: 1,
            LOAD_GLOBAL: 2,
            LOAD_CONST: 3,
            UNLOAD_LOCAL: 4,
            APPLY: 5,
            CALL: 6,
            MATCH: 7,
            JUMP: 8,
            MAKE_OBJECT: 9,
            MAKE_PATTERN: 10,
            ACCESS: 11,
            UPDATE: 12,
            DUPLICATE: 13,

            1: "LOAD_LOCAL",
            2: "LOAD_GLOBAL",
            3: "LOAD_CONST",
            4: "UNLOAD_LOCAL",
            5: "APPLY",
            6: "CALL",
            7: "MATCH",
            8: "JUMP",
            9: "MAKE_OBJECT",
            10: "MAKE_PATTERN",
            11: "ACCESS",
            12: "UPDATE",
            13: "DUPLICATE",
        });

        Acorn.ConstKind = Object.freeze({
            UNIT: 1,
            CHAR: 2,
            INT: 3,
            FLOAT: 4,
            STRING: 5,

            1: "UNIT",
            2: "CHAR",
            3: "INT",
            4: "FLOAT",
            5: "STRING",
        });

        Acorn.StackKind = Object.freeze({
            OBJECT: 1,
            PATTERN: 2,

            1: "OBJECT",
            2: "PATTERN",
        });

        function Acorn(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;
            this._debug = {};

        }
        Acorn.prototype._read = function() {
            this._debug.formatVersion = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.formatVersion = this._io.readBytes(4);
            this._debug.formatVersion.end = this._io.pos;
            if (!((KaitaiStream.byteArrayCompare(this.formatVersion, [1, 0, 0, 0]) == 0))) {
                throw new KaitaiStream.ValidationNotEqualError([1, 0, 0, 0], this.formatVersion, this._io, "/seq/0");
            }
            this._debug.compilerVersion = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.compilerVersion = this._io.readU4le();
            this._debug.compilerVersion.end = this._io.pos;
            this._debug.debug = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.debug = this._io.readU1();
            this._debug.debug.end = this._io.pos;
            this._debug.numFuncs = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.numFuncs = this._io.readU4le();
            this._debug.numFuncs.end = this._io.pos;
            this._debug.funcs = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.funcs = [];
            this._debug.funcs.arr = [];
            for (var i = 0; i < this.numFuncs; i++) {
                this._debug.funcs.arr[i] = { start: this._io.pos, ioOffset: this._io.byteOffset };
                var _t_funcs = new Func(this._io, this, this._root);
                _t_funcs._read();
                this.funcs.push(_t_funcs);
                this._debug.funcs.arr[i].end = this._io.pos;
            }
            this._debug.funcs.end = this._io.pos;
            this._debug.numStrings = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.numStrings = this._io.readU4le();
            this._debug.numStrings.end = this._io.pos;
            this._debug.strings = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.strings = [];
            this._debug.strings.arr = [];
            for (var i = 0; i < this.numStrings; i++) {
                this._debug.strings.arr[i] = { start: this._io.pos, ioOffset: this._io.byteOffset };
                var _t_strings = new Strl(this._io, this, this._root);
                _t_strings._read();
                this.strings.push(_t_strings);
                this._debug.strings.arr[i].end = this._io.pos;
            }
            this._debug.strings.end = this._io.pos;
            this._debug.numConsts = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.numConsts = this._io.readU4le();
            this._debug.numConsts.end = this._io.pos;
            this._debug.consts = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.consts = [];
            this._debug.consts.arr = [];
            for (var i = 0; i < this.numConsts; i++) {
                this._debug.consts.arr[i] = { start: this._io.pos, ioOffset: this._io.byteOffset };
                var _t_consts = new Const(this._io, this, this._root);
                _t_consts._read();
                this.consts.push(_t_consts);
                this._debug.consts.arr[i].end = this._io.pos;
            }
            this._debug.consts.end = this._io.pos;
            this._debug.numExports = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.numExports = this._io.readU4le();
            this._debug.numExports.end = this._io.pos;
            this._debug.exports = { start: this._io.pos, ioOffset: this._io.byteOffset };
            this.exports = [];
            this._debug.exports.arr = [];
            for (var i = 0; i < this.numExports; i++) {
                this._debug.exports.arr[i] = { start: this._io.pos, ioOffset: this._io.byteOffset };
                var _t_exports = new Export(this._io, this, this._root);
                _t_exports._read();
                this.exports.push(_t_exports);
                this._debug.exports.arr[i].end = this._io.pos;
            }
            this._debug.exports.end = this._io.pos;
        }

        var Export = Acorn.Export = (function() {
            function Export(_io, _parent, _root) {
                this._io = _io;
                this._parent = _parent;
                this._root = _root || this;
                this._debug = {};

            }
            Export.prototype._read = function() {
                this._debug.name = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.name = new Strl(this._io, this, this._root);
                this.name._read();
                this._debug.name.end = this._io.pos;
                this._debug.address = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.address = this._io.readU4le();
                this._debug.address.end = this._io.pos;
            }

            return Export;
        })();

        var Const = Acorn.Const = (function() {
            function Const(_io, _parent, _root) {
                this._io = _io;
                this._parent = _parent;
                this._root = _root || this;
                this._debug = {};

            }
            Const.prototype._read = function() {
                this._debug.kind = { start: this._io.pos, ioOffset: this._io.byteOffset, enumName: "Acorn.PackedConstKind" };
                this.kind = this._io.readU1();
                this._debug.kind.end = this._io.pos;
                if (this.kind == Acorn.PackedConstKind.INT) {
                    this._debug.intValue = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.intValue = this._io.readS8le();
                    this._debug.intValue.end = this._io.pos;
                }
                if (this.kind == Acorn.PackedConstKind.FLOAT) {
                    this._debug.floatValue = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.floatValue = this._io.readF8le();
                    this._debug.floatValue.end = this._io.pos;
                }
            }

            return Const;
        })();

        var Strl = Acorn.Strl = (function() {
            function Strl(_io, _parent, _root) {
                this._io = _io;
                this._parent = _parent;
                this._root = _root || this;
                this._debug = {};

            }
            Strl.prototype._read = function() {
                this._debug.len = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.len = this._io.readU4le();
                this._debug.len.end = this._io.pos;
                this._debug.value = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.value = KaitaiStream.bytesToStr(this._io.readBytes(this.len), "UTF-8");
                this._debug.value.end = this._io.pos;
            }

            return Strl;
        })();

        var Func = Acorn.Func = (function() {
            function Func(_io, _parent, _root) {
                this._io = _io;
                this._parent = _parent;
                this._root = _root || this;
                this._debug = {};

            }
            Func.prototype._read = function() {
                this._debug.numArgs = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.numArgs = this._io.readU4le();
                this._debug.numArgs.end = this._io.pos;
                this._debug.numOps = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.numOps = this._io.readU4le();
                this._debug.numOps.end = this._io.pos;
                this._debug.ops = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.ops = [];
                this._debug.ops.arr = [];
                for (var i = 0; i < this.numOps; i++) {
                    this._debug.ops.arr[i] = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    var _t_ops = new Op(this._io, this, this._root);
                    _t_ops._read();
                    this.ops.push(_t_ops);
                    this._debug.ops.arr[i].end = this._io.pos;
                }
                this._debug.ops.end = this._io.pos;
                if (this._root.debug != 0) {
                    this._debug.filePath = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.filePath = new Strl(this._io, this, this._root);
                    this.filePath._read();
                    this._debug.filePath.end = this._io.pos;
                }
                if (this._root.debug != 0) {
                    this._debug.locations = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.locations = [];
                    this._debug.locations.arr = [];
                    for (var i = 0; i < this.numOps; i++) {
                        this._debug.locations.arr[i] = { start: this._io.pos, ioOffset: this._io.byteOffset };
                        var _t_locations = new Loc(this._io, this, this._root);
                        _t_locations._read();
                        this.locations.push(_t_locations);
                        this._debug.locations.arr[i].end = this._io.pos;
                    }
                    this._debug.locations.end = this._io.pos;
                }
            }

            return Func;
        })();

        var Loc = Acorn.Loc = (function() {
            function Loc(_io, _parent, _root) {
                this._io = _io;
                this._parent = _parent;
                this._root = _root || this;
                this._debug = {};

            }
            Loc.prototype._read = function() {
                this._debug.line = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.line = this._io.readU4le();
                this._debug.line.end = this._io.pos;
                this._debug.col = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this.col = this._io.readU4le();
                this._debug.col.end = this._io.pos;
            }

            return Loc;
        })();

        var Op = Acorn.Op = (function() {
            function Op(_io, _parent, _root) {
                this._io = _io;
                this._parent = _parent;
                this._root = _root || this;
                this._debug = {};

            }
            Op.prototype._read = function() {
                this._debug.kind = { start: this._io.pos, ioOffset: this._io.byteOffset, enumName: "Acorn.OpKind" };
                this.kind = this._io.readU1();
                this._debug.kind.end = this._io.pos;
                if (this.kind == Acorn.OpKind.LOAD_CONST) {
                    this._debug.bStackKind = { start: this._io.pos, ioOffset: this._io.byteOffset, enumName: "Acorn.StackKind" };
                    this.bStackKind = this._io.readU1();
                    this._debug.bStackKind.end = this._io.pos;
                }
                if ( ((this.kind == Acorn.OpKind.APPLY) || (this.kind == Acorn.OpKind.CALL)) ) {
                    this._debug.bNumArgs = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.bNumArgs = this._io.readU1();
                    this._debug.bNumArgs.end = this._io.pos;
                }
                if (this.kind == Acorn.OpKind.MAKE_OBJECT) {
                    this._debug.bObjectKind = { start: this._io.pos, ioOffset: this._io.byteOffset, enumName: "Acorn.ObjectKind" };
                    this.bObjectKind = this._io.readU1();
                    this._debug.bObjectKind.end = this._io.pos;
                }
                if (this.kind == Acorn.OpKind.MAKE_PATTERN) {
                    this._debug.bPatternKind = { start: this._io.pos, ioOffset: this._io.byteOffset, enumName: "Acorn.PatternKind" };
                    this.bPatternKind = this._io.readU1();
                    this._debug.bPatternKind.end = this._io.pos;
                }
                if ( ((this.kind != Acorn.OpKind.LOAD_CONST) && (this.kind != Acorn.OpKind.APPLY) && (this.kind != Acorn.OpKind.CALL) && (this.kind != Acorn.OpKind.MAKE_OBJECT) && (this.kind != Acorn.OpKind.MAKE_PATTERN)) ) {
                    this._debug._unnamed5 = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this._unnamed5 = this._io.readBytes(1);
                    this._debug._unnamed5.end = this._io.pos;
                    if (!((KaitaiStream.byteArrayCompare(this._unnamed5, [0]) == 0))) {
                        throw new KaitaiStream.ValidationNotEqualError([0], this._unnamed5, this._io, "/types/op/seq/5");
                    }
                }
                if (this.kind == Acorn.OpKind.LOAD_CONST) {
                    this._debug.cConstKind = { start: this._io.pos, ioOffset: this._io.byteOffset, enumName: "Acorn.ConstKind" };
                    this.cConstKind = this._io.readU1();
                    this._debug.cConstKind.end = this._io.pos;
                }
                if (this.kind == Acorn.OpKind.MAKE_PATTERN) {
                    this._debug.cNumNested = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.cNumNested = this._io.readU1();
                    this._debug.cNumNested.end = this._io.pos;
                }
                if ( ((this.kind != Acorn.OpKind.LOAD_CONST) && (this.kind != Acorn.OpKind.MAKE_PATTERN)) ) {
                    this._debug._unnamed8 = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this._unnamed8 = this._io.readBytes(1);
                    this._debug._unnamed8.end = this._io.pos;
                    if (!((KaitaiStream.byteArrayCompare(this._unnamed8, [0]) == 0))) {
                        throw new KaitaiStream.ValidationNotEqualError([0], this._unnamed8, this._io, "/types/op/seq/8");
                    }
                }
                this._debug._unnamed9 = { start: this._io.pos, ioOffset: this._io.byteOffset };
                this._unnamed9 = this._io.readBytes(1);
                this._debug._unnamed9.end = this._io.pos;
                if (!((KaitaiStream.byteArrayCompare(this._unnamed9, [0]) == 0))) {
                    throw new KaitaiStream.ValidationNotEqualError([0], this._unnamed9, this._io, "/types/op/seq/9");
                }
                if ( ((this.kind == Acorn.OpKind.LOAD_LOCAL) || (this.kind == Acorn.OpKind.UNLOAD_LOCAL) || (this.kind == Acorn.OpKind.CALL) || (this.kind == Acorn.OpKind.MAKE_PATTERN) || (this.kind == Acorn.OpKind.ACCESS) || (this.kind == Acorn.OpKind.UPDATE)) ) {
                    this._debug.aStringHash = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.aStringHash = this._io.readU4le();
                    this._debug.aStringHash.end = this._io.pos;
                }
                if (this.kind == Acorn.OpKind.LOAD_GLOBAL) {
                    this._debug.aPointer = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.aPointer = this._io.readU4le();
                    this._debug.aPointer.end = this._io.pos;
                }
                if ( ((this.kind == Acorn.OpKind.JUMP) || (this.kind == Acorn.OpKind.MATCH)) ) {
                    this._debug.aJumpDelta = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.aJumpDelta = this._io.readU4le();
                    this._debug.aJumpDelta.end = this._io.pos;
                }
                if (this.kind == Acorn.OpKind.MAKE_OBJECT) {
                    this._debug.aNumItems = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.aNumItems = this._io.readU4le();
                    this._debug.aNumItems.end = this._io.pos;
                }
                if (this.kind == Acorn.OpKind.LOAD_CONST) {
                    this._debug.aConstPointerValueHash = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this.aConstPointerValueHash = this._io.readU4le();
                    this._debug.aConstPointerValueHash.end = this._io.pos;
                }
                if ( ((this.kind == Acorn.OpKind.APPLY) || (this.kind == Acorn.OpKind.DUPLICATE)) ) {
                    this._debug._unnamed15 = { start: this._io.pos, ioOffset: this._io.byteOffset };
                    this._unnamed15 = this._io.readBytes(4);
                    this._debug._unnamed15.end = this._io.pos;
                    if (!((KaitaiStream.byteArrayCompare(this._unnamed15, [0, 0, 0, 0]) == 0))) {
                        throw new KaitaiStream.ValidationNotEqualError([0, 0, 0, 0], this._unnamed15, this._io, "/types/op/seq/15");
                    }
                }
            }

            return Op;
        })();

        return Acorn;
    })();
    return Acorn;
}));
