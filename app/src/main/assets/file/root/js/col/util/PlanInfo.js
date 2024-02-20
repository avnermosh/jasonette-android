// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

class PlanInfo {
    constructor({id = null,
                 name = null,
                 url = 1,
                 planFilename = null,
                 siteId = null,
                 siteName = null,
                 files = null,
                 zipFileName = undefined}) {
        this.id = id;
        this.name = name;
        this.url = url;
        this.planFilename = planFilename;
        this.siteId = siteId;
        this.siteName = siteName;
        this.files = files;
        this.zipFileName = zipFileName;
    };

    toString = function () {
        let PlanInfoStr =
            'id: ' + this.id + '\n' +
            'name: ' + this.name + '\n' +
            'url: ' + this.url + '\n' +
            'planFilename: ' + this.planFilename + '\n' +
            'siteId: ' + this.siteId + '\n' +
            'siteName: ' + this.siteName + '\n' +
            'files: ' + this.files + '\n' +
            'zipFileName: ' + this.zipFileName;

        return PlanInfoStr;
    };


    // example json-string in the site-plan menu
    // {
    //   "site_name":"123_main_road",
    //   "name":"123_main_road.layer0",
    //   "site_id":"369",
    //   "id":"429",
    //   "url":"123_main_road.layer0.json",
    //   "plan_filename":"123_main_road.layer0.json"
    // }
    
    toJsonString = function () {
        let planInfoJsonStr =
            '{' +
            '"site_name":"' + this.siteName + '",' +
            '"name":"' + this.name + '",' +
            '"site_id":"' + this.siteId + '",' +
            '"id":"' + this.id + '",' +
            '"url":"' + this.url + '",' +
            '"plan_filename":"' + this.planFilename + '",' +
            '"zipFileName":"' + this.zipFileName + '"' +
            '}';

        return planInfoJsonStr;
    };

};

export { PlanInfo };
