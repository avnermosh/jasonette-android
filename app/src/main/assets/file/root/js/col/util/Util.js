// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from '../COL.js';

COL.util = {};

// list of colors
// https://www.imagemagick.org/script/color.php
// online color chooser
// https://www.htmlcsscolor.com/hex/00AA00
// color names
// https://www.htmlcsscolor.com/#wheel
COL.util.redColor = 0xff0000;
COL.util.greenColor = 0x00ff00;
COL.util.whiteColor = 0xffffff;
COL.util.yellow1 = 0xffff00;
COL.util.yellow2 = 0xEEEE00;
COL.util.blueColor = 0x0000ff;
COL.util.islamicGreenColor = 0x00aa00;
COL.util.Gold1 = 0xFFD700;
COL.util.Gold2 = 0xFFF1AC;
COL.util.Orange1 = 0xFFA500;
COL.util.Orange2 = 0xFFD17D;
COL.util.LavenderBlush1 = 0xFFF0F5;
COL.util.Orchid = 0xDA70D6;
COL.util.Orchid1 = 0xFF83FA;
COL.util.Orchid2 = 0xEE7AE9;
COL.util.Orchid3 = 0xCD69C9;
COL.util.darkOrangeColor = 0xFF8C00;
COL.util.sandyBrownColor = 0xF4A460;
COL.util.acquaColor = 0x00FFFF;
COL.util.whiteSmoke1 = 0xF5F5F5;
COL.util.whiteSmoke2 = 0x7E7E7E;

// Find similar color tone
// https://www.htmlcsscolor.com/hex/778899
// section: Monochromatic Colors of #778899
//   #DDE1E5, rgb(221,225,229)
//   #BCC4CC, rgb(188,196,204)
//   #8D9399, rgb(141,147,153)
//   #596672, rgb(89,102,114)
//   #3C444C, rgb(60,68,76)
//   #2D3339, rgb(45,51,57)



//////////////////////////////////////
// BEG File related utils
//////////////////////////////////////

COL.util.getFileTypeFromFilename = function (filename) {
    let fileExtention = COL.util.getFileExtention(filename);
    let fileType = undefined;
    switch(fileExtention) {
        case "":{
            fileType = undefined;
            break;
        }
        case "jpg":
        case "jpeg":
        case "JPG": {
            fileType = 'jpg';
            break;
        }
        case "png": {
            fileType = 'png';
            break;
        }
        case "mtl": {
            fileType = 'mtl';
            break;
        }
        case "obj": {
            fileType = 'obj';
            break;
        }
        case "json": {
            fileType = 'json';
            break;
        }
        case "zip": {
            fileType = 'zip';
            break;
        }
        case "txt": {
            fileType = 'txt';
            break;
        }
        default: {
            let msgStr = 'File type is not supported. File extension: ' + fileExtention;
            throw Error(msgStr);
        }
    }
    return fileType;
};

COL.util.getFileExtention = function (filename2) {
    // http://www.jstips.co/en/javascript/get-file-extension/
    var fileExt = filename2.slice((filename2.lastIndexOf(".") - 1 >>> 0) + 2);
    return fileExt;
};

COL.util.getPathElements = function (str) {
    // tbd - see if this can be replaced with
    // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.Path#Global_Object_OS.Path
    
    // https://stackoverflow.com/questions/3820381/need-a-basename-function-in-javascript
    // "/home/user/foo.txt" -> "/home/user", "foo", "txt"

    let location1 = str.lastIndexOf('/');
    let dirname = new String(str).substring(0, location1); 
    let basename = new String(str).substring(location1 + 1); 
    let extension = undefined;
    if(basename.lastIndexOf(".") != -1) {
        extension = basename.substring(basename.lastIndexOf(".") + 1);
        basename = basename.substring(0, basename.lastIndexOf("."));
    }
    let filename = basename + '.' + extension;
    
    let path_elements = {dirname: dirname,
                         basename: basename,
                         extension: extension,
                         filename: filename};
    
    return path_elements;
};

COL.util.filePathToFilename = function (file_path) {
    let filename = file_path.substring(file_path.lastIndexOf('/')+1);
    // console.log('filename', filename); 
    return filename;
};

//////////////////////////////////////
// END File related utils
//////////////////////////////////////
    
COL.util.isTouchDevice = function () {
    // console.log('BEG COL.util.isTouchDevice'); 
    let isTouchDevice1 = true;
    if ("ontouchstart" in document.documentElement)
    {
        isTouchDevice1 = true;
    }
    else
    {
        isTouchDevice1 = false;
    }
    return isTouchDevice1;
};

COL.util.isNumberInvalid = function (number) {
    let retval = false;
    if(COL.util.isObjectInvalid(number) || (isNaN(number)))
    {
        retval = true;
    }
    return retval;
};

COL.util.isDateValid = function (date) {
    return ((date instanceof Date) && !isNaN(date));
};

COL.util.isDateInvalid = function (date) {
    return !COL.util.isDateValid(date);
};

COL.util.isObjectValid = function (object) {
    let retval = true;
    if( (object === undefined) || (object === null))
    {
        retval = false;
    }
    return retval;
};

COL.util.isObjectInvalid = function (object) {
    return !COL.util.isObjectValid(object);
};

COL.util.isStringValid = function (string) {
    return COL.util.isObjectValid(string);
};

COL.util.isStringInvalid = function (string) {
    return !COL.util.isStringValid(string);
};

COL.util.IsValidJsonString = function (str) {
    try {
        JSON.parse(str);
    }
    catch {
        return false;
    }
    return true;
}

// https://www.abeautifulsite.net/adding-and-removing-elements-on-the-fly-using-javascript
// add html elemnt dynamically
//
// variables:
// parentId - the id of the parent html element (e.g. 'topDownPaneId')
// elementTag - the type of the html element (e.g. div)
// elementId - the id of the html element (e.g. 'note1Id')
// innerHtml - the content of the html element (can be another nested html element e.g. '<div id=editor1Id>')
// elementCssClass - the css class to attach to the newly created elementId (e.g. editorClass)
//
// will create the following structure, e.g.
// <div id="topDownPaneId">
//   <div id=note1Id>
//     <div id=editor1Id class=editorClass></div>
//   </div>
// </div>

COL.util.addElement = function (parentId, elementTag, elementId, innerHtml, elementCssClass) {
    // Adds an element to the document
    var parentEl = document.getElementById(parentId);
    var newElement = document.createElement(elementTag);
    newElement.setAttribute('id', elementId);
    newElement.setAttribute('class', elementCssClass);
    newElement.innerHTML = innerHtml;
    parentEl.appendChild(newElement);
};


// get nested object safely, using reduce
COL.util.getNestedObject = function (nestedObj, pathArr) {
    return pathArr.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
};

COL.util.loadFile = function (path, callback) {
    if (!jQuery.isFunction(callback)) {
        console.warn("The callback paramter must be a funciton.");
    }

    var tmpArray = [];
    if (jQuery.isArray(path)) {
        tmpArray = path;        
    }
    else {
        tmpArray.push(path);
    }
    
    var results = new COL.util.AssociativeArray();    
    function _load(path, _callback) {
        
        var fileName = path.substring(path.lastIndexOf('/')+1);                    
        
        $.ajax({
            url: path,
            error: function (xhr, textStatus, errorThrown) {
                var msg = "An error occurred. Status code: ";
                console.warn(msg + xhr.status + ". Status text: " + textStatus);
                results.set(fileName,"");
            },
            success: function (data) {
                results.set(fileName,data);
                _callback(data);
            }
        });
    }
    
    var i = 0;
    function _loadNextFile() {
        _load(tmpArray[i], function () {
            i++;
            if (i === tmpArray.length) {
                callback(results);
                return;
            }
            else {
                _loadNextFile();
            }            
        });
    }
    
    _loadNextFile();
};

COL.util.getURLParam = function(name) {
    name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

/**
 * Returns an array without duplicates
 * @param {type} array The array to be cleaned
 * @returns {Array} The array without duplicates
 */
COL.util.arrayUnique = function (array) {

    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

COL.util.deepCopy = function (otherObject) {
    let object1 = JSON.parse(JSON.stringify(otherObject));
    return object1;
};


COL.util.compareObjects = function (object1, object2) {
    let object1_str = JSON.stringify(object1);
    let object2_str = JSON.stringify(object2);

    console.log('object1_str', object1_str);
    console.log('object2_str', object2_str);
    
    let retval = (object1_str == object2_str);
    console.log('retval', retval);
    
    return retval;
};

// https://www.sitepoint.com/delay-sleep-pause-wait/
COL.util.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// https://www.sqlpac.com/en/documents/javascript-listing-active-event-listeners.html
COL.util.listAllEventListeners = function () {
    const allElements = Array.prototype.slice.call(document.querySelectorAll('*'));
    allElements.push(document);
    allElements.push(window);

    const types = [];

    for (let ev in window) {
        if (/^on/.test(ev)) types[types.length] = ev;
    }

    let elements = [];
    for (let i = 0; i < allElements.length; i++) {
        const currentElement = allElements[i];

        // Events defined in attributes
        for (let j = 0; j < types.length; j++) {
            if (typeof currentElement[types[j]] === 'function') {
                elements.push({
                    node: currentElement,
                    type: types[j],
                    func: currentElement[types[j]].toString(),
                });
            }
        }

        // Events defined with addEventListener
        if (typeof currentElement._getEventListeners === 'function') {

            // let evts = currentElement._getEventListeners();

            let evts = currentElement._getEventListeners();

            if (Object.keys(evts).length >0) {

                console.log('====================');
                console.log('currentElement', currentElement); 
                COL.util._showEvents(evts);
                
                for (let evt of Object.keys(evts)) {
                    for (let k=0; k < evts[evt].length; k++) {
                        // console.log(evts[evt][k]);
                        elements.push({
                            node: currentElement,
                            type: evt,
                            func: evts[evt][k].listener.toString()
                        });
                    }
                }
            }
        }
    }

    return elements.sort();
}

COL.util._showEvents = function (events) {
    for (let evt of Object.keys(events)) {
        console.log(evt + " ----------------> " + events[evt].length);
        for (let i=0; i < events[evt].length; i++) {
            console.log(events[evt][i].listener.toString());
            console.log(events[evt][i]);
        }
    }
};

// https://bloggie.io/@kinopyo/sending-non-get-requests-with-fetch-javascript-api-in-rails
// Grab the CSRF token from the meta tag
COL.util.getCSRFToken = function () {
    const csrfToken = document.querySelector("[name='csrf-token']")

    if (csrfToken) {
        return csrfToken.content
    } else {
        return null
    }
};

// https://discourse.threejs.org/t/to-get-array-of-all-meshes/17458
// https://stackoverflow.com/questions/40017796/make-javascript-local-variable-to-global-for-recursive-loops
COL.util.countNumberOfObjects = function (object) {

    function fn1(object)
    {
        let child;
        for (let i = 0; i < object.children.length; i++) {
            child = object.children[i];

            // Calls this function again if the child has children
            if (child.children) {
                fn1(child);
            }
            // Logs if this child last in recursion
            else {
                // console.log('Reached bottom1 with: ', child.name);
                numObjects++;
            }
        }
        // console.log('Reached bottom2 with: ', object.name);
        numObjects++;
    }

    var numObjects = 0;
    fn1(object);
    return numObjects;
};

// https://www.edureka.co/community/86198/how-to-get-the-size-of-a-javascript-object
COL.util.roughSizeOfObject = function (object) {

    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {

        // let stackLength = stack.length;
        // console.log('stackLength', stackLength); 
        
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
            (
                // avner: "objectList.indexOf( value ) === -1" means no match, i.e.
                // the object is not in objectList already (to prevent close-cycles ??
                typeof value === 'object'
                    && objectList.indexOf( value ) === -1
            )
        {
            objectList.push( value );

            for( var i in value ) {
                let val1 = value[ i ];
                // console.log('val1', val1); 

                stack.push( val1 );
            }
        }
    }
    return bytes;
};


// https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
COL.util.numberWithCommas = function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
