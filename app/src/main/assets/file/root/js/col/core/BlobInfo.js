// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  '../COL.js';
import { Model } from './Model.js';
import '../util/Util.js';

class BlobInfo {
    constructor({filenameFullPath, blobUrl, isDirty}){
        let [dirname, basename, extension, filename] = COL.util.getPathElements(filenameFullPath);
        this.dirname = dirname;
        this.filenameFullPath = filenameFullPath;
        this.filename = basename + '.' + extension;
        this.blobUrl = blobUrl;
        this.isDirty = isDirty;
    }

    toJSON() {
        return {
            dirname: this.dirname,
            filenameFullPath: this.filenameFullPath,
            filename: this.filename,
        };
    }

    setIsDirty(isDirty) {
        this.isDirty = isDirty;
    }

    async addUpdateOrDeleteBlobInWebServer(siteId, planId, filePath3, blob, doDeferFileSystemAndDbSync, operation) {
        // console.log('BEG addUpdateOrDeleteBlobInWebServer');
        
        // ////////////////////////////////////////////////
        // Query - get_image_by_site_plan_imagename
        // ////////////////////////////////////////////////

        // http://localhost/api/v1_2/get_image_by_site_plan_imagename
        // console.log('Query - get_image_by_site_plan_imagename'); 

        let syncStatus = false;
        
        let filePathWithFilename = filePath3 + '/' + this.filename; 
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_image_by_site_plan_imagename/' + filePathWithFilename;
        try {
            // console.log('this.filename', this.filename);

            let response = await fetch(queryUrl);
            await COL.errorHandlingUtil.handleErrors(response);

            // console.log('response.headers', response.headers);

            let dataAsJson = await response.json();

            // e.g. {image_by_id_url: "https://localhost/api/v1_2/images/4808", image_id: 4808, plan_id: 111}
            // console.log('dataAsJson', dataAsJson); 

            // e.g. https://localhost/api/v1_2/images/8816
            let image_by_id_url = dataAsJson.image_by_id_url;
            // console.log('image_by_id_url', image_by_id_url); 
            
            if(operation === 'ADD_OR_UPDATE_BLOB') {
                if(!image_by_id_url) {
                    // The  image does not exist. Add a new row into table "images" and add the actual image
                    await this.addNewMetadataWithBlob(siteId, planId, filePathWithFilename, blob, doDeferFileSystemAndDbSync);
                    syncStatus = true;
                }
                else {
                    // The  image does exist. Update the row in table "images" and add the updated image
                    // Add the actual image

                    if(!dataAsJson.image_id || !dataAsJson.plan_id) {
                        // sanity check
                        throw new Error('image exists in the database, but one of the attributes from the request is invalid: image_id, plan_id');
                    }

                    await this.updateExistingMetadataWithBlob(image_by_id_url, dataAsJson, filePathWithFilename, blob, doDeferFileSystemAndDbSync);
                    syncStatus = true;
                }
            }
            else if(operation === 'DELETE_BLOB') {
                if(!image_by_id_url) {
                    // tbd - this can happen if adding an image and then deleting it before syncing it with the db
                    
                    // sanity check - the image to be deleted must exist in the database
                    throw new Error('image does not exist in the database');
                }
                
                // Delete the actual image
                await this.deleteBlobFromWebServer(dataAsJson, siteId, planId, filePathWithFilename, doDeferFileSystemAndDbSync);
                syncStatus = true;
            }
            else {
                let msgStr = 'Error from addUpdateOrDeleteBlobInWebServer. Invalid operation: ' + operation;
                throw new Error(msgStr);
            }
        }
        catch(err) {
            // Set the syncStatus to false, but don't rethrow
            // This is done to: indicate that there was a failure to sync the specific file, and continue on to sync other files.
            console.error('Error from addUpdateOrDeleteBlobInWebServer:', err);
            syncStatus = false;
        }
        
        return {
            filePath: filePathWithFilename,
            syncStatus: syncStatus
        };
    }

    async addNewMetadataWithBlob(siteId, planId, filePathWithFilename, blob, doDeferFileSystemAndDbSync) {
        // console.log('BEG addNewMetadataWithBlob');

        // This function saves the image file in the file system
        // and if !doDeferFileSystemAndDbSync, also adds the row in the images table
        //   id, image_filename, image_url, plan_id 
        //   65, IMG_5382.jpg, 2/3/foo.jpg, 3

        // e.g. 2/3/IMG_5382.jpg -> IMG_5382.jpg
        let filename = COL.util.filePathToFilename(filePathWithFilename);
        
        // jsonData {image_filename: "IMG_6412.jpg", image_url: "avner/img/45/56/IMG_6412.jpg", site_id: "45", plan_id: "56"}
        let jsonData = {image_filename: filename,
            image_url: filePathWithFilename,
            site_id: siteId,
            plan_id: planId};

        // e.g. http://192.168.1.74/api/v1_2/images
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/images';
        
        // create a multipart dataForm (image, and json data)
        const formData = new FormData();

        // Append the image to the form
        formData.append('image', blob, filePathWithFilename);

        let jsonDataAsStr = JSON.stringify(jsonData);
        formData.append('json_data_as_str', jsonDataAsStr);

        let headersData = {
            'X-CSRF-Token': COL.util.getCSRFToken()
        };

        if (doDeferFileSystemAndDbSync) {
            // //////////////////////////////////////////////////////////////////////////////////
            // execute all db operations in single request
            // add image_db_operation (insert) image_db_operations_array
            // //////////////////////////////////////////////////////////////////////////////////
            
            // json_data_as_str2 is the data in formData
            // "{"image_filename":"IMG_20191023_092036.jpg","image_url":"avner/img/118/111/IMG_20191023_092036.jpg","site_id":"118","plan_id":"111"}"
            let image_db_operation = {queryUrl: queryUrl,
                method: 'POST',
                headers: headersData,
                json_data_as_str2: jsonDataAsStr};

            COL.model.image_db_operations_array.push(image_db_operation);
        }
        else {
            let fetchData = { 
                method: 'POST', 
                headers: headersData,
                body: formData
            };

            // - save the image in the backend file_system and
            //   (if !doDeferFileSystemAndDbSync) also adds a row to the database
            // queryUrl - e.g. http://192.168.1.74/api/v1_2/images
            let response = await fetch(queryUrl, fetchData);
            await COL.errorHandlingUtil.handleErrors(response);
            let dataAsJson = await response.json();
            
            let blobUrl = response.headers.get('location');
            // console.log('blobUrl', blobUrl); 
            return blobUrl;
        }

    }

    async updateExistingMetadataWithBlob(queryUrl, dataAsJson, filePathWithFilename, blob, doDeferFileSystemAndDbSync) {

        // console.log('BEG updateExistingMetadataWithBlob');
        
        // This function updates a row in the images table, and also adds the image file, e.g.
        // Updating the row in the images table (or leaving it as is)
        //   id, image_filename, image_url, plan_id 
        //   65, IMG_5382.jpg, http://localhost:80/avner/img/2/3/IMG_5382.jpg, 3
        // AND
        // saving the image file in the file system



        // ////////////////////////////////////////////////
        // PUT - Updating image #2 with image image
        // based on https://stackoverflow.com/questions/44021538/how-to-send-a-file-in-request-node-fetch-or-nodejs
        // OK - image is created
        //      find . -name "1.jpg"
        //      ./instance/images/dynamic/1.jpg
        // ////////////////////////////////////////////////

        // console.log('PUT - Updating image #2 with image image');

        const formData = new FormData();
        // https://stackoverflow.com/questions/6664967/how-to-give-a-blob-uploaded-as-formdata-a-file-name
        formData.append('image', blob, filePathWithFilename);
        
        let headersData = {
            'X-CSRF-Token': COL.util.getCSRFToken()
        };

        if (doDeferFileSystemAndDbSync) {
            // //////////////////////////////////////////////////////////////////////////////////
            // execute all db operations in single request
            // add image_db_operation (update) image_db_operations_array
            // //////////////////////////////////////////////////////////////////////////////////
            
            let jsonData = {image_id: dataAsJson.image_id,
                plan_id: dataAsJson.plan_id,
                image_filename: dataAsJson.image_filename,
                image_url: filePathWithFilename};
            
            let jsonDataAsStr = JSON.stringify(jsonData);
            
            let image_db_operation = {queryUrl: queryUrl,
                method: 'PUT',
                headers: headersData,
                json_data_as_str2: jsonDataAsStr};
            
            // add to image_db_operations_array
            COL.model.image_db_operations_array.push(image_db_operation);
        }
        else {
            let fetchData = { 
                method: 'PUT', 
                headers: headersData,
                body: formData
            };
            
            // tbd - remove all "await.*fetch.*then" + resolve
            // no need for Promise when using await ???
            //
            // let dataAsText = await fetch(url, fetchData).then(response => response.text());
            // console.log('dataAsText', dataAsText);
            // resolve(true);

            // queryUrl - e.g. http://192.168.1.74/api/v1_2/images/289
            // console.log('queryUrl', queryUrl); 
            let response = await fetch(queryUrl, fetchData);
            await COL.errorHandlingUtil.handleErrors(response);
        }
        
        return;
    }

    async deleteBlobFromWebServer(dataAsJson, siteId, planId, filePathWithFilename, doDeferFileSystemAndDbSync) {
        console.log('BEG deleteBlobFromWebServer');

        // ////////////////////////////////////////////////
        // Delete
        // - the metadata from the database, e.g.
        //     id, image_filename, image_url, plan_id 
        //     65, IMG_5382.jpg, http://localhost:80/avner/img/2/3/IMG_5382.jpg, 3
        // - the image file from the file system, e.g.
        //     /home/flask/app/web/project/avner/img/46/57/foo.jpg
        // ////////////////////////////////////////////////

        let headersData = {
            'X-CSRF-Token': COL.util.getCSRFToken()
        };

        if (doDeferFileSystemAndDbSync) {
            // //////////////////////////////////////////////////////////////////////////////////
            // execute all db operations in single request
            // add image_db_operation (delete) image_db_operations_array
            // //////////////////////////////////////////////////////////////////////////////////

            let jsonData = {image_id: dataAsJson.image_id};
            let jsonDataAsStr = JSON.stringify(jsonData);

            let image_db_operation = {queryUrl: dataAsJson.image_by_id_url,
                method: 'DELETE',
                headers: headersData,
                json_data_as_str2: jsonDataAsStr};
            
            COL.model.image_db_operations_array.push(image_db_operation);
        }
        else {
            let fetchData = { 
                method: 'DELETE',
                headers: headersData
            };

            // delete the metadata from the database, and delete the image file the file system
            let response = await fetch(dataAsJson.image_by_id_url, fetchData);
            await COL.errorHandlingUtil.handleErrors(response);
        }
    }

    async syncBlobToWebServer(siteId, planId, filePath3, doDeferFileSystemAndDbSync, operation = 'ADD_OR_UPDATE_BLOB') {
        // console.log('BEG syncBlobToWebServer');
        
        let filePath = this.filename;
        let syncStatus = false;
        try {
            let fileType = COL.util.getFileTypeFromFilename(this.filename);
            switch(fileType) {
                case 'jpg':
                case 'png':
                case 'json': {

                    // https://stackoverflow.com/questions/11876175/how-to-get-a-file-or-blob-from-an-object-url
                    // this.blobUrl - e.g. blob:http://192.168.1.74/8fab9563-4edf-4127-a8f6-20cad1cd80de
                    // console.log('this.blobUrl', this.blobUrl);
                    
                    if(COL.util.isObjectInvalid(this.blobUrl)) {
                        let msgStr = 'The blobUrl is invalid.';
                        throw new Error(msgStr);
                    }
                    let response = await fetch(this.blobUrl);
                    await COL.errorHandlingUtil.handleErrors(response);

                    let blob = await response.blob();
                    let retVal = await this.addUpdateOrDeleteBlobInWebServer(siteId,
                        planId,
                        filePath3,
                        blob,
                        doDeferFileSystemAndDbSync,
                        operation);

                    filePath = retVal['filePath'];
                    syncStatus = retVal['syncStatus'];
                    
                    break;
                }
                default:
                    let msgStr = 'File type is not supported. fileType: ' + fileType;
                    throw new Error(msgStr);
            }
        }
        catch(err) {
            console.error('Error from sync BlobToWebServer. filePath: ', filePath, '. err:', err); 
            // set syncStatus to false (not throwing so that caller of this function (e.g. sync BlobsWithWebServer)
            // can continue to the end and raise an "error toast")
            syncStatus = false;
        }

        if(syncStatus == true) {
            // the syncStatus is good so mark the blob as "in-sync"
            this.isDirty = false;
        }

        return [filePath, syncStatus];
    }

    isBlobUrlValid() {
        if(COL.util.isStringInvalid(this.blobUrl)) {
            let msgStr = 'filename: ' + this.filename + ' blobInfo.blobUrl is invalid: ' + this.blobUrl;
            console.log(msgStr); 
            return false;
        }
        return true;
    }

    toString() {
        let blobInfoStr =
            'blobInfo: filenameFullPath, dirname, filename: ' +
            this.filenameFullPath + ', ' +
            this.dirname + ', ' +
            this.filename + '\n' +
            'blobInfo: blobUrl, isDirty: ' +
            this.blobUrl + ', ' +
            this.isDirty;

        return blobInfoStr;
    }

    static CreateOrUpdateBlobInfo(blobInfo, metaData, filename, isDirty) {
        let blob = new Blob([metaData]);
        let blobUrl = URL.createObjectURL(blob);
        
        if(COL.util.isObjectInvalid(blobInfo)) {
            // blobInfo does not exist - create it
            // isDirty can be false if we just loaded the layer .json from the server, i.e. nothing has changed yet
            // isDirty can be true if e.g. if overlayRect was added to the layer .json, or if annotation was added to a specific image.
            blobInfo = new BlobInfo({filenameFullPath: filename, blobUrl: blobUrl, isDirty: isDirty});
        }
        else {
            // blobInfo exists - update the url
            URL.revokeObjectURL(blobInfo.blobUrl);
            blobInfo.blobUrl = blobUrl;
            blobInfo.isDirty = isDirty;
        }
        return blobInfo;
    }

    // Create or update blobInfo
    // Update metaDataBlobsInfo with a new value of blobInfo
    // Return the updated blobInfo
    static UpdateMetaDataBlobsInfo({metaDataBlobsInfo, metaData, filename, isDirty}) {
        // console.log('BEG updateMetaDataBlobsInfo'); 

        let blobInfo = metaDataBlobsInfo.getByKey(filename);
        blobInfo = BlobInfo.CreateOrUpdateBlobInfo(blobInfo, metaData, filename, isDirty);

        metaDataBlobsInfo.set(filename, blobInfo);

        return blobInfo;
    }
          
}

export { BlobInfo };


