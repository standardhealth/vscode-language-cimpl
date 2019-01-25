import fs = require('fs');
import path = require('path');
import { FileStream, CommonTokenStream } from 'antlr4/index';
const ParserCimpl5 = require('./parsers/cimpl5/SHRDataElementParser.js');
const LexerCimpl5 = require('./parsers/cimpl5/SHRDataElementLexer.js');
const ParserCimpl6 = require('./parsers/cimpl6/SHRDataElementParser.js');
const LexerCimpl6 = require('./parsers/cimpl6/SHRDataElementLexer.js');

export function importFromFilePath(filePath: string, version: string) {
  const filesByType = processPath(filePath, version);
  let tree: any = {};

  for (const file of filesByType.dataElement) {
    const chars = new FileStream(file);
    const lexer = (version === '5.0')
    ? new LexerCimpl5.SHRDataElementLexer(chars)
    : new LexerCimpl6.SHRDataElementLexer(chars);
    lexer.removeErrorListeners(); // Only log errors during the import
    const tokens = new CommonTokenStream(lexer);
    const parser = (version === '5.0')
    ? new ParserCimpl5.SHRDataElementParser(tokens)
    : new ParserCimpl6.SHRDataElementParser(tokens);
    parser.removeErrorListeners(); // Only log errors during the import
    parser.buildParseTrees = true;
    tree[file] = parser.doc();
  }

  return tree;
}

function processPath(filePath: string, version: string, filesByType = new FilesByType()) {
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    const files = fs.readdirSync(filePath);
    for (const file of files) {
      processPath(path.join(filePath, file), version, filesByType);
    }
  } else {
    filesByType.add(filePath, version);
  }

  return filesByType;
}

class FilesByType {
  _contentProfile: Array<string>;
  _dataElement: Array<string>;
  _map: Array<string>;
  _valueSet: Array<string>;
  _config: Array<string>;

  constructor() {
    this._contentProfile = [];
    this._dataElement = [];
    this._map = [];
    this._valueSet = [];
    this._config = [];
  }

  get contentProfile() { return this._contentProfile; }
  get dataElement() { return this._dataElement; }
  get map() { return this._map; }
  get valueSet() { return this._valueSet; }
  get config() { return this._config; }

  add(file: string, version: string) {
    switch (this.detectType(file, version)) {
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
  }

  detectType(file: string, version: string) {
    if (!file.endsWith('.txt') && !file.endsWith('.shr')) {
      return null;  // only support *.txt or *.shr or .json configuration files
    }
    const re = /^\s*Grammar:\s+([^\s]+)\s+([^\s]+)/;
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    for (const l of lines) {
      const match = l.match(re);
      if (match != null && match.length >= 3) {
        if (match[2] === version) {
          return match[1];
        } else {
          return null;
        }
      } else if (file.endsWith('config.txt') || file.endsWith('config.json')) {
        return 'Config';
      }
    }
    return null;
  }
}
