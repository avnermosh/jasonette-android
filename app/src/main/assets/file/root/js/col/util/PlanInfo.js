'use strict';

class PlanInfo {
    constructor({id = null,
                 name = null,
                 url = 1,
                 planFilename = null,
                 siteId = null,
                 siteName = null,
                 files = null}) {
        this.id = id;
        this.name = name;
        this.url = url;
        this.planFilename = planFilename;
        this.siteId = siteId;
        this.siteName = siteName;
        this.files = files;
    };

    toString = function () {
        let PlanInfoStr =
            'id: ' + this.id + '\n' +
            'name: ' + this.name + '\n' +
            'url: ' + this.url + '\n' +
            'planFilename: ' + this.planFilename + '\n' +
            'siteId: ' + this.siteId + '\n' +
            'siteName: ' + this.siteName + '\n' +
            'files: ' + this.files;

        return PlanInfoStr;
    };
    
};

export { PlanInfo };
