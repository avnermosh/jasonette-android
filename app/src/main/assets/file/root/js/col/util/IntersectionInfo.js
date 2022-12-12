// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  '../COL.js';
import { Model } from '../core/Model.js';

class IntersectionInfo {
    constructor() {
        this.currentIntersection = undefined;
    }

    dispose() {
        // nothing to do
    }
    
    clearIntersection() {
        this.currentIntersection = undefined;
    }

    toString() {
        let intersectionInfoStr = 'currentIntersection: ' + this.currentIntersection;
        return intersectionInfoStr;
    }
}

export { IntersectionInfo };
