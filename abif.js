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

module.exports = function(buf){
    return new Reader(buf);
};

module.exports.Reader = Reader;

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
        1: 'Byte',
        3: 'UnsignedInt',
        4: 'Short',
        5: 'Long',
        7: 'Float',
        8: 'Double',
        10: 'Date',
        11: 'Time',
        12: 'Thumb',
        13: 'Bool'
    };

    if(m[type]){
        return this._loop(m[type], num);
    }
    else if(type === 2){
        return this.readNextString(num);
    }
    else if(type === 18){
        return this.readNextpString(num);
    }
    else if(type === 19){
        return this.readNextcString(num);
    }
    return this[m[type]](num);
};

Reader.prototype._loop = function(type, num){
    var buf = [],
        method = 'readNext' + type;

    for(var i=0; i <= num; i++){
        buf.push(this[type]);
    }
    return buf;
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

Reader.prototype.readNextByte = function(){
    var v = this.buf.readUInt8BE(this.pos);
    this.pos += 1;
    return v;
};

Reader.prototype.readNextUnsignedInt = function(){
    var v = this.buf.readUInt32BE(this.pos);
    this.pos += 4;
    return v;
};

Reader.prototype.readNextLong = function(){
    var v = this.buf.readInt32BE(this.pos);
    this.pos += 4;
    return v;
};

Reader.prototype.readNextFloat = function(){
    var v = this.buf.readFloatBE(this.pos);
    this.pos += 4;
    return v;
};


Reader.prototype.readNextDouble = function(){
    var v = this.buf.readDoubleBE(this.pos);
    this.pos += 8;
    return v;
};

Reader.prototype.readNextBool = function(){
    return this.readNextByte() === 1;
};

Reader.prototype.readNextDate = function(){
    var d = new Date();
    d.setYear(this.readNextShort());
    d.setMonth(this.readNextByte());
    d.setDay(this.readNextByte());
    return d;
};


Reader.prototype.readNextTime = function(){
    var d = new Date();
    d.setHour(this.readNextByte());
    d.setMinutes(this.readNextByte());
    d.setSeconds(this.readNextByte());
    d.setMilliseconds(this.readNextByte());
    return d;
};

Reader.prototype.readNextThumb = function(){
    return [
        this.readNextLong(),
        this.readNextLong(),
        this.readNextByte(),
        this.readNextByte()
    ];
};

Reader.prototype.readNextString = function(size){
    var chars = [];
    for(var i = 0; i <= size -1; i++){
        chars.push(this.readNextChar());
    }
    return chars.join('');
};

Reader.prototype.readNextpString = function(){
    return this.readNextString(this.readNextByte());
};

Reader.prototype.readNextcString = function(){
    var chars = [],
        c;
    while(true){
        c = this.readNextChar();
        if(c.charAt(0) === 0){
            return chars.join('');
        }
        else {
            chars.push(c);
        }
    }
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