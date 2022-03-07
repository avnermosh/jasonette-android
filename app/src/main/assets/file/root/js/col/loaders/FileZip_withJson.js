// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  "../COL.js";
import { Model } from "../core/Model.js";
import { Layer } from "../core/Layer.js";
import { BlobInfo } from "../core/BlobInfo.js";
import { ApiService } from "../core/ApiService.js";
import "../core/Core.js";
import { ImageInfo } from "../core/ImageInfo.js";
import { ZipLoader } from "../../static/ZipLoader.module.js";
import { PlanInfo } from "../util/PlanInfo.js";
import { Scene3DtopDown } from "../core/Scene3DtopDown.js";
import "../util/Util.js";
import "../util/Util.AssociativeArray.js";
import "../util/ErrorHandlingUtil.js";
import { FileZipUtils } from "./FileZipUtils.js";

// ///////////////////////////////////////////////////////////////////////////////////////
// BEG try4 - using promise-with-jasonette 
// https://igomobile.de/2017/03/06/wkwebview-return-a-value-from-native-code-to-javascript/
// ///////////////////////////////////////////////////////////////////////////////////////

// object for storing references to our promise-objects
var promises = {}

// generates a unique id, not obligator a UUID
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        // return (c=='x' ? r : (r&amp;amp;amp;amp;amp;amp;0x3|0x8)).toString(16);
        return (c=='x') ? r : "foo2";
        // return "foo1";
    });
    // return uuid;
};

function generateUUID_uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// this funciton is called by native methods
// @param promiseId - id of the promise stored in global variable promises
function resolvePromise(promiseId, data, error) {
    // console.log('BEG resolvePromise');
    // console.log('promiseId', promiseId); 
    // console.log('data', data); 

    if (error){
        promises[promiseId].reject(data);

    } else{
        promises[promiseId].resolve(data);
    }
    // remove referenfe to stored promise
    delete promises[promiseId];
}

function extractZipFile_native_ios(filePath2) {
    var promise = new Promise(function(resolve, reject) {
        // we generate a unique id to reference the promise later
        // from native function
        var promiseId = generateUUID_uuidv4();
        // save reference to promise in the global variable
        promises[promiseId] = {resolve, reject};
        
        try {
            // call native function
            
            let params = {"promiseId": promiseId,
                          "filePath": filePath2};

            // readFileHandler
            // ->
            // extractZipFileHandler
            
            window.$agent_jasonette_ios.trigger("extractZipFileHandler", params);
            // window.$agent_jasonette_ios
        }
        catch(exception) {
            alert(exception);
        }
        
    });
    
    return promise;
    
}

// ///////////////////////////////////////////////////////////////////////////////////////
// END try4 - using promise-with-jasonette 
// ///////////////////////////////////////////////////////////////////////////////////////

class FileZip_withJson {

    constructor(name, planInfo){
        this.openedZipFileList = new COL.util.AssociativeArray();
        this.sitesInfo_inFileZip = new COL.util.AssociativeArray();

        this.sitesFilesInfo = {};
        this.sitesFilesInfo["sites"] = {};
        this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"] = new COL.util.AssociativeArray();
        this.layerJsonFilenames = [];
        this.modelVersionInZipFile = undefined;
    };

    saveFromWebServerToZipFile_viaRegularZip2 = function (groupId) {
        return FileZipUtils.saveFromWebServerToZipFile_viaRegularZip(groupId);
    };

    setModelVersionInZipFile = function(modelVersionInZipFile) {
        this.modelVersionInZipFile = modelVersionInZipFile;
    };

    isSiteValidForUpload = async function (siteInfo_inFileZip) {
        // console.log('BEG isSiteValidForUpload'); 
        
        /////////////////////////////////////////////
        // Check if the site is valid to be uploaded to the website
        /////////////////////////////////////////////
        
        let getSiteByNameResultAsJson = await COL.model.getSiteByName(siteInfo_inFileZip.siteName);

        let retval1 = {
            retval: false,
            siteInfo_inBackend: {}
        };
        
        if(getSiteByNameResultAsJson.name) {
            let siteInfo = COL.model.createSiteInfoFromJson(getSiteByNameResultAsJson, this.modelVersionInZipFile)
            retval1['retval'] = true;
            retval1['siteInfo_inBackend'] = siteInfo;
        }
        else
        {
            console.log('File is invalid for upload'); 
        }
        
        return retval1;
    }

    syncZipSitePlanEntryWithWebServer2 = async function (plan_inFileZip) {
        console.log('BEG syncZipSitePlanEntryWithWebServer2');

        /////////////////////////////////////////////
        // Do xxx
        /////////////////////////////////////////////

        let retval = true;
        let planInfo = plan_inFileZip;

        let getPlanBySiteAndPlanNamesResultAsJson = await FileZipUtils.getPlanBySiteAndPlanNames(planInfo)

        if(getPlanBySiteAndPlanNamesResultAsJson.plan_name) {
            // A plan with the  planInfo.siteName and planInfo.name already exists
            // Update the existing sitePlan with content from the sitePlan in the zip file
            
            let siteName = getPlanBySiteAndPlanNamesResultAsJson.site_name;
            let msgStr = 'siteName: ' + siteName + ', plan_name: ' + getPlanBySiteAndPlanNamesResultAsJson.plan_name +
                ' already exists for the user. Update the existing sitePlan with content from the sitePlan in the zip file';
            
            planInfo.newSiteId = getPlanBySiteAndPlanNamesResultAsJson.site_id;
            planInfo.newPlanId = getPlanBySiteAndPlanNamesResultAsJson.plan_id;
        }
        else {
            // A plan with the planInfo.siteName and planInfo.name does NOT exists for the user
            // create a new sitePlan with content from the sitePlan in the zip file

            let msgStr = 'siteName: ' + planInfo.siteName + ', plan_name: ' + planInfo.name +
                ' do NOT exist for the user. Create a new sitePlan with content from the sitePlan in the zip file';

            let addNewPlanResultAsJson = await FileZip_withJson.addNewPlan(planInfo);
            planInfo.newSiteId = addNewPlanResultAsJson.site_id;
            planInfo.newPlanId = addNewPlanResultAsJson.plan_id;
        }

        return retval;
    };

    syncZipSitePlanFilesWithWebServer2 = async function (plan_inFileZip) {
        // console.log('BEG syncZipSitePlanFilesWithWebServer2');

        try
        {
            let retval = true;
            COL.model.image_db_operations_array = [];
            
            /////////////////////////////////////////////
            // getLayerByPlanInfo
            /////////////////////////////////////////////
            
            let syncRetVals = [];
            let layer = COL.model.getLayerByPlanInfo(plan_inFileZip);
            if(COL.util.isObjectInvalid(layer)) {
                // sanity check
                console.error('plan_inFileZip', plan_inFileZip); 
                console.error('layer is invalid for plan_inFileZip');
                retval = false;
                return retval;
            }
            
            let imagesInfo = layer.getImagesInfo();
            let planInfo = layer.getPlanInfo();
            let path = planInfo.siteId + '/' + planInfo.id;
            let imageFilenames = imagesInfo.getValues();

            /////////////////////////////////////////////
            // clear all blobsUrls of the current zipfile layer
            // before uploading the files to the webserver
            // this helps preventing "out of memory" errors
            /////////////////////////////////////////////

            console.log('clear all blobsUrls');
            for (let filename in imageFilenames) {
    	        let imageInfo = imagesInfo.getByKey(filename);
    	        let blobInfo = imageInfo.blobInfo;

                if(COL.util.isObjectInvalid(blobInfo)) {
                    // sanity check
                    console.error('blobInfo is invalid for filename: ', filename);
                }
                
                let filenameFullPath = blobInfo.dirname + '/' + blobInfo.filename;

                // clear the memory via revokeObjectURL()
                // mark the "buffer" as empty and "url" as null to indicate that the blob is no longer in memory
                // the buffer and url is the same in blobInfo.blobUrl
                if(COL.util.isObjectValid(blobInfo.blobUrl)) {
                    // console.log('revokeObjectURL for blobInfo.blobUrl');
                    URL.revokeObjectURL(blobInfo.blobUrl);
                    blobInfo.blobUrl = null;
                }

                let zipFileInfo = COL.model.getZipFileInfo();
                zipFileInfo.files[filenameFullPath].buffer = null;
                zipFileInfo.files[filenameFullPath].url = null;
            }
            

            ////////////////////////////////////////////////////////////////////////////////////
            // sync files of the current zipfile layer
            // optionally save the files to to the file system
            // (and defer the save to the db, to a separate step - see below)
            ////////////////////////////////////////////////////////////////////////////////////

            // sync images
            await this.syncFilesOfTheCurrentZipFileLayer2(planInfo, imagesInfo, imageFilenames, syncRetVals);

            let metaDataFilesInfo = layer.getMetaDataFilesInfo();
            let metaDataFilenames = metaDataFilesInfo.getValues();
            
            // sync metadata (e.g. .json)
            await this.syncFilesOfTheCurrentZipFileLayer2(planInfo, metaDataFilesInfo, metaDataFilenames, syncRetVals);

            //////////////////////////////////////////////////////
            // Check if the sync was successful
            //////////////////////////////////////////////////////
            
            let allFilesSyncStatus = true;
            let msgStr = "List of files that were not synced: ";
            syncRetVals.forEach(function(syncRetVal){
                // console.log(syncRetVal);
                if(!syncRetVal['syncStatus'])
                {
                    allFilesSyncStatus = false;
                    let msgStr1 = "filePath: " + syncRetVal['filePath'] +
                        ", syncStatus: " + syncRetVal['syncStatus'] + "<br /><br />";
                    
                    msgStr = msgStr + msgStr1;
                }
            });

            
            ////////////////////////////////////////////////////////////////////////////////////
            // sync files of the current zipfile layer
            // optionally save the files to to the db in a separate step
            ////////////////////////////////////////////////////////////////////////////////////

            if(allFilesSyncStatus)
            {
                // insert/update/delete from the database with the new/updated/deleted images 
                let jsonData = {image_db_operations_array: COL.model.image_db_operations_array};
                let jsonDataAsStr = JSON.stringify(jsonData);

                const formData = new FormData();
                formData.append('json_data_as_str', jsonDataAsStr);

                let headersData = {
                    'X-CSRF-Token': COL.model.csrf_token
                };
                
                let fetchData = { 
                    method: 'POST', 
                    headers: headersData,
                    body: formData
                };

                
                // queryUrl - e.g. http://192.168.1.74/api/v1_2/insert_update_delete_images_in_db
                let queryUrl = COL.model.getUrlBase() + 'api/v1_2/insert_update_delete_images_in_db';

                let response = await fetch(queryUrl, fetchData);
                await COL.errorHandlingUtil.handleErrors(response);
            }

            if(allFilesSyncStatus)
            {
                msgStr = "All files were synced!";
            }
            console.log('msgStr', msgStr);

            return retval;
        }
        catch (err)
        {
            console.error('err', err);
            throw new Error('Error from syncZipSitePlanFilesWithWebServer2');
        }
    };

    syncFilesOfTheCurrentZipFileLayer2 = async function (planInfo, filesInfo, filenames, syncRetVals) {
        // console.log('BEG syncFilesOfTheCurrentZipFileLayer2');

        console.log('sync files to webserver');
        
        let counter = 0;
        const reportEveryNumFiles = 10;
        let sitesInfo = COL.model.getSitesInfo();
        let filenamesLength = Object.keys(filenames).length;
        
        for (let filename in filenames) {
            counter += 1;
            if(counter % reportEveryNumFiles == 0)
            {
                let msgStr = counter + " of: " + filenamesLength;
                console.log(msgStr);
            }
            
    	    let fileInfo = filesInfo.getByKey(filename);
    	    let blobInfo = fileInfo.blobInfo;

            if(COL.util.isObjectInvalid(blobInfo))
            {
                // sanity check
                console.error('blobInfo is invalid');
            }

            let filenameFullPath = blobInfo.dirname + '/' + blobInfo.filename;

            if(COL.util.isObjectInvalid(blobInfo.blobUrl)) {
                // https://www.joji.me/en-us/blog/processing-huge-files-using-filereader-readasarraybuffer-in-web-browser/
                // tbd - maybe only open the zip file and read specific file for big files, and for small files e.g. < 100B keep the Model::_zipFileArrayBuffer ??
                //
                // The file is not yet in memory, but its offset is stored in memory.
                // Unzip the image file data

                await FileZip_withJson.readZipEntryData(filenameFullPath)

                blobInfo = await this.addBlobToFilesInfo(filenameFullPath, filesInfo);
                
                // sanity test
                let response = await fetch(blobInfo.blobUrl);
                if (!response.ok) {
                    console.log('Error from syncFilesOfThe CurrentZipFileLayer. Error fetching blobInfo.blobUrl'); 
                }
            }

            let syncRetVal = await this.syncZipFileBlobWithWebServer2(planInfo, blobInfo);


            // ZipLoader.clear() clears the entire file entry,
            // i.e. the buffer (which we may want to clear to conserve memory),
            // but also the header attributes (offsetInZipFile, compressedSize, etc...) which we want to preserve
            // so don't call "ZipLoader.clear()"
            
            if(COL.util.isObjectValid(blobInfo.blobUrl)) {
                // console.log('revokeObjectURL for blobInfo.blobUrl');
                URL.revokeObjectURL(blobInfo.blobUrl);
                blobInfo.blobUrl = null;
            }
            // mark the "buffer" as empty and "url" as null to indicate that the blob is no longer in memory
            // the buffer and url is the same in blobInfo.blobUrl, which is released above
            // (the memory is cleared via "revokeObjectURL(blobInfo.blobUrl)"
            let zipFileInfo = COL.model.getZipFileInfo();
            zipFileInfo.files[filenameFullPath].buffer = "";
            // console.log('revokeObjectURL for zipFileInfo.files[filenameFullPath].url');
            // URL.revokeObjectURL(zipFileInfo.files[filenameFullPath].url);
            zipFileInfo.files[filenameFullPath].url = null;

            syncRetVals.push(syncRetVal);
        }
    };
    
    syncZipFileBlobWithWebServer2 = async function (planInfo, blobInfo) {

        let filename = blobInfo.filename;

        // sanity check
        if(COL.util.isObjectInvalid(blobInfo.blobUrl)) {
            // At this point the blob should be in memory
	    console.log('blobInfo.filename', blobInfo.filename); 
	    console.log('blobInfo.dirname', blobInfo.dirname);
            throw new Error('Invalid blobInfo.blobUrl');
        }

        let syncRetVal = {};
        syncRetVal["filePath"] = filename;
        syncRetVal["syncStatus"] = false;
        
        let fileType = COL.util.getFileTypeFromFilename(filename);
        switch(fileType) {
            case "mtl":
            case "obj":
            case "jpg":
            case "png":
            case "json": {
                // blobInfo.isDirty = true;
                // await blobInfo.syncBlobToWebServer(sitesInfo);
                // blobInfo.isDirty = false;

                // add layer.json
                
                // verify that the dirname matches the path pattern: siteId/planId
                let matchResults = blobInfo.dirname.match( /(\d+)\/(\d+)/i );
                if(matchResults)
                {
                    blobInfo.isDirty = true;
                    // extract siteId, planId from sitesInfo and filePathOrig stripped from siteId/planId
                    let retVal = Layer.GetSiteIdPlanIdAndFilePath(planInfo);
                    let siteId = retVal['siteId'];
                    let planId = retVal['planId'];
                    let filePath = retVal['filePath'];

                    let doDeferFileSystemAndDbSync = false;
                    syncRetVal = await blobInfo.syncBlobToWebServer(siteId, planId, filePath, doDeferFileSystemAndDbSync);
                    blobInfo.isDirty = false;
                }
                else
                {
                    console.error("Failed to match blobInfo.dirname");
                    console.log('blobInfo', blobInfo); 
                    console.log('matchResults', matchResults);
                }
                
                break;
            }
            default: {
                console.error("File extention is not supported", fileExtention);
                break;
            }
        }
        return syncRetVal;
    };

    syncZipSitePlanWithWebServer2 = async function (plan_inFileZip) {
        console.log('BEG syncZipSitePlanWithWebServer2');
        
        // Sync the plan entry in the database
        // if the plan is not already in the db, create a new plan entry
        let retval1 = await this.syncZipSitePlanEntryWithWebServer2(plan_inFileZip);

        let retval2 = false;
        if(retval1)
        {
            // Upload the plan related files to the webserver (persist in the database, and upload to the file system)
            retval2 = await this.syncZipSitePlanFilesWithWebServer2(plan_inFileZip);
        }
        return retval2;
    };

    syncZipSiteWithWebServer2 = async function (siteInfo_inFileZip, siteInfo_inBackend) {
        console.log('BEG syncZipSiteWithWebServer2');
        
        ///////////////////////////////////////////
        // delete the old site
        ///////////////////////////////////////////

        // @bp.route('/admin/delete/site/<site_id>', methods=['DELETE'])
        // @bp.route('/admin/delete/site/<site_id>', methods=['POST'])
        // https://localhost/api/v1_2/admin/delete/site/71
        let queryUrl = COL.model.getUrlBase() + 'api/v1_2/admin/delete/site/' + siteInfo_inBackend.siteId;

        let fetchData = { 
            method: 'GET'
            // method: 'DELETE'
            // method: 'POST' 
        };

        // queryUrl - e.g. http://192.168.1.74/api/v1_2/admin/delete/site/47
        let response = await fetch(queryUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);

        
        /////////////////////////////////////////////
        // Sync the site from the .zip file
        /////////////////////////////////////////////
        
        let retval = false;
        let iter = siteInfo_inFileZip.plans.iterator();
        while (iter.hasNext()) {
            let plan_inFileZip = iter.next();

            let retval2 = await this.syncZipSitePlanWithWebServer2(plan_inFileZip);
            retval = (retval || retval2);
        }
        return retval;
    };

    syncZipSitesWithWebServer2 = async function () {
        console.log('BEG syncZipSitesWithWebServer2');
        
        let retval1 = true;
        let syncZipSitesWithWebServer_statusStr = "";
        
        let iter = this.sitesInfo_inFileZip.iterator();
        while (iter.hasNext()) {
            let siteInfo_inFileZip = iter.next();

            /////////////////////////////////////////////
            // Check if the site is valid to be uploaded to the website
            /////////////////////////////////////////////

            let siteName = siteInfo_inFileZip.siteName;
            let isSiteValidForUpload_results = await this.isSiteValidForUpload(siteInfo_inFileZip)

            if(isSiteValidForUpload_results.retval)
            {
                let retval_syncZipSiteWithWebServer2 = await this.syncZipSiteWithWebServer2(siteInfo_inFileZip,
                                                                                            isSiteValidForUpload_results.siteInfo_inBackend);
                
                if(!retval_syncZipSiteWithWebServer2)
                {
                    syncZipSitesWithWebServer_statusStr += (`Failed to sync site: ${siteName}\n`);
                }
                else
                {
                    syncZipSitesWithWebServer_statusStr += (`Succeeded to sync site: ${siteName}\n`);
                }
                retval1 = (retval1 || retval_syncZipSiteWithWebServer2);
            }
            else
            {
                syncZipSitesWithWebServer_statusStr += (`Site is invalid for upload: ${siteName}\n`);
                retval1 = false;
            }
        }
        
        let retval3 = {
            retval: retval1,
            syncZipSitesWithWebServer_statusStr: syncZipSitesWithWebServer_statusStr
        }

        return retval3;
    };

    // --------------------------------------------------------------
    
    ////////////////////////////////////////////////////////////////////////////
    // We create sitesFilesInfo (multiple planImagesInfo, and planMetaDataFilesInfo)
    // from the zip file data, which refers to multiple site plans.
    // by sorting the specific file (filenameFullPath) to an entry in sitesFilesInfo (for a specific site_plan)
    // and by returning a reference to an entry in sitesFilesInfo (for a specific site_plan)
    //
    // Get the planImagesInfo, planMetaDataFilesInfo, origSiteId, origPlanId from sitesFilesInfo
    // for a specified filenameFullPath (which relates to a specific site plan)
    ////////////////////////////////////////////////////////////////////////////
    
    getFilesInfoForSpecifiedFilename = function (filenameFullPath) {
        // console.log('BEG getFilesInfoForSpecifiedFilename');
        
        let pathElements = COL.util.getPathElements(filenameFullPath);
        let dirname = pathElements['dirname'];
        let filename = pathElements['filename'];
        let extension = pathElements['extension'];
        let isRegularFile = false;
        
        let planImagesInfo = undefined;
        let planMetaDataFilesInfo = undefined;
        let otherDataSharedBetweenAllSitePlans = undefined;
        let origSiteId = undefined;
        let origPlanId = undefined;
        if(extension)
        {
            origSiteId = 0;
            origPlanId = 0;

            let matchResults = dirname.match( /(\d+)\/(\d+).*/i );

            if(matchResults)
            {
                origSiteId = matchResults[1];
                origPlanId = matchResults[2];

                if(!this.sitesFilesInfo["sites"][origSiteId])
                {
                    this.sitesFilesInfo["sites"][origSiteId] = {};
                }
                if(!this.sitesFilesInfo["sites"][origSiteId][origPlanId])
                {
                    this.sitesFilesInfo["sites"][origSiteId][origPlanId] = {
                        imagesInfo: new COL.util.AssociativeArray(),
                        metaDataFilesInfo: new COL.util.AssociativeArray()
                    };
                }
                let fileType = COL.util.getFileTypeFromFilename(filenameFullPath);

                switch(fileType) {
                    case "jpg":
                    case "png": {
                        planImagesInfo = this.sitesFilesInfo["sites"][origSiteId][origPlanId].imagesInfo;
                        isRegularFile = true;
                        break;
                    }
                    case "json":
                    case "txt": {
                        planMetaDataFilesInfo = this.sitesFilesInfo["sites"][origSiteId][origPlanId].metaDataFilesInfo;
                        isRegularFile = true;
                        break;
                    }
                    default: {
                        let msgStr = 'filename: ' + filename + ', fileType: ' + fileType + ' in .zip file is not supported';
                        throw new Error(msgStr);
                    }
                }

            }
            else
            {
                if(FileZipUtils.isSharedDataBetweenAllSitePlans(filenameFullPath))
                {
                    if(!this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"])
                    {
                        this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"] = new COL.util.AssociativeArray();
                    }
                    
                    otherDataSharedBetweenAllSitePlans = this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"];
                    isRegularFile = true;
                }
                else
                {
                    console.error('dirname', dirname); 
                    console.error('matchResults', matchResults); 
                    let msgStr = 'Invalid filenameFullPath: ' + filenameFullPath;
                    throw new Error(msgStr);
                }
            }
        }
        else
        {
            // This could be a directory, not an actual file
            console.log('The file does not have an extension, i.e. it is a directory');
            console.log('filenameFullPath', filenameFullPath);
            isRegularFile = false;
        }

        let retVal = {};
        retVal['origSiteId'] = origSiteId;
        retVal['origPlanId'] = origPlanId;
        retVal['planImagesInfo'] = planImagesInfo;
        retVal['planMetaDataFilesInfo'] = planMetaDataFilesInfo;
        retVal['otherDataSharedBetweenAllSitePlans'] = otherDataSharedBetweenAllSitePlans;
        retVal['isRegularFile'] = isRegularFile;

        // ImageInfo.PrintImagesInfo(retVal.planImagesInfo);
        // console.log('foo1');
        
        return retVal;
    };

    
    
    loadFilesFromZipFileInfoIntoBlobs_via_ZipLoader = async function () {
        console.log('BEG loadFilesFromZipFileInfoIntoBlobs_via_ZipLoader');

        // /////////////////////////////////////////////////////////////
        // Load files from zip-file-info into blobs
        // skip jpg images
        // /////////////////////////////////////////////////////////////

        console.log('Load files from zip file into blobs');
        
        // loop over keys
        let zipFileInfo = COL.model.getZipFileInfo();
        let filenames = Object.keys(zipFileInfo.files);
        // console.log('filenames', filenames);
        let numFiles = filenames.length;
        console.log('numFiles', numFiles); 
        let countIndex = 0;

        let msgStr = "Loading " + numFiles + " files";
        let numFilesBetweenReporting = 10;
        
        for (var key in filenames) {

            if( (countIndex % numFilesBetweenReporting) == 0 )
            {
                // show progress - update the spinner, and send a log message with the number of files
                // that were loaded so far
                let msgStr = countIndex + " out of " + numFiles;
                console.log(msgStr);
                let spinnerEl = document.getElementById('cssLoaderId');
                spinnerEl.setAttribute('data-text', msgStr);
            }
            countIndex += 1;
            
            let filenameFullPath = filenames[key];

            let pathElements = COL.util.getPathElements(filenameFullPath);
            let dirname = pathElements['dirname'];
            let basename = pathElements['basename'];
            let extension = pathElements['extension'];
            // tbd replace fileExtention with filename
            let fileExtention = COL.util.getFileExtention(filenameFullPath);
            let filename = basename + '.' + fileExtention;
            
            // ////////////////////////////////////////////////////////////////////////////////////
            // get filesInfo  for files that are related to the specified file
            // - all the planImagesInfo for the plan of the specified file
            // - all the planMetaDataFilesInfo for the plan of the specified file
            // - all the otherDataSharedBetweenAllSitePlans that are shared across all the sites and plans
            // - etc..
            // ////////////////////////////////////////////////////////////////////////////////////
            
            let retVal = this.getFilesInfoForSpecifiedFilename(filenameFullPath);
            
            let planImagesInfo = retVal.planImagesInfo;
            let planMetaDataFilesInfo = retVal.planMetaDataFilesInfo;
            let otherDataSharedBetweenAllSitePlans = retVal.otherDataSharedBetweenAllSitePlans;
            let origSiteId = retVal.origSiteId;
            let origPlanId = retVal.origPlanId;
            let isRegularFile = retVal.isRegularFile;

            // console.log('filenameFullPath', filenameFullPath);

            if(!isRegularFile)
            {
                // skip e.g. directories
                continue;
            }

            let fileType = COL.util.getFileTypeFromFilename(filenameFullPath);
            let fileInfo = zipFileInfo.files[filenameFullPath];
            let contentType = FileZip_withJson.getContentTypeFromFilename(filenameFullPath);
            switch(fileType) {
                case undefined:
                    // e.g. skip directory names
                    break;
                case "jpg":
                case "png": {

                    // it looks like the imagesInfo is loaded from the json file
                    let doSkip_loadImagesFromZipFile_imagesAreManagedViaJsonFile = true;
                    if(doSkip_loadImagesFromZipFile_imagesAreManagedViaJsonFile)
                    {
                        break;
                    }
                    // else
                    // {
                    //     // separate to 2 groups:
                    //     // a. floor plan images e.g. xxx_ground1.jpg
                    //     // b. all other images e.g. IMG_6399.jpg

                    //     // tbd - regex to match the floor plan images e.g. ground1... ?
                    //     let re2 = /^image.*\.jpg$/;
                    //     let overlayRectImageRegexMatched = filename.match(re2);

                    //     if(overlayRectImageRegexMatched) {
                    //         // do not load the actual image
                            
                    //         // Create a placeholder blobInfo, add blobInfo to imageInfo, add imageInfo to planImagesInfo
                    //         let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: undefined, isDirty: true});
                    //         let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                    //         planImagesInfo.set(filename, imageInfo);
                    //     }
                    //     else {
                    //         // load the actual image
                    //         if (fileInfo.url) {
                    //             // the blob is already in memory. Create a blobInfo from the blob, add blobInfo to imageInfo, add imageInfo to planImagesInfo
                    //             let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: fileInfo.url, isDirty: true});
                    //             let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                    //             planImagesInfo.set(filename, imageInfo);
                    //         }
                    //         else {
                    //             // the blob is not yet in memory. Extract the image
                    //             let blobUrl = await this.getImageBlobUrlFromZipFile(filenameFullPath, planImagesInfo);
                    //             // get the blob from the blobUrl
                    //             // https://stackoverflow.com/questions/11876175/how-to-get-a-file-or-blob-from-an-object-url
                    //             let response = await fetch(blobUrl);
                    //             await COL.errorHandlingUtil.handleErrors(response);
                    //             let blob = await response.blob();

                    //             let pathElements = COL.util.getPathElements(fileInfo.filename);
                    //             let extension = pathElements['extension'];

                    //             let imageTags = { filename: fileInfo.filename,
                    //                               imageOrientation: -1 };
                    //             if(extension === 'jpg')
                    //             {
                    //                 imageTags = await COL.core.ImageFile.getImageTags(fileInfo.filename, blob);
                    //             }
                                
                    //             let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: fileInfo.url, isDirty: true});
                    //             let imageInfo = new ImageInfo({filename: filename,
                    //                                            imageTags: imageTags,
                    //                                            blobInfo: blobInfo});
                    //             planImagesInfo.set(filename, imageInfo);
                    //         }
                    //     }
                    //     break;
                    // }
                }
                case "json": {
                    await FileZip_withJson.extractAsBlobUrl( fileInfo, contentType );
                    
                    let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath,
                                                 blobUrl: fileInfo.url,
                                                 isDirty: true});
                    let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                    
                    if(FileZipUtils.isSharedDataBetweenAllSitePlans(filenameFullPath))
                    {
                        otherDataSharedBetweenAllSitePlans.set(filename, imageInfo);
                    }
                    else
                    {
                        planMetaDataFilesInfo.set(filename, imageInfo);
                    }

                    // console.log('filenameFullPath', filenameFullPath);
                    // console.log('blobInfo', blobInfo); 
                    let jsonData = await FileZipUtils.loadFile_viaFetch(filenameFullPath, blobInfo, "json");
                    // console.log('jsonData', jsonData); 
                    
                    let notes_metadata_re = /notes/;
                    let notes_metadata_re_matched = filename.match(notes_metadata_re);
                    
                    if(notes_metadata_re_matched) {
                        if(COL.model.isStickyNotesEnabled()) {
                            // // found notes metadata json file, i.e. sticky notes
                            // COL.core.FileNotes.loadNotesFromJsonFile(layer, filename);
                        }
                    }
                    
                    break;
                }
                default: {
                    let msgStr = 'filename: ' + filename + ', fileType: ' + fileType + ' in .zip file is not supported';
                    throw new Error(msgStr);
                }
                    
            }
        }
    };

    validateVersion = function () {
        // console.log('BEG validateVersion');
        
        let modelVersion = COL.model.getModelVersion();
        let minZipVersion = COL.model.getMinZipVersion();
        let retval = true;
        if(!this.modelVersionInZipFile || (this.modelVersionInZipFile < minZipVersion)) {
            // the .zip file version is invalid (for reading the .zip file)
            console.error('modelVersionInZipFile is invalid. System model version: ' + modelVersion +
                          " , modelVersionInZipFile: " + modelVersionInZipFile +
                          " , minZipVersion supported: " + minZipVersion);
            retval = false;
        }

        return retval;
    };

    validateVersionAndExtractSitesInfo = async function () {
        // console.log('BEG validateVersionAndExtractSitesInfo');
        
        // /////////////////////////////////////////////////////////////
        // validate the version in the zipFile 
        // Extract sitesInfo - based on sitesInfo we create the various layers
        // /////////////////////////////////////////////////////////////
        
        // Get general metadata
        let generalMetadataFilename = "general_metadata.json";
        let imagesInfoOtherData = this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"];
        let imageInfoOtherData = imagesInfoOtherData.getByKey(generalMetadataFilename);
        let blobInfo = imageInfoOtherData.blobInfo;

        if(COL.util.isObjectInvalid(blobInfo) || COL.util.isObjectInvalid(blobInfo.blobUrl)) {
            // should not reach here
            imagesInfoOtherData.printKeysAndValues();
            console.log('generalMetadataFilename', generalMetadataFilename); 
            console.error('Missing file: ' + generalMetadataFilename );
            return false;
        }
        let generalInfo = await FileZipUtils.loadFile_viaFetch(generalMetadataFilename, blobInfo, "json");
        let modelVersionInZipFile = parseFloat(COL.util.getNestedObject(generalInfo, ['generalInfo', 'modelVersion']));
        this.setModelVersionInZipFile(modelVersionInZipFile);
        
        // Validate version
        if( !this.validateVersion() ) {
            // should not reach here
            var msgStr = 'Version validation failed';
            throw new Error(msgStr);
        }
        
        // Get sitesInfo
        let sitesInfoFilename = "sitesInfo.json";
        let imageInfoOtherData2 = imagesInfoOtherData.getByKey(sitesInfoFilename);
        let blobInfo1 = imageInfoOtherData2.blobInfo;

        if(COL.util.isObjectInvalid(blobInfo1) || COL.util.isObjectInvalid(blobInfo1.blobUrl)) {
            // should not reach here
            imagesInfoOtherData.printKeysAndValues();
            console.log('sitesInfoFilename', sitesInfoFilename); 
            console.error('Missing file: ' + sitesInfoFilename );
            return false;
        }

        // load via fetch from blob URL that is in memory (not on webserver)
        let sitesInfo_inFileZip = await FileZipUtils.loadFile_viaFetch(sitesInfoFilename, blobInfo1, "json");
        
        ///////////////////////////////////////////////////////////////
        // fill-in this.sitesInfo_inFileZip
        // convert from:
        //  sitesInfo_inFileZip (uses: snake format, dictionary of dictionaries)
        // to:
        //  sitesInfo_inFileZip (uses: camelCase format, AssociativeArray of AssociativeArrays)
        ///////////////////////////////////////////////////////////////

        this.sitesInfo_inFileZip = new COL.util.AssociativeArray();

        for (let siteId_inFileZip in sitesInfo_inFileZip) {
            let siteInfo_inFileZip = sitesInfo_inFileZip[siteId_inFileZip];
            // console.log('siteInfo_inFileZip', siteInfo_inFileZip);
            
            let siteInfo = COL.model.createSiteInfoFromJson(siteInfo_inFileZip, this.modelVersionInZipFile)
            // console.log('siteInfo3', siteInfo.toString());
            
            this.sitesInfo_inFileZip.set(siteId_inFileZip, siteInfo);
        }
        COL.model.setSitesInfo(this.sitesInfo_inFileZip);

        // https://stackoverflow.com/questions/22266171/javascript-html-select-add-optgroup-and-option-dynamically
        let iterSites = this.sitesInfo_inFileZip.iterator();
        while (iterSites.hasNext()) {
            let siteInfo_inFileZip = iterSites.next();
            let optionGroupEl = $('<optgroup label="' + siteInfo_inFileZip.siteId + '" />');
            
            let iterPlans = siteInfo_inFileZip.getPlans().iterator();
            while (iterPlans.hasNext()) {
                let planInfo_inFileZip = iterPlans.next();
                let path = planInfo_inFileZip.siteId + '/' + planInfo_inFileZip.id;
                let planFilenameFullPath = path + '/' + planInfo_inFileZip.planFilename;
                this.layerJsonFilenames.push(planFilenameFullPath);
                
                // the string in the sitePlan menu
                let optionVal = planInfo_inFileZip.siteId + ":" + planInfo_inFileZip.id + ":" + planInfo_inFileZip.siteName + ":" + planInfo_inFileZip.name;
                $('<option />').html(optionVal).appendTo(optionGroupEl);
            }
            console.log('optionGroupEl', optionGroupEl);
            optionGroupEl.appendTo($('#sitesId'));
        }
    };

    createLayers = function () {
        console.log('BEG createLayers');

        for (let index in this.layerJsonFilenames) {

            let topDownJsonFullPath = this.layerJsonFilenames[index];

            let pathElements = COL.util.getPathElements(topDownJsonFullPath);
            let dirname = pathElements['dirname'];
            let layerJsonFilename = pathElements['filename'];

            let retVal = this.getFilesInfoForSpecifiedFilename(topDownJsonFullPath);
            // let imagesInfo = retVal.imagesInfo;
            let planMetaDataFilesInfo = retVal.planMetaDataFilesInfo;
            // let otherDataSharedBetweenAllSitePlans = retVal.otherDataSharedBetweenAllSitePlans;
            let origSiteId = retVal.origSiteId;
            let origPlanId = retVal.origPlanId;

            let metaDataFileInfo = planMetaDataFilesInfo.getByKey(layerJsonFilename);
            let blobInfo = metaDataFileInfo.blobInfo;

            if(COL.util.isObjectInvalid(blobInfo) || COL.util.isObjectInvalid(blobInfo.blobUrl))
            {            
                // should not reach here
                planMetaDataFilesInfo.printKeysAndValues();
                let msgStr = 'Invalid blobInfo for layerJsonFilename: ' + layerJsonFilename;
                throw new Error(msgStr);
            }

            // Get the plan from the path
            let planInfo = COL.model.getPlanInfoBySiteIdAndPlanId(origSiteId, origPlanId);

            let layer = COL.model.createLayer(planInfo);
            COL.model.addLayer(layer);
        }
    };
    
    populateLayers = async function () {
        // console.log('BEG populateLayers');

        // let numPlans = $("#sitesId option").length;
        // console.log('numPlans1', numPlans);
        
        // /////////////////////////////////////////////////////////////
        // fill in layers with metaDataFilesInfo (e.g. layerJsonFilename)
        // /////////////////////////////////////////////////////////////
        
        let layer0 = undefined;
        
        for (let index in this.layerJsonFilenames) {

            let topDownJsonFullPath = this.layerJsonFilenames[index];
            
            let retVal = this.getFilesInfoForSpecifiedFilename(topDownJsonFullPath);
            let origSiteId = retVal.origSiteId;
            let origPlanId = retVal.origPlanId;
            let imagesInfo = this.sitesFilesInfo["sites"][origSiteId][origPlanId].imagesInfo;
            let metaDataFilesInfo = this.sitesFilesInfo["sites"][origSiteId][origPlanId].metaDataFilesInfo;
            let pathElements = COL.util.getPathElements(topDownJsonFullPath);
            let layerJsonFilename = pathElements['filename'];
            
            // Get the plan from the path
            let planInfo = COL.model.getPlanInfoBySiteIdAndPlanId(origSiteId, origPlanId);
            if(COL.util.isObjectInvalid(planInfo))
            {
                // The .zip file has topDownJsonFullPath (e.g. 1/2/modelWith4Images.structure.layer0.json)
                // that is not in the file sitesInfo.json (e.g. that includes only part of the json files, e.g.
                // 6/8/modelWith4Images.structure.layer0.json, 6/9/modelWith4Images.structure.layer0.json, 7/10/modelWith4Images.structure.layer0.json
                // but not 1/2/modelWith4Images.structure.layer0.json)
                // this is part of bug "only save content that refers ... in notesConstructionOverlay.WebServer.v2.txt"
                // that will be fixed in tbd
                let msgStr = "origSiteId/origPlanId: " + origSiteId + "/" + origPlanId;
                console.warn('planInfo is undefined for: ', msgStr);
                
                continue;
            }

            let layer = COL.model.getLayerByPlanInfo(planInfo);
            if(COL.util.isObjectInvalid(layer)) {
                // sanity check
                // At this point the layer should already be created (pre-exists before reading from the zip file or added in the block above)
                throw new Error('layer is invalid');
            }

            //////////////////////////////////////////////////////////////////////////////////
            // populate the layer with metaDataFilesInfo
            //////////////////////////////////////////////////////////////////////////////////

            // tbd - layer.setImagesInfo is called later on in the function again - maybe not needed here.
            layer.setImagesInfo(imagesInfo);
            layer.setMetaDataFilesInfo(metaDataFilesInfo);

            let topDownJsonFileInfo = metaDataFilesInfo.getByKey(layerJsonFilename); 
            let topDownJsonBlobInfo = topDownJsonFileInfo.blobInfo;
            if(COL.util.isObjectInvalid(topDownJsonBlobInfo) || COL.util.isObjectInvalid(topDownJsonBlobInfo.blobUrl))
            {
                metaDataFilesInfo.printKeysAndValues();
                let msgStr = 'Invalid blobInfo for layerJsonFilename: ' + layerJsonFilename;
                throw new Error(msgStr);
            }
            await FileZipUtils.loadFile_viaFetch(layerJsonFilename, topDownJsonBlobInfo, "json");

            //////////////////////////////////////////////////////////////////////////////////
            // populate the layer with imagesInfo
            //////////////////////////////////////////////////////////////////////////////////

            // Load files related to topDownJson file (e.g. floorPlan image file,  overlay image files) into imageInfoVec
            await COL.loaders.CO_ObjectLoader.loadLayerJsonFile_fromZipFile(layerJsonFilename, layer);

            let imageInfoVec = layer.getImagesInfo();
            // loop over the entries of imageInfoVec. Construct blobInfo for every entry
            let iter = imageInfoVec.iterator();
            while (iter.hasNext()) {
                let keyVal = iter.nextKeyVal();
                let filename = keyVal[0];
                let imageInfo = keyVal[1];
                let imageFilenameFullPath = origSiteId + '/' + origPlanId + '/' + filename;
                let blobInfo = new BlobInfo({filenameFullPath: imageFilenameFullPath, blobUrl: undefined, isDirty: false});
                imageInfo.blobInfo = blobInfo;
            }
            
            // Merge entries in imageInfoVec into imagesInfo
            imagesInfo.mergeArray(imageInfoVec);
            
            layer.setImagesInfo(imagesInfo);

            layer.setLayerJsonFilename(layerJsonFilename);

            layer0 = layer;
        }

        // /////////////////////////////////////////////////////////////
        // tbd - setSelectedLayer to the first layer ?
        // /////////////////////////////////////////////////////////////

        COL.model.setSelectedLayer(layer0);

        let selectedLayer = COL.model.getSelectedLayer();
        let imagesInfo = selectedLayer.getImagesInfo();
        // imagesInfo.printKeysAndValues();
        
        $(document).trigger("SceneLayerAdded", [layer0, COL.model.getLayers().size()]);
        // console.log('layer0', layer0);
        // console.log('layer0.planInfo', layer0.planInfo);

        let matchPattern = layer0.planInfo.siteId + ":" + layer0.planInfo.id + ":" + layer0.planInfo.siteName + ":" + layer0.planInfo.name;
        
        let sceneBar = COL.model.getSceneBar();
        let optionIndex = sceneBar.findOptionIndexBySubstrInVal(matchPattern);
        if(optionIndex)
        {
            $('#sitesId')[0].selectedIndex = optionIndex;
        }

        
        return true;
    };

    
    static getContentTypeFromFilename = function (filename) {
        let fileType = COL.util.getFileTypeFromFilename(filename);
        let contentType;
        switch(fileType) {
            case "jpg": {
                contentType = 'image/jpeg';
                break;
            }
            case "png": {
                contentType = 'image/png';
                break;
            }
            case "json": {
                contentType = 'application/json';
                // contentType = 'text/plain';
                break;
            }
                
            default: {
                var msgStr = 'Error from getContentTypeFromFilename(). fileType: ' +
                    fileType + ' is not supported';
                throw new Error(msgStr);
            }
        }
        
        return contentType;
    }
    
    // create blobInfo (if needed, extract blob as blob url), add to the imagesInfo or metaDataFilesInfo list, and return blobInfo
    // filesInfo is a placeholder for imagesInfo, or metaDataFilesInfo:
    // - When adding an image file (e.g. .jpg, .png), filesInfo === imagesInfo
    // - When adding an metaData file (e.g. .json, .txt), filesInfo === metaDataFilesInfo
    addBlobToFilesInfo = async function (filenameFullPath, filesInfo) {
        // console.log('BEG addBlobToFilesInf1o');
        
        try
        {
            // loop over keys
            let pathElements = COL.util.getPathElements(filenameFullPath);
            let dirname = pathElements['dirname'];
            let filename = pathElements['filename'];
            var fileExtention = COL.util.getFileExtention(filename);
            let zipFileInfo = COL.model.getZipFileInfo();

            let fileInfo = null;
            fileInfo = zipFileInfo.files[filenameFullPath];
            
            let blobInfo;
            let fileType2 = COL.util.getFileTypeFromFilename(filename);
            let contentType = FileZip_withJson.getContentTypeFromFilename(filename);
            switch(fileType2) {
                case "jpg":
                case "png": {
                    if (fileInfo.url) {
                        // the url already exists
                        blobInfo = new BlobInfo({filenameFullPath: filenameFullPath,
                                                 blobUrl: fileInfo.url,
                                                 isDirty: true});
                        let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                        filesInfo.set(filename, imageInfo);
                    }
                    else {
                        
                        // the url does not exist
                        await FileZip_withJson.extractAsBlobUrl( fileInfo, contentType );

                        blobInfo = new BlobInfo({filenameFullPath: filenameFullPath,
                                                 blobUrl: fileInfo.url,
                                                 isDirty: false});
                        
                        let pathElements = COL.util.getPathElements(fileInfo.filename);
                        let extension = pathElements['extension'];

                        // initialize imageTags to default values
                        let imageTags = { filename: fileInfo.filename,
                                          imageOrientation: -1 };
                        if(extension === 'jpg')
                        {
                            let response = await fetch(blobInfo.blobUrl);
                            await COL.errorHandlingUtil.handleErrors(response);
                            let blob = await response.blob();
                            imageTags = await COL.core.ImageFile.getImageTags(fileInfo.filename, blob);
                        }

                        let imageInfo = new ImageInfo({filename: filenameFullPath,
                                                       imageTags: imageTags,
                                                       blobInfo: blobInfo});
                        filesInfo.set(filename, imageInfo);
                    }
                    break;
                }
                case "json": {
                    await FileZip_withJson.extractAsBlobUrl( fileInfo, contentType );

                    blobInfo = new BlobInfo({filenameFullPath: filenameFullPath,
                                             blobUrl: fileInfo.url,
                                             isDirty: true});
                    let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                    filesInfo.set(filename, imageInfo);
                    break;
                }
                    
                default: {
                    var msgStr = 'filename: ' + filename + ', fileExtension: ' + fileExtention + ' in .zip file is not supported';
                    throw new Error(msgStr);
                }
            }
            return blobInfo;
        }
        catch (err)
        {
            console.error('err', err);
            throw new Error(400);
        }
    };

    getImageBlobUrlFromZipFile = async function (imageFilenameFullPath, imagesInfo) {
        // console.log('BEG getImageBlobUrlFromZipFile');

        try
        {
            let zipFileInfo = COL.model.getZipFileInfo();
            let fileInfo1 = null;
            let blobInfo = null;
            fileInfo1 = zipFileInfo.files[imageFilenameFullPath];
            if(!fileInfo1)
            {
                // console.log('zipFileInfo.files', zipFileInfo.files); 
                let msgStr = 'fileInfo1 is undefined. imageFilename: ' + imageFilenameFullPath;
                throw msgStr;
            }

            // The file is not yet in memory, but its offset is stored in memory.
            // Load the file from the zip file into memory and render
            // unzip the image files (that were skipped in the initial load)

            // tbd - set doReadArrayBufferInChunks, if the zip file size passes a threshold (500 MB?)

            let sliceBeg = fileInfo1.offsetInZipFile;
            let sliceEnd = sliceBeg +
                fileInfo1.headerSize +
                fileInfo1.compressedSize;
            
            // console.log('imageFilenameFullPath', imageFilenameFullPath); 
            let doSkipFileData = false;
            await FileZip_withJson.loadFromZipFile(sliceBeg, sliceEnd, doSkipFileData, imageFilenameFullPath);

            // {
            //     console.log('imagesInfo.size()', imagesInfo.size()); 
            //     let iter = imagesInfo.iterator();
            //     let numBlobUrls = 0;
            //     while (iter.hasNext()) {
            //         let imageInfo = iter.next();
    	    //         let blobInfo = imageInfo.blobInfo;

            //         if(COL.util.isObjectValid(blobInfo) && COL.util.isObjectValid(blobInfo.blobUrl)) {
            //             numBlobUrls ++;
            //         }
            //     }
            //     // console.log('numBlobUrls', numBlobUrls); 
            // }

            // before...
            // console.log('fileInfo1', fileInfo); 
            
            // let zipFileInfoSizeInBytes1 = COL.util.roughSizeOfObject(zipFileInfo);
            // console.log('zipFileInfoSizeInBytes1', COL.util.numberWithCommas(zipFileInfoSizeInBytes1));

            blobInfo = await COL.model.fileZip.addBlobToFilesInfo(imageFilenameFullPath, imagesInfo);

            // after...

            // console.log('fileInfo2', fileInfo);

            // let zipFileInfoSizeInBytes2 = COL.util.roughSizeOfObject(zipFileInfo);
            // console.log('zipFileInfoSizeInBytes2', COL.util.numberWithCommas(zipFileInfoSizeInBytes2));
            

            // // retval has large size because it has the decoded file.buffer ~20MB
            // // but retval is a local variable so the size does not persist beyond this function...
            // let retvalSizeInBytes2 = COL.util.roughSizeOfObject(retval);
            // console.log('retvalSizeInBytes2', COL.util.numberWithCommas(retvalSizeInBytes2)); 

            return blobInfo.blobUrl;
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = "getImageBlobUrlFromZipFile";
            let msgStr = "Failed to getImageBlobUrlFromZipFile." + err;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }

            throw new Error(msgStr);
        }
        
    };


    // --------------------------------------------------------------

    isExtensionValid = function (extension) {
        switch (extension.toLowerCase()) {
            case "zip":
                return true;
        }
        return false;
    }

    // Loads slice from the zip file in pure webapp or in jasonette_android
    static getZipFileSlice = async function(sliceBeg, sliceEnd)
    {
        try
        {
            const zipFileInfo = COL.model.getZipFileInfo();
            let zipFile = zipFileInfo.zipFile;
            let zipFileName = zipFileInfo.zipFileName;
            let zipFileUrl = zipFileInfo.zipFileUrl;
            
            let blobSlice = null;

            if( COL.util.isObjectInvalid(window.$agent_jasonette_android) )
            {
                // in non-mobile webapp
                try
                {
                    blobSlice = zipFile.slice(sliceBeg, sliceEnd);
                    
                    if(blobSlice.size == 0)
                    {
                        throw new Error("blob size is 0");
                    }
                }
                catch(err) {
                    console.log('zipFile', zipFile);
                    console.error('err', err);

                    // raise a toast to indicate the failure
                    let toastTitleStr = "foo7";
                    let msgStr = "Failed to foo7." + err;
                    if(COL.doEnableToastr)
                    {
                        toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                    }
                    else
                    {
                        console.error(msgStr);
                    }

                    throw new Error(msgStr);
                }
            }
            else
            {
                // in mobile app jasonette-android

                let queryParams = new URLSearchParams({
                    sliceBeg: sliceBeg,
                    sliceEnd: sliceEnd
                });

                // create the query params string with sliceBeg, sliceEnd
                let queryParamsStr = queryParams.toString();

                // e.g. "sliceBeg=0&sliceEnd=5000"
                // console.log('queryParamsStr: ', queryParamsStr);
                
                // create the url string
                let url = COL.model.getUrlBase() + 'zipfile?' + queryParamsStr;
                let response = await fetch(url);
                // console.log('response.status', response.status); 

                await COL.errorHandlingUtil.handleErrors(response);
                blobSlice = await response.blob();
            }
            return blobSlice;
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = "getZipFileSlic1e";
            let msgStr = "Failed to getZipFileSlic1e." + err;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }

            throw new Error(msgStr);
        }
        
    };


    // https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript

    static b64toBlob = function(filenameInZipFile, b64Data, contentType='', sliceSize=512)
    {
        try
        {
            const byteCharacters = atob(b64Data);

            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);

                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            const blob = new Blob(byteArrays, {type: contentType});

            // const byteNumbers2 = new Array(byteCharacters);
            // const byteArray2 = new Uint8Array(byteNumbers2);
            // const blob = new Blob(byteArray2, {type: contentType});
            
            return blob;
            
        }
        catch(err) {
            console.error('err', err);

            console.log('filenameInZipFile', filenameInZipFile); 
            console.log('b64Data', b64Data);

            
            // raise a toast to indicate the failure
            let toastTitleStr = "b64toBlob";
            let msgStr = "Failed to b64toBlob. " + err;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }

            throw new Error(msgStr);
        }
    }
    
    // Loads slice from the zip file in jasonette_ios
    static getZipFileSlice_native_ios = async function(filenameInZipFile)
    {
        try
        {
            // in mobile app jasonette-ios
            const zipFileInfo = COL.model.getZipFileInfo();
            let zipFile = zipFileInfo.zipFile;
            let zipFileName = zipFileInfo.zipFileName;
            let zipFileUrl = zipFileInfo.zipFileUrl;
            
            if(COL.util.isObjectInvalid(window.$agent_jasonette_ios))
            {
                // sanity check
                throw new Error("window.$agent_jasonette_ios is invalid");
            }

            // console.log('foo3 111');

            // console.log('window', window);
            // console.log('window.webview', window.webview); 

            // /////////////////////////////////////////////////////////////
            // // try4 - using promise-with-jasonette 
            // /////////////////////////////////////////////////////////////

            // console.log('Before try4444444');
            let blob = null;

            // console.log('filenameInZipFile', filenameInZipFile);
            
            let zipFileEntry_base64Encoded = await extractZipFile_native_ios(filenameInZipFile);
            // console.log('extractZipFile_native_ios zipFileEntry_base64Encoded', zipFileEntry_base64Encoded);

            let contentType = FileZip_withJson.getContentTypeFromFilename(filenameInZipFile);
            blob = FileZip_withJson.b64toBlob(filenameInZipFile, zipFileEntry_base64Encoded, contentType);

            return blob;
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = "getZipFileSlice_native_ios";
            let msgStr = "Failed to getZipFileSlice_native_ios. " + err;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }

            throw new Error(msgStr);
        }
        
    };


    // Loads blob slice (optionally the entire blob) from the zip file, and reads it into the layer
    static loadFromZipFile = async function (sliceBeg, sliceEnd, doSkipFileData, filenameInZipFile = undefined) {
        // console.log('BEG loadFromZipFil1e');
        try
        {
            let zipFileInfo = COL.model.getZipFileInfo();

            if( COL.util.isObjectInvalid(window.$agent_jasonette_ios) )
            {
                // in non-mobile webapp, or in mobile app jasonette-android
                let blobSlice = await FileZip_withJson.getZipFileSlice(sliceBeg, sliceEnd);

                // console.log('blobSlice.size', COL.util.numberWithCommas(blobSlice.size)); 

                // https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer
                // read the array buffer (blob.arrayBuffer() is newer than readAsArrayBuffer())

                let blobSliceArrayBuffer = await blobSlice.arrayBuffer();
                // console.log('blobSliceArrayBuffer.byteLength', blobSliceArrayBuffer.byteLength);
                // let dataView = new DataView(blobSliceArrayBuffer);
                
                ApiService.LOAD_FROM_TYPE = ApiService.API_SERVICE_TYPES.ApiServiceZip;

                // console.log('doSkipFileData', doSkipFileData);
                var zipLoader = new ZipLoader();
                await ZipLoader.unzip( zipLoader, blobSliceArrayBuffer, doSkipFileData );
                if(COL.util.isObjectValid(filenameInZipFile)) {
                    zipFileInfo.files[filenameInZipFile].buffer = zipLoader.files[filenameInZipFile].buffer;
                }
                
                // let zipLoaderSizeInBytes0 = COL.util.roughSizeOfObject(zipLoader);
                // console.log('zipLoaderSizeInBytes0', COL.util.numberWithCommas(zipLoaderSizeInBytes0));
                return zipLoader;
            }
            else
            {
                // in mobile app jasonette-ios
                let blobSlice = await FileZip_withJson.getZipFileSlice_native_ios(filenameInZipFile);

                let blobSliceArrayBuffer = await blobSlice.arrayBuffer();
                // console.log('blobSliceArrayBuffer.byteLength', blobSliceArrayBuffer.byteLength);
                
                ApiService.LOAD_FROM_TYPE = ApiService.API_SERVICE_TYPES.ApiServiceZip;
                
                zipFileInfo.files[filenameInZipFile].buffer = blobSliceArrayBuffer;
            }
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = "loadFromZipFil1e";
            let msgStr = "Failed to loadFromZipFil1e." + err;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }

            throw new Error(msgStr);
        }
        
    };

    // this function is called for the non-mobile webapp.
    // (in case of mobile webapp loading the zip file headers is done
    //  by trigerring a call to jasonette).
    loadZipfileHeaders_nonMobile = async function (zipFile) {
        console.log('BEG loadZipfileHeaders_nonMobile'); 

        let retval;
        // store the zip file object. It is used for reading specific files 
        // individually from the zip file, later on

        let zipFileUrl = URL.createObjectURL(zipFile);
        
        let zipFileInfo = {
            zipFile: zipFile,
            zipFileName: zipFile.name,
            zipFileUrl: zipFileUrl,
            files: {} };
        
        COL.model.setZipFileInfo(zipFileInfo);
        
        // console.log('Unzip the file', zipFile.name);
        // Read the entire file to get the offsets
        let doSkipFileData = true;
        // console.log('zipFile.size', zipFile.size); 
        
        // MAX_BLOB_SLICE_SIZE_IN_BYTES needs to be bigger than the maximum individual file in the .zip file
        // 100 MB
        const MAX_BLOB_SLICE_SIZE_IN_BYTES = Number("1E8");
        let sliceBeg = 0;

        let numTotalBytesRead = 0;
        while(numTotalBytesRead < zipFile.size) {
            let sliceEnd = (sliceBeg + MAX_BLOB_SLICE_SIZE_IN_BYTES < zipFile.size) ?
                sliceBeg + MAX_BLOB_SLICE_SIZE_IN_BYTES :
                zipFile.size;

            // no need to specify the parameter filenameInZipFile to loadFromZipFil1e()
            // as it is only used for jasonette_ios, and this function (loadZipfileHeaders_nonMobile)
            // is not used in jasonette_ios.
            let retval = await FileZip_withJson.loadFromZipFile(sliceBeg, sliceEnd, doSkipFileData);
            if(retval.numBytesRead == 0)
            {
                // nothing was read in the last slice, i.e. we reached the last zip entry
                break;
            }

            // loop over the retval.files
            // calc the absolute file offset from the relative offset to the blobSlice
            for (const filenameFullPath of Object.keys(retval.files)) {
                retval.files[filenameFullPath].offsetInZipFile += sliceBeg;
                zipFileInfo.files[filenameFullPath] = retval.files[filenameFullPath];
            }
            
            sliceBeg += retval.numBytesRead;
            numTotalBytesRead += retval.numBytesRead;
        }
    
    };
    
    // Loads the zip file, and reads it into the layer.
    // The zip file is loaded in slices.
    // The variable zipFile is only used in non-mobile webapp.
    // In mobile app, the zipfile info is taken from model._zipFileInfo.files
    openSingleZipFile = async function (zipFile) {
        console.log('BEG openSingleZipFile'); 

        let spinnerJqueryObj = $('#cssLoaderId');
        spinnerJqueryObj.addClass("is-active");

        let toastTitleStr = "Load from zip file";
        try{

            if( COL.util.isObjectInvalid(window.$agent_jasonette_android) && COL.util.isObjectInvalid(window.$agent_jasonette_ios) )
            {
                // in non-mobile webapp
                if (!(zipFile instanceof File)) {
                    console.error("Error from openSingleZipFile(): the parameter 'zipFile' must be a File instance.");
                    throw new Error('Error from openSingleZipFile');
                }

                // Add zipFile to opened list
                this.openedZipFileList.set(zipFile.name, zipFile);
                
                // Validate file extension
                let extension = COL.util.getFileTypeFromFilename(zipFile.name);
                if (!this.isExtensionValid(extension)) {
                    console.error("The file must have '.zip' suffix. \nTry again.");
                    spinnerJqueryObj.removeClass("is-active");
                    throw new Error("Not a zip file: " + zipFile.name);
                }

                // load the zip file headers
                console.time("time loadZipfileHeaders_nonMobile");
                await this.loadZipfileHeaders_nonMobile(zipFile);
                console.timeEnd("time loadZipfileHeaders_nonMobile");
            }
            else
            {
                // in mobile app - the headers are already loaded
                // (in model._zipFileInfo.files )
            }
            
            FileZipUtils.filenamesFailedToLoad = [];

            console.time("time loadFilesFromZipFileInfoIntoBlobs_via_ZipLoader");
            await this.loadFilesFromZipFileInfoIntoBlobs_via_ZipLoader();
            console.timeEnd("time loadFilesFromZipFileInfoIntoBlobs_via_ZipLoader");

            await this.validateVersionAndExtractSitesInfo();
            
            this.createLayers();

            await this.populateLayers();
            
            await COL.colJS.onSitesChanged();

            let msgStr = "Succeeded to load";
            if(COL.doEnableToastr)
            {
                toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.log(msgStr);
                // alert(msgStr);
            }
        }
        catch(err) {
            console.error('err', err);
            
            let filenamesFailedToLoadAsStr = FileZipUtils.filenamesFailedToLoad.join();
            let msgStr = "Failed to load. ";
            if(filenamesFailedToLoadAsStr !== '')
            {
                // let msgStr = "Failed to load from zip file. Failed files: " + filenamesFailedToLoadAsStr;
                // COL.errorHandlingUtil.bootstrap_alert_danger(msgStr);
                msgStr += "Failed files: " + filenamesFailedToLoadAsStr;
            }
            else
            {
                msgStr += err;
            }
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }
        }

        spinnerJqueryObj.removeClass("is-active");
        
    };

    static addNewPlan = async function (planInfo) {

        let getSiteByNameResultAsJson = await COL.model.getSiteByName(planInfo.siteName);

        let siteId = null;
        if(getSiteByNameResultAsJson.name) {
            let siteName = getSiteByNameResultAsJson.name;
            let msgStr = 'siteName: ' + siteName + ' already exists for the user';
            console.log(msgStr);
            siteId = getSiteByNameResultAsJson.id;
        }
        else {
            let msgStr = 'siteName: ' + planInfo.siteName + ' do NOT exist for the user';
            console.log(msgStr);
            let addNewSiteResultAsJson = await FileZipUtils.addNewSite(planInfo);
            siteId = addNewSiteResultAsJson.id;
        }

        // tbd - add the plan and update planInfo
        let addNewSitePlanResultAsJson = await FileZip_withJson.addNewSitePlan(siteId, planInfo);
        console.log('addNewSitePlanResultAsJson', addNewSitePlanResultAsJson); 
        return addNewSitePlanResultAsJson;
    };

    // extractAsBlobUrl fills-in fileInfo.buffer, (fileInfo points to an entry in zipFileInfo.files[xxx])
    static extractAsBlobUrl = async function (fileInfo, contentType) {
        // console.log('BEG extractAsBlobUrl');
        
        if (fileInfo.url) {
            return fileInfo.url;
        }

        if(COL.util.isObjectInvalid(fileInfo.buffer)) {
            // get the buffer
            await FileZip_withJson.readZipEntryData(fileInfo.filename);
        }
        
        if(COL.util.isObjectValid(fileInfo.buffer)) {
            var blob = new Blob([fileInfo.buffer], { type: contentType });
            fileInfo.url = URL.createObjectURL(blob);
            // after creating the blobUrl we can clear fileInfo.buffer
            fileInfo.buffer = null;
        }
        else
        {
            throw new Error("Error from extractAsBlobUrl: Failed to read the buffer for file: " + fileInfo.filename);
        }
        
        return;
    };

    // Load the image file data from the zip file as blob into memory
    static readZipEntryData = async function (filename) {
        
        let zipFileInfo = COL.model.getZipFileInfo();
        let zipFileInfoFile = zipFileInfo.files[filename];
        console.log('zipFileInfo.files[filename]', zipFileInfo.files[filename]); 
        let sliceBeg = zipFileInfo.files[filename].offsetInZipFile;
        let sliceEnd = sliceBeg +
            zipFileInfo.files[filename].headerSize +
            zipFileInfo.files[filename].compressedSize;

        let doSkipFileData = false;
        await FileZip_withJson.loadFromZipFile(sliceBeg, sliceEnd, doSkipFileData, filename);
        
        // zipFileInfo.files[filename].buffer = null;
        
        // let fileType = COL.util.getFileTypeFromFilename(filename);
        // console.log('fileType', fileType);
        // console.log('zipFileInfo.files[filename]', zipFileInfo.files[filename]);
        // if(fileType == "json")
        // {
        //     let retval1 = await FileZip_withJson.loadFromZipFil1e(sliceBeg, sliceEnd, doSkipFileData, filename);
        //     zipFileInfo.files[filename].buffer = retval1.files[filename].buffer;
        // }
        // else
        // {
        //     console.log('foo1'); 
        // }


        // {
        //     // sanity check - count the number of entries with valid "fileInfo.buffer" in zipFileInfo.files
        //     let numValidBuffers = 0;

        //     for (const [key, value] of Object.entries(zipFileInfo.files)) {
        //         // console.log(key, value);
        //         let fileInfo2 = value;
        //         if(COL.util.isObjectValid(fileInfo2.buffer)) {
        //             console.log('fileInfo2', fileInfo2);
        //             numValidBuffers++;
        //         }
        //     }
            
        //     console.log('numValidBuffers in zipFileInfo.files', numValidBuffers); 
        // }
        // console.log('foo1'); 
        
    };

    static addNewSitePlan = function (siteId, planInfo) {
        console.log('BEG addNewSitePlan');

        return new Promise(async function(resolve, reject) {
            // ////////////////////////////////////////////////
            // POST - Add new metadata
            // ////////////////////////////////////////////////

            console.log('planInfo', planInfo); 

            let plan_url = planInfo.planFilename;
            let jsonData = {plan_name: planInfo.name,
                            plan_url: plan_url,
                            is_selected: false,
                            site_id: siteId};
            let jsonDataAsStr = JSON.stringify(jsonData);
            console.log('jsonDataAsStr', jsonDataAsStr);
            
            let postNewSitePlanUrl = COL.model.getUrlBase() + 'api/v1_2/create_plan';

            let headersData = {
                'Content-Type': 'application/json',
                'X-CSRF-Token': COL.model.csrf_token
            };

            let fetchData = { 
                method: 'POST', 
                body: jsonDataAsStr,
                headers: headersData
            };
            
            let dataAsJson = await fetch(postNewSitePlanUrl, fetchData).then(response => response.json());
            resolve(dataAsJson);
        });
        
    };

};

window.resolvePromise = resolvePromise;
FileZip_withJson.zipLibrary = "ZipLoader";

export { FileZip_withJson };
