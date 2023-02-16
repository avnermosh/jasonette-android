/* eslint-disable no-case-declarations */
/* eslint-disable no-dupe-class-members */
/* eslint-disable new-cap */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

/* eslint-disable max-len */
// //////////////////////////////////////////////////////////////
//
// The layer file is 
//
// //////////////////////////////////////////////////////////////

/* global THREE*/
/* global Note*/

import {Object3D as THREE_Object3D,
    MeshBasicMaterial as THREE_MeshBasicMaterial,
    CircleGeometry as THREE_CircleGeometry,
    PlaneGeometry as THREE_PlaneGeometry,
    Mesh as THREE_Mesh,
    Vector3 as THREE_Vector3,
    MeshPhongMaterial as THREE_MeshPhongMaterial, 
    DoubleSide as THREE_DoubleSide,
    FrontSide as THREE_FrontSide,
    Box3 as THREE_Box3,
    Vector2 as THREE_Vector2,
    Vector4 as THREE_Vector4,
    TextureLoader as THREE_TextureLoader,
    RGBFormat as THREE_RGBFormat,
    ClampToEdgeWrapping as THREE_ClampToEdgeWrapping,
    LinearFilter as THREE_LinearFilter,
    SpriteMaterial as THREE_SpriteMaterial,
    Sprite as THREE_Sprite        
} from '../../static/three.js/three.js-r135/build/three.module.js';

import {CSS2DObject, CSS2DRenderer} from '../../static/CSS2DRenderer.js';

import { COL } from  '../COL.js';
import { Model } from './Model.js';
import { OverlayRect } from './OverlayRect.js';
import { BlobInfo } from './BlobInfo.js';
import { PlanView } from './PlanView.js';
import { ImageView } from './ImageView.js';
import { Note } from './Note.js';
import { ImageInfo } from './ImageInfo.js';
// import { Whiteboard } from "./Whiteboard.js";
import './Core.js';
import './FileNotes.js';
import '../util/Util.js';
import '../util/ThreejsUtil.js';
import { OrbitControlsPlanView } from '../orbitControl/OrbitControlsPlanView.js';

let imageCountTotal_numFilesBetweenReporting = 10;
// let imageCountTotal_numFilesBetweenReporting = 2;
var imageCountTotal = 0;

// layer a.k.a. plan a.k.a. floor
class Layer {
    constructor(layerName, planInfo, isLayerFromZipFile=false){
        this.planInfo = planInfo;
        this.setLayerName(layerName);
        this.isLayerFromZipFile = isLayerFromZipFile;

        // _overlayMeshGroup is a threejs object that stores the contents of the overlay images:
        // - representation of the images, as dots to be overlayed in the selected plan pane:
        // - location, mesh of type circle
        this._overlayMeshGroup = new THREE_Object3D();
        this._overlayMeshGroup.name = 'overlayRects';

        // _overlayRects is a list of OverlayRect objects
        //   _overlayRects and _overlayMeshGroup are equivalent (but not identical)
        //   - _overlayMeshGroup - is a threejs object and contains threejs entires (e.g. list of THREE_Mesh that are stored as children) 
        //   - _overlayRects - is an AssociativeArray and contains OverlayRect entries (e.g. that stores logic that is unrelated to threejs,
        //      e.g. the last revisited image in the OverlayRect (stored in _selectedImageFilenameIndex)) 
        this._overlayRects = new COL.util.AssociativeArray();

        // _removedOverlayMeshGroup is a threejs object that stores the contents of the removed overlay images:
        // it is used to display the ring around the removed overlayRect until the
        // removed overlayRect is synced to the back-end
        this._removedOverlayMeshGroup = new THREE_Object3D();
        this._removedOverlayMeshGroup.name = 'removedOverlayRects';

        // stickyNoteGroup stores the mutable overlay related meshes
        this.stickyNoteGroup = new THREE_Object3D();
        this.stickyNoteGroup.name = 'stickyNotes';

        this.planView = undefined;
        this.imageView = undefined;
        
        this.noteArray = new COL.util.AssociativeArray();

        // accumulated list of all the metaData (.json [notes]) files , as they are added 
        this._metaDataFilesInfo = new COL.util.AssociativeArray();
        
        // accumulated list of all the overlay images, as they are added 
        this._imagesInfo = new COL.util.AssociativeArray();

        // container for removed images 
        this._removedImagesInfo = new COL.util.AssociativeArray();

        // for manageMemory - the last N images (can cross multiple overlayRects) to keep in RAM
        this._cachedImages = new COL.util.AssociativeArray();
        
        // The selected overlayRect (e.g. the yellow dot)
        this._selectedOverlayRect = undefined;

        // for mergeing overlayRects
        this._selectedForMergeOverlayRects = new COL.util.AssociativeArray();
        
        // The currently loaded texture image
        this._currentSprite = undefined;

        // _floorPlanMeshObj stores the planView plan related mesh
        this._floorPlanMeshObj = null;

        if(COL.doEnableWhiteboard) {
            this._floorPlanWhiteboard = new Whiteboard();
        }

        this._playImagesState = Layer.PLAY_IMAGES_STATE.NONE;

        this._layerJsonFilename = this.planInfo.planFilename;
        this._floorPlanImageFilename = null;

        // indication if the layer is dirty (i.e. not synced with the layer in the back-end)
        this._isDirty2 = {
            isDirty_general: false,
            isDirty_overlayRectRemoved: false,
            isDirty_overlayRectDirty: false
        };

        this.isSyncedWithWebServer2 = false;

        // container for the filename(s) that are in synced in progress
        // if specific file(s) throws an exception, we use this container in the catch block to
        // report the files that we failed to sync e.g. in a error toast 
        this.synced_filenames_in_progress = [];

        // container for the return values from exach sync request, that is used e.g. to report which
        // files failed to sync and the faile reason
        this.syncRetVals = [];

        // accumulated list of all the milestone date ranges, as they are added 
        this._milestoneDatesInfo = new COL.util.AssociativeArray();
        this._isMilestoneDatesFilterEnabled = false;
        
        // this._generalInfo - generalInfo for the layer, such as
        // - this._generalInfo.softwareVersion - the version for the layer
        //   1.0 - load overlay from overlay.obj, overlay.mtl (obsolete)
        //   1.1 - load overlay from layer.getLayerJsonFilename()
        //   1.2 - rename topDown -> planView (structure change in the plan .json file)
        //   1.1.0 - remove generalMetadata, 
        this._generalInfo;
    }

    async toPlanView (objectLoader, planView_asDict) {
        // console.log('BEG toPlanView');

        let planView = this.getPlanView();
        await planView.fromJson(this, objectLoader, planView_asDict);
        PlanView.Render();
    }

    async toSelectedOverlayRect (selectedOverlayRect_asDict) {
        let meshObjectUuid = selectedOverlayRect_asDict['_meshObject.uuid'];
        let meshObject =  this._overlayMeshGroup.getObjectByProperty( 'uuid', meshObjectUuid );
        await this.setSelectedOverlayRect(meshObject);
        await this.showSelectedOverlayRect();
    }

    async initializeFloorPlanWhiteboard () {
    }
    
    migrateVersion(currentVersion, targetVersion){
        // TBD
        // migrate the layer to the new vesion
        // (depending on the version (e.g. from 1.0.0.to 1.1.0))

        // this.setGeneralInfo(generalInfoAsJson);

        // at a minimum:
        // - update the generalInfo in the .json file to have the new version
        //
        // optionally:
        // - migrate the data in the .json file to the new vesion if needed
    }

    async populateFloorPlanObj () {
        // console.log('BEG CO_ObjectLoader populateFloorPlanObj');

        let floorPlanObj = this.getFloorPlanMeshObj();

        let imagesInfo = this.getImagesInfo();
        if(COL.util.isObjectInvalid(imagesInfo)) {
            imagesInfo = new COL.util.AssociativeArray();
        }

        // tbd - fix hardcoding
        let meshObj1 = floorPlanObj.children[0];
        
        // sanity check
        if ( (meshObj1.type !== 'Mesh') || (meshObj1.name === 'ring') || (COL.util.isObjectInvalid(meshObj1.material))) {
            throw new Error('Invalid meshObj1. Should have: type "Mesh", name !== "ring", material defined');
        }

        // ////////////////////////////////////////////////////////////////////////////
        // For meshObj1:
        // - set the material
        // - calc the bounding box
        // - add the floorPlan as imageInfo (with blobUrl) to layer
        // ////////////////////////////////////////////////////////////////////////////
        
        meshObj1.material.side = THREE_DoubleSide;
        meshObj1.material.needsUpdate = true;
        // meshObj1.material.setMaterialOptions( {side: THREE_DoubleSide, needsUpdate: true} );
        meshObj1.material.polygonOffset = true;
        meshObj1.material.polygonOffsetUnits = 4;
        meshObj1.material.polygonOffsetFactor = 1;
        
        meshObj1.geometry.computeBoundingBox();
        floorPlanObj.bBox = meshObj1.geometry.boundingBox;

        let userData = meshObj1.material.userData;
        
        let imagesNames_asDict = userData['imagesNames'];
        if(COL.util.isObjectInvalid(imagesNames_asDict)) {
            console.error('imagesNames_asDict is invalid'); 
        }
        
        let imagesNames_asDict_asJson_numElements = Object.keys(imagesNames_asDict).length;
        let floorPlanFilename = Object.keys(imagesNames_asDict)[0];
        // console.log('floorPlanFilename1', floorPlanFilename);
        this.setFloorPlanImageFilename(floorPlanFilename);

        let planInfo = this.getPlanInfo();
        let floorPlanFilenameFullPath = planInfo.siteId + '/' + planInfo.id + '/' + floorPlanFilename;
        let blobInfo = new BlobInfo({filenameFullPath: floorPlanFilenameFullPath, blobUrl: undefined, isDirty: true});
        let imageInfo = new ImageInfo({filename: floorPlanFilename, blobInfo: blobInfo});

        // ////////////////////////////////////////////////////////////////////////////
        // add the floorPlan as imageInfo, with blobUrl, to layer in steps:
        // - first with blobUrl set to undefined (needed for getting the blobUrl)
        // - then get the blobUrl
        // - then add the blobUrl to imageInfo
        // ////////////////////////////////////////////////////////////////////////////

        imagesInfo.set(floorPlanFilename, imageInfo);
        this.setImagesInfo(imagesInfo);
        
        let blobUrl = await this.getImageBlobUrl(floorPlanFilename);
        blobInfo = new BlobInfo({filenameFullPath: floorPlanFilename, blobUrl: blobUrl, isDirty: true});
        imageInfo.blobInfo = blobInfo;

        await this.loadPlanViewTextureFromBlobUrl(blobUrl);

        // need to add floorPlanFilename to imagesInfo, so that it
        // gets saved to the backend e.g. when syncing from zip file to the webserver
        imagesInfo.set(floorPlanFilename, imageInfo);

        this.setImagesInfo(imagesInfo);

        // return imagesInfo;
    }
    
    populateOverlayRects (overlayMeshGroup) {
        // console.log('BEG CO_ObjectLoader populateOverlayRects');

        let _this = this;
        
        overlayMeshGroup.traverse(function ( child ) {
            if( child.material ) {
                child.material.side = THREE_DoubleSide;
            }
            if ( (child.type === 'Mesh') && (child.name !== 'ring') ) {
                child.geometry.computeBoundingBox();
                overlayMeshGroup.bBox = child.geometry.boundingBox;
    
                let imagesNames_asDict = child.material.userData['imagesNames'];
    
                let imagesNames = new COL.util.AssociativeArray();
                if(COL.util.isObjectValid(imagesNames_asDict)) {
                    for (let filename in imagesNames_asDict) {
                        imagesNames.set(filename, true);
                    }
                }
                else {
                    console.error('imagesInfo is invalid for overlayRect');
                }
    
                child.material.userData['imagesNames'] = imagesNames;
                    
                // Set all overlayRects to 'regular' (e.g. mark as NOT selectedOverlayRect)
                child.material.color.setHex( COL.util.Color.Acqua );

                // Set all overlayRects to 'regular' (e.g. mark overlayRect as NOT in move process)
                for (let i = child.children.length - 1; i >= 0; i--) {
                    if (child.children[i].name === 'ring') {
                        COL.ThreejsUtil.disposeObject(child.children[i]);
                        child.remove(child.children[i]);
                    }
                }

                let overlayRect = new OverlayRect(child);
    
                _this._overlayRects.set(child.name, overlayRect);
    
                // userData['imagesNames'] has 2 forms:
                // - as a string (when it is read and written to e.g. layer.json file)
                // - as associativeArray class when it's fed to overlayRect
            }
        });

        this.setOverlayMeshGroup(overlayMeshGroup);
    }
    
    toImagesInfo (imagesInfo_asDict) {
        // console.log('BEG toImagesInfo'); 

        let imagesInfo_forLayer = new COL.util.AssociativeArray();
        
        let imagesInfo_asDict_numElements = Object.keys(imagesInfo_asDict).length;
        for (let filename in imagesInfo_asDict) {
            let imageInfo_asDict = imagesInfo_asDict[filename];
            // console.log('imageInfo_asDict', imageInfo_asDict);
            
            let blobUrl = COL.util.getNestedObject(imageInfo_asDict, ['blobInfo', 'blobUrl']);
            if(COL.util.isObjectValid(blobUrl)) {
                // when using the json file, the blobUrl does not really exist, and has to be reloaded from the zip file.
                // So remove the blobUrl (otherwise, the program thinks that the file is loaded in memory, which is not the case)
                imageInfo_asDict.blobInfo.blobUrl = null;
            }

            let blobInfo_asDict = imageInfo_asDict.blobInfo;

            let blobInfo = null;
            if(COL.util.isObjectValid(blobInfo_asDict)) {
                blobInfo = new BlobInfo({filenameFullPath: blobInfo_asDict.filename,
                    blobUrl: blobInfo_asDict.fileUrl,
                    isDirty: false});
            }
            else {
                blobInfo = new BlobInfo({filenameFullPath: filename,
                    blobUrl: undefined,
                    isDirty: false});
            }
            
            let imageInfo = new ImageInfo({filename: filename,
                imageTags: imageInfo_asDict.imageTags,
                cameraInfo_asDict: imageInfo_asDict.cameraInfo,
                blobInfo: blobInfo});
            
            imagesInfo_forLayer.set(filename, imageInfo);
        }


        let iter = this._imagesInfo.iterator();
        while (iter.hasNext()) {
            let imageInfo = iter.next();
            imageInfo.dispose();
        }
        this._imagesInfo.clear();
        
        this._imagesInfo = imagesInfo_forLayer;
        
    }


    addStickyNote () {
        console.log('BEG addStickyNote');

        let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
        if(selectedImageFilename) {
            let index = this.noteArray.size();
            let noteNumber = Number(index);
            let noteId = 'note' + noteNumber;
            let dataStr = '{"ops":[{"insert":"My Note"},{"attributes":{"header":1},"insert":"\\n"}]}';

            let noteData = dataStr;
            let noteStyle = {
                top: 0,
                left: 0
            };
            let imageFilename = selectedImageFilename;
            let imageView = this.getImageView();
            var imageViewScene = imageView.getImageViewScene();
            var camera = imageView.getCamera();
            var labelRenderer = imageView.getlabelRenderer();

            let newNote = new Note(noteId,
                noteData,
                noteStyle,
                imageFilename,
                index,
                this,
                labelRenderer,
                imageViewScene,
                camera);

            this.noteArray.set(noteId, newNote);
        }
    }

    initLayer () {
        // console.log('BEG initLayer');

        this.planView = new PlanView;
        this.planView.initPlanView();

        if(COL.doEnableWhiteboard) {
            this.initializeFloorPlanWhiteboard();
        }
        
        // add the _removedOverlayMeshGroup to the scene
        this.planView.addToScene(this._removedOverlayMeshGroup);
        
        this.imageView = new ImageView();
        this.imageView.initSelectedView();
    }

    getIsMilestoneDatesFilterEnabled () {
        return this._isMilestoneDatesFilterEnabled;
    }

    setIsMilestoneDatesFilterEnabled (isMilestoneDatesEnabled) {
        this._isMilestoneDatesFilterEnabled = isMilestoneDatesEnabled;
    }

    getOverlayMeshGroup () {
        return this._overlayMeshGroup;
    }

    setOverlayMeshGroup (overlayMeshGroup) {
        this._overlayMeshGroup = overlayMeshGroup;
    }

    getOverlayRectByName (overlayRectName) {
        let overlayRect = this._overlayRects.getByKey(overlayRectName);
        return overlayRect;
    }

    getOverlayRects () {
        return this._overlayRects;
    }
    
    updateOverlayRectScale (overlayRectScale) {
        // console.log('BEG updateOverlayRectScale');
        
        // update the scale for future overlayRects
        this.planView.setOverlayRectScale(overlayRectScale);

        // update the scale for existing overlayRects
        this._overlayMeshGroup.traverse(function ( child ) {
            if ( (child.type === 'Mesh') && (child.name !== 'ring') ) {
                child.scale.set(overlayRectScale, overlayRectScale, overlayRectScale);
            }
        });
        PlanView.Render();
    }
    
    // ///////////////////////////////////////////////////////////////
    // Create an overlay mesh object and add it to overlayMeshGroup
    // Return the newly-created overlay mesh object from the overlayMeshGroup
    // ///////////////////////////////////////////////////////////////

    addToOverlayMeshGroup_createOverlayRect_andAddToOverlayRects (otherMeshObj) {
        console.log('BEG addToOverlayMeshGroup_createOverlayRect_andAddToOverlayRects'); 
        
        let overlayRectRadius = this.planView.getOverlayRectRadius();
        let meshObj = new THREE_Mesh( otherMeshObj.geometry, otherMeshObj.material );
        
        // Update rotation angles, so that the circle can be seen from above
        meshObj.rotation.x = -Math.PI/2;
        meshObj.name = otherMeshObj.name;
        meshObj.visible = true;
        // copy the position onto meshObj
        meshObj.position.copy(otherMeshObj.position);
        meshObj.scale.copy(otherMeshObj.scale);
        
        // after adding meshObj to overlayMeshGroup, we need to call "updateMatrixWorld()".
        // for _raycasterPlanView.intersectObjects() to intersect with the new object.
        meshObj.updateMatrixWorld();

        // //////////////////////////////////////////
        // create label with the number of images
        // //////////////////////////////////////////

        let overlayRect = new OverlayRect(meshObj);
        meshObj = overlayRect.getMeshObject();
        
        let numImagesInOverlayRect = overlayRect.getNumImagesInOverlayRect();
        let labelText = numImagesInOverlayRect;
        let overlayRectLabel = OverlayRect.makeSpriteLabel(overlayRectRadius, labelText);
        meshObj.add(overlayRectLabel);

        if(COL.doUseRing) {
            let overlayRectRing = OverlayRect.makeRing(overlayRectRadius);
            meshObj.add(overlayRectRing);
        }
        this._overlayMeshGroup.add(meshObj);

        // sanity check - check that every OverlayRect._imageName has a counter-part in Layer._imagesInfo
        let imageNames = overlayRect.getImagesNames();
        console.log('imageNames', imageNames);
        
        let iter = imageNames.iterator();
        while (iter.hasNext()) {
            let imageName = iter.nextKey();
            let imageInfo = this._imagesInfo.getByKey(imageName);
            if(COL.util.isObjectInvalid(imageInfo)) {
                let msgStr = 'imageName: ' + imageName + ' does not have a corresponding imageInfo';
                console.error(msgStr);
            }
        }
        
        this._overlayRects.set(meshObj.name, overlayRect);

        return meshObj;
    }

    // ///////////////////////////////////////////////////////////////
    // Remove the overlay mesh object from overlayMeshGroup
    // ///////////////////////////////////////////////////////////////

    removeFromOverlayMeshGroup (overlayMeshObj) {
        // console.log('BEG removeFromOverlayMeshGroup');
        
        if(COL.util.isObjectInvalid(overlayMeshObj)) {
            // sanity check
            throw new Error('overlayMeshObj is invalid');
        }
        
        // remove overlayMeshObj from Layer.overlayMeshGroup
        let object = this._overlayMeshGroup.getObjectByName( overlayMeshObj.name, true );
        this._overlayMeshGroup.remove( object );

        // hide the overlayRect circle, and the label and only leave the ring visible to
        // indicate the removed overlayRect
        let spriteLabelObj = overlayMeshObj.getObjectByName ('spriteLabel');
        spriteLabelObj.visible = false;
        overlayMeshObj.material.visible = false;
        
        this._removedOverlayMeshGroup.add(overlayMeshObj);
        
        // Remove from Layer._overlayRects
        this._overlayRects.remove(overlayMeshObj.name);
    }
    
    getLayerName () {
        return this.name;
    }

    setLayerName (layerName) {
        // console.log('BEG setLayerName(layerName)'); 

        // sanity check
        if(layerName != Layer.CreateLayerName(this.planInfo.siteName, this.planInfo.name)) {
            throw new Error('layerName does not match the expected name');
        }
        this.name = layerName;
    }

    setLayerName () {
        // console.log('BEG setLayerName'); 

        if(COL.util.isObjectInvalid(this.planInfo)) {
            throw new Error('this.planInfo is invalid');
        }
        
        this.name = Layer.CreateLayerName(this.planInfo.siteName, this.planInfo.name);
    }

    getPlanView () {
        // tbd - maybe fix the logic, so that getPlanView is only called when this.planView is valid
        //   and re-introduce the throw...
        //
        // if(COL.util.isObjectInvalid(this.planView))
        // {
        //     // Support the case where after loading from zip file, the layer's planView may not be ready temporarily.
        //     // - in Layer::getPlanView(), if planView is not set yet, return null instead of throwing.

        //     // throw new Error('this.planView is invalid');
        //     return null;
        // }
        return this.planView;
    }

    getImageView () {
        return this.imageView;
    }
    
    getNoteArray () {
        return this.noteArray;
    }
    
    setNoteArray (noteArray) {
        this.noteArray = noteArray;
    }

    getPlanInfo () {
        return this.planInfo;
    }
    
    setPlanInfo (planInfo) {
        this.planInfo = planInfo;
    }

    getStickyNoteGroup () {
        return this.stickyNoteGroup;
    }

    addToStickyNoteGroup (css2DObject) {
        this.stickyNoteGroup.add( css2DObject );
    }

    getSelectedOverlayRect () {
        return this._selectedOverlayRect;
    }

    getSyncWithWebServerStatus() {
        // console.log('this.isSyncedWithWebServer2', this.isSyncedWithWebServer2);
        let isSyncedWithWebServer21 = this.isSyncedWithWebServer2;
        // console.log('isSyncedWithWebServer21', isSyncedWithWebServer21);
        return this.isSyncedWithWebServer2;
    }

    setSyncWithWebServerStatus(otherisSyncedWithWebServer2) {
        // console.log('BEG setSyncWithWebServerStatus');
        this.isSyncedWithWebServer2 = otherisSyncedWithWebServer2;
        COL.util.setSyncWithWebServerStatus(this.isSyncedWithWebServer2);
        // console.log('this.isSyncedWithWebServer2', this.isSyncedWithWebServer2);
    }

    getSprite () {
        // console.log('BEG getSprite');
        
        return this._currentSprite;
    }

    setSprite (otherSprite) {
        // console.log('BEG setSprite');

        if( COL.util.isObjectValid(this._currentSprite) ) {
            COL.ThreejsUtil.disposeObject(this._currentSprite);
        }
           
        this._currentSprite = otherSprite;
    }

    isSelectedOverlayRect (overlayRect) {
        return (overlayRect == this._selectedOverlayRect);
    }

    getSelectedForMergeOverlayRects () {
        return this._selectedForMergeOverlayRects;
    }

    setSelectedForMergeOverlayRects (otherOverlayRect) {
        // console.log('BEG setSelectedForMergeOverlayRects'); 

        let otherMeshObj = otherOverlayRect.getMeshObject();
        if(this._selectedForMergeOverlayRects.size() == 0) {
            // color for first overlayRect in selectedForMergeOverlayRects, where all other overlayRects are going to be merged into.
            otherMeshObj.material.color.setHex( COL.util.Color.Orange1 );
            otherMeshObj.material.needsUpdate = true;
        }
        else{
            // get the first overlayRect
            let firstOverlayRect = this._selectedForMergeOverlayRects.getFirstVal();
            let firstOverlayRectMeshObject = firstOverlayRect.getMeshObject();
            console.log('firstOverlayRectMeshObject.name', firstOverlayRectMeshObject.name);
            console.log('otherMeshObj.name', otherMeshObj.name);

            if(otherMeshObj.name !== firstOverlayRectMeshObject.name) {
                otherMeshObj.material.color.setHex( COL.util.Color.Orange2 );
                otherMeshObj.material.needsUpdate = true;
            }
        }

        this._selectedForMergeOverlayRects.set(otherMeshObj.name, otherOverlayRect);
    }

    
    async showSelectedOverlayRect() {

        console.log('BEG showSelectedOverlayRect1');
        
        let spinnerJqueryObj = $('#inProgressSpinnerId');
        spinnerJqueryObj.addClass('is-active');

        // update things related to the image
        // - clear the texture
        // - set image info string to NA
        // - set imageNumOutOfTotalImages to NA
        await this.updateImageThumbnailsRelatedRenderring();

        // show the tiled images
        let overlayRectImageThumbnailsPaneEl = document.getElementById('overlayRectImageThumbnailsPaneId');
        await COL.manageGUI.setPane(overlayRectImageThumbnailsPaneEl);
        spinnerJqueryObj.removeClass('is-active');
    }

    // /////////////////////////////////////////////////////////////
    // Sets the selectedOverlayRect (yellow image dot)
    // /////////////////////////////////////////////////////////////

    async setSelectedOverlayRect (otherMeshObject) {
        // console.log('BEG setSelectedOverlayRect'); 

        try {
            // let imageInfo2 = ImageInfo.getSelectedImageInfo();
            // if( COL.util.isObjectValid(imageInfo2) )
            // {
            //     console.log('imageInfo222222222222 before setting new selectedOverlayRect'); 
            //     imageInfo2.printCameraInfo();
            // }

            let meshObject = undefined;
            if( COL.util.isObjectValid(this._selectedOverlayRect) ) {
                meshObject = this._selectedOverlayRect.getMeshObject();
            }

            // /////////////////////////////////////////////////////////////
            // Before setting the selectedOverlayRect, which changes the selected image
            // persist the imageInfo (e.g. camerainfo) of the last selected image,
            // so that if we revisit this image, we will get the same view setting
            // of the image (e.g. zoom)
            // /////////////////////////////////////////////////////////////

            this.saveSelectedImageCameraInfo();
            
            // /////////////////////////////////////////////////////////////
            // Set selectedOverlayRect
            // /////////////////////////////////////////////////////////////

            // Fill _selectedOverlayRect (using otherMeshObject) from entry in _overlayRects
            // (with _overlayRects states, e.g. last revisited image index in this overlaRect)

            if(COL.util.isObjectValid(otherMeshObject)) {
                // otherMeshObject is defined. Set this._selectedOverlayRect
                // from an entry in this._overlayRects that has the same name as otherMeshObject.name
                
                // console.log('otherMeshObject.name', otherMeshObject.name);
                this._selectedOverlayRect = this._overlayRects.getByKey(otherMeshObject.name);
                if(COL.util.isObjectInvalid(this._selectedOverlayRect)) {
                    // sanity check
                    console.error('otherMeshObject.name', otherMeshObject.name); 
                    throw new Error('this._selectedOverlayRect is invalid. (it is set from a mesh object that is not in the list of this._overlayRects)');
                }

                let planView = this.getPlanView();
                let orbitControls = planView.getOrbitControls();
                if(orbitControls.getState() == OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT) {
                    // add the overlayRect to the list of selectedForMergeOverlayRects
                    this.setSelectedForMergeOverlayRects(this._selectedOverlayRect);
                }

                let selectedOverlayRectName = this._selectedOverlayRect.getMeshObject().name;
                let selectedForMergeOverlayRect = this._selectedForMergeOverlayRects.getByKey(selectedOverlayRectName);
            }
            else {
                // can get here if e.g. clicking in non-overlayRect area
                this._selectedOverlayRect = undefined;
            }
        }
        catch(err) {
            console.error('err', err);

            let toastTitleStr = 'setSelectedOverlayRect';
            let msgStr = 'Failed to setSelectedOverlayRect. ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
        
    }

    saveSelectedImageCameraInfo () {
        // console.log('BEG saveSelectedImageCameraInfo'); 

        let imageInfo = ImageInfo.getSelectedImageInfo(this);
        if( COL.util.isObjectValid(imageInfo) ) {
            // ///////////////////////////////////////////////////////////////
            // A previous selectedImage exists
            // persist its imageInfo (e.g. camerainfo), so that if we revisit
            // this image, we will get the same view setting of the image (e.g. zoom)
            // ///////////////////////////////////////////////////////////////

            let imageView = this.getImageView();
            imageInfo.setCameraInfo(imageView.getControls(), imageView.getRotationVal(), imageView.getFlipY());
        }
    }
    
    getImagesInfo () {
        return this._imagesInfo;
    }

    setImagesInfo (imagesInfo) {
        this._imagesInfo = imagesInfo;
    }

    getRemovedImagesInfo () {
        return this._removedImagesInfo;
    }
    
    setRemovedImagesInfo (removedImagesInfo) {
        this._removedImagesInfo = removedImagesInfo;
    }
    
    getMetaDataFilesInfo () {
        return this._metaDataFilesInfo;
    }

    setMetaDataFilesInfo (metaDataFilesInfo) {
        this._metaDataFilesInfo = metaDataFilesInfo;
    }
    
    getEditOverlayRectFlag () {
        let planView = this.getPlanView();
        let orbitControls = planView.getOrbitControls();
        let orbitControlsState = orbitControls.getState();
        switch(orbitControlsState) {
            case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT:
                return true;
            default:
                return false;
        }
    }

    getPlayImagesState () {
        return this._playImagesState;
    }

    setPlayImagesState(playImagesState) {
        this._playImagesState = playImagesState;
    }

    getGeneralInfo () {
        return this._generalInfo;
    }

    setGeneralInfo (generalInfo) {
        this._generalInfo = generalInfo;
    }

    getLayerJsonFilename () {
        return this._layerJsonFilename;
    }

    setLayerJsonFilename (layerJsonFilename) {
        this._layerJsonFilename = layerJsonFilename;
    }

    getFloorPlanMeshObj () {
        return this._floorPlanMeshObj;
    }

    setFloorPlanMeshObj (floorPlanMeshObj) {
        this._floorPlanMeshObj = floorPlanMeshObj;
    }

    getFloorPlanImageFilename () {
        // console.log('floorPlanFilename2', this._floorPlanImageFilename);

        return this._floorPlanImageFilename;
    }

    setFloorPlanImageFilename (floorPlanImageFilename) {
        this._floorPlanImageFilename = floorPlanImageFilename;
    }
    
    getFloorPlanWhiteboard () {
        if(COL.doEnableWhiteboard) {
            // sanity check - should not get here
            throw new Error('getFloorPlanWhiteboard called while doEnableWhiteboard === false');
        }
        return this._floorPlanWhiteboard;
    }

    setFloorPlanWhiteboard (floorPlanWhiteboard) {
        if(COL.doEnableWhiteboard) {
            // sanity check - should not get here
            throw new Error('getFloorPlanWhiteboard called while doEnableWhiteboard === false');
        }
        this._floorPlanWhiteboard = floorPlanWhiteboard;
    }

    async loadNextOrPreviousImage (doLoadNextImage) {
        // console.log('BEG loadNextOrPreviousImage'); 
        if(COL.util.isObjectValid(this._selectedOverlayRect)) {
            await this._selectedOverlayRect.nextOrPrevSelectedImage(this, doLoadNextImage);
        }
    }
    
    async playImagesInSelectedOverlayRect () {
        // console.log('BEG playImagesInSelectedOverlayRect');

        try {
            let playImagesState = this.getPlayImagesState();
            if(this.getPlayImagesState() !== Layer.PLAY_IMAGES_STATE.NONE) {
                let numLoops = 1;
                for (let loopIndex = 0; loopIndex < numLoops; loopIndex++) {
                    // console.log('Doing loop', loopIndex, 'of', numLoops);

                    if(COL.util.isObjectInvalid(this._selectedOverlayRect)) {
                        throw new Error('Invalid _selectedOverlayRect');
                    }

                    // sleep for some time
                    await COL.util.sleep(OverlayRect.playImages_timeToSleepInMilliSecs);
                    
                    await this._selectedOverlayRect.playImages(this);
                }
            }
        }
        catch(err) {
            console.error('err', err);

            let toastTitleStr = 'playImagesInSelectedOverlayRect';
            let msgStr = 'Failed to playImagesInSelectedOverlayRect. ' + err;
            console.trace();
            let consoleStack = err.stack;
            console.log('consoleStack', consoleStack); 
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
    }

    async playImagesInAllOverlayRects() {
        // console.log('BEG playImagesInAllOverlayRects');

        try {
            if(this.getPlayImagesState() !== Layer.PLAY_IMAGES_STATE.NONE) {
                let numLoops = 20;
                // let numLoops = 1;
                for (let loopIndex = 0; loopIndex < numLoops; loopIndex++) {
                    // console.log('Doing loop', loopIndex, 'of', numLoops);
                    
                    let iter = this._overlayRects.iterator();
                    while (iter.hasNext()) {

                        let overlayRect1 = iter.next();
                        await this.setSelectedOverlayRect(overlayRect1.getMeshObject());
                        await this.showSelectedOverlayRect();
                        if(this.getPlayImagesState() == Layer.PLAY_IMAGES_STATE.NONE) {
                            // stop the play
                            console.log('stop the play'); 
                            break;
                        }
                        await this.playImagesInSelectedOverlayRect();
                    }
                    if(this.getPlayImagesState() == Layer.PLAY_IMAGES_STATE.NONE) {
                        // stop the play
                        console.log('stop the play'); 
                        break;
                    }
                }
            }
        }
        catch(err) {
            console.error('err', err);

            let toastTitleStr = 'playImagesInAllOverlayRects';
            let msgStr = 'Failed to playImagesInAllOverlayRects. ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
        
    }
    
    // Returns blobUrl for image specified with imageFilename.
    // 
    // Return the blobUrl:
    // 1. from memory, if it exists, or
    // 2. if using webserver, from webserver image blob, or
    // 3. if using zip file, from zip file image blob, or
    // 4. fail
    async  getImageBlobUrl (imageFilename) {
        // console.log('BEG getImageBlobUrl');

        try {
            let imageInfo = this._imagesInfo.getByKey(imageFilename);
            if(COL.util.isObjectInvalid(imageInfo)) {
                let a =3;
            }
            
            let blobInfo = imageInfo.blobInfo;
            
            let blobUrl = undefined;
            if(COL.util.isObjectValid(blobInfo)) {        
                if(COL.util.isObjectValid(COL.util.getNestedObject(blobInfo, ['blobUrl']))) {
                    // the blobUrl exists in memory - get the blobUrl from memory 
                    blobUrl = blobInfo.blobUrl;
                }
                else if (!this.isLayerFromZipFile){
                    // get the blobUrl from webserver image blob.

                    // e.g. https://localhost/avner/img/45/56/image_0.jpg
                    let url = Model.GetUrlBase() + COL.model.getUrlImagePathBase() +
                        '/' + this.planInfo.siteId + '/' +
                        this.planInfo.id + '/' + imageFilename;

                    blobUrl = await this.getImageBlobUrlFromWebServer(url);
                }
                else {
                    // get the blobUrl from zip file image blob.

                    let imageFilenameFullPath = blobInfo.filenameFullPath;
                    let matchResults1 = imageFilenameFullPath.match( /\.jpg/i );            
                    let foundMatch1 = false;
                    if(matchResults1 && (blobInfo.dirname == '')) {
                        foundMatch1 = true;       
                    }
                   
                    if(foundMatch1 || imageFilenameFullPath === 'image8.jpg' || (imageFilenameFullPath === 'image4.jpg')) {
                        imageFilenameFullPath = this.planInfo.siteId + '/' +
                        this.planInfo.id + '/' + blobInfo.filenameFullPath;
                        blobInfo.filenameFullPath = imageFilenameFullPath;
                    }
                    blobUrl = await COL.model.fileZip.getImageBlobUrlFromZipFile(imageFilenameFullPath, this._imagesInfo);
                }
            }
            else {
                // ImageInfo.PrintImagesInfo(this._imagesInfo);
                
                let msgStr = 'Cannot get image blobUrl for image file: ' + imageFilename;
                throw new Error(msgStr);
            }
            return blobUrl;
            
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = 'getImageBlobUrl';
            let msgStr = 'Failed to getImageBlobUrl. ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
        
    }

    async getImageBlobUrlFromWebServer(url){
        // console.log('BEG getImageBlobUrlFromWebServer');
        
        // The url is without /api/v1_2
        // so this causes a simple fetch (GET) via the browser 
        // and does NOT work through the backend api (i.e. python flask)
        
        // e.g. https://localhost/avner/img/45/56/IMG_6626.jpg
        let response = await fetch(url);
        await COL.errorHandlingUtil.handleErrors(response);
        
        let blob = await response.blob();
        // console.log('blob.size1', COL.util.numberWithCommas(blob.size)); 
        let blobUrl = URL.createObjectURL(blob);
        return blobUrl;
    }

    // keep only up to N images, to cache the last images and avoid out-of-memory error
    manageMemory () {
        // console.log('BEG manageMemory'); 

        try {
            if(COL.util.isObjectInvalid(this._selectedOverlayRect)) {
                throw new Error('Invalid _selectedOverlayRect');
            }

            // Remove selectedImageFilename from the associative array and set it again.
            // this causes selectedImageFilename to be appended to the end, i.e. indicate as "touched last"
            // - if removedVal is defined, selectedImageFilename was in the array so it will change position in the array to last position
            // - if removedVal is undefined, selectedImageFilename was NOT in the array so it will be added with position set to last position
            let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
            let removedVal = this._cachedImages.remove(selectedImageFilename);

            // console.log('add image:', selectedImageFilename, 'to this._cachedImages' );
            
            // "true" is an arbitrary value (we are not interested in the values, just in the keys (associative and by order))
            this._cachedImages.set(selectedImageFilename, true);
            
            // console.log('this._cachedImages.size() before removing excess images: ', this._cachedImages.size());
            // console.log('Layer.maxNumImageBlobsInMeomry', Layer.maxNumImageBlobsInMeomry);

            if(this._cachedImages.size() > Layer.maxNumImageBlobsInMeomry) {
                // Remove the first element in the array (fifo) i.e. remove the image that was selected most ancient  
                let keyVal = this._cachedImages.shift();

                // console.log('this._cachedImages.size() after removing excess images: ', this._cachedImages.size());
                // console.log('this._imagesInfo.size()', this._imagesInfo.size());
                
                if(keyVal) {
                    // //////////////////////////////////////////////////////////////////////////////////////////
                    // Release the previous image from: this._imagesInfo and zipFileInfo (if using zip file)
                    // - revoke Object URL and set to null
                    // //////////////////////////////////////////////////////////////////////////////////////////

                    let mostAncientImageFilename = keyVal['key'];

                    // console.log('removed image:', mostAncientImageFilename, 'from this._cachedImages' );
                    let imageInfoPrev = this._imagesInfo.getByKey(mostAncientImageFilename);
                    let blobInfoPrev = imageInfoPrev.blobInfo;
                    
                    if(COL.util.isObjectValid(blobInfoPrev) && COL.util.isObjectValid(blobInfoPrev.blobUrl)) {
                        // console.log('revokeObjectURL for blobInfoPrev.blobUrl');
                        URL.revokeObjectURL(blobInfoPrev.blobUrl);
                        blobInfoPrev.blobUrl = null;
                    }

                    let zipFileInfo = COL.model.getSelectedZipFileInfo();
                    if( COL.util.isObjectValid(zipFileInfo) ) {
                        // ///////////////////////////////////////////////////////////////
                        // Clear entry from zipFileInfo.files (if using .zip file)
                        // ///////////////////////////////////////////////////////////////

                        // find zipFileInfo.files entries with substring mostAncientImageFilename
                        // e.g. "IMG_20190319_163544" in "234/567/IMG_20190319_163544"
                        
                        let filenames_inZipFileInfo = Object.keys(zipFileInfo.files);
                        let filenamesToClean_inZipFileInfo = filenames_inZipFileInfo.filter(function (filename) {
                            return filename.includes(mostAncientImageFilename);
                        });
                        
                        // console.log('filenamesToClean_inZipFileInfo', filenamesToClean_inZipFileInfo);

                        if(filenamesToClean_inZipFileInfo.length > 0) {
                            // console.log('filenamesToClean_inZipFileInfo.length', filenamesToClean_inZipFileInfo.length); 
                            let filenameToClean_inZipFileInfo = filenamesToClean_inZipFileInfo[0];
                            // console.log('filenameToClean_inZipFileInfo', filenameToClean_inZipFileInfo); 
                            let fileInfo = zipFileInfo.files[filenameToClean_inZipFileInfo];
                            if( COL.util.isObjectValid(fileInfo.url) ) {
                                URL.revokeObjectURL(fileInfo.url);
                                fileInfo.url = null;
                            }
                            
                            if( COL.util.isObjectValid(fileInfo.buffer) ) {
                                // https://stackoverflow.com/questions/43918027/what-is-the-best-way-to-free-up-memory-from-a-typedarray-in-javascript
                                fileInfo.buffer = null;
                            }

                            // {
                            //     // sanity check - count the number of entries with valid "fileInfo.buffer" in zipFileInfo.files
                            //     let numValidBuffers = 0;
                            //     let numValidObjectUrls = 0;

                            //     for (const [key, value] of Object.entries(zipFileInfo.files)) {
                            //         // console.log(key, value);
                            //         let fileInfo2 = value;
                            //         if(COL.util.isObjectValid(fileInfo2.buffer)) {
                            //             console.log('fileInfo2.filename1', fileInfo2.filename);
                            //             numValidBuffers++;
                            //         }
                            //         if(COL.util.isObjectValid(fileInfo2.url)) {
                            //             // console.log('fileInfo2.filename2', fileInfo2.filename);
                            //             numValidObjectUrls++;
                            //         }
                            //     }
                            
                            //     console.log('numValidBuffers in zipFileInfo.files', numValidBuffers); 
                            //     console.log('numValidObjectUrls in zipFileInfo.files', numValidObjectUrls); 
                            // }
                        }
                    }
                }
            }
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = 'manageMemory';
            let msgStr = 'Failed to manageMemory. ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
    }

    
    checkPossibleMemoryLeakAndReportImageCounter () {
        if( (imageCountTotal % imageCountTotal_numFilesBetweenReporting) == 0 ) {
            // // // --------------------------------------------------------------
            // // // Size of imageInfoVec
            // let imagesInfoSizeInBytes2 = this._imagesInfo.getNumBytes();
            // console.log('imagesInfoSizeInBytes2', COL.util.numberWithCommas(imagesInfoSizeInBytes2));
            
            // // // --------------------------------------------------------------
            // // // Size of zipFileInfo
            
            // console.log('imageCountTotal', imageCountTotal); 
            // let zipFileInfo = COL.model.getSelectedZipFileInfo();
            // let zipFileInfoSizeInBytes = COL.util.roughSizeOfObject(zipFileInfo);
            // console.log('zipFileInfoSizeInBytes', COL.util.numberWithCommas(zipFileInfoSizeInBytes)); 

            // --------------------------------------------------------------
            // Size of imageViewScene

            // let imagesInfoSizeInBytes1 = COL.util.roughSizeOfObject(this._imagesInfo);
            // console.log('imagesInfoSizeInBytes1', imagesInfoSizeInBytes1);

            // let imageView = this.getImageView();
            // let imageViewScene = imageView.getImageViewScene();

            // let sceneSizeInBytes = COL.util.roughSizeOfObject(imageViewScene);
            // console.log('sceneSizeInBytes', COL.util.numberWithCommas(sceneSizeInBytes)); 
            
            // // --------------------------------------------------------------
            // // Num objects in imageViewScene

            // let numObjects_in_scene = COL.util.countNumberOfObjects(imageViewScene);
            // console.log('numObjects_in_scene', numObjects_in_scene);

            // // --------------------------------------------------------------
            // // Size of planView_scene
            // let planView = this.getPlanView();
            // let planView_scene = planView.getScene();

            // let planView_scene_SizeInBytes = COL.util.roughSizeOfObject(planView_scene);
            // console.log('planView_scene_SizeInBytes', COL.util.numberWithCommas(planView_sceneizeInBytes));                
            
            // // --------------------------------------------------------------
            // // Num objects in planView_scene
            // let numObjects_in_planView_scene = COL.util.countNumberOfObjects(planView_scene);
            // console.log('numObjects_in_planView_scene', numObjects_in_planView_scene);


            // {
            //     // sanity check - count the number of entries with valid "fileInfo.buffer" in zipFileInfo.files
            //     let numValidBuffers = 0;
            //     let numValidObjectUrls = 0;

            //     for (const [key, value] of Object.entries(zipFileInfo.files)) {
            //         // console.log(key, value);
            //         let fileInfo2 = value;
            //         if(COL.util.isObjectValid(fileInfo2.buffer)) {
            //             console.log('fileInfo2.filename1', fileInfo2.filename);
            //             numValidBuffers++;
            //         }
            //         if(COL.util.isObjectValid(fileInfo2.url)) {
            //             // console.log('fileInfo2.filename2', fileInfo2.filename);
            //             numValidObjectUrls++;
            //         }
            //     }
            
            //     console.log('numValidBuffers in zipFileInfo.files', numValidBuffers); 
            //     console.log('numValidObjectUrls in zipFileInfo.files', numValidObjectUrls); 
            // }
            
            
            // --------------------------------------------------------------
            // toast with counter

            // remove the previous toast if it exists
            // https://stackoverflow.com/questions/41040911/find-and-clear-a-toast-toastr
            // toastr.clear();

            let toastTitleStr = 'Image counter';
            let msgStr = 'imageCountTotal: ' + imageCountTotal;
            // msgStr += "COL.errorHandlingUtil.toastrSettings.timeOut: " + COL.errorHandlingUtil.toastrSettings.timeOut;
            toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            
        }
        imageCountTotal++;
    }
    
    async loadImageToBlobUrl_andLoadImageInfo (imageFilename) {
        let imageInfo = this._imagesInfo.getByKey(imageFilename);

        if(COL.util.isObjectInvalid(imageInfo)) {
            // sanity check. Shouldn't reach here.
            this._imagesInfo.printKeysAndValues();
            throw new Error('imageInfo is invalid');
        }

        // sanity check
        if( imageFilename !== imageInfo.filename) {
            console.error('imageFilename', imageFilename); 
            console.error('imageInfo.filename', imageInfo.filename);
            throw new Error('Reached failure condition: "imageFilename !== imageInfo.filename"');
        }

        // Get the image blobUrl from memory, or from webserver, or from zip file
        let blobUrl = await this.getImageBlobUrl(imageFilename);

        // /////////////////////////////////////////////
        // Update _imagesInfo if needed
        // /////////////////////////////////////////////

        if(COL.util.isObjectInvalid(imageInfo.imageTags)) {
            let fileType = COL.util.getFileTypeFromFilename(imageInfo.filename);
            
            let imageTags = {};
            if(fileType === 'jpg') {
                // load imageTags from the image. This will update the imageTags for the image in _imagesInfo
                
                // get the blob from the blobUrl
                let response = await fetch(blobUrl);
                await COL.errorHandlingUtil.handleErrors(response);
                let blob = await response.blob();
                imageTags = await COL.core.ImageFile.getImageTags(imageInfo.filename, blob);
            }
            else {
                imageTags.filename = imageInfo.filename;
                imageTags.imageOrientation = -1;
            }
            imageInfo.imageTags = imageTags;
        }
        
        if(COL.util.isObjectInvalid(imageInfo.blobInfo)) {
            // the blob is not in memory. Get it from the webServer, and since we are only displaying it set isDirty=false
            let blobInfo = new BlobInfo({filenameFullPath: imageFilename, blobUrl: blobUrl, isDirty: false});
            imageInfo.blobInfo = blobInfo;
        }
        else {
            // the blob is in memory. It may be a new blob with a isDirty=true (or a preloaded blob from the webServer with isDirty=true)
            // so leave isDirty as is
            imageInfo.blobInfo.blobUrl = blobUrl;
        }

        // imageInfo.printImageInfo();

        this._imagesInfo.set(imageFilename, imageInfo);

        return blobUrl;
    }

    async loadTheSelectedImageAndRender () {
        // console.log('BEG loadTheSelectedImageAndRender');

        try {
            let selectedImageFilename;
            if(COL.util.isObjectInvalid(this._selectedOverlayRect)) {
                throw new Error('Invalid _selectedOverlayRect');
            }

            selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
            if(COL.util.isStringInvalid(selectedImageFilename)) {
                // sanity check. Shouldn't reach here
                throw new Error('selectedImageFilename is invalid');
            }

            // keep last N images, and release all other images
            let doKeepN_images = true;
            // doKeepN_images = false;
            if(doKeepN_images) {
                this.manageMemory();
            }
            else {
                console.warn('manageMemory is disabled');
            }

            let blobUrl = await this.loadImageToBlobUrl_andLoadImageInfo(selectedImageFilename);

            await this.loadSelectedImageTextureFromUrl(blobUrl);
            let imageView = this.getImageView();
            imageView.doDisplayImageDetails = true;
            this.toggleImageDisplay();

            // checkPossibleMemoryLeakAndReportImageCounter();
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = 'loadTheSelectedImageAndRender';
            toastr.error(err, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(err);
        }
        
        return true;
    }

    toggleImageDisplay() {
        // console.log('BEG toggleImageDisplay');

        // let selectedLayer = COL.model.getSelectedLayer();
        let imageView = this.getImageView();
        let imageInfo = ImageInfo.getSelectedImageInfo(this);
        if (COL.util.isObjectInvalid(imageInfo)) {
            console.error('imageInfo is not defined');
            return;
        }
        
        let dateCreated = imageInfo.imageTags.dateCreated;
        document.getElementById('dateCreatedId').innerHTML = dateCreated;
        
        if(imageView.doDisplayImageDetails) {
            // show
            document.querySelector('#imageViewPaneFooterId').style.display = 'block';
            document.querySelector('#mainHeaderId').style.display = 'flex';
        }
        else{
            // hide
            document.querySelector('#imageViewPaneFooterId').style.display = 'none';
            document.querySelector('#mainHeaderId').style.display = 'none';
        }
        // toggle
        imageView.doDisplayImageDetails = !imageView.doDisplayImageDetails;
    }

    getSelectedImageTextInfo () {
        let textInfoStr = 'NA';
        if(COL.util.isObjectValid(this._selectedOverlayRect)) {
            let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
            let imageInfoVec = this.getImagesInfo();
            let imageInfo = imageInfoVec.getByKey(selectedImageFilename);

            if(COL.util.isObjectValid(imageInfo)) {
                // ///////////////////////////////
                // Set the imageInfo string
                // ///////////////////////////////
                
                let imageInfoStr = imageInfo.imageTagsToString();
                this._selectedOverlayRect.setSelectedImageInfoStr(imageInfoStr);
                
                textInfoStr = this._selectedOverlayRect.getSelectedImageInfoStr(this);
            }
        }
        return textInfoStr;
    }
    
    async updateImageThumbnailsRelatedRenderring() {
        // console.log('BEG updateImageThumbnailsRelatedRenderring');
        
        // console.trace();
        
        try {
            if( COL.util.isObjectValid(this._selectedOverlayRect) ) {
                // ////////////////////////////////////////////////////////////////
                // Display the image and related buttons/labels
                // ////////////////////////////////////////////////////////////////
                
                // let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
                // let msgStr1 = "Display image: " + selectedImageFilename + " and related buttons/labels";
                // console.log(msgStr1);
                
                await this._selectedOverlayRect.loadImagesAsThumbnails(this);

                let numImagesInOverlayRect = this._selectedOverlayRect.getNumImagesInOverlayRect();
                let splitImageFromOverlayRectListItemEl = document.getElementById('splitImageFromOverlayRectId');
                if(numImagesInOverlayRect <= 1) {
                    splitImageFromOverlayRectListItemEl.style.display = 'none';
                }
                else{
                    splitImageFromOverlayRectListItemEl.style.display = 'list-item';
                }
            }
            else {
                // ////////////////////////////////////////////////////////////////
                // Clear image display and related buttons/labels
                // ////////////////////////////////////////////////////////////////

                // update the image info, to the one that is displayed
                this.setSprite(undefined);
                
                if(COL.isOldGUIEnabled) {
                    // update the image related labels, e.g.
                    // - "image info" string
                    // - "image index out of total number of images for the overlayRect" label (e.g. 1/3)
                    this.updateLayerImageRelatedLabels();

                    // enable/disable viewOverlayRect related buttons (nextImageButton, previousImageButton)
                    this.updatePreviousPlayNextImageButtons();
                }

                if(COL.doWorkOnline) {
                    // update the overlayRectEdit buttons, e.g. disable if no image is selected
                    this.updateEditOverlayRectRelatedButtons();
                }
            }
            PlanView.Render();
            
        }
        catch(err) {
            console.error('err', err);

            // ImageInfo.PrintImagesInfo(this._imagesInfo);
            
            // raise a toast to indicate the failure
            let toastTitleStr = 'updateImageThumbnailsRelatedRenderring';
            toastr.error(err, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
    }

    updateLayerImageRelatedLabels () {
        // update the image info that is displayed when toggling the "Info" button
        let textInfoStr = this.getSelectedImageTextInfo();
        COL.colJS.displayImageTextInfo(textInfoStr);

        // Update the "image index out of total number of images for the overlayRect" label (e.g. 1/3)
        this.setLabel_ImageIndexOfNumImagesInOverlayRect2();
    }

    updatePreviousPlayNextImageButtons () {
        // console.log('BEG updatePreviousPlayNextImageButtons'); 

        let sceneBar = COL.model.getSceneBar();

        switch( this._playImagesState ) {
            case Layer.PLAY_IMAGES_STATE.NONE:
            {
                // enable buttons: playImagesInSelectedOverlayRectButton, _playImagesInAllOverlayRectsButton
                sceneBar._playImagesInAllOverlayRectsButton.disabled(false);

                // enable/disable the loadNextOrPreviousImage depending on if 
                // - overlayRect is selected or not
                // - the number of images in the selectedOverlayRect
                if(COL.util.isObjectValid(this._selectedOverlayRect)) {
                    // if selected overlayRect has 2 or more images enable
                    // - playImagesInSelectedOverlayRectButton, 
                    // - nextImageButton, previousImageButton
                    // otherwise disable the buttons
                    
                    let numImagesInSelectedOverlayRect = this._selectedOverlayRect.getNumImagesInOverlayRect();
                    COL.colJS.playImagesInSelectedOverlayRectButton.disabled((numImagesInSelectedOverlayRect < 2));
                    sceneBar.disableNextAndPreviousImageButtons((numImagesInSelectedOverlayRect < 2));
                }
                else {
                    // no overlayRect is selected.
                    // Disable the buttons
                    // - playImagesInSelectedOverlayRectButton
                    // - nextImageButton, previousImageButton
                    COL.colJS.playImagesInSelectedOverlayRectButton.disabled(true);

                    sceneBar.disableNextAndPreviousImageButtons(true);
                }
                
                break;
            }
            case Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_SELECTED_OVERLAY_RECT:
            {
                // disable button
                sceneBar._playImagesInAllOverlayRectsButton.disabled(true);

                // The images are being played, disable the buttons: nextImageButton, previousImageButton
                sceneBar.disableNextAndPreviousImageButtons(true);
                break;
            }
            case Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_ALL_OVERLAY_RECTS:
            {
                // disable button
                COL.colJS.playImagesInSelectedOverlayRectButton.disabled(true);

                // The images are being played, disable the buttons: nextImageButton, previousImageButton
                sceneBar.disableNextAndPreviousImageButtons(true);
                break;
            }
            default:
            {
                throw new Error('The value of this._playImagesState is invalid: ' + this._playImagesState);
            }
        }

        
    }

    updateEditOverlayRectRelatedButtons () {
        if(COL.isOldGUIEnabled) {
            // console.log('BEG updateEditOverlayRectRelatedButtons');
        
            // Update the overlayRectEdit buttons, e.g. disable if no image is selected
            let sceneBar = COL.model.getSceneBar();
            if(this.getEditOverlayRectFlag()) {
            // disable/enable editOverlayRect related buttons (openImageFileButton, editOverlayRect_deleteButton)
                if(COL.util.isObjectValid(this._selectedOverlayRect)) {
                // enable the editOverlay related buttons
                    sceneBar.disableEditOverlayRectRelatedButtons(false);
                }
                else {
                // disable the editOverlay related buttons
                    sceneBar.disableEditOverlayRectRelatedButtons(true);
                }
            }
            else {
                sceneBar.disableEditOverlayRectRelatedButtons(true);
            }
        }
    }
    
    setLabel_ImageIndexOfNumImagesInOverlayRect2 () {
        let imageIndexOfNumImagesInOverlayRectStr = 'NA';
        if(COL.util.isObjectValid(this._selectedOverlayRect)) {
            imageIndexOfNumImagesInOverlayRectStr = this._selectedOverlayRect.setLabel_ImageIndexOfNumImagesInOverlayRect1();
        }        
        
        let imageIndexInOverlayRectLabel = COL.colJS.getImageIndexInOverlayRectLabel();
        imageIndexInOverlayRectLabel.$.html(imageIndexOfNumImagesInOverlayRectStr);
    }

    createMesh (intersectedStructurePoint, shape, materialAttributes) {
        // console.log('BEG createMesh'); 

        let planView = this.getPlanView();
        var userData = {imagesNames: new COL.util.AssociativeArray()};

        let meshMaterial = new THREE_MeshBasicMaterial({
            opacity: materialAttributes.opacity,
            transparent: materialAttributes.transparent,
            side: materialAttributes.side,
            color: materialAttributes.color, 
            userData: userData,
        });

        let geometry = undefined;
        switch(shape) {
            case 'circle': {
                let overlayRectRadius = planView.getOverlayRectRadius();
                geometry = new THREE_CircleGeometry( overlayRectRadius, PlanView.numSegments );
                break;
            }
            case 'square': {
                let width = planView.getOverlayRectRadius();
                geometry = new THREE_PlaneGeometry( width, width );
                break;
            }
            
            default:
                let msgStr = 'Shape: ' + shape + ' is not supported.';
                throw new Error(msgStr);
        }


        let overlayMeshObj = new THREE_Mesh( geometry, meshMaterial );

        overlayMeshObj.name = overlayMeshObj.id;
        overlayMeshObj.position.set(intersectedStructurePoint.x, intersectedStructurePoint.y, intersectedStructurePoint.z);
        
        var box = new THREE_Box3().setFromObject( overlayMeshObj );
        // The rectangle position is set to be the center of the bounding box
        box.getCenter( overlayMeshObj.position ); // this re-sets the position

        let scaleFactor = planView.getOverlayRectScale();
        overlayMeshObj.scale.set(scaleFactor, scaleFactor, scaleFactor);
        overlayMeshObj.geometry.computeBoundingBox();
        overlayMeshObj.geometry.center();
        overlayMeshObj.updateMatrixWorld();

        return overlayMeshObj;
    }
    
    async addImageToLayer ( overlayRect, imageInfo ) {
        // console.log('BEG addImageToLayer');
        
        if(COL.util.isObjectInvalid(overlayRect)) {
            // sanity check
            throw new Error('overlayRect is invalid');
        }
        if(COL.util.isObjectInvalid(imageInfo)) {
            // sanity check
            throw new Error('imageInfo is invalid');
        }

        let filename = imageInfo.filename;
        // check that the filename doesn't already exist
        // (prevent from having multiple overlayRects with the same image filename)
        let imageInfo2 = this._imagesInfo.getByKey(filename);
        if(COL.util.isObjectValid(imageInfo2)) {
            // The layer already includes an image with the filename
            // Don't add the file and fail the operation to add images
            throw new Error('Cannot add the file: ' + filename + ', as it already exists in imagesInfo');
        }
        
        // check if the file already exists in the this._removedImagesInfo
        let removedImageInfo = this._removedImagesInfo.getByKey(filename);
        if(COL.util.isObjectValid(removedImageInfo)) {
            // The layer already includes an image with the filename in the this._removedImagesInfo list
            // check if the removedImageInfo is dirty,
            
            if(COL.util.isObjectInvalid(removedImageInfo.blobInfo)) {
                // sanity check
                // an image that was removed must have been loaded, so it must have a defined blobInfo
                // (invalid blobInfo can only happen if the image has not been loaded yet)
                throw new Error('image is in the removedImageInfo list with invalid blobInfo');
            }

            if(removedImageInfo.blobInfo.isDirty) {
                // usecase1 -
                // - the image was originally loaded from the back-end to overlayRect1,
                // - then marked as dirty for deletion from overlayRect1,
                // - then added again to overlayRect1

                // usecase2 -
                // - the image was originally loaded from the back-end to overlayRect1,
                // - then marked as dirty for deletion from overlayRect1,
                // - then added to overlayRect2
                
                // handle usecase1, usecase2
                // - add it to this._imagesInfo, and mark it as not dirty
                //   (because nothing needs to happen to the image itself, although the overlayRects may have 
                //   changed (usecase2), or not (usecase1))
                // - remove it from this._removedImagesInfo
                removedImageInfo.blobInfo.isDirty = false;
            }
            else {
                // the image was originally added (i.e. not in the db and was marked as dirty for adding),
                //   then the image was removed, so it was moved to this._removedImagesInfo, and
                //   marked as NOT dirty (so it doesn't get deleted from the back-end because it is not there)
                //   now adding is back, so it needs to be marked as dirty for adding:
                // - add it to this._imagesInfo, and mark it as isDirty
                // - remove it from the removed list
                removedImageInfo.blobInfo.isDirty = true;
            }
            this._imagesInfo.set(filename, removedImageInfo);
            this._removedImagesInfo.remove(filename);
            await overlayRect.addImageToOverlayRect(this, removedImageInfo);
        }
        else {
            imageInfo.blobInfo.isDirty = true;
            this._imagesInfo.set(filename, imageInfo);
            await overlayRect.addImageToOverlayRect(this, imageInfo);
        }

        // reload the thumbnails after adding the image
        await this.showSelectedOverlayRect();

        // mark as not-synced after adding an image. 
        this.setSyncWithWebServerStatus(false);

        // sync to the webserver after adding an image. 
        let syncStatus = await this.syncBlobsWithWebServer();
        if(!syncStatus) {
            throw new Error('Error from syncBlobsWithWebServer while adding an image');
        }
    }
    
    // ////////////////////////////////////////////////////////////////////////////////////////////////
    // Deletes an image from overlayRect, and possibly the overlayRect itself
    // - If the number of images in meshObject > 0, deletes the image
    // - If the number of images after possible deletion == 0, deletes the meshObject
    // ////////////////////////////////////////////////////////////////////////////////////////////////

    
    async deleteImageFromLayer ( overlayRect, imageFilenameToRemove ) {
        console.log('BEG deleteImageFromLayer'); 

        // meshObject is stored both in overlayRect and in this._overlayMeshGroup
        // meshObject may be deleted from overlayRect
        // Therefore, get meshObject, BEFORE calling overlayRect.deleteImageFromOverlayRect
        // so that, if needed, it can also be deleted from OverlayMeshGroup

        if(COL.util.isObjectInvalid(overlayRect)) {
            throw new Error('Invalid overlayRect for deletion');
        }
        
        let meshObject = overlayRect.getMeshObject();
        if(COL.util.isObjectInvalid(meshObject)) {
            throw new Error('Invalid meshObject for deletion');
        }

        // Remove the selected image from _imagesInfo and
        // add the selected image to _removedImagesInfo (only if it is already synced with the back-end)
        let imageInfo = this._imagesInfo.getByKey(imageFilenameToRemove);
        if(COL.util.isObjectValid(imageInfo)) {
            this._imagesInfo.remove(imageFilenameToRemove);

            if(COL.util.isObjectInvalid(imageInfo.blobInfo)) {
                // sanity check
                // an image that is about to be removed must have been loaded first, so it must have a defined blobInfo
                // (invalid blobInfo can only happen if the image has not been loaded yet)
                // throw new Error('image to be removed has invalid blobInfo');

                // Ideally, we would just throw,
                // but in case of corrption, this prevents layerJsonFilename from being updated, and recovering
                // so be more lineant and just issue an error message?
                let msgStr = 'image to be removed: ' + imageFilenameToRemove + ' has invalid blobInfo';
                console.error(msgStr); 
            }
            else if(imageInfo.blobInfo.isDirty == false) {
                // the image to be removed is synced with the back-end, i.e. we need to add it to the removed list)
                // tbd - and set its blobInfo.isDirty to true ???
                imageInfo.blobInfo.isDirty = true;
                this._removedImagesInfo.set(imageFilenameToRemove, imageInfo);
            }
        }

        let imagesNames = overlayRect.getImagesNames();
        
        if(COL.util.isObjectInvalid(imagesNames)) {
            // sanity check
            throw new Error('imagesNames is invalid');
        }

        if(imagesNames.size() > 0) {
            // Remove the selected image from imagesNames
            // tbd - should/where-do we remove from layer._imagesInfo ???
            await overlayRect.deleteImageFromOverlayRect( this, imageFilenameToRemove );
            await this.showSelectedOverlayRect();
        }
        else {
            // Before assigning new value (unsigned) to overlayRect, check if overlayRect is the selectedOverlayRect.
            let isSelectedOverlayRect = this.isSelectedOverlayRect(overlayRect);
            if(isSelectedOverlayRect) {
                // overlayRect is the selectedOverlayRect. Set the selectedOverlayRect to undefined
                await this.setSelectedOverlayRect( undefined );
                await this.showSelectedOverlayRect();
                let planView = this.getPlanView();
                planView.clearIntersectionOverlayRectInfo();
            }

            // Remove the meshObject of the overlayRect from the meshGroup
            this.removeFromOverlayMeshGroup(meshObject);
        }

        // remove the image filename from the list of _cachedImages
        this._cachedImages.remove(imageFilenameToRemove);
        
        // mark as not-synced after deleting an image. 
        this.setSyncWithWebServerStatus(false);

        // sync to the webserver after deleting an image. 
        let syncStatus = await this.syncBlobsWithWebServer();
        if(!syncStatus) {
            throw new Error('Error from syncBlobsWithWebServer while deleting an image');
        }
    }

    
    async syncMetaDataBlobs_withWebServer_inSingleRequest () {
        console.log('BEG syncMetaDataBlobs_withWebServer_inSingleRequest');

        // tbd
        // in inSingleRequest defer blobInfo.syncBlobToWebServer to the end
        // - step1 - Loop over all the MetaDataBlobs.
        //   - For each blob if isDirty, add to the formData
        // - step2 - make a single request with multiple blobs in the single formData
        //           this step on the server side:
        //           - adds to the filesystem (api/v1_2/upload_multiple_files_to_the_file_system)
        // - step3 - Loop over all the MetaDataBlobs.
        //   - For each blob that is isDirty, clear the flag
        //
        // after syncMetaDataBlobs_withWebServer_inSingleRequest:
        // - adds to the db (api/v1_2/insert_update_delete_images_in_db)

        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // - step1 - Loop over all the MetaDataBlobs.
        //   - For each blob if isDirty, add to the formData
        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        const formData = new FormData();

        let retVal = Layer.GetSiteIdPlanIdAndFilePath(this.planInfo);
        let siteId = retVal['siteId'];
        let planId = retVal['planId'];
        let filePath = retVal['filePath'];
        
        let metaDataFilesInfo = this.getMetaDataFilesInfo();
        console.log('metaDataFilesInfo.getKeys()', metaDataFilesInfo.getKeys());

        let layerJsonFilename = this._layerJsonFilename;
        console.log('layerJsonFilename', layerJsonFilename); 
        
        let metaDataFilesInfoIter = metaDataFilesInfo.iterator();
        while (metaDataFilesInfoIter.hasNext()) {
            let keyVal = metaDataFilesInfoIter.nextKeyVal();

            // reset the container, and update to the synced-file-in-progress
            this.synced_filenames_in_progress = [];
            let filename = keyVal[0];
            this.synced_filenames_in_progress.push(filename);
            
            let metaDataFileInfo = keyVal[1];
            let blobInfo = metaDataFileInfo.blobInfo;
            
            if(filename === layerJsonFilename) {

                // tbd - check - deletion of overlayRect not always updates planView._scene

                // tbd - clear overlayRects with 0 entries
                this.clearOverlayRectsWithoutImages();
                this.scanForInconsitenciesBetweenImagesInfo_and_overlayRectImageThumbnailsNames();
                
                let layer_asJson_str = COL.loaders.utils.exportLayer_toJSON_str(this);
                COL.loaders.utils.addMetaDataFileInfoToMetaDataFilesInfo(metaDataFilesInfo, layer_asJson_str, layerJsonFilename);

                // Set flag isDirty to true
                // to force sync of layerJsonFilename to the webserver 
                metaDataFileInfo = metaDataFilesInfo.getByKey(filename);
                blobInfo = metaDataFileInfo.blobInfo;
                blobInfo.isDirty = true;
            }

            // Sync metaDataFilesInfo entries with isDirty===true to the webserver
            if(blobInfo.isDirty === true) {
                
                let blobUrl = blobInfo.blobUrl;
                
                let response = await fetch(blobUrl);
                await COL.errorHandlingUtil.handleErrors(response);
                let blob = await response.blob();
                let filePathNew = filePath + '/' + filename;
                console.log('filename', filename);
                console.log('filePathNew', filePathNew);
                
                // update all the metadata to the filesystem and db in single transaction
                let doDeferFileSystemAndDbSync = true;
                let retVal2 = await blobInfo.syncBlobToWebServer(siteId, planId, filePath, doDeferFileSystemAndDbSync);
                
                // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // append the blob for the current file
                // based on https://stackoverflow.com/a/50472925/5159177
                // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                formData.append('files', blob, filePathNew);
            }
        }

        
        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // - step2 - add to the file system - make a single request with multiple blobs in the single formData
        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // formData shows empty object, which may be deceiving
        // the list of files can be seen in devtools -> Network -> upload_multiple_files_to_the_file_system -> Headers -> FormData
        // shows the appended files with their content
        // console.log('formData', formData);
        
        let headersData = {
            'X-CSRF-Token': COL.model.csrf_token
        };

        let fetchData = { 
            method: 'POST', 
            headers: headersData,
            body: formData
        };

        // e.g. http://192.168.1.74/api/v1_2/upload_multiple_files_to_the_file_system POST
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/upload_multiple_files_to_the_file_system';
        
        let response = await fetch(queryUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);

        
        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // - step3 - make a single request with multiple blobs in the single formData
        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // tbd
        
        // if(retVal.syncStatus == true)
        // {
        //     // the syncStatus is good so mark the blob as "in-sync"
        //     blobInfo.isDirty = false;

        //     // clean related isDirty flags in overlayRects depending on the synced filename, e.g.
        //     // for .json filename which contains the overlayRect location, reset the isDirty_moved flag for all the overlayRects
        //     this.cleanIsDirtyStates(filename);
        // }

    }

    
    updateSyncedInfo1 () {
        // Update the isDirty flags: isDirty_newOverlayRect, isDirty_moved, isDirty_mergedWithOverlayRect
        // of all overlayRect(s) 
        // - the layer.json file contains the location, and shape (circle of the overlayRect)
        //   it was synced successfully, i.e new overlayRects are now in sync
        //   (only the definition of the overlayRect itself, but not necessarily all it's images)
        //   with the back-end
        //   also, overlayRects that were merged to another overlayRect and were removed
        //   are removed from the layer.json file, so indicate isDirty_mergedWithOverlayRect ??
        //   tbd - but isDirty_mergedWithOverlayRect is also indicated when syncing the .mtl file
        //   and we can't have the same flag updated from 2 places ??? maybe add another flag
        //   flag1 - indicate the overlayRect that other overlayRects were merged to
        //   flag2 - indicate the other overlayRects that were merged and removed ???
        
        let overlayRectIsDirty2 = {
            isDirty_newOverlayRect: false,
            isDirty_moved: false,
            isDirty_mergedWithOverlayRect: false
        };
        this.updateIsDirtyInAllOverlayRects(overlayRectIsDirty2);

        // the overlayRects are defined in the layer.json file
        // since the layer.json was sucessfully synced to the back-end,
        // there is no more need to store the removed overlayRect objects
        // (that was used to indicate this type of change (overlayRect removed) in the layer)
        // remove all children from _removedOverlayMeshGroup, if such entries exist
        for (let i = this._removedOverlayMeshGroup.children.length - 1; i >= 0; i--) {
            this._removedOverlayMeshGroup.remove(this._removedOverlayMeshGroup.children[i]);
        }
    }

    updateSyncedInfo2 () {
        // /////////////////////////////////////////////////////////////////////
        // overlay.mtl was synced successfully. Do the following:
        // Loop over all overlayRects.
        // for those that are fully synced update overlayRect._syncedImageFilenames
        // /////////////////////////////////////////////////////////////////////

        // /////////////////////////////////////////////////////////////////////
        // After syncing layer.json
        // update the overlayRect.isDirty2 state
        // Loop over the overlayRects. For each overlayRect, check that every
        // imageInfo.blobInfo.isDirty is false
        // If yes: set overlayRect.isDirty_general to false
        // Otherwise: leave overlayRect.isDirty_general as true (to indicate that the sync is incomplete)
        // /////////////////////////////////////////////////////////////////////
        
        let iter_overlayRects = this._overlayRects.iterator();
        while (iter_overlayRects.hasNext()) {
            let overlayRect1 = iter_overlayRects.next();
            let isDirty_imageAddedOrRemovedVal = false;
            let imagesNames = overlayRect1.getImagesNames();
            let iter_imagesNames = imagesNames.iterator();
            while (iter_imagesNames.hasNext()) {
                let imageNameInOverlayRect = iter_imagesNames.next();
                let imageInfoVec = this.getImagesInfo();
                let imageInfo2 = imageInfoVec.getByKey(imageNameInOverlayRect);
                
                if(COL.util.isObjectValid(imageInfo2.blobInfo)) {
                    if(imageInfo2.blobInfo.isDirty) {
                        isDirty_imageAddedOrRemovedVal = true;
                        break;
                    }
                }
                else {
                    // imageInfo2.blobInfo can be invalid if the image was not loaded
                    // in such case it is already synced with the back-end.
                    // No need to do anything
                }
            }

            let removedImagesNamesInOverlayRect = overlayRect1.getRemovedImagesNames();
            // console.log('removedImagesNamesInOverlayRect.size()', removedImagesNamesInOverlayRect.size());
            if(removedImagesNamesInOverlayRect.size() > 0) {
                // at this point, entries in overlayRect1._removedImagesNames are for images that did not sync with the back-end
                // 
                // images that were synced to the back-end were removed from overlayRect1._removedImagesNames
                // in the section above: (in "Sync removedImagesInfo entries with isDirty===true to the webserver")
                
                isDirty_imageAddedOrRemovedVal = true;
                break;
            }

            // Update the overlayRect.isDirty flags: isDirty_imageAddedOrRemovedVal, isDirty_mergedWithOverlayRect
            // the .json contains the number of images (via the images names), so successful sync of the .json file
            // means that the merge information is synced ok. Hence "isDirty_mergedWithOverlayRect: false"
            
            let overlayRectIsDirty2 = {
                isDirty_imageAddedOrRemoved: isDirty_imageAddedOrRemovedVal,
                isDirty_mergedWithOverlayRect: false
            };
            overlayRect1.setIsDirty2(overlayRectIsDirty2);
        }
    }
    
    cleanIsDirtyStates (filename) {
        console.log('BEG cleanIsDirtyStates');
        
        if(filename === this._layerJsonFilename) {
            this.updateSyncedInfo1();
            this.updateSyncedInfo2();
        }
        
    }
    
    async syncBlobsWithWebServer () {
        console.log('BEG syncBlobsWithWebServer'); 

        // // validate that there are no empty imagesInfo
        // ImageInfo.validateImagesInfo(imagesInfo);

        // reset the this.syncRetVals container
        this.syncRetVals = [];

        try {
            let doDeferFileSystemAndDbSync = true;
            if (doDeferFileSystemAndDbSync) {
                // //////////////////////////////////////////////////////////////////////////////////
                // execute all db operations in single request
                // clear image_db_operations_array
                // //////////////////////////////////////////////////////////////////////////////////

                // tbd - delete after placing a post and getting answer if it is advised to keep session open between requests.                
                // // begin the session
                // let fetchData = { 
                //     method: 'GET', 
                // };

                // // queryUrl - e.g. http://192.168.1.74/api/v1_2/clear_images_global
                // let queryUrl = Model.GetUrlBase() + 'api/v1_2/clear_images_global';
                // console.log('queryUrl', queryUrl);
                
                // let response = await fetch(queryUrl, fetchData);
                // await COL.errorHandlingUtil.handleErrors(response);

                // clear COL.model.image_db_operations_array
                COL.model.image_db_operations_array = [];
            }
            
            // /////////////////////////////////////////////////////////////////////
            // Sync imagesInfo entries with isDirty===true to the webserver
            // - add blobs to the webserver (to the database, and to the file system)
            // /////////////////////////////////////////////////////////////////////

            let imagesInfo = this.getImagesInfo();
            let imagesInfoIter = imagesInfo.iterator();
            let layerJsonFilename = this.getLayerJsonFilename();

            while (imagesInfoIter.hasNext()) {
                let keyVal = imagesInfoIter.nextKeyVal();

                // reset the container, and update to the synced-file-in-progress
                this.synced_filenames_in_progress = [];
                let filename = keyVal[0];
                if(filename == layerJsonFilename) {
                    console.log('filename', filename);
                }
                
                this.synced_filenames_in_progress.push(filename);
                
                // console.log('filename', filename); 
                let imageInfo = keyVal[1];
                let blobInfo = imageInfo.blobInfo;

                // Blob exist only for image that was interacted with
                //  (e.g. clicked on to view, or added as new image)
                // Blob may not not exist for many images that have not be interacted with yet
                if(COL.util.isObjectValid(blobInfo)) {
                    // The blob exists
                    
                    // Sync imagesInfo entries with isDirty===true to the webserver
                    if(blobInfo.isDirty === true) {
                        // sync the blob with the webserver
                        let retVal = Layer.GetSiteIdPlanIdAndFilePath(this.planInfo);
                        let siteId = retVal['siteId'];
                        let planId = retVal['planId'];
                        let filePath = retVal['filePath'];

                        // for images, update the filesystem and db on per-image basis (i.e. not aggregating and commiting all images in single transaction, like we do with the metadata)
                        let doDeferFileSystemAndDbSync = false;
                        let retVal2 = await blobInfo.syncBlobToWebServer(siteId, planId, filePath, doDeferFileSystemAndDbSync);
                        this.syncRetVals.push(retVal2);
                        if(retVal2.syncStatus == true) {
                            // the syncStatus is good so mark the blob as "in-sync"
                            blobInfo.isDirty = false;

                            // For overlayRect(s) that contains the imageInfo (search for matching overlayRect(s) by "filename")
                            // - Update the state overlayRect1.IsDirty2
                            let iter = this._overlayRects.iterator();
                            while (iter.hasNext()) {
                                let overlayRect1 = iter.next();
                                if(overlayRect1.isImageNameInOverlayRect(filename)) {
                                    overlayRect1.updateStateIsDirty2();
                                }
                            }
                        }
                    }
                }
            }

            // /////////////////////////////////////////////////////////////////////
            // Sync removedImagesInfo entries with isDirty===true to the webserver
            // - remove blobs from the webserver (from the database, and from the file system)
            // /////////////////////////////////////////////////////////////////////

            // to be sure that all entries in _removedImagesInfo were properly synced with the back-end, we need to:
            // 1. sync every image (i.e. delete the image from the backend - db and the file system)
            //    this is needed to clear the dirty indication from the overlayRect that the removed image related to
            // 2. make sure that the overlayRects, don't point to these images any more

            let index1 = 0;
            while (index1 < this._removedImagesInfo.size()) {
                let imageInfo = this._removedImagesInfo.getByIndex(index1);

                // reset the container, and update to the synced-file-in-progress
                this.synced_filenames_in_progress = [];
                let filename = imageInfo.filename;
                this.synced_filenames_in_progress.push(filename);

                index1++;

                let blobInfo = imageInfo.blobInfo;
                if(COL.util.isObjectInvalid(blobInfo)) {
                    // sanity check - should not reach here
                    throw new Error('blobInfo is invalid');
                }
                
                let operation = 'DELETE_BLOB';
                let retVal = Layer.GetSiteIdPlanIdAndFilePath(this.planInfo);
                let siteId = retVal['siteId'];
                let planId = retVal['planId'];
                let filePath = retVal['filePath'];
                // for images, update the filesystem and db on per-image basis (i.e. not aggregating and commiting all images in single transaction, like we do with the metadata)
                let doDeferFileSystemAndDbSync = false;
                let retVal2 = await blobInfo.syncBlobToWebServer(siteId, planId, filePath, doDeferFileSystemAndDbSync, operation);
                this.syncRetVals.push(retVal2);
                if(retVal2.syncStatus == true) {
                    // the syncStatus is good so mark the blob as "in-sync"
                    blobInfo.isDirty = false;

                    // For overlayRect(s) that contains the imageInfo (search for matching overlayRect(s) by "filename")
                    // - Remove the imageInfo from overlayRect._removedImagesNames
                    // - Update the state overlayRect1.IsDirty2
                    
                    // note: we can use the AssociativeArray.remove() in combination with iterator,
                    //   because we are not deleting any entry from this._overlayRects
                    let iter = this._overlayRects.iterator();
                    while (iter.hasNext()) {
                        let overlayRect1 = iter.next();
                        let isImageNameInRemovedListInOverlayRect1 = overlayRect1.isImageNameInRemovedListInOverlayRect(filename);
                        if(isImageNameInRemovedListInOverlayRect1) {
                            let removedImageNameInOverlayRect = overlayRect1.getRemovedImagesNames();
                            removedImageNameInOverlayRect.remove(filename);
                            overlayRect1.setRemovedImagesNames(removedImageNameInOverlayRect);
                            overlayRect1.updateStateIsDirty2();
                        }
                    }

                    // remove the entry from this._removedImagesInfo
                    //
                    // removing independent entries enable to handle a case of partial sync (e.g. is we failed to delete specific image)
                    // in this case the indication for overlayRects with images that were synced, will be updated
                    // while overlayRects that have not been synced properly will still show up
                    this._removedImagesInfo.remove(filename);

                    // reduce the index1 by 1 to compensate for the removal of the entry
                    index1 -= 1;
                }
            }


            // /////////////////////////////////////////////////////////////////////
            // Sync metaDataFilesInfo entries with isDirty===true to the webserver
            // metaDataFilesInfo are e.g. .json [notes]
            // /////////////////////////////////////////////////////////////////////

            await this.syncMetaDataBlobs_withWebServer_inSingleRequest();
        }
        catch(err) {
            console.error('err', err);

            // The catch is located outside the loop, i.e. a single failure stops the sync completely.
            
            // concatenate the filenames in the container to a string of filenames
            let synced_filenames_in_progress_asString = this.synced_filenames_in_progress.join();

            let retVal = {
                filePath: synced_filenames_in_progress_asString,
                syncStatus: false
            };
            this.syncRetVals.push(retVal);
        }
        
        // ////////////////////////////////////////////////////
        // Check if the sync was successful and raise a toast
        // ////////////////////////////////////////////////////

        let syncStatus = true;
        let successfulSyncMsg = '';
        let failureSyncMsg = '';

        let doListSyncedFilenames = true;
        // doListSyncedFilenames = false;
        
        // Check if the sync was successful
        for (let i = 0; i < this.syncRetVals.length; ++i) {
            let syncRetVal = this.syncRetVals[i];
            let syncMsg = syncRetVal['filePath'] + '<br />';
            
            if(doListSyncedFilenames) {
                if(syncRetVal['syncStatus']) {
                    successfulSyncMsg = successfulSyncMsg + syncMsg;
                }
                else {
                    failureSyncMsg = failureSyncMsg + syncMsg;
                }
            }
            if(!syncRetVal['syncStatus']) {
                syncStatus = false;
            }
        }

        let doDeferFileSystemAndDbSync = true;
        console.log('doDeferFileSystemAndDbSync', doDeferFileSystemAndDbSync);
        
        if (doDeferFileSystemAndDbSync) {
            // //////////////////////////////////////////////////////////////////////////////////
            // execute all db operations in single request
            // execute the request
            // //////////////////////////////////////////////////////////////////////////////////
            
            if(syncStatus) {
                // insert/update/delete from the database with the new/updated/deleted images 
                let jsonData = {image_db_operations_array: COL.model.image_db_operations_array};
                let jsonDataAsStr = JSON.stringify(jsonData);

                const formData = new FormData();
                formData.append('json_data_as_str', jsonDataAsStr);

                let headersData = {
                    'X-CSRF-Token': COL.model.csrf_token
                };
                
                let fetchData = { 
                    method: 'POST', 
                    headers: headersData,
                    body: formData
                };

                
                // queryUrl - e.g. http://192.168.1.74/api/v1_2/insert_update_delete_images_in_db
                let queryUrl = Model.GetUrlBase() + 'api/v1_2/insert_update_delete_images_in_db';

                let response = await fetch(queryUrl, fetchData);
                await COL.errorHandlingUtil.handleErrors(response);
            }
        }

        // ////////////////////////////////////////////////////
        // update the syncWithWebServerStatus 
        // ////////////////////////////////////////////////////

        this.setSyncWithWebServerStatus(syncStatus);

        // // ////////////////////////////////////////////////////
        // // raise a toast
        // // tbd - need to add a check on success of syncing the metadata to the db, to global syncStatus
        // //       (currently only checking on images to filesystem-and-db, and metadat to filesystem? (not to db))
        // // ////////////////////////////////////////////////////

        // let toastTitleStr = 'Sync from memory to webserver';
        // if(syncStatus) {
        //     let msgStr = 'Succeeded to sync';
        //     toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        // }
        // else {
        //     let msgStr = 'Failed to sync: <br />' + failureSyncMsg;
        //     toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        // }

        return syncStatus;
    }

    // ///////////////////////////////////////////////////////
    // update imageInfo.isImageInRange
    // ///////////////////////////////////////////////////////
    
    updateImagesInfoAttr_isImageInRange (conditionStr) {
        // console.log('BEG updateImagesInfoAttr_isImageInRange');

        let iter = this._imagesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let imageName = keyVal[0];
            let imageInfo = keyVal[1];

            imageInfo.isImageInRange = ImageInfo.IsImageInRangeEnum.NOT_APPLICABLE;

            if(this._isMilestoneDatesFilterEnabled &&
               COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'dateCreated']))) {
                let imageTags = imageInfo.imageTags;

                if( COL.util.isObjectValid(imageTags.dateCreated) ) {
                    var m1 = moment.utc(imageTags.dateCreated, 'YYYY:MM:DD HH:mm:ss');
                    let dateTimeOriginal_asDate = m1.toDate();

                    let dateTimeOriginalAsNumber = dateTimeOriginal_asDate.getTime();
                    
                    let conditionStr2 = conditionStr.replace(/milstoneDate/g, `${dateTimeOriginalAsNumber}`);
                    imageInfo.isImageInRange = eval(conditionStr2) ? ImageInfo.IsImageInRangeEnum.IN_RANGE : ImageInfo.IsImageInRangeEnum.NOT_IN_RANGE;
                }
            }
        }

        // /////////////////////////////////////////////////////////////////////////////
        // tbd - update this._overlayMeshGroup
        // loop over this._overlayMeshGroup
        //   if the overlayMeshObj entry in this._overlayMeshGroup has images with isImageInRange !== NOT_IN_RANGE
        //     i.e. IN_RANGE or NOT_APPLICABLE
        //     leave the overlayMeshObj entry, i.e. enable overlayRect display
        //   else
        //     mark the overlayMeshObj entry with SandyBrown (instead of Acqua)
        //     i.e. disable overlayRect display
        // /////////////////////////////////////////////////////////////////////////////

        let _this = this;
        
        this._overlayMeshGroup.traverse(function ( child ) {
            if ( (child.type === 'Mesh') && (child.name !== 'ring') ) {
                let isOverlayRectFilteredIn = false;
                let imagesNamesDict = child.material.userData['imagesNames'];
                let imagesNames = imagesNamesDict.getKeys();

                let opacity = 1;
                if(_this._isMilestoneDatesFilterEnabled) {
                    // milestoneDates filter is enabled
                    for (let imagesName of imagesNames){
                        let imageInfo = _this._imagesInfo.getByKey(imagesName);
                        if( COL.util.isObjectInvalid(imageInfo) ) {
                            throw new Error('imageInfo is invalid');
                        }
                        
                        if( imageInfo.isImageInRange !== ImageInfo.IsImageInRangeEnum.NOT_IN_RANGE ) {
                            // isImageInRange is in range or na (e.g. if there is no date tag).
                            // Mark the overlayRect as filteredIn i.e. available for display.
                            isOverlayRectFilteredIn = true;
                            break;
                        }
                    }

                    if(!isOverlayRectFilteredIn) {
                        // milestoneDates filter is enabled. All overlayRect images are outside the filtered date range.
                        // Mark the overlayRect as filteredOut i.e. NOT available for display.
                        child.material.color.set(COL.util.Color.WhiteSmoke2);
                        opacity = 0.3;
                        child.material.userData.isOverlayRectFilteredIn = false;
                    }
                    else {
                        // milestoneDates filter is enabled. One or more of the overlayRect images are inside the filtered date range.
                        child.material.color.set(COL.util.Color.Acqua);
                        child.material.userData.isOverlayRectFilteredIn = true;
                    }
                }
                else {
                    // milestoneDates filter is disabled
                    child.material.color.set(COL.util.Color.Acqua);
                    child.material.userData.isOverlayRectFilteredIn = true;
                }
                
                child.material.opacity = opacity;
                child.children[0].material.opacity = opacity;
                
                child.material.needsUpdate = true;
                child.children[0].material.needsUpdate = true;
            }
        });
        PlanView.Render();
    }
    
    mergeOverlayRectsStart () {
        console.log('BEG mergeOverlayRectsStart');

        // prepare for merge:
        // - reset the list of this._selectedForMergeOverlayRects
        //   restore the color of the overlayRect to indicate that it is not candidate for merging, and remove the overlayRect 
        //   from this._selectedForMergeOverlayRects
        // - add the selectedOverlayRect as the first entry to this._selectedForMergeOverlayRects
        //   (with every click on overlayRect, another overlayRect will be added to the list and colored with e.g. Orange2)

        while (this._selectedForMergeOverlayRects.size() > 0) {
            let keyVal = this._selectedForMergeOverlayRects.shift();
            let meshObjName = keyVal['key'];
            let overlayRect = keyVal['val'];
            let meshObject = overlayRect.getMeshObject();
            // restore the color of the overlayRect to indicate that it is not candidate for merging
            meshObject.material.color.setHex( COL.util.Color.Acqua );
            meshObject.material.needsUpdate = true;
        }
                
        if( COL.util.isObjectValid(this._selectedOverlayRect) ) {
            this.setSelectedForMergeOverlayRects(this._selectedOverlayRect);
        }

        // render the planView pane to show the color of the overlayRects after reseting _selectedForMergeOverlayRects
        PlanView.Render();
    }
    
    async mergeOverlayRectsEnd () {
        // console.log('BEG mergeOverlayRectsEnd');

        if(this._selectedForMergeOverlayRects < 2) {
            // sanity check
            let msgStr = 'Number of overlayRects is invalid. It must be >=2. this._selectedForMergeOverlayRects: ' + this._selectedForMergeOverlayRects;
            throw new Error(msgStr);
        }

        // get the first overlayRect
        let keyVal = this._selectedForMergeOverlayRects.shift();
        let meshObjName = keyVal['key'];
        let firstOverlayRect = keyVal['val'];

        while (this._selectedForMergeOverlayRects.size() > 0) {

            let keyVal = this._selectedForMergeOverlayRects.shift();
            if(keyVal) {
                let meshObjName = keyVal['key'];
                let overlayRect = keyVal['val'];

                let overlayRectMeshObject = overlayRect.getMeshObject();
                await firstOverlayRect.mergeOtherOverlayRect(this, overlayRect);

                // Remove the meshObject of the overlayRect from the meshGroup of the layer (as it no longer exists by itself)
                this.removeFromOverlayMeshGroup(overlayRectMeshObject);

                await this.setSelectedOverlayRect(firstOverlayRect.getMeshObject());
                this.planView.getOrbitControls().setState(OrbitControlsPlanView.STATE.NONE);
            }
        }

        if( COL.util.isObjectValid(this._selectedOverlayRect) ) {
            // set the color of the merged overlayRect back to Yellow1, after the merge.
            let firstOverlayRectMeshObject = firstOverlayRect.getMeshObject();
            firstOverlayRectMeshObject.material.color.setHex( COL.util.Color.Yellow1 );
            firstOverlayRectMeshObject.material.needsUpdate = true;
        }

        // mark as not-synced after merging overlayRects. 
        this.setSyncWithWebServerStatus(false);

        // sync to the webserver after merging overlayRects. 
        let syncStatus = await this.syncBlobsWithWebServer();
        if(!syncStatus) {
            throw new Error('Error from syncBlobsWithWebServer while merging overlyRects.');
        }

        // render the planView pane to show the merged overlayRect
        PlanView.Render();
    }


    scanForInconsitenciesBetweenImagesInfo_and_overlayRectImageThumbnailsNames () {
        console.log('BEG scanForInconsitenciesBetweenImagesInfo_and_overlayRectImageThumbnailsNames');
        
        let retVal = true;
        
        let imageNamesOnlyIn_overlayRects = new COL.util.AssociativeArray();
        let imageNamesOnlyIn_imagesInfo = new COL.util.AssociativeArray();
        let imageNamesIn_overlayRects_and_imagesInfo = new COL.util.AssociativeArray();

        // let imageNamesOnlyIn_overlayMeshGroup = new COL.util.AssociativeArray();
        // let imageNamesOnlyIn_removedOverlayMeshGroup = new COL.util.AssociativeArray();
        
        // /////////////////////////////////////////////////////////////////////////////
        // Compare _overlayRects vs _imagesInfo
        // Loop over _overlayRects
        // /////////////////////////////////////////////////////////////////////////////

        let imageNames_in_overlayRects = new COL.util.AssociativeArray();

        // tbd
        // for (let foo in foos)
        // for (let foo of foos)
        
        let iter = this._overlayRects.iterator();
        while (iter.hasNext()) {
            let overlayRect = iter.next();
            
            let imageNames = overlayRect.getImagesNames();

            // at this point (after removing empty overlayRects) every overlayRect must have imagesNames with 1 or more images
            if(COL.util.isObjectInvalid(imageNames)) {
                retVal = false;
                let msgStr = 'imageNames is invalid';
                console.error(msgStr); 
                continue;
            }

            let iter2 = imageNames.iterator();
            while (iter2.hasNext()) {
                let imageName = iter2.nextKey();

                // verify that imageName only exists in one overlayRect
                if(COL.util.isObjectInvalid(imageNames_in_overlayRects.getByKey(imageName))) {
                    imageNames_in_overlayRects.set(imageName, true);
                }
                else {
                    retVal = false;
                    let msgStr = 'imageName: ' + imageName + ' exists in more than 1 overlayRect';
                    console.error(msgStr); 
                    continue;
                }
                
                let imageInfo = this._imagesInfo.getByKey(imageName);
                if(COL.util.isObjectInvalid(imageInfo)) {
                    imageNamesOnlyIn_overlayRects.set(imageName, true);
                }
                else {
                    imageNamesIn_overlayRects_and_imagesInfo.set(imageName, true);
                }
            }
        }

        // /////////////////////////////////////////////////////////////////////////////
        // Compare _imagesInfo vs imageNames_in_overlayRects
        // Loop over _imagesInfo
        // /////////////////////////////////////////////////////////////////////////////

        iter = this._imagesInfo.iterator();
        while (iter.hasNext()) {
            let imageName_inImageInfo = iter.nextKey();
            let imageName_in_overlayRects = imageNames_in_overlayRects.getByKey(imageName_inImageInfo);

            // skip files with name "*_ground_1*
            let foundMatch = imageName_inImageInfo.match( /_ground_1/i );            
            if(foundMatch) {
                continue;
            }

            if(COL.util.isObjectInvalid(imageName_in_overlayRects)) {
                imageNamesOnlyIn_imagesInfo.set(imageName_inImageInfo, true);
            }
            else {
                imageNamesIn_overlayRects_and_imagesInfo.set(imageName_inImageInfo, true);
            }
        }

        if((imageNamesOnlyIn_overlayRects.size() !== 0) || (imageNamesOnlyIn_imagesInfo.size() !== 0)) {
            retVal = false;
            let msgStr = 'Found inconsistencies between _imagesInfo, and _overlayRects';
            console.error('imageNamesOnlyIn_overlayRects', imageNamesOnlyIn_overlayRects.getKeys()); 
            console.error('imageNamesOnlyIn_imagesInfo', imageNamesOnlyIn_imagesInfo.getKeys()); 
            console.error(msgStr);

            // remove keys in imageNamesOnlyIn_imagesInfo from _imagesInfo
            iter = imageNamesOnlyIn_imagesInfo.iterator();
            while (iter.hasNext()) {
                let imageNameOnlyIn_imagesInfo = iter.nextKey();
                this._imagesInfo.remove(imageNameOnlyIn_imagesInfo);
            }
        }

        console.log('retVal', retVal); 
        
    }
    
    clearOverlayRectsWithoutImages () {
        let iter = this._overlayRects.iterator();
        while (iter.hasNext()) {
            let overlayRect = iter.next();
            if(overlayRect.getImagesNames().size() == 0) {
                let meshObject = overlayRect.getMeshObject();
                // Remove the meshObject of the overlayRect from the meshGroup of the layer
                this.removeFromOverlayMeshGroup(meshObject);
            }
        }
    }
    

    async reconcileFrontEndInconcitencies () {
        // console.log('BEG reconcileFrontEndInconcitencies');

        let syncStatus = true;
        let msgStr = '';
        let msgStr1 = '';
        let filename = '';
        this.syncRetVals = [];
        
        try {
            // //////////////////////////////////////////////////////////////////////////
            // Reconcile (remove) added images that are not synced with the back-end
            // (entries in this._imagesInfo with "isDirty == true")
            // loop over the imagesInfo.
            // For imageInfo with "isDirty == true" undo the change, e.g. remove the image from the .mtl file
            // //////////////////////////////////////////////////////////////////////////
            
            let imagesInfo = this.getImagesInfo();
            let imagesInfoIter = imagesInfo.iterator();
            while (imagesInfoIter.hasNext()) {
                let keyVal = imagesInfoIter.nextKeyVal();
                console.log('keyVal', keyVal); 
                filename = keyVal[0];
                let imageInfo = keyVal[1];
                let blobInfo = imageInfo.blobInfo;

                if(COL.util.isObjectValid(blobInfo)) {
                    console.log('blobInfo', blobInfo);
                    
                    // Revert imagesInfo entries with isDirty===true
                    if(blobInfo.isDirty === true) {
                        let iter = this._overlayRects.iterator();
                        while (iter.hasNext()) {

                            let overlayRect1 = iter.next();
                            let isImageNameInOverlayRect1 = overlayRect1.isImageNameInOverlayRect(filename);
                            if(isImageNameInOverlayRect1) {
                                // the image is added but failed to sync so remove it from overlayRect to reverse the operation
                                await this.deleteImageFromLayer(overlayRect1, imageInfo.filename);
                            }
                        }
                    }
                }
            }

            // //////////////////////////////////////////////////////////////////////////
            // Reconcile (add) removed images that are not synced with the back-end
            // (entries in this._removedImagesInfo with "isDirty == true")
            // loop over the removedImagesInfo.
            // For imageInfo with "isDirty == true" undo the change, e.g. add the image back to the .mtl file
            // //////////////////////////////////////////////////////////////////////////

            let removedImagesInfoSizeOrig = removedImagesInfo.size();
            let index1 = 0;
            
            while (index1 < this._removedImagesInfo.size()) {
                let imageInfo = this._removedImagesInfo.getByIndex(index1);
                index1++;
                filename = imageInfo.filename;
                
                let blobInfo = imageInfo.blobInfo;
                if(COL.util.isObjectValid(blobInfo)) {
                    // console.log('blobInfo', blobInfo);
                    
                    // Revert this._removedImagesInfo entries with isDirty===true
                    if(blobInfo.isDirty === true) {
                        let iter = this._overlayRects.iterator();
                        while (iter.hasNext()) {

                            let overlayRect1 = iter.next();

                            let isImageNameInRemovedListInOverlayRect1 = overlayRect1.isImageNameInRemovedListInOverlayRect(filename);
                            if(isImageNameInRemovedListInOverlayRect1) {
                                await this.addImageToLayer(overlayRect1, imageInfo);
                                let numEntriesRemoved = removedImagesInfoSizeOrig - this._removedImagesInfo.size();
                                if(numEntriesRemoved > 0) {
                                    // reduce the index1 by the number of entries that were removed
                                    // (assuming that the entries removed are consecutive and start at the entry that the index points to.
                                    index1 -= numEntriesRemoved;

                                    // update the new size, and remove the iterator one step back
                                    removedImagesInfoSizeOrig = this._removedImagesInfo.size();
                                }
                            }
                        }
                    }
                }
            }
        }
        catch(err) {
            console.error('err', err);
            let retVal = {
                filePath: filename,
                syncStatus: false
            };
            this.syncRetVals.push(retVal);
        }

        // raise a toast
        let toastTitleStr = 'Reconcile front-end inconcitencies';
        if(syncStatus) {
            msgStr = 'Succeeded to reconcile inconcitencies';
            toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
        else {
            msgStr = 'Failed to reconcile inconcitencies: ' + msgStr1;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
    }

    async loadSelectedImageTextureFromUrl (blobUrl) {

        try{
            let texture = await new THREE_TextureLoader().loadAsync(blobUrl);

            texture.wrapS = THREE_ClampToEdgeWrapping;
            texture.wrapT = THREE_ClampToEdgeWrapping;
            
            // Prevent warning when texture is not a power of 2
            // https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
            texture.minFilter = THREE_LinearFilter;
            // texture.generateMipmaps = false;

            if(COL.util.isObjectInvalid(this)) {
                throw new Error('Selected layer is invalid');
            }

            let imagesInfo = this.getImagesInfo();

            let selectedOverlayRect = this.getSelectedOverlayRect();
            if( COL.util.isObjectInvalid(selectedOverlayRect) ) {
                // sanity check
                throw new Error('selectedOverlayRect is invalid');
            }
            let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
            let imageInfo = imagesInfo.getByKey(selectedImageFilename);

            let rotationVal = 0;
            let flipY = true;
            if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation']))) {
                let rotationParams = COL.OrbitControlsUtils.getRotationParams(Number(imageInfo.imageTags.imageOrientation));
                rotationVal = rotationParams.rotationVal;
                flipY = rotationParams.flipY;
            }

            texture.flipY = flipY;

            // --------------------------------------------------------------
            // attenuate the image by drawing the image on a canvas and changing the globalAlpha 
            let image = texture.image;

            let spriteMaterial = new THREE_SpriteMaterial({
                rotation: rotationVal,
                map: texture,
                transparent: true,
                fog: true
            });
            
            spriteMaterial.opacity = 0.1;
            let sprite = new THREE_Sprite(spriteMaterial);
            sprite.name = 'sprite';
            sprite.material.color.set(0xffffff);
            sprite.material.map.needsUpdate = true;
            sprite.material.needsUpdate = true;

            this.setSprite(sprite);
            
            // the image finished openning from file. Load the image onto the pane
            let imageView = this.getImageView();
            imageView.loadImageToCanvas(this, sprite);

            imageView.renderer.renderLists.dispose();

            return true;
        } 
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = 'loadSelectedImageTextureFromUrl';
            let msgStr = 'Failed to loadSelectedImageTextureFromUrl, while trying to load from THREE_TextureLoader.loadAsync. blobUrl: ' + blobUrl + ', err: ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
    }

    async loadPlanViewTextureFromBlobUrl (blobUrl) {
        // console.log('BEG loadPlanViewTextureFromBlobUrl');

        try{
            let texture = await new THREE_TextureLoader().loadAsync(blobUrl);

            texture.wrapS = THREE_ClampToEdgeWrapping;
            texture.wrapT = THREE_ClampToEdgeWrapping;
    
            // Prevent warning when texture is not a power of 2
            // https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
            texture.minFilter = THREE_LinearFilter;
            // texture.generateMipmaps = false;
    
            let floorPlanObj = this.getFloorPlanMeshObj();
            let meshObj1 = floorPlanObj.children[0];
            // this._floorPlanMeshObj.floorPlanObj.children[0];
            meshObj1.material.map = texture;
            
            let floorPlanImageFilename = this.getFloorPlanImageFilename();
            let imagesInfo = this.getImagesInfo();
            let imageInfo = imagesInfo.getByKey(floorPlanImageFilename);
    
            let rotationVal = 0;
            let flipY = true;
            if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation']))) {
                let rotationParams = COL.OrbitControlsUtils.getRotationParams(Number(imageInfo.imageTags.imageOrientation));
                rotationVal = rotationParams.rotationVal;
                flipY = rotationParams.flipY;
            }
    
            texture.flipY = flipY;
            
            return true;
        } 
        catch(err){
            console.error('err', err); 
            let msgStr = 'Error while trying to load from THREE_TextureLoader.loadAsync. blobUrl: ' + blobUrl;
            console.error(msgStr); 
            throw new Error(msgStr);
        }
    }

    toJSON () {
        // console.log('BEG Layer.toJSON()'); 

        return {
            planView: this.planView.toJSON(),
            imagesInfo: this._imagesInfo.toJSON(),
            // tbd - add the other entries
        };
    }

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile () {
        // console.log('BEG toJSON_forFile'); 

        let layer_asJson = {};
        let planView_asJson = this.getPlanView().toJSON_forFile();

        layer_asJson['generalInfo'] = this.getGeneralInfo();
        layer_asJson['planView'] = planView_asJson;
        layer_asJson['_imagesInfo'] = this.getImagesInfo().toJSON();

        let selectedOverlayRect = this.getSelectedOverlayRect();
        if(COL.util.isObjectValid(selectedOverlayRect)) {
            layer_asJson['selectedOverlayRect'] = this.getSelectedOverlayRect().toJSON_forFile();
        }
        
        return layer_asJson;
    }
    
    dispose () {
        console.log('BEG Layer::dispose()');
        
        try {
            let typeof_planInfo = typeof this.planInfo;
            console.log('this.planInfo', this.planInfo); 
            console.log('typeof_planInfo', typeof_planInfo);
            
            COL.ThreejsUtil.disposeObject(this._overlayMeshGroup);

            let iter = this._overlayRects.iterator();
            while (iter.hasNext()) {
                let overlayRect1 = iter.next();
                COL.ThreejsUtil.disposeObject(overlayRect1);
            }
            this._overlayRects.clear();

            COL.ThreejsUtil.disposeObject(this._removedOverlayMeshGroup);
            COL.ThreejsUtil.disposeObject(this.stickyNoteGroup);

            this.planView.dispose();

            this.imageView.dispose();

            iter = this.noteArray.iterator();
            while (iter.hasNext()) {
                let note = iter.next();
                note.dispose();
            }
            this.noteArray.clear();

            iter = this._metaDataFilesInfo.iterator();
            while (iter.hasNext()) {
                let metaDataFileInfo = iter.next();
                metaDataFileInfo.dispose();
            }
            this._metaDataFilesInfo.clear();

            iter = this._imagesInfo.iterator();
            while (iter.hasNext()) {
                let imageInfo = iter.next();
                imageInfo.dispose();
            }
            this._imagesInfo.clear();

            iter = this._removedImagesInfo.iterator();
            while (iter.hasNext()) {
                let removedImageInfo = iter.next();
                removedImageInfo.dispose();
            }
            this._removedImagesInfo.clear();

            this._cachedImages.clear();

            this._milestoneDatesInfo.clear();

            if(COL.util.isObjectValid(this._selectedOverlayRect)) {
                this._selectedOverlayRect.dispose();
                this._selectedOverlayRect = null;
            }
            
            iter = this._selectedForMergeOverlayRects.iterator();
            while (iter.hasNext()) {
                let selectedForMergeOverlayRect = iter.next();
                COL.ThreejsUtil.disposeObject(selectedForMergeOverlayRect);
            }
            this._selectedForMergeOverlayRects.clear();

            if(COL.util.isObjectValid(this._currentSprite)) {
                // this._currentSprite is of type THREE_Sprite
                COL.ThreejsUtil.disposeObject(this._currentSprite);
            }

            COL.ThreejsUtil.disposeObject(this._floorPlanMeshObj);

            this._layerJsonFilename = null;
            this._floorPlanImageFilename = null;

            this._isDirty2 = null;
            
            this.name = null;
        }
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = 'Dispose Layer';
            let msgStr = 'Failed to dispose the layer.';
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
        
    }

    updateIsDirtyInAllOverlayRects (overlayRectIsDirty2) {
        // console.log('BEG updateIsDirtyInAllOverlayRects');
        
        let iter = this._overlayRects.iterator();
        while (iter.hasNext()) {
            let overlayRect1 = iter.next();
            overlayRect1.setIsDirty2(overlayRectIsDirty2);
        }
    }

    static CreateLayerName (siteName, planName) {
        let layerName = siteName + '__' + planName;
        return layerName;
    }

    static GetSiteIdPlanIdAndFilePath (planInfo) {
        console.log('BEG GetSiteIdPlanIdAndFilePath'); 

        let siteId;
        if(planInfo['newSiteId']) {
            siteId = planInfo['newSiteId'];
        }
        else {
            siteId = planInfo['siteId'];
        }
        
        let planId;
        if(planInfo['newPlanId']) {
            planId = planInfo['newPlanId'];
        }
        else {
            planId = planInfo['id'];
        }

        let filePath = siteId + '/' + planId;

        return {
            siteId: siteId,
            planId: planId,
            filePath: filePath
        };
    }

}

// Layer.maxNumImageBlobsInMeomry = 10;
// Layer.maxNumImageBlobsInMeomry = 3;
Layer.maxNumImageBlobsInMeomry = 2;
// Layer.maxNumImageBlobsInMeomry = 200;

Layer.PLAY_IMAGES_STATE = { NONE: -1, PLAY_IMAGES_IN_SELECTED_OVERLAY_RECT: 0, PLAY_IMAGES_IN_ALL_OVERLAY_RECTS: 1 };

export { Layer };
