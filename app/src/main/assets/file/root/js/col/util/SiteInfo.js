
class SiteInfo {
    constructor({siteId = null,
                 siteName = null,
                 plans = new COL.util.AssociativeArray()}) {
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
            'siteId: ' + this.siteId + '\n' +
            'siteName: ' + this.siteName + '\n' +
            'plans: ' + this.plans.toString();

        return siteInfoStr;
    };
    
}

export { SiteInfo };
