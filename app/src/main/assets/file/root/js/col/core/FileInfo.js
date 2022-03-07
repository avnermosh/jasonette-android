// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import {
    Vector3 as THREE_Vector3,
    OrthographicCamera as THREE_OrthographicCamera,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { Model } from "./Model.js";
import { COL } from  "../COL.js";
import "../orbitControl/OrbitControlsUtils.js";

class FileInfo {
    constructor(filename, blobInfo = undefined) {
        this.filename = filename;
        this.blobInfo = blobInfo;
    };

    dispose()
    {
        this.filename = null;
        this.blobInfo = null;
    };
    
    printInfo = function() {
        console.log('FileInfo data for filename: ', this.filename);

        if(COL.util.isObjectValid(this.blobInfo))
        {
            console.log(this.blobInfo.toString());
        }
        else
        {
            console.log('blobInfo: ', this.blobInfo);
        }
    };

    validateInfo = function() {
        if(!this.blobInfo.isBlobUrlValid())
        {
            let msgStr = 'filename: ' + filename + ' blobInfo.blobUrl is invalid';
            console.log(msgStr); 
        }
    };
    
    static validateFilesInfo = function(filesInfo) {
        let iter = filesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            var filename = keyVal[0];
            let fileInfo = keyVal[1];
            fileInfo.validatInfo();
        }
    };

    static PrintFilesInfo = function(filesInfo) {
        // newline
        console.log('');         
        console.log('filesInfo.size()', filesInfo.size());
        
        let iter = filesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let filename = keyVal[0];
            let fileInfo = keyVal[1];
	    fileInfo.printInfo();
        }
    };

    static getSelectedFileInfo = function (layer) {

        let fileInfo = undefined;
        if(COL.util.isObjectValid(layer))
        {
            let fileInfoVec = layer.getFilesInfo();
            let selectedOverlayRect = layer.getSelectedOverlayRect();
            if(COL.util.isObjectValid(selectedOverlayRect))
            {
                let selectedFileFilename = selectedOverlayRect.getSelectedFileFilename();
                fileInfo = fileInfoVec.getByKey(selectedFileFilename);
            }
        }
        
        return fileInfo;
    };

    // https://stackoverflow.com/questions/40201589/serializing-an-es6-class-object-as-json/40201783
    toJSON = function() {
        return {
            blobInfo: this.blobInfo,
            filename: this.filename,
        };
    };
};

export { FileInfo };
