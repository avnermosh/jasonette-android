// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  "../COL.js";
import "../util/Util.AssociativeArray.js";
import { SiteInfo } from "../util/SiteInfo.js";
import { PlanInfo } from "../util/PlanInfo.js";

class ZipFileInfo {
    constructor({zipFile = null,
                 zipFileName = null,
                 zipFileUrl = null,
                 files = {}}) {
        this.zipFile = zipFile;
        this.zipFileName = zipFileName;
        this.zipFileUrl = zipFileUrl;
        this.files = files;

        this._sitesInfo = new COL.util.AssociativeArray();

        this.sitesFilesInfo = {};
        this.sitesFilesInfo["sites"] = {};
        this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"] = new COL.util.AssociativeArray()
    };
    
    getSitesFilesInfo = function () {
        return this.sitesFilesInfo;
    };

    setSitesFilesInfo = function (sitesFilesInfo) {
        this.sitesFilesInfo = sitesFilesInfo;
    };
    
    getSitesInfo = function () {
        return this._sitesInfo;
    };

    setSitesInfo = function (sitesInfo) {
        this._sitesInfo = sitesInfo;
    };
    
    getPlanInfoBySiteIdAndPlanId = function (siteId, planId) {

        let planInfo = undefined;
        let foundPlanInfo = false;

        let iter = this._sitesInfo.iterator();
        while (iter.hasNext()) {
            let siteInfo = iter.next();

            let iterPlans = siteInfo.getPlans().iterator();
            while (iterPlans.hasNext()) {
                let planInfo2 = iterPlans.next();
                if((planInfo2.siteId == siteId) && (planInfo2.id == planId))
                {
                    foundPlanInfo = true;
                    planInfo = planInfo2;
                    break;
                }
            }

            if(foundPlanInfo)
            {
                break;
            }
        }

        return planInfo;
    };
    
};

export { ZipFileInfo };
