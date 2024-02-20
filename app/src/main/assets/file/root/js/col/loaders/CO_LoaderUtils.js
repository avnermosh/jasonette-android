// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from '../COL.js';

COL.loaders.utils = {};

// //////////////////////////////////////////////////////////////////////////////
// BEG semver version related functions
// //////////////////////////////////////////////////////////////////////////////

// 1.2.3
// major - breaking changes
// minor - new feature not breaking changes
// patch - bug fixes, not breaking changes

// https://stackoverflow.com/questions/55466274/simplify-semver-version-compare-logic
COL.loaders.utils.isSemVerGreater = (a, b) => {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
    return a.localeCompare(b, undefined, { numeric: true }) === 1;
};

COL.loaders.utils.isSemVerEqual = (a, b) => {
    return a.localeCompare(b, undefined, { numeric: true }) === 0;
};

COL.loaders.utils.isSemVerSmaller = (a, b) => {
    return a.localeCompare(b, undefined, { numeric: true }) === -1;
};


COL.loaders.utils.validateVersion = function (versionA, versionB, comparisonOperator) {
    // console.log('BEG validateVersion');
    
    let isVersionValid = false;
    
    // console.log('versionA', versionA);
    // console.log('versionB', versionB);
    
    if(comparisonOperator == 'GreaterOrEqual') {
        isVersionValid = (versionA && 
            ( (COL.loaders.utils.isSemVerGreater(versionA, versionB)) ||
              (COL.loaders.utils.isSemVerEqual(versionA, versionB)) )
        );
        if(!isVersionValid) {
            console.error('Version validation failed. Version: ' + versionA +
                          ' , min version supported: ' + versionB);
            // var msgStr = 'Version validation failed';
            // throw new Error(msgStr);
        }
    }
    else if(comparisonOperator == 'Equal') {
        isVersionValid = (versionA && (COL.loaders.utils.isSemVerEqual(versionA, versionB) ));
        if(!isVersionValid) {
            console.error('Version validation failed. Version: ' + versionA +
                          ' , version supported: ' + versionB);
        }
    }
    else{
        console.error('Version validation failed. Comparison operator is not supported: ' + comparisonOperator);
    }
    
    return isVersionValid;
};

// //////////////////////////////////////////////////////////////////////////////
// END semver version related functions
// //////////////////////////////////////////////////////////////////////////////

