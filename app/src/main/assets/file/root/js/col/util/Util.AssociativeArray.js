'use strict';

// avner: 
// the AssociativeArray is a sorted array (the keys preserve the order of insertion)

import { COL } from '../COL.js';
import "./Util.js";

//////////////////////////////////////
// BEG AssociativeArray related utils
//////////////////////////////////////

/**         
 * @example <caption>Usage example:</caption>  
 * var aa = new COL.util.AssociativeArray();
 * aa.set("key1", obj1);
 * aa.set("key2", obj2);
 * var iter = aa.iterator();
 * var obj;
 * while(iter.hasNext()) {
 *    obj = iter.next();
 *    //do something with obj
 * }
 *
 * the order in the array is set by the order in which the elements are pushed in
 *
 */

// tbd - change AssociativeArray into class - maybe this will make COL.util.compareObjects work ?
// (currently "JSON.stringify(myAssociativeArray)" gives "{}")
COL.util.AssociativeArray = function () {

    // Contains the keys (key = keys[0 ... _length-1])
    // type of 'keys' (a regular javascript array) is 'object'
    var keys = [];
    
    // Associative array (value = values[key]);
    // type of 'values' is 'object'
    var values = [];

    // /////////////////////////////////////////////////////////////////////////
    // // NOTE: be carful not to use "remove()" in combination with iterator
    // // as this causes the interator to get out of sync!!!
    // /////////////////////////////////////////////////////////////////////////
    var _Iterator = function () {
        var _ind = 0;

        /**
         * Returns true if the iteration has more elements
         * @returns {Boolean} <code>true</code> if the iteration has more elements,
         * <code>false</code> otherwise
         */
        this.hasNext = function () {
            return _ind < keys.length;
        };

        /**
         * Returns the next element (val) in the iteration
         * @returns {Object} the next element in the iteration
         */
        this.next = function () {
            var next = values[keys[_ind]];
            _ind++;
            return next;
        };

        /**
         * Returns the next key in the iteration
         * @returns {string} the next key in the iteration
         */
        this.nextKey = function () {
            let nextKey = keys[_ind];
            _ind++;
            return nextKey;
        };
        
        /**
         * Returns the next element (key, and val) in the iteration
         * @returns {Object} the next element in the iteration
         */
        this.nextKeyVal = function () {
            var nextKey = keys[_ind];
            var nextVal = values[keys[_ind]];
            _ind++;
            return [nextKey, nextVal];
        };
    };
    
    this.getFirstVal = function() {
        if(this.size() === 0)
            return null;
        
        return values[keys[0]];     
    };

    this.getFirstKey = function() {
        if(this.size() === 0)
            return null;

        return keys[0];
    };
    
    this.getLast = function() {
        if(this.size() === 0)
            return null;
        
        return values[keys[keys.length - 1]];
    };

    // assign keys to the variable on return. After this, changes in keys will reflect automatically in the variable
    // e.g. let bar1 = foo1.getKeys();
    // changing the keys in foo1 will automatically change the entries in bar1
    this.getKeys = function() {
        return keys;
    };

    this.getValues = function() {
        // let valuesLength = Object.keys(values).length;
        return values;
    };
    
    this.getByKey = function (key) {
        return values[key];
    };

    this.getByIndex = function (index) {
        let key = keys[index];
        return values[key];
    };

    this.getKeyByIndex = function (index) {
        let key = keys[index];
        return key;
    };
    
    this.getKeyValAndIndexByKey = function (otherKey) {
        let iter = this.iterator();
        let index = 0;
        let retVal = {
            key: undefined,
            val: undefined,
            index: undefined
        }
        
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let key = keyVal[0];
            let val = keyVal[1];

            if(key === otherKey)
            {
                retVal.key = key;
                retVal.val = val;
                retVal.index = index;
                break;
            }
            index++;
        }
        return retVal;
    };

    this.printValues = function () {
        let iter = this.iterator();
        while (iter.hasNext()) {
            let value = iter.next();
            console.log('value', value); 
        }
    };

    this.toString = function () {
        let str = 'size: ' + this.size() + '\n';
        if(this.size() > 0)
        {
            str += '----\n';
        }
        
        let iter = this.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let key = keyVal[0];
            let val = keyVal[1];

            str += 'key: ' + key + '\n';
            
            let typeof_val = typeof val;
            // console.log('typeof_val', typeof_val);
            
            if(typeof_val === 'object')
            {
                let val_asJsonStringified = JSON.stringify(val);
                str += 'val: ' + val_asJsonStringified + '\n' +
                    '----\n';
            }
            else
            {
                str += 'val: ' + val + '\n' +
                    '----\n';
            }
        }
        
        return str;
    };

    this.toJSON = function () {
        // console.log('BEG this.toJSON');
        
        let associativeArray_asDictionary = {};
        let iter = this.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let key = keyVal[0];
            let val = keyVal[1];
            associativeArray_asDictionary[key] = val;
        }
        
        return associativeArray_asDictionary;
    };
    
    this.printKeysAndValues = function () {
        console.log(this.toString());
    };

    this.size = function () {
        return keys.length;
    };

    /**
     * Inserts an element in this associative array. Note that if the array 
     * previously contained a mapping for the key, the old value is replaced
     * @param {String} key The key with which the specified value is to be associated
     * @param {Object} value The value to be associated with the specified key
     */
    this.set = function (key, value) {
        // if key not exists
        if (!values[key]) {
            keys.push(key);
        }
        // Note that if key aleady exists, the new entry wll override the old
        values[key] = value;
    };

    // clear the array
    this.clear = function() {
        let iter = this.iterator();
        while (iter.hasNext()) {
            // Remove the first element in the array (fifo)
            let keyVal = this.shift();
            // console.log('keyVal', keyVal); 
            // console.log('this.size() after shift', this.size()); 
        }
    };
    
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift
    // remove the first element from the array and returns the removed element.
    this.shift = function() {

        let key = this.getFirstKey();
        if(key)
        {
            let val = this.remove(key);
            return {key: key, val: val};
        }
        else
        {
            return undefined;
        }
    };
    
    
    /**
     * Removes an element from this associative array          
     * @param {String} key The key whose mapping is to be removed from the array
     * @returns {Object} The removed element if the array contains a mapping for
     * the key, <code>null</code> otherwise
     */
    this.remove = function (key) {
        var element = values[key];
        delete values[key];
        for (var i = 0, m = keys.length; i < m; i++) {
            if (keys[i] === key) {
                keys.splice(i, 1);
                // we have finished
                return element;
            }
        }

        return null;
    };

    /**
     * Returns an iterator over the elements in this array
     * @returns {COL.util.AssociativeArray._Iterator}
     */
    this.iterator = function () {
        return new _Iterator();
    };
    
    /**
     * Sorts the items of the <code>AssociativeArray</code> rearranging its keys
     * in ascending (default) or descending order.
     * @param {String} order The sort order: ascending (<code>up</code>) or 
     * descending (<code>down</code>) 
     */
    this.sortByKey = function(order) {
        keys.sort();
         
        if(order === "down") {           
            keys.reverse();        
        }                
    };

    // https://stackoverflow.com/questions/5199901/how-to-sort-an-associative-array-by-its-values-in-javascript/11811767
    this.sortByVal = function(varName, order = 'up') {
        // console.log('BEG sortByVal'); 

        // fill-in tuples: a regular array that will be sorted
        var tuples = [];

        let iter = this.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();

            let val = keyVal[1];
            if(COL.util.isObjectInvalid(val[varName]))
            {
                console.log('valid variable(s)', val); 
                let msgStr = `The variable is invalid: ${varName}`;
                throw new Error(msgStr);
            }
            
            this.set(keyVal[0], keyVal[1]);
            tuples.push([keyVal[0], keyVal[1]]);
        }

        tuples.sort(function(a, b) {

            let varA = a[1][varName];
            let varB = b[1][varName];

            if(order !== 'up') {
                return (varA < varB) ? 1 : (varA > varB) ? -1 : 0;
            }
            else
            {
                return (varA < varB) ? -1 : (varA > varB) ? 1 : 0;
            }
        });
        // console.log('tuples after sort', tuples);

        let sortedByVar = new COL.util.AssociativeArray();
        for (var i = 0; i < tuples.length; i++) {
            var key = tuples[i][0];
            var value = tuples[i][1];
            sortedByVar.set(key, value);
        }
        return sortedByVar;
    };

    // merge otherAssociativeArray into this array
    this.mergeArray = function (otherAssociativeArray) {
        let iter = otherAssociativeArray.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            this.set(keyVal[0], keyVal[1]);
        }
    };

    // this is not guarenteed to be a deepCopy, e.g. if values are objects with addresses
    this.duplicate = function () {
        var duplicated=new COL.util.AssociativeArray();
        for(var i=0;i<keys.length;i++)
            duplicated.set(keys[i],values[keys[i]]);
        return duplicated;
    };
};

//////////////////////////////////////
// END AssociativeArray related utils
//////////////////////////////////////
