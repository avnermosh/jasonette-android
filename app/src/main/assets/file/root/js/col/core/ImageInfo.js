// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import {
    Vector3 as THREE_Vector3,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { Model } from './Model.js';
import { COL } from  '../COL.js';
import '../orbitControl/OrbitControlsUtils.js';
import { ImageView } from './ImageView.js';
import { ImageTags } from './ImageTags.js';
import { BlobInfo } from './BlobInfo.js';
import { Annotation } from './Annotation.js';

class ImageInfo {
    constructor({imageFilename,
        annotationFilename = undefined,
        imageTags = undefined,
        imageBlobInfo = undefined,
        annotationBlobInfo = undefined,
        annotationAsJsonStr = undefined}) {

        if(COL.util.isObjectInvalid(imageFilename)) {
            throw new Error('ImageInfo::imageFilename invalid');
        }

        this.imageFilename = imageFilename;
        this.imageBlobInfo = imageBlobInfo;
        this.annotationFilename = annotationFilename;

        this.annotationBlobInfo = annotationBlobInfo;
        // annotationAsJsonStr - the elements of the fabricCanvas
        this.annotationAsJsonStr = annotationAsJsonStr;
        
        if(COL.util.isObjectValid(imageTags)) {
            this.imageTags = imageTags;
        }
        else{
            this.imageTags = new ImageTags({filename: imageFilename});
        }

        this.isImageInRange = ImageInfo.IsImageInRangeEnum.NOT_APPLICABLE;
    }

    dispose() {
        // console.log('BEG ImageInfo::dispose()');

        this.imageTags = null;
        this.imageFilename = null;
        this.imageBlobInfo = null;
        this.annotationFilename = null;
        this.annotationBlobInfo = null;
        this.annotationAsJsonStr = null;
    }
    
    printImageInfo() {
        console.log('ImageInfo data for imageFilename: ', this.imageFilename);

        let imageTagsStr = this.imageTagsToString();
        console.log('imageTagsStr', imageTagsStr);

        console.log('isImageInRange', this.isImageInRange); 
        // newline
        console.log('');         
    }
    
    imageTagsToString() {
        let imageInfoStr = 'imageFilename: ' + this.imageFilename;
        if(COL.util.isObjectValid(this.imageTags)) {
            // if(this.imageTags.imageHeight)
            // {
            //     imageInfoStr += '\n' + 'imageHeight: ' + this.imageTags.imageHeight;
            // }
            // if(this.imageTags.imageWidth)
            // {
            //     imageInfoStr += '\n' + 'imageWidth: ' + this.imageTags.imageWidth;
            // }
            // if(this.imageTags.imageOrientation !== -1)
            // {
            //     imageInfoStr += '\n' + 'imageOrientation: ' + this.imageTags.imageOrientation;
            // }
            if(this.imageTags.dateCreated) {
                imageInfoStr += '\n' + 'Date taken: ' + this.imageTags.dateCreated;
            }
        }

        return imageInfoStr;
    }

    validateInfo() {
        if(!this.imageBlobInfo.isBlobUrlValid()) {
            let msgStr = 'imageFilename: ' + imageFilename + ' imageBlobInfo.blobUrl is invalid';
            console.log(msgStr); 
        }
    }
    
    static validateImagesInfo(imagesInfo) {
        let iter = imagesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let imageInfo = keyVal[1];
        }
    }

    static PrintImagesInfo(imagesInfo) {
        // newline
        console.log('');         
        console.log('imagesInfo.size()', imagesInfo.size());
        
        let iter = imagesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let imageInfo = keyVal[1];
	        imageInfo.printImageInfo();
        }
    }

    static getSelectedImageInfo(layer) {

        let imageInfo = undefined;
        if(COL.util.isObjectValid(layer)) {
            let imageInfoVec = layer.getImagesInfo();
            let selectedOverlayRect = layer.getSelectedOverlayRect();
            if(COL.util.isObjectValid(selectedOverlayRect)) {
                let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
                imageInfo = imageInfoVec.getByKey(selectedImageFilename);
            }
        }
        
        return imageInfo;
    }

    async updateImageInfoFromUrl (imageBlobUrl, imageAnnotationBlobUrl) {
        // console.log('BEG updateImageInfoFromUrl');

        await this.updateImageTags(imageBlobUrl);
        
        if(COL.util.isObjectInvalid(this.imageBlobInfo)) {
            // the blob is not in memory. Update it, and since we are only displaying it set isDirty=false
            this.imageBlobInfo = new BlobInfo({filenameFullPath: this.imageFilename, blobUrl: imageBlobUrl, isDirty: false});
        }
        else {
            // the blob is in memory. It may be a new blob with a isDirty=true (or a preloaded blob from the webServer with isDirty=true)
            // so leave isDirty as is
            this.imageBlobInfo.blobUrl = imageBlobUrl;
        }

        if(COL.util.isObjectValid(this.annotationFilename)) {
            // annotationFilename exists - create annotationBlobInfo or update it with imageAnnotationBlobUrl
            if(COL.util.isObjectInvalid(this.annotationBlobInfo)) {
                this.annotationBlobInfo = new BlobInfo({filenameFullPath: this.annotationFilename, blobUrl: imageAnnotationBlobUrl, isDirty: false});
            }
            else {
                this.annotationBlobInfo.blobUrl = imageAnnotationBlobUrl;
            }
        }

        let fabricCanvasAsJson = COL.model.fabricCanvas.toJSON(['annotationState', 'uuid']);
        this.annotationAsJsonStr = JSON.stringify(fabricCanvasAsJson);

        // console.log('this.annotationAsJsonStr', this.annotationAsJsonStr);
    }        

    async updateImageTags (imageBlobUrl) {
        // console.log('BEG updateImageTags');
        
        let fileType = COL.util.getFileTypeFromFilename(this.imageFilename);
        this.imageTags = new ImageTags({filename: this.imageFilename});
        if(fileType === 'jpg') {
            // load imageTags from the image. This will update the imageTags for the image in imagesInfo
            
            // get the blob from the imageBlobUrl
            let response = await fetch(imageBlobUrl);
            await COL.errorHandlingUtil.handleErrors(response);
            let blob = await response.blob();
            this.imageTags = await ImageTags.GetImageTags(this.imageFilename, blob);
        }
    }

    addAnnotationShape3(shape) {
        Annotation.AddAnnotationShape4(shape);

        // Render the canvas
        COL.model.fabricCanvas.renderAll();
        ImageView.Render2();

        let fabricCanvasAsJson = COL.model.fabricCanvas.toJSON(['annotationState', 'uuid']);
        this.annotationAsJsonStr = JSON.stringify(fabricCanvasAsJson);
    }

    async updateAnnotationBlob() {
        // console.log('BEG updateAnnotationBlob');

        let selectedLayer = COL.model.getSelectedLayer();

        // update annotationAsJsonStr
        let fabricCanvasAsJson = {
            canvasWidth: COL.model.fabricCanvas.width,
            canvasHeight: COL.model.fabricCanvas.height,
            freeDrawingBrushWidth: COL.model.fabricCanvas.freeDrawingBrush.width,
            state: COL.model.fabricCanvas.toJSON(['annotationState', 'uuid'])
        };
        this.annotationAsJsonStr = JSON.stringify(fabricCanvasAsJson);

        if( COL.util.isObjectInvalid(this.annotationFilename) ) {
            // set this.annotationFilename from this.imageFilename, e.g. IMG_6626.jpg -> IMG_6626.json
            this.annotationFilename = this.imageFilename.replace(/\.[^.]+$/, '.json');
        }

        let metaDataBlobsInfo = selectedLayer.getMetaDataBlobsInfo();
        
        // update annotationBlobInfo
        this.annotationBlobInfo = BlobInfo.UpdateMetaDataBlobsInfo({metaDataBlobsInfo: metaDataBlobsInfo, 
            metaData: this.annotationAsJsonStr, 
            filename: this.annotationFilename, 
            isDirty: true});

        // update imageInfo within imagesInfo after the annotationBlob has changed
        let imagesInfo = selectedLayer.getImagesInfo();
        imagesInfo.set(this.imageFilename, this);

        // mark as not-synced after updating the annotationBlob.
        selectedLayer.setSyncWithWebServerStatus(false);

        // Sync with the backend
        let syncStatus = await selectedLayer.syncBlobsWithWebServer();
        if(!syncStatus) {
            throw new Error('Error from sync BlobsWithWebServer after adding rectangle annotation.');
        }
    }

    // https://stackoverflow.com/questions/40201589/serializing-an-es6-class-object-as-json/40201783
    toJSON() {
        let imageInfo_asJson = {
            imageBlobInfo: this.imageBlobInfo.toJSON(),
            annotationFilename: this.annotationFilename,
            imageFilename: this.imageFilename,
            imageTags: this.imageTags,
        };

        if(COL.util.isObjectValid(this.annotationBlobInfo)) {
            // tbd - rename ImageInfo -> AssetInfo ? also stores annotationInfo (e.g. img1234.json)
            // the information about the annotationBlobInfo
            imageInfo_asJson = { ...imageInfo_asJson, ...{annotationBlobInfo: this.annotationBlobInfo.toJSON()} };
            // no need to output the annotationAsJsonStr to json (as we don't want them to end up in the layer .json file
            // annotationAsJsonStr is represented in its own file e.g. img1234.json
        }

        return imageInfo_asJson;
    }
}

ImageInfo.IsImageInRangeEnum = { IN_RANGE: 0, NOT_IN_RANGE: 1, NOT_APPLICABLE: 2 };

export { ImageInfo };
