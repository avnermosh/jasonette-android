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
        Mesh as THREE_Mesh,
        Vector3 as THREE_Vector3,
        MeshPhongMaterial as THREE_MeshPhongMaterial, 
        DoubleSide as THREE_DoubleSide,
        FrontSide as THREE_FrontSide,
        Geometry as THREE_Geometry,
        Face3 as THREE_Face3, 
        Box3 as THREE_Box3,
        Vector2 as THREE_Vector2,
        Vector4 as THREE_Vector4,
        TextureLoader as THREE_TextureLoader,
        RGBFormat as THREE_RGBFormat,
        ClampToEdgeWrapping as THREE_ClampToEdgeWrapping,
        LinearFilter as THREE_LinearFilter,
        SpriteMaterial as THREE_SpriteMaterial,
        CanvasTexture as THREE_CanvasTexture,
        Sprite as THREE_Sprite        
       } from '../../include/three.js/three.js-r120/build/three.module.js';

import {CSS2DObject, CSS2DRenderer} from "../../include/CSS2DRenderer.js";

import { COL } from  "../COL.js";
import { Model } from "./Model.js";
import { OverlayRect } from "./OverlayRect.js";
import { ApiService } from  "./ApiService.js";
import { BlobInfo } from "./BlobInfo.js";
import { Scene3DtopDown } from "./Scene3DtopDown.js";
import { TexturePanelPlugin } from "./TexturePanelPlugin.js";
import { Note } from "./Note.js";
import { ImageInfo } from "./ImageInfo.js";
// import { Whiteboard } from "./Whiteboard.js";
import "./Core.js";
import "./FileNotes.js";
import "../util/Util.js";
import "../util/ThreejsUtil.js";

// layer a.k.a. plan a.k.a. floor
class Layer {
    constructor(layerName, planInfo){
        this.planInfo = planInfo;
        this.setLayerName(layerName);

        // _overlayMeshGroup is a threejs object that stores the contents of the overlay images:
        // - representation of the images, as dots to be overlayed in the topDown 3d pane:
        // - location, mesh of type circle
        this._overlayMeshGroup = new THREE_Object3D();
        this._overlayMeshGroup.name = "overlayRects";

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
        this._removedOverlayMeshGroup.name = "removedOverlayRects";

        // stickyNoteGroup stores the mutable overlay related meshes
        this.stickyNoteGroup = new THREE_Object3D();
        this.stickyNoteGroup.name = "stickyNotes";

        this.scene3DtopDown = undefined;
        this.texturePanelPlugin = undefined;
        
        this.noteArray = new COL.util.AssociativeArray();

        // accumulated list of all the metaData (.json [notes]) files , as they are added 
        this._metaDataFilesInfo = new COL.util.AssociativeArray();
        
        // accumulated list of all the overlay images, as they are added 
        this._imagesInfo = new COL.util.AssociativeArray();

        // container for removed images 
        this._removedImagesInfo = new COL.util.AssociativeArray();

        // for manageMemory - the last N images (can cross multiple overlayRects) to keep in RAM
        this._lastSelectedImageFilenames = new COL.util.AssociativeArray();
        
        // The selected overlayRect (e.g. the yellow dot)
        this._selectedOverlayRect = undefined;
        this._selectedOverlayRectPrev = undefined;

        // for mergeing overlayRects
        this._selectedForMergeOverlayRects = new COL.util.AssociativeArray();
        
        // The currently loaded texture image
        this._currentTextureImage = undefined;

        // _floorPlanMeshObj stores the topDown plan related mesh
        this._floorPlanMeshObj = null;

        if(COL.doEnableWhiteboard)
        {
            this._floorPlanWhiteboard = new Whiteboard();
        }

        this._editOverlayRectFlag = false;

        this._playImagesState = Layer.PLAY_IMAGES_STATE.NONE;

        this._layerJsonFilename = this.planInfo.planFilename;
        this._floorPlanImageFilename = null;

        // indication if the layer is dirty (i.e. not synced with the layer in the back-end)
        this._isDirty2 = {
            isDirty_general: false,
            isDirty_overlayRectRemoved: false,
            isDirty_overlayRectDirty: false
        };


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
        
        // this._generalMetadata.generalInfo - generalInfo for the layer, such as
        // - this._generalMetadata.generalInfo.modelVersion - the version for the layer
        //   1.0 - load overlay from overlay.obj, overlay.mtl (obsolete)
        //   1.1 - load overlay from layer.getLayerJsonFilename()
        this._generalMetadata;
    };

    toScene3DtopDown = async function (objectLoader, scene3DtopDown_asDict) {
        // console.log('BEG toScene3DtopDown');

        let scene3DtopDown = this.getScene3DtopDown();
        await scene3DtopDown.fromJson(this, objectLoader, scene3DtopDown_asDict);
        Scene3DtopDown.render1();
    };

    toSelectedOverlayRect = async function (selectedOverlayRect_asDict) {
        //console.log('BEG toSelectedOverlayRect');

        let meshObjectUuid = selectedOverlayRect_asDict['_meshObject.uuid'];
        let meshObject =  this._overlayMeshGroup.getObjectByProperty( 'uuid', meshObjectUuid );
        // console.log('meshObjectUuid', meshObjectUuid); 
        // console.log('meshObject', meshObject); 
        
        await this.setSelectedOverlayRect(meshObject);
    };

    initializeFloorPlanWhiteboard = async function ()
    {
    };
    
    populateFloorPlanObj = async function ()
    {
        // console.log('BEG CO_ObjectLoader populateFloorPlanObj');

        let floorPlanObj = this.getFloorPlanMeshObj();

        let imagesInfo = this.getImagesInfo();
        if(COL.util.isObjectInvalid(imagesInfo))
        {
            imagesInfo = new COL.util.AssociativeArray();
        }

        // tbd - fix hardcoding
        let meshObj1 = floorPlanObj.children[0];
        
        // sanity check
        if ( (meshObj1.type !== 'Mesh') || (meshObj1.name === 'ring') || (COL.util.isObjectInvalid(meshObj1.material))) {
            throw new Error('Invalid meshObj1. Should have: type "Mesh", name !== "ring", material defined', );
        }

        //////////////////////////////////////////////////////////////////////////////
        // For meshObj1:
        // - set the material
        // - calc the bounding box
        // - add the floorPlan as imageInfo (with blobUrl) to layer
        //////////////////////////////////////////////////////////////////////////////
        
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
        if(COL.util.isObjectInvalid(imagesNames_asDict))
        {
            console.error('imagesNames_asDict is invalid'); 
        }
        
        let imagesNames_asDict_asJson_numElements = Object.keys(imagesNames_asDict).length;
        let floorPlanFilename = Object.keys(imagesNames_asDict)[0];

        this.setFloorPlanImageFilename(floorPlanFilename);

        let planInfo = this.getPlanInfo();
        let floorPlanFilenameFullPath = planInfo.siteId + '/' + planInfo.id + '/' + floorPlanFilename;
        let blobInfo = new BlobInfo({filenameFullPath: floorPlanFilenameFullPath, blobUrl: undefined, isDirty: true});
        let imageInfo = new ImageInfo({filename: floorPlanFilename, blobInfo: blobInfo});

        //////////////////////////////////////////////////////////////////////////////
        // add the floorPlan as imageInfo, with blobUrl, to layer in steps:
        // - first with blobUrl set to undefined (needed for getting the blobUrl)
        // - then get the blobUrl
        // - then add the blobUrl to imageInfo
        //////////////////////////////////////////////////////////////////////////////

        imagesInfo.set(floorPlanFilename, imageInfo);
        this.setImagesInfo(imagesInfo);
        
        let blobUrl = await this.getImageBlobUrl(floorPlanFilename);
        blobInfo = new BlobInfo({filenameFullPath: floorPlanFilename, blobUrl: blobUrl, isDirty: true});
        imageInfo.blobInfo = blobInfo;

        // based on https://discourse.threejs.org/t/updating-material-map/2381
        // meshObj1.material.map = new THREE_ImageUtils.loadTexture( blobUrl );
        //     mtlLoader.setMaterialOptions( {side: THREE_DoubleSide, needsUpdate: true} );
        await this.loadTopDownTextureFromFile(blobUrl);

        // need to add floorPlanFilename to imagesInfo, so that it
        // gets saved to the backend e.g. when syncing from zip file to the webserver
        imagesInfo.set(floorPlanFilename, imageInfo);

        this.setImagesInfo(imagesInfo);

        // return imagesInfo;
    };
    
    populateOverlayRects = function (overlayMeshGroup)
    {
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
                if(COL.util.isObjectValid(imagesNames_asDict))
                {
                    for (let filename in imagesNames_asDict) {
                        imagesNames.set(filename, true);
                    }
                }
                else
                {
                    console.error('imagesInfo is invalid for overlayRect');
                }

                child.material.userData['imagesNames'] = imagesNames;
                
                let overlayRect = new OverlayRect(child);

                _this._overlayRects.set(child.name, overlayRect);

                // userData['imagesNames'] has 2 forms:
                // - as a string (when it is read and written to e.g. layer.json file)
                // - as associativeArray class when it's fed to overlayRect
            }
        });

        this.setOverlayMeshGroup(overlayMeshGroup);
    };
    
    toImagesInfo = function (imagesInfo_asDict) {
        // console.log('BEG toImagesInfo'); 

        let imagesInfo_forLayer = new COL.util.AssociativeArray();
        
        let imagesInfo_asDict_numElements = Object.keys(imagesInfo_asDict).length;
        for (let filename in imagesInfo_asDict) {
            let imageInfo_asDict = imagesInfo_asDict[filename];
            // console.log('imageInfo_asDict', imageInfo_asDict);
            
            let blobUrl = COL.util.getNestedObject(imageInfo_asDict, ['blobInfo', 'blobUrl']);
            if(COL.util.isObjectValid(blobUrl))
            {
                // when using the json file, the blobUrl does not really exist, and has to be reloaded from the zip file.
                // So remove the blobUrl (otherwise, the program thinks that the file is loaded in memory, which is not the case)
                imageInfo_asDict.blobInfo.blobUrl = null;
            }

            let blobInfo_asDict = imageInfo_asDict.blobInfo;

            let blobInfo = null;
            if(COL.util.isObjectValid(blobInfo_asDict))
            {
                blobInfo = new BlobInfo({filenameFullPath: blobInfo_asDict.filename,
                                         blobUrl: blobInfo_asDict.fileUrl,
                                         isDirty: blobInfo_asDict.isDirty});
            }
            else
            {
                blobInfo = new BlobInfo({filenameFullPath: filename,
                                         blobUrl: undefined,
                                         isDirty: true});
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
        
    };


    addStickyNote = function () {
        console.log('BEG addStickyNote');

        let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
        if(selectedImageFilename) {
            let index = this.noteArray.size();
            let noteNumber = Number(index);
            let noteId = "note" + noteNumber;
            let dataStr = "{\"ops\":[{\"insert\":\"My Note\"},{\"attributes\":{\"header\":1},\"insert\":\"\\n\"}]}";

            let noteData = dataStr;
            let noteStyle = {
                top: 0,
                left: 0
            };
            let imageFilename = selectedImageFilename;
            let texturePlugin = this.getTexturePanelPlugin()
            var texScene = texturePlugin.getTexScene();
            var texCamera = texturePlugin.getTexCamera();
            var texLabelRenderer = texturePlugin.getTexLabelRenderer();

            let newNote = new Note(noteId,
                                   noteData,
                                   noteStyle,
                                   imageFilename,
                                   index,
                                   this,
                                   texLabelRenderer,
                                   texScene,
                                   texCamera);

            this.noteArray.set(noteId, newNote);
        }
    };

    initLayer = function () {
        // console.log('BEG initLayer');

        this.scene3DtopDown = new Scene3DtopDown();
        this.scene3DtopDown.initScene3DtopDown();

        if(COL.doEnableWhiteboard)
        {
            this.initializeFloorPlanWhiteboard();
        }
        
        // add the _removedOverlayMeshGroup to the scene
        this.scene3DtopDown.addToScene(this._removedOverlayMeshGroup);
        
        this.texturePanelPlugin = new TexturePanelPlugin();
        this.texturePanelPlugin.initTexturePanelPlugin();
    };

    getIsMilestoneDatesFilterEnabled = function () {
        return this._isMilestoneDatesFilterEnabled;
    };

    setIsMilestoneDatesFilterEnabled = function (isMilestoneDatesEnabled) {
        this._isMilestoneDatesFilterEnabled = isMilestoneDatesEnabled;
    };

    getOverlayMeshGroup = function () {
        return this._overlayMeshGroup;
    };

    setOverlayMeshGroup = function (overlayMeshGroup) {
        this._overlayMeshGroup = overlayMeshGroup;
    };

    getOverlayRectByName = function (overlayRectName) {
        let overlayRect = this._overlayRects.getByKey(overlayRectName);
        return overlayRect;
    };

    updateOverlayRectScale = function (overlayRectScale) {
        // console.log('BEG updateOverlayRectScale');
        
        // update the scale for future overlayRects
        this.scene3DtopDown.setOverlayRectScale(overlayRectScale);

        // update the scale for existing overlayRects
        this._overlayMeshGroup.traverse(function ( child ) {
            if ( (child.type === 'Mesh') && (child.name !== 'ring') ) {
                child.scale.set(overlayRectScale, overlayRectScale, overlayRectScale);
            }
        });
        Scene3DtopDown.render1();
    };
    
    /////////////////////////////////////////////////////////////////
    // Create an overlay mesh object and add it to overlayMeshGroup
    // Return the newly-created overlay mesh object from the overlayMeshGroup
    /////////////////////////////////////////////////////////////////

    addToOverlayMeshGroup = function (otherOverlayMesh) {
        console.log('BEG addToOverlayMeshGroup'); 
        
        // setting the opacity, transparent, and side attributes so that the sprite is not hidden, see
        // https://threejs.slack.com/archives/C0AR9959Q/p1616646469112000
        let material = new THREE_MeshBasicMaterial({
            transparent: true,
        });
        material.color.set(COL.util.acquaColor);
        material.userData = otherOverlayMesh.material.userData;

        material.opacity = 0.91;
        material.side = THREE_DoubleSide;
        
        let overlayRectRadius = this.scene3DtopDown.getOverlayRectRadius();
        let geometry = new THREE_CircleGeometry( overlayRectRadius, Scene3DtopDown.numSegments );

        let overlayMeshObj = new THREE_Mesh( geometry, material );
        // Update rotation angles, so that the circle can be seen from above
        overlayMeshObj.rotation.x = -Math.PI/2;
        overlayMeshObj.name = otherOverlayMesh.name;
        overlayMeshObj.visible = true;
        // copy the position onto overlayMeshObj
        overlayMeshObj.position.copy(otherOverlayMesh.position);
        overlayMeshObj.scale.copy(otherOverlayMesh.scale);
        
        // after adding overlayMeshObj to overlayMeshGroup, we need to call "updateMatrixWorld()".
        // for _raycaster3DtopDown.intersectObjects() to intersect with the new object.
        overlayMeshObj.updateMatrixWorld();

        ////////////////////////////////////////////
        // create label with the number of images
        ////////////////////////////////////////////

        let overlayRect = new OverlayRect(overlayMeshObj);
        overlayMeshObj = overlayRect.getMeshObject();
        
        let numImagesInOverlayRect = overlayRect.getNumImagesInOverlayRect();
        let labelText = numImagesInOverlayRect;
        let overlayRectLabel = OverlayRect.makeSpriteLabel(overlayRectRadius, labelText);
        overlayMeshObj.add(overlayRectLabel);

        if(COL.doUseRing)
        {
            let overlayRectRing = OverlayRect.makeRing(overlayRectRadius);
            overlayMeshObj.add(overlayRectRing);
        }
        this._overlayMeshGroup.add(overlayMeshObj);

        // sanity check - check that every OverlayRect._imageName has a counter-part in Layer._imagesInfo
        let imageNames = overlayRect.getImagesNames();
        console.log('imageNames', imageNames);
        
        let iter = imageNames.iterator();
        while (iter.hasNext()) {
            let imageName = iter.nextKey();
            let imageInfo = this._imagesInfo.getByKey(imageName);
            if(COL.util.isObjectInvalid(imageInfo))
            {
                let msgStr = "imageName: " + imageName + " does not have a corresponding imageInfo";
                console.error(msgStr);
            }
        }
        
        this._overlayRects.set(overlayMeshObj.name, overlayRect);

        return overlayMeshObj;
    };

    /////////////////////////////////////////////////////////////////
    // Remove the overlay mesh object from overlayMeshGroup
    /////////////////////////////////////////////////////////////////

    removeFromOverlayMeshGroup = function (overlayMeshObj) {
        // console.log('BEG removeFromOverlayMeshGroup');
        
        if(COL.util.isObjectInvalid(overlayMeshObj))
        {
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
    };
    
    getLayerName = function () {
        return this.name;
    };

    setLayerName = function (layerName) {
        // console.log('BEG setLayerName(layerName)'); 

        // sanity check
        if(layerName != Layer.CreateLayerName(this.planInfo))
        {
            throw new Error('layerName does not match the expected name');
        }
        this.name = layerName;
    };

    setLayerName = function () {
        // console.log('BEG setLayerName'); 

        if(COL.util.isObjectInvalid(this.planInfo))
        {
            throw new Error('this.planInfo is invalid');
        }
        
        this.name = Layer.CreateLayerName(this.planInfo);
    };

    getScene3DtopDown = function () {
        // tbd - maybe fix the logic, so that getScene3DtopDown() is only called when this.scene3DtopDown is valid
        //   and re-introduce the throw...
        //
        // if(COL.util.isObjectInvalid(this.scene3DtopDown))
        // {
        //     // Support the case where after loading from zip file, the layer's scene3DtopDown may not be ready temporarily.
        //     // - in Layer::getScene3DtopDown(), if scene3DtopDown is not set yet, return null instead of throwing.

        //     // throw new Error('this.scene3DtopDown is invalid');
        //     return null;
        // }
        return this.scene3DtopDown;
    };

    getTexturePanelPlugin = function () {
        return this.texturePanelPlugin;
    };
    
    getNoteArray = function () {
        return this.noteArray;
    };
    
    setNoteArray = function (noteArray) {
        this.noteArray = noteArray;
    };

    getPlanInfo = function () {
        return this.planInfo;
    };
    
    setPlanInfo = function (planInfo) {
        this.planInfo = planInfo;
    };

    getStickyNoteGroup = function () {
        return this.stickyNoteGroup;
    };

    addToStickyNoteGroup = function (css2DObject) {
        this.stickyNoteGroup.add( css2DObject );
    };

    getSelectedOverlayRect = function () {
        return this._selectedOverlayRect;
    };

    getCurrentTextureImage = function () {
        // console.log('BEG getCurrentTextureImage');
        
        return this._currentTextureImage;
    };

    setCurrentTextureImage = function (textureImage) {
        // console.log('BEG setCurrentTextureImage');
        
        this._currentTextureImage = textureImage;
    };

    isSelectedOverlayRect = function (overlayRect) {
        return (overlayRect == this._selectedOverlayRect);
    };

    getSelectedForMergeOverlayRects = function () {
        return this._selectedForMergeOverlayRects;
    };

    setSelectedForMergeOverlayRects = async function (otherOverlayRect) {
        // console.log('BEG setSelectedForMergeOverlayRects'); 

        let otherOverlayMeshObj = otherOverlayRect.getMeshObject();
        let otherOverlayMeshObjName = otherOverlayMeshObj.name;
        this._selectedForMergeOverlayRects.set(otherOverlayMeshObjName, otherOverlayRect);
    };
    
    ///////////////////////////////////////////////////////////////
    // Sets the selectedOverlayRect (yellow image dot), and selectedOverlayRectPrev
    ///////////////////////////////////////////////////////////////

    setSelectedOverlayRect = async function (otherMeshObject) {
        // console.log('BEG setSelectedOverlayRect'); 

        // let imageInfo2 = ImageInfo.getSelectedImageInfo();
        // if( COL.util.isObjectValid(imageInfo2) )
        // {
        //     console.log('imageInfo222222222222 before setting new selectedOverlayRect'); 
        //     imageInfo2.printCameraInfo();
        // }

        let meshObject = undefined;
        if( COL.util.isObjectValid(this._selectedOverlayRect) )
        {
            meshObject = this._selectedOverlayRect.getMeshObject();
        }

        ///////////////////////////////////////////////////////////////
        // Set selectedOverlayRectPrev
        ///////////////////////////////////////////////////////////////
        
        if( COL.util.isObjectValid(otherMeshObject) &&
            COL.util.isObjectValid(meshObject) &&
            (otherMeshObject != meshObject) )
        {
            // There is another mesh and, there is a current mesh,
            // and the other mesh is different from the exising mesh 
            this.setSelectedOverlayRectPrev(this._selectedOverlayRect);
        }
        else if(COL.util.isObjectInvalid(otherMeshObject) &&
                COL.util.isObjectValid(meshObject))
        {
            // There is NO other mesh and there is a current mesh
            this.setSelectedOverlayRectPrev(this._selectedOverlayRect);
        }

        ///////////////////////////////////////////////////////////////
        // Before setting the selectedOverlayRect, which changes the selected image
        // persist the imageInfo (e.g. camerainfo) of the last selected image,
        // so that if we revisit this image, we will get the same view setting
        // of the image (e.g. zoom)
        ///////////////////////////////////////////////////////////////

        this.saveSelectedImageCameraInfo();
        
        ///////////////////////////////////////////////////////////////
        // Set selectedOverlayRect
        ///////////////////////////////////////////////////////////////

        // Fill _selectedOverlayRect (using otherMeshObject) from entry in _overlayRects
        // (with _overlayRects states, e.g. last revisited image index in this overlaRect)

        if(COL.util.isObjectValid(otherMeshObject))
        {
            // otherMeshObject is defined. Set this._selectedOverlayRect
            // from an entry in this._overlayRects that has the same name as otherMeshObject.name
            
            // console.log('otherMeshObject.name', otherMeshObject.name);
            this._selectedOverlayRect = this._overlayRects.getByKey(otherMeshObject.name);
            if(COL.util.isObjectInvalid(this._selectedOverlayRect))
            {
                // sanity check
                console.error('otherMeshObject.name', otherMeshObject.name); 
                throw new Error('this._selectedOverlayRect is invalid. (it is set from a mesh object that is not in the list of this._overlayRects)');
            }

            if(COL.doWorkOnline)
            {
                let sceneBar = COL.model.getSceneBar();
                let isMergeButtonOn = sceneBar._mergeOverlayRectsButton.isOn();
                if( isMergeButtonOn )
                {
                    // the button is turned on - add the overlayRect to the list of selectedForMergeOverlayRects
                    //
                    // tbd - remove the await ??
                    await this.setSelectedForMergeOverlayRects(this._selectedOverlayRect);
                }
            }

            let selectedOverlayRectName = this._selectedOverlayRect.getMeshObject().name;
            let selectedForMergeOverlayRect = this._selectedForMergeOverlayRects.getByKey(selectedOverlayRectName);
            if(COL.util.isObjectValid(selectedForMergeOverlayRect))
            {
                // the _selectedOverlayRect is in the merge list. Indicate it by setting its color to yellow2
                this._selectedOverlayRect.getMeshObject().material.color.setHex( COL.util.yellow2 );
            }
            else
            {
                // the _selectedOverlayRect is NOT in the merge list. Indicate it by setting its color to yellow1
                this._selectedOverlayRect.getMeshObject().material.color.setHex( COL.util.yellow1 );
            }
            
        }
        else
        {
            // can get here if e.g. clicking in non-overlayRect area
            this._selectedOverlayRect = undefined;
        }
        
        // update things related to the image
        // - clear the texture
        // - set image info string to NA
        // - set imageNumOutOfTotalImages to NA
        await this.updateLayerImageRelatedRenderring();
    };

    saveSelectedImageCameraInfo = function () {
        // console.log('BEG saveSelectedImageCameraInfo'); 

        let imageInfo = ImageInfo.getSelectedImageInfo(this);
        if( COL.util.isObjectValid(imageInfo) )
        {
            /////////////////////////////////////////////////////////////////
            // A previous selectedImage exists
            // persist its imageInfo (e.g. camerainfo), so that if we revisit
            // this image, we will get the same view setting of the image (e.g. zoom)
            /////////////////////////////////////////////////////////////////

            let texturePlugin = this.getTexturePanelPlugin();
            imageInfo.setCameraInfo(texturePlugin.getTexControls(), texturePlugin.getRotationVal(), texturePlugin.getFlipY());
        }
    };
    
    getSelectedOverlayRectPrev = function () {
        return this._selectedOverlayRectPrev;
    };

    setSelectedOverlayRectPrev = function (otherOverlayRect) {
        // console.log('BEG setSelectedOverlayRectPrev');

        if(COL.util.isObjectInvalid(otherOverlayRect)) {
            // sanity check.
            throw new Error('otherOverlayRect is invalid');
        }

        // Set the overlayRect color
        // - if the overlayRect is in _selectedForMergeOverlayRects - set the color to Orange variation
        //   -- set the color to Orange1 - if it is the first merge element which all other elements are merged into
        //   -- set the color to Orange2 - if it is NOT the first merge element
        // - if the overlayRect is NOT in _selectedForMergeOverlayRects - set the color to acquaColor
        let otherOverlayRectName = otherOverlayRect.getMeshObject().name;
        let selectedForMergeOverlayRect = this._selectedForMergeOverlayRects.getByKey(otherOverlayRectName);
        if(COL.util.isObjectValid(selectedForMergeOverlayRect))
        {
            if(otherOverlayRectName === this._selectedForMergeOverlayRects.getFirstKey())
            {
                // the otherOverlayRect to-be-set-to selectedOverlayRectPrev the first overlayRect in the merge list.
                // Indicate it by setting its color to Orange1
                otherOverlayRect.getMeshObject().material.color.setHex( COL.util.Orange1 );
            }
            else
            {
                // the otherOverlayRect to-be-set-to selectedOverlayRectPrev in the merge list, but not the first overlayRect.
                // Indicate it by setting its color to Orange2
                otherOverlayRect.getMeshObject().material.color.setHex( COL.util.Orange2 );
            }
        }
        else
        {
            // the otherOverlayRect to-be-set-to selectedOverlayRectPrev is NOT in the merge list. Indicate it by setting its color to acquaColor
            otherOverlayRect.getMeshObject().material.color.setHex( COL.util.acquaColor );
        }
        
        this._selectedOverlayRectPrev = otherOverlayRect;
    };
    
    getImagesInfo = function () {
        return this._imagesInfo;
    };

    setImagesInfo = function (imagesInfo) {
        this._imagesInfo = imagesInfo;
    };

    getRemovedImagesInfo = function () {
        return this._removedImagesInfo;
    };
    
    setRemovedImagesInfo = function (removedImagesInfo) {
        this._removedImagesInfo = removedImagesInfo;
    };
    
    getMetaDataFilesInfo = function () {
        return this._metaDataFilesInfo;
    };

    setMetaDataFilesInfo = function (metaDataFilesInfo) {
        this._metaDataFilesInfo = metaDataFilesInfo;
    };
    
    getEditOverlayRectFlag = function () {
        return this._editOverlayRectFlag;
    };

    setEditOverlayRectFlag = function (editOverlayRectFlag) {
        this._editOverlayRectFlag = editOverlayRectFlag;
        this.scene3DtopDown.enableEditTopDownOverlayControl(this._editOverlayRectFlag);
    };

    getPlayImagesState = function () {
        return this._playImagesState;
    };

    setPlayImagesState = function(playImagesState) {
        this._playImagesState = playImagesState;
    };

    getGeneralMetadata = function () {
        return this._generalMetadata;
    };

    setGeneralMetadata = function (generalMetadata) {
        this._generalMetadata = generalMetadata;
        // // tbd - removeme
        // this._generalMetadata.generalInfo.modelVersion = 1.0;
    };

    getLayerJsonFilename = function () {
        return this._layerJsonFilename;
    };

    setLayerJsonFilename = function (layerJsonFilename) {
        this._layerJsonFilename = layerJsonFilename;
    };

    getFloorPlanMeshObj = function () {
        return this._floorPlanMeshObj;
    };

    setFloorPlanMeshObj = function (floorPlanMeshObj) {
        this._floorPlanMeshObj = floorPlanMeshObj;
    };

    getFloorPlanImageFilename = function () {
        return this._floorPlanImageFilename;
    };

    setFloorPlanImageFilename = function (floorPlanImageFilename) {
        this._floorPlanImageFilename = floorPlanImageFilename;
    };
    
    getFloorPlanWhiteboard = function () {
        if(COL.doEnableWhiteboard)
        {
            // sanity check - should not get here
            throw new Error('getFloorPlanWhiteboard called while doEnableWhiteboard === false');
        }
        return this._floorPlanWhiteboard;
    };

    setFloorPlanWhiteboard = function (floorPlanWhiteboard) {
        if(COL.doEnableWhiteboard)
        {
            // sanity check - should not get here
            throw new Error('getFloorPlanWhiteboard called while doEnableWhiteboard === false');
        }
        this._floorPlanWhiteboard = floorPlanWhiteboard;
    };

    loadNextOrPreviousImage = async function (doLoadNextImage) {
        // console.log('BEG loadNextOrPreviousImage'); 
        if(COL.util.isObjectValid(this._selectedOverlayRect))
        {
            await this._selectedOverlayRect.nextOrPrevSelectedImage(this, doLoadNextImage);
        }
    };
    
    playImagesInSelectedOverlayRect = async function () {
        // console.log('BEG playImagesInSelectedOverlayRect');

        let playImagesState = this.getPlayImagesState();
        if(this.getPlayImagesState() !== Layer.PLAY_IMAGES_STATE.NONE)
        {
            let numLoops = 1;
            for (let loopIndex = 0; loopIndex < numLoops; loopIndex++) {
                // console.log('Doing loop', loopIndex, 'of', numLoops);

                if(COL.util.isObjectInvalid(this._selectedOverlayRect))
                {
                    throw new Error('Invalid _selectedOverlayRect');
                }

                await this._selectedOverlayRect.playImages(this);
            }
        }
    };

    playImagesInAllOverlayRects = async function () {
        // console.log('BEG playImagesInAllOverlayRects');

        if(this.getPlayImagesState() !== Layer.PLAY_IMAGES_STATE.NONE)
        {
            // let numLoops = 3;
            let numLoops = 1;
            for (let loopIndex = 0; loopIndex < numLoops; loopIndex++) {
                // console.log('Doing loop', loopIndex, 'of', numLoops);
                
                let iter = this._overlayRects.iterator();
                while (iter.hasNext()) {

                    let overlayRect1 = iter.next();
                    await this.setSelectedOverlayRect(overlayRect1.getMeshObject());
                    if(this.getPlayImagesState() == Layer.PLAY_IMAGES_STATE.NONE)
                    {
                        // stop the play
                        console.log('stop the play'); 
                        break;
                    }
                    await this.playImagesInSelectedOverlayRect();
                }
                if(this.getPlayImagesState() == Layer.PLAY_IMAGES_STATE.NONE)
                {
                    // stop the play
                    console.log('stop the play'); 
                    break;
                }
            }
        }
    };
    
    // Returns blobUrl for image specified with imageFilename.
    // 
    // Return the blobUrl:
    // 1. from memory, if it exists, or
    // 2. if using webserver, from webserver image blob, or
    // 3. if using zip file, from zip file image blob, or
    // 4. fail
    getImageBlobUrl = async function (imageFilename) {
        // console.log('BEG getImageBlobUrl');
        
        let imageInfo = this._imagesInfo.getByKey(imageFilename);
        let blobInfo = imageInfo.blobInfo;
        
        // if(imageFilename === "image8.jpg")
        // {
        //     ImageInfo.PrintImagesInfo(this._imagesInfo);
        // }
        
        let blobUrl = undefined;
        if(COL.util.isObjectValid(blobInfo))
        {        
            if(COL.util.isObjectValid(COL.util.getNestedObject(blobInfo, ['blobUrl'])))
            {        
                // the blobUrl exists in memory - get the blobUrl from memory 
                blobUrl = blobInfo.blobUrl;
            }
            else if(ApiService.LOAD_FROM_TYPE == ApiService.API_SERVICE_TYPES.APIServiceMultiFile) {
                // get the blobUrl from webserver image blob 

                // e.g. https://localhost/avner/img/45/56/image_0.jpg
                let url = COL.model.getUrlBase() + COL.model.getUrlImagePathBase() +
                    '/' + this.planInfo.siteId + '/' +
                    this.planInfo.id + '/' + imageFilename;

                blobUrl = await this.getImageBlobUrlFromWebServer(url);
            }
            else if(ApiService.LOAD_FROM_TYPE == ApiService.API_SERVICE_TYPES.ApiServiceZip) {
                // get the blobUrl from zip file image blob 
                let imageFilenameFullPath = blobInfo.filenameFullPath;
                blobUrl = await COL.model.fileZip.getImageBlobUrlFromZipFile(imageFilenameFullPath, this._imagesInfo);
            }
            else {
                let msgStr = 'Cannot get image blobUrl for image file: ' + imageFilename;
                throw new Error(msgStr);
            }
        }
        else
        {
            // ImageInfo.PrintImagesInfo(this._imagesInfo);
            console.log('foo3');
            
            let msgStr = 'Cannot get image blobUrl for image file: ' + imageFilename;
            throw new Error(msgStr);
        }

        return blobUrl;
    };

    getImageBlobUrlFromWebServer = async function(url){
        // The url is without /api/v1_2
        // so this causes a simple fetch (GET) via the browser 
        // and does NOT work through the backend api (i.e. python flask)
        
        // e.g. https://localhost/avner/img/45/56/IMG_6626.jpg
        let response = await fetch(url);
        await COL.errorHandlingUtil.handleErrors(response);
        
        let blob = await response.blob()
        let blobUrl = URL.createObjectURL(blob);
        return blobUrl;
    };
    
    // keep only up to N images, to cache the last images and avoid out-of-memory error
    manageMemory = function () {
        // console.log('BEG manageMemory'); 

        if(COL.util.isObjectInvalid(this._selectedOverlayRect))
        {
            throw new Error('Invalid _selectedOverlayRect');
        }

        // Remove selectedImageFilename from the associative array and set it again.
        // this causes selectedImageFilename to be appended to the end, i.e. indicate as "touched last"
        // - if removedVal is defined, selectedImageFilename was in the array so it will change position in the array to last position
        // - if removedVal is undefined, selectedImageFilename was NOT in the array so it will be added with position set to last position
        let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
        let removedVal = this._lastSelectedImageFilenames.remove(selectedImageFilename);
        // "true" is an arbitrary value (we are not interested in the values, just in the keys (associative and by order))

        // console.log('add image:', selectedImageFilename, 'to this._lastSelectedImageFilenames' );
        
        this._lastSelectedImageFilenames.set(selectedImageFilename, true);
        
        // console.log('this._lastSelectedImageFilenames.size() before removing excess images: ', this._lastSelectedImageFilenames.size());
        // console.log('Layer.maxNumImageBlobsInMeomry', Layer.maxNumImageBlobsInMeomry);
        
        if(this._lastSelectedImageFilenames.size() > Layer.maxNumImageBlobsInMeomry)
        {
            // Remove the first element in the array (fifo) i.e. remove the image that was selected most ancient  
            var keyVal = this._lastSelectedImageFilenames.shift();

            // console.log('this._lastSelectedImageFilenames.size() after removing excess images: ', this._lastSelectedImageFilenames.size());
            // console.log('this._imagesInfo.size()', this._imagesInfo.size());
            
            if(keyVal)
            {
                let mostAncientImageFilename = keyVal['key'];
                let val = keyVal['val'];
                // console.log('val', val);

                // console.log('mostAncientImageFilename', mostAncientImageFilename); 
                // console.log('removed image:', mostAncientImageFilename, 'from this._lastSelectedImageFilenames' );
                let imageInfoPrev = this._imagesInfo.getByKey(mostAncientImageFilename);
                // console.log('imageInfoPrev', imageInfoPrev); 
                let blobInfoPrev = imageInfoPrev.blobInfo;
                
                // release the previous image
                if(COL.util.isObjectValid(blobInfoPrev) && COL.util.isObjectValid(blobInfoPrev.blobUrl)) {
                    // console.log('revokeObjectURL for blobInfoPrev.blobUrl');
                    URL.revokeObjectURL(blobInfoPrev.blobUrl);
                    blobInfoPrev.blobUrl = null;
                }

                // sanity check - verify that every blobInfo.blobUrl is valid for all entries of _imagesInfo
                {
                    let numImagesWithBlobUrls = 0;
                    let iter = this._imagesInfo.iterator();
                    while (iter.hasNext()) {
                        let imageInfo1 = iter.next();
                        let blobInfo1 = imageInfo1.blobInfo;

                        // tbd FixME: not every entry in _imagesInfo has a valid blobInfo
                        //  for images that have not been clicked, blobInfo is invalid
                        if(COL.util.isObjectValid(blobInfo1))
                        {
                            // console.log('blobInfo1', blobInfo1);
                            
                            if(blobInfo1.filename != "")
                            {
                                // tbd - double check that mandatory images (e.g. the floor plan) are never deleted
                                //       maybe this is not a problem because the floor plan is not in the list of images that can be removed ???)
                                // let re2 = /^image.*\.jpg$/;
                                // let overlayRectImageRegexMatched = blobInfo1.filename.match(re2);
                                // if(overlayRectImageRegexMatched && COL.util.isStringValid(blobInfo1.blobUrl))
                                if(COL.util.isStringValid(blobInfo1.blobUrl))
                                {
                                    numImagesWithBlobUrls += 1;
                                    
                                    // console.log('blobInfo', blobInfo);
                                    // console.log('blobInfoPrev', blobInfoPrev); 
                                    // console.log('blobInfo1', blobInfo1);
                                    // console.log('blobInfo1.blobUrl is NOT null'); 
                                }
                            }
                        }
                    }
                    if(numImagesWithBlobUrls > Layer.maxNumImageBlobsInMeomry)
                    {
                        console.log('numImagesWithBlobUrls', numImagesWithBlobUrls);
                        console.log('More than expected images');
                    }
                }
            }
        }
    };
    
    loadTheSelectedImageAndRender = async function () {
        // console.log('BEG loadTheSelectedImageAndRender');
        
        if(COL.util.isObjectInvalid(this._selectedOverlayRect))
        {
            throw new Error('Invalid _selectedOverlayRect');
        }

        let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
        if(COL.util.isStringInvalid(selectedImageFilename)) {
            // sanity check. Shouldn't reach here
            throw new Error('selectedImageFilename is invalid');
        }

        let imageInfo = this._imagesInfo.getByKey(selectedImageFilename);

        if(COL.util.isObjectInvalid(imageInfo)) {
            // sanity check. Shouldn't reach here.
            this._imagesInfo.printKeysAndValues();
            throw new Error('imageInfo is invalid');
        }

        // sanity check
        if( selectedImageFilename !== imageInfo.filename) {
            console.error('selectedImageFilename', selectedImageFilename); 
            console.error('imageInfo.filename', imageInfo.filename);
            throw new Error('Reached failure condition: "selectedImageFilename !== imageInfo.filename"');
        }

        
        // keep last N images, and release all other images
        let doKeepN_images = true;
        // doKeepN_images = false;
        if(doKeepN_images)
        {
            this.manageMemory();
        }
        else
        {
            console.warn('manageMemory is disabled')
        }

        // Get the image blobUrl from memory, or from webserver, or from zip file
        let blobUrl = await this.getImageBlobUrl(selectedImageFilename);

        ///////////////////////////////////////////////
        // Update _imagesInfo if needed
        ///////////////////////////////////////////////

        if(COL.util.isObjectInvalid(imageInfo.imageTags))
        {
            let fileType = COL.util.getFileTypeFromFilename(imageInfo.filename);
            
            let imageTags = {};
            if(fileType === 'jpg')
            {
                // load imageTags from the image. This will update the imageTags for the image in _imagesInfo
                
                // get the blob from the blobUrl
                let response = await fetch(blobUrl);
                await COL.errorHandlingUtil.handleErrors(response);
                let blob = await response.blob();
                imageTags = await COL.core.ImageFile.getImageTags(imageInfo.filename, blob);
            }
            else
            {
                imageTags.filename = imageInfo.filename;
                imageTags.imageOrientation = -1;
            }
            imageInfo.imageTags = imageTags;
        }
        
        if(COL.util.isObjectInvalid(imageInfo.blobInfo)) {
            // the blob is not in memory. Get it from the webServer, and since we are only displaying it set isDirty=false
            let blobInfo = new BlobInfo({filenameFullPath: selectedImageFilename, blobUrl: blobUrl, isDirty: false});
            imageInfo.blobInfo = blobInfo;
        }
        else {
            // the blob is in memory. It may be a new blob with a isDirty=true (or a preloaded blob from the webServer with isDirty=true)
            // so leave isDirty as is
            imageInfo.blobInfo.blobUrl = blobUrl;
        }

        // imageInfo.printImageInfo();

        this._imagesInfo.set(selectedImageFilename, imageInfo);
        
        await this.loadOverlayTextureFromFile(blobUrl);

        return true;
    };

    clearRenderingOfSelectedImage = function () {
        // console.log('BEG clearRenderingOfSelectedImage');
        
        this.texturePanelPlugin.hideWidgets();
    };

    getSelectedImageTextInfo = function () {
        let textInfoStr = "NA";
        if(COL.util.isObjectValid(this._selectedOverlayRect))
        {
            let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
            let imageInfoVec = this.getImagesInfo();
            let imageInfo = imageInfoVec.getByKey(selectedImageFilename);

            if(COL.util.isObjectValid(imageInfo))
            {
                /////////////////////////////////
                // Set the imageInfo string
                /////////////////////////////////
                
                let imageInfoStr = imageInfo.imageTagsToString();
                this._selectedOverlayRect.setSelectedImageInfoStr(imageInfoStr);
                
                textInfoStr = this._selectedOverlayRect.getSelectedImageInfoStr(this);
            }
        }
        return textInfoStr;
    };
    
    updateLayerImageRelatedRenderring = async function () {
        // console.log('BEG updateLayerImageRelatedRenderring');
        
        // console.trace();
        
        try
        {
            if( COL.util.isObjectValid(this._selectedOverlayRect) )
            {
                //////////////////////////////////////////////////////////////////
                // Display the image and related buttons/labels
                //////////////////////////////////////////////////////////////////
                
                // let selectedImageFilename = this._selectedOverlayRect.getSelectedImageFilename();
                // let msgStr1 = "Display image: " + selectedImageFilename + " and related buttons/labels";
                // console.log(msgStr1);
                
                await this._selectedOverlayRect.updateSelectedImageRelatedRenderring(this);
            }
            else
            {
                //////////////////////////////////////////////////////////////////
                // Clear image display and related buttons/labels
                //////////////////////////////////////////////////////////////////

                // update the current texture image info, to the one that is displayed
                this.setCurrentTextureImage(undefined);
                
                // hide the texture image
                this.clearRenderingOfSelectedImage();

                // update the image related labels, e.g.
                // - "image info" string
                // - "image index out of total number of images for the overlayRect" label (e.g. 1/3)
                this.updateLayerImageRelatedLabels();

                // enable/disable viewOverlayRect related buttons (nextImageButton, previousImageButton)
                this.updatePreviousPlayNextImageButtons();

                if(COL.doWorkOnline)
                {
                    // update the overlayRectEdit buttons, e.g. disable if no image is selected
                    this.updateEditOverlayRectRelatedButtons();
                }
            }
            Scene3DtopDown.render1();
            
        }
        catch(err) {
            console.error('err', err);

            // ImageInfo.PrintImagesInfo(this._imagesInfo);
            
            // raise a toast to indicate the failure
            let toastTitleStr = "Load selected image";
            let msgStr = "Failed to load the selected image.";
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }
        }
    };

    updateLayerImageRelatedLabels = function () {
        // console.log('BEG updateLayerImageRelatedLabels'); 

        // update the image info that is displayed when toggling the "Info" button
        let textInfoStr = this.getSelectedImageTextInfo();
        COL.colJS.displayImageTextInfo(textInfoStr);

        // Update the "image index out of total number of images for the overlayRect" label (e.g. 1/3)
        this.setLabel_ImageIndexOfNumImagesInOverlayRect2();
    };

    updatePreviousPlayNextImageButtons = function () {
        // console.log('BEG updatePreviousPlayNextImageButtons'); 

        let sceneBar = COL.model.getSceneBar();

        switch( this._playImagesState )
        {
            case Layer.PLAY_IMAGES_STATE.NONE:
            {
                // enable buttons: playImagesInSelectedOverlayRectButton, _playImagesInAllOverlayRectsButton
                sceneBar._playImagesInAllOverlayRectsButton.disabled(false);

                // enable/disable the loadNextOrPreviousImage depending on if 
                // - overlayRect is selected or not
                // - the number of images in the selectedOverlayRect
                if(COL.util.isObjectValid(this._selectedOverlayRect))
                {
                    // if selected overlayRect has 2 or more images enable
                    // - playImagesInSelectedOverlayRectButton, 
                    // - nextImageButton, previousImageButton
                    // otherwise disable the buttons
                    
                    let numImagesInSelectedOverlayRect = this._selectedOverlayRect.getNumImagesInOverlayRect();
                    COL.colJS.playImagesInSelectedOverlayRectButton.disabled((numImagesInSelectedOverlayRect < 2));
                    sceneBar.disableNextAndPreviousImageButtons((numImagesInSelectedOverlayRect < 2));
                }
                else
                {
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

        
    };

    updateEditOverlayRectRelatedButtons = function () {
        console.log('BEG updateEditOverlayRectRelatedButtons');
        
        // Update the overlayRectEdit buttons, e.g. disable if no image is selected
        let sceneBar = COL.model.getSceneBar();
        if(this.getEditOverlayRectFlag()) {
            // disable/enable editOverlayRect related buttons (openImageFileButton, editOverlayRect_deleteButton)
            if(COL.util.isObjectValid(this._selectedOverlayRect))
            {
                // enable the editOverlay related buttons
                sceneBar.disableEditOverlayRectRelatedButtons(false);
            }
            else
            {
                // disable the editOverlay related buttons
                sceneBar.disableEditOverlayRectRelatedButtons(true);
            }
        }
        else
        {
            sceneBar.disableEditOverlayRectRelatedButtons(true);
        }
    };
    
    setLabel_ImageIndexOfNumImagesInOverlayRect2 = function () {
        let imageIndexOfNumImagesInOverlayRectStr = 'NA';
        if(COL.util.isObjectValid(this._selectedOverlayRect))
        {
            imageIndexOfNumImagesInOverlayRectStr = this._selectedOverlayRect.setLabel_ImageIndexOfNumImagesInOverlayRect1();
        }        
        
        let imageIndexInOverlayRectLabel = COL.colJS.getImageIndexInOverlayRectLabel();
        imageIndexInOverlayRectLabel.$.html(imageIndexOfNumImagesInOverlayRectStr);
    };

    createCircleMesh = function (intersectedStructurePoint) {
        // console.log('BEG createCircleMesh'); 

        // ///////////////////////////////////////////////////////////
        // Set up the material for the overlayRect object that is displayed in Scene3D
        // (NOT needed for Scene3DtopDown)
        // ///////////////////////////////////////////////////////////

        let scene3DtopDown = this.getScene3DtopDown();
        var userData = {imagesNames: new COL.util.AssociativeArray()};

        var meshMaterial = new THREE_MeshPhongMaterial( {
            opacity: 0.5,
            transparent: false,
            side: THREE_DoubleSide,
            // default color is white ??
            color: COL.util.redColor, 
            // leave name commented out so that it will be set automatically to unique indexed name, e.g. material_44
            // name: "imageFilename",
            userData: userData
        } );

        let overlayRectRadius = scene3DtopDown.getOverlayRectRadius();
        let geometry = new THREE_CircleGeometry( overlayRectRadius, Scene3DtopDown.numSegments );

        let overlayMeshObj = new THREE_Mesh( geometry, meshMaterial );

        overlayMeshObj.name = overlayMeshObj.id;
        overlayMeshObj.position.set(intersectedStructurePoint.x, intersectedStructurePoint.y, intersectedStructurePoint.z);
        
        var box = new THREE_Box3().setFromObject( overlayMeshObj );
        // The rectangle position is set to be the center of the bounding box
        box.getCenter( overlayMeshObj.position ); // this re-sets the position

        let scaleFactor = scene3DtopDown.getOverlayRectScale();
        overlayMeshObj.scale.set(scaleFactor, scaleFactor, scaleFactor);
        overlayMeshObj.geometry.computeBoundingBox();
        overlayMeshObj.geometry.center();
        overlayMeshObj.updateMatrixWorld();

        return overlayMeshObj;
    };
    
    addImageToLayer = async function ( overlayRect, imageInfo ) {
        // console.log('BEG addImageToLayer');
        
        if(COL.util.isObjectInvalid(overlayRect))
        {
            // sanity check
            throw new Error('overlayRect is invalid');
        }
        if(COL.util.isObjectInvalid(imageInfo))
        {
            // sanity check
            throw new Error('imageInfo is invalid');
        }

        let filename = imageInfo.filename;
        // check that the filename doesn't already exist
        // (prevent from having multiple overlayRects with the same image filename)
        let imageInfo2 = this._imagesInfo.getByKey(filename);
        if(COL.util.isObjectValid(imageInfo2))
        {
            // The layer already includes an image with the filename
            // Don't add the file and fail the operation to add images
            throw new Error('Cannot add the file: ' + filename + ', as it already exists in imagesInfo');
        }
        
        // check if the file already exists in the this._removedImagesInfo
        let removedImageInfo = this._removedImagesInfo.getByKey(filename);
        if(COL.util.isObjectValid(removedImageInfo))
        {
            // The layer already includes an image with the filename in the this._removedImagesInfo list
            // check if the removedImageInfo is dirty,
            
            if(COL.util.isObjectInvalid(removedImageInfo.blobInfo))
            {
                // sanity check
                // an image that was removed must have been loaded, so it must have a defined blobInfo
                // (invalid blobInfo can only happen if the image has not been loaded yet)
                throw new Error('image is in the removedImageInfo list with invalid blobInfo');
            }

            if(removedImageInfo.blobInfo.isDirty)
            {
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
            else
            {
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
        else
        {
            imageInfo.blobInfo.isDirty = true;
            this._imagesInfo.set(filename, imageInfo);
            await overlayRect.addImageToOverlayRect(this, imageInfo);
        }
        
    };
    
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Deletes an image from overlayRect, and possibly the overlayRect itself
    // - If the number of images in meshObject > 0, deletes the image
    // - If the number of images after possible deletion == 0, deletes the meshObject
    //////////////////////////////////////////////////////////////////////////////////////////////////

    
    deleteImageFromLayer = async function ( overlayRect, imageFilenameToRemove ) {
        console.log('BEG deleteImageFromLayer'); 

        // meshObject is stored both in overlayRect and in this._overlayMeshGroup
        // meshObject may be deleted from overlayRect
        // Therefor, get meshObject, BEFORE calling overlayRect.deleteImageFromOverlayRect
        // so that, if needed, it can also be deleted from OverlayMeshGroup

        if(COL.util.isObjectInvalid(overlayRect))
        {
            throw new Error('Invalid overlayRect for deletion');
        }
        
        let meshObject = overlayRect.getMeshObject();
        if(COL.util.isObjectInvalid(meshObject))
        {
            throw new Error('Invalid meshObject for deletion');
        }

        // Remove the selected image from _imagesInfo and
        // add the selected image to _removedImagesInfo (only if it is already synced with the back-end)
        let imageInfo = this._imagesInfo.getByKey(imageFilenameToRemove);
        if(COL.util.isObjectValid(imageInfo))
        {
            this._imagesInfo.remove(imageFilenameToRemove);

            if(COL.util.isObjectInvalid(imageInfo.blobInfo))
            {
                // sanity check
                // an image that is about to be removed must have been loaded first, so it must have a defined blobInfo
                // (invalid blobInfo can only happen if the image has not been loaded yet)
                // throw new Error('image to be removed has invalid blobInfo');

                // Ideally, we would just throw,
                // but in case of corrption, this prevents layerJsonFilename from being updated, and recovering
                // so be more lineant and just issue an error message?
                let msgStr = "image to be removed: " + imageFilenameToRemove + " has invalid blobInfo";
                console.error(msgStr); 
            }
            else if(imageInfo.blobInfo.isDirty == false)
            {
                // the image to be removed is synced with the back-end, i.e. we need to add it to the removed list)
                // tbd - and set its blobInfo.isDirty to true ???
                imageInfo.blobInfo.isDirty = true;
                this._removedImagesInfo.set(imageFilenameToRemove, imageInfo);
            }
        }

        let imagesNames = overlayRect.getImagesNames();
        
        if(COL.util.isObjectInvalid(imagesNames))
        {
            // sanity check
            throw new Error('imagesNames is invalid');
        }

        if(imagesNames.size() > 0) {
            // Remove the selected image from imagesNames
            // tbd - should/where-do we remove from layer._imagesInfo ???
            await overlayRect.deleteImageFromOverlayRect( this, imageFilenameToRemove );
        }
        else
        {
            // Before assigning new value (unsigned) to overlayRect, check if overlayRect is the selectedOverlayRect.
            let isSelectedOverlayRect = this.isSelectedOverlayRect(overlayRect);
            if(isSelectedOverlayRect)
            {
                // overlayRect is the selectedOverlayRect. Set the selectedOverlayRect to undefined
                await this.setSelectedOverlayRect( undefined );
                let scene3DtopDown = this.getScene3DtopDown();
                scene3DtopDown.clearIntersectionOverlayRectInfo();
            }

            // Remove the meshObject of the overlayRect from the meshGroup
            this.removeFromOverlayMeshGroup(meshObject);
        }
    };

    
    syncMetaDataBlobs_withWebServer_inSingleRequest = async function () {
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

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // - step1 - Loop over all the MetaDataBlobs.
        //   - For each blob if isDirty, add to the formData
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

                // tbd - check - deletion of overlayRect not always updates scene3DtopDown._scene2

                // tbd - clear overlayRects with 0 entries
                this.clearOverlayRectsWithoutImages();
                this.scanForInconsitenciesBetweenImagesInfo_and_overlayRectImagesNames();
                
                let layer_asJson_str = COL.loaders.utils.exportLayer_toJSON_str(this);
                COL.loaders.utils.addMetaDataFileInfoToMetaDataFilesInfo(metaDataFilesInfo, layer_asJson_str, layerJsonFilename);

                // Set flag isDirty to true
                // to force sync of layerJsonFilename to the webserver 
                metaDataFileInfo = metaDataFilesInfo.getByKey(filename);
                blobInfo = metaDataFileInfo.blobInfo;
                blobInfo.isDirty = true;
            }
            else if(filename === 'general_metadata.json') {
                //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Update the file "general_metadata.json" in the backend
                //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                let generalMetadata_asJson_str = JSON.stringify(this._generalMetadata);
                // console.log('generalMetadata_asJson_str', generalMetadata_asJson_str);
                let filename = 'general_metadata.json';
                COL.loaders.utils.addMetaDataFileInfoToMetaDataFilesInfo(metaDataFilesInfo, generalMetadata_asJson_str, filename);

                // Set flag isDirty to true to force sync of general_metadata.json to the webserver
                let metaDataFileInfo = metaDataFilesInfo.getByKey(filename);
                let blobInfo = metaDataFileInfo.blobInfo;
                blobInfo.isDirty = true;
                let blobUrl = blobInfo.blobUrl;
                let response = await fetch(blobUrl);
                await COL.errorHandlingUtil.handleErrors(response);
                let blob = await response.blob();
                let filePathNew = filePath + '/' + filename;
                formData.append('files', blob, filePathNew)

                // https://127.0.0.1/avner/img/223/262/IMG_20180311_104622.jpg
                //     ->
                //     168/189/IMG_20181212_142908.jpg
            }

            // Sync metaDataFilesInfo entries with isDirty===true to the webserver
            if(blobInfo.isDirty === true) {
                
                // let blobUrl = await this.getImageBlobUrl(filename);
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
                
                //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // append the blob for the current file
                // based on https://stackoverflow.com/a/50472925/5159177
                //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                formData.append('files', blob, filePathNew)
            }
        }

        if(this._generalMetadata.generalInfo.modelVersion < 1.2) {
            // Single time migration
            // after getting some milage with layerJsonFilename
            // delete .obj, .mtl files, e.g.
            // - overlay.obj,
            // - overlay.mtl,
            // - 168/188/44_decourcy_drive_pilot_bay_gabriola_island.structure.layer0.obj,
            // - 168/188/44_decourcy_drive_pilot_bay_gabriola_island.structure.layer0.mtl
            //
            // tbd - migrateLayerTo_v1_2 is not implemented yet
            // await this.migrateLayerTo_v1_2();
        }
        
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // - step2 - add to the file system - make a single request with multiple blobs in the single formData
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
        let queryUrl = COL.model.getUrlBase() + 'api/v1_2/upload_multiple_files_to_the_file_system';
        
        let response = await fetch(queryUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);

        
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // - step3 - make a single request with multiple blobs in the single formData
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // tbd
        
        // if(retVal.syncStatus == true)
        // {
        //     // the syncStatus is good so mark the blob as "in-sync"
        //     blobInfo.isDirty = false;

        //     // clean related isDirty flags in overlayRects depending on the synced filename, e.g.
        //     // for .json filename which contains the overlayRect location, reset the isDirty_moved flag for all the overlayRects
        //     this.cleanIsDirtyStates(filename);
        // }

    };

    
    updateSyncedInfo1 = function () {
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
    };

    updateSyncedInfo2 = function () {
        ///////////////////////////////////////////////////////////////////////
        // overlay.mtl was synced successfully. Do the following:
        // Loop over all overlayRects.
        // for those that are fully synced update overlayRect._syncedImageFilenames
        ///////////////////////////////////////////////////////////////////////

        ///////////////////////////////////////////////////////////////////////
        // After syncing layer.json
        // update the overlayRect.isDirty2 state
        // Loop over the overlayRects. For each overlayRect, check that every
        // imageInfo.blobInfo.isDirty is false
        // If yes: set overlayRect.isDirty_general to false
        // Otherwise: leave overlayRect.isDirty_general as true (to indicate that the sync is incomplete)
        ///////////////////////////////////////////////////////////////////////
        
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
                
                if(COL.util.isObjectValid(imageInfo2.blobInfo))
                {
                    if(imageInfo2.blobInfo.isDirty)
                    {
                        isDirty_imageAddedOrRemovedVal = true;
                        break;
                    }
                }
                else
                {
                    // imageInfo2.blobInfo can be invalid if the image was not loaded
                    // in such case it is already synced with the back-end.
                    // No need to do anything
                }
            }

            let removedImagesNamesInOverlayRect = overlayRect1.getRemovedImagesNames();
            // console.log('removedImagesNamesInOverlayRect.size()', removedImagesNamesInOverlayRect.size());
            if(removedImagesNamesInOverlayRect.size() > 0)
            {
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
    };
    
    cleanIsDirtyStates = function (filename) {
        console.log('BEG cleanIsDirtyStates');
        
        if(filename === this._layerJsonFilename) {
            this.updateSyncedInfo1();
            this.updateSyncedInfo2();
        }
        
    };
    
    syncBlobsWithWebServer = async function () {
        console.log('BEG syncBlobsWithWebServer'); 

        // // validate that there are no empty imagesInfo
        // ImageInfo.validateImagesInfo(imagesInfo);

        // reset the this.syncRetVals container
        this.syncRetVals = [];

        try
        {
            let doDeferFileSystemAndDbSync = true;
            if (doDeferFileSystemAndDbSync)
            {
                ////////////////////////////////////////////////////////////////////////////////////
                // execute all db operations in single request
                // clear image_db_operations_array
                ////////////////////////////////////////////////////////////////////////////////////

		// tbd - delete after placing a post and getting answer if it is advised to keep session open between requests.                
                // // begin the session
                // let fetchData = { 
                //     method: 'GET', 
                // };

                // // queryUrl - e.g. http://192.168.1.74/api/v1_2/clear_images_global
                // let queryUrl = COL.model.getUrlBase() + 'api/v1_2/clear_images_global';
                // console.log('queryUrl', queryUrl);
                
                // let response = await fetch(queryUrl, fetchData);
                // await COL.errorHandlingUtil.handleErrors(response);

                // clear COL.model.image_db_operations_array
                COL.model.image_db_operations_array = [];
            }
            
            ///////////////////////////////////////////////////////////////////////
            // Sync imagesInfo entries with isDirty===true to the webserver
            // - add blobs to the webserver (to the database, and to the file system)
            ///////////////////////////////////////////////////////////////////////

            let imagesInfo = this.getImagesInfo();
            let imagesInfoIter = imagesInfo.iterator();
            let layerJsonFilename = this.getLayerJsonFilename();

            while (imagesInfoIter.hasNext()) {
                let keyVal = imagesInfoIter.nextKeyVal();

                // reset the container, and update to the synced-file-in-progress
                this.synced_filenames_in_progress = [];
                let filename = keyVal[0];
                if(filename == layerJsonFilename)
                {
                    console.log('filename', filename);
                    console.log('foo1'); 
                }
                
                this.synced_filenames_in_progress.push(filename);
                
                // console.log('filename', filename); 
                let imageInfo = keyVal[1];
                let blobInfo = imageInfo.blobInfo;

                // Blob exist only for image that was interacted with
                //  (e.g. clicked on to view, or added as new image)
                // Blob may not not exist for many images that have not be interacted with yet
                if(COL.util.isObjectValid(blobInfo))
                {
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
                        if(retVal2.syncStatus == true)
                        {
                            // the syncStatus is good so mark the blob as "in-sync"
                            blobInfo.isDirty = false;

                            // For overlayRect(s) that contains the imageInfo (search for matching overlayRect(s) by "filename")
                            // - Update the state overlayRect1.IsDirty2
                            let iter = this._overlayRects.iterator();
                            while (iter.hasNext()) {
                                let overlayRect1 = iter.next();
                                if(overlayRect1.isImageNameInOverlayRect(filename))
                                {
                                    overlayRect1.updateStateIsDirty2();
                                }
                            }
                        }
                    }
                }
            }

            ///////////////////////////////////////////////////////////////////////
            // Sync removedImagesInfo entries with isDirty===true to the webserver
            // - remove blobs from the webserver (from the database, and from the file system)
            ///////////////////////////////////////////////////////////////////////

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
                if(COL.util.isObjectInvalid(blobInfo))
                {
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
                if(retVal2.syncStatus == true)
                {
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
                        if(isImageNameInRemovedListInOverlayRect1)
                        {
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


            ///////////////////////////////////////////////////////////////////////
            // Sync metaDataFilesInfo entries with isDirty===true to the webserver
            // metaDataFilesInfo are e.g. .json [notes]
            ///////////////////////////////////////////////////////////////////////

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
        
        //////////////////////////////////////////////////////
        // Check if the sync was successful and raise a toast
        //////////////////////////////////////////////////////

        let syncStatus = true;
        let successfulSyncMsg = "";
        let failureSyncMsg = "";

        let doListSyncedFilenames = true;
        // doListSyncedFilenames = false;
        
        // Check if the sync was successful
        for (let i = 0; i < this.syncRetVals.length; ++i) {
            let syncRetVal = this.syncRetVals[i];
            let syncMsg = syncRetVal['filePath'] + "<br />";
            
            if(doListSyncedFilenames)
            {
                if(syncRetVal['syncStatus'])
                {
                    successfulSyncMsg = successfulSyncMsg + syncMsg;
                }
                else
                {
                    failureSyncMsg = failureSyncMsg + syncMsg;
                }
            }
            if(!syncRetVal['syncStatus'])
            {
                syncStatus = false;
            }
        }

        let doDeferFileSystemAndDbSync = true;
        console.log('doDeferFileSystemAndDbSync', doDeferFileSystemAndDbSync);
        
        if (doDeferFileSystemAndDbSync)
        {
            ////////////////////////////////////////////////////////////////////////////////////
            // execute all db operations in single request
            // execute the request
            ////////////////////////////////////////////////////////////////////////////////////
            
            if(syncStatus)
            {
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
                let queryUrl = COL.model.getUrlBase() + 'api/v1_2/insert_update_delete_images_in_db';

                let response = await fetch(queryUrl, fetchData);
                await COL.errorHandlingUtil.handleErrors(response);
            }
        }

        
        //////////////////////////////////////////////////////
        // raise a toast
        // tbd - need to add a check on success of syncing the metadata to the db, to global syncStatus
        //       (currently only checking on images to filesystem-and-db, and metadat to filesystem? (not to db))
        //////////////////////////////////////////////////////

        let toastTitleStr = "Sync from memory to webserver";
        if(syncStatus)
        {
            let msgStr = "Succeeded to sync";
            if(COL.doEnableToastr)
            {
                toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.log(msgStr);
                // alert(msgStr);
            }
        }
        else
        {
            let msgStr = "Failed to sync: <br />" + failureSyncMsg;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }
        }

        return syncStatus;
    };

    /////////////////////////////////////////////////////////
    // update imageInfo.isImageInRange
    /////////////////////////////////////////////////////////
    
    updateImagesInfoAttr_isImageInRange = function (conditionStr)
    {
        // console.log('BEG updateImagesInfoAttr_isImageInRange');

        let iter = this._imagesInfo.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let imageName = keyVal[0];
            let imageInfo = keyVal[1];

            imageInfo.isImageInRange = ImageInfo.IsImageInRangeEnum.NOT_APPLICABLE;

            if(this._isMilestoneDatesFilterEnabled &&
               COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'dateTimeOriginal'])))
            {
                let imageTags = imageInfo.imageTags;

                if( COL.util.isObjectValid(imageTags.dateTimeOriginal) )
                {
                    var m1 = moment.utc(imageTags.dateTimeOriginal, "YYYY:MM:DD HH:mm:ss");
                    let dateTimeOriginal_asDate = m1.toDate();

                    let dateTimeOriginalAsNumber = dateTimeOriginal_asDate.getTime();
                    
                    let conditionStr2 = conditionStr.replace(/milstoneDate/g, `${dateTimeOriginalAsNumber}`);
                    imageInfo.isImageInRange = eval(conditionStr2) ? ImageInfo.IsImageInRangeEnum.IN_RANGE : ImageInfo.IsImageInRangeEnum.NOT_IN_RANGE;
                }
            }
        }

        ///////////////////////////////////////////////////////////////////////////////
        // tbd - update this._overlayMeshGroup
        // loop over this._overlayMeshGroup
        //   if the overlayMeshObj entry in this._overlayMeshGroup has images with isImageInRange !== NOT_IN_RANGE
        //     i.e. IN_RANGE or NOT_APPLICABLE
        //     leave the overlayMeshObj entry, i.e. enable overlayRect display
        //   else
        //     mark the overlayMeshObj entry with sandyBrownColor (instead of acquaColor)
        //     i.e. disable overlayRect display
        ///////////////////////////////////////////////////////////////////////////////

        let _this = this;
        
        this._overlayMeshGroup.traverse(function ( child ) {
            if ( (child.type === 'Mesh') && (child.name !== 'ring') ) {
                let isOverlayRectFilteredIn = false;
                let imagesNamesDict = child.material.userData['imagesNames'];
                let imagesNames = imagesNamesDict.getKeys();

                let opacity = 1;
                if(_this._isMilestoneDatesFilterEnabled)
                {
                    // milestoneDates filter is enabled
                    for (let imagesName of imagesNames){
                        let imageInfo = _this._imagesInfo.getByKey(imagesName);
                        if( COL.util.isObjectInvalid(imageInfo) )
                        {
                            throw new Error('imageInfo is invalid');
                        }
                        
                        if( imageInfo.isImageInRange !== ImageInfo.IsImageInRangeEnum.NOT_IN_RANGE )
                        {
                            // isImageInRange is in range or na (e.g. if there is no date tag).
                            // Mark the overlayRect as filteredIn i.e. available for display.
                            isOverlayRectFilteredIn = true;
                            break;
                        }
                    }

                    if(!isOverlayRectFilteredIn)
                    {
                        // milestoneDates filter is enabled. All overlayRect images are outside the filtered date range.
                        // Mark the overlayRect as filteredOut i.e. NOT available for display.
                        child.material.color.set(COL.util.whiteSmoke2);
                        opacity = 0.3;
                        child.material.userData.isOverlayRectFilteredIn = false;
                    }
                    else
                    {
                        // milestoneDates filter is enabled. One or more of the overlayRect images are inside the filtered date range.
                        child.material.color.set(COL.util.acquaColor);
                        child.material.userData.isOverlayRectFilteredIn = true;
                    }
                }
                else
                {
                    // milestoneDates filter is disabled
                    child.material.color.set(COL.util.acquaColor);
                    child.material.userData.isOverlayRectFilteredIn = true;
                }
                
                child.material.opacity = opacity;
                child.children[0].material.opacity = opacity;
                
                child.material.needsUpdate = true;
                child.children[0].material.needsUpdate = true;
            }
        });
        Scene3DtopDown.render1();
    };
    
    splitOverlayRect = async function () {
        // console.log('BEG splitOverlayRect');
        
        if( COL.util.isObjectValid(this._selectedOverlayRect) )
        {
            await this._selectedOverlayRect.splitOverlayRect2(this);
        }
    };
    
    mergeOverlayRects = async function () {
        // console.log('BEG mergeOverlayRects');

        let sceneBar = COL.model.getSceneBar();
        let doDisableSceneBarButtons = false;
        if(sceneBar._mergeOverlayRectsButton.isOn())
        {
            doDisableSceneBarButtons = true;
            
            // reset _selectedForMergeOverlayRects
            this._selectedForMergeOverlayRects.clear();

            if( COL.util.isObjectValid(this._selectedOverlayRect) )
            {
                await this.setSelectedForMergeOverlayRects(this._selectedOverlayRect);

                // color for selectedForMergeOverlayRects
                let selectedMeshObject = this._selectedOverlayRect.getMeshObject();
                selectedMeshObject.material.color.setHex( COL.util.Orange1 );
                Scene3DtopDown.render1();
            }

            // the button is turned on - enable merging
            //
            // - reset the list of this._selectedForMergeOverlayRects
            //   start adding overlayRects to this._selectedForMergeOverlayRects
            //   (with every click on overlayRect, it should be added to the list and colored with e.g. red)
            //    another click on the same overlayRect, should remove it from the list
            // overlayRects will be added with every setSelectedOverlayRect
        }
        else
        {
            // the button is turned off
            // - merge all this._selectedForMergeOverlayRects into the first selected overlayRect
            //
            // tbd
            //   update Layer::._overlayRects
            // - mark the merged overlayRect as dirty (for syncing to the webserver which is not hapenning here)
            // - reset the list of this._selectedForMergeOverlayRects
            // - unmark the merged overlayRect (e.g. from red color to no color)
            // 
            await this.merge_selectedForMergeOverlayRects();

            // reset _selectedForMergeOverlayRects after the merge
            this._selectedForMergeOverlayRects.clear();

            Scene3DtopDown.render1();
        }

        // disable/enable SceneBar buttons, when the mergeOverlayRectsButton is on/off,
        // so they don't interfer with the merge
        // (e.g. disable the button _editOverlayRect_deleteButton, until implementing the
        //  deletion of the deleted overlayRect, also from setSelectedForMergeOverlayRects)

        if(COL.doEnableWhiteboard)
        {
            sceneBar._editOverlayRect_editFloorPlanWhiteboard.disabled(doDisableSceneBarButtons);
        }
        sceneBar._editOverlayRect_deleteButton.disabled(doDisableSceneBarButtons);
        sceneBar._openImageFileButton.disabled(doDisableSceneBarButtons);
        sceneBar._reconcileFrontEndButton.disabled(doDisableSceneBarButtons);
    };
    
    merge_selectedForMergeOverlayRects = async function () {
        // console.log('BEG merge_selectedForMergeOverlayRects');

        // console.log('_selectedForMergeOverlayRects'); 
        // this._selectedForMergeOverlayRects.printKeysAndValues();

        // get the first overlayRect
        let firstOverlayRect = this._selectedForMergeOverlayRects.getFirstVal();
        // console.log('firstOverlayRect', firstOverlayRect); 

        let firstOverlayRectMeshObject = firstOverlayRect.getMeshObject();
        // console.log('firstOverlayRectMeshObject.name', firstOverlayRectMeshObject.name);
        
        let selectedForMergeOverlayRectsIter = this._selectedForMergeOverlayRects.iterator();
        while (selectedForMergeOverlayRectsIter.hasNext()) {
            let overlayRect = selectedForMergeOverlayRectsIter.next();
            let overlayRectMeshObject = overlayRect.getMeshObject();
            // console.log('overlayRectMeshObject.name', overlayRectMeshObject.name); 
            if(firstOverlayRectMeshObject.name === overlayRectMeshObject.name)
            {
                // skip the first overlayRect
                continue;
            }
            await firstOverlayRect.mergeOtherOverlayRect(this, overlayRect);

            // Remove the meshObject of the overlayRect from the meshGroup of the layer
            this.removeFromOverlayMeshGroup(overlayRectMeshObject);

            await this.setSelectedOverlayRect(firstOverlayRect.getMeshObject());
        }
    };


    scanForInconsitenciesBetweenImagesInfo_and_overlayRectImagesNames = function () {
        console.log('BEG scanForInconsitenciesBetweenImagesInfo_and_overlayRectImagesNames');
        
        let retVal = true;
        
        let imageNamesOnlyIn_overlayRects = new COL.util.AssociativeArray();
        let imageNamesOnlyIn_imagesInfo = new COL.util.AssociativeArray();
        let imageNamesIn_overlayRects_and_imagesInfo = new COL.util.AssociativeArray();

        // let imageNamesOnlyIn_overlayMeshGroup = new COL.util.AssociativeArray();
        // let imageNamesOnlyIn_removedOverlayMeshGroup = new COL.util.AssociativeArray();
        
        ///////////////////////////////////////////////////////////////////////////////
        // Compare _overlayRects vs _imagesInfo
        // Loop over _overlayRects
        ///////////////////////////////////////////////////////////////////////////////

        let imageNames_in_overlayRects = new COL.util.AssociativeArray();

        // tbd
        // for (let foo in foos)
        // for (let foo of foos)
        
        let iter = this._overlayRects.iterator();
        while (iter.hasNext()) {
            let overlayRect = iter.next();
            
            let imageNames = overlayRect.getImagesNames();

            // at this point (after removing empty overlayRects) every overlayRect must have imagesNames with 1 or more images
            if(COL.util.isObjectInvalid(imageNames))
            {
                retVal = false;
                let msgStr = 'imageNames is invalid';
                console.error(msgStr); 
                continue;
            }

            let iter2 = imageNames.iterator();
            while (iter2.hasNext()) {
                let imageName = iter2.nextKey();

                // verify that imageName only exists in one overlayRect
                if(COL.util.isObjectInvalid(imageNames_in_overlayRects.getByKey(imageName)))
                {
                    imageNames_in_overlayRects.set(imageName, true);
                }
                else
                {
                    retVal = false;
                    let msgStr = 'imageName: ' + imageName + ' exists in more than 1 overlayRect';
                    console.error(msgStr); 
                    continue;
                }
                
                let imageInfo = this._imagesInfo.getByKey(imageName);
                if(COL.util.isObjectInvalid(imageInfo))
                {
                    imageNamesOnlyIn_overlayRects.set(imageName, true);
                }
                else
                {
                    imageNamesIn_overlayRects_and_imagesInfo.set(imageName, true);
                }
            }
        }

        ///////////////////////////////////////////////////////////////////////////////
        // Compare _imagesInfo vs imageNames_in_overlayRects
        // Loop over _imagesInfo
        ///////////////////////////////////////////////////////////////////////////////

        iter = this._imagesInfo.iterator();
        while (iter.hasNext()) {
            let imageName_inImageInfo = iter.nextKey();
            let imageName_in_overlayRects = imageNames_in_overlayRects.getByKey(imageName_inImageInfo);

            if(COL.util.isObjectInvalid(imageName_in_overlayRects))
            {
                imageNamesOnlyIn_imagesInfo.set(imageName_inImageInfo, true);
            }
            else
            {
                imageNamesIn_overlayRects_and_imagesInfo.set(imageName_inImageInfo, true);
            }
        };

        if((imageNamesOnlyIn_overlayRects.size() !== 0) || (imageNamesOnlyIn_imagesInfo.size() !== 0))
        {
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
            };
        }

        console.log('retVal', retVal); 
        
    };
    
    clearOverlayRectsWithoutImages = function () {
        let iter = this._overlayRects.iterator();
        while (iter.hasNext()) {
            let overlayRect = iter.next();
            if(overlayRect.getImagesNames().size() == 0)
            {
                let meshObject = overlayRect.getMeshObject();
                // Remove the meshObject of the overlayRect from the meshGroup of the layer
                this.removeFromOverlayMeshGroup(meshObject);
            }
        }
    };
    

    reconcileFrontEndInconcitencies = async function () {
        // console.log('BEG reconcileFrontEndInconcitencies');

        let syncStatus = true;
        let msgStr = "";
        let msgStr1 = "";
        let filename = '';
        this.syncRetVals = [];
        
        try
        {
            ////////////////////////////////////////////////////////////////////////////
            // Reconcile (remove) added images that are not synced with the back-end
            // (entries in this._imagesInfo with "isDirty == true")
            // loop over the imagesInfo.
            // For imageInfo with "isDirty == true" undo the change, e.g. remove the image from the .mtl file
            ////////////////////////////////////////////////////////////////////////////
            
            let imagesInfo = this.getImagesInfo();
            let imagesInfoIter = imagesInfo.iterator();
            while (imagesInfoIter.hasNext()) {
                let keyVal = imagesInfoIter.nextKeyVal();
                console.log('keyVal', keyVal); 
                filename = keyVal[0];
                let imageInfo = keyVal[1];
                let blobInfo = imageInfo.blobInfo;

                if(COL.util.isObjectValid(blobInfo))
                {
                    console.log('blobInfo', blobInfo);
                    
                    // Revert imagesInfo entries with isDirty===true
                    if(blobInfo.isDirty === true) {
                        let iter = this._overlayRects.iterator();
                        while (iter.hasNext()) {

                            let overlayRect1 = iter.next();
                            let isImageNameInOverlayRect1 = overlayRect1.isImageNameInOverlayRect(filename);
                            if(isImageNameInOverlayRect1)
                            {
                                // the image is added but failed to sync so remove it from overlayRect to reverse the operation
                                // await overlayRect1.deleteImageFromOverlayRect(imageInfo.filename);
                                await this.deleteImageFromLayer(overlayRect1, imageInfo.filename);
                            }
                        }
                    }
                }
            }

            ////////////////////////////////////////////////////////////////////////////
            // Reconcile (add) removed images that are not synced with the back-end
            // (entries in this._removedImagesInfo with "isDirty == true")
            // loop over the removedImagesInfo.
            // For imageInfo with "isDirty == true" undo the change, e.g. add the image back to the .mtl file
            ////////////////////////////////////////////////////////////////////////////

            let removedImagesInfoSizeOrig = removedImagesInfo.size();
            let index1 = 0;
            
            while (index1 < this._removedImagesInfo.size()) {
                let imageInfo = this._removedImagesInfo.getByIndex(index1);
                index1++;
                filename = imageInfo.filename;
                
                let blobInfo = imageInfo.blobInfo;
                if(COL.util.isObjectValid(blobInfo))
                {
                    // console.log('blobInfo', blobInfo);
                    
                    // Revert this._removedImagesInfo entries with isDirty===true
                    if(blobInfo.isDirty === true) {
                        let iter = this._overlayRects.iterator();
                        while (iter.hasNext()) {

                            let overlayRect1 = iter.next();

                            let isImageNameInRemovedListInOverlayRect1 = overlayRect1.isImageNameInRemovedListInOverlayRect(filename);
                            if(isImageNameInRemovedListInOverlayRect1)
                            {
                                await this.addImageToLayer(overlayRect1, imageInfo);
                                let numEntriesRemoved = removedImagesInfoSizeOrig - this._removedImagesInfo.size();
                                if(numEntriesRemoved > 0)
                                {
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
        let toastTitleStr = "Reconcile front-end inconcitencies";
        if(syncStatus)
        {
            msgStr = "Succeeded to reconcile inconcitencies";
            if(COL.doEnableToastr)
            {
                toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.log(msgStr);
                // alert(msgStr);
            }
        }
        else
        {
            msgStr = "Failed to reconcile inconcitencies: " + msgStr1;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }
        }
    };

    
    loadOverlayTextureFromFile = async function (textureFileUrl) {
        console.log('BEG loadOverlayTextureFromFile');
        let _this = this;

        return new Promise(async function(resolve, reject) {
            try{
                // the "await" causes to wait for the "resolve", or "reject" within onLoad_Texture (at the end)
                // await new THREE_TextureLoader().loadAsync(textureFileUrl).then(onLoad_Texture, onProgress_TextureLoader, reject);
                let textureObj = await new THREE_TextureLoader().loadAsync(textureFileUrl);
                await onLoad_Texture(textureObj);
                resolve(true);
            } 
            catch(err){
                console.error('err', err); 
                let msgStr = 'Error while trying to load from THREE_TextureLoader.loadAsync. textureFileUrl: ' + textureFileUrl;
                console.error(msgStr); 
                reject(msgStr);
            }

            async function onLoad_Texture( textureObj ) {
                // console.log('BEG onLoad_Texture');

                // This anonymous function will be called when the textureObj has finished loading
                
                textureObj.wrapS = THREE_ClampToEdgeWrapping;
                textureObj.wrapT = THREE_ClampToEdgeWrapping;
                
                // Prevent warning when texture is not a power of 2
                // https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
                textureObj.minFilter = THREE_LinearFilter;
                // texture.generateMipmaps = false;

                if(COL.util.isObjectInvalid(_this))
                {
                    throw new Error('Selected layer is invalid');
                }

                let imagesInfo = _this.getImagesInfo();

                let selectedOverlayRect = _this.getSelectedOverlayRect();
                if( COL.util.isObjectInvalid(selectedOverlayRect) )
                {
                    // sanity check
                    throw new Error('selectedOverlayRect is invalid');
                }
                let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
                let imageInfo = imagesInfo.getByKey(selectedImageFilename);

                let rotationVal = 0;
                let flipY = true;
                if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation'])))
                {
                    let rotationParams = COL.OrbitControlsUtils.getRotationParams(Number(imageInfo.imageTags.imageOrientation));
                    rotationVal = rotationParams.rotationVal;
                    flipY = rotationParams.flipY;
                }

                textureObj.flipY = flipY;

                // --------------------------------------------------------------
                // attenuate the image by drawing the image on a canvas and changing the globalAlpha 
                let image = textureObj.image;
                const canvas = document.createElement( 'canvas' );
                canvas.width = image.width;    
                canvas.height = image.height;
                const context = canvas.getContext( '2d' );

                // set background for the image
                // combination of black background (rgba(0, 0, 0, 1)) and low globalAlpha (0.2) will show a darken image
                // combination of black background (rgba(255, 255, 255, 0.9)) and low globalAlpha (0.2) will show a bright image
                context.fillStyle = 'rgba(255, 255, 255, 1)';
                context.fillRect(0, 0, image.width, image.height);

                if( imageInfo.isImageInRange !== ImageInfo.IsImageInRangeEnum.NOT_IN_RANGE )
                {
                    console.log('image is filteredIn, i.e. either in the milestoneDate range, or date is na');
                    context.globalAlpha = 1;
                }
                else
                {
                    console.log('image is filteredOut, i.e. not in the milestoneDate range'); 
                    context.globalAlpha = 0.2;
                }

                context.drawImage( image, 0, 0);

                const canvasTexture = new THREE_CanvasTexture(context.canvas);

                let overlayTextureMaterial = new THREE_SpriteMaterial({
                    rotation: rotationVal,
                    map: canvasTexture,
                    transparent: true,
                    fog: true
                });
                
                // overlayTextureMaterial.opacity = 1;
                overlayTextureMaterial.opacity = 0.1;
                let overlayTexture = new THREE_Sprite(overlayTextureMaterial);
                overlayTexture.name = "overlayTexture";
                overlayTexture.material.color.set(0xffffff)
                // needsUpdate is also a Texture attribute: https://threejs.org/docs/#api/en/textures/Texture.needsUpdate
                overlayTexture.material.map.needsUpdate = true;
                // needsUpdate is also a Material attribute: https://threejs.org/docs/#api/en/materials/Material.needsUpdate
                overlayTexture.material.needsUpdate = true;

                _this.setCurrentTextureImage(overlayTexture);
                
                // the texture image finished openning from file. Load the texture image onto the pane
                let texturePanelPlugin = _this.getTexturePanelPlugin();
                texturePanelPlugin.loadTextureImageToTexturePane(_this, overlayTexture);

                resolve(true);
            };
            
            // based on three.js/examples/webgl_loader_obj_mtl.html
            var onProgress_TextureLoader = function ( xhr ) {
                console.log('BEG onProgress_TextureLoader'); 
                if ( xhr.lengthComputable ) {
                    var percentComplete = xhr.loaded / xhr.total * 100;
                    console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
                }
            };
        });
    };

    loadTopDownTextureFromFile = async function (textureFileUrl) {
        // console.log('BEG loadTopDownTextureFromFile');

        let _this1 = this;
        
        return new Promise(async function(resolve, reject) {
            try{
                // the "await" causes to wait for the "resolve", or "reject" within onLoad_Texture (at the end)
                // await new THREE_TextureLoader().loadAsync(textureFileUrl).then(onLoad_Texture, onProgress_TextureLoader, reject);
                let textureObj = await new THREE_TextureLoader().loadAsync(textureFileUrl);
                await onLoad_Texture(textureObj);
                resolve(true);
            } 
            catch(err){
                console.error('err', err); 
                let msgStr = 'Error while trying to load from THREE_TextureLoader.loadAsync. textureFileUrl: ' + textureFileUrl;
                console.error(msgStr); 
                reject(msgStr);
            }

            async function onLoad_Texture( textureObj ) {
                // console.log('BEG onLoad_Texture');

                // This anonymous function will be called when the textureObj has finished loading
                
                textureObj.wrapS = THREE_ClampToEdgeWrapping;
                textureObj.wrapT = THREE_ClampToEdgeWrapping;

                // Prevent warning when texture is not a power of 2
                // https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
                textureObj.minFilter = THREE_LinearFilter;
                // texture.generateMipmaps = false;

                let floorPlanObj = _this1.getFloorPlanMeshObj();
                let meshObj1 = floorPlanObj.children[0];
                // _this1._floorPlanMeshObj.floorPlanObj.children[0];
                meshObj1.material.map = textureObj;
                
                let floorPlanImageFilename = _this1.getFloorPlanImageFilename();
                let imagesInfo = _this1.getImagesInfo();
                let imageInfo = imagesInfo.getByKey(floorPlanImageFilename);

                let rotationVal = 0;
                let flipY = true;
                if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation'])))
                {
                    let rotationParams = COL.OrbitControlsUtils.getRotationParams(Number(imageInfo.imageTags.imageOrientation));
                    rotationVal = rotationParams.rotationVal;
                    flipY = rotationParams.flipY;
                }

                textureObj.flipY = flipY;
                
                // https://stackoverflow.com/questions/36668836/threejs-displaying-a-2d-image
                let spriteMaterial = new THREE_SpriteMaterial( { map: textureObj,
                                                                 color: 0xffffff,
                                                                 rotation: rotationVal,
                                                                 fog: true } );
                
                let sprite2 = new THREE_Sprite( spriteMaterial );

                resolve(true);
            };
            
            // based on three.js/examples/webgl_loader_obj_mtl.html
            var onProgress_TextureLoader = function ( xhr ) {
                console.log('BEG onProgress_TextureLoader'); 
                if ( xhr.lengthComputable ) {
                    var percentComplete = xhr.loaded / xhr.total * 100;
                    console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
                }
            };
        });
    };

    toJSON = function () {
        console.log('BEG Layer.toJSON()'); 

        return {
            scene3DtopDown: this.scene3DtopDown.toJSON(),
            imagesInfo: this._imagesInfo.toJSON(),
            // tbd - add the other entries
        };
    };

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile = function () {
        // console.log('BEG toJSON_forFile'); 

        let layer_asJson = {};
        let scene3DtopDown_asJson = this.getScene3DtopDown().toJSON_forFile();
        layer_asJson['scene3DtopDown'] = scene3DtopDown_asJson;
        layer_asJson['_imagesInfo'] = this.getImagesInfo().toJSON();

        let selectedOverlayRect = this.getSelectedOverlayRect();
        if(COL.util.isObjectValid(selectedOverlayRect))
        {
            layer_asJson['selectedOverlayRect'] = this.getSelectedOverlayRect().toJSON_forFile();
        }
        
        return layer_asJson;
    };
    
    dispose = function () {
        console.log('BEG Layer::dispose()');
        
        try
        {
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

            this.scene3DtopDown.dispose();
            if(!COL.doUseAnimateToRenderTopDownPane)
            {
                // comment out for now until animate() is disabled
                this.scene3DtopDown = null;
            }

            this.texturePanelPlugin.dispose();
            if(!COL.doUseAnimateToRenderTopDownPane)
            {
                this.texturePanelPlugin = null;
            }

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

            this._lastSelectedImageFilenames.clear();

            this._milestoneDatesInfo.clear();

            if(COL.util.isObjectValid(this._selectedOverlayRect))
            {
                this._selectedOverlayRect.dispose();
                this._selectedOverlayRect = null;
            }
            
            if(COL.util.isObjectValid(this._selectedOverlayRectPrev))
            {
                this._selectedOverlayRectPrev.dispose();
                this._selectedOverlayRectPrev = null;
            }

            iter = this._selectedForMergeOverlayRects.iterator();
            while (iter.hasNext()) {
                let selectedForMergeOverlayRect = iter.next();
                COL.ThreejsUtil.disposeObject(selectedForMergeOverlayRect);
            }
            this._selectedForMergeOverlayRects.clear();

            if(COL.util.isObjectValid(this._currentTextureImage))
            {
                // this._currentTextureImage is of type THREE_Sprite
                COL.ThreejsUtil.disposeObject(this._currentTextureImage);
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
            let toastTitleStr = "Dispose Layer";
            let msgStr = "Failed to dispose the layer.";
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }
        }
        
    };

    updateIsDirtyInAllOverlayRects = function (overlayRectIsDirty2) {
        // console.log('BEG updateIsDirtyInAllOverlayRects');
        
        let iter = this._overlayRects.iterator();
        while (iter.hasNext()) {
            let overlayRect1 = iter.next();
            overlayRect1.setIsDirty2(overlayRectIsDirty2);
        }
    };

    static CreateLayerName = function (planInfo) {
        let layerName = planInfo.siteName + '__' + planInfo.name;
        return layerName;
    };

    static GetSiteIdPlanIdAndFilePath = function (planInfo) {
        console.log('BEG GetSiteIdPlanIdAndFilePath'); 

        let siteId;
        if(planInfo['newSiteId'])
        {
            siteId = planInfo['newSiteId'];
        }
        else
        {
            siteId = planInfo['siteId'];
        }
        
        let planId;
        if(planInfo['newPlanId'])
        {
            planId = planInfo['newPlanId'];
        }
        else
        {
            planId = planInfo['id'];
        }

        let filePath = siteId + '/' + planId;

        return {
            siteId: siteId,
            planId: planId,
            filePath: filePath
        };
    };

};

Layer.maxNumImageBlobsInMeomry = 10;
Layer.PLAY_IMAGES_STATE = { NONE: -1, PLAY_IMAGES_IN_SELECTED_OVERLAY_RECT: 0, PLAY_IMAGES_IN_ALL_OVERLAY_RECTS: 1 };

export { Layer };
