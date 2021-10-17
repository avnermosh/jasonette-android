/*global THREE*/

import {DoubleSide as THREE_DoubleSide,
        Mesh as THREE_Mesh,
        BufferGeometry as THREE_BufferGeometry,
        Geometry as THREE_Geometry,
        Box3 as THREE_Box3,
        ObjectLoader as THREE_ObjectLoader,
        ImageUtils as THREE_ImageUtils,
        LoadingManager as THREE_LoadingManager
       } from '../../include/three.js/three.js-r120/build/three.module.js';

import { COL } from  "../COL.js";
import { Model } from "../core/Model.js";
import { Layer } from "../core/Layer.js";
import { BlobInfo } from "../core/BlobInfo.js";
import { ImageInfo } from "../core/ImageInfo.js";
import { Scene3DtopDown } from "../core/Scene3DtopDown.js";
import { OverlayRect } from "../core/OverlayRect.js";
import "./CO_LoaderUtils.js";

COL.loaders.CO_ObjectLoader = {
};


(function () {

    var _this = this;

    this.loadLayerJson_fromUrl = async function (layerUrl, layer, texturePath)
    {
        console.log('BEG loadLayerJson_fromUrl');

        // objectLoader (ObjectLoader is the loader for json - see https://threejs.org/docs/index.html#api/en/loaders/ObjectLoader)
        // It is different than objLoader (which is for .obj file)
        let objectLoader = new THREE_ObjectLoader();
        
        // disable cache for topDown.json files, so after updating the overlayRects
        // e.g. adding/deleting overlayRect or adding/deleting images from an overlayRect, the new data is reflected.
        // (this was originally done for OBJLoader, MTLLoader which are instances of Loader, for hard-loading the .obj, .mtl
        //  and adjusted to ObjectLoader, but the now the objectLoader is only used to parse the data, and the .json data is requested via regular fetch.
        //  So the 'Cache-Control': 'no-cache, no-store, must-revalidate' settings needs to be added to the headersData in the fetchData 
        //  for the regular fetch - see below)
        
        objectLoader.requestHeader = { 'Cache-Control': 'no-cache, no-store, must-revalidate' };

        //////////////////////////////////////////////////////////////////////////////
        // fetch the layer json data from the webserver,
        // and parse into a json object
        //////////////////////////////////////////////////////////////////////////////

        // javascript fetch json
        // https://gist.github.com/msmfsd/fca50ab095b795eb39739e8c4357a808

        // disable cache for topDown.json files, so after updating the overlayRects
        // e.g. adding/deleting overlayRect or adding/deleting images from an overlayRect, the new data is reflected.
        let headersData = {
            'X-CSRF-Token': COL.model.csrf_token,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };
        
        let fetchData = { 
            method: 'GET', 
            headers: headersData,
        };
        
        let response = await fetch(layerUrl, fetchData);
        
        await COL.errorHandlingUtil.handleErrors(response);
        let dataAsJson = await response.json();


        //////////////////////////////////////////////////////////////////////////////
        // we get here, once, when selecting a plan in the menu.
        // here we add the layerJsonFilename so it is alway in the metaDataFilesInfo list
        // the actual content of the layerJsonFilename entry is updated wheneve we sync with the webserver (e.g. by clicking on the magickwand icon)
        //////////////////////////////////////////////////////////////////////////////

        let metaDataFilesInfo = layer.getMetaDataFilesInfo();
        let layerJsonFilename = layer.getLayerJsonFilename();
        let layer_asJson_str = JSON.stringify(dataAsJson);
        COL.loaders.utils.addMetaDataFileInfoToMetaDataFilesInfo(metaDataFilesInfo, layer_asJson_str, layerJsonFilename);

        //////////////////////////////////////////////////////////////////////////////
        // populate layer._imagesInfo from dataAsJson._imagesInfo
        //////////////////////////////////////////////////////////////////////////////

        if(COL.util.isObjectValid(dataAsJson._imagesInfo))
        {
            let imagesInfo_asDict = dataAsJson._imagesInfo;
            layer.toImagesInfo(imagesInfo_asDict);
        }

        let imagesInfo_forLayer0 = layer.getImagesInfo();
        
        //////////////////////////////////////////////////////////////////////////////
        // populate layer.scene3DtopDown from dataAsJson
        //////////////////////////////////////////////////////////////////////////////

        await layer.toScene3DtopDown(objectLoader, dataAsJson.scene3DtopDown);

        //////////////////////////////////////////////////////////////////////////////
        // populate layer._selectedOverlayRect from dataAsJson.selectedOverlayRect
        //////////////////////////////////////////////////////////////////////////////

        if(COL.util.isObjectValid(dataAsJson.selectedOverlayRect))
        {
            await layer.toSelectedOverlayRect(dataAsJson.selectedOverlayRect);
        }
        
        ////////////////////////////////////////////////////////////////////////////
        // sanity check - verify that
        // this.imagesInfo
        // imagesInfo_forLayer2 (from overlayRect.imageNames)
        // are the same
        ////////////////////////////////////////////////////////////////////////////

        // layer.imagesInfo is populated earlier in layer.toImagesInfo
        let imagesInfo_forLayer1 = layer.getImagesInfo();
        
        Scene3DtopDown.render1();
    };
    
    this.loadLayerJson_fromWebServer = async function (layer, planInfo) {
        // console.log('BEG loadLayerJson_fromWebServer'); 

        // sanity check
        let overlayMeshGroup = layer.getOverlayMeshGroup();
        if(overlayMeshGroup.children.length > 0)
        {
            throw new Error('Error from loadObjectAndMaterialFiles fromWebServerObjFile: overlayMeshGroup is not empty');
        }

        let layerJsonFilename = layer.getLayerJsonFilename();
        try{
            // load layer.getLayerJsonFilename()
            let texturePath = '';
            let layerUrl = COL.model.getUrlImagePathBase() + '/' + planInfo.siteId + '/' + planInfo.id + '/' + layerJsonFilename;
            await _this.loadLayerJson_fromUrl(layerUrl, layer, texturePath);
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
        
        let metaDataFilesInfo = layer.getMetaDataFilesInfo();
        
        // remove the prefix "./" before the file name if it exists e.g. ./foo.json -> foo.json
        const regex2 = /\.\//gi;
        let filename = filename2.replace(regex2, '');
        
        // The function loadingManager.setURLModifier is called for all the files that are related to
        //  topDown.json (i.e. .jpg, etc..)
        // loadingManager.setURLModifier() is called via "mtlLoader_MaterialCreator.preload()" which calls: createMaterial -> ... ->
        //   LoadingManager::resolveURL (in three.module.js) ->
        //   loadingManager.setURLModifier (in this.loadLayerJsonFile_fromZipFile)
        let fileType = COL.util.getFileTypeFromFilename(filename);

        let blobInfo = undefined;
        switch(fileType) {
            case "jpg":
            case "png": {
                let imageInfo = imagesInfo.getByKey(filename);
                if(COL.util.isObjectInvalid(imageInfo))
                {
                    console.log('imagesInfo'); 
                    imagesInfo.printKeysAndValues();
                    let msgStr = 'Invalid imageInfo for filename: ' + filename;
                    throw new Error(msgStr);
                }
                blobInfo = imageInfo.blobInfo;

                break;
            }
            case "json":
            case "txt": {
                let metaDataFileInfo = metaDataFilesInfo.getByKey(filename);
                if(COL.util.isObjectInvalid(metaDataFileInfo))
                {
                    console.log('metaDataFilesInfo'); 
                    metaDataFilesInfo.printKeysAndValues();
                    let msgStr = 'Invalid metaDataFileInfo for filename: ' + filename;
                    throw new Error(msgStr);
                }
                blobInfo = metaDataFileInfo.blobInfo;

                break;
            }
            default: {
                let msgStr = 'Error from loadLayerJsonFile fromZipFile. Invalid filename: ' + filename;
                throw new Error(msgStr);
            }
        }
        
        if(COL.util.isObjectInvalid(blobInfo))
        {
            let msgStr = 'Invalid blobInfo for filename: ' + filename;
            throw new Error(msgStr);
        }
        
        if(COL.util.isObjectInvalid(blobInfo.blobUrl))
        {
            let msgStr = 'Invalid blobInfo.blobUrl for filename: ' + filename;
            throw new Error(msgStr);
        }

        return blobInfo.blobUrl;
    };
    
    this.loadLayerJsonFile_fromZipFile = function (layerJsonFilename, layer) {
        // console.log('BEG loadLayerJsonFile_fromZipFile'); 

        return new Promise(async function(resolve, reject) {
            try
            {
                if(COL.util.isObjectInvalid(layerJsonFilename))
                {
                    console.error('layerJsonFilename is invalid');
                    reject(false);
                }
                
                let blobUrl = _this.getBlobUrl2(layer, layerJsonFilename);
                let texturePath = '';
                await _this.loadLayerJson_fromUrl(blobUrl, layer, texturePath);
                // https://stackoverflow.com/questions/37977589/promise-resolve-with-no-argument-passed-in
                // Promise.resolve() without variable immediately fulfills with the undefined value that is implicitly passed in.
                // The callback is still executed asynchronously.
                // I want it to wait, (because some params, (e.g. 'imagesInfo') theoretically can be populated inside) and used after this function
                // so I'm injecting an artificial variable 'true'
                resolve(true);
            }
            catch(err) {
                console.error('err', err); 
                let msgStr = 'Error from loadLayerJsonFile fromZipFile. layerJsonFilename: ' + layerJsonFilename;
                return reject(false);
            }
            
        }); // return new Promise
    };

}).call(COL.loaders.CO_ObjectLoader);
