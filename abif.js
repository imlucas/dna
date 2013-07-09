//Adapted from http://www.interactive-biosoftware.com/open-source/ABIFReader.py
var fs = require('fs');

fs.readFile('./mitochondrion/chromatogram/JuneBBC-10-LCMtF.ab1', function(err, data){
    var abif = new Reader(data);
    console.log(abif.getData('S/N%', 1));
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
        console.log(entry.name);
    });
};

Reader.prototype.getData = function(name, num){
    if(num === undefined){
        num = 1;
    }
    var entry = this.getEntry(name, num);
    if(!entry){
        // throw new Error('Entry ' + name + ' (' +num + ')  not found.');
        return undefined;
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

    for(var i=0; i < num; i++){
        buf.push(this[method]());
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
    var v = this.buf.readUInt8(this.pos);
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
    var y = this.readNextShort();
    var m = this.readNextByte();
    var day = this.readNextByte();

    console.log(y. m, day);
    d.setYear(y);
    d.setMonth(m);
    d.setDate(day);
    return d;
};


Reader.prototype.readNextTime = function(){
    var d = new Date();
    d.setHours(this.readNextByte());
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

// http://cpansearch.perl.org/src/VITA/Bio-Trace-ABIF-1.05/lib/Bio/Trace/ABIF.pm

Read.prototype.getAnalyzedDataForChannel = function(channel){
    if(channel === 5){
        channel = 205;
    }
    else {
        channel += 8;
    }
    if (channel < 9 || (channel > 12 && channel!= 205)) {
        return null;
    }
    return this.getEntry('DATA', channel);
};

Read.protoype.getBaseOrder = function(){
    return this.getData('FWO_').split('');
};

Read.prototype.getChannel = function(base){
    base = base.toUpperCase();
    var order = this.getBaseOrder();
    for(var i = 0; i <= order.length; i++){
        if(order[i] === base){
            return i + 1;
        }
    }
    return undefined;
};

// These are all just simple tag reads.
// Keeping this as a simple map for anyone else's reference.
// Don't worry.  They'll get all nice and camel cased below.
var accessors = {
    'analysis_protocol_settings_name': 'APrN',
    'analysis_protocol_settings_version': 'APrV',
    'analysis_protocol_xml': 'APrX',
    'analysis_protocol_xml_schema_version': 'APXV',
    'analysis_return_code': 'ARTN',
    'average_peak_spacing': 'SPAC',
    'basecaller_apsf': 'ASPF',
    'basecaller_bcp_dll': ['SPAC', 2],
    'basecaller_version': ['SVER', 2],
    'basecalling_analysis_timestamp': 'BCTS',
    'base_locations': ['PLOC', 2],
    'base_locations_edited': 'PLOC',
    'base_spacing': ['SPAC', 3],
    'buffer_tray_temperature': 'BufT',
    'capillary_number': 'LANE',
    'chem': 'phCH',
    'comment': 'CMNT',
    'comment_title': 'CTTL',
    'container_identifier': 'CTID',
    'container_name': 'CTNM',
    'container_owner': 'CTOw',
    'current': ['DATA', 6],
    'data_collection_module_file': 'MODF',
    'data_collection_software_version': 'SVER',
    'data_collection_firmware_version': ['SVER', 3],
    'data_collection_start_date': ['RUND', 3],
    'data_collection_start_time': ['RUNT', 3],
    'data_collection_stop_date': ['RUND', 4],
    'data_collection_stop_time': ['RUNT', 4],
    'detector_heater_temperature': 'DCHT',
    'downsampling_factor': 'DSam',
    'dye_name': 'DyeN',
    'dye_set_name': 'DySN',
    'dye_significance': 'DyeB',
    'dye_type': 'phDY',
    'dye_wavelength': 'DyeW',
    'edited_quality_values': 'PCON',
    'edited_quality_values_ref': 'PCON',
    'edited_sequence': 'PBAS',
    'edited_sequence_length': 'PBAS',
    'electrophoresis_voltage': 'EPVt',
    'gel_type': 'GTyp',
    'gene_mapper_analysis_method': 'ANME',
    'gene_mapper_panel_name': 'PANL',
    'gene_mapper_sample_type': 'STYP',
    'gene_scan_sample_name': 'SpNm',
    'injection_time': 'InSc',
    'injection_voltage': 'InVt',
    'instrument_class': '',
    'instrument_family': '',
    'instrument_name_and_serial_number': '',
    'instrument_param': '',
    'is_capillary_machine': '',
    'laser_power': '',
    'length_to_detector': '',
    'mobility_file': '',
    'mobility_file_orig': '',
    'model_number': '',
    'noise': '',
    'num_capillaries': '',
    'num_dyes': '',
    'num_scans': '',
    'official_instrument_name': '',
    'offscale_peaks': '',
    'offscale_scans': '',
    'order_base': '',
    'peak1_location': '',
    'peak1_location_orig': '',
    'peak_area_ratio': '',
    'peaks': '',
    'pixel_bin_size': '',
    'pixels_lane': '',
    'plate_type': '',
    'plate_size': '',
    'polymer_expiration_date': '',
    'polymer_lot_number': '',
    'power': '',
    'quality_levels': '',
    'quality_values': '',
    'quality_values_ref': '',
    'raw_data_for_channel': '',
    'raw_trace': '',
    'rescaling': '',
    'results_group': '',
    'results_group_comment': '',
    'results_group_owner': '',
    'reverse_complement_flag': '',
    'run_module_name': '',
    'run_module_version': '',
    'run_module_xml_schema_version': '',
    'run_module_xml_string': '',
    'run_name': '',
    'run_protocol_name': '',
    'run_protocol_version': '',
    'run_start_date': '',
    'run_start_time': '',
    'run_stop_date': '',
    'run_stop_time': '',
    'run_temperature': '',
    'sample_file_format_version': '',
    'sample_name': '',
    'sample_tracking_id': '',
    'scanning_rate': '',
    'scan_color_data_values': '',
    'scan_numbers': '',
    'scan_number_indices': '',
    'seqscape_project_name': '',
    'seqscape_project_template': '',
    'seqscape_specimen_name': '',
    'sequence': '',
    'sequence_length': '',
    'sequencing_analysis_param_filename': '',
    'signal_level': '',
    'size_standard_filename': '',
    'snp_set_name': '',
    'start_collection_event': '',
    'start_point': '',
    'start_point_orig': '',
    'start_run_event': '',
    'stop_collection_event': '',
    'stop_point': '',
    'stop_point_orig': '',
    'stop_run_event': '',
    'temperature': '',
    'trace': '',
    'trim_probability_threshold': '',
    'trim_region': '',
    'voltage': '',
    'user': '',
    'well_id': ''
};

Object.keys(accessors).map(function(accessor){
    var r = /[-_]([a-z])/g;
    var name = accessor.replace(regexp, function(match, c){
        return c.toUpperCase();
    });
    name = method.charAt(0).toUpperCase() + method.substring(1);

    var args = accessors[accessor];
    if(!Array.isArray(args)){
        args = [args];
    }

    Reader.prototype['get' + name] = function(){
        return this.getData.apply(this, args);
    };

});