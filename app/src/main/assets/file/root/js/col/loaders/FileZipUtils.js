// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from '../COL.js';
import { Model } from '../core/Model.js';
import '../util/Util.js';

class FileZipUtils {

    ////////////////////////////////////////////////////////////////////////////
    // Returns true if the filenameFullPath is for data that is shared across multiple sites
    //   e.g. sitesInfo.json
    // or false otherwise
    ////////////////////////////////////////////////////////////////////////////

    static isSharedDataBetweenAllSitePlans = function (filenameFullPath) {
        let matchResults1 = filenameFullPath.match( /sitesInfo/i );

        // a site-plan file (e.g. siteId/planId/foo.txt)
        let matchResults3 = filenameFullPath.match( /(\d+)\/(\d+).*/i );
        
        if(matchResults1 && !matchResults3)
        {
            return true;
        }
        else
        {
            return false;
        }
    };

    static loadFile_viaFetch = async function (filename, blobInfo, fileType) {
        // console.log('BEG loadFile_viaFetch');

        try {
            let response = await fetch(blobInfo.blobUrl)
            await COL.errorHandlingUtil.handleErrors(response);

            switch(fileType) {
                case "text": {
                    let dataAsText = await response.text();
                    return dataAsText;
                }
                case "json": {
                    let dataAsJson = await response.json();
                    return dataAsJson;
                }
                default: {
                    let msgStr = "fileType: " + fileType + ", is not supported";
                    console.error('msgStr1111', msgStr); 
                    throw new Error(msgStr);
                }
            }
        }
        catch(err) {
            console.error('err', err);

            // add the failed filename to the list of filenames that failed to load 
            FileZip_withJson.filenamesFailedToLoad.push(filename);

            // rethrow
            let msgStr = 'Error from loadFile_viaFetch. Failed to load filename: ' + filename;
            throw new Error(msgStr);
        }
    };


    // download onto the client
    static downloadToZipFile = async function (zipFilename) {
        console.log('BEG downloadToZipFile'); 

        // keep using the old way (i.e. using XMLHttpRequest, instead of async/await).
        // (If desciding to change the method e.g. using promises, or async/await, instead of XMLHttpRequest
        //  need to make sure that we can handle download ofBIG files, e.g. bia streaming)
        // see: https://stackoverflow.com/questions/55734760/async-await-to-read-blob
        return new Promise(function(resolve, reject) {
            let queryUrl = Model.GetUrlBase() + 'api/v1_2/download_to_zip_file2/' + zipFilename;
            // console.log('queryUrl', queryUrl); 

            // trigger the api call from javascript
            var req = new XMLHttpRequest();
            req.open("GET", queryUrl, true);
            req.responseType = "blob";
            req.onload = function (event) {
                if (req.status === 200) {
                    var blob = req.response;
                    let fileName = zipFilename;
                    console.log('fileName', fileName); 
                    let link=document.createElement('a');
                    link.href=window.URL.createObjectURL(blob);
                    link.download=fileName;
                    link.click();
                    resolve(true);
                }
                else {
                    // reject(JSON.parse(req.response));
                    reject(req);
                }
            };

            req.send();
        });
    };


    static update_create_zipfile_progress = async function (status_url, nanobar, status_div) {
        // console.log('BEG update_create_zipfile_progress'); 
        // send GET request to status URL
        let response = await fetch(status_url);
        await COL.errorHandlingUtil.handleErrors(response);

        if (response.ok) {
            let data = await response.json();
            let percent = parseInt(data['current'] * 100 / data['total']);
            if( (percent != FileZipUtils.createZipFile_lastReportedPercent) && ((percent % 5) == 0) )
            {
                // report progress every 5%
                console.log('percent', percent);
                FileZipUtils.createZipFile_lastReportedPercent = percent;
            }
            
            nanobar.go(percent);
            /* $(status_div.childNodes[1]).text(percent + '%');*/
            $(status_div.childNodes[1]).text(data['current'] + '/' + data['total']);
            $(status_div.childNodes[2]).text(data['status']);
            
            if (data['state'] != 'PENDING' && data['state'] != 'PROGRESS') {
                if ('result' in data) {
                    // show result
                    $(status_div.childNodes[3]).text('Result: ' + data['result']);
                }
                else {
                    // something unexpected happened
                    $(status_div.childNodes[3]).text('Result: ' + data['state']);

                    let msgStr = "Creation of zip file failed!";
                    throw Error(msgStr);
                }
            }
            else {
                // wait for 100 milliseconds before rerunning update_create_zipfile_progress
                await FileZipUtils.timeout2(100);
                await FileZipUtils.update_create_zipfile_progress(status_url, nanobar, status_div);
            }
            
        }
        else
        {
            alert('Unexpected error');
            let msgStr = "Request rejected with status: " + response.status + ", and message: " + response.message;
            throw Error(msgStr);
        }
    };

    static timeout2 = async function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };


    static getPlanBySiteAndPlanNames = async function (planInfo) {
        
        // console.log('BEG getPlanBySiteAndPlanNames');
        
        // ////////////////////////////////////////////////
        // Query - get_plan_by_user_site_plan
        // ////////////////////////////////////////////////

        // http://localhost/api/v1_2/get_plan_by_user_site_plan/modelWith4Images/Main
        // console.log('Query - get_plan_by_user_site_plan'); 
        
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_plan_by_user_site_plan/' +
            planInfo.siteName + '/' + 
            planInfo.name;

        // console.log('queryUrl', queryUrl);

        let response = await fetch(queryUrl)
        await COL.errorHandlingUtil.handleErrors(response);
        
        let dataAsJson = await response.json();
        return dataAsJson;
    };

    static addNewSite = async function (planInfo) {
        // console.log('BEG addNewSite');

        // ////////////////////////////////////////////////
        // POST - Add new metadata
        // ////////////////////////////////////////////////

        // console.log('planInfo', planInfo);
        let jsonData = {site_name: planInfo.siteName};
        
        let jsonDataAsStr = JSON.stringify(jsonData);
        // console.log('jsonDataAsStr', jsonDataAsStr); 
        let headersData = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': COL.util.getCSRFToken()
        };
        
        let fetchData = { 
            method: 'POST', 
            body: jsonDataAsStr,
            headers: headersData
        };

        // tbd - add the site and update planInfo
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/sites';

        let response = await fetch(queryUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);

        let dataAsJson = await response.json();
        return dataAsJson;
    };


    // https://stackoverflow.com/questions/11876175/how-to-get-a-file-or-blob-from-an-object-url
    static blobUrlToBlob = async function(url) {
        let response = await fetch(url);
        await COL.errorHandlingUtil.handleErrors(response);
        let blob = await response.blob();
        return blob;
    };


    // /////////////////////////////////////////////////////////////////////////
    // save using regular zip utility on webServer (a.k.a. Content-Disposition) - related functions
    // /////////////////////////////////////////////////////////////////////////



    static saveFromWebServerToZipFile_inSteps = async function (groupId) {

        //////////////////////////////////////////////////
        // breaks the process to
        // createZipFileOnServerSide - using
        // - initial request - 202 (Accept)
        //                     returns status_url
        // - get status (ongoing progress check) - 200 (OK)
        // - finally on 100% progress - return result + 200 (OK)
        //
        // downloadZipFile
        //////////////////////////////////////////////////

        // console.log('BEG saveFromWebServerToZipFile_inSteps');

        let saveFromWebServerToZipFileStatus = document.getElementById('saveFromWebServerToZipFileStatusId');
        if(COL.util.isObjectInvalid(FileZipUtils.nanobar))
        {
            FileZipUtils.nanobar = new Nanobar({
                bg: '#44f',
                // target: saveFromWebServerToZipFileStatus.childNodes[0]
                target: saveFromWebServerToZipFileStatus
            });
        }

        // console.log('saveFromWebServerToZipFileStatus', saveFromWebServerToZipFileStatus);

        //////////////////////////////////////////////////
        // Get the group name
        //////////////////////////////////////////////////

        let queryUrl = Model.GetUrlBase() + 'api/v1_2/admin/group/' + groupId;
        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);

        let dataAsJson = await response.json();
        let zipFilename = dataAsJson.group_name + '.zip';
        
        //////////////////////////////////////////////////
        // Request to create the zip file on the webserver
        //////////////////////////////////////////////////

        queryUrl = Model.GetUrlBase() + 'api/v1_2/admin/admin_download_group_sites/' + groupId;

        let generalInfo = {softwareVersion: COL.getSoftwareVersion()};
        let generalInfoAsStr = JSON.stringify(generalInfo);
        
        let headersData = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': COL.util.getCSRFToken(),
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };

        let fetchData = { 
            method: 'POST', 
            body: generalInfoAsStr,
            headers: headersData
        };

        response = await fetch(queryUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);
        dataAsJson = await response.json();

        // //////////////////////////////////////////////////
        // // Follow-up on the creation of the zipfile on the webserver side
        // //////////////////////////////////////////////////

        // await FileZipUtils.update_create_zipfile_progress... - emits the lines:
        // 2020-12-06 04:30:03,407 INFO: 172.28.1.2 - - [06/Dec/2020 04:30:03] "GET /status/57faf610-03f3-4ca2-858a-2ff1419aaff8 HTTP/1.0" 200 -
        // 2020-12-06 04:30:03,407 INFO: 172.28.1.2 - - [06/Dec/2020 04:30:03] "GET /status/57faf610-03f3-4ca2-858a-2ff1419aaff8 HTTP/1.0" 200 - [in /usr/local/lib/python3.7/site-packages/werkzeug/_internal.py:122]
        // ...
        let create_zipfile_status_url = response.headers.get('location');
        await FileZipUtils.update_create_zipfile_progress(create_zipfile_status_url, FileZipUtils.nanobar, saveFromWebServerToZipFileStatus);

        // //////////////////////////////////////////////////
        // // Download the zip file from the webserver
        // //////////////////////////////////////////////////

        await FileZipUtils.downloadToZipFile(zipFilename);
    };

    static saveFromWebServerToZipFile_viaRegularZip = async function (groupId) {
        console.log('BEG saveFromWebServerToZipFile_viaRegularZip');

        try{
            // saveFromWebServerToZipFile_inSteps - using async/await, and works in steps (first assembles the zip, then downloads the file)
            await FileZipUtils.saveFromWebServerToZipFile_inSteps(groupId);
            
            let msgStr = "Succeeded to save";
            let toastTitleStr = "Save from webserver to zip file";
            toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
        catch(err) {
            console.error('err', err);
            let msgStr = "Failed to save. " + err;
            let toastTitleStr = "Save from webserver to zip file";
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
    };

};

FileZipUtils.filenamesFailedToLoad = [];
FileZipUtils.nanobar = undefined;
FileZipUtils.createZipFile_lastReportedPercent = 0;

export { FileZipUtils };

