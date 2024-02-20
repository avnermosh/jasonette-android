/* eslint-disable no-prototype-builtins */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  '../COL.js';
import { Model } from './Model.js';
import './Core.js';
import { OverlayRect } from './OverlayRect.js';
import { BlobInfo } from './BlobInfo.js';
import { ImageInfo } from './ImageInfo.js';
import { Layer } from './Layer.js';
import { ImageTags } from './ImageTags.js';

COL.core.ImageFile = {
    ErrorCodes: {
        EXTENSION: 1
    },
    SupportedExtensions: {
        JPG: '.jpg',
        // jpg: ".jpg",
        // JPG: ".JPG",
        PNG: '.png'
    }
};

(function () {
    
    this.isExtensionValid = function (extension) {
        switch (extension.toLowerCase()) {
            case '.jpg':
            case '.png':
                return true;
            default:
                throw new Error('extension is not supported ' + extension);
        }
    };

    // //////////////////////////////////////////////////
    // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
    // https://jsfiddle.net/0GiS0/4ZYq3/
    // //////////////////////////////////////////////////

    this.openImageFiles = async function (filesToOpenArray) {
        // console.log('BEG this.openImageFiles'); 
        
        let selectedLayer = COL.model.getSelectedLayer();

        let fileToOpenUrls = [];
        let fileToOpenFilenames = [];
        let newImageInfo = {
            imageTagsList: []
        };


        // the number of files to open at one time is limited to Layer.maxNumImageBlobsInMeomry. Otherwise,
        // the blobs are removed, which causes error when syncing the images to the webserver
        if(filesToOpenArray.length > Layer.maxNumImageBlobsInMeomry) {
            let msgStr = 'Too many images to open at once: ' + filesToOpenArray.length + 
                '. Number of images that can be openned at one time is limited to: ' + 
                Layer.maxNumImageBlobsInMeomry;
            throw new Error(msgStr);
        }
        
        for (let i = 0; i < filesToOpenArray.length; i++) {
            let fileToOpen = filesToOpenArray[i];

            // https://stackoverflow.com/questions/31433413/return-the-array-of-bytes-from-filereader
            let blob = new Blob([fileToOpen]);

            let fileToOpenUrl = URL.createObjectURL(blob);
            fileToOpenUrls.push(fileToOpenUrl);

            let imageFilename = fileToOpen.name;
            // replace space with underscore
            imageFilename = imageFilename.replace(/ /g, '_');
            
            fileToOpenFilenames.push(imageFilename);
            
            let fileType = COL.util.getFileTypeFromFilename(imageFilename);
            let imageTags = new ImageTags({filename: imageFilename});
            if(fileType === 'jpg') {
                imageTags = await ImageTags.GetImageTags(imageFilename, blob);
            }

            newImageInfo['imageTagsList'].push(imageTags);
        }

        // ////////////////////////////////////////////
        // Add the new images to imagesInfo.
        // ////////////////////////////////////////////

        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
        let imageTagsListLength = newImageInfo['imageTagsList'].length;

        for (let j = 0; j < imageTagsListLength; j++) {
            let imageTags = newImageInfo['imageTagsList'][j];
            let imageFilename = fileToOpenFilenames[j];
            let fileUrl = fileToOpenUrls[j];

            if(imageFilename === 'image.jpg') {
                // make the imageFilename unique
                imageFilename = this.createFileNameWithTimestamp();
            }
            
            // The layer does not have the image in the this.removedImagesInfo list
            // and not in the this.imagesInfo list
            // add the image to this.imagesInfo list, and mark it as dirty
            let imageBlobInfo = new BlobInfo({filenameFullPath: imageFilename, blobUrl: fileUrl, isDirty: true});
            
            if(COL.util.isStringInvalid(imageBlobInfo.blobUrl)) {
                let msgStr = 'imageFilename: ' + imageFilename + 
                    ' has an invalid imageBlobInfo.blobUrl: ' + imageBlobInfo.blobUrl +
                    ' ignore the file';

                console.error(msgStr);
                continue;
            }

            let imageInfo = new ImageInfo({imageFilename: imageFilename, 
                // annotationFilename: undefined, 
                imageTags: imageTags, 
                imageBlobInfo: imageBlobInfo});
            await selectedLayer.addImageToLayer(selectedOverlayRect, imageInfo);
        }
        
        return true;
    };

    this.createFileNameWithTimestamp = function () {
        // poor man's approach to make the image filename unique if it comes from the camera.
        // tbd - check how to detect when image comes from the camera and rename to unique name
        // "dateTimeStr", "20210824-005911"
        var dateTimeStr = moment.utc().format('YYYYMMDD-HHmmss');
        console.log('dateTimeStr', dateTimeStr);

        let filename = 'image_' + dateTimeStr + '.jpg';
        console.log('filename', filename);

        return filename;
    };
   
}).call(COL.core.ImageFile);
