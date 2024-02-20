// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { Model } from './Model.js';
import { COL } from  '../COL.js';
import { ImageInfo } from  './ImageInfo.js';

class ImageTags {
    constructor({filename = undefined, imageOrientation = -1}) {
        this.filename = filename;
        this.imageOrientation = imageOrientation;
        this.imageWidth = undefined;
        this.imageHeight = undefined;
        this.dateCreated = undefined;
        this.projectionType = undefined;
        this.documentId = undefined;
    }

    dispose() {
        this.filename = null;
    }
    
    imageTagsToString() {
        let imageTagsStr = 'filename: ' + this.filename;
        if(COL.util.isObjectValid(this.imageTags)) {
            // if(this.imageTags.imageHeight)
            // {
            //     imageTagsStr += '\n' + 'imageHeight: ' + this.imageTags.imageHeight;
            // }
            // if(this.imageTags.imageWidth)
            // {
            //     imageTagsStr += '\n' + 'imageWidth: ' + this.imageTags.imageWidth;
            // }
            // if(this.imageTags.imageOrientation !== -1)
            // {
            //     imageTagsStr += '\n' + 'imageOrientation: ' + this.imageTags.imageOrientation;
            // }
            if(this.imageTags.dateCreated) {
                imageTagsStr += '\n' + 'Date taken: ' + this.imageTags.dateCreated;
            }
        }

        return imageTagsStr;
    }

    // https://stackoverflow.com/questions/40201589/serializing-an-es6-class-object-as-json/40201783
    toJSON() {
        return {
            filename: this.filename,
            imageOrientation: this.imageOrientation,
            imageWidth: this.imageWidth,
            imageHeight: this.imageHeight,
            dateCreated: this.dateCreated,
            documentId: this.documentId,
            projectionType: this.projectionType
            
        };
    }

    static Is360Image(){
        let selectedLayer = COL.model.getSelectedLayer();
        let imageInfo = ImageInfo.getSelectedImageInfo(selectedLayer);
        let imageTags = imageInfo.imageTags;
        // console.log('imageTags.projectionType', imageTags.projectionType);
        
        if(imageTags.documentId == 'xmp.did:F11BAC28E47BE111A4938BBB8DE52F5D') {
            // hardcode for IMG_360example1.jpg - it has no 360 allImageTags ...
            return true;
        }

        if (COL.util.isObjectValid(imageTags.projectionType) && (imageTags.projectionType == 'equirectangular')) {
            return true;
        }
        else{
            return false;
        }
    }

    // exifreader can read tags (e.g. orientation) from jpg files (does not work with png files)
    static async GetImageTags (filename, blob) {
        // console.log('BEG GetImageTags');

        let blobArrayBuffer = await blob.arrayBuffer();
        const allImageTags = ExifReader.load(blobArrayBuffer);
        // console.log('all allImageTags', allImageTags);

        let imageTags = new ImageTags({filename: filename});

        if(COL.util.isObjectValid(allImageTags['Orientation'])) {
            imageTags.imageOrientation = allImageTags['Orientation'].value;
        }
        else{
            imageTags.imageOrientation = -1;
        }

        if(COL.util.isObjectValid(allImageTags['Image Width'])) {
            imageTags.imageWidth = allImageTags['Image Width'].value;
        }

        if(COL.util.isObjectValid(allImageTags['Image Height'])) {
            imageTags.imageHeight = allImageTags['Image Height'].value;
        }

        // DateTimeOriginal
        //     'DateTime',
        //     'date:create',
        if(COL.util.isObjectValid(allImageTags['DateTimeOriginal'])) {
            imageTags.dateCreated = allImageTags['DateTimeOriginal'].value;
        }

        if(COL.util.isObjectValid(allImageTags['ProjectionType'])) {
            imageTags.projectionType = allImageTags['ProjectionType'].value;
        }

        if(COL.util.isObjectValid(allImageTags['DocumentID'])) {
            imageTags.documentId = allImageTags['DocumentID'].value;
        }

        // console.log('imageTags', imageTags); 
        return imageTags;
    }    

}

export { ImageTags };
