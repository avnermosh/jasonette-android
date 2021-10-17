
import {
    Vector3 as THREE_Vector3,
    OrthographicCamera as THREE_OrthographicCamera,
} from '../../include/three.js/three.js-r120/build/three.module.js';

import { Model } from "./Model.js";
import { COL } from  "../COL.js";
import "../orbitControl/OrbitControlsUtils.js";

class ImageInfo {
    constructor({filename, imageTags = undefined, cameraInfo_asDict = undefined, blobInfo = undefined}) {
        this.filename = filename;
        this.imageTags = imageTags;

        if(cameraInfo_asDict)
        {
            this.cameraInfo = cameraInfo_asDict;
            this.cameraInfo.cameraPosition = new THREE_Vector3(cameraInfo_asDict.cameraPosition.x,
                                                               cameraInfo_asDict.cameraPosition.y,
                                                               cameraInfo_asDict.cameraPosition.z);
        }
        else
        {
            this.cameraInfo = {
                cameraFrustumLeftPlane: undefined,
                cameraFrustumRightPlane: undefined,
                cameraFrustumTopPlane: undefined,
                cameraFrustumBottomPlane: undefined,
                cameraFrustumNearPlane: undefined,
                cameraFrustumFarPlane: undefined,
                cameraPosition: new THREE_Vector3(),
                cameraMinZoom: 0,
                cameraZoom: 0,
                
                rotationVal: COL.OrbitControlsUtils.defaultRotationVal,
                flipY: COL.OrbitControlsUtils.defaultFlipY,
                
                viewportExtendsOnX: undefined
            };
        }
        this.blobInfo = blobInfo;

        this.isImageInRange = ImageInfo.IsImageInRangeEnum.NOT_APPLICABLE;
    };

    dispose = function()
    {
        // console.log('BEG ImageInfo::dispose()');
        
        this.filename = null;
        this.imageTags = null;
        this.cameraInfo = null;
        this.blobInfo = null;
    };
    
    getCameraInfo = function()
    {
        // console.log('BEG getCameraInfo');
        
        let retVal = {};
        retVal['cameraFrustumLeftPlane'] = this.cameraInfo.cameraFrustumLeftPlane;
        retVal['cameraFrustumRightPlane '] = this.cameraInfo.cameraFrustumRightPlane;
        retVal['cameraFrustumTopPlane'] = this.cameraInfo.cameraFrustumTopPlane;
        retVal['cameraFrustumBottomPlane'] = this.cameraInfo.cameraFrustumBottomPlane;
        retVal['cameraFrustumNearPlane'] = this.cameraInfo.cameraFrustumNearPlane;
        retVal['cameraFrustumFarPlane'] = this.cameraInfo.cameraFrustumFarPlane;
        console.log('this.cameraInfo.cameraPosition', this.cameraInfo.cameraPosition); 
        retVal['cameraPosition'] = this.cameraInfo.cameraPosition;
        retVal['cameraMinZoom'] = this.cameraInfo.cameraMinZoom;
        retVal['cameraZoom'] = this.cameraInfo.cameraZoom;
        
        retVal['rotationVal'] = this.cameraInfo.rotationVal;
        retVal['flipY'] = this.cameraInfo.flipY;
        
        return retVal;
    };

    setCameraInfo = function(otherTexControls, otherRotationVal, otherFlipY)
    {
        // console.log('BEG setCameraInfo');
        
        if(COL.util.isObjectValid(otherTexControls))
        {
            this.cameraInfo.cameraFrustumLeftPlane = otherTexControls.camera.left;
            this.cameraInfo.cameraFrustumRightPlane = otherTexControls.camera.right;
            this.cameraInfo.cameraFrustumTopPlane = otherTexControls.camera.top;
            this.cameraInfo.cameraFrustumBottomPlane = otherTexControls.camera.bottom;
            this.cameraInfo.cameraFrustumNearPlane = otherTexControls.camera.near;
            this.cameraInfo.cameraFrustumFarPlane = otherTexControls.camera.far;
            this.cameraInfo.cameraPosition.set(otherTexControls.camera.position.x,
                                               otherTexControls.camera.position.y,
                                               otherTexControls.camera.position.z);
            this.cameraInfo.cameraMinZoom = otherTexControls.minZoom;
            this.cameraInfo.cameraZoom = otherTexControls.camera.zoom;
        }
        
        if(COL.util.isObjectValid(otherRotationVal))
        {
            this.cameraInfo.rotationVal = otherRotationVal;
        }
        
        if(COL.util.isObjectValid(otherFlipY))
        {
            this.cameraInfo.flipY = otherFlipY;
        }
        
        // this.printCameraInfo();
    }

    printImageInfo = function() {
        console.log('ImageInfo data for filename: ', this.filename);

        let imageTagsStr = this.imageTagsToString();
        console.log('imageTagsStr', imageTagsStr);

        this.printCameraInfo();
        
        if(COL.util.isObjectValid(this.blobInfo))
        {
            console.log(this.blobInfo.toString());
        }
        else
        {
            console.log('blobInfo: ', this.blobInfo);
        }

        console.log('isImageInRange', this.isImageInRange); 
        // newline
        console.log('');         
    };
    
    printCameraInfo = function() {
        console.log('CameraInfo for filename: ', this.filename);

        console.log('cameraInfo.rotationVal', this.cameraInfo.rotationVal);
        console.log('cameraInfo.flipY', this.cameraInfo.flipY);
        console.log('cameraInfo.cameraFrustumLeftPlane', this.cameraInfo.cameraFrustumLeftPlane);
        console.log('cameraInfo.cameraFrustumRightPlane', this.cameraInfo.cameraFrustumRightPlane);
        console.log('cameraInfo.cameraFrustumTopPlane', this.cameraInfo.cameraFrustumTopPlane);
        console.log('cameraInfo.cameraFrustumBottomPlane', this.cameraInfo.cameraFrustumBottomPlane);
        console.log('cameraInfo.cameraFrustumNearPlane', this.cameraInfo.cameraFrustumNearPlane);
        console.log('cameraInfo.cameraFrustumFarPlane', this.cameraInfo.cameraFrustumFarPlane);
        console.log('cameraInfo.cameraPosition', this.cameraInfo.cameraPosition);
        console.log('cameraInfo.cameraMinZoom', this.cameraInfo.cameraMinZoom);
        console.log('cameraInfo.cameraZoom', this.cameraInfo.cameraZoom);
    };
    
    imageTagsToString = function() {
        let imageInfoStr = 'filename: ' + this.filename;
        if(COL.util.isObjectValid(this.imageTags))
        {
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
            if(this.imageTags.dateTimeOriginal)
            {
                imageInfoStr += '\n' + 'Date taken: ' + this.imageTags.dateTimeOriginal;
            }
        }

        return imageInfoStr;
    };

    static validateImagesInfo = function(imagesInfo) {
        let iter = imagesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            var filename = keyVal[0];
            let imageInfo = keyVal[1];
            if(!imageInfo.blobInfo.isBlobUrlValid())
            {
                let msgStr = 'filename: ' + filename + ' imageInfo.blobInfo.blobUrl is invalid';
                console.log(msgStr); 
            }
        }
    };

    static PrintImagesInfo = function(imagesInfo) {
        // newline
        console.log('');         
        console.log('imagesInfo.size()', imagesInfo.size());
        
        let iter = imagesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let filename = keyVal[0];
            let imageInfo = keyVal[1];
	    imageInfo.printImageInfo();
        }
    };

    static getSelectedImageInfo = function (layer) {

        let imageInfo = undefined;
        if(COL.util.isObjectValid(layer))
        {
            let imageInfoVec = layer.getImagesInfo();
            let selectedOverlayRect = layer.getSelectedOverlayRect();
            if(COL.util.isObjectValid(selectedOverlayRect))
            {
                let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
                imageInfo = imageInfoVec.getByKey(selectedImageFilename);
            }
        }
        
        return imageInfo;
    };

    // https://stackoverflow.com/questions/40201589/serializing-an-es6-class-object-as-json/40201783
    toJSON = function() {
        return {
            blobInfo: this.blobInfo,
            filename: this.filename,
            imageTags: this.imageTags,
            cameraInfo: this.cameraInfo,
        };
    };
};

ImageInfo.IsImageInRangeEnum = { IN_RANGE: 0, NOT_IN_RANGE: 1, NOT_APPLICABLE: 2 };

export { ImageInfo };
