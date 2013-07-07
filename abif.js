//Adapted from http://www.interactive-biosoftware.com/open-source/ABIFReader.py
var fs = require('fs');

fs.readFile('./mitochondrion/chromatogram/JuneBBC-10-LCMtF.ab1', function(err, data){
    var abif = new Reader(data);
    console.log(abif.getData('DATA', 4));
    abif.showEntries();
});


var ABIF_TYPES = {
    1: 'byte',
    2: 'char',
    3: 'word',
    4: 'short',
    5: 'long',
    7: 'float',
    8: 'double',
    10: 'date',
    11: 'time',
    12: 'thumb',
    13: 'bool',
    18: 'pString',
    19: 'cString'
};

var entries = {
  c: {
    size: 1,
    string: true,
  },
  b: {
    size: 1,
    native: 'Int8',
    endian: false,
  },
  B: {
    size: 1,
    native: 'UInt8',
    endian: false,
  },
  '?': {
    size: 1,
    native: 'UInt8',
    endian: false,
  },
  h: {
    size: 2,
    native: 'Int16',
  },
  H: {
    size: 2,
    native: 'UInt16',
  },
  i: {
    size: 4,
    native: 'Int32',
  },
  I: {
    size: 4,
    native: 'UInt32',
  },
  l: {
    size: 4,
    native: 'Int32',
  },
  L: {
    size: 4,
    native: 'UInt32',
  },
  f: {
    size: 4,
    native: 'Float',
  },
  d: {
    size: 8,
    native: 'Double',
  },
  s: {
    size: 1,
    string: true,
  }
};

var ENDIAN = {
  '@': false,
  '=': false,
  '<': 'LE',
  '>': 'BE',
  '!': 'BE',
};

var struct = {
    sizeOf: function(huh){

    },
    unpack: function(format, buf, offset){

    }
};


function Reader(buf){
    this.buf = buf;
    this.pos = 0;
    this.type = this.readNextString(4);
    this.version = this.readNextShort();

    var dir = new DirEntry(this);
    this.seek(dir.dataoffset);

    this.entries = [];
    for(var i =0; i<= dir.numelements -1; i++){
        var e = new DirEntry(this);
        this.entries.push(e);
    }
}
Reader.prototype.showEntries = function(){
    this.entries.map(function(entry){
        console.log(entry);
    });
};

Reader.prototype.getData = function(name, num){
    if(num === undefined){
        num = 1;
    }
    var entry = this.getEntry(name, num);
    if(!entry){
        throw new Error('Entry ' + name + ' (' +num + ')  not found.');
    }
    this.seek(entry.mydataoffset);
    data = this.readData(entry.elementtype, entry.numelements);
    return data.length === 1 ? data[0] : data;
};

Reader.prototype.getEntry = function(name, num){
    var entry;

    this.entries.some(function(e){
        if(e.name === name && e.number === num){
            entry = e;
            return true;
        }
    });
    return entry;
};

Reader.prototype.readData = function(type, num){
    var m = {
        1: 'readNextByte',
        2: 'readNextString',
        3: 'readNextUnsignedInt',
        4: 'readNextShort',
        5: 'readNextLong',
        7: 'readNextFloat',
        8: 'readNextDouble',
        13: 'readNextBool'
    };
    return this[m[type]](num);
};

Reader.prototype.readNextString = function(size){
    var chars = [];
    for(var i = 0; i <= size -1; i++){
        chars.push(this.readNextChar());
    }
    return chars.join('');
};

Reader.prototype.readNextShort = function(){
    var v = this.buf.readInt16BE(this.pos);
    this.pos += 2;
    return v;
};
Reader.prototype.readNextInt = function(){
    var v = this.buf.readInt32BE(this.pos);
    this.pos += 4;
    return v;
};

Reader.prototype.readNextChar = function(){
    var v = this.buf.toString('ascii', this.pos, this.pos+1);
    this.pos += 1;
    return v;
};

Reader.prototype.tell = function(){
    return this.pos;
};

Reader.prototype.seek = function(pos){
    this.pos = pos;
};

function DirEntry(buf){
    this.name = buf.readNextString(4);
    this.number = buf.readNextInt();

    this.elementtype = buf.readNextShort();
    this.elementsize = buf.readNextShort();
    this.numelements = buf.readNextInt();
    this.datasize = buf.readNextInt();
    this.dataoffsetpos = buf.tell();
    this.dataoffset = buf.readNextInt();
    this.datahandle = buf.readNextInt();

    this.mydataoffset = (this.datasize <= 4) ? this.dataoffsetpos : this.dataoffset;
    this.mytype = (this.elementtype < 1024) ? ABIF_TYPES[this.elementtype] || 'unknown' : 'user';
}