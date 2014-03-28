var fs = require('fs'),
    xml2js = require('xml2js'),
    url = require("url"),
    qs = require('querystring'),
    http = require('http');

var conf = require('./SATTConfig.js');
var parser = new xml2js.Parser();
var androidResPath = conf.androidResPath;
var enXml, zhXml;

http.createServer(function(req, res){
    var url_parts = url.parse(req.url, true);
    var pathComponents = url_parts.pathname.substring(1).split("/");
    if (pathComponents.length > 0 && "save" == pathComponents[0]){
        console.log('save');
        var requestBody = '';
        req.on('data', function(data) {
            requestBody += data;
            if(requestBody.length > 1e7) {
                res.writeHead(413, "Request Entity Too Large", {'Content-Type': 'text/html'});
                res.end('<!doctype html><html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>');
            }
        });
        req.on('end', function() {
            var formData = qs.parse(requestBody);
            var xmlString = save(JSON.parse(formData.result));
            var fs = require('fs');
                fs.writeFile(androidResPath + "values-" + conf.targetLanguage + "/_strings_copy.xml", xmlString, function(err) {
                if(err) {
                    console.log(err);
                    res.writeHead(200, {'Content-Type': 'application/msgpack'});
                    res.write(JSON.stringify({rc:1, err:err}));
                    res.end();
                } else {
                    console.log("The file was saved!");
                    res.writeHead(200, {'Content-Type': 'application/msgpack'});
                    res.write(JSON.stringify({rc:0}));
                    res.end();
                }
            }); 
        });
    }
    else {
        fs.readFile(androidResPath + 'values/strings.xml', function(err, data) {
            parser.parseString(data, function (err, result) {
                enXml = result;
                fs.readFile(androidResPath + 'values-' + conf.targetLanguage + '/strings.xml', function(err, data) {
                    parser.parseString(data, function (err, result) {
                        zhXml = result;
                        var enXmlCopy = JSON.parse(JSON.stringify(enXml));
                        var data = organize(enXmlCopy, zhXml);
                        data += script();
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.write('<!doctype html><html><head>');
                        res.write(style());
                        res.write('</head><body>');
                        res.write(data);
                        res.write("</body></html>");
                        res.end();
                    });
                });
            });
        });
    }
}).listen(conf.port);

function findStringInTranslated(strings, name) {
    for (var x in strings){
        if (name == strings[x]['$'].name) {
            return strings[x]['_'];
        } 
    }
    return null;
}

function findStringArrayInTranslated(stringArrays, name) {
    for (var x in stringArrays){
        if (name == stringArrays[x]['$'].name) {
            return stringArrays[x].item;
        } 
    }
    return [];
}

function findPluralInTranslated(plurals, name) {
    for (var x in plurals){
        if (name == plurals[x]['$'].name) {
            return plurals[x].item;
        } 
    }
    return [];
}

function organize(base, translated) {
    //string
    var result = {'string': [], 'stringArray': [], plurals:[]};
    var baseStrings = base.resources.string;
    for (var x in baseStrings) {
        var name = baseStrings[x]['$'].name;
        var foundValue = findStringInTranslated(translated.resources.string, name);
        if (null != foundValue){
            result.string.push({
                'name': name,
                'type': 'string',
                'value': foundValue,
                'base':baseStrings[x]['_'], 
                'hasValue': true
            });
        }
        else {
            result.string.push({
                'name': name,
                'type': 'string',
                'base': baseStrings[x]['_'], 
                'value': baseStrings[x]['_'],
                'hasValue': false 
            });
        }
    }
    var baseStringArrays = base.resources['string-array'];
    for (var x in baseStringArrays) {
        var name = baseStringArrays[x]['$'].name;
        var foundValue = findStringArrayInTranslated(translated.resources['string-array'], name);
        while (baseStringArrays[x].item.length > foundValue.length) {
            foundValue.push("");
        }
        result.stringArray.push({
            'name': name,
            'type': 'string-array',
            'value': foundValue,
            'base':baseStringArrays[x].item 
        });
    }
    var basePlurals = base.resources.plurals;
    for (var x in basePlurals) {
        var name = basePlurals[x]['$'].name;
        var foundValue = findPluralInTranslated(translated.resources.plurals, name);
        while (basePlurals[x].item.length > foundValue.length) {
            foundValue.push({'_':''});
        }
        result.plurals.push({
            'name': name,
            'type': 'plurals',
            'value': foundValue,
            'base': basePlurals[x].item
        });
       // while (baseStringArrays[x].item.length > foundValue.length) {
       //     foundValue.push("");
       // }
       // result.stringArray.push({
       //     'name': name,
       //     'type': 'string-array',
       //     'value': foundValue,
       //     'base':baseStringArrays[x].item 
       // });
    }
   
    var omegaColorString = "lightgoldenrodyellow";
    var omegaColorStringArray = "lightsteelblue";
    var omegaColorPlural = "lightcyan";

    var html = "<table >";
    for (var i in result.string) {
        html += "<tr style='background-color:" + (i % 2 == 0 ? omegaColorString : "white") + ";'>";
        html += "<td style='border:1px solid #d4d4d4;' width='50%' >";
        html += htmlEscape(result.string[i].base);
        html += "</td><td style='border:1px solid #d4d4d4;' width='50%' ><textarea style=' " + 
            (!result.string[i].hasValue ? "color:red;" : "") +
            "' name='" + result.string[i].name +
            "' type='" +result.string[i].type +
            "'>";
        html += htmlEscape(result.string[i].value);
        html += "</textarea></td></tr>";
    }
    html += "</table>";
    
    html += "<table >";
    for (var i in result.stringArray) {
        for (var j in result.stringArray[i].base){
            html += "<tr style='background-color:" + (i % 2 == 0 ? omegaColorStringArray : "white") + ";'>";
            html += "<td style='border:1px solid #d4d4d4;' width='50%' >";
            html += htmlEscape(result.stringArray[i].base[j]);
            html += "</td><td style='border:1px solid #d4d4d4;' width='50%' ><textarea ";
            html += "name='" + result.stringArray[i].name + "' ";
            html += "idx='" + j + "' ";
            html += "type='" +result.stringArray[i].type + "'>";
            html += htmlEscape(result.stringArray[i].value[j]);
            html += "</textarea></td></tr>";
        }
    }
    html += "</table>";
  
    html += "<table >";
    for (var i in result.plurals) {
        for (var j in result.plurals[i].base){
            html += "<tr style='background-color:" + (i % 2 == 0 ? omegaColorPlural : "white") + ";'>";
            html += "<td style='border:1px solid #d4d4d4;' width='50%' >";
            html += htmlEscape(result.plurals[i].base[j]['_']);
            html += "(quantity: " + result.plurals[i].base[j]['$'].quantity + ")";
            html += "</td><td style='border:1px solid #d4d4d4;' width='50%' ><textarea ";
            html += "name='" + result.plurals[i].name + "' ";
            html += "quantity='" + result.plurals[i].base[j]['$'].quantity + "' ";
            html += "type='" +result.plurals[i].type + "'>";
            html += htmlEscape(result.plurals[i].value[j]['_']);
            html += "</textarea></td></tr>";
        }
    }
    html += "</table>";

    html += "<input type='submit' id='ipt-save' value='Save'></input>";

    return html;
}

function save(objToSave) {
    var result = {resources:{string:[], 'string-array':[], plurals:[]}};
    for (var i in objToSave.strings) {
        var name = objToSave.strings[i].name;
        var value = objToSave.strings[i].value;
        result.resources.string.push({
            $:{name:name},
            _:value
        });
    }
    var tempStringArray = {};
    for (var i in objToSave.stringArrays) {
        var name = objToSave.stringArrays[i].name;
        var value = objToSave.stringArrays[i].value;
        var idx = objToSave.stringArrays[i].idx;
        if (null == tempStringArray[name]) {
            tempStringArray[name] = {};
        }
        tempStringArray[name][idx] = value;
    }
    for (var i in tempStringArray) {
        var items = [];
        for (var j = 0; j < Object.keys(tempStringArray[i]).length; j++) {
            items.push(tempStringArray[i][j]);
        }
        result.resources['string-array'].push({
            $: {name: i},
            item: items
        });
    }
    var tempPlurals = {};
    for (var i in objToSave.plurals) {
        var name = objToSave.plurals[i].name;
        var value = objToSave.plurals[i].value;
        var quantity = objToSave.plurals[i].quantity;
        if (null == tempPlurals[name]) {
            tempPlurals[name] = {};
        }
        tempPlurals[name][quantity] = value;
    }
    for (var i in tempPlurals) {
        var items = [];
        for (var j in tempPlurals[i]) {
            items.push({
                '_': tempPlurals[i][j],
                '$': {quantity:j}
            });
        }
        result.resources.plurals.push({
            $: {name: i},
            item: items
        });
    }
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(result);

    xml = xml.replace(/&quot;/g, '"');

    return xml;
}

function style() {
    var html = "<style>\
            textarea {\
                margin: 10px;\
                width: 90%;\
            }\
            table {\
                border-collapse:collapse;\
                width:100%;\
            }\
        </style>";
    return html;
}

function script() {
    var html = "";
    html += "<script src=\"http://code.jquery.com/jquery-1.11.0.min.js\"></script>";
    html += "<script>\
             $('#ipt-save').on('click', function(){\
                 var stringObjs = $('textarea[type=string]');\
                 var stringArrayObjs = $('textarea[type=string-array]');\
                 var pluralObjs = $('textarea[type=plurals]');\
                 var strings = [];\
                 var stringArrays = [];\
                 var plurals = [];\
                 for (var i = 0; i < stringObjs.length; i++) {\
                    var obj = $(stringObjs[i]);\
                    strings.push({name:obj.attr('name'),value:obj.val()});\
                 }\
                 for (var i = 0; i < stringArrayObjs.length; i++) {\
                    var obj = $(stringArrayObjs[i]);\
                    stringArrays.push({name:obj.attr('name'),value:obj.val(),idx:obj.attr('idx')});\
                 }\
                 for (var i = 0; i < pluralObjs.length; i++) {\
                    var obj = $(pluralObjs[i]);\
                    plurals.push({name:obj.attr('name'),value:obj.val(),quantity:obj.attr('quantity')});\
                 }\
                 $.post(\
                    '/save',\
                    {result:JSON.stringify({strings:strings, stringArrays:stringArrays, plurals:plurals})},\
                    function( data ) {\
                        if (0 == data.rc) {\
                            alert('Done');\
                        }\
                        else {\
                            alert('Failed. Check server log.');\
                        }\
                    },\
                    'json'\
                );\
             }); </script>";
    return html;
}

var htmlEscape = function(html){
    return String(html)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};
