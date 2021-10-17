
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
} from '../../include/three.js/three.js-r120/build/three.module.js';
        
import { COL } from  "../COL.js";
import { Model } from "./Model.js";
import { Layer } from "./Layer.js";
import { Scene3DtopDown } from "./Scene3DtopDown.js";
import { ImageInfo } from "./ImageInfo.js";
import "../util/ThreejsUtil.js";

class OverlayRect {
    constructor(otherMeshObject){
        // console.log('BEG OverlayRect::constructor()');

        this._imagesNames = new COL.util.AssociativeArray();
        if(COL.util.isObjectValid(otherMeshObject.material.userData['imagesNames']))
        {
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

        let overlayRectRadius = Scene3DtopDown.overlayRectRadiusDefault;
        let selectedLayer = COL.model.getSelectedLayer();
        if(COL.util.isObjectValid(selectedLayer))
        {
            let scene3DtopDown = selectedLayer.getScene3DtopDown();
            if(COL.util.isObjectValid(scene3DtopDown))
            {
                overlayRectRadius = scene3DtopDown.getOverlayRectRadius();
            }
        }
        
        this.splitInfo = {'splitCounter': 0,
                          'yPosition': 0,
                          'deltaX0': 2*overlayRectRadius,
                          'deltaX1': (2*overlayRectRadius / 10),
                          'deltaY1': 1,
                          'deltaZ1': (2*overlayRectRadius / 10)
                         };

        if(COL.util.isObjectInvalid(otherMeshObject))
        {
            // sanity check
            throw new Error('otherMeshObject is invalid');
        }

        // Construct an object using an existing mesh
        this._meshObject = otherMeshObject;
        
        this.positionAtLastSplit = new THREE_Vector3();
        this.positionAtLastSplit.copy(this._meshObject.position);

        this._syncedImageFilenames = COL.util.deepCopy(this._imagesNames.getKeys());
        
        // console.log('this._syncedImageFilenames', this._syncedImageFilenames);
        
        if(COL.util.isObjectInvalid(this._syncedImageFilenames))
        {
            throw new Error('this._syncedImageFilenames is invalid');
        }

        ////////////////////////////////////
        // Set selectedImage related variables
        ////////////////////////////////////

        if(this._imagesNames.size() > 0)
        {
            // set the selected image to the first image
            this.setSelectedImage(0);
        }
        else
        {
            // console.log('this._imagesNames is empty.');
            this.setSelectedImage(undefined);
        }

        // this.printClassMembers();

    };

    toJSON = function() {
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
    };

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile = function () {
        // console.log('BEG toJSON_forFile'); 

        let overlayRect_asJson = {};
        overlayRect_asJson['_imagesNames'] = this._imagesNames;
        overlayRect_asJson['_removedImagesNames'] = this._removedImagesNames;
        overlayRect_asJson['_selectedImageFilenameIndex'] = this._selectedImageFilenameIndex;
        overlayRect_asJson['_selectedImageFilename'] = this._selectedImageFilename;
        overlayRect_asJson['_selectedImageInfoStr'] = this._selectedImageInfoStr;
        overlayRect_asJson['_isDirty2'] = this._isDirty2;
        overlayRect_asJson['splitInfo'] = this.splitInfo;
        overlayRect_asJson['positionAtLastSplit'] = this.positionAtLastSplit;
        overlayRect_asJson['_syncedImageFilenames'] = this._syncedImageFilenames;
        overlayRect_asJson['_meshObject.uuid'] = this._meshObject.uuid;
        overlayRect_asJson['_meshObject.id'] = this._meshObject.id;
        
        return overlayRect_asJson;
    };

    dispose = function() {
        console.log('BEG OverlayRect::dispose()');

        //////////////////////////////////////////////////////
        // Before Dispose
        //////////////////////////////////////////////////////

        let overlayRectAsJson = this.toJSON();
        this._imagesNames.clear();
        
        //////////////////////////////////////////////////////
        // Dispose
        // https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534
        //////////////////////////////////////////////////////

        this._removedImagesNames.clear();

        this._selectedImageFilenameIndex = null;
        this._selectedImageFilename = null;
        this._selectedImageInfoStr = null;

        this._isDirty2 = null;
        
        this.splitInfo = null;

        COL.ThreejsUtil.disposeObject(this._meshObject);
        
        this.positionAtLastSplit = null;

        this._syncedImageFilenames = [];
        

        //////////////////////////////////////////////////////
        // After Dispose
        //////////////////////////////////////////////////////

        console.log( "After Dispose");

        let overlayRectAsJson2 = this.toJSON();
        console.log('overlayRectAsJson after dispose', overlayRectAsJson2); 

    };
    
    printClassMembers = function () {
        console.log('BEG printClassMembers');

        console.log('this._imagesNames', this._imagesNames);
        console.log('this._selectedImageFilenameIndex', this._selectedImageFilenameIndex); 
        console.log('this._selectedImageFilename', this._selectedImageFilename); 
        console.log('this._selectedImageInfoStr', this._selectedImageInfoStr); 
        console.log('this._meshObject', this._meshObject);
        console.log('this._isDirty2', this._isDirty2);
        
        console.log(''); 
    };

    getIsDirty2 = function () {
        return this._isDirty2;
    };
    
    setIsDirty2 = function (isDirty2) {
        // console.log('BEG setIsDirty2');

        if(COL.util.isObjectValid(isDirty2.isDirty_moved))
        {
            this._isDirty2.isDirty_moved = isDirty2.isDirty_moved;
        }
        
        if(COL.util.isObjectValid(isDirty2.isDirty_imageAddedOrRemoved))
        {
            this._isDirty2.isDirty_imageAddedOrRemoved = isDirty2.isDirty_imageAddedOrRemoved;
        }
        
        if(COL.util.isObjectValid(isDirty2.isDirty_newOverlayRect))
        {
            this._isDirty2.isDirty_newOverlayRect = isDirty2.isDirty_newOverlayRect;
        }

        if(COL.util.isObjectValid(isDirty2.isDirty_mergedWithOverlayRect))
        {
            this._isDirty2.isDirty_mergedWithOverlayRect = isDirty2.isDirty_mergedWithOverlayRect;
        }

        this.updateStateIsDirty2();
        
        this.toggleRingVisibility();
    };

    
    updateFlag_isDirty_imageAddedOrRemoved = function () {
        // console.log('BEG updateFlag_isDirty_imageAddedOrRemoved');
        
        // check if image(s) was added or removed
        // set isDirty_imageAddedOrRemoved to false if:
        //   the number of synced images and the number of current images are the same, and have the same image names
        // otherwise, set isDirty_imageAddedOrRemoved to true
        
        this._isDirty2.isDirty_imageAddedOrRemoved = false;
        if(this._syncedImageFilenames.length !== this._imagesNames.size() )
        {
            this._isDirty2.isDirty_imageAddedOrRemoved = true;
        }
        else
        {
            for (let i = 0; i < this._syncedImageFilenames.length; i++) {
                let syncedImageFilename = this._syncedImageFilenames[i];
                if(!this.isImageNameInOverlayRect(syncedImageFilename))
                {
                    this._isDirty2.isDirty_imageAddedOrRemoved = true;
                    break;
                }
            }
        }

        this.updateStateIsDirty2();
    };
    
    updateStateIsDirty2 = function () {
        // console.log('BEG updateStateIsDirty2');

        // console.log('this._meshObject.name', this._meshObject.name); 
        
        if( (this._isDirty2.isDirty_moved == true) ||
            (this._isDirty2.isDirty_imageAddedOrRemoved == true) ||
            (this._isDirty2.isDirty_newOverlayRect == true) ||
            (this._isDirty2.isDirty_mergedWithOverlayRect == true) )
        {
            this._isDirty2.isDirty_general = true;
        }
        else
        {
            this._isDirty2.isDirty_general = false;
        }
        // console.log('this._isDirty2', this._isDirty2);

        if(this._isDirty2.isDirty_general == false)
        {
            // all the images are synced, so update _syncedImageFilenames - the list of synced images
            this._syncedImageFilenames = COL.util.deepCopy(this._imagesNames.getKeys());
        }

    };

    getMeshObject = function () {
        return this._meshObject;
    };

    getImagesNames = function () {
        return this._imagesNames;
    };

    setImagesNames = function(imagesNames) {
        console.log('BEG setImagesNames');
        
        this._imagesNames = imagesNames;
    };

    getRemovedImagesNames = function () {
        return this._removedImagesNames;
    };

    setRemovedImagesNames = function(removedImagesNames) {
        this._removedImagesNames = removedImagesNames;
    };

    // tbd - remove the keyword function
    // e.g. "isImageNameInOverlayRect = function (imageFileName) {" -> "isImageNameInOverlayRect(imageFileName) {"
    isImageNameInOverlayRect = function(imageFileName) {
        // console.log('BEG isImageNameInOverlayRect'); 

        let retval = false;
        if(this._imagesNames.getKeys().includes(imageFileName))
        {
            retval = true;
        }
        return retval;
    };

    isImageNameInRemovedListInOverlayRect = function(imageFileName) {
        // console.log('BEG isImageNameInRemovedListInOverlayRect'); 

        let retval = false;
        if(this._removedImagesNames.getKeys().includes(imageFileName))
        {
            retval = true;
        }

        return retval;
    };
    
    
    getSelectedImageFilenameIndex = function () {
        return this._selectedImageFilenameIndex;
    };

    setSelectedImageFilenameIndex = function (selectedImageFilenameIndex) {
        this._selectedImageFilenameIndex = selectedImageFilenameIndex;
    };

    getSelectedImageFilename = function () {
        return this._selectedImageFilename;
    };

    setSelectedImageFilename = function (selectedImageFilename) {
        this._selectedImageFilename = selectedImageFilename;
    };

    getSelectedImageInfoStr = function () {
        return this._selectedImageInfoStr;
    };


    // const getImageOrientation = (): string => {
    getImageOrientation = function () {
        const img = document.createElement('img');
        img.style.display = 'none';
        document.body.appendChild(img);
        const imageOrientation = window.getComputedStyle(img).imageOrientation;
        document.body.removeChild(img);
        return imageOrientation;
    };

    setSelectedImage = function (selectedImageFilenameIndex) {
        // console.log('BEG setSelectedImage'); 

        let selectedLayer = COL.model.getSelectedLayer();
        if(COL.util.isObjectValid(selectedLayer))
        {
            ///////////////////////////////////////////////////////////////
            // Before setting the selectedImage
            // persist the imageInfo (e.g. camerainfo) of the last selected image,
            // so that if we revisit this image, we will get the same view setting
            // of the image (e.g. zoom)
            ///////////////////////////////////////////////////////////////
            
            selectedLayer.saveSelectedImageCameraInfo();
        }
        
        /////////////////////////////////////////////////////////////////
        // set selectedImageFilenameIndex, and selectedImageFilename
        /////////////////////////////////////////////////////////////////

        this.setSelectedImageFilenameIndex(selectedImageFilenameIndex);

        if(this._imagesNames.size() > 0)
        {
            // the associative array is ordered
            let imageFilename = this._imagesNames.getKeyByIndex(selectedImageFilenameIndex);
            this.setSelectedImageFilename(imageFilename);
        }
        else
        {
            this.setSelectedImageFilename(undefined);
        }

        // if (getImageOrientation() !== 'from-image') {
        //     // rotate image
        // }
        let retVal2 = this.getImageOrientation();
        // console.log('retVal2', retVal2); 
    };

    // Display the selected image in the texture pane
    // and display other image related artefacts such as:
    // - label of image out of total number of images e.g. 2/10,
    // - image info label e.g. Date Taken
    updateSelectedImageRelatedRenderring = async function (layer) {
        // console.log('BEG updateSelectedImageRelatedRenderring');
        
        /////////////////////////////////////////////////////////////////
        // update the topDown pane
        /////////////////////////////////////////////////////////////////

        // if overlayRect has changed (image was added/removed, overlayRect was translated) show the overlayRectRing
        // otherwise hide the overlayRectRing
        
        this.toggleRingVisibility();
        Scene3DtopDown.render1();        

        /////////////////////////////////////////////////////////////////
        // update the texture pane
        /////////////////////////////////////////////////////////////////

        // console.log('this._meshObject.name', this._meshObject.name); 
        
        await this.updateTexturePane(layer);

        /////////////////////////////////////////////////////////////////
        // update layer buttons/labels related to the selected image, e.g.
        // - the "Info" button,
        // - the "image index out of total number of images for the overlayRect" label (e.g. 1/3)
        /////////////////////////////////////////////////////////////////
        
        layer.updateLayerImageRelatedLabels();

        /////////////////////////////////////////////////////////////////
        // disable/enable viewOverlayRect related buttons (nextImageButton, previousImageButton)
        // depending on, if the overlayRect is selected and if it has more than one image.
        /////////////////////////////////////////////////////////////////

        layer.updatePreviousPlayNextImageButtons();

        if(COL.doWorkOnline)
        {
            /////////////////////////////////////////////////////////////////
            // disable/enable editOverlayRect related buttons (openImageFileButton, editOverlayRect_deleteButton)
            // depending on if the overlayRect is empty or not
            /////////////////////////////////////////////////////////////////

            layer.updateEditOverlayRectRelatedButtons();
        }
    };

    updateTexturePane = async function (layer) {
        // console.log('BEG updateTexturePane');
        
        if(this._imagesNames.size() > 0)
        {
            await layer.loadTheSelectedImageAndRender();
        }
        else
        {
            layer.clearRenderingOfSelectedImage();
        }
    };
    
    setSelectedImageInfoStr = function (selectedImageInfoStr) {
        // console.log('BEG setSelectedImageInfoStr'); 
        this._selectedImageInfoStr = selectedImageInfoStr;
    };

    setLabel_ImageIndexOfNumImagesInOverlayRect1 = function () {
        let imageIndexOfNumImagesInOverlayRectStr = 'NA';

        if( (this._imagesNames.size() > 0) && COL.util.isObjectValid(this._selectedImageFilenameIndex))
        {
            let imageFilenameIndexPlus1 = this._selectedImageFilenameIndex + 1;
            imageIndexOfNumImagesInOverlayRectStr = imageFilenameIndexPlus1 + '/' + this._imagesNames.size();
        }

        return imageIndexOfNumImagesInOverlayRectStr;
    };

    addImageToOverlayRect = async function(layer, imageInfo)
    {
        console.log('BEG addImageToOverlayRect');
        
        let blobUrl = COL.util.getNestedObject(imageInfo, ['blobInfo', 'blobUrl']);
        if(COL.util.isStringInvalid(blobUrl))
        {
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

        await this.updateSelectedImageRelatedRenderring(layer);
    };

    deleteImageFromOverlayRect = async function(layer, imageFilenameToRemove)
    {
        // console.log('BEG deleteImageFromOverlayRect');

        if(COL.util.isObjectInvalid(imageFilenameToRemove))
        {
            // sanity check
            throw new Error('imageFilenameToRemove is invalid');
        }
        
        // overlayRect, after deletion of image, may have 0 or more images.

        // remove imageFilename from OverlayRect::_imagesNames
        if(COL.util.isObjectValid(imageFilenameToRemove))
        {
            this._removedImagesNames.set(imageFilenameToRemove, true);
            this._imagesNames.remove(imageFilenameToRemove);
        }
        else
        {
            // sanity check
            throw new Error('imageFilenameToRemove is invalid');
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

        let isSelectedOverlayRect = layer.isSelectedOverlayRect(this);
        if(isSelectedOverlayRect)
        {
            await this.updateSelectedImageRelatedRenderring(layer);
        }
        
        return imageFilenameToRemove;
    };

    nextOrPrevSelectedImage = async function (layer, doLoadNextImage) {
        // console.log('BEG incrementSelectedImage'); 
        let selectedImageFilenameIndex;
        if(doLoadNextImage)
        {
            selectedImageFilenameIndex = (this.getSelectedImageFilenameIndex() + 1).mod1(this._imagesNames.size());
        }
        else
        {
            selectedImageFilenameIndex = (this.getSelectedImageFilenameIndex() - 1).mod1(this._imagesNames.size());
        }
        this.setSelectedImage(selectedImageFilenameIndex);
        await this.updateSelectedImageRelatedRenderring(layer);
    };

    playImages = async function (layer) {
        // console.log('BEG playImages'); 
        if(COL.util.isObjectInvalid(this._imagesNames))
        {
            // sanity check
            throw new Error('this._imagesNames is invalid');
        }

        let doLoadNextImage = true;
        let iter = this._imagesNames.iterator();
        while (iter.hasNext()) {
            let iter1 = iter.next();
            
            if(layer.getPlayImagesState() !== Layer.PLAY_IMAGES_STATE.NONE)
            {
                // sleep for some time
                await COL.util.sleep(OverlayRect.playImages_timeToSleepInMilliSecs);
                
                // play the next image
                await this.nextOrPrevSelectedImage(layer, doLoadNextImage);
            }
            else
            {
                // stop the play
                console.log('stop the play'); 
                break;
            }
        }
    };

    loadImageTexture = async function (fileToOpenUrl) {

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
    };

    toggleRingVisibility = function () {
        // console.log('BEG toggleRingVisibility');

        let overlayRectMeshObj = this.getMeshObject();
        let isDirty_general = this._isDirty2.isDirty_general;
        
        overlayRectMeshObj.traverse(function ( child ) {
            if ( (child.type === 'Mesh') && (child.name === 'ring') ) {
                if(isDirty_general == true)
                {
                    child.visible = true;
                }
                else
                {
                    child.visible = false;
                }
            }
        });
    };
    
    // Update the the total number of images label inside the overlayRect
    updateTotalNumImagesLabel = function () {
        console.log('BEG updateTotalNumImagesLabel');

        // Remove the previous overlayRectLabel if it exists
        let overlayRectLabelPrev = this._meshObject.getObjectByName( 'spriteLabel', true );
        this._meshObject.remove( overlayRectLabelPrev );

        let selectedLayer = COL.model.getSelectedLayer();
        let scene3DtopDown = selectedLayer.getScene3DtopDown();
        let overlayRectRadius = scene3DtopDown.getOverlayRectRadius();
        
        // Create a new updated label and add it to this._meshObject
        let labelText = this.getNumImagesInOverlayRect();
        let overlayRectLabelCurr = OverlayRect.makeSpriteLabel(overlayRectRadius, labelText);
        this._meshObject.add(overlayRectLabelCurr);
        this._meshObject.material.needsUpdate = true;
        Scene3DtopDown.render1();        
    };


    // this functions checks if the overlayRect has moved since the last time it was used for split
    // if the overlayRect has moved "far enough", reset the splitCounter, and yPosition to the default value, i.e.
    // the position of the split is at the default initial location (due to splitCounter),
    // and height (due to splitCounter) relative to the overlayRect
    manageTheCaseWhereOverlayRectHasMovedSinceLastSplit = function () {
        // console.log('BEG manageTheCaseWhereOverlayRectHasMovedSinceLastSplit');
        
        let selectedLayer = COL.model.getSelectedLayer();
        let scene3DtopDown = selectedLayer.getScene3DtopDown();
        let overlayRectRadius = scene3DtopDown.getOverlayRectRadius();
        let minDistanceThresh1 = 2 * overlayRectRadius;
        
        if(COL.util.isObjectValid(this.positionAtLastSplit))
        {
            let distance = this.positionAtLastSplit.distanceTo(this._meshObject.position);
            if (distance > minDistanceThresh1)
            {
                // consider the overlayRect as "hasMoved"
                console.log('Reset the splitInfo params'); 
                this.splitInfo.splitCounter = 0;
                this.splitInfo.yPosition = 0;
                this.positionAtLastSplit.copy(this._meshObject.position);
            }
        }
    };
    
    splitOverlayRect2 = async function (layer) {
        // console.log('BEG splitOverlayRect2');
        
        // create a new overlayRect,
        // place the current image in the new overlayRect
        // remove the current image from this overlayRect
        if( (this._imagesNames.size() > 1) && COL.util.isObjectValid(this._selectedImageFilename))
        {
            this.manageTheCaseWhereOverlayRectHasMovedSinceLastSplit();
            
            let scene3DtopDown = layer.getScene3DtopDown();
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

            let isPositionWithinBoundaries = scene3DtopDown.isPositionWithinTopDownPaneBoundaries(newOverlayRectPosition);
            // console.log('isPositionWithinBoundaries', isPositionWithinBoundaries);
            
            if(isPositionWithinBoundaries)
            {
                // remove the image from the overlayRect
                // create a newOverlayRect, add the removed image, and add the newOverlayRect to the layer.

                let imagesInfo = layer.getImagesInfo();
                let imageInfo = imagesInfo.getByKey(this._selectedImageFilename);
                
                let removedImageFilename = await this.deleteImageFromOverlayRect(layer, this._selectedImageFilename);
                let doSetAsSelectedOverlayRect = false;
                let newOverlayRect = await scene3DtopDown.insertCircleMesh(newOverlayRectPosition, doSetAsSelectedOverlayRect);
                let newOverlayRectType = (typeof newOverlayRect);

                await newOverlayRect.addImageToOverlayRect(layer, imageInfo);
            }
            else
            {
                throw new Error('New position for overlayRect is outside the topDown pane boundaries - cannot split');
            }
            Scene3DtopDown.render1();
        }
        else
        {
            throw new Error('overlayRect is either invalid or has 1 image - cannot split');
        }
        
    };
    
    mergeOtherOverlayRect = async function (layer, otherOverlayRect) {
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
        await this.updateSelectedImageRelatedRenderring(layer);
        
        // update the state of isDirty_imageAddedOrRemoved
        // (if the added image is a synced image that was just removed, then nothing needs to be synced)
        this.updateFlag_isDirty_imageAddedOrRemoved();

        // tbd - set isDirty_mergedWithOverlayRect
        let overlayRectIsDirty2 = {
            isDirty_mergedWithOverlayRect: true
        };
        this.setIsDirty2(overlayRectIsDirty2);
        
    };

    getNumImagesInOverlayRect = function() {

        if(COL.util.isObjectInvalid(this._meshObject))
        {
            throw new Error('this._meshObject is invalid');
        }
        
        let imagesNames = this.getImagesNames();
        return imagesNames.size();
    };

    ///////////////////////////////////////////////////////////////////
    // Static functions
    ///////////////////////////////////////////////////////////////////
    

    // based on https://threejsfundamentals.org/threejs/lessons/threejs-billboards.html
    // create the blue square with the number on it
    static makeLabelCanvas = function (labelSize, labelText) {
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
    };
    
    static makeSpriteLabel = function (labelSize, labelText) {
        // console.log('BEG makeSpriteLabel');

        const canvas5 = OverlayRect.makeLabelCanvas(labelSize, labelText);
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
        label.name = "spriteLabel";
        label.scale.x = canvas5.width;
        label.scale.y = canvas5.height;
        label.material.map.needsUpdate = true;
        
        // setting the sprite position a bit closer to the camera so that the sprite is not hidden, see
        // https://threejs.slack.com/archives/C0AR9959Q/p1616646469112000
        label.position.set( 0, 0, 1 );
        label.updateMatrixWorld();
        
        return label;
    };

    static makeRing = function (innerRadius) {
        // console.log('BEG makeRing');
        
        var ringMaterial = new THREE_MeshPhongMaterial( {
            opacity: 0.3,
            transparent: true,
            side: THREE_DoubleSide,
            color: COL.util.redColor
            // leave name commented out so that it will be set automatically to unique indexed name, e.g. material_44
            // name: "imageFilename",
        } );

        let outerRadius = Math.round(innerRadius * 1.5);
        // let thetaSegments = 320;
        let thetaSegments = 10;
        let ringGeometry = new THREE_RingGeometry( innerRadius, outerRadius, thetaSegments );
        let ringMeshObj = new THREE_Mesh( ringGeometry, ringMaterial );

        ringMeshObj.name = 'ring';

        // the ring becomes visible when the overlayRect is not in sync with the back-end (e.g. when adding/removing an image)
        // or when moving the overlayRect to different location in the plan,
        ringMeshObj.visible = false;

        ringMeshObj.position.set( 0, 0, 0 );
        // make the ringMeshObj above overlayMeshObj so that the ringMeshObj is rendered in front of overlayMeshObj
        ringMeshObj.updateMatrixWorld();
        
        return ringMeshObj;
    }

};

OverlayRect.playImages_timeToSleepInMilliSecs = 300;

// https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
Number.prototype.mod1 = function(n) {
    return ((this%n)+n)%n;
};

export { OverlayRect };
