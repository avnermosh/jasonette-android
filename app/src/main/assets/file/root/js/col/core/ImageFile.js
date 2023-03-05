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
            let imageTags = { filename: imageFilename,
                imageOrientation: -1 };
            if(fileType === 'jpg') {
                imageTags = await COL.core.ImageFile.getImageTags(imageFilename, blob);
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
            let filename = fileToOpenFilenames[j];
            let fileUrl = fileToOpenUrls[j];

            if(filename === 'image.jpg') {
                filename = this.createFileNameWithTimestamp();
            }
            
            // The layer does not have the image in the this._removedImagesInfo list
            // and not in the this._imagesInfo list
            // add the image to this._imagesInfo list, and mark it as dirty
            let isDirty = true;
            let blobInfo = new BlobInfo({filenameFullPath: filename, blobUrl: fileUrl, isDirty: isDirty});
            
            if(COL.util.isStringInvalid(blobInfo.blobUrl)) {
                let msgStr = 'filename: ' + filename + 
                    ' has an invalid blobInfo.blobUrl: ' + blobInfo.blobUrl +
                    ' ignore the file';

                console.error(msgStr);
                continue;
            }

            let imageInfo = new ImageInfo({filename: filename, imageTags: imageTags, blobInfo: blobInfo});
            await selectedLayer.addImageToLayer(selectedOverlayRect, imageInfo);
        }
        
        return true;
    };
    
    // exifreader can read tags (e.g. orientation) from jpg files (does not work with png files)
    this.getImageTags = async function (filename, blob) {
        // console.log('BEG getImageTags');

        let blobArrayBuffer = await blob.arrayBuffer();
        const tags = ExifReader.load(blobArrayBuffer);
        // console.log('tags', tags);
        
        // Filter tags by key
        let selectedTags = ['Orientation',
            'Image Width',
            'Image Height',
            'DateTimeOriginal' ,
            'DateTime',
            'date:create',
            'xxx'];
        // https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
        let filteredTags =  Object.keys(tags)
            .filter(key => selectedTags.includes(key))
            .reduce((obj, key) => {
                obj[key] = tags[key];
                return obj;
            }, {});

        if (typeof filteredTags['Orientation'] === 'undefined') {
            filteredTags['Orientation'] = -1;
        }
        
        // console.log('filteredTags', filteredTags);

        let imageTags = {};
        imageTags.filename = filename;
        if(filteredTags.hasOwnProperty('Orientation')) {
            // filteredTags[Orientation] {id: 274, value: 1, description: "top-left"}
            imageTags.imageOrientation = filteredTags['Orientation'].value;
        }
        if(filteredTags.hasOwnProperty('Image Width')) {
            imageTags.imageWidth = filteredTags['Image Width'].value;
        }
        if(filteredTags.hasOwnProperty('Image Height')) {
            imageTags.imageHeight = filteredTags['Image Height'].value;
        }
        if(filteredTags.hasOwnProperty('DateTimeOriginal')) {
            imageTags.dateCreated = filteredTags['DateTimeOriginal'].value[0];
        }

        // console.log('imageTags', imageTags); 
        return imageTags;
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
