"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var index_1 = require("antlr4/index");
var SHRDataElementParser = require('./parsers/SHRDataElementParser').SHRDataElementParser;
var SHRDataElementLexer = require('./parsers/SHRDataElementLexer').SHRDataElementLexer;
function importFromFilePath(filePath) {
    var filesByType = processPath(filePath);
    var tree = {};
    for (var _i = 0, _a = filesByType.dataElement; _i < _a.length; _i++) {
        var file = _a[_i];
        var chars = new index_1.FileStream(file);
        var lexer = new SHRDataElementLexer(chars);
        lexer.removeErrorListeners(); // Only log errors during the import
        var tokens = new index_1.CommonTokenStream(lexer);
        var parser = new SHRDataElementParser(tokens);
        parser.removeErrorListeners(); // Only log errors during the import
        parser.buildParseTrees = true;
        tree[file] = parser.doc();
    }
    return tree;
}
exports.importFromFilePath = importFromFilePath;
function processPath(filePath, filesByType) {
    if (filesByType === void 0) { filesByType = new FilesByType(); }
    var stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        var files = fs.readdirSync(filePath);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            processPath(path.join(filePath, file), filesByType);
        }
    }
    else {
        filesByType.add(filePath);
    }
    return filesByType;
}
var FilesByType = /** @class */ (function () {
    function FilesByType() {
        this._contentProfile = [];
        this._dataElement = [];
        this._map = [];
        this._valueSet = [];
        this._config = [];
    }
    Object.defineProperty(FilesByType.prototype, "contentProfile", {
        get: function () { return this._contentProfile; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FilesByType.prototype, "dataElement", {
        get: function () { return this._dataElement; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FilesByType.prototype, "map", {
        get: function () { return this._map; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FilesByType.prototype, "valueSet", {
        get: function () { return this._valueSet; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FilesByType.prototype, "config", {
        get: function () { return this._config; },
        enumerable: true,
        configurable: true
    });
    FilesByType.prototype.add = function (file) {
        switch (this.detectType(file)) {
            case 'DataElement':
                this._dataElement.push(file);
                break;
            case 'Map':
                this._map.push(file);
                break;
            case 'ValueSet':
                this._valueSet.push(file);
                break;
            case 'ContentProfile':
                this._contentProfile.push(file);
                break;
            case 'Config':
                this._config.push(file);
                break;
        }
    };
    FilesByType.prototype.detectType = function (file) {
        if (!file.endsWith('.txt') && !file.endsWith('.shr')) {
            return null; // only support *.txt or *.shr or .json coniguration files
        }
        var re = /^\s*Grammar:\s+([^\s]+)/;
        var lines = fs.readFileSync(file, 'utf-8').split('\n');
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var l = lines_1[_i];
            var match = l.match(re);
            if (match != null && match.length >= 2) {
                return match[1];
            }
            else if (file.endsWith('config.txt') || file.endsWith('config.json')) {
                return 'Config';
            }
        }
        return null;
    };
    return FilesByType;
}());
//# sourceMappingURL=parser.js.map