
import { COL } from  "../COL.js";
import { Model } from "../core/Model.js";

class IntersectionInfo {
    constructor({intersectionLayer = null,
                 currentIntersection = null,
                 previousIntersection = null}) {

        this.intersectionLayer = intersectionLayer;
        this.currentIntersection = currentIntersection;
        this.previousIntersection = previousIntersection;
    }

    dispose = function () {
        // console.log('BEG IntersectionInfo::dispose()');

        // nothing to do
        
        // console.log('IntersectionInfo after dispose', this); 
    };
    
    clearCurrentIntersection() {
        // console.log('BEG clearCurrentIntersection'); 
        this.intersectionLayer = undefined;
        this.currentIntersection = undefined;
    };

    toString() {
        let intersectionInfoStr = 'intersectionLayer: ' + this.intersectionLayer + '\n' +
            'currentIntersection: ' + this.currentIntersection + '\n' +
            'previousIntersection: ' + this.previousIntersection;

        return intersectionInfoStr;
    };

    updatePreviousIntersection() {
        this.previousIntersection = this.currentIntersection;
    };
};

export { IntersectionInfo };
