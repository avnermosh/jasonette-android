/* eslint-disable no-case-declarations */
/* eslint-disable no-empty */
/* eslint-disable max-len */
/* eslint-disable new-cap */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction camera.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or wheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/metaKey, or arrow keys / touch: two-finger move

import {
    Vector3 as THREE_Vector3,
    MOUSE as THREE_MOUSE,
    Quaternion as THREE_Quaternion,
    Spherical as THREE_Spherical,
    Vector2 as THREE_Vector2,
    EventDispatcher as THREE_EventDispatcher,
    Raycaster as THREE_Raycaster
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from '../core/Model.js';
import { PlanView } from '../core/PlanView.js';
import './OrbitControlsUtils.js';
import { OverlayRect } from '../core/OverlayRect.js';
import '../util/Util.js';

class OrbitControlsPlanView extends THREE_EventDispatcher {
    constructor(camera, domElement) {
        super();
        // console.log('BEG construct OrbitControlsPlanView');

        this.domElement = COL.util.isObjectValid(domElement) ? domElement : document;

        if (!camera.isOrthographicCamera) {
            // sanity check
            throw new Error('camera is not orthographic');
        }
        this.camera = camera;

        // "target" sets the location of focus, where the camera orbits around
        this.target = new THREE_Vector3();

        // How far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = 0;
        this.maxDistance = Infinity;

        // How far you can zoom in and out ( OrthographicCamera only )
        this.minZoom = 0;
        this.maxZoom = Infinity;

        // How far you can orbit vertically, upper and lower limits.
        // Range is 0 to Math.PI radians.
        this.minPolarAngle = 0; // radians
        this.maxPolarAngle = Math.PI; // radians

        // How far you can orbit horizontally, upper and lower limits.
        // If set, must be a sub-interval of the interval [ -Math.PI, Math.PI ].
        this.minAzimuthAngle = -Infinity; // radians
        this.maxAzimuthAngle = Infinity; // radians

        // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
        // zooming speed
        this.zoomSpeed = 1.0;

        // Set to false to disable rotating
        this.rotateSpeed = 1.0;

        // if true, pan in screen-space
        this.screenSpacePanning = false;

        // pixels moved per arrow key push
        this.keyPanSpeed = 7.0;

        // Set to true to automatically rotate around the target
        // If auto-rotate is enabled, you must call controls.update() in your animation loop
        this.autoRotate = false;
        this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

        // for reset
        this.target0 = this.target.clone();
        this.position0 = this.camera.position.clone();
        this.zoom0 = this.camera.zoom;

        // /////////////////////////////////////////////
        // BEG from the wrapper around update()
        // /////////////////////////////////////////////

        this.offset = new THREE_Vector3();

        // so camera.up is the orbit axis
        this.quat = new THREE_Quaternion().setFromUnitVectors(
            this.camera.up,
            new THREE_Vector3(0, 1, 0)
        );
        this.quatInvert = this.quat.clone().invert();

        this.lastPosition = new THREE_Vector3();
        this.lastQuaternion = new THREE_Quaternion();

        // /////////////////////////////////////////////
        // END from the wrapper around update()
        // /////////////////////////////////////////////

        // /////////////////////////////////////////////
        // from the wrapper around panLeft()
        // /////////////////////////////////////////////

        this.v1 = new THREE_Vector3();

        // /////////////////////////////////////////////
        // from the wrapper around panUp()
        // /////////////////////////////////////////////

        this.v2 = new THREE_Vector3();

        //
        // internals
        //

        this.state = OrbitControlsPlanView.STATE.NONE;

        // current position in spherical coordinates
        this.spherical = new THREE_Spherical();
        this.sphericalDelta = new THREE_Spherical();

        this.scale = 1;
        this.panOffset = new THREE_Vector3(0, 0, 0);
        this.zoomChanged = false;

        // the point coordinate where starting the pan
        this.panPointStart = new THREE_Vector2();
        // the current point coordinate where doing the pan
        this.panPointCurrent = new THREE_Vector2();
        // the point coordinate where ending the pan
        this.panPointEnd = new THREE_Vector2();

        // distance between the two-fingers touch
        this.deltaPoint2d_inScreenCoord_start = new THREE_Vector2();
        this.deltaPoint2d_inScreenCoord_end = new THREE_Vector2();

        // NDC point anchor for zooming via two-finger touch
        this.centerPoint2d_inNDC_start = new THREE_Vector2();
        this.centerPoint2d_inNDC_end = new THREE_Vector2();

        // refactored from EditOverlayRect_TrackballControls
        this.raycaster = new THREE_Raycaster();
        this.mouse = new THREE_Vector2();
        this.intersection = new THREE_Vector3();
        this.selectedStructureObj = null;
        this.hoveredOverlayRect = null;
        this.editedOverlayMeshObjInitialPosition = new THREE_Vector3();
    }

    initPan(point2d){
        this.panPointStart.set(point2d.x, point2d.y);
        this.panPointEnd.copy(this.panPointStart);
        this.panPointCurrent.copy(this.panPointStart);
    }

    async setState(otherState) {
        this.state = otherState;
        let selectedLayer = COL.model.getSelectedLayer();
        if (COL.util.isObjectInvalid(selectedLayer)) {
            // sanity check
            throw new Error('overlayRect is invalid');
        }

        let sceneBar = COL.model.getSceneBar();
        let isEditOverlayRectEnabled = false;
        switch(this.state) {
            case OrbitControlsPlanView.STATE.NONE: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 

                if(COL.isOldGUIEnabled) {
                    // Disable EditOverlayRect - this will prevent from editing the overlayRects
                    isEditOverlayRectEnabled = false;
                    sceneBar.handleEditOverlayRect(isEditOverlayRectEnabled);
                }
                                
                // Change the state to OverlayRect.STATE.NONE for all overlayeRects
                // e.g. for overlayeRects that have OverlayRect.STATE.MOVE_OVERLAY_RECT
                let overlayeRects = selectedLayer.getOverlayRects();
                if (COL.util.isObjectValid(overlayeRects)) {
                    let iter = overlayeRects.iterator();
                    while (iter.hasNext()) {
                        let overlayRect = iter.next();
                        if(overlayRect.getState() !== OverlayRect.STATE.NONE) {
                            overlayRect.setState(OverlayRect.STATE.NONE);
                        }
                    }
                }
                break;

            case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT: 

                if(COL.isOldGUIEnabled) {
                    // enable EditOverlayRect - this will allow to move the overlayRects
                    isEditOverlayRectEnabled = true;
                    sceneBar.handleEditOverlayRect(isEditOverlayRectEnabled);
                }

                // set the intersected overlayRect to moveMode
                let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                if(COL.util.isObjectInvalid(selectedOverlayRect)) {
                    // sanity check
                    throw new Error('selectedOverlayRect is invalid.');
                }

                if(selectedOverlayRect.getState() !== OverlayRect.STATE.MOVE_OVERLAY_RECT) {
                    // set the mode for the overlayRect
                    selectedOverlayRect.setState(OverlayRect.STATE.MOVE_OVERLAY_RECT);
                }
                break;

            case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.DOLLY_PAN: 
            case OrbitControlsPlanView.STATE.DOLLY_ZOOM:
            case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT:
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
                break;

            default:
                let msgStr = 'Orbitcontrols state is not supported: ' + this.state;
                throw new Error(msgStr);
        }

        // console.log('orbitControlsState6:', this.getStateAsStr());    
    }

    getState() {
        return this.state;
    }

    getStateAsStr() {
        switch (this.getState()) {
            case OrbitControlsPlanView.STATE.NONE:
                return 'OrbitControlsPlanView.STATE.NONE';
            case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT:
                return 'OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT';
            case OrbitControlsPlanView.STATE.DOLLY_PAN:
                return 'OrbitControlsPlanView.STATE.DOLLY_PAN';
            case OrbitControlsPlanView.STATE.DOLLY_ZOOM:
                return 'OrbitControlsPlanView.STATE.DOLLY_ZOOM';
            case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
                return 'OrbitControlsPlanView.STATE.CONTEXT_MENU';
            case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
                return 'OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT';
            case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
                return 'OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT';
            case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT: 
                return 'OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT';
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT: 
                return 'OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT';
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT: 
                return 'OrbitControlsPlanView.STATE.CONTEXT_MENU';
            default:
            {
                throw new Error('Invalid orbitControls state: ' + this.getState());
            }
        }
    }

    getPolarAngle() {
        return this.spherical.phi;
    }

    getAzimuthalAngle() {
        return this.spherical.theta;
    }

    saveState() {
    // console.log('BEG saveState');

        this.target0.copy(this.target);
        this.position0.copy(this.camera.position);
        this.zoom0 = this.camera.zoom;
    }

    reset(otherTarget, otherPosition, otherZoom) {
        // console.log('BEG OrbitControlsPlanView::reset()');

        this.target.copy(this.target0);
        // this.camera.position.copy( this.position0 );
        this.camera.zoom = this.zoom0;

        this.camera.updateProjectionMatrix();
        PlanView.Render();

        this.update();
        this.setState(OrbitControlsPlanView.STATE.NONE);
    }

    getZoomScale() {
        return Math.pow(0.95, this.zoomSpeed);
    }

    getZoom() {
        return this.camera.zoom;
    }

    setZoom(otherZoom) {
        // console.log('BEG setZoom');

        // this.camera.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.camera.zoom * dollyScale ) );
        this.camera.zoom = otherZoom;
        this.camera.zoom = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.camera.zoom)
        );
        this.camera.updateProjectionMatrix();
        this.zoomChanged = true;

        this.saveState();
    // console.log('this.camera.zoom', this.camera.zoom);
    }

    update() {
        // console.log('BEG OrbitControlsPlanView::update()');
        
        if (COL.util.isObjectInvalid(this.camera) || COL.util.isObjectInvalid(this.camera.position)) {
            let a =3;
        }
    
        var position = this.camera.position;
        this.offset.copy(position).sub(this.target);

        // rotate this.offset to "y-axis-is-up" space
        this.offset.applyQuaternion(this.quat);

        // angle from z-axis around y-axis
        this.spherical.setFromVector3(this.offset);

        if ( this.autoRotate && this.state === OrbitControlsPlanView.STATE.NONE ) {
            rotateLeft(getAutoRotationAngle());
        }

        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;

        // restrict theta to be between desired limits
        this.spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.spherical.theta) );

        // restrict phi to be between desired limits
        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi) );

        this.spherical.makeSafe();

        this.spherical.radius *= this.scale;

        // restrict radius to be between desired limits
        this.spherical.radius = Math.max( this.minDistance, Math.min(this.maxDistance, this.spherical.radius) );

        // move target to panned location
        this.target.add(this.panOffset);

        this.offset.setFromSpherical(this.spherical);

        // rotate this.offset back to "camera-up-vector-is-up" space
        this.offset.applyQuaternion(this.quatInvert);

        position.copy(this.target).add(this.offset);

        this.camera.lookAt(this.target);

        this.sphericalDelta.set(0, 0, 0);
        this.panOffset.set(0, 0, 0);

        this.scale = 1;

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > OrbitControlsPlanView.EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        let positionShift = this.lastPosition.distanceToSquared(
            this.camera.position
        );
        let condition3 = 8 * (1 - this.lastQuaternion.dot(this.camera.quaternion));

        if (this.zoomChanged ||
            positionShift > OrbitControlsPlanView.EPS ||
            condition3 > OrbitControlsPlanView.EPS) {
            this.lastPosition.copy(this.camera.position);
            this.lastQuaternion.copy(this.camera.quaternion);
            this.zoomChanged = false;

            let selectedLayer = COL.model.getSelectedLayer();
            if (COL.util.isObjectInvalid(selectedLayer)) {
                console.warn('Layer is invalid');
                return false;
            }

            let planView = COL.getPlanView();
            let bBox = planView.getBoundingBox();
            let viewportExtendsOnX = planView.doesViewportExtendOnX();
            if (bBox) {
                this.limitPanning(bBox, viewportExtendsOnX);
            }

            PlanView.Render();

            return true;
        }

        return false;
    }

    toJSON() {
    // console.log('BEG PlanView::toJSON()');

        return {
            domElement: this.domElement,
            camera: this.camera,
            target: this.target,
            minDistance: this.minDistance,
            maxDistance: this.maxDistance,
            minZoom: this.minZoom,
            maxZoom: this.maxZoom,
            minPolarAngle: this.minPolarAngle,
            maxPolarAngle: this.maxPolarAngle,
            minAzimuthAngle: this.minAzimuthAngle,
            maxAzimuthAngle: this.maxAzimuthAngle,
            zoomSpeed: this.zoomSpeed,
            rotateSpeed: this.rotateSpeed,
            screenSpacePanning: this.screenSpacePanning,
            keyPanSpeed: this.keyPanSpeed,
            autoRotate: this.autoRotate,
            autoRotateSpeed: this.autoRotateSpeed,
            target0: this.target0,
            position0: this.position0,
            zoom0: this.zoom0,
            offset: this.offset,
            quat: this.quat,
            quatInvert: this.quatInvert,
            lastPosition: this.lastPosition,
            lastQuaternion: this.lastQuaternion,
            state: this.state,
            spherical: this.spherical,
            sphericalDelta: this.sphericalDelta,
            scale: this.scale,
            panOffset: this.panOffset,
            zoomChanged: this.zoomChanged,
            deltaPoint2d_inScreenCoord_start: this.deltaPoint2d_inScreenCoord_start,
            deltaPoint2d_inScreenCoord_end: this.deltaPoint2d_inScreenCoord_end,
            centerPoint2d_inNDC_start: this.centerPoint2d_inNDC_start,
            centerPoint2d_inNDC_end: this.centerPoint2d_inNDC_end,
        };
    }

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile() {
    // console.log('BEG toJSON_forFile');

        let orbitControls_asJson = this.toJSON();

        // remove unneeded nodes
        delete orbitControls_asJson.camera;

        return orbitControls_asJson;
    }

    async fromJson(orbitControls_asDict) {
    // console.log('BEG OrbitControlsPlanView::fromJson');

        // //////////////////////////////////////////////////////////////////////////
        // Set:
        // - this.target
        // - this.offset
        // //////////////////////////////////////////////////////////////////////////

        if (COL.util.isObjectValid(orbitControls_asDict.target)) {
            this.target = new THREE_Vector3(
                orbitControls_asDict.target.x,
                orbitControls_asDict.target.y,
                orbitControls_asDict.target.z
            );
        }

        if (COL.util.isObjectValid(orbitControls_asDict.offset)) {
            this.offset = new THREE_Vector3(
                orbitControls_asDict.offset.x,
                orbitControls_asDict.offset.y,
                orbitControls_asDict.offset.z
            );
        }
    }

    dispose() {
    // console.log('BEG OrbitControlsPlanView.js::dispose()');

        // https://threejs.org/docs/#examples/en/controls/OrbitControls.dispose
        this.raycaster = null;
        this.mouse = null;
        this.intersection = null;
        this.camera = null;
        this.selectedStructureObj = null;
        this.hoveredOverlayRect = null;
        this.editedOverlayMeshObjInitialPosition = null;
    }

    setCameraFrustumAndZoom(
        guiWindowWidth,
        guiWindowHeight,
        imageWidth,
        imageHeight,
        imageOrientation
    ) {
    // console.log('BEG setCameraFrustumAndZoom');

        // ////////////////////////////////////////////////////////
        // Set the camera frustum, zoom
        // ////////////////////////////////////////////////////////

        this.camera.left = -imageWidth / 2;
        this.camera.right = imageWidth / 2;
        this.camera.top = imageHeight / 2;
        this.camera.bottom = -imageHeight / 2;

        this.setZoom(this.minZoom);
        this.camera.updateProjectionMatrix();
    }

    setMinZoom1(
        guiWindowWidth,
        guiWindowHeight,
        imageWidth,
        imageHeight
    ) {
    // console.log('BEG setMinZoom1');

        let image_w_h_ratio = imageWidth / imageHeight;
        let guiWindow_w_h_ratio = guiWindowWidth / guiWindowHeight;
        if( COL.util.isNumberInvalid(guiWindow_w_h_ratio) ||
            COL.util.isNumberInvalid(image_w_h_ratio)) {
            // sanity check
            throw new Error('guiWindow_w_h_ratio, or image_w_h_ratio is invalid');
        }

        let zoomFactor = guiWindow_w_h_ratio / image_w_h_ratio;
        if (guiWindow_w_h_ratio > image_w_h_ratio) {
            // canvasWidth is smaller than guiWindowWidth
            zoomFactor = 1 / zoomFactor;
        }
        this.minZoom = zoomFactor;

        // make sure that the current zoom is bounded by the new value of this.minZoom
        this.setZoom(this.camera.zoom);
    }

    // tbd - move setCameraAndCanvas to PlanView ?? - it doesn't have to do with orbitcontrols ?
    setCameraAndCanvas(
        guiWindowWidth,
        guiWindowHeight,
        imageWidth,
        imageHeight,
        imageOrientation,
        doRescale
    ) {
    // console.log('BEG setCameraAndCanvas');

        this.setMinZoom1(guiWindowWidth, guiWindowHeight, imageWidth, imageHeight);

        let scaleX = 0;
        let scaleY = 0;
        if (doRescale) {
            this.setCameraFrustumAndZoom(
                guiWindowWidth,
                guiWindowHeight,
                imageWidth,
                imageHeight,
                imageOrientation
            );

            [scaleX, scaleY] = COL.OrbitControlsUtils.getScaleAndRotation(
                imageWidth,
                imageHeight,
                imageOrientation
            );
        }
        else {
            scaleX = this.camera.right * 2;
            scaleY = this.camera.top * 2;
        }

        let isImageViewPane = false;
        let retVal1 = COL.OrbitControlsUtils.calcCanvasParams(
            guiWindowWidth,
            guiWindowHeight,
            imageWidth,
            imageHeight,
            isImageViewPane
        );

        let retVal = {
            scaleX: scaleX,
            scaleY: scaleY,
            viewportExtendsOnX: retVal1.viewportExtendsOnX,
            canvasOffsetLeft: retVal1.canvasOffsetLeft,
            canvasOffsetTop: retVal1.canvasOffsetTop,
            canvasWidth: retVal1.canvasWidth,
            canvasHeight: retVal1.canvasHeight,
        };

        return retVal;
    }

    //
    // internals
    //

    getAutoRotationAngle() {
        return ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    }

    rotateLeft(angle) {
    // console.log('BEG rotateLeft');
        this.sphericalDelta.theta -= angle;
    }

    rotateUp(angle) {
    // console.log('BEG rotateUp');
        this.sphericalDelta.phi -= angle;
    }

    panLeft(distance_inWorldCoord) {
    // console.log('BEG panLeft');
    // console.log('distance_inWorldCoord', distance_inWorldCoord);

        this.v1.setFromMatrixColumn(this.camera.matrix, 0); // get X column of this.camera.matrix
        this.v1.multiplyScalar(-distance_inWorldCoord);
        this.panOffset.add(this.v1);
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
    }

    panUp(distance_inWorldCoord) {
    // console.log('BEG panUp');

        if (this.screenSpacePanning === true) {
            this.v2.setFromMatrixColumn(this.camera.matrix, 1);
        }
        else {
            this.v2.setFromMatrixColumn(this.camera.matrix, 0);
            this.v2.crossVectors(this.camera.up, this.v2);
        }

        this.v2.multiplyScalar(distance_inWorldCoord);
        this.panOffset.add(this.v2);
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
    }

    pan_usingScreenCoords( panPointCurrent_inScreenCoord, panPointEnd_inScreenCoord ) {
        // console.log('BEG pan_usingScreenCoords');

        let planView = COL.getPlanView();

        let panPointCurrent_inNDC_Coord = planView.screenPointCoordToNormalizedCoord(panPointCurrent_inScreenCoord);
        let panPointEnd_inNDC_Coord = planView.screenPointCoordToNormalizedCoord(panPointEnd_inScreenCoord);

        let panPointCurrent_inWorldCoord = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera,
            panPointCurrent_inNDC_Coord
        );
        let panPointEnd_inWorldCoord = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera,
            panPointEnd_inNDC_Coord
        );

        let delta_inWorldCoord = new THREE_Vector3();
        delta_inWorldCoord.copy(panPointEnd_inWorldCoord);
        delta_inWorldCoord.sub(panPointCurrent_inWorldCoord);

        this.pan_usingWorldCoords(delta_inWorldCoord);
    }

    pan_usingWorldCoords(delta_inWorldCoord) {
    // console.log('BEG pan_usingWorldCoords');
    // console.log('delta_inWorldCoord', delta_inWorldCoord);

        this.panLeft(delta_inWorldCoord.x);
        this.panUp(delta_inWorldCoord.z);
    }

    dollyInOut(dollyScale, doDollyIn) {
    // console.log('BEG dollyInOut');

        // dollyIn
        let zoom1 = this.camera.zoom / dollyScale;
        if (!doDollyIn) {
            // dollyOut
            zoom1 = this.camera.zoom * dollyScale;
        }
        this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom1));
        this.camera.updateProjectionMatrix();
        this.zoomChanged = true;

        this.saveState();
    }

    // /////////////////////////////////////////////////////////////////////////
    // limitPanning() insures that the image always covers the view window:
    // - The minimal zoom is set to 1, to prevent a case where the image is smaller than the view window
    // - If the zoom is 1, the image covers the view window, and panning is disabled.
    // - If the zoom is bigger than 1, panning is enabled as long as the image covers the view window.
    // /////////////////////////////////////////////////////////////////////////

    limitPanning(bbox, viewportExtendsOnX) {
        // console.log('BEG limitPanning');

        let x1 = 0;
        let x3 = 0;
        if (viewportExtendsOnX) {
            x1 =
        this.camera.position.x +
        (this.camera.left * this.minZoom) / this.camera.zoom;
            x3 =
        this.camera.position.x +
        (this.camera.right * this.minZoom) / this.camera.zoom;
        }
        else {
            x1 = this.camera.position.x + this.camera.left / this.camera.zoom;
            x3 = this.camera.position.x + this.camera.right / this.camera.zoom;
        }
        let x1a = Math.max(x1, bbox.min.x);

        let pos_x = 0;
        if (x1 <= bbox.min.x && x3 >= bbox.max.x) {
            // the camera view exceeds the image
            // Center the image (x axis) in the view window
            pos_x = (bbox.min.x + bbox.max.x) / 2;
        }
        else {
            let x2 = 0;
            if (viewportExtendsOnX) {
                let pos_x1 = x1a - (this.camera.left * this.minZoom) / this.camera.zoom;
                x2 = pos_x1 + (this.camera.right * this.minZoom) / this.camera.zoom;
                let x2a = Math.min(x2, bbox.max.x);
                pos_x = x2a - (this.camera.right * this.minZoom) / this.camera.zoom;
            }
            else {
                let pos_x1 = x1a - this.camera.left / this.camera.zoom;
                x2 = pos_x1 + this.camera.right / this.camera.zoom;
                let x2a = Math.min(x2, bbox.max.x);
                pos_x = x2a - this.camera.right / this.camera.zoom;
            }
        }

        // _3D_TOP_DOWN - x-red - directed right (on the screen), z-blue directed down (on the screen), y-green directed towards the camera

        let z1 = 0;
        let z1a = 0;
        let pos_z1 = 0;
        let z3 = 0;
        if (viewportExtendsOnX) {
            z1 = this.camera.position.z + this.camera.bottom / this.camera.zoom;
            z1a = Math.max(z1, bbox.min.z);
            pos_z1 = z1a - this.camera.bottom / this.camera.zoom;
            z3 = this.camera.position.z + this.camera.top / this.camera.zoom;
        }
        else {
            z1 =
        this.camera.position.z +
        (this.camera.bottom * this.minZoom) / this.camera.zoom;
            z1a = Math.max(z1, bbox.min.z);
            pos_z1 = z1a - (this.camera.bottom * this.minZoom) / this.camera.zoom;
            z3 =
        this.camera.position.z +
        (this.camera.top * this.minZoom) / this.camera.zoom;
        }

        let pos_z = 0;
        if (z1 <= bbox.min.z && z3 >= bbox.max.z) {
            // the camera view exceeds the image
            // Center the image (z axis) in the view window
            pos_z = (bbox.min.z + bbox.max.z) / 2;
        }
        else {
            let z2 = 0;
            let z2a = 0;
            if (viewportExtendsOnX) {
                z2 = pos_z1 + this.camera.top / this.camera.zoom;
                z2a = Math.min(z2, bbox.max.z);
                pos_z = z2a - this.camera.top / this.camera.zoom;
            }
            else {
                z2 = pos_z1 + (this.camera.top * this.minZoom) / this.camera.zoom;
                z2a = Math.min(z2, bbox.max.z);
                pos_z = z2a - (this.camera.top * this.minZoom) / this.camera.zoom;
            }
        }

        // Limit the panning
        this.camera.position.set(pos_x, this.camera.position.y, pos_z);
        this.camera.lookAt(pos_x, this.target.y, pos_z);
        this.target.set(pos_x, 0, pos_z);
    }
  
    async validateOverlayRect() {
        let selectedLayer = COL.model.getSelectedLayer();
        if (!selectedLayer) {
        // Layer is not yet defined
            return;
        }

        let planView = COL.getPlanView();
        await planView.validateIntersectionPoint();
        await planView.findIntersections();

        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();

        switch(this.state) {
            case OrbitControlsPlanView.STATE.NONE: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
            {
                break;
            }

            case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.DOLLY_PAN: 
            case OrbitControlsPlanView.STATE.DOLLY_ZOOM: 
            case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
            {
                if(COL.util.isObjectValid(selectedOverlayRect)){
                    await selectedLayer.showSelectedOverlayRect();
                }
                break;
            }
            default:
                let msgStr = 'Orbitcontrols state is not supported: ' + this.state;
                throw new Error(msgStr);
        }
        
        if(COL.util.isObjectValid(selectedOverlayRect)){
            if(this.state !== OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT &&
                   this.state !== OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT &&
                   selectedOverlayRect.getState() == OverlayRect.STATE.NONE) {
                await selectedLayer.showSelectedOverlayRect();
            }
        }

        if(this.state == OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT) {
            // reset the state
            this.setState(OrbitControlsPlanView.STATE.NONE);
        }

        this.domElement.style.cursor = this.hoveredOverlayRect ? 'pointer' : 'auto';
        PlanView.Render();
    }

    translateOverlayRect2() {
        // console.log('BEG translateOverlayRect2');
    
        // /////////////////////////////////////
        // move the position of overlayRect
        // /////////////////////////////////////
    
        let selectedLayer = COL.model.getSelectedLayer();
        let planView = COL.getPlanView();
        let intersectedOverlayRectInfo =
          planView.getIntersectionOverlayRectInfo();
        let editedOverlayMeshObj = COL.util.getNestedObject(
            intersectedOverlayRectInfo,
            ['currentIntersection', 'object']
        );
        editedOverlayMeshObj.position.copy(this.intersection.point);
    
        // update the position of the overlayRect (i.e. overlayMeshObj) in overlayMeshGroup
        // (this is needed to persist the changes when syncing the changes to the webserver)
        let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
        let overlayMeshObj = overlayMeshGroup.getObjectByName(
            editedOverlayMeshObj.name,
            true
        );
        overlayMeshObj.position.copy(editedOverlayMeshObj.position);
        overlayMeshObj.updateMatrixWorld();
    
        let overlayRect = selectedLayer.getOverlayRectByName(overlayMeshObj.name);
        if (COL.util.isObjectInvalid(overlayRect)) {
            // sanity check
            throw new Error('overlayRect is invalid');
        }
    
        // indicate that the overlayRect has changed (translated) compared to the overlayRect in the back-end
        let overlayRectIsDirty2 = {
            isDirty_moved: true,
        };
        overlayRect.setIsDirty2(overlayRectIsDirty2);
    }    
}

// /////////////////////////////////
// BEG Static class variables
// /////////////////////////////////

OrbitControlsPlanView.STATE = {
    NONE: -1,
    SELECT_OVERLAY_RECT: 0,
    DOLLY_PAN: 1,
    DOLLY_ZOOM: 2,
    // The user selected the editMode menu (but has not selected an option yet)
    CONTEXT_MENU: 3,
    EDIT_MODE_ADD_OVERLAY_RECT: 4,
    EDIT_MODE_MOVE_OVERLAY_RECT: 5,
    EDIT_MODE_MERGE_START_OVERLAY_RECT: 6,
    EDIT_MODE_MERGE_END_OVERLAY_RECT: 7
};

OrbitControlsPlanView.EPS = 0.0001;

// The four arrow keys
OrbitControlsPlanView.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

// Mouse buttons
OrbitControlsPlanView.mouseButtons = {
    LEFT: THREE_MOUSE.LEFT,
    MIDDLE: THREE_MOUSE.MIDDLE,
    RIGHT: THREE_MOUSE.RIGHT,
};

// /////////////////////////////////
// END Static class variables
// /////////////////////////////////

export { OrbitControlsPlanView };
