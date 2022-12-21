/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import {
    TextureLoader as THREE_TextureLoader,
    Vector3 as THREE_Vector3,
    Sprite as THREE_Sprite,
    SpriteMaterial as THREE_SpriteMaterial,
    CanvasTexture as THREE_CanvasTexture,
    LinearFilter as THREE_LinearFilter,
    ClampToEdgeWrapping as THREE_ClampToEdgeWrapping,
    RingGeometry as THREE_RingGeometry,
    MeshBasicMaterial as THREE_MeshBasicMaterial,
    MeshPhongMaterial as THREE_MeshPhongMaterial,
    DoubleSide as THREE_DoubleSide,
    Mesh as THREE_Mesh
} from '../../static/three.js/three.js-r135/build/three.module.js';
        
import { COL } from  '../COL.js';
import { Model } from './Model.js';
import { Layer } from './Layer.js';
import { PlanView } from './PlanView.js';
import { ImageInfo } from './ImageInfo.js';
import '../util/ThreejsUtil.js';
import { onMouseDownOrTouchStart_thumbnailImage, onContextMenu_thumbnailImage } from './ThumbnailImageEventListeners.js';

class OverlayRect {
    constructor(otherMeshObject){
        // console.log('BEG OverlayRect::constructor()');

        this._imagesNames = new COL.util.AssociativeArray();
        if(COL.util.isObjectValid(otherMeshObject.material.userData['imagesNames'])) {
            // can't use deepCopy, because it converts from (e.g. COL.util.AssociativeArray) to asDict
            this._imagesNames = otherMeshObject.material.userData['imagesNames'];
        }

        // container for removed images 
        this._removedImagesNames = new COL.util.AssociativeArray();
        
        this._selectedImageFilenameIndex = undefined;
        this._selectedImageFilename = undefined;
        this._selectedImageInfoStr = undefined;
        
        // indication if the overlayRect is dirty (i.e. not synced with the overlayRect in the back-end)
        this._isDirty2 = {
            isDirty_general: false,
            isDirty_moved: false,
            isDirty_imageAddedOrRemoved: false,
            isDirty_newOverlayRect: false,
            isDirty_mergedWithOverlayRect: false
        };

        this._state = OverlayRect.STATE.NONE;

        
        let overlayRectRadius = PlanView.overlayRectRadiusDefault;
        let selectedLayer = COL.model.getSelectedLayer();
        if(COL.util.isObjectValid(selectedLayer)) {
            let planView = selectedLayer.getPlanView();
            if(COL.util.isObjectValid(planView)) {
                overlayRectRadius = planView.getOverlayRectRadius();
            }
        }
        
        this.splitInfo = {splitCounter: 0,
            yPosition: 0,
            deltaX0: 2*overlayRectRadius,
            deltaX1: (2*overlayRectRadius / 10),
            deltaY1: 1,
            deltaZ1: (2*overlayRectRadius / 10)
        };

        if(COL.util.isObjectInvalid(otherMeshObject)) {
            // sanity check
            throw new Error('otherMeshObject is invalid');
        }

        // Construct an object using an existing mesh
        this._meshObject = otherMeshObject;
        
        this.positionAtLastSplit = new THREE_Vector3();
        this.positionAtLastSplit.copy(this._meshObject.position);

        this._syncedImageFilenames = COL.util.deepCopy(this._imagesNames.getKeys());
        
        // console.log('this._syncedImageFilenames', this._syncedImageFilenames);
        
        if(COL.util.isObjectInvalid(this._syncedImageFilenames)) {
            throw new Error('this._syncedImageFilenames is invalid');
        }

        // //////////////////////////////////
        // Set selectedImage related variables
        // //////////////////////////////////

        if(this._imagesNames.size() > 0) {
            // set the selected image to the first image
            this.setSelectedImage(0);
        }
        else {
            // console.log('this._imagesNames is empty.');
            this.setSelectedImage(undefined);
        }

        $('#overlayRectImageThumbnailsMenuId li').click(async function(event) {
            console.log('BEG #overlayRectImageThumbnailsMenuId li click');

            {
                // Prevent multiple click events firing JQuery
                // https://stackoverflow.com/questions/12708691/prevent-multiple-click-events-firing-jquery
                event.stopImmediatePropagation();
                event.preventDefault();
            }
            
            let selectedLayer = COL.model.getSelectedLayer();
            let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();

            switch($(this).attr('data-action')) {
                case 'deletePhoto': 
                    console.log('deletePhoto');
                    await selectedLayer.deleteImageFromLayer(selectedOverlayRect, selectedOverlayRect._selectedImageFilename);
                    selectedOverlayRect.clearMenuThumbnailImage();
                    break;

                case 'splitImageFromOverlayRect': 
                    console.log('splitImageFromOverlayRect');
                    if( COL.util.isObjectValid(selectedOverlayRect) ) {
                        await selectedOverlayRect.splitImageFromOverlayRect();
                    }
                    
                    // hide the context menu
                    selectedOverlayRect.clearMenuThumbnailImage();
                    selectedOverlayRect.setState(OverlayRect.STATE.NONE);
                    break;
            }
        });

        // context-menu related variables
        this.timeoutID = undefined;
        this.isMenuVisible = false;

        // this.printClassMembers();
    }

    toJSON() {
        // console.log('BEG OverlayRect::toJSON()');

        return {
            _imagesNames: this._imagesNames,
            _removedImagesNames: this._removedImagesNames,
            _selectedImageFilenameIndex: this._selectedImageFilenameIndex,
            _selectedImageFilename: this._selectedImageFilename,
            _selectedImageInfoStr: this._selectedImageInfoStr,
            _isDirty2: this._isDirty2,
            splitInfo: this.splitInfo,
            _meshObject: this._meshObject,
            positionAtLastSplit: this.positionAtLastSplit,
            _syncedImageFilenames: this._syncedImageFilenames,
        };
    }

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile () {
        // console.log('BEG toJSON_forFile'); 

        let overlayRect_asJson = {};
        overlayRect_asJson['_imagesNames'] = this._imagesNames;
        // overlayRect_asJson['_removedImagesNames'] = this._removedImagesNames;
        overlayRect_asJson['_selectedImageFilenameIndex'] = this._selectedImageFilenameIndex;
        overlayRect_asJson['_selectedImageFilename'] = this._selectedImageFilename;
        overlayRect_asJson['_selectedImageInfoStr'] = this._selectedImageInfoStr;
        overlayRect_asJson['_isDirty2'] = this._isDirty2;
        overlayRect_asJson['splitInfo'] = this.splitInfo;
        overlayRect_asJson['positionAtLastSplit'] = this.positionAtLastSplit;
        // overlayRect_asJson['_syncedImageFilenames'] = this._syncedImageFilenames;
        overlayRect_asJson['_meshObject.uuid'] = this._meshObject.uuid;
        overlayRect_asJson['_meshObject.id'] = this._meshObject.id;
        
        return overlayRect_asJson;
    }

    dispose() {
        console.log('BEG OverlayRect::dispose()');

        // ////////////////////////////////////////////////////
        // Before Dispose
        // ////////////////////////////////////////////////////

        let overlayRectAsJson = this.toJSON();
        this._imagesNames.clear();
        
        // ////////////////////////////////////////////////////
        // Dispose
        // https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534
        // ////////////////////////////////////////////////////

        this._removedImagesNames.clear();

        this._selectedImageFilenameIndex = null;
        this._selectedImageFilename = null;
        this._selectedImageInfoStr = null;

        this._isDirty2 = null;
        
        this.splitInfo = null;

        COL.ThreejsUtil.disposeObject(this._meshObject);
        
        this.positionAtLastSplit = null;

        this._syncedImageFilenames = [];
        

        // ////////////////////////////////////////////////////
        // After Dispose
        // ////////////////////////////////////////////////////

        console.log( 'After Dispose');

        let overlayRectAsJson2 = this.toJSON();
        console.log('overlayRectAsJson after dispose', overlayRectAsJson2); 

    }
    
    printClassMembers () {
        console.log('BEG printClassMembers');

        console.log('this._imagesNames', this._imagesNames);
        console.log('this._selectedImageFilenameIndex', this._selectedImageFilenameIndex); 
        console.log('this._selectedImageFilename', this._selectedImageFilename); 
        console.log('this._selectedImageInfoStr', this._selectedImageInfoStr); 
        console.log('this._meshObject', this._meshObject);
        console.log('this._isDirty2', this._isDirty2);
        
        console.log(''); 
    }

    getIsDirty2 () {
        return this._isDirty2;
    }
    
    setIsDirty2 (isDirty2) {
        // console.log('BEG setIsDirty2');

        if(COL.util.isObjectValid(isDirty2.isDirty_moved)) {
            this._isDirty2.isDirty_moved = isDirty2.isDirty_moved;
        }
        
        if(COL.util.isObjectValid(isDirty2.isDirty_imageAddedOrRemoved)) {
            this._isDirty2.isDirty_imageAddedOrRemoved = isDirty2.isDirty_imageAddedOrRemoved;
        }
        
        if(COL.util.isObjectValid(isDirty2.isDirty_newOverlayRect)) {
            this._isDirty2.isDirty_newOverlayRect = isDirty2.isDirty_newOverlayRect;
        }

        if(COL.util.isObjectValid(isDirty2.isDirty_mergedWithOverlayRect)) {
            this._isDirty2.isDirty_mergedWithOverlayRect = isDirty2.isDirty_mergedWithOverlayRect;
        }

        this.updateStateIsDirty2();
        
        this.toggleRingVisibility();
    }

    setState(otherState){
        this._state = otherState;

        switch(this._state) {
            case OverlayRect.STATE.NONE: 
                this.removeRing();
                PlanView.Render();        

                break;
            case OverlayRect.STATE.MOVE_OVERLAY_RECT: 
                let selectedLayer = COL.model.getSelectedLayer();
                let planView = selectedLayer.getPlanView();
                let overlayRectRadius = planView.getOverlayRectRadius();
                let overlayRectRing = OverlayRect.makeRing(overlayRectRadius);
                this._meshObject.add(overlayRectRing);

                PlanView.Render();        
                break;

            case OverlayRect.STATE.SELECT_IMAGE:
            case OverlayRect.STATE.MOVED_OVERLAY_RECT: 
            case OverlayRect.STATE.CONTEXT_MENU:
                break;

            case OverlayRect.STATE.ADD_PHOTO: 
                let sceneBar = COL.model.getSceneBar();
                console.log('sceneBar._openImageFileButton', sceneBar._openImageFileButton);
                break;
                
            default:
                let msgStr = 'Edit mode is not supported: ' + this._state;
                throw new Error(msgStr);
        }
        console.log('overlayRect._state', this._state);
    }

    getState(){
        return this._state;
    }

    updateFlag_isDirty_imageAddedOrRemoved () {
        // console.log('BEG updateFlag_isDirty_imageAddedOrRemoved');
        
        // check if image(s) was added or removed
        // set isDirty_imageAddedOrRemoved to false if:
        //   the number of synced images and the number of current images are the same, and have the same image names
        // otherwise, set isDirty_imageAddedOrRemoved to true
        
        this._isDirty2.isDirty_imageAddedOrRemoved = false;
        if(this._syncedImageFilenames.length !== this._imagesNames.size() ) {
            this._isDirty2.isDirty_imageAddedOrRemoved = true;
        }
        else {
            for (let i = 0; i < this._syncedImageFilenames.length; i++) {
                let syncedImageFilename = this._syncedImageFilenames[i];
                if(!this.isImageNameInOverlayRect(syncedImageFilename)) {
                    this._isDirty2.isDirty_imageAddedOrRemoved = true;
                    break;
                }
            }
        }

        this.updateStateIsDirty2();
    }
    
    updateStateIsDirty2 () {
        // console.log('BEG updateStateIsDirty2');

        // console.log('this._meshObject.name', this._meshObject.name); 
        
        if( (this._isDirty2.isDirty_moved == true) ||
            (this._isDirty2.isDirty_imageAddedOrRemoved == true) ||
            (this._isDirty2.isDirty_newOverlayRect == true) ||
            (this._isDirty2.isDirty_mergedWithOverlayRect == true) ) {
            this._isDirty2.isDirty_general = true;
        }
        else {
            this._isDirty2.isDirty_general = false;
        }
        // console.log('this._isDirty2', this._isDirty2);

        if(this._isDirty2.isDirty_general == false) {
            // all the images are synced, so update _syncedImageFilenames - the list of synced images
            this._syncedImageFilenames = COL.util.deepCopy(this._imagesNames.getKeys());
        }

    }

    getMeshObject () {
        return this._meshObject;
    }

    getImagesNames () {
        return this._imagesNames;
    }

    setImagesNames(imagesNames) {
        console.log('BEG setImagesNames');
        
        this._imagesNames = imagesNames;
    }

    getRemovedImagesNames () {
        return this._removedImagesNames;
    }

    setRemovedImagesNames(removedImagesNames) {
        this._removedImagesNames = removedImagesNames;
    }

    // tbd - remove the keyword function
    // e.g. "isImageNameInOverlayRect (imageFileName) {" -> "isImageNameInOverlayRect(imageFileName) {"
    isImageNameInOverlayRect(imageFileName) {
        // console.log('BEG isImageNameInOverlayRect'); 

        let retval = false;
        if(this._imagesNames.getKeys().includes(imageFileName)) {
            retval = true;
        }
        return retval;
    }

    isImageNameInRemovedListInOverlayRect(imageFileName) {
        // console.log('BEG isImageNameInRemovedListInOverlayRect'); 

        let retval = false;
        if(this._removedImagesNames.getKeys().includes(imageFileName)) {
            retval = true;
        }

        return retval;
    }
    
    
    getSelectedImageFilenameIndex () {
        return this._selectedImageFilenameIndex;
    }

    setSelectedImageFilenameIndex (selectedImageFilenameIndex) {
        this._selectedImageFilenameIndex = selectedImageFilenameIndex;
    }

    getSelectedImageFilename () {
        return this._selectedImageFilename;
    }

    setSelectedImageFilename (selectedImageFilename) {
        this._selectedImageFilename = selectedImageFilename;
    }

    getSelectedImageInfoStr () {
        return this._selectedImageInfoStr;
    }


    // const getImageOrientation = (): string => {
    getImageOrientation () {
        const img = document.createElement('img');
        img.style.display = 'none';
        document.body.appendChild(img);
        const imageOrientation = window.getComputedStyle(img).imageOrientation;
        document.body.removeChild(img);
        return imageOrientation;
    }

    setSelectedImage (selectedImageFilenameIndex) {
        // console.log('BEG setSelectedImage');

        try {
            let selectedLayer = COL.model.getSelectedLayer();
            if(COL.util.isObjectValid(selectedLayer)) {
                // /////////////////////////////////////////////////////////////
                // Before setting the selectedImage
                // persist the imageInfo (e.g. camerainfo) of the last selected image,
                // so that if we revisit this image, we will get the same view setting
                // of the image (e.g. zoom)
                // /////////////////////////////////////////////////////////////
                
                selectedLayer.saveSelectedImageCameraInfo();
            }
            
            // ///////////////////////////////////////////////////////////////
            // set selectedImageFilenameIndex, and selectedImageFilename
            // ///////////////////////////////////////////////////////////////

            this.setSelectedImageFilenameIndex(selectedImageFilenameIndex);

            if(this._imagesNames.size() > 0) {
                // the associative array is ordered
                let imageFilename = this._imagesNames.getKeyByIndex(selectedImageFilenameIndex);
                this.setSelectedImageFilename(imageFilename);
            }
            else {
                this.setSelectedImageFilename(undefined);
            }

            // if (getImageOrientation() !== 'from-image') {
            //     // rotate image
            // }
            let retVal2 = this.getImageOrientation();
            // console.log('retVal2', retVal2); 
        }
        catch(err) {
            console.error('err', err);
            let toastTitleStr = 'setSelectedImage';
            toastr.error(err, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(err);
        }
        
    }

    // Load the images that belong to the overlayRect and display them as thumbnails in overlayRectImageThumbnailsPane 
    async loadImagesAsThumbnails (layer) {
        let overlayRectImageListEl = document.getElementById('overlayrect-thumbnail-images-id');
        
        let _this = this;
        // Remove all previous thumbnails
        overlayRectImageListEl.innerHTML = '';

        if(this._imagesNames.size() > 0) {
            let iter = this._imagesNames.iterator();
            while (iter.hasNext()) {
                let imageName = iter.nextKey();
                let blobUrl = await layer.loadImageToBlobUrl_andLoadImageInfo(imageName);

                const imageThumbnailWrapperEl = document.createElement('div');
                imageThumbnailWrapperEl.setAttribute('class', 'image-thumbnail-wrapper');

                const imageThumbnailEl = document.createElement('div');
                imageThumbnailEl.setAttribute('class', 'image-thumbnail');

                let imgEl =  document.createElement('img');
                imgEl.setAttribute('id', imageName);
                imgEl.setAttribute('src', blobUrl);

                if (COL.util.isTouchDevice()) {
                    imgEl.addEventListener('touchstart', onMouseDownOrTouchStart_thumbnailImage, {
                        capture: false,
                        passive: false,
                    });
                }
                else{
                    imgEl.addEventListener('mousedown', onMouseDownOrTouchStart_thumbnailImage, {
                        capture: false,
                        passive: false,
                    });
                }

                imgEl.addEventListener('contextmenu', onContextMenu_thumbnailImage, {
                    capture: false,
                    passive: false,
                });
                
                imageThumbnailEl.appendChild(imgEl);
                imageThumbnailWrapperEl.appendChild(imageThumbnailEl);
                overlayRectImageListEl.appendChild(imageThumbnailWrapperEl);


            }
        }
        else {
            // layer.clearRenderingOfThumbnailImages();
        }
    }

    // Display the selected image in the texture pane
    // and display other image related artefacts such as:
    // - label of image out of total number of images e.g. 2/10,
    // - image info label e.g. Date Taken
    async updateImageViewRelatedRenderring (layer) {
        // console.log('BEG updateImageViewRelatedRenderring');

        try {
            // ///////////////////////////////////////////////////////////////
            // update the planViewPane
            // ///////////////////////////////////////////////////////////////

            // if overlayRect has changed (image was added/removed, overlayRect was translated) show the overlayRectRing
            // otherwise hide the overlayRectRing
            
            this.toggleRingVisibility();
            PlanView.Render();        

            // ///////////////////////////////////////////////////////////////
            // update the texture pane
            // ///////////////////////////////////////////////////////////////

            // console.log('this._meshObject.name', this._meshObject.name); 
            
            await this.updateImageViewPane(layer);

            // ///////////////////////////////////////////////////////////////
            // update layer buttons/labels related to the selected image, e.g.
            // - the "Info" button,
            // - the "image index out of total number of images for the overlayRect" label (e.g. 1/3)
            // ///////////////////////////////////////////////////////////////
            
            if(COL.isOldGUIEnabled) {
                layer.updateLayerImageRelatedLabels();

                // ///////////////////////////////////////////////////////////////
                // disable/enable viewOverlayRect related buttons (nextImageButton, previousImageButton)
                // depending on, if the overlayRect is selected and if it has more than one image.
                // ///////////////////////////////////////////////////////////////

                layer.updatePreviousPlayNextImageButtons();
            }

            if(COL.doWorkOnline) {
                // ///////////////////////////////////////////////////////////////
                // disable/enable editOverlayRect related buttons (openImageFileButton, editOverlayRect_deleteButton)
                // depending on if the overlayRect is empty or not
                // ///////////////////////////////////////////////////////////////

                layer.updateEditOverlayRectRelatedButtons();
            }
        }
        catch(err) {
            console.error('err', err);

            let toastTitleStr = 'updateImageViewRelatedRenderring';
            let msgStr = 'Failed to updateImageViewRelatedRenderring.' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
        
    }

    async updateImageViewPane (layer) {
        // console.log('BEG updateImageViewPane');
        
        if(this._imagesNames.size() > 0) {
            await layer.loadTheSelectedImageAndRender();
        }
    }
    
    setSelectedImageInfoStr (selectedImageInfoStr) {
        // console.log('BEG setSelectedImageInfoStr'); 
        this._selectedImageInfoStr = selectedImageInfoStr;
    }

    setLabel_ImageIndexOfNumImagesInOverlayRect1 () {
        let imageIndexOfNumImagesInOverlayRectStr = 'NA';

        if( (this._imagesNames.size() > 0) && COL.util.isObjectValid(this._selectedImageFilenameIndex)) {
            let imageFilenameIndexPlus1 = this._selectedImageFilenameIndex + 1;
            imageIndexOfNumImagesInOverlayRectStr = imageFilenameIndexPlus1 + '/' + this._imagesNames.size();
        }

        return imageIndexOfNumImagesInOverlayRectStr;
    }

    async addImageToOverlayRect(layer, imageInfo) {
        console.log('BEG addImageToOverlayRect');
        
        let blobUrl = COL.util.getNestedObject(imageInfo, ['blobInfo', 'blobUrl']);
        if(COL.util.isStringInvalid(blobUrl)) {
            // sanity check
            throw new Error('blobUrl is invalid');
        }

        // Load the image texture, so we can view the image
        await this.loadImageTexture(blobUrl);

        this._imagesNames.set(imageInfo.filename, true);

        let selectedImageFilenameIndex = this._imagesNames.size() - 1;
        this.setSelectedImage(selectedImageFilenameIndex);
        this.updateTotalNumImagesLabel();

        // update the state of isDirty_imageAddedOrRemoved
        // (if the added image is a synced image that was just removed, then nothing needs to be synced)
        this.updateFlag_isDirty_imageAddedOrRemoved();
    }

    async deleteImageFromOverlayRect(layer, removedImageFilename) {
        // console.log('BEG deleteImageFromOverlayRect');

        if(COL.util.isObjectInvalid(removedImageFilename)) {
            // sanity check
            throw new Error('removedImageFilename is invalid');
        }
        
        // overlayRect, after deletion of image, may have 0 or more images.

        // remove imageFilename from OverlayRect::_imagesNames
        if(COL.util.isObjectValid(removedImageFilename)) {
            this._removedImagesNames.set(removedImageFilename, true);
            this._imagesNames.remove(removedImageFilename);
        }
        else {
            // sanity check
            throw new Error('removedImageFilename is invalid');
        }
        
        if(this._imagesNames.size() > 0) {
            // overlayRect, after deletion of image, still has images.
            // Update the selected image to the previous image and update the texture pane
            // https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
            let selectedImageFilenameIndex = (this.getSelectedImageFilenameIndex() - 1).mod1(this._imagesNames.size());
            this.setSelectedImage(selectedImageFilenameIndex);
        }
        else{
            // overlayRect, after deletion of image, has no images.
            // Update the selected image to undefined and clear rendering the image in the texture pane
            this.setSelectedImage(undefined);
        }
        this.updateTotalNumImagesLabel();

        // update the state of isDirty_imageAddedOrRemoved
        // (if the removed image is a new image that is still not synced, then nothing needs to be synced)
        this.updateFlag_isDirty_imageAddedOrRemoved();
        
        return removedImageFilename;
    }

    async nextOrPrevSelectedImage (layer, doLoadNextImage) {
        // console.log('BEG incrementSelectedImage'); 

        try {
            let selectedImageFilenameIndex;
            if(doLoadNextImage) {
                selectedImageFilenameIndex = (this.getSelectedImageFilenameIndex() + 1).mod1(this._imagesNames.size());
            }
            else {
                selectedImageFilenameIndex = (this.getSelectedImageFilenameIndex() - 1).mod1(this._imagesNames.size());
            }
            this.setSelectedImage(selectedImageFilenameIndex);
            await this.updateImageViewRelatedRenderring(layer);
        }
        catch(err) {
            console.error('err', err);

            let toastTitleStr = 'nextOrPrevSelectedImage';
            let msgStr = 'Failed to nextOrPrevSelectedImage.' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }

    }

    async playImages (layer) {
        // console.log('BEG playImages'); 
        try {
            if(COL.util.isObjectInvalid(this._imagesNames)) {
                // sanity check
                throw new Error('this._imagesNames is invalid');
            }

            let doLoadNextImage = true;
            let numImages = this._imagesNames.size();
            let index = 0;

            // the first image is already displayed, so we need to display (numImages-1) images
            while (index < (numImages-1)) {
                index++;
                
                if(layer.getPlayImagesState() !== Layer.PLAY_IMAGES_STATE.NONE) {
                    // sleep for some time
                    await COL.util.sleep(OverlayRect.playImages_timeToSleepInMilliSecs);
                    
                    // play the next image
                    await this.nextOrPrevSelectedImage(layer, doLoadNextImage);
                }
                else {
                    // stop the play
                    console.log('stop the play'); 
                    break;
                }
            }
        }
        catch(err) {
            console.error('err', err);

            let toastTitleStr = 'playImages';
            let msgStr = 'Failed to playImages.' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
    }

    async loadImageTexture (fileToOpenUrl) {

        let meshObject = this._meshObject;
        
        return new Promise(function(resolve, reject) {
            
            // instantiate a loader
            let textureLoader = new THREE_TextureLoader();

            // load a resource
            textureLoader.load(
                // resource URL
                fileToOpenUrl,
                
                // onLoad callback
                function ( texture ) {

                    resolve(true);
                },

                // onProgress callback currently not supported
                undefined,

                // onError callback
                function ( err ) {
                    let msgStr = 'textureLoader failed to load: ' + err;
                    throw new Error(msgStr);
                }
            );
        });
    }

    toggleRingVisibility () {
        // console.log('BEG toggleRingVisibility');

        let overlayRectMeshObj = this.getMeshObject();
        let isDirty_general = this._isDirty2.isDirty_general;
        
        overlayRectMeshObj.traverse(function ( child ) {
            if ( (child.type === 'Mesh') && (child.name === 'ring') ) {
                if(isDirty_general == true) {
                    child.visible = true;
                }
                else {
                    child.visible = false;
                }
            }
        });
    }
    
    // Update the the total number of images label inside the overlayRect
    updateTotalNumImagesLabel () {
        console.log('BEG updateTotalNumImagesLabel');

        // Remove the previous overlayRectLabel if it exists
        let overlayRectLabelPrev = this._meshObject.getObjectByName( 'spriteLabel', true );
        this._meshObject.remove( overlayRectLabelPrev );

        let selectedLayer = COL.model.getSelectedLayer();
        let planView = selectedLayer.getPlanView();
        let overlayRectRadius = planView.getOverlayRectRadius();
        
        // Create a new updated label and add it to this._meshObject
        let numImagesInOverlayRect = this.getNumImagesInOverlayRect();
        let overlayRectLabelCurr = OverlayRect.makeSpriteLabel(overlayRectRadius, numImagesInOverlayRect);
        this._meshObject.add(overlayRectLabelCurr);
        this._meshObject.material.needsUpdate = true;

        PlanView.Render();        
    }


    // this functions checks if the overlayRect has moved since the last time it was used for split
    // if the overlayRect has moved "far enough", reset the splitCounter, and yPosition to the default value, i.e.
    // the position of the split is at the default initial location (due to splitCounter),
    // and height (due to splitCounter) relative to the overlayRect
    manageTheCaseWhereOverlayRectHasMovedSinceLastSplit () {
        // console.log('BEG manageTheCaseWhereOverlayRectHasMovedSinceLastSplit');
        
        let selectedLayer = COL.model.getSelectedLayer();
        let planView = selectedLayer.getPlanView();
        let overlayRectRadius = planView.getOverlayRectRadius();
        let minDistanceThresh1 = 2 * overlayRectRadius;
        
        if(COL.util.isObjectValid(this.positionAtLastSplit)) {
            let distance = this.positionAtLastSplit.distanceTo(this._meshObject.position);
            if (distance > minDistanceThresh1) {
                // consider the overlayRect as "hasMoved"
                console.log('Reset the splitInfo params'); 
                this.splitInfo.splitCounter = 0;
                this.splitInfo.yPosition = 0;
                this.positionAtLastSplit.copy(this._meshObject.position);
            }
        }
    }
    
    async splitImageFromOverlayRect () {
        // console.log('BEG splitImageFromOverlayRect');
        
        let selectedLayer = COL.model.getSelectedLayer();
        // create a new overlayRect,
        // place the current image in the new overlayRect
        // remove the current image from this overlayRect
        if( (this._imagesNames.size() > 1) && COL.util.isObjectValid(this._selectedImageFilename)) {
            this.manageTheCaseWhereOverlayRectHasMovedSinceLastSplit();
            
            let planView = selectedLayer.getPlanView();
            // console.log('this._meshObject.position', this._meshObject.position);
            
            let newOverlayRectPosition = new THREE_Vector3();
            newOverlayRectPosition.copy(this._meshObject.position);

            this.splitInfo.splitCounter += 1;
            this.splitInfo.yPosition += this.splitInfo.deltaY1;
            // console.log('this.splitInfo.yPosition', this.splitInfo.yPosition); 

            let deltaX = this.splitInfo.deltaX0 + (this.splitInfo.deltaX1 * this.splitInfo.splitCounter);
            let deltaY = this.splitInfo.yPosition;
            let deltaZ = this.splitInfo.deltaZ1 * this.splitInfo.splitCounter;

            let offset2 = new THREE_Vector3(deltaX, deltaY, deltaZ);
            newOverlayRectPosition.add( offset2 );

            let isPositionWithinBoundaries = planView.isPositionWithinPaneBoundaries(newOverlayRectPosition);
            // console.log('isPositionWithinBoundaries', isPositionWithinBoundaries);
            
            if(isPositionWithinBoundaries) {
                // remove the image from the overlayRect
                // create a newOverlayRect, add the removed image, and add the newOverlayRect to the selectedLayer.

                let imagesInfo = selectedLayer.getImagesInfo();
                let imageInfo = imagesInfo.getByKey(this._selectedImageFilename);
                
                let removedImageFilename = await this.deleteImageFromOverlayRect(selectedLayer, this._selectedImageFilename);
                let doSetAsSelectedOverlayRect = false;
                let newOverlayRect = await planView.insertCircleMesh(newOverlayRectPosition, doSetAsSelectedOverlayRect);
                let newOverlayRectType = (typeof newOverlayRect);

                await newOverlayRect.addImageToOverlayRect(selectedLayer, imageInfo);

                // render the selected overlayRect to update the thumbnail images after the split
                selectedLayer.showSelectedOverlayRect();

                // mark as not-synced after splitting an overlayRect. 
                selectedLayer.setSyncWithWebServerStatus(false);

                // sync to the webserver after splitting an overlayRect. 
                let syncStatus = await selectedLayer.syncBlobsWithWebServer();
                if(!syncStatus) {
                    throw new Error('Error from syncBlobsWithWebServer while splitting an image from overlyRect.');
                }
            }
            else {
                throw new Error('New position for overlayRect is outside the selected plan pane boundaries - cannot split');
            }
        }
        else {
            throw new Error('overlayRect is either invalid or has 1 image - cannot split');
        }
        
    }
    
    async mergeOtherOverlayRect (layer, otherOverlayRect) {
        // console.log('BEG mergeOtherOverlayRect');

        // merge the fields from the otherOverlayRect
        this._imagesNames.mergeArray(otherOverlayRect.getImagesNames());

        this._removedImagesNames.mergeArray(otherOverlayRect.getRemovedImagesNames());

        // console.log('this._syncedImageFilenames before', this._syncedImageFilenames); 
        // console.log('this._syncedImageFilenames.length1', this._syncedImageFilenames.length); 
        // console.log('otherOverlayRect._syncedImageFilenames', otherOverlayRect._syncedImageFilenames); 
        let syncedImageFilenamesType = (typeof this._syncedImageFilenames);
        // console.log('syncedImageFilenamesType', syncedImageFilenamesType); 

        this._syncedImageFilenames = [...(this._syncedImageFilenames), ...(otherOverlayRect._syncedImageFilenames)];
        
        this.updateTotalNumImagesLabel();

        // update the nextImage button (make it non-grey)
        await this.updateImageViewRelatedRenderring(layer);
        
        // update the state of isDirty_imageAddedOrRemoved
        // (if the added image is a synced image that was just removed, then nothing needs to be synced)
        this.updateFlag_isDirty_imageAddedOrRemoved();

        // tbd - set isDirty_mergedWithOverlayRect
        let overlayRectIsDirty2 = {
            isDirty_mergedWithOverlayRect: true
        };
        this.setIsDirty2(overlayRectIsDirty2);
        
    }

    getNumImagesInOverlayRect() {

        if(COL.util.isObjectInvalid(this._meshObject)) {
            throw new Error('this._meshObject is invalid');
        }
        
        let imagesNames = this.getImagesNames();
        return imagesNames.size();
    }

    // /////////////////////////////////////////////////////////////////
    // Static functions
    // /////////////////////////////////////////////////////////////////
    

    // based on https://threejsfundamentals.org/threejs/lessons/threejs-billboards.html
    // create the blue square with the number on it
    static makeLabelCanvas (labelSize, labelText) {
        // console.log('BEG makeLabelCanvas');
        
        const borderSize = 2;
        const ctx = document.createElement('canvas').getContext('2d');
        const font =  `${labelSize}px bold sans-serif`;
        ctx.font = font;
        // measure how long the labelText will be
        const textWidth = ctx.measureText(labelText).width;

        const doubleBorderSize = borderSize * 2;
        const width = labelSize + doubleBorderSize;
        const height = labelSize + doubleBorderSize;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        // need to set font again after resizing canvas
        ctx.font = font;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // set the background to be fully transparent
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, width, height);

        // set transparency value for the foreground
        ctx.globalAlpha = 1;
        
        // scale to fit but don't stretch
        const scaleFactor = Math.min(1, labelSize / textWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, 1);
        // write the label text in black
        ctx.fillStyle = 'black';
        ctx.fillText(labelText, 0, 0);

        return ctx.canvas;
    }
    
    static makeSpriteLabel (labelSize, numImagesInOverlayRect) {
        console.log('BEG makeSpriteLabel');

        const canvas5 = OverlayRect.makeLabelCanvas(labelSize, numImagesInOverlayRect);
        const texture = new THREE_CanvasTexture(canvas5);
        // because our canvas is likely not a power of 2
        // in both dimensions set the filtering appropriately.
        texture.minFilter = THREE_LinearFilter;
        texture.wrapS = THREE_ClampToEdgeWrapping;
        texture.wrapT = THREE_ClampToEdgeWrapping;

        let labelMaterial = new THREE_SpriteMaterial({
            map: texture,
            transparent: true,
        });

        const label = new THREE_Sprite(labelMaterial);
        label.name = 'spriteLabel';
        label.scale.x = canvas5.width;
        label.scale.y = canvas5.height;
        label.material.map.needsUpdate = true;
        
        // setting the sprite position a bit closer to the camera so that the sprite is not hidden, see
        // https://threejs.slack.com/archives/C0AR9959Q/p1616646469112000
        label.position.set( 0, 0, 1 );
        label.updateMatrixWorld();
        
        return label;
    }

    removeRing () {
        let overlayRectMeshObj = this.getMeshObject();
        for (let i = overlayRectMeshObj.children.length - 1; i >= 0; i--) {
            let child = overlayRectMeshObj.children[i];
            if ( (child.type === 'Mesh') && (child.name === 'ring') ) {
                COL.ThreejsUtil.disposeObject(child);
                overlayRectMeshObj.remove(child);
            }
        }
    }

    static makeRing (innerRadius) {
        // console.log('BEG makeRing');
        // the ring is added when the overlayRect is in moveMode
        
        var ringMaterial = new THREE_MeshPhongMaterial( {
            opacity: 0.3,
            transparent: true,
            side: THREE_DoubleSide,
            color: COL.util.Color.Red
            // leave name commented out so that it will be set automatically to unique indexed name, e.g. material_44
            // name: "imageFilename",
        } );

        let outerRadius = Math.round(innerRadius * 1.5);
        // let thetaSegments = 320;
        let thetaSegments = 10;
        let ringGeometry = new THREE_RingGeometry( innerRadius, outerRadius, thetaSegments );
        let ringMeshObj = new THREE_Mesh( ringGeometry, ringMaterial );

        ringMeshObj.name = 'ring';

        ringMeshObj.visible = true;

        ringMeshObj.position.set( 0, 0, 0 );
        // make the ringMeshObj above overlayMeshObj so that the ringMeshObj is rendered in front of overlayMeshObj
        ringMeshObj.updateMatrixWorld();
        
        return ringMeshObj;
    }

    // /////////////////////////////////
    // BEG Add context-menu to overlayRectImageThumbnailsPane
    // http://jsfiddle.net/avnerm/Lz08n1ex/97
    // /////////////////////////////////

    delayedMenuThumbnailImage(event) {
        // console.log('BEG delayedMenuThumbnailImage');
        if(this.isMenuVisible) {
            // a previous menu exist. Clear it first before setting a new menu.
            this.clearMenuThumbnailImage();
        }

        let timeIntervalInMilliSec = 500;
        this.timeoutID = setTimeout(OverlayRect.ShowMenuThumbnailImage, timeIntervalInMilliSec, event);
    }
    
    static ShowMenuThumbnailImage(event) {
        console.log('BEG ShowMenuThumbnailImage');

        let selectedLayer = COL.model.getSelectedLayer();
        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
        selectedOverlayRect.showMenuThumbnailImage(event);
    }

    showMenuThumbnailImage(event) {
        console.log('BEG showMenuThumbnailImage');
        
        let point2d = COL.util.getPointFromEvent(event);

        let pageX = undefined;
        let pageY = undefined;
        if (event instanceof MouseEvent) {
            pageY = event.pageY;
            pageX = event.pageX;
        }
        else if(event instanceof TouchEvent) {
            pageY = event.changedTouches[0].pageY;
            pageX = event.changedTouches[0].pageX;
        }
        else{
            throw new Error('point is undefined. Event is not touch or mouse event');
        }

        $('#overlayRectImageThumbnailsMenuId').finish().toggle(100).css({
            top: pageY + 'px',
            left: pageX + 'px'
        });

        this.isMenuVisible = true;
        this.setState(OverlayRect.STATE.CONTEXT_MENU);
    }

    clearMenuThumbnailImage() {
        console.log('BEG clearMenuThumbnailImage');
        
        window.clearTimeout(this.timeoutID);
        this.isMenuVisible = false;
        $('#overlayRectImageThumbnailsMenuId').hide(100);
    }

    // /////////////////////////////////
    // END Add context-menu to overlayRectImageThumbnailsPane
    // /////////////////////////////////
}

OverlayRect.STATE = { 
    NONE: -1, 
    SELECT_IMAGE: 0,
    MOVE_OVERLAY_RECT: 1,
    MOVED_OVERLAY_RECT: 2,
    ADD_PHOTO: 3,
    // The user selected the context-menu (but has not selected an option yet)
    CONTEXT_MENU: 4,
};

OverlayRect.playImages_timeToSleepInMilliSecs = 300;

// https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
Number.prototype.mod1 = function(n) {
    return ((this%n)+n)%n;
};

export { OverlayRect };
