/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

/* global THREE*/

import {DoubleSide as THREE_DoubleSide,
    Mesh as THREE_Mesh,
    Box3 as THREE_Box3,
    ObjectLoader as THREE_ObjectLoader,
    ImageUtils as THREE_ImageUtils,
    LoadingManager as THREE_LoadingManager
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from '../core/Model.js';
import { Layer } from '../core/Layer.js';
import { BlobInfo } from '../core/BlobInfo.js';
import { ImageInfo } from '../core/ImageInfo.js';
import { PlanView } from '../core/PlanView.js';
import { OverlayRect } from '../core/OverlayRect.js';
import './CO_LoaderUtils.js';

COL.loaders.CO_ObjectLoader = {
};


(function () {

    var _this = this;

    this.loadLayerJson_fromUrl = async function (layerUrl, layer) {
        // console.log('BEG loadLayerJson_fromUrl');

        // objectLoader (ObjectLoader is the loader for json - see https://threejs.org/docs/index.html#api/en/loaders/ObjectLoader)
        let objectLoader = new THREE_ObjectLoader();
        
        // disable cache for planView.json files, so after updating the overlayRects
        // e.g. adding/deleting overlayRect or adding/deleting images from an overlayRect, the new data is reflected.
        objectLoader.requestHeader = { 'Cache-Control': 'no-cache, no-store, must-revalidate' };

        // ////////////////////////////////////////////////////////////////////////////
        // fetch the layer json data from the webserver,
        // and parse into a json object
        // ////////////////////////////////////////////////////////////////////////////

        // javascript fetch json
        // https://gist.github.com/msmfsd/fca50ab095b795eb39739e8c4357a808

        // disable cache for planView.json files, so after updating the overlayRects
        // e.g. adding/deleting overlayRect or adding/deleting images from an overlayRect, the new data is reflected.
        let headersData = {
            'X-CSRF-Token': COL.util.getCSRFToken(),
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };
        
        let fetchData = { 
            method: 'GET', 
            headers: headersData,
        };
        
        let response = await fetch(layerUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);
        let dataAsJson = await response.json();

        // ////////////////////////////////////////////////////////////////////////////
        // we get here, once, when selecting a plan in the menu.
        // here we add the layerJsonFilename so it is alway in the metaDataBlobsInfo list
        // the actual content of the layerJsonFilename entry is updated wheneve we sync with the webserver (e.g. by clicking on the magickwand icon)
        // ////////////////////////////////////////////////////////////////////////////

        let metaDataBlobsInfo = layer.getMetaDataBlobsInfo();
        let layerJsonFilename = layer.getLayerJsonFilename();
        let layer_asJson_str = JSON.stringify(dataAsJson);
        // when loading from webserver, set isDirty to false because the blob is in sync
        // with the webserver and nothing has changed yet.
        BlobInfo.UpdateMetaDataBlobsInfo({metaDataBlobsInfo: metaDataBlobsInfo, 
            metaData: layer_asJson_str, 
            filename: layerJsonFilename, 
            isDirty: false});

        // ////////////////////////////////////////////////////////////////////////////
        // populate layer.imagesInfo from dataAsJson.imagesInfo
        // ////////////////////////////////////////////////////////////////////////////

        if(COL.util.isObjectValid(dataAsJson.imagesInfo)) {
            let imagesInfo_asDict = dataAsJson.imagesInfo;
            layer.toImagesInfo(imagesInfo_asDict);
        }

       
        // ////////////////////////////////////////////////////////////////////////////
        // populate layer.planView from dataAsJson
        // ////////////////////////////////////////////////////////////////////////////

        await layer.toPlanView(objectLoader, dataAsJson.planView);

        // ////////////////////////////////////////////////////////////////////////////
        // populate layer.selectedOverlayRect from dataAsJson.selectedOverlayRect
        // ////////////////////////////////////////////////////////////////////////////

        if(COL.util.isObjectValid(dataAsJson.selectedOverlayRect)) {
            if(COL.isOldGUIEnabled) {
                await layer.toSelectedOverlayRect(dataAsJson.selectedOverlayRect);
            }
        }
                
        PlanView.Render();
    };
    
    this.loadLayerJson_fromWebServer = async function (layer, siteId, planId) {
        // console.log('BEG loadLayerJson_fromWebServer'); 

        // sanity check
        let overlayMeshGroup = layer.getOverlayMeshGroup();
        if(overlayMeshGroup.children.length > 0) {
            throw new Error('Error from loadObjectAndMaterialFiles fromWebServerObjFile: overlayMeshGroup is not empty');
        }

        let layerJsonFilename = layer.getLayerJsonFilename();
        try{
            // load layer.getLayerJsonFilename()
            let layerUrl = COL.model.getUrlImagePathBase() + '/' + siteId + '/' + planId + '/' + layerJsonFilename;
            await _this.loadLayerJson_fromUrl(layerUrl, layer);

            // update the syncWithWebServerStatus for the layer to true, after loading the layer from the webserver
            layer.setSyncWithWebServerStatus(true);
        } 
        catch(err){
            console.error('err', err); 
            let msgStr = 'Error from loadLayerJson_fromUrl. layerJsonFilename: ' + layerJsonFilename;
            throw new Error(msgStr);
        }
    };

    this.getBlobUrl2 = function (layer, filename2) {

        let imagesInfo = layer.getImagesInfo();
        // console.log('imagesInfo', imagesInfo.toString());
        
        let metaDataBlobsInfo = layer.getMetaDataBlobsInfo();
        
        // remove the prefix "./" before the file name if it exists e.g. ./foo.json -> foo.json
        const regex2 = /\.\//gi;
        let filename = filename2.replace(regex2, '');

        let fileType = COL.util.getFileTypeFromFilename(filename);
        let blobInfo = undefined;
        switch(fileType) {
            case 'jpg':
            case 'png': {
                let imageInfo = imagesInfo.getByKey(filename);
                if(COL.util.isObjectInvalid(imageInfo)) {
                    console.log('imagesInfo'); 
                    imagesInfo.printKeysAndValues();
                    let msgStr = 'Invalid imageInfo for filename: ' + filename;
                    throw new Error(msgStr);
                }
                blobInfo = imageInfo.imageBlobInfo;

                break;
            }
            case 'json':
            case 'txt': {
                let metaDataBlobInfo = metaDataBlobsInfo.getByKey(filename);
                if(COL.util.isObjectInvalid(metaDataBlobInfo)) {
                    console.log('metaDataBlobsInfo'); 
                    metaDataBlobsInfo.printKeysAndValues();
                    let msgStr = 'Invalid metaDataBlobInfo for filename: ' + filename;
                    throw new Error(msgStr);
                }
                blobInfo = metaDataBlobInfo;

                break;
            }
            default: {
                let msgStr = 'Error from loadLayerJsonFile fromZipFile. Invalid filename: ' + filename;
                throw new Error(msgStr);
            }
        }
        
        if(COL.util.isObjectInvalid(blobInfo)) {
            let msgStr = 'Invalid blobInfo for filename: ' + filename;
            throw new Error(msgStr);
        }
        
        if(COL.util.isObjectInvalid(blobInfo.blobUrl)) {
            let msgStr = 'Invalid blobInfo.blobUrl for filename: ' + filename;
            throw new Error(msgStr);
        }

        return blobInfo.blobUrl;
    };
    
    this.loadLayerJsonFile_fromZipFile = async function (layerJsonFilename, layer) {
        // console.log('BEG loadLayerJsonFile_fromZipFile'); 

        try {
            if(COL.util.isObjectInvalid(layerJsonFilename)) {
                throw new Error('layerJsonFilename is invalid');
            }
            
            let blobUrl = _this.getBlobUrl2(layer, layerJsonFilename);
            await _this.loadLayerJson_fromUrl(blobUrl, layer);
            // update the syncWithWebServerStatus for the layer to false, after loading the layer from the zip file.
            layer.setSyncWithWebServerStatus(false);
            return true;
        }
        catch(err) {
            console.error('err', err); 
            let msgStr = 'Error from loadLayerJsonFile fromZipFile. layerJsonFilename: ' + layerJsonFilename;
            // rethrow
            throw new Error(msgStr);
        }
        
    };

}).call(COL.loaders.CO_ObjectLoader);
