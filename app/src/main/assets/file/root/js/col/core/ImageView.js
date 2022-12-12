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
    DoubleSide as THREE_DoubleSide,
    Mesh as THREE_Mesh,
    LineBasicMaterial as THREE_LineBasicMaterial,
    Line as THREE_Line,
    BufferGeometry as THREE_BufferGeometry,
    OrthographicCamera as THREE_OrthographicCamera,
    SpriteMaterial as THREE_SpriteMaterial,
    Sprite as THREE_Sprite,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from './Model.js';
import { Layer } from './Layer.js';
import { ImageInfo } from './ImageInfo.js';
import '../gui/Component.js';
import { CSS2DRenderer } from '../../static/CSS2DRenderer.js';
import { OrbitControlsImageView } from '../orbitControl/OrbitControlsImageView.js';
import '../orbitControl/OrbitControlsUtils.js';
import '../util/Util.js';
import '../util/ThreejsUtil.js';

import { onMouseDownOrTouchStart_imageView, onMouseWheel_imageView, onKeyDown_imageView } from './ImageView_eventListeners.js';

class ImageView {
    constructor() {
        this.camera;
        this.imageViewScene;
        this.renderer;
        this.labelRenderer;
        this.orbitControls;
        this.rotationVal = 0;
        this.flipY = true;

        // https://threejs.org/docs/#api/en/objects/Sprite
        // sprite is the threejs planar Sprite object to show the selected images
        this.sprite;

        // Bounding box around the texture image
        this.bbox;

        this.viewportExtendsOnX = false;
        this.currentViewportNormalized;

        this.imageWidth = undefined;
        this.imageHeight = undefined;

        this.doDisplayImageDetails = false;
    }

    initSelectedView () {
    // console.log('BEG initSelectedView');

        // ////////////////////////////////////
        // Set camera related parameters
        // ////////////////////////////////////

        // https://discourse.threejs.org/t/does-change-in-camera-position-impact-the-left-top-right-and-bottom-parameters-of-orthographic-camera/5501
        // left,right,top,bottom are in world units, i.e. for OrthographicCamera: leftBorderX = camera.position.x + (camera.left / camera.zoom);
        //
        // left,right,top,bottom (-50, 50, 50, -50) goes together with sprite.scale (100, 100, 1)
        // because the vertices of sprite.geometry.attributes.position.data.array which is of type THREE_Sprite are normalized (-0.5 - 0.5)
        // then the combination of left,right,top,bottom (-50, 50, 50, -50), and sprite.scale (100, 100, 1) fills in the entire window
        // for combination of left,right,top,bottom (-50, 50, 50, -50), and sprite.scale (50, 100, 1) the image covers 1/2 of the window on the x axis
        // for combination of left,right,top,bottom (-200, 200, 200, -200), and sprite.scale (100, 100, 1) the image covers 1/4 of the window on the x axis, and on the y axis

        let left = -100;
        let right = 100;
        let top = 50;
        let bottom = -50;
        let near = -500;
        let far = 1000;

        this.camera = new THREE_OrthographicCamera(
            left,
            right,
            top,
            bottom,
            near,
            far
        );
        this.camera.name = 'camera';
        this.camera.position.set(0, 0, 80);

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
            // Add centerPoint between two-finger touch
            // Update the two-finger touch points
            // ////////////////////////////////////////////////////////////

            let numSegments = 32;
            const geometry = new THREE_CircleGeometry(
                ImageView.overlayRectRadius,
                numSegments
            );
            const material = new THREE_MeshBasicMaterial({
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                color: COL.util.Color.Red,
            });

            this.texCenterPoint_twoFingerTouch = new THREE_Mesh(geometry, material);
            this.texCenterPoint_twoFingerTouch.name = 'texCenterPoint_twoFingerTouch';
            this.texCenterPoint_twoFingerTouch.visible = true;
            this.texCenterPoint_twoFingerTouch.updateMatrixWorld();
            this.imageViewScene.add(this.texCenterPoint_twoFingerTouch);

            // # --------------------------------------------------------------
            // Add the two-finger touch points

            const geometry0 = new THREE_CircleGeometry(
                2 * ImageView.overlayRectRadius,
                numSegments
            );
            this.twoFingerTouchPt0 = new THREE_Mesh(geometry0, material);
            this.twoFingerTouchPt0.name = 'twoFingerTouchPt0';
            this.twoFingerTouchPt0.visible = true;
            this.twoFingerTouchPt0.updateMatrixWorld();
            this.imageViewScene.add(this.twoFingerTouchPt0);

            this.twoFingerTouchPt1 = new THREE_Mesh(geometry0, material);
            this.twoFingerTouchPt1.name = 'twoFingerTouchPt1';
            this.twoFingerTouchPt1.visible = true;
            this.twoFingerTouchPt1.updateMatrixWorld();
            this.imageViewScene.add(this.twoFingerTouchPt1);

            // # --------------------------------------------------------------
            // Add the line between the two-finger touch points

            const material2 = new THREE_LineBasicMaterial({
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                linewidth: 80,
                color: COL.util.Color.Red,
            });

            // https://sbcode.net/threejs/geometry-to-buffergeometry/

            // const geometry2 = new THREE_Geometry();
            // geometry2.vertices.push(new THREE_Vector3(-10, 0, ImageView.pozitionZ));
            // geometry2.vertices.push(new THREE_Vector3(0, 10, ImageView.pozitionZ));

            const points = [];
            points.push(new THREE.Vector3(-5, 0, 0));
            points.push(new THREE.Vector3(5, 0, 0));
            const geometry2 = new THREE.BufferGeometry().setFromPoints(points);

            this.texLineBetween_twoFingerTouch = new THREE_Line(geometry2, material2);
            this.texLineBetween_twoFingerTouch.name = 'texLineBetween_twoFingerTouch';
            this.texLineBetween_twoFingerTouch.visible = true;
            this.texLineBetween_twoFingerTouch.updateMatrixWorld();
            this.imageViewScene.add(this.texLineBetween_twoFingerTouch);
        }

        // //////////////////////////////////////////////////
        // EVENT HANDLERS
        // //////////////////////////////////////////////////

        let imageViewPaneEl = document.getElementById('imageViewPaneId');
        if (COL.util.isTouchDevice()) {
            imageViewPaneEl.addEventListener(
                'touchmove',
                this.orbitControls.update.bind(this.orbitControls),
                { capture: false, passive: false }
            );
        }
        else {
            imageViewPaneEl.addEventListener(
                'mousemove',
                this.orbitControls.update.bind(this.orbitControls),
                { capture: false, passive: false }
            );
            imageViewPaneEl.addEventListener(
                'mousewheel',
                this.orbitControls.update.bind(this.orbitControls),
                { capture: false, passive: false }
            );
            imageViewPaneEl.addEventListener(
                'DOMMouseScroll',
                this.orbitControls.update.bind(this.orbitControls),
                { capture: false, passive: false }
            ); // firefox
        }

        this.orbitControls.addEventListener('change', function () {
            // console.log('intercepted orbitControls "change" event');
            ImageView.render2();
        });

        $(window).resize(function () {
            // console.log('BEG ImageView window resize2');
            let selectedLayer = COL.model.getSelectedLayer();

            if (COL.util.isObjectValid(selectedLayer)) {
                let imageView = selectedLayer.getImageView();

                let sprite = selectedLayer.getSprite();
                let materialTexture = COL.util.getNestedObject(sprite, [
                    'material',
                    'map',
                ]);

                if (COL.util.isObjectValid(materialTexture)) {
                    let doRescale = false;
                    imageView.set_camera_canvas_renderer_and_viewport2(
                        selectedLayer,
                        materialTexture,
                        doRescale
                    );
                }
            }
        });
    }

    getImageViewPaneSize() {
        // console.log('BEG ImageView getImageViewPaneSize');
        let imageViewPaneEl = $('#imageViewPaneId');
        let overlayRectPaneWrapperEl = document.getElementById('overlayRectPaneWrapperId');
        let imageViewPaneEl2 = document.getElementById('imageViewPaneId');

        let overlayRectPaneWrapperId_displayStyle = overlayRectPaneWrapperEl.style.display;
        let imageViewPaneId_displayStyle = imageViewPaneEl2.style.display;

        // imageViewPaneSize - the size of the gui window
        let imageViewPaneSize = undefined;
    
        if(overlayRectPaneWrapperId_displayStyle !== 'block' || imageViewPaneId_displayStyle !== 'block') {
            // need to set the display style momentarily to block, to get imageViewPaneSize
            overlayRectPaneWrapperEl.style.display = 'block';
            imageViewPaneEl2.style.display = 'block';
            imageViewPaneSize = {
                width: imageViewPaneEl.innerWidth(),
                height: imageViewPaneEl.innerHeight(),
            };

            // restore the original value
            overlayRectPaneWrapperEl.style.display = overlayRectPaneWrapperId_displayStyle;
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
            sprite: this.sprite,
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

        COL.ThreejsUtil.disposeObject(this.sprite);

        this.bbox = null;

        this.currentViewportNormalized = null;

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

    // set_camera_canvas_renderer_and_viewport2 - does for a specific texture:
    //
    //  - sets the camera
    //    - sets the camera position
    //       - if camera of the specific texture does NOT pre-exists, sets the camera Frustum And Zoom
    //       - if camera of the specific texture does pre-exists, sets the camera position to the previous camera position
    //
    //  - sets orbitControls
    //    - sets the orbitControls.camera, orbitControls.target, orbitControls.minZoom
    //       - if the specific texture already has a camera, sets variables of the orbitControls object from the new camera
    //       - if the specific texture already does NOT have a camera, sets variables of the orbitControls object from the existing settings for the texture
    //
    //  - sets sprite
    //    - adds sprite imageViewScene
    //
    //  - updateCameraAndCanvasForTheSelectedImage
    //    -- calls OrbitControlsPlanView::setCameraAndCanvas - does xxx
    //
    //  - sets _rendererPlanView
    //  - sets currentViewportNormalized

    set_camera_canvas_renderer_and_viewport2(
        layer,
        materialTexture,
        doRescale
    ) {
    // console.log('BEG set_camera_canvas_renderer_and_viewport2');

        let imageInfo = ImageInfo.getSelectedImageInfo(layer);
        if (COL.util.isObjectInvalid(imageInfo)) {
            console.error('imageInfo is not defined');
            return;
        }

        let imageOrientation = -1;
        if (
            COL.util.isObjectValid(
                COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation'])
            )
        ) {
            imageOrientation = Number(imageInfo.imageTags.imageOrientation);
        }

        // ////////////////////////////////////////////////
        // Set the camera
        // ////////////////////////////////////////////////

        let cameraInfo = imageInfo.cameraInfo;

        // use cameraFrustumLeftPlane as indication to if the camera is valid
        let cameraFrustumLeftPlane = COL.util.getNestedObject(imageInfo, [
            'cameraInfo',
            'cameraFrustumLeftPlane',
        ]);
        let cameraFrustumLeftPlane_isValid = COL.util.isObjectValid(
            cameraFrustumLeftPlane
        );
        if (doRescale) {
            cameraFrustumLeftPlane_isValid = undefined;
        }

        let flipY = true;
        if (cameraFrustumLeftPlane_isValid) {
            // //////////////////////////////////////////////////////////////
            // Set this.camera from existing camera setting for this image (e.g. from imageInfo.cameraInfo.cameraFrustumLeftPlane)
            // this.camera is assigned WITHOUT CLONE,
            // so changes in orbitControls (OrbitControlsImageView.js) e.g. zoom-in are reflected in cameraInfo.camera22
            // //////////////////////////////////////////////////////////////

            this.orbitControls.setFromCameraInfo(cameraInfo);
            this.rotationVal = cameraInfo.rotationVal;
            this.flipY = cameraInfo.flipY;
            // position of this.camera is set from previous camera setting for this image
        }
        else {
            // //////////////////////////////////////////////////////////////
            // Update the camera to cover the entire image
            // //////////////////////////////////////////////////////////////

            let rotationParams =
        COL.OrbitControlsUtils.getRotationParams(imageOrientation);

            this.rotationVal = rotationParams.rotationVal;
            this.flipY = rotationParams.flipY;

            let near = -500;
            let far = 1000;

            // tbd - remove previous camera to prevent memory leak ???
            // this.camera.dispose();
            // google threejs dispose OrthographicCamera

            this.camera = new THREE_OrthographicCamera(
                -(materialTexture.image.width / 2),
                materialTexture.image.width / 2,
                materialTexture.image.height / 2,
                -(materialTexture.image.height / 2),
                near,
                far
            );
            this.camera.position.set(
                0,
                0,
                ImageView.initialCameraHeightAboveGround
            );
            this.camera.updateProjectionMatrix();

            this.orbitControls.camera = this.camera;

            // tbd - redundant ? (also called from this.updateCameraAndCanvasForTheSelectedImage())
            imageInfo.setCameraInfo(this.orbitControls, this.rotationVal, this.flipY);

            // the camera is invalid so set doRescale to true regardless of it's initial value
            doRescale = true;
        }

        this.camera.updateProjectionMatrix();

        // ////////////////////////////////////////////////
        // Set the sprite
        // ////////////////////////////////////////////////

        let retVal = COL.OrbitControlsUtils.getScaleAndRatio(
            this.camera.right - this.camera.left,
            this.camera.top - this.camera.bottom,
            imageOrientation
        );

        materialTexture.flipY = this.flipY;

        let material = new THREE_SpriteMaterial({
            map: materialTexture,
            color: 0xffffff,
            rotation: this.rotationVal,
            fog: true,
        });
        let spriteTmp = new THREE_Sprite(material);
        spriteTmp.position.set(0, 0, 0);
        spriteTmp.scale.set(retVal.scaleX, retVal.scaleY, 1);
        spriteTmp.name = 'sprite';

        // TBD - delete previously existing this.sprite (to prevent memory leak ??)
        this.sprite = spriteTmp;

        // ////////////////////////////////////////////////
        // Set the bbox for the sprite
        // ////////////////////////////////////////////////

        this.bbox = new THREE_Box3().setFromObject(this.sprite);
        if (this.sprite.material.rotation === 0) {
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

        // console.log('this.bbox.min', this.bbox.min);
        // console.log('this.bbox.max', this.bbox.max);

        // Add the mesh to the scene
        this.imageViewScene.add(this.sprite);

        this.updateCameraAndCanvasForTheSelectedImage(
            layer,
            cameraFrustumLeftPlane_isValid,
            doRescale
        );
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

    getControls() {
        return this.orbitControls;
    }

    setControls() {
    // console.log('BEG setControls');

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
    // console.log('BEG initializeOrbitControlsImageView');

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
            if (COL.util.isTouchDevice()) {
                imageViewPaneEl.addEventListener('touchstart', onMouseDownOrTouchStart_imageView, {
                    capture: false,
                    passive: false,
                });
            }
            else {
                imageViewPaneEl.addEventListener('mousedown', onMouseDownOrTouchStart_imageView, {
                    capture: false,
                    passive: false,
                });
                imageViewPaneEl.addEventListener('wheel', onMouseWheel_imageView, {
                    capture: false,
                    passive: false,
                });
            }
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

            if (COL.util.isTouchDevice()) {
                imageViewPaneEl.removeEventListener( 'touchstart', onMouseDownOrTouchStart_imageView,{
                    capture: false,
                    passive: false }
                );
            }
            else {
                imageViewPaneEl.removeEventListener('mousedown', onMouseDownOrTouchStart_imageView, {
                    capture: false,
                    passive: false,
                });
                imageViewPaneEl.removeEventListener('wheel', onMouseWheel_imageView, {
                    capture: false,
                    passive: false,
                });
            }
            imageViewPaneEl.removeEventListener('keydown', onKeyDown_imageView, {
                capture: false,
                passive: false,
            });
        }
    }

    // loadImageToCanvas - loads the texture to the imageViewPane
    //
    // sprite, and imageInfo - store complementary information of the image
    // sprite - stores the texture image (in sprite.material.map)
    // imageInfo - stores metadata information e.g. the imageWidth, imageHeight, but not the actual image map.

    loadImageToCanvas(layer, sprite) {
        let imageInfoVec = layer.getImagesInfo();
        // tbd - tbd1 - get rid of selectedOverlayRect, instead use the name from sprite ???
        let selectedOverlayRect = layer.getSelectedOverlayRect();
        if (COL.util.isObjectInvalid(selectedOverlayRect)) {
            // sanity check
            throw new Error('selectedOverlayRect is invalid');
        }
        let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
        let imageInfo = imageInfoVec.getByKey(selectedImageFilename);

        if (COL.util.isObjectInvalid(sprite)) {
            throw new Error('sprite is invalid');
        }

        if (COL.model.isStickyNotesEnabled()) {
            let imageViewPaneEl = $('#imageViewPaneId');
            imageViewPaneEl.append(this.labelRenderer.domElement);
        }

        // Always remove everything from the scene when creating the meshes and adding them to the scene
        for (let i = this.imageViewScene.children.length - 1; i >= 0; i--) {
            if (this.imageViewScene.children[i].type == 'Sprite') {
                // three js remove vs dispose
                // https://discourse.threejs.org/t/correctly-remove-mesh-from-scene-and-dispose-material-and-geometry/5448
                // renderer.renderLists.dispose();
                const object = this.imageViewScene.children[i];
                object.geometry.dispose();
                object.material.dispose();
                this.imageViewScene.remove(object);
            }
        }

        // materialTexture stores the color/texture for the "material" (https://threejs.org/docs/#api/en/materials/MeshBasicMaterial)
        // The object type of materialTexture is: 'Texture' (https://threejs.org/docs/#api/en/textures/Texture)
        let materialTexture = sprite.material.map;
        // materialTexture.needsUpdate = true;

        if (!imageInfo.imageWidth) {
            imageInfo.imageWidth = materialTexture.image.width;
            imageInfo.imageHeight = materialTexture.image.height;
        }
        imageInfoVec.set(selectedImageFilename, imageInfo);
        layer.setImagesInfo(imageInfoVec);
        // console.log('imageInfoVec.size()', imageInfoVec.size());

        // ////////////////////////////////////////////////
        // Set:
        // camera
        // sprite
        // bbox for the sprite
        // ////////////////////////////////////////////////

        let doRescale = false;
        // tbd - doRescale should be set to false to preserve the zoom-in state when visiting a pre-visited image
        // (it is currently set to true - to work arounsd a bug where sometimes images get the attributes of other images
        //  and appear rotated)
        doRescale = true;
        this.set_camera_canvas_renderer_and_viewport2(
            layer,
            materialTexture,
            doRescale
        );
        // this.showStickyNotes(layer);
    }

    static render2() {
    // console.log('BEG ImageView render2');

        // "render2" does not work as a "class instance method"
        // if using "this" in the line: "this.orbitControls.addEventListener('change', this.render2);"
        // when called from OrbitControlsImageView, "this" maps to "OrbitControlsImageView" (instead of "ImageView")
        // as a result, the "this.renderer", "this.imageViewScene", "this.camera" are undefined
        //
        // by:
        // 1. making it a "class static method", and
        // 2. calling selectedLayer.getImageView() to get imageView
        // the local variables "renderer2", "imageViewScene", "camera" are valid
        //
        // tbd - check if other "addEventListener(.." involve this in other places in the project.
        //       can be a problem
        //       e.g. in GoogleUploadBlobToDrive.js: xhr.upload.addEventListener('progress', this.onProgress)

        let selectedLayer = COL.model.getSelectedLayer();
        if (COL.util.isObjectValid(selectedLayer)) {
            let imageView = selectedLayer.getImageView();
            let imageViewScene = imageView.getImageViewScene();
            let camera = imageView.getCamera();
            let labelRenderer2 = imageView.getlabelRenderer();

            imageView.renderer.render(imageViewScene, camera);

            if (COL.model.isStickyNotesEnabled()) {
                labelRenderer2.render(imageViewScene, camera);
            }
        }
    }

    // updateCameraAndCanvasForTheSelectedImage - updates the camera and the canvas for a specific texture:
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

    updateCameraAndCanvasForTheSelectedImage(
        layer,
        cameraFrustumLeftPlane_isValid,
        doRescale
    ) {
    // console.log('BEG updateCameraAndCanvasForTheSelectedImage');

        // console.log('doRescale', doRescale);
        // ///////////////////////////////////////////////////////////////////////////////////
        // Set this.camera to default position (where the selected image is centered and fills the entire canvas)
        // ///////////////////////////////////////////////////////////////////////////////////

        let imageInfo = ImageInfo.getSelectedImageInfo(layer);

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

        let retVal0 = undefined;
        let retVal = undefined;

        if (cameraFrustumLeftPlane_isValid) {
            // ////////////////////////////////////////////////////////////////////
            // camera parameter cameraFrustumLeftPlane is valid
            // Get the scale and image ratio from the existing camera setting
            // ////////////////////////////////////////////////////////////////////

            retVal0 = COL.OrbitControlsUtils.getScaleAndRatio(
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
                scaleX: retVal0.scaleX,
                scaleY: retVal0.scaleY,
                viewportExtendsOnX: retVal1.viewportExtendsOnX,
                canvasOffsetLeft: retVal1.canvasOffsetLeft,
                canvasOffsetTop: retVal1.canvasOffsetTop,
                canvasWidth: retVal1.canvasWidth,
                canvasHeight: retVal1.canvasHeight,
            };

            this.orbitControls.setMinZoom2(
                guiWindowWidth,
                guiWindowHeight,
                this.imageWidth,
                this.imageHeight,
                retVal1.canvasWidth,
                retVal1.canvasHeight
            );

            this.camera.updateProjectionMatrix();
        }
        else {
            // ////////////////////////////////////////////////////////////////////
            // camera parameter cameraFrustumLeftPlane is invalid
            // Set the camera frustum, zoom to cover the entire image
            // ////////////////////////////////////////////////////////////////////

            this.imageWidth = COL.util.getNestedObject(this.sprite, [
                'material',
                'map',
                'image',
                'width',
            ]);
            if (COL.util.isNumberInvalid(this.imageWidth)) {
                console.error('this.sprite', this.sprite);
                throw new Error(
                    'this.sprite.material.map.image.width is invalid.'
                );
            }

            this.imageHeight = COL.util.getNestedObject(this.sprite, [
                'material',
                'map',
                'image',
                'height',
            ]);
            if (COL.util.isNumberInvalid(this.imageHeight)) {
                throw new Error(
                    'this.sprite.material.map.image.height is invalid.'
                );
            }

            retVal = this.orbitControls.setCameraAndCanvas(
                guiWindowWidth,
                guiWindowHeight,
                this.imageWidth,
                this.imageHeight,
                imageOrientation,
                doRescale
            );
        }

        // ///////////////////////////////////////////////////////////////////////////////////
        // Scale the texture such that it fits the entire image
        // ///////////////////////////////////////////////////////////////////////////////////

        this.sprite.scale.set(retVal.scaleX, retVal.scaleY, 1);
        this.viewportExtendsOnX = retVal.viewportExtendsOnX;

        // tbd - should imageViewPaneSize be set only one time ???
        this.renderer.setSize(
            imageViewPaneSize.width,
            imageViewPaneSize.height
        );

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
        }

        if (!cameraFrustumLeftPlane_isValid) {
            // ///////////////////////////////////////////////////////////////////////////////////
            // imageInfo.cameraInfo.cameraFrustumLeftPlane is invalid
            // Set imageInfo.cameraInfo
            // ///////////////////////////////////////////////////////////////////////////////////

            imageInfo.setCameraInfo(this.orbitControls, this.rotationVal, this.flipY);
            this.camera.updateProjectionMatrix();
        }
        ImageView.render2();
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
ImageView.initialCameraHeightAboveGround = 80;
ImageView.overlayRectRadius = 40;
ImageView.pozitionZ = 0.1;
ImageView.doDrawTwoFingerTouchCenterPoint = false;

// /////////////////////////////////
// END Static class variables
// /////////////////////////////////

// INIT

// $(window).on('load', ...) happens after $(window).ready
// $(window).ready(function () {
$(window).on('load', function () {});

function animate() {
    console.log('BEG ImageView::animate');

    requestAnimationFrame(animate);
    ImageView.render2();
}

$(document).on('SceneLayerSelected', function (event, layer) {
    // console.log('BEG SceneLayerSelected');
});


function onContextMenu_imageView(event) {
    console.log('BEG onContextMenu_imageView');
    let selectedLayer = COL.model.getSelectedLayer();
    let imageView = selectedLayer.getImageView();
    let orbitControls = imageView.getControls();
    orbitControls.handleContextMenu_imageView(event);
}

export { ImageView };
