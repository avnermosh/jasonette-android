// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import {
    Vector3 as THREE_Vector3,
    Vector2 as THREE_Vector2,
    Box3 as THREE_Box3,
    Vector4 as THREE_Vector4,
    Scene as THREE_Scene,
    MeshBasicMaterial as THREE_MeshBasicMaterial,
    CircleGeometry as THREE_CircleGeometry,
    BufferGeometry as THREE_BufferGeometry,
    PlaneGeometry as THREE_PlaneGeometry,
    SphereGeometry as THREE_SphereGeometry,
    ClampToEdgeWrapping as THREE_ClampToEdgeWrapping,
    CanvasTexture as THREE_CanvasTexture,
    DoubleSide as THREE_DoubleSide,
    Mesh as THREE_Mesh,
    LineBasicMaterial as THREE_LineBasicMaterial,
    Line as THREE_Line,
    LinearFilter as THREE_LinearFilter,
    TextureLoader as THREE_TextureLoader,
    OrthographicCamera as THREE_OrthographicCamera,
    PerspectiveCamera as THREE_PerspectiveCamera,
    SpriteMaterial as THREE_SpriteMaterial,
    Sprite as THREE_Sprite,
    Raycaster as THREE_Raycaster,
    RepeatWrapping as THREE_RepeatWrapping,
    MeshStandardMaterial as THREE_MeshStandardMaterial,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from './Model.js';
import { Layer } from './Layer.js';
import { BlobInfo } from './BlobInfo.js';
import { ImageInfo } from './ImageInfo.js';
import { ImageTags } from './ImageTags.js';
import '../gui/Component.js';
import { CSS2DRenderer } from '../../static/CSS2DRenderer.js';
import { OrbitControlsImageView } from '../orbitControl/OrbitControlsImageView.js';
import '../orbitControl/OrbitControlsUtils.js';
import '../util/Util.js';
import '../util/ThreejsUtil.js';

import { onPointerDown_imageView, onPointerUp_imageView, onPointerMove_imageView,
    onWheel_imageView, onKeyDown_imageView } from './ImageView_eventListeners.js';
import { Annotation } from './Annotation.js';

class ImageView {
    constructor() {
        this.camera;
        this.imageViewScene;
        this.renderer;
        this.labelRenderer;
        this.orbitControls;
        this.rotationVal = 0;
        this.flipY = true;

        this.mouse = new THREE_Vector2();

        // surface can be 'sprite' for Non360 image, or 'mesh' for 360 image.
        // https://threejs.org/docs/#api/en/objects/Sprite
        // sprite is the threejs planar Sprite object to show the selected images
        this.surface;

        // Bounding box around the texture image
        this.bbox;

        this.viewportExtendsOnX = false;
        this.currentViewportNormalized;

        this.imageWidth = undefined;
        this.imageHeight = undefined;

        this.doDisplayImageDetails = true;

        this.raycasterImageView = new THREE_Raycaster();
    }

    initSelectedView () {
    // console.log('BEG initSelectedView');

        // ////////////////////////////////////
        // Set camera related parameters
        // ////////////////////////////////////

        // initialize to an arbitrary camera (later on the camera set according to the image type (360 or non360))
        this.camera = new THREE_OrthographicCamera();

        this.imageViewScene = new THREE_Scene();
        this.imageViewScene.name = 'imageViewScene';

        // ////////////////////////////////////
        // Set renderer related parameters
        // ////////////////////////////////////

        this.renderer = COL.model.getRendererImageViewPane();

        // //////////////////////////////////////////////////
        // INIT CONTROLS
        // //////////////////////////////////////////////////

        // this.setControls();
        this.initializeOrbitControlsImageView();

        if (COL.model.isStickyNotesEnabled()) {
            this.labelRenderer = new CSS2DRenderer();
            this.labelRenderer.domElement.id = 'canvaslabel';

            let rendererSize = new THREE_Vector2();
            this.renderer.getSize(rendererSize);
            this.labelRenderer.setSize(
                rendererSize.width,
                rendererSize.height
            );
            this.labelRenderer.domElement.style.position = 'absolute';
            this.labelRenderer.domElement.style.top = 0;
        }

        if (ImageView.doDrawTwoFingerTouchCenterPoint) {
            // ////////////////////////////////////////////////////////////
            // Add centerPoint between multi-pointerEvent (e.g. two-finger touch)
            // Update the multi-pointerEvent (e.g. two-finger touch) points
            // ////////////////////////////////////////////////////////////

            let numSegments = 32;
            const centerPoint_twoFingerTouchGeometry = new THREE_CircleGeometry(
                ImageView.overlayRectRadius,
                numSegments
            );
            const material = new THREE_MeshBasicMaterial({
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                color: COL.util.Color.Red,
            });

            this.texCenterPoint_twoFingerTouch = new THREE_Mesh(centerPoint_twoFingerTouchGeometry, material);
            this.texCenterPoint_twoFingerTouch.name = 'texCenterPoint_twoFingerTouch';
            this.texCenterPoint_twoFingerTouch.visible = true;
            this.texCenterPoint_twoFingerTouch.updateMatrixWorld();
            this.imageViewScene.add(this.texCenterPoint_twoFingerTouch);

            // # --------------------------------------------------------------
            // Add the multi-pointerEvent (e.g. two-finger touch) points

            const centerPoint_twoFingerTouchGeometry1 = new THREE_CircleGeometry(
                2 * ImageView.overlayRectRadius,
                numSegments
            );
            this.twoFingerTouchPt0 = new THREE_Mesh(centerPoint_twoFingerTouchGeometry1, material);
            this.twoFingerTouchPt0.name = 'twoFingerTouchPt0';
            this.twoFingerTouchPt0.visible = true;
            this.twoFingerTouchPt0.updateMatrixWorld();
            this.imageViewScene.add(this.twoFingerTouchPt0);

            this.twoFingerTouchPt1 = new THREE_Mesh(centerPoint_twoFingerTouchGeometry1, material);
            this.twoFingerTouchPt1.name = 'twoFingerTouchPt1';
            this.twoFingerTouchPt1.visible = true;
            this.twoFingerTouchPt1.updateMatrixWorld();
            this.imageViewScene.add(this.twoFingerTouchPt1);

            // # --------------------------------------------------------------
            // Add the line between the multi-pointerEvent (e.g. two-finger touch) points

            const touchPointsLineMaterial = new THREE_LineBasicMaterial({
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                linewidth: 80,
                color: COL.util.Color.Red,
            });

            const points = [];
            points.push(new THREE.Vector3(-5, 0, 0));
            points.push(new THREE.Vector3(5, 0, 0));
            const touchPointsLineGeometry = new THREE.BufferGeometry().setFromPoints(points);

            this.texLineBetween_twoFingerTouch = new THREE_Line(touchPointsLineGeometry, touchPointsLineMaterial);
            this.texLineBetween_twoFingerTouch.name = 'texLineBetween_twoFingerTouch';
            this.texLineBetween_twoFingerTouch.visible = true;
            this.texLineBetween_twoFingerTouch.updateMatrixWorld();
            this.imageViewScene.add(this.texLineBetween_twoFingerTouch);
        }

        // //////////////////////////////////////////////////
        // EVENT HANDLERS
        // //////////////////////////////////////////////////

        // tbd - is this event listener needed?
        this.orbitControls.addEventListener('change', function () {
            // console.log('intercepted orbitControls "change" event');
            ImageView.Render2();
        });
    }

    async fabricImageFromURL(imageBlobUrl) {                                                                          
        return new Promise(function(resolve, reject) {                                                                        
            try {                                                                                                               
                fabric.Image.fromURL(imageBlobUrl, function (image) {                                                                
                    resolve(image);                                                                                                 
                });                                                                                                               
            }
            catch (error) {                                                                                                   
                reject(error);                                                                                                    
            }                                                                                                                   
        });                                                                                                                   
    }

    async updateFabricCanvasFromImageBlobAndAnnotationBlob(imageInfo) {
        // console.log('BEG update FabricCanvasFromImageBlobAndAnnotationBlob');

        if(COL.util.isObjectInvalid(COL.util.getNestedObject(imageInfo, ['imageBlobInfo', 'blobUrl']))) {
            // sanity check
            throw new Error('imageInfo.imageBlobInfo is invalid');
        }

        // Calling fabric.Image.fromURL and passing the url of our desired image
        // https://stackoverflow.com/questions/57661991/loading-images-for-canvas-object-asynchronously
        // ... - spread operator - expand array into list
        // remove all fabricCanvas objects including the image, and the annotations
        COL.model.fabricCanvas.remove(...COL.model.fabricCanvas.getObjects());
        if (COL.util.isObjectValid(imageInfo.annotationBlobInfo) &&
            COL.util.isObjectValid(imageInfo.annotationBlobInfo.blobUrl)) {

            try {
                // load the annotation from blob
                let response = await fetch(imageInfo.annotationBlobInfo.blobUrl);
                await COL.errorHandlingUtil.handleErrors(response);
                let dataAsJson = await response.json();
                // console.log('dataAsJson', dataAsJson);
                let selectedLayer = COL.model.getSelectedLayer();
                let metaDataBlobsInfo = selectedLayer.getMetaDataBlobsInfo();
                // metaDataBlobsInfo.set(imageInfo.annotationFilename, imageInfo.annotationBlobInfo);
                // console.log('dataAsJson', dataAsJson);
                COL.model.fabricCanvas.loadFromJSON(dataAsJson.state);
                // loop over the annotation objects.
                // - set lockMovementX according to the state
                // - adjust the object coordinates to the current canvas
                let prevWidth = COL.model.fabricCanvas.width;
                if (COL.util.isObjectValid(dataAsJson.canvasWidth)) {
                    prevWidth = dataAsJson.canvasWidth;
                }
                let ratio = COL.model.fabricCanvas.width / prevWidth;
                // set and scale fabricCanvas.freeDrawingBrush.width
                let freeDrawingBrushWidth = COL.model.fabricCanvas.freeDrawingBrush.width;
                if (COL.util.isObjectValid(dataAsJson.freeDrawingBrushWidth)) {
                    freeDrawingBrushWidth = dataAsJson.freeDrawingBrushWidth;
                }
                COL.model.fabricCanvas.freeDrawingBrush.width = freeDrawingBrushWidth * ratio;
                console.log('COL.model.fabricCanvas.freeDrawingBrush.width', COL.model.fabricCanvas.freeDrawingBrush.width);
                
                let annotationObjects = COL.model.fabricCanvas.getObjects(); // returns Array<objects>
                annotationObjects.forEach(async object=>{
                    // adjust the object coordinates to the current canvas
                    object.scaleX = (object.scaleX || 1) * ratio;
                    object.scaleY = (object.scaleY || 1) * ratio;
                    object.left = object.left * ratio;
                    object.top = object.top * ratio;
                    object.setCoords();

                    if (COL.util.isObjectValid(object.annotationState)) {
                    // checking if the object.annotationState is valid because e.g. the background image does not have an annotationState, 
                    // (only Rect annotation has annotationstate)
                    //
                    // Set features that are not stored in the .json file (e.g. lockMovementX)
                    // based on the state (e.g. disable editing if the annotation state is Annotation.STATE.NONE)
                        Annotation.SetAnnotationEditing(object, object.annotationState);
                    }

                    // tbd - fix cannot move freeDraw objects
                    // // Don't restore the previous annotationState - always load with state of Annotation.STATE.NONE
                    // Annotation.SetAnnotationEditing(object, Annotation.STATE.NONE);

                });
                imageInfo.annotationAsJsonStr = JSON.stringify(dataAsJson);
                // console.log('imageInfo.annotationAsJsonStr', imageInfo.annotationAsJsonStr);

                // updateFabricCanvasFromImageBlobAndAnnotationBlob is only called from loadSelectedImageTextureFromUrl
                // which does not make changes to the image or the annotation, so no need to mark as dirty ?
                imageInfo.annotationBlobInfo = BlobInfo.UpdateMetaDataBlobsInfo({metaDataBlobsInfo: metaDataBlobsInfo, 
                    metaData: imageInfo.annotationAsJsonStr, 
                    filename: imageInfo.annotationFilename, 
                    isDirty: false});
                // update imageInfo within imagesInfo after the annotationBlob has changed
                let imagesInfo = selectedLayer.getImagesInfo();
                imagesInfo.set(imageInfo.imageFilename, imageInfo);

            }
            catch(err) {
                console.error('err', err);
                // raise a toast to indicate the failure
                let toastTitleStr = 'load the annotation';
                let msgStr = 'Error.' + ', err: ' + err;
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                // throw new Error(msgStr);
            }
        }
        else{
            // we may have image without annotation so don't throw
            console.warn('imageInfo.annotationBlobInfo or imageInfo.annotationBlobInfo.blobUrl is invalid');
        }

        // Add the image
        let fabricImage = await this.fabricImageFromURL(imageInfo.imageBlobInfo.blobUrl);
        // the height stays the same, but for a case with e.g. client width 2400 and imageWidth 1200
        // the image will be scaled to fill the entire client width (and not drawn only on the left half)
        fabricImage.scaleToHeight(COL.model.fabricCanvas.height, true);
        fabricImage.set({
            selectable: false,
            name: 'backgroundImage',
            // do not export the image (it is exported into a separate file e.g. backgroundImage.jpg))
            excludeFromExport: true
        });
        COL.model.fabricCanvas.add(fabricImage);

        // let fabricImage1 = COL.model.fabricCanvas.getItemByName('backgroundImage');
        // // set the image to the front of the object stack 
        // fabricImage1.moveTo(0);

        fabricImage = COL.model.fabricCanvas.getItemByName('backgroundImage');
        // set the image to the front of the object stack 
        fabricImage.moveTo(0);

        COL.model.fabricCanvas.renderAll();
        ImageView.Render2();
        this.renderer.renderLists.dispose();
    }

    getImageViewPaneSize() {
        // console.log('BEG ImageView getImageViewPaneSize');
        let imageViewPaneEl = $('#imageViewPaneId');
        let imageViewPaneEl2 = document.getElementById('imageViewPaneId');

        let imageViewPaneId_displayStyle = imageViewPaneEl2.style.display;

        // imageViewPaneSize - the size of the gui window
        let imageViewPaneSize = undefined;
    
        // tbd - maybe change imageViewPaneEl.innerWidth() to imageViewPaneEl.clientWidth() as a pattern ??
        // https://discourse.threejs.org/t/clientx-and-window-innerwidth-question/33271/16
        if(imageViewPaneId_displayStyle !== 'block') {
            // need to set the display style momentarily to block, to get imageViewPaneSize
            imageViewPaneEl2.style.display = 'block';
            imageViewPaneSize = {
                width: imageViewPaneEl.innerWidth(),
                height: imageViewPaneEl.innerHeight(),
            };

            // restore the original value
            imageViewPaneEl2.style.display = imageViewPaneId_displayStyle;
        }
        else{
            imageViewPaneSize = {
                width: imageViewPaneEl.innerWidth(),
                height: imageViewPaneEl.innerHeight(),
            };
        }

        return imageViewPaneSize;
    }

    getImageViewPaneOffset() {
        let imageViewPaneEl = $('#imageViewPaneId');

        return {
            left: imageViewPaneEl.offset().left,
            top: imageViewPaneEl.offset().top,
        };
    }

    getMouse() {
        return this.mouse;
    }

    // a.k.a. screenCoord_to_NDC_Coord
    // Normalized Device Coordinate (NDC)
    // https://threejs.org/docs/#api/en/math/Vector3.unproject
    // NDC_Coord (a.k.a. normalizedMouseCoord, mouseCoord) - is normalized to [-1, 1]
    //
    screenPointCoordToNormalizedCoord(point2d) {
        // console.log('BEG screenPointCoordToNormalizedCoord');

        let mouseCoord = new THREE_Vector2();
        mouseCoord.x = ((point2d.x - this.getImageViewPaneOffset().left -
            this.currentViewportNormalized.x) /
            this.currentViewportNormalized.z) * 2 - 1;

        mouseCoord.y = -((point2d.y - this.getImageViewPaneOffset().top -
            this.currentViewportNormalized.y) /
            this.currentViewportNormalized.w) * 2 + 1;

        return mouseCoord;
    }

    toJSON() {
        console.log('BEG ImageView::toJSON()');

        return {
            camera: this.camera,
            imageViewScene: this.imageViewScene,
            renderer: this.renderer,
            labelRenderer: this.labelRenderer,
            orbitControls: this.orbitControls,
            rotationVal: this.rotationVal,
            flipY: this.flipY,
            surface: this.surface,
            bbox: this.bbox,
            viewportExtendsOnX: this.viewportExtendsOnX,
            currentViewportNormalized: this.currentViewportNormalized,
            imageWidth: this.imageWidth,
            imageHeight: this.imageHeight,
        };
    }

    dispose() {
    // console.log('BEG ImageView::dispose()');

        // ////////////////////////////////////////////////////
        // Before Dispose
        // ////////////////////////////////////////////////////

        // console.log( "Before Dispose");
        let imageViewAsJson = this.toJSON();
        // console.log('imageViewAsJson before dispose', imageViewAsJson);

        if(COL.util.isObjectValid(this.surface)) {
            // this.surface is of type THREE_Sprite for non360 image, or THREE_Mesh for 360 image
            COL.ThreejsUtil.disposeObject(this.surface);
        }

        // ////////////////////////////////////////////////////
        // Dispose
        // https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534
        // ////////////////////////////////////////////////////

        this.imageViewScene.traverse(function (obj) {
            COL.ThreejsUtil.disposeObject(obj);
        });

        // this.renderer is not disposed because it is a member of class Model
        COL.ThreejsUtil.disposeObject(this.labelRenderer);

        // remove event listeners
        this.enableControls(false);

        this.orbitControls.dispose();

        this.bbox = null;

        this.currentViewportNormalized = null;

        this.mouse = null;
        this.raycasterImageView = null;

        // ////////////////////////////////////////////////////
        // After Dispose
        // ////////////////////////////////////////////////////

        // console.log( "After Dispose");

        // let imageViewAsJson2 = this.toJSON();
        // console.log('imageViewAsJson after dispose', imageViewAsJson2);
    }

    getImageViewScene() {
        return this.imageViewScene;
    }

    getlabelRenderer() {
        return this.labelRenderer;
    }

    getCamera() {
        return this.camera;
    }

    setCamera(imageInfo, doRescale) {
        // console.log('BEG setCamera');

        if (doRescale) {
            // //////////////////////////////////////////////////////////////
            // Update the camera to cover the entire image
            // //////////////////////////////////////////////////////////////
            let imageOrientation = Number(imageInfo.imageTags.imageOrientation);
            [this.rotationVal, this.flipY] = COL.OrbitControlsUtils.getRotationParams(imageOrientation);

            let near = -500;
            let far = 1000;

            // tbd - remove previous camera to prevent memory leak ???
            // this.camera.dispose();
            // google threejs dispose OrthographicCamera

            if (ImageTags.Is360Image()) {
                // hardcode for IMG_360example1.jpg
                let fov = 75;
                let aspectRatio = imageInfo.imageWidth / imageInfo.imageHeight;
                let near2 = 1;
                let far2 = 1100;
                this.camera = new THREE_PerspectiveCamera( fov, aspectRatio, near2, far2 );
                this.camera.position.set( 0, 0, ImageView.initialPerspectiveCameraHeightAboveGround );
            }
            else{
                // https://discourse.threejs.org/t/does-change-in-camera-position-impact-the-left-top-right-and-bottom-parameters-of-orthographic-camera/5501
                // left,right,top,bottom are in world units, i.e. for OrthographicCamera: leftBorderX = camera.position.x + (camera.left / camera.zoom);
                //
                // left,right,top,bottom (-50, 50, 50, -50) goes together with surface.scale (100, 100, 1)
                // because the vertices of surface.geometry.attributes.position.data.array which is of type THREE_Sprite are normalized (-0.5 - 0.5)
                // then the combination of left,right,top,bottom (-50, 50, 50, -50), and surface.scale (100, 100, 1) fills in the entire window
                // for combination of left,right,top,bottom (-50, 50, 50, -50), and surface.scale (50, 100, 1) the image covers 1/2 of the window on the x axis
                // for combination of left,right,top,bottom (-200, 200, 200, -200), and surface.scale (100, 100, 1) the image covers 1/4 of the window on the x axis, and on the y axis

                this.camera = new THREE_OrthographicCamera(
                    -(imageInfo.imageWidth / 2),
                    imageInfo.imageWidth / 2,
                    imageInfo.imageHeight / 2,
                    -(imageInfo.imageHeight / 2),
                    near,
                    far
                );
                this.camera.position.set( 0, 0, ImageView.initialOrthographicCameraHeightAboveGround );
            }

            this.camera.updateProjectionMatrix();

            this.orbitControls.camera = this.camera;

            // the camera is invalid so set doRescale to true regardless of it's initial value
            doRescale = true;
        }

        this.camera.updateProjectionMatrix();
    }

    async setTheMeshSurface(imageInfo) {
        console.log('imageInfo.imageBlobInfo.blobUrl', imageInfo.imageBlobInfo.blobUrl);
        let texture = new THREE_CanvasTexture(document.getElementById('canvasId1'));

        let [imageWidth, imageHeight] = COL.OrbitControlsUtils.getWidthHeightFromImageTags(imageInfo.imageTags);
            
        texture.image.width = imageWidth;
        texture.image.height = imageHeight;

        console.log('texture', texture);
        console.log('texture.image', texture.image);
        console.log('texture.image.width', texture.image.width);
        // Update imageInfo
        if (!imageInfo.imageWidth) {
            imageInfo.imageWidth = texture.image.width;
            imageInfo.imageHeight = texture.image.height;
        }
     
        // texture.wrapS = THREE_ClampToEdgeWrapping;
        // texture.wrapT = THREE_ClampToEdgeWrapping;
         
        // Prevent warning when texture is not a power of 2
        // https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
        texture.minFilter = THREE_LinearFilter;
        // texture.generateMipmaps = false;
 
        let rotationVal = 0;
        if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation']))) {
            [rotationVal, texture.flipY] = COL.OrbitControlsUtils.getRotationParams(Number(imageInfo.imageTags.imageOrientation));
        }
        else{
            texture.flipY = false;
        }
         
        // const sphereGeometry = new THREE_SphereGeometry( 0.5, 60, 40 );
        // const sphereGeometry = new THREE_SphereGeometry( 5.0, 60, 40 );
        // const sphereGeometry = new THREE_SphereGeometry( 0.1, 60, 40 );

        let sphereGeometryRadius = 1;
        // hardcode for IMG_360example1.jpg
        // sphereGeometryRadius = 50;
        sphereGeometryRadius = 5;
        // sphereGeometryRadius = 5000;
        // sphereGeometryRadius = 500;

        const sphereGeometry = new THREE_SphereGeometry( sphereGeometryRadius, 60, 40 );
       
        // invert the sphereGeometry on the x-axis so that all of the faces point inward
        sphereGeometry.scale( - 1, 1, 1 );
        const material = new THREE_MeshBasicMaterial( { map: texture } );
        this.surface = new THREE_Mesh( sphereGeometry, material );
        this.surface.name = 'meshSurface';
        this.surface.material.map.needsUpdate = true;

        this.imageViewScene.add(this.surface);
    }

    setTheSpriteSurface(imageInfo) {
        console.log('BEG setTheSpriteSurface');

        // uses fabricjs - see my example in https://discourse.threejs.org/t/how-to-click-on-a-threejs-3dcanvas-to-select-and-modify-a-fabricjs-object/50719
        // demo in https://codepen.io/avnerm/pen/QWZddZv

        let texture = new THREE_CanvasTexture(document.getElementById('canvasId1'));
        let [imageWidth, imageHeight] = COL.OrbitControlsUtils.getWidthHeightFromImageTags(imageInfo.imageTags);
            
        texture.image.width = imageWidth;
        texture.image.height = imageHeight;

        // Update imageInfo
        if (!imageInfo.imageWidth) {
            imageInfo.imageWidth = texture.image.width;
            imageInfo.imageHeight = texture.image.height;
        }
    
        texture.wrapS = THREE_ClampToEdgeWrapping;
        texture.wrapT = THREE_ClampToEdgeWrapping;
        
        // Prevent warning when texture is not a power of 2
        // https://discourse.threejs.org/t/warning-from-threejs-image-is-not-power-of-two/7085
        texture.minFilter = THREE_LinearFilter;
        // texture.generateMipmaps = false;

        let rotationVal = 0;
        if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation']))) {
            [rotationVal, texture.flipY] = COL.OrbitControlsUtils.getRotationParams(Number(imageInfo.imageTags.imageOrientation));
        }
        else{
            texture.flipY = false;
        }
        // --------------------------------------------------------------
        // attenuate the image by drawing the image on a canvas and changing the globalAlpha 
        let spriteMaterial = new THREE_SpriteMaterial({
            map: texture,
            rotation: rotationVal,
            color: 0xffffff,
            transparent: true,
            // opacity: 0.1,
            fog: true
        });
            
        // TBD - delete previously existing this.surface (to prevent memory leak) before adding this spriteSurface?
        this.surface = new THREE_Sprite(spriteMaterial);

        // materialTexture stores the color/texture for the "material" (https://threejs.org/docs/#api/en/materials/MeshBasicMaterial)
        // The object type of materialTexture is: 'Texture' (https://threejs.org/docs/#api/en/textures/Texture)
        let materialTexture = COL.util.getNestedObject(this.surface, ['material', 'map']);
        if (COL.util.isObjectInvalid(materialTexture)) {
            // sanity check
            throw new Error('materialTexture is invalid');
        }


        // ////////////////////////////////////////////////
        // Set the spriteSurface
        // ////////////////////////////////////////////////
        let [scaleX, scaleY] = COL.OrbitControlsUtils.getScaleAndRotation(
            imageInfo.imageWidth,
            imageInfo.imageHeight,
            Number(imageInfo.imageTags.imageOrientation)
        );

        materialTexture.flipY = this.flipY;

        this.surface.position.set(0, 0, 0);
        this.surface.scale.set(scaleX, scaleY, 1);
        this.surface.material.map.flipY = this.flipY;
        this.surface.name = 'spriteSurface1';
        this.surface.material.map.needsUpdate = true;

        // ////////////////////////////////////////////////
        // Set the bbox for the spriteSurface
        // ////////////////////////////////////////////////

        this.bbox = new THREE_Box3().setFromObject(this.surface);
        if (this.surface.material.rotation === 0) {
            // landscape
        }
        else {
            // RemoveME ???
            // portrait
            let minX = this.bbox.min.x;
            this.bbox.min.x = this.bbox.min.y;
            this.bbox.min.y = minX;

            let maxX = this.bbox.max.x;
            this.bbox.max.x = this.bbox.max.y;
            this.bbox.max.y = maxX;

            // // swap via destructuring (ES6)
            // // this.bbox.min.x <-> this.bbox.min.y using
            // // this.bbox.max.x <-> this.bbox.max.y using
            // //
            // // https://dmitripavlutin.com/swap-variables-javascript/
            // [this.bbox.min.x, this.bbox.min.y] = [this.bbox.min.y, this.bbox.min.x]
            // [this.bbox.max.x, this.bbox.max.y] = [this.bbox.max.y, this.bbox.max.x]
        }

        // Add the mesh to the scene
        this.imageViewScene.add(this.surface);
    }

    getBoundingBox() {
        return this.bbox;
    }

    doesViewportExtendOnX() {
        return this.viewportExtendsOnX;
    }

    showStickyNotes(layer) {
        let noteArray = layer.getNoteArray();

        let iter = noteArray.iterator();
        while (iter.hasNext()) {
            let note = iter.next();

            let noteElementId = note.getNoteId();
            let noteElement = document.getElementById(noteElementId);
            if (!noteElement) {
                console.error(
                    'noteElement is not defined for noteElementId:',
                    noteElementId
                );
                continue;
            }

            let selectedLayer = COL.model.getSelectedLayer();
            let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
            if (COL.util.isObjectValid(selectedOverlayRect)) {
                let selectedImageFilename =
          selectedOverlayRect.getSelectedImageFilename();

                if (note.getImageFilename() === selectedImageFilename) {
                    // Show the note
                    noteElement.classList.remove('inactive-note');
                    noteElement.classList.add('active-note');
                    note.activate();
                }
                else {
                    // hide the note
                    noteElement.classList.remove('active-note');
                    noteElement.classList.add('inactive-note');
                    note.deactivate();
                }
            }
            else {
                // hide the note
                noteElement.classList.remove('active-note');
                noteElement.classList.add('inactive-note');
                note.deactivate();
            }
        }
    }

    getRotationVal() {
        return this.rotationVal;
    }

    getFlipY() {
        return this.flipY;
    }

    getOrbitControls() {
        return this.orbitControls;
    }

    setControls() {
        console.log('BEG setControls');

        // Need to be similar to what is in OrbitControlsImageView.js constructor
        let imageViewPaneEl = document.getElementById('imageViewPaneId');

        this.orbitControls = new OrbitControlsImageView(
            this.camera,
            imageViewPaneEl
        );

        // ////////////////////////////////////
        // Set default zoom related parameters
        // ////////////////////////////////////

        this.orbitControls.zoomSpeed = 0.8;
        this.orbitControls.minZoom = 1;
        this.orbitControls.maxZoom = Infinity;

        // ////////////////////////////////////
        // Set pan related parameters
        // ////////////////////////////////////

        // if true, pan in screen-space
        this.orbitControls.screenSpacePanning = true;

        this.orbitControls.panSpeed = 0.6;

        this.enableControls(true);
    }

    initializeOrbitControlsImageView() {
        console.log('BEG initializeOrbitControlsImageView');

        let imageViewPaneEl = document.getElementById('imageViewPaneId');
        this.orbitControls = new OrbitControlsImageView(
            this.camera,
            imageViewPaneEl
        );

        // ////////////////////////////////////
        // Set rotate related parameters
        // ////////////////////////////////////

        // No rotation.
        this.orbitControls.enableRotate = false;

        // Set the rotation angle (with 0 angle change range) to 0
        // coordinate axis system is:
        // x-red - directed right (on the screen), z-blue directed down (on the screen), y-green directed towards the camera
        this.orbitControls.minPolarAngle = 0; // radians
        this.orbitControls.maxPolarAngle = 0; // radians

        // No orbit horizontally.
        this.orbitControls.minAzimuthAngle = 0; // radians
        this.orbitControls.maxAzimuthAngle = 0; // radians

        // ////////////////////////////////////
        // Set zoom related parameters
        // ////////////////////////////////////

        this.orbitControls.zoomSpeed = 1.2;
        // this.orbitControls.minZoom = 1;
        // this.orbitControls.maxZoom = Infinity;

        // ////////////////////////////////////
        // Set pan related parameters
        // ////////////////////////////////////

        this.orbitControls.panSpeed = 0.6;
        // if true, pan in screen-space
        this.orbitControls.screenSpacePanning = true;
        // // pixels moved per arrow key push
        // this.orbitControls.keyPanSpeed = 7.0;

        this.orbitControls.keys = [65, 83, 68, 70, 71, 72];

        // https://css-tricks.com/snippets/javascript/javascript-keycodes/
        // shift        16
        // ctrl         17
        // alt  18

        $(document).keydown(function (event) {
            // ASCII 72 is 'h', so clicking Ctrl+h (or Meta+Shift+h) is intercepted here.
            // Inside the code calls the ImageView.reset, i.e.
            // Ctrl+h is mapped to reseting the view of the scene

            if (
                (event.ctrlKey || (event.metaKey && event.shiftKey)) &&
        event.which === 72
            ) {
                event.preventDefault();
                this.orbitControls.reset();
            }
        });

        // need to set this.camera.position after construction of this.orbitControls
        this.camera.position.copy(
            ImageView.initialCameraHeightPosition
        );
        this.camera.zoom = 0.42;

        this.orbitControls.target.copy(this.camera.position);
        // initial this.orbitControls.target.Y is set to 0
        this.orbitControls.target.setY(COL.y0);

        // enable this.orbitControls
        this.enableControls(true);
    }

    enableControls(doEnable) {
        // console.log('BEG enableControls');

        let imageViewPaneEl = document.getElementById('imageViewPaneId');

        if (doEnable) {
            imageViewPaneEl.addEventListener('contextmenu', onContextMenu_imageView, {
                capture: false,
                passive: false,
            });
            imageViewPaneEl.addEventListener('pointerdown', onPointerDown_imageView, {
                capture: false,
                passive: false,
            });
            imageViewPaneEl.addEventListener('pointerup', onPointerUp_imageView, {
                capture: false,
                passive: false,
            });
            // wheel event can happen on touch device when debugging via desktop with mouse
            imageViewPaneEl.addEventListener('wheel', onWheel_imageView, {
                capture: false,
                passive: false,
            });
            imageViewPaneEl.addEventListener('keydown', onKeyDown_imageView, {
                capture: false,
                passive: false,
            });
        }
        else {
            imageViewPaneEl.removeEventListener( 'contextmenu', onContextMenu_imageView,{
                capture: false,
                passive: false }
            );
            imageViewPaneEl.removeEventListener( 'pointerdown', onPointerDown_imageView,{
                capture: false,
                passive: false }
            );
            imageViewPaneEl.removeEventListener('pointerup', onPointerUp_imageView, {
                capture: false,
                passive: false,
            });
            // wheel event can happen on touch device when debugging via desktop with mouse
            imageViewPaneEl.removeEventListener('wheel', onWheel_imageView, {
                capture: false,
                passive: false,
            });
            imageViewPaneEl.removeEventListener('keydown', onKeyDown_imageView, {
                capture: false,
                passive: false,
            });
        }
    }

    clearImageObjectsFromScene() {
        // console.log('BEG clearImageObjectsFromScene');

        // Remove objects of type 'Sprite' (non360 image) and type 'Mesh' (360 image) from the scene when creating the meshes and adding them to the scene
        for (let i = this.imageViewScene.children.length - 1; i >= 0; i--) {
            if (this.imageViewScene.children[i].type == 'Sprite' ||
                this.imageViewScene.children[i].type == 'Mesh') {
                // three js remove vs dispose
                // https://discourse.threejs.org/t/correctly-remove-mesh-from-scene-and-dispose-material-and-geometry/5448
                // renderer.renderLists.dispose();
                const object = this.imageViewScene.children[i];
                object.geometry.dispose();
                object.material.dispose();
                this.imageViewScene.remove(object);
            }
        }
    }
    
    // this function loads the texture to the imageViewPane
    //
    // surface, and imageInfo - store complementary information of the image
    // surface - stores the texture image (in surface.material.map)
    // imageInfo - stores metadata information e.g. the imageWidth, imageHeight, but not the actual image map.

    //   tbd - loadSelectedImageTextureFromUrl -> loadSelectedImageTextureFromUrl + loadSelectedImageAnnotationFromUrl
    async loadSelectedImageTextureFromUrl(imageInfo) {
        try{
            // ///////////////////////////////////////////////////
            // sanity checks
            // ///////////////////////////////////////////////////
    
            if (COL.model.isStickyNotesEnabled()) {
                let imageViewPaneEl = $('#imageViewPaneId');
                imageViewPaneEl.append(this.labelRenderer.domElement);
            }
    
            // ///////////////////////////////////////////////////
            // clear any pre-existing objects from the scene, now that we are loading a new image
            // ///////////////////////////////////////////////////
    
            this.clearImageObjectsFromScene();

            // ////////////////////////////////////////////////
            // Set the camera
            // ////////////////////////////////////////////////

            let doRescale = true;

            if (ImageTags.Is360Image()) {
                await this.setTheMeshSurface(imageInfo);
            }
            else{
                // this function resets the spriteSurface to default values, with new canvas texture
                this.setTheSpriteSurface(imageInfo);
            }

            // ////////////////////////////////////////////////
            // Set:
            // camera
            // spriteSurface
            // ////////////////////////////////////////////////
            this.setCamera(imageInfo, doRescale);
            this.updateCameraAndCanvas(imageInfo, doRescale);
            await this.updateFabricCanvasFromImageBlobAndAnnotationBlob(imageInfo);
        } 
        catch(err) {
            console.error('err', err);

            // raise a toast to indicate the failure
            let toastTitleStr = 'load SelectedImageTextureFromUrl';
            let msgStr = 'Error. imageFilename: ' + imageInfo.imageFilename + ', err: ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            throw new Error(msgStr);
        }
    }

    async addAnnotationShape2(shape) {
        // console.log('BEG addAnnotationShape2');
    
        let selectedLayer = COL.model.getSelectedLayer();
        let imageInfo = ImageInfo.getSelectedImageInfo(selectedLayer);
        imageInfo.addAnnotationShape3(shape);

        // sync the updated imageInfo to the webServer after adding an annotation.
        await imageInfo.updateAnnotationBlob();
    }

    static GetPointFromPointerEvent() {
        // console.log('BEG ImageView.GetPointFromPointerEvent');
    
        if(ImageView.pointerEventCache.length == 0){
            throw new Error('The value of ImageView.pointerEventCache.length is invalid: ' + ImageView.pointerEventCache.length);
        }
    
        let point2d = new THREE_Vector2(ImageView.pointerEventCache[0].pageX, ImageView.pointerEventCache[0].pageY);
        return point2d;
    }
    
    static Render2() {
    // console.log('BEG ImageView Render2');

        // "Render2" does not work as a "class instance method"
        // if using "this" in the line: "this.orbitControls.addEventListener('change', this.Render2);"
        // when called from OrbitControlsImageView, "this" maps to "OrbitControlsImageView" (instead of "ImageView")
        // as a result, the "this.renderer", "this.imageViewScene", "this.camera" are undefined
        //
        // by:
        // 1. making it a "class static method", and
        // 2. calling COL.model.getImageView() to get imageView
        // the local variables "renderer2", "imageViewScene", "camera" are valid
        //
        // tbd - check if other "addEventListener(.." involve this in other places in the project.
        //       can be a problem
        //       e.g. in GoogleUploadBlobToDrive.js: xhr.upload.addEventListener('progress', this.onProgress)

        let imageView = COL.model.getImageView();
        let imageViewScene = imageView.getImageViewScene();
        let camera = imageView.getCamera();
        let labelRenderer2 = imageView.getlabelRenderer();

        imageView.renderer.render(imageViewScene, camera);

        if (COL.model.isStickyNotesEnabled()) {
            labelRenderer2.render(imageViewScene, camera);
        }
    }

    // updateCameraAndCanvas - updates the camera and the canvas for a specific texture:
    //
    //  - sets the camera
    //    - sets the camera position
    //       - if camera of the specific texture does NOT pre-exists, to the center of the image, and height to ImageView::initialCameraHeightAboveGround, or
    //       - if camera of the specific texture does pre-exists, to the previous camera position
    //
    //  - sets the renderer viewport
    //    - calls calcCanvasParams (e.g. offsetLeft, offsetTop) to set the viewport
    //
    //   - sets imageInfo attributes from the specific texture, to save the current state of the texture view (e.g. zoom)

    updateCameraAndCanvas( imageInfo, doRescale ) {
        // console.log('BEG updateCameraAndCanvas');

        // console.log('doRescale', doRescale);
        // ///////////////////////////////////////////////////////////////////////////////////
        // Set this.camera to default position (where the selected image is centered and fills the entire canvas)
        // ///////////////////////////////////////////////////////////////////////////////////

        let imageOrientation = COL.util.getNestedObject(imageInfo, [
            'imageTags',
            'imageOrientation',
        ]);
        if (COL.util.isObjectInvalid(imageOrientation)) {
            imageOrientation = -1;
        }

        let imageViewPaneSize = this.getImageViewPaneSize();
        let guiWindowWidth = imageViewPaneSize.width;
        let guiWindowHeight = imageViewPaneSize.height;

        let retVal = undefined;

        if (doRescale) {
            // ////////////////////////////////////////////////////////////////////
            // Set the camera frustum, zoom to cover the entire image
            // ////////////////////////////////////////////////////////////////////

            this.imageWidth = COL.util.getNestedObject(this.surface, [
                'material',
                'map',
                'image',
                'width',
            ]);
            if (COL.util.isNumberInvalid(this.imageWidth)) {
                console.error('this.surface', this.surface);
                throw new Error(
                    'this.surface.material.map.image.width is invalid.'
                );
            }

            this.imageHeight = COL.util.getNestedObject(this.surface, [
                'material',
                'map',
                'image',
                'height',
            ]);
            if (COL.util.isNumberInvalid(this.imageHeight)) {
                throw new Error(
                    'this.surface.material.map.image.height is invalid.'
                );
            }

            retVal = this.orbitControls.setCameraFrustumAndZoomAndCanvas(
                guiWindowWidth,
                guiWindowHeight,
                this.imageWidth,
                this.imageHeight,
                imageOrientation,
                doRescale
            );
        }
        else {
            // ////////////////////////////////////////////////////////////////////
            // Get the scale and image ratio from the existing camera setting
            // ////////////////////////////////////////////////////////////////////

            let [scaleX, scaleY] = COL.OrbitControlsUtils.getScaleAndRotation(
                this.camera.right - this.camera.left,
                this.camera.top - this.camera.bottom,
                imageOrientation
            );

            this.imageWidth = this.camera.right - this.camera.left;
            this.imageHeight = this.camera.top - this.camera.bottom;

            let isImageViewPane = true;
            let retVal1 = COL.OrbitControlsUtils.calcCanvasParams(
                guiWindowWidth,
                guiWindowHeight,
                this.imageWidth,
                this.imageHeight,
                isImageViewPane
            );
            // console.log('retVal1', retVal1);

            retVal = {
                scaleX: scaleX,
                scaleY: scaleY,
                viewportExtendsOnX: retVal1.viewportExtendsOnX,
                canvasOffsetLeft: retVal1.canvasOffsetLeft,
                canvasOffsetTop: retVal1.canvasOffsetTop,
                canvasWidth: retVal1.canvasWidth,
                canvasHeight: retVal1.canvasHeight,
            };

            this.orbitControls.setMinZoom(
                guiWindowWidth,
                guiWindowHeight,
                this.imageWidth,
                this.imageHeight,
                retVal1.canvasWidth,
                retVal1.canvasHeight
            );

            this.camera.updateProjectionMatrix();
        }

        // ///////////////////////////////////////////////////////////////////////////////////
        // Scale the texture such that it fits the entire image
        // ///////////////////////////////////////////////////////////////////////////////////

        this.surface.scale.set(retVal.scaleX, retVal.scaleY, 1);
        this.viewportExtendsOnX = retVal.viewportExtendsOnX;

        // tbd - should imageViewPaneSize be set only one time ???
        this.renderer.setSize(
            guiWindowWidth,
            guiWindowHeight
        );

        COL.model.fabricCanvas.set({'top': retVal.canvasOffsetTop,
            'left': retVal.canvasOffsetLeft,
            'width': retVal.canvasWidth,
            'height': retVal.canvasHeight,
        });

        // setDimensions is needed, in addition the above "fabricCanvas.set(...", to set the lowerCanvas ?
        // (otherwise the image is not renderred properly)
        COL.model.fabricCanvas.setDimensions({width:retVal.canvasWidth, height:retVal.canvasHeight});

        // set fabricCanvas.freeDrawingBrush.width - normalize the thickness to be the same, regardless of the canvas size.
        // the reference canvas width 2465 is chosen arbitrarily (based on an example use case where the canvas 
        // width empirically matches this value in a an desktop GUI window)
        let referenceCanvasWidth = 2465;
        let ratio = COL.model.fabricCanvas.width / referenceCanvasWidth;
        COL.model.fabricCanvas.freeDrawingBrush.width = ratio * 10;
        console.log('COL.model.fabricCanvas.freeDrawingBrush.width', COL.model.fabricCanvas.freeDrawingBrush.width);

        COL.model.fabricCanvas.renderAll();

        if (COL.model.isStickyNotesEnabled()) {
            this.labelRenderer.setSize(retVal.canvasWidth, retVal.canvasHeight);
        }

        // Set viewport
        this.renderer.setViewport(
            -retVal.canvasOffsetLeft,
            -retVal.canvasOffsetTop,
            retVal.canvasWidth,
            retVal.canvasHeight
        );

        let currentViewport = new THREE_Vector4();
        this.renderer.getCurrentViewport(currentViewport);

        let pixelRatio = this.renderer.getPixelRatio();
        this.currentViewportNormalized = new THREE_Vector4();
        this.currentViewportNormalized.copy(currentViewport);
        this.currentViewportNormalized.divideScalar(pixelRatio);

        if (doRescale) {
            this.orbitControls.setZoom(this.orbitControls.minZoom);
            this.camera.updateProjectionMatrix();
        }
        ImageView.Render2();
    }
}

// /////////////////////////////////
// BEG Static class variables
// /////////////////////////////////

// cameraPlanViewHeight -> 2000
ImageView.initialCameraHeightPosition = new THREE_Vector3(
    643,
    603,
    2000
);
ImageView.initialOrthographicCameraHeightAboveGround = 80;
// hardcode for IMG_360example1.jpg
ImageView.initialPerspectiveCameraHeightAboveGround = 0;

ImageView.overlayRectRadius = 40;
ImageView.pozitionZ = 0.1;
ImageView.doDrawTwoFingerTouchCenterPoint = false;
ImageView.pointerEventCache = [];
ImageView.orbitControlsImageViewStateCache = [];

// /////////////////////////////////
// END Static class variables
// /////////////////////////////////

// INIT

// $(window).on('load', ...) happens after $(window).ready
// $(window).ready(function () {
$(window).on('load', function () {});

$(document).on('SceneLayerSelected', function (event, layer) {
    // console.log('BEG SceneLayerSelected');
});

function onContextMenu_imageView(event) {
    console.log('BEG onContextMenu_imageView');
    let imageView = COL.model.getImageView();
    let orbitControls = imageView.getOrbitControls();
    orbitControls.handleContextMenu_imageView(event);
}

export { ImageView };
