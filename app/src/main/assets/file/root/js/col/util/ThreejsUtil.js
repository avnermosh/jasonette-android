// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from '../COL.js';
import "./Util.js";

COL.ThreejsUtil = {};

COL.ThreejsUtil.disposeObject = function (obj) {
    // console.log('BEG COL.ThreejsUtil.disposeObject()');

    if(COL.util.isObjectValid(obj))
    {
        // console.log('obj', obj); 
        // console.log('Dispose obj.name', obj.name);
        
        if (obj.geometry) {
            obj.geometry.dispose();
            // console.log("dispose geometry ", obj.geometry);
        }

        if (obj.material) {
            if (obj.material.length) {
                for (let i = 0; i < obj.material.length; ++i) {
                    obj.material[i].dispose();
                    // console.log("dispose material ", obj.material[i]);
                }
            }
            else {
                obj.material.dispose();
                // console.log("dispose material ", obj.material);
            }
        }
        obj = null;
    }
};
