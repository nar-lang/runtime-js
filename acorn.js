// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

import KaitaiStream from "./KaitaiStream.js";

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

        this._read();
    }
    Acorn.prototype._read = function() {
        this.formatVersion = this._io.readBytes(4);
        if (!((KaitaiStream.byteArrayCompare(this.formatVersion, [1, 0, 0, 0]) == 0))) {
            throw new KaitaiStream.ValidationNotEqualError([1, 0, 0, 0], this.formatVersion, this._io, "/seq/0");
        }
        this.compilerVersion = this._io.readU4le();
        this.debug = this._io.readU1();
        this.numFuncs = this._io.readU4le();
        this.funcs = [];
        for (var i = 0; i < this.numFuncs; i++) {
            this.funcs.push(new Func(this._io, this, this._root));
        }
        this.numStrings = this._io.readU4le();
        this.strings = [];
        for (var i = 0; i < this.numStrings; i++) {
            this.strings.push(new Strl(this._io, this, this._root));
        }
        this.numConsts = this._io.readU4le();
        this.consts = [];
        for (var i = 0; i < this.numConsts; i++) {
            this.consts.push(new Const(this._io, this, this._root));
        }
        this.numExports = this._io.readU4le();
        this.exports = [];
        for (var i = 0; i < this.numExports; i++) {
            this.exports.push(new Export(this._io, this, this._root));
        }
    }

    var Export = Acorn.Export = (function() {
        function Export(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;

            this._read();
        }
        Export.prototype._read = function() {
            this.name = new Strl(this._io, this, this._root);
            this.address = this._io.readU4le();
        }

        return Export;
    })();

    var Const = Acorn.Const = (function() {
        function Const(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;

            this._read();
        }
        Const.prototype._read = function() {
            this.kind = this._io.readU1();
            if (this.kind == Acorn.PackedConstKind.INT) {
                this.intValue = this._io.readS8le();
            }
            if (this.kind == Acorn.PackedConstKind.FLOAT) {
                this.floatValue = this._io.readF8le();
            }
        }

        return Const;
    })();

    var Strl = Acorn.Strl = (function() {
        function Strl(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;

            this._read();
        }
        Strl.prototype._read = function() {
            this.len = this._io.readU4le();
            this.value = KaitaiStream.bytesToStr(this._io.readBytes(this.len), "UTF-8");
        }

        return Strl;
    })();

    var Func = Acorn.Func = (function() {
        function Func(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;

            this._read();
        }
        Func.prototype._read = function() {
            this.numArgs = this._io.readU4le();
            this.numOps = this._io.readU4le();
            this.ops = [];
            for (var i = 0; i < this.numOps; i++) {
                this.ops.push(new Op(this._io, this, this._root));
            }
            if (this._root.debug != 0) {
                this.filePath = new Strl(this._io, this, this._root);
            }
            if (this._root.debug != 0) {
                this.locations = [];
                for (var i = 0; i < this.numOps; i++) {
                    this.locations.push(new Loc(this._io, this, this._root));
                }
            }
        }

        return Func;
    })();

    var Loc = Acorn.Loc = (function() {
        function Loc(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;

            this._read();
        }
        Loc.prototype._read = function() {
            this.line = this._io.readU4le();
            this.col = this._io.readU4le();
        }

        return Loc;
    })();

    var Op = Acorn.Op = (function() {
        function Op(_io, _parent, _root) {
            this._io = _io;
            this._parent = _parent;
            this._root = _root || this;

            this._read();
        }
        Op.prototype._read = function() {
            this.kind = this._io.readU1();
            if (this.kind == Acorn.OpKind.LOAD_CONST) {
                this.bStackKind = this._io.readU1();
            }
            if ( ((this.kind == Acorn.OpKind.APPLY) || (this.kind == Acorn.OpKind.CALL)) ) {
                this.bNumArgs = this._io.readU1();
            }
            if (this.kind == Acorn.OpKind.MAKE_OBJECT) {
                this.bObjectKind = this._io.readU1();
            }
            if (this.kind == Acorn.OpKind.MAKE_PATTERN) {
                this.bPatternKind = this._io.readU1();
            }
            if ( ((this.kind != Acorn.OpKind.LOAD_CONST) && (this.kind != Acorn.OpKind.APPLY) && (this.kind != Acorn.OpKind.CALL) && (this.kind != Acorn.OpKind.MAKE_OBJECT) && (this.kind != Acorn.OpKind.MAKE_PATTERN)) ) {
                this._unnamed5 = this._io.readBytes(1);
                if (!((KaitaiStream.byteArrayCompare(this._unnamed5, [0]) == 0))) {
                    throw new KaitaiStream.ValidationNotEqualError([0], this._unnamed5, this._io, "/types/op/seq/5");
                }
            }
            if (this.kind == Acorn.OpKind.LOAD_CONST) {
                this.cConstKind = this._io.readU1();
            }
            if (this.kind == Acorn.OpKind.MAKE_PATTERN) {
                this.cNumNested = this._io.readU1();
            }
            if ( ((this.kind != Acorn.OpKind.LOAD_CONST) && (this.kind != Acorn.OpKind.MAKE_PATTERN)) ) {
                this._unnamed8 = this._io.readBytes(1);
                if (!((KaitaiStream.byteArrayCompare(this._unnamed8, [0]) == 0))) {
                    throw new KaitaiStream.ValidationNotEqualError([0], this._unnamed8, this._io, "/types/op/seq/8");
                }
            }
            this._unnamed9 = this._io.readBytes(1);
            if (!((KaitaiStream.byteArrayCompare(this._unnamed9, [0]) == 0))) {
                throw new KaitaiStream.ValidationNotEqualError([0], this._unnamed9, this._io, "/types/op/seq/9");
            }
            if ( ((this.kind == Acorn.OpKind.LOAD_LOCAL) || (this.kind == Acorn.OpKind.UNLOAD_LOCAL) || (this.kind == Acorn.OpKind.CALL) || (this.kind == Acorn.OpKind.MAKE_PATTERN) || (this.kind == Acorn.OpKind.ACCESS) || (this.kind == Acorn.OpKind.UPDATE)) ) {
                this.aStringHash = this._io.readU4le();
            }
            if (this.kind == Acorn.OpKind.LOAD_GLOBAL) {
                this.aPointer = this._io.readU4le();
            }
            if ( ((this.kind == Acorn.OpKind.JUMP) || (this.kind == Acorn.OpKind.MATCH)) ) {
                this.aJumpDelta = this._io.readU4le();
            }
            if (this.kind == Acorn.OpKind.MAKE_OBJECT) {
                this.aNumItems = this._io.readU4le();
            }
            if (this.kind == Acorn.OpKind.LOAD_CONST) {
                this.aConstPointerValueHash = this._io.readU4le();
            }
            if ( ((this.kind == Acorn.OpKind.APPLY) || (this.kind == Acorn.OpKind.DUPLICATE)) ) {
                this._unnamed15 = this._io.readBytes(4);
                if (!((KaitaiStream.byteArrayCompare(this._unnamed15, [0, 0, 0, 0]) == 0))) {
                    throw new KaitaiStream.ValidationNotEqualError([0, 0, 0, 0], this._unnamed15, this._io, "/types/op/seq/15");
                }
            }
        }

        return Op;
    })();

    return Acorn;
})();

export default Acorn;
