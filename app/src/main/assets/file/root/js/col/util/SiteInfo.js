// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

class SiteInfo {
    constructor({generalInfo = null,
        siteId = null,
        siteName = null,
        plans = new COL.util.AssociativeArray()}) 
        {
            this.generalInfo = generalInfo;
            this.siteId = siteId;
            this.siteName = siteName;
            this.plans = plans;
        };

    getPlans = function () {
        return this.plans;
    }
    
    addPlan = function (planName, planInfo) {
        this.plans.set(planName, planInfo);
    };
    
    toString = function () {
        // console.log('BEG toString');
        
        let siteInfoStr =
            'siteInfo:\n' +
            'generalInfo: ' + JSON.stringify(this.generalInfo) + '\n' +
            'siteId: ' + this.siteId + '\n' +
            'siteName: ' + this.siteName + '\n' +
            'plans: ' + this.plans.toString();

        return siteInfoStr;
    };
    
}

export { SiteInfo };
