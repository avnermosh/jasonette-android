
// global JSZipUtils
// global JSZip
// global uploadToDropbox_viaImplicitGrant

import { COL } from  "../COL.js";
import { Model } from "../core/Model.js";
import { Layer } from "../core/Layer.js";
import { BlobInfo } from "../core/BlobInfo.js";
import { ApiService } from "../core/ApiService.js";
import "../core/Core.js";
import { ImageInfo } from "../core/ImageInfo.js";
import { ZipLoader } from "../../include/ZipLoader.module.js";
import { PlanInfo } from "../util/PlanInfo.js";
import { Scene3DtopDown } from "../core/Scene3DtopDown.js";
import "../util/Util.js";
import "../util/Util.AssociativeArray.js";
import "../util/ErrorHandlingUtil.js";
import { FileZipUtils } from "./FileZipUtils.js";


'use strict';

class FileZip_withJson {

    constructor(name, planInfo){
        this.openedZipFileList = new COL.util.AssociativeArray();
        this.sitesInfo_inFileZip = new COL.util.AssociativeArray();

        this.sitesFilesInfo = {};
        this.sitesFilesInfo["sites"] = {};
        this.sitesFilesInfo["otherDataSharedBetweenAllSitePlans"] = new COL.util.AssociativeArray();
        this.layerJsonFilenames = [];
        this._zipLoaderInstance = -1;
        this.modelVersionInZipFile = undefined;
    };

    saveFromWebServerToZipFile_viaRegularZip2 = function (groupId) {
        return FileZipUtils.saveFromWebServerToZipFile_viaRegularZip(groupId);
    };

    getZipLoaderInstance = function () {
        return this._zipLoaderInstance;
    };

    setZipLoaderInstance = function (zipLoaderInstance) {
        console.log('BEG setZipLoaderInstance');
        
        this._zipLoaderInstance = zipLoaderInstance;
    };

    setModelVersionInZipFile = function(modelVersionInZipFile) {
        this.modelVersionInZipFile = modelVersionInZipFile;
    };
    

    // /////////////////////////////////////////////////////////////////////////
    // ZipLoader related functions
    // /////////////////////////////////////////////////////////////////////////
    

    extractFilesFromZipLoaderInstance = async function (zipLoaderInstance) {

        FileZipUtils.filenamesFailedToLoad = [];
        
        this.setZipLoaderInstance(zipLoaderInstance);
        // tbd

        // extractFilesFromZipLoaderInstanceStep1 -> loadFilesFromZipFileIntoBlobs
        console.time("time loadFilesFromZipFileIntoBlobs");
        await this.loadFilesFromZipFileIntoBlobs();
        console.timeEnd("time loadFilesFromZipFileIntoBlobs");

        // extractFilesFromZipLoaderInstanceStep2 -> validateVersionAndExtractSitesInfo
        console.time("time validateVersionAndExtractSitesInfo");
        await this.validateVersionAndExtractSitesInfo();
        console.timeEnd("time validateVersionAndExtractSitesInfo");
        
        this.createLayers();

        await this.populateLayers();
        
        return true;
    };

    // /////////////////////////////////////////////////////////////////////////
    // save using regular zip utility on webServer (a.k.a. Content-Disposition) - related functions
    // /////////////////////////////////////////////////////////////////////////


    
    // /////////////////////////////////////////////////////////////////////////
    // JsZip related functions
    // /////////////////////////////////////////////////////////////////////////

    
    isSiteValidForUpload = async function (siteInfo_inFileZip) {
        // console.log('BEG isSiteValidForUpload'); 
        
        /////////////////////////////////////////////
        // Check if the site is valid to be uploaded to the website
        /////////////////////////////////////////////
        
        let getSiteByNameResultAsJson = await COL.model.getSiteByName(siteInfo_inFileZip.siteName);

        let retval1 = {
            'retval': false,
            'siteInfo_inBackend': {}
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

                if(COL.util.isObjectValid(blobInfo.blobUrl)) {
                    // console.log('revokeObjectURL for blobInfo.blobUrl');
                    URL.revokeObjectURL(blobInfo.blobUrl);
                    blobInfo.blobUrl = null;
                }
                // mark the "buffer" as empty and "url" as null to indicate that the blob is no longer in memory
                // the buffer and url is the same in blobInfo.blobUrl, which is released above
                // (the memory is cleared via "revokeObjectURL(blobInfo.blobUrl)"
                this._zipLoaderInstance.files[filenameFullPath].buffer = "";
                // console.log('revokeObjectURL for zipLoaderInstance.files[filenameFullPath].url');
                // URL.revokeObjectURL(zipLoaderInstance.files[filenameFullPath].url);
                this._zipLoaderInstance.files[filenameFullPath].url = null;
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
                // tbd - maybe only open the zip ifle and read specific file for big files, and for small files e.g. < 100B keep the Model::_zipFileArrayBuffer ??
                //
                // The file is not yet in memory, but its offset is stored in memory.
                // Unzip the image file (that was skipped in the initial load)
                // Parse the image (get the buffer) into a new zipLoaderInstanceForSlice
                // Load the image file from the zip file as blob into memory

                let offsetInZipFile = this._zipLoaderInstance.files[filenameFullPath].offset;
                let compressedSize = this._zipLoaderInstance.files[filenameFullPath].compressedSize;
                let headerSize = this._zipLoaderInstance.files[filenameFullPath].headerSize;
                let zipFileObj = COL.model.getZipFileObj();
                let sliceBeg = offsetInZipFile;
                let sliceEnd = offsetInZipFile + headerSize + compressedSize;
                let zipFileObjSlice = zipFileObj.slice(sliceBeg, sliceEnd);
                let doSkipJpg = false;
                let offsetInArrayBuffer = 0;

                let zipLoaderInstanceForSlice = await this.loadFromZipFile(zipFileObjSlice, doSkipJpg, offsetInArrayBuffer);
                let fileInfo = zipLoaderInstanceForSlice.files[filenameFullPath]
                
                this._zipLoaderInstance.files[filenameFullPath].buffer = fileInfo.buffer;

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
            this._zipLoaderInstance.files[filenameFullPath].buffer = "";
            // console.log('revokeObjectURL for this._zipLoaderInstance.files[filenameFullPath].url');
            // URL.revokeObjectURL(this._zipLoaderInstance.files[filenameFullPath].url);
            this._zipLoaderInstance.files[filenameFullPath].url = null;

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
            'retval': retval1,
            'syncZipSitesWithWebServer_statusStr': syncZipSitesWithWebServer_statusStr
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
        console.log('BEG getFilesInfoForSpecifiedFilename');
        
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

    loadFilesFromZipFileIntoBlobs = async function () {

        // /////////////////////////////////////////////////////////////
        // Load files from zip file into blobs
        // skip jpg images
        // /////////////////////////////////////////////////////////////

        console.log('Load files from zip file into blobs');
        // loop over keys
        let filenames = Object.keys(this._zipLoaderInstance.files);
        let numFiles = filenames.length;
        let countIndex = 0;

        let msgStr = countIndex + "Loading " + numFiles + " files";
        let numFilesBetweenReporting = 10;
        
        for (var key in filenames) {

            if( (countIndex % numFilesBetweenReporting) == 0 )
            {
                // show progress - update the spinner, and send a log message with the number of files
                // that were loaded so far
                let msgStr = countIndex + " out of " + numFiles;
                console.log(msgStr);
                // if(COL.doWorkOnline)
                {
                    let spinnerEl = document.getElementById('cssLoaderId');
                    spinnerEl.setAttribute('data-text', msgStr);
                }
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
                    else
                    {
                        // separate to 2 groups:
                        // a. floor plan images e.g. xxx_ground1.jpg
                        // b. all other images e.g. IMG_6399.jpg

                        // tbd - regex to match the floor plan images e.g. ground1... ?
                        let re2 = /^image.*\.jpg$/;
                        let overlayRectImageRegexMatched = filename.match(re2);

                        if(overlayRectImageRegexMatched) {
                            // do not load the actual image
                            
                            // Create a placeholder blobInfo, add blobInfo to imageInfo, add imageInfo to planImagesInfo
                            let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: undefined, isDirty: true});
                            let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                            planImagesInfo.set(filename, imageInfo);
                        }
                        else {
                            // load the actual image
                            if (this._zipLoaderInstance.files[filenameFullPath].url) {
                                // the blob is already in memory. Create a blobInfo from the blob, add blobInfo to imageInfo, add imageInfo to planImagesInfo
                                let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: this._zipLoaderInstance.files[filenameFullPath].url, isDirty: true});
                                let imageInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                                planImagesInfo.set(filename, imageInfo);
                            }
                            else {
                                // the blob is not yet in memory. Extract the image
                                let blobUrl = await this.getImageBlobUrlFromZipFile(filenameFullPath, planImagesInfo);
                                // get the blob from the blobUrl
                                // https://stackoverflow.com/questions/11876175/how-to-get-a-file-or-blob-from-an-object-url
                                let response = await fetch(blobUrl);
                                await COL.errorHandlingUtil.handleErrors(response);
                                let blob = await response.blob();
                                let imageAttributes = await this._zipLoaderInstance.getImageAttributes(filenameFullPath, blob);

                                let blobInfo = new BlobInfo({filenameFullPath: imageAttributes.filenameFullPath, blobUrl: imageAttributes.url, isDirty: true});
                                let imageInfo = new ImageInfo({filename: filename,
                                                               imageTags: imageAttributes.imageTags,
                                                               blobInfo: blobInfo});
                                planImagesInfo.set(filename, imageInfo);
                            }
                        }
                        break;
                    }
                }
                case "json": {
                    let blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: this._zipLoaderInstance.extractAsBlobUrl( filenameFullPath, 'text/plain' ), isDirty: true});
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
        console.log('BEG populateLayers');
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
                let blobInfo = new BlobInfo({filenameFullPath: imageFilenameFullPath, blobUrl: undefined, isDirty: true});
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
        console.log('layer0', layer0);
        console.log('layer0.planInfo', layer0.planInfo);

        let matchPattern = layer0.planInfo.siteId + ":" + layer0.planInfo.id + ":" + layer0.planInfo.siteName + ":" + layer0.planInfo.name;
        
        let sceneBar = COL.model.getSceneBar();
        let optionIndex = sceneBar.findOptionIndexBySubstrInVal(matchPattern);
        if(optionIndex)
        {
            $('#sitesId')[0].selectedIndex = optionIndex;
        }

        
        return true;
    };
    
    // create blobInfo (if needed, extract blob as blob url), add to the imagesInfo or metaDataFilesInfo list, and return blobInfo
    // filesInfo is a placeholder for imagesInfo, or metaDataFilesInfo:
    // - When adding an image file (e.g. .jpg, .png), filesInfo === imagesInfo
    // - When adding an metaData file (e.g. .json, .txt), filesInfo === metaDataFilesInfo
    addBlobToFilesInfo = async function (filenameFullPath, filesInfo) {
        try
        {
            // loop over keys
            let pathElements = COL.util.getPathElements(filenameFullPath);
            let dirname = pathElements['dirname'];
            let filename = pathElements['filename'];
            var fileExtention = COL.util.getFileExtention(filename);

            let blobInfo;
            let fileType2 = COL.util.getFileTypeFromFilename(filename);
            switch(fileType2) {
                case "jpg":
                case "png": {
                    if (this._zipLoaderInstance.files[filenameFullPath].url) {
                        // the url already exists
                        blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: this._zipLoaderInstance.files[filenameFullPath].url, isDirty: true});
                        let fileInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                        filesInfo.set(filename, fileInfo);
                    }
                    else {
                        // the url does not exist
                        let fileType = 'image/png';
                        if(fileExtention === "png") {
                            fileType = 'image/png';
                        }
                        else {
                            fileType = 'image/jpeg';
                        }
                        let imageAttributes = await this._zipLoaderInstance.extractImageAsBlobUrl( filenameFullPath, fileType )
                        blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: imageAttributes.url, isDirty: true});
                        let fileInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                        filesInfo.set(filename, fileInfo);
                    }
                    break;
                }
                case "json": {
                    blobInfo = new BlobInfo({filenameFullPath: filenameFullPath, blobUrl: this._zipLoaderInstance.extractAsBlobUrl( filenameFullPath, 'text/plain' ), isDirty: true});
                    let fileInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
                    filesInfo.set(filename, fileInfo);
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
        
        if(!this._zipLoaderInstance.files[imageFilenameFullPath])
        {
            console.log('this._zipLoaderInstance.files', this._zipLoaderInstance.files); 
            let msgStr = 'this._zipLoaderInstance.files[imageFilenameFullPath] is undefined. imageFilename: ' + imageFilenameFullPath;
            throw msgStr;
        }

        // The file is not yet in memory, but its offset is stored in memory.
        // Load the file from the zip file into memory and render
        // unzip the image files (that were skipped in the initial load)

        let offsetInZipFile = this._zipLoaderInstance.files[imageFilenameFullPath].offset;
        let headerSize = this._zipLoaderInstance.files[imageFilenameFullPath].headerSize;
        let compressedSize = this._zipLoaderInstance.files[imageFilenameFullPath].compressedSize;
        let doSkipJpg = false;
        
        // tbd - set doReadArrayBufferInChunks, if the zip file size passes a threshold (500 MB?)

        let zipFileObj = COL.model.getZipFileObj();
        let sliceBeg = offsetInZipFile;
        let sliceEnd = offsetInZipFile + headerSize + compressedSize;
        let zipFileObjSlice = zipFileObj.slice(sliceBeg, sliceEnd);
        let offsetInArrayBuffer = 0;

        let zipLoaderInstanceForSlice = await this.loadFromZipFile(zipFileObjSlice, doSkipJpg, offsetInArrayBuffer);
        let fileInfo = zipLoaderInstanceForSlice.files[imageFilenameFullPath];

        this._zipLoaderInstance.files[imageFilenameFullPath].buffer = fileInfo.buffer;
        
        let blobInfo = await COL.model.fileZip.addBlobToFilesInfo(imageFilenameFullPath, imagesInfo);
        return blobInfo.blobUrl;
        
    };


    // --------------------------------------------------------------

    isExtensionValid2 = function (extension) {

        switch (extension.toLowerCase()) {
            case ".zip":
                return true;
        }

        return false;
    }

    // Loads slice (optionally the entire buffer) from the zip file, and reads it into the layer
    loadFromZipFile = function (zipFileObjSlice, doSkipJpg, offsetInArrayBuffer = undefined) {
        // console.log('BEG loadFromZipFile');
        
        return new Promise(function(resolve, reject) {

            let fileReader = new FileReader();
            fileReader.readAsArrayBuffer(zipFileObjSlice);

            fileReader.onloadend = async function (fileLoadedEvent) {
                // console.log("Read file " + file.name + " size " + fileLoadedEvent.target.result.byteLength + " bytes");
                // Loading from zip file
                ApiService.LOAD_FROM_TYPE = ApiService.API_SERVICE_TYPES.ApiServiceZip;
                
                let arrayBuffer = fileLoadedEvent.target.result;
                // printing arrayBuffer to the console directly, prevents Garbage Collection and causes memory to pile up
                // console.log('arrayBuffer.byteLength', arrayBuffer.byteLength); 
                
                let zipLoaderInstance = await ZipLoader.unzip( arrayBuffer, doSkipJpg, offsetInArrayBuffer );
                resolve(zipLoaderInstance);
            };
        });
    };

    openSingleZipFile = async function (zipFileObj) {
        console.log('BEG openSingleZipFile'); 
        
        if (!(zipFileObj instanceof File)) {
            console.error("Error from openSingleZipFile(zipFileObj): the parameter 'zipFileObj' must be a File instace.");
            return;
        }

        // Add zipFileObj to opened list
        this.openedZipFileList.set(zipFileObj.name, zipFileObj);
        // Extract file extension
        var pointPos = zipFileObj.name.lastIndexOf('.');
        var extension = zipFileObj.name.substr(pointPos);

        // Validate file extension
        if (!this.isExtensionValid2(extension)) {
            console.error("The file must have '.zip' suffix. \nTry again.");
            return;
        }

        // store the zip file object. It is used for reading specific files 
        // individually from the zip file, later on
        COL.model.setZipFileObj(zipFileObj);

        let zipFileObjSlice = zipFileObj;
        // let fileExtention = zipFileObj.name.split('.').pop();
        let fileType = COL.util.getFileTypeFromFilename(zipFileObj.name);

        let spinnerJqueryObj = $('#cssLoaderId');
        spinnerJqueryObj.addClass("is-active");

        let toastTitleStr = "Load from zip file";
        try{
            if ( fileType === "zip") {
                console.log('Unzip the file', zipFileObj.name);
                // Read the entire file to get the offsets
                let doSkipJpg = true;
                let offsetInArrayBuffer = undefined;

                console.time("time loadFromZipFile");
                let zipLoaderInstance = await this.loadFromZipFile(zipFileObjSlice, doSkipJpg, offsetInArrayBuffer);
                console.timeEnd("time loadFromZipFile");
                
                console.time("time extractFilesFromZipLoaderInstance");
                await COL.model.fileZip.extractFilesFromZipLoaderInstance(zipLoaderInstance);
                console.timeEnd("time extractFilesFromZipLoaderInstance");

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
            else{
                console.warn('Not a zip file: ', zipFileObj.name);
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

    openZipFile = async function (toOpen) {
        console.log('BEG openZipFile');
        
        // console.time("Read zip file");
        console.log('toOpen', toOpen);

        $(toOpen).each(function (key, file) {
            return COL.model.fileZip.openSingleZipFile(file);
        });
    };

    static addNewPlan = async function (planInfo) {
        console.log('BEG addNewPlan'); 

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

    static addNewSitePlan = function (siteId, planInfo) {
        console.log('BEG addNewSitePlan');

        return new Promise(async function(resolve, reject) {
            // ////////////////////////////////////////////////
            // POST - Add new metadata
            // ////////////////////////////////////////////////

            console.log('planInfo', planInfo); 

            let plan_url = planInfo.planFilename;
            let jsonData = {plan_name: planInfo.name, plan_url: plan_url, is_selected: false, site_id: siteId};
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

export { FileZip_withJson };
