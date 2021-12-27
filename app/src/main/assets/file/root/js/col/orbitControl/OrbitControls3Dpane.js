'use strict';

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction camera.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/metaKey, or arrow keys / touch: two-finger move

import {Vector3 as THREE_Vector3,
        MOUSE as THREE_MOUSE,
        Quaternion as THREE_Quaternion,
        Spherical as THREE_Spherical,
        Vector2 as THREE_Vector2,
        EventDispatcher as THREE_EventDispatcher
       } from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from  "../COL.js";
import { Model } from "../core/Model.js";
import { Scene3DtopDown } from "../core/Scene3DtopDown.js";
import "./OrbitControlsUtils.js";

class OrbitControls3Dpane extends THREE_EventDispatcher
{
    constructor(camera, domElement){
        super();
        // console.log('BEG construct OrbitControls3Dpane'); 

        this.domElement = ( COL.util.isObjectValid(domElement) ) ? domElement : document;

        if ( !camera.isOrthographicCamera ) {
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
        this.minAzimuthAngle = - Infinity; // radians
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

        ///////////////////////////////////////////////
        // BEG from the wrapper around update()
        ///////////////////////////////////////////////
        
        this.offset = new THREE_Vector3();

        // so camera.up is the orbit axis
        this.quat = new THREE_Quaternion().setFromUnitVectors( this.camera.up, new THREE_Vector3( 0, 1, 0 ) );
        this.quatInvert = this.quat.clone().invert();

        this.lastPosition = new THREE_Vector3();
        this.lastQuaternion = new THREE_Quaternion();

        ///////////////////////////////////////////////
        // END from the wrapper around update()
        ///////////////////////////////////////////////

        ///////////////////////////////////////////////
        // from the wrapper around panLeft()
        ///////////////////////////////////////////////

        this.v1 = new THREE_Vector3();

        ///////////////////////////////////////////////
        // from the wrapper around panUp()
        ///////////////////////////////////////////////

        this.v2 = new THREE_Vector3();
        

        //
        // internals
        //

        Scene3DtopDown.render1();

        this.state = OrbitControls3Dpane.STATE.NONE;

        // current position in spherical coordinates
        this.spherical = new THREE_Spherical();
        this.sphericalDelta = new THREE_Spherical();

        this.scale = 1;
        this.panOffset = new THREE_Vector3(0, 0, 0);
        this.zoomChanged = false;

        this.panStart = new THREE_Vector2();
        this.panEnd = new THREE_Vector2();

        // distance between the two-fingers touch
        this.deltaPoint2d_inScreenCoord_start = new THREE_Vector2();
        this.deltaPoint2d_inScreenCoord_end = new THREE_Vector2();

        // NDC point anchor for zooming via two-finger touch 
        this.centerPoint2d_inNDC_start = new THREE_Vector2();
        this.centerPoint2d_inNDC_end = new THREE_Vector2();
    };

    initOrbitControls3Dpane()
    {
        // console.log('BEG initOrbitControls3Dpane');
        this.domElement.activate();
    };

    enableControls = function (doEnable) {
        // console.log('BEG OrbitControls3Dpane::enableControls');
    };

    endTouchProcessing = function ()
    {
        // console.log('BEG endTouchProcessing');
        
        // reset the point anchors for zooming via two-finger touch 
        this.deltaPoint2d_inScreenCoord_start = new THREE_Vector2();
        this.deltaPoint2d_inScreenCoord_end = new THREE_Vector2();
        
        this.centerPoint2d_inNDC_start = new THREE_Vector2();
        this.centerPoint2d_inNDC_end = new THREE_Vector2();
    };

    setState = function (otherState)
    {
        this.state = otherState;
    };
    
    getState = function () {
        return this.state;        
    };

    getPolarAngle = function () {
        return this.spherical.phi;
    };

    getAzimuthalAngle = function () {
        return this.spherical.theta;
    };

    saveState = function () {
        // console.log('BEG saveState');

        this.target0.copy( this.target );
        this.position0.copy( this.camera.position );
        this.zoom0 = this.camera.zoom;
    };

    reset = function (otherTarget, otherPosition, otherZoom) {
        // console.log('BEG OrbitControls3Dpane::reset()');

        this.target.copy( this.target0 );
        // this.camera.position.copy( this.position0 );
        this.camera.zoom = this.zoom0;

        this.camera.updateProjectionMatrix();
        Scene3DtopDown.render1();

        this.update();
        this.setState( OrbitControls3Dpane.STATE.NONE );
    };

    getZoomScale = function () {
        return Math.pow( 0.95, this.zoomSpeed );
    };

    getZoom = function () {
        return this.camera.zoom;
    };

    setZoom = function (otherZoom) {
        // console.log('BEG setZoom');

        // this.camera.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.camera.zoom * dollyScale ) );
        this.camera.zoom = otherZoom;
        this.camera.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.camera.zoom ) );
        this.camera.updateProjectionMatrix();
        this.zoomChanged = true;

        this.saveState();
        // console.log('this.camera.zoom', this.camera.zoom); 
    };

    update = function () {
        // console.log('BEG OrbitControls3Dpane::update()');
        
        var position = this.camera.position;
        this.offset.copy( position ).sub( this.target );
        
        // rotate this.offset to "y-axis-is-up" space
        this.offset.applyQuaternion( this.quat );

        // angle from z-axis around y-axis
        this.spherical.setFromVector3( this.offset );

        if ( this.autoRotate && this.state === OrbitControls3Dpane.STATE.NONE ) {
            rotateLeft( getAutoRotationAngle() );
        }

        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;

        // restrict theta to be between desired limits
        this.spherical.theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, this.spherical.theta ) );

        // restrict phi to be between desired limits
        this.spherical.phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, this.spherical.phi ) );

        this.spherical.makeSafe();

        this.spherical.radius *= this.scale;

        // restrict radius to be between desired limits
        this.spherical.radius = Math.max( this.minDistance, Math.min( this.maxDistance, this.spherical.radius ) );

        // move target to panned location
        this.target.add( this.panOffset );

        this.offset.setFromSpherical( this.spherical );

        // rotate this.offset back to "camera-up-vector-is-up" space
        this.offset.applyQuaternion( this.quatInvert );

        position.copy( this.target ).add( this.offset );

        this.camera.lookAt( this.target );
        
        this.sphericalDelta.set( 0, 0, 0 );
        this.panOffset.set( 0, 0, 0 );

        this.scale = 1;
        
        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > OrbitControls3Dpane.EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        let positionShift = this.lastPosition.distanceToSquared( this.camera.position );
        let condition3 = 8 * ( 1 - this.lastQuaternion.dot( this.camera.quaternion ) );

        if ( this.zoomChanged ||
             (positionShift > OrbitControls3Dpane.EPS) ||
             (condition3 > OrbitControls3Dpane.EPS) ) {

            this.lastPosition.copy( this.camera.position );
            this.lastQuaternion.copy( this.camera.quaternion );
            this.zoomChanged = false;

            let selectedLayer = COL.model.getSelectedLayer();
            if(COL.util.isObjectInvalid(selectedLayer))
            {
                console.warn('Layer is invalid');
                return false;
            }

            let scene3DtopDown = selectedLayer.getScene3DtopDown();
            let bBox = scene3DtopDown.getBoundingBox();
            let viewportExtendsOnX = scene3DtopDown.doesViewportExtendOnX();
            if(bBox)
            {
                this.limitPanning(bBox, viewportExtendsOnX);
            }

            Scene3DtopDown.render1();
            
            return true;
        }

        return false;
    };

    toJSON = function()
    {
        // console.log('BEG Scene3DtopDown::toJSON()');

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
            panStart: this.panStart,
            panEnd: this.panEnd,
            deltaPoint2d_inScreenCoord_start: this.deltaPoint2d_inScreenCoord_start,
            deltaPoint2d_inScreenCoord_end: this.deltaPoint2d_inScreenCoord_end,
            centerPoint2d_inNDC_start: this.centerPoint2d_inNDC_start,
            centerPoint2d_inNDC_end: this.centerPoint2d_inNDC_end,
        };
    };

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile = function () {
        // console.log('BEG toJSON_forFile'); 

        let orbitControls_asJson = this.toJSON();

        // remove unneeded nodes
        delete orbitControls_asJson.camera;
        
        return orbitControls_asJson;
    };

    fromJson = async function (orbitControls_asDict) {
        // console.log('BEG OrbitControls3Dpane::fromJson');
        
        ////////////////////////////////////////////////////////////////////////////
        // Set:
        // - this.target
        // - this.offset
        ////////////////////////////////////////////////////////////////////////////
        
        if(COL.util.isObjectValid(orbitControls_asDict.target))
        {
            this.target  = new THREE_Vector3(orbitControls_asDict.target.x,
                                             orbitControls_asDict.target.y,
                                             orbitControls_asDict.target.z);
        }

        if(COL.util.isObjectValid(orbitControls_asDict.offset))
        {
            this.offset  = new THREE_Vector3(orbitControls_asDict.offset.x,
                                            orbitControls_asDict.offset.y,
                                            orbitControls_asDict.offset.z);
        }

    };
    
    dispose = function () {
        // console.log('BEG OrbitControls3Dpane.js::dispose()');
        
        // https://threejs.org/docs/#examples/en/controls/OrbitControls.dispose
        this.enableControls(false);
    };
    
    setCameraFrustumAndZoom = function (guiWindowWidth,
                            guiWindowHeight,
                            imageWidth,
                            imageHeight,
                            imageOrientation) {

        // console.log('BEG setCameraFrustumAndZoom');
        
        //////////////////////////////////////////////////////////
        // Set the camera frustum, zoom
        //////////////////////////////////////////////////////////

        this.camera.left = -imageWidth/2;
        this.camera.right = imageWidth/2;
        this.camera.top = imageHeight/2;
        this.camera.bottom = -imageHeight/2;

        this.setZoom(this.minZoom);
        this.camera.updateProjectionMatrix();
    };

    setMinZoom1 = function (guiWindowWidth,
                guiWindowHeight,
                imageWidth,
                imageHeight) {
        // console.log('BEG setMinZoom1');
        
        let image_w_h_ratio = imageWidth / imageHeight;
        let guiWindow_w_h_ratio = guiWindowWidth / guiWindowHeight;

        let zoomFactor = guiWindow_w_h_ratio / image_w_h_ratio;
        if(guiWindow_w_h_ratio > image_w_h_ratio)
        {
            // canvasWidth is smaller than guiWindowWidth
            zoomFactor = 1 / zoomFactor;
        }
        this.minZoom = zoomFactor;

        // make sure that the current zoom is bounded by the new value of this.minZoom 
        this.setZoom(this.camera.zoom);
    };

    // tbd - move setCameraAndCanvas to Scene3DtopDown ?? - it doesn't have to do with orbitcontrols ?
    setCameraAndCanvas = function (guiWindowWidth,
                       guiWindowHeight,
                       imageWidth,
                       imageHeight,
                       imageOrientation,
                       doRescale) {
        // console.log('BEG setCameraAndCanvas');
        
        this.setMinZoom1(guiWindowWidth,
                         guiWindowHeight,
                         imageWidth,
                         imageHeight);
        
        let scaleX = 0;
        let scaleY = 0;
        if(doRescale)
        {
            this.setCameraFrustumAndZoom(guiWindowWidth,
                                         guiWindowHeight,
                                         imageWidth,
                                         imageHeight,
                                         imageOrientation);
            
            let retVal0 = COL.OrbitControlsUtils.getScaleAndRatio(imageWidth,
                                                                  imageHeight,
                                                                  imageOrientation);

            scaleX = retVal0.scaleX;
            scaleY = retVal0.scaleY;
        }
        else
        {
            scaleX = this.camera.right * 2;
            scaleY = this.camera.top * 2;
        }

        let isTexturePane = false;
        let retVal1 = COL.OrbitControlsUtils.calcCanvasParams(guiWindowWidth,
                                                              guiWindowHeight,
                                                              imageWidth,
                                                              imageHeight,
                                                              isTexturePane);

        let retVal = {
            scaleX: scaleX,
            scaleY: scaleY,
            viewportExtendsOnX: retVal1.viewportExtendsOnX,
            canvasOffsetLeft: retVal1.canvasOffsetLeft,
            canvasOffsetTop: retVal1.canvasOffsetTop,
            canvasWidth: retVal1.canvasWidth,
            canvasHeight: retVal1.canvasHeight
        };
        
        return retVal;
    };

    //
    // internals
    //

    getAutoRotationAngle = function () {
        return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    };

    rotateLeft = function ( angle ) {
        // console.log('BEG rotateLeft'); 
        this.sphericalDelta.theta -= angle;
    };

    rotateUp = function ( angle ) {
        // console.log('BEG rotateUp'); 
        this.sphericalDelta.phi -= angle;
    };

    panLeft = function ( distance_inWorldCoord ) {
        // console.log('BEG panLeft');
        // console.log('distance_inWorldCoord', distance_inWorldCoord); 
        
        this.v1.setFromMatrixColumn( this.camera.matrix, 0 ); // get X column of this.camera.matrix
        this.v1.multiplyScalar( -distance_inWorldCoord );
        this.panOffset.add( this.v1 );
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
    };

    panUp = function ( distance_inWorldCoord ) {
        // console.log('BEG panUp');

        if ( this.screenSpacePanning === true ) {
            this.v2.setFromMatrixColumn( this.camera.matrix, 1 );
        } 
        else {
            this.v2.setFromMatrixColumn( this.camera.matrix, 0 );
            this.v2.crossVectors( this.camera.up, this.v2 );
        }

        this.v2.multiplyScalar( distance_inWorldCoord );
        this.panOffset.add( this.v2 );
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
    };

    pan_usingScreenCoords2 = function ( panStart_inScreenCoord, panEnd_inScreenCoord ) {
        // console.log('BEG pan_usingScreenCoords2');

        let selectedLayer = COL.model.getSelectedLayer();
        let scene3DtopDown = selectedLayer.getScene3DtopDown();

        let panStart_inNDC_Coord = scene3DtopDown.screenPointCoordToNormalizedCoord( panStart_inScreenCoord );
        let panEnd_inNDC_Coord = scene3DtopDown.screenPointCoordToNormalizedCoord( panEnd_inScreenCoord );
        
        let panStart_inWorldCoord = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, panStart_inNDC_Coord);
        let panEnd_inWorldCoord = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, panEnd_inNDC_Coord);

        let delta_inWorldCoord = new THREE_Vector3();
        delta_inWorldCoord.copy( panEnd_inWorldCoord );
        delta_inWorldCoord.sub( panStart_inWorldCoord );

        this.panLeft( delta_inWorldCoord.x );
        this.panUp( delta_inWorldCoord.z );
    };

    pan_usingWorldCoords = function ( delta_inWorldCoord ) {
        // console.log('BEG pan_usingWorldCoords');
        // console.log('delta_inWorldCoord', delta_inWorldCoord);
        
        this.panLeft( delta_inWorldCoord.x );
        this.panUp( delta_inWorldCoord.z );
    };
    
    dollyInOut = function ( dollyScale, doDollyIn ) {
        // console.log('BEG dollyInOut'); 

        // dollyIn
        let zoom1 = this.camera.zoom / dollyScale;
        if(!doDollyIn)
        {
            // dollyOut
            zoom1 = this.camera.zoom * dollyScale;
        }
        this.camera.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, zoom1 ) );
        this.camera.updateProjectionMatrix();
        this.zoomChanged = true;

        this.saveState();
    };


    ///////////////////////////////////////////////////////////////////////////
    // limitPanning() insures that the image always covers the view window:
    // - The minimal zoom is set to 1, to prevent a case where the image is smaller than the view window 
    // - If the zoom is 1, the image covers the view window, and panning is disabled.
    // - If the zoom is bigger than 1, panning is enabled as long as the image covers the view window.
    ///////////////////////////////////////////////////////////////////////////

    limitPanning = function (bbox, viewportExtendsOnX) {
        // console.log('BEG limitPanning'); 

        let x1 = 0;
        let x3 = 0;
        if(viewportExtendsOnX)
        {
            x1 = this.camera.position.x + (this.camera.left * this.minZoom / this.camera.zoom);
            x3 = this.camera.position.x + (this.camera.right * this.minZoom / this.camera.zoom);
        }
        else
        {
            x1 = this.camera.position.x + (this.camera.left / this.camera.zoom);
            x3 = this.camera.position.x + (this.camera.right / this.camera.zoom);
        }
        let x1a = Math.max(x1, bbox.min.x);
        
        let pos_x = 0;
        if((x1 <= bbox.min.x) && (x3 >= bbox.max.x))
        {
            // the camera view exceeds the image
            // Center the image (x axis) in the view window
            pos_x = (bbox.min.x + bbox.max.x) / 2;
        }
        else
        {
            let x2 = 0;
            if(viewportExtendsOnX)
            {
                let pos_x1 = x1a - (this.camera.left * this.minZoom / this.camera.zoom);
                x2 = pos_x1 + (this.camera.right * this.minZoom / this.camera.zoom);
                let x2a = Math.min(x2, bbox.max.x);
                pos_x = x2a - (this.camera.right * this.minZoom / this.camera.zoom);
            }
            else
            {
                let pos_x1 = x1a - (this.camera.left / this.camera.zoom);
                x2 = pos_x1 + (this.camera.right / this.camera.zoom);
                let x2a = Math.min(x2, bbox.max.x);
                pos_x = x2a - (this.camera.right / this.camera.zoom);
            }
        }
        
        // _3D_TOP_DOWN - x-red - directed right (on the screen), z-blue directed down (on the screen), y-green directed towards the camera

        let z1 = 0;
        let z1a = 0;
        let pos_z1 = 0;
        let z3 = 0;
        if(viewportExtendsOnX)
        {
            z1 = this.camera.position.z + (this.camera.bottom / this.camera.zoom);
            z1a = Math.max(z1, bbox.min.z);
            pos_z1 = z1a - (this.camera.bottom / this.camera.zoom);
            z3 = this.camera.position.z + (this.camera.top / this.camera.zoom);
        }
        else
        {
            z1 = this.camera.position.z + (this.camera.bottom * this.minZoom / this.camera.zoom);
            z1a = Math.max(z1, bbox.min.z);
            pos_z1 = z1a - (this.camera.bottom * this.minZoom / this.camera.zoom);
            z3 = this.camera.position.z + (this.camera.top * this.minZoom / this.camera.zoom);
        }

        let pos_z = 0;
        if((z1 <= bbox.min.z) && (z3 >= bbox.max.z))
        {
            // the camera view exceeds the image
            // Center the image (z axis) in the view window
            pos_z = (bbox.min.z + bbox.max.z) / 2;
        }
        else
        {
            let z2 = 0;
            let z2a = 0;
            if(viewportExtendsOnX)
            {
                z2 = pos_z1 + (this.camera.top / this.camera.zoom);
                z2a = Math.min(z2, bbox.max.z);
                pos_z = z2a - (this.camera.top / this.camera.zoom);
            }
            else
            {
                z2 = pos_z1 + (this.camera.top * this.minZoom / this.camera.zoom);
                z2a = Math.min(z2, bbox.max.z);
                pos_z = z2a - (this.camera.top * this.minZoom / this.camera.zoom);
            }
        }

        // Limit the panning
        this.camera.position.set(pos_x, this.camera.position.y, pos_z);
        this.camera.lookAt(pos_x, this.target.y, pos_z);
        this.target.set(pos_x, 0, pos_z);
    };

    ///////////////////////////////////
    // BEG Touch related functions
    ///////////////////////////////////

    handleTouchMove0 = function ( event ) {
        // console.log('BEG handleTouchMove0');
        
        let selectedLayer = COL.model.getSelectedLayer();

        // handleTouchMove0 - serves both editMode and non-editMode
        let isEditOverlayRectFlagOn = selectedLayer.getEditOverlayRectFlag();

        switch ( event.touches.length ) {
            case 1:
                if( isEditOverlayRectFlagOn )
                {
                    // console.log('this.state', this.state); 
                    if( this.state == OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT )
                    {
                        // In editMode, and:
                        // 1. selected a location which does not intersect with pre-existing overlayRect.
                        //    This results in a new overlayRect being added.
                        // 2. the initial mousedown/touchstart event was
                        //    followed by mousemove/touchmove, so moving the overlayRect
                        this.setState( OrbitControls3Dpane.STATE.EDIT_MODE_MOVE_OVERLAY_RECT );
                    }
                }
                else
                {
                    // Not in Edit mode, and the interaction is via single-finger.
                    // Set the orbitControls state to DOLLY_PAN, so that we can zoom and pan the 3DtopPane
                    this.setState( OrbitControls3Dpane.STATE.DOLLY_PAN );
                }

                if( this.state == OrbitControls3Dpane.STATE.DOLLY_PAN )
                {
                    let point2d = new THREE_Vector2(event.touches[0].pageX,
                                                    event.touches[0].pageY);

                    this.panTopDownPane(point2d);
                }
                break;

            case 2: 
                // two-finger-pinch(zoom,dolly) touch
                this.setState( OrbitControls3Dpane.STATE.DOLLY_PAN );
                
                if(event.targetTouches.length == 2)
                {

                    // on 2-finger touch, we want to 
                    // - disable overlayRect select, 
                    // - disable creation of newOverlayRect
                    // (when doing 2 finger touch, initially there is a 1-finger touch which causes to
                    //  select an existing overlayRect or add a new overlayRect.
                    // clearOverlayRectsWithoutImages() takes care to revert this)
                    selectedLayer.clearOverlayRectsWithoutImages();
                    
                    // Enable "two-finger-pinch(zoom,dolly) touch" only if both touches are in the same DOM element.
                    let dx = Math.abs(event.touches[0].pageX - event.touches[1].pageX);
                    let dy = Math.abs(event.touches[0].pageY - event.touches[1].pageY);
                    let deltaPoint2d = new THREE_Vector2(dx, dy);

                    let x2 = (event.touches[0].pageX + event.touches[1].pageX) / 2;
                    let y2 = (event.touches[0].pageY + event.touches[1].pageY) / 2;
                    let centerPoint2d_inScreenCoord_end = new THREE_Vector2(x2, y2);

                    let scene3DtopDown = selectedLayer.getScene3DtopDown();
                    this.centerPoint2d_inNDC_end = scene3DtopDown.screenPointCoordToNormalizedCoord( centerPoint2d_inScreenCoord_end );
                    
                    let centerPoint3d_inWorldCoord_end = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, this.centerPoint2d_inNDC_end);

                    this.deltaPoint2d_inScreenCoord_end = new THREE_Vector2(deltaPoint2d.x, deltaPoint2d.y);
                    let zeroVec = new THREE_Vector3();
                    
                    if(this.centerPoint2d_inNDC_start.equals(zeroVec) )
                    {
                        //////////////////////////////////////////////////////////
                        // First time in 2-finger touch move.
                        // Prepare for panning the centerPoint, after the scale,
                        // such that the object pointed at, appears between the 2 fingers
                        // - set centerPoint2d_inNDC_start to centerPoint2d_inNDC_end
                        // - set deltaPoint2d_inScreenCoord_start to deltaPoint2d_inScreenCoord_end
                        //////////////////////////////////////////////////////////
                        
                        this.centerPoint2d_inNDC_start.copy(this.centerPoint2d_inNDC_end);
                        this.deltaPoint2d_inScreenCoord_start.copy(this.deltaPoint2d_inScreenCoord_end);
                        
                        // console.log('Scene3DtopDown.doDrawTwoFingerTouchCenterPoint', Scene3DtopDown.doDrawTwoFingerTouchCenterPoint); 
                        if(Scene3DtopDown.doDrawTwoFingerTouchCenterPoint)
                        {
                            // highlight the centerPoint between the two-finger touch
                            scene3DtopDown._centerPoint_twoFingerTouch.position.copy( centerPoint3d_inWorldCoord_end );
                            scene3DtopDown._centerPoint_twoFingerTouch.position.setY( COL.y0 );
                        }
                    }

                    this.handleTwoFingerTouchMove0();
                }

                break;

            default:
                this.setState( OrbitControls3Dpane.STATE.NONE );
        }

        // console.log('END handleTouchMove0');
    };

    ///////////////////////////////////
    // END Touch related functions
    ///////////////////////////////////

    ///////////////////////////////////
    // BEG Mouse related functions
    ///////////////////////////////////

    handleMouseDown_orTouchStart0 = function ( point2d ) {
        // console.log( 'BEG handleMouseDown_orTouchStart0' );
        
        // mouseCoords and screenCoordNormalized are the same thing
        // they refer to the location inside the window-screen (not the entire GUI window)
        this.panStart.set( point2d.x, point2d.y );
    };

    panTopDownPane = function (point2d_inScreenCoord) {
        // console.log('BEG panTopDownPane');
        
        this.panEnd.set( point2d_inScreenCoord.x, point2d_inScreenCoord.y );
        // pan the pane
        this.pan_usingScreenCoords2( this.panStart, this.panEnd );

        // update panStart for the future
        this.panStart.copy( this.panEnd );
        this.update();
    };
    

    handleTwoFingerTouchMove0 = function () {
        // console.log( 'BEG handleTwoFingerTouchMove0' );

        //////////////////////////////////////////////////////////
        // Apply zoom
        //////////////////////////////////////////////////////////

        let lengthDollyStart = this.deltaPoint2d_inScreenCoord_start.length();
        let lengthDollyEnd = this.deltaPoint2d_inScreenCoord_end.length();
        
        let factor = (lengthDollyEnd / lengthDollyStart);
        let zoomNew = this.getZoom() * factor;
        this.setZoom(zoomNew);

        this.deltaPoint2d_inScreenCoord_start.copy(this.deltaPoint2d_inScreenCoord_end);
        
        //////////////////////////////////////////////////////////////////////////////////////
        // Apply pan (after zoom, and/or moving the 2 fingers)
        // such that the object between the two-finger touch appears between the 2 fingers (after pinching and after moving the 2-fingers)
        // - calc the delta in worldCoord, between the object pointed at, before and after the zoom.
        //   and pan the camera so that the object pointed at, appears between the two-fingers
        //////////////////////////////////////////////////////////////////////////////////////

        let centerPoint3d_inWorldCoord_start = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, this.centerPoint2d_inNDC_start);
        let centerPoint3d_inWorldCoord_end = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, this.centerPoint2d_inNDC_end);

        let delta_inWorldCoords = new THREE_Vector3(centerPoint3d_inWorldCoord_end.x - centerPoint3d_inWorldCoord_start.x,
                                                    centerPoint3d_inWorldCoord_end.y - centerPoint3d_inWorldCoord_start.y,
                                                    centerPoint3d_inWorldCoord_end.z - centerPoint3d_inWorldCoord_start.z);

        this.centerPoint2d_inNDC_start.copy(this.centerPoint2d_inNDC_end);

        this.pan_usingWorldCoords( delta_inWorldCoords );

        this.update();
    };

    // tbd - remove async ?? ( no complementing await...)
    handleMouseDown0 = async function ( event ) {
        // console.log('BEG handleMouseDown0'); 

        event.preventDefault();
        let point2d = new THREE_Vector2(event.clientX, event.clientY);
        switch ( event.button ) {
            case OrbitControls3Dpane.mouseButtons.LEFT:
                this.handleMouseDown_orTouchStart0( point2d );
                break;
        }
    };

    handleMouseWheel0 = function ( event ) {
        // console.log('BEG handleMouseWheel0');

        if ( this.state !== OrbitControls3Dpane.STATE.NONE )
        {
            return;
        }

        if ( event.deltaY < 0 ) {
            this.dollyInOut( this.getZoomScale(), true );
        }
        else if ( event.deltaY > 0 ) {
            this.dollyInOut( this.getZoomScale(), false );
        }
        this.update();
    };

    ///////////////////////////////////
    // END Mouse related functions
    ///////////////////////////////////

    handleContextMenu0 = function ( event ) {
        // console.log('BEG handleContextMenu0');
        // TBD enables taking a snapshot of the Scene3D pane. Possible future feature
        // for now disabling it so that it does not pop up the menu when right clicking in Edit mode
        event.preventDefault();
    };

};

///////////////////////////////////
// BEG Static class variables
///////////////////////////////////

OrbitControls3Dpane.STATE = { NONE: -1, SELECT_OVERLAY_RECT: 0, DOLLY_PAN: 1, NA1: 2, EDIT_MODE_SELECT_OVERLAY_RECT: 3, EDIT_MODE_MOVE_OVERLAY_RECT: 4 };

OrbitControls3Dpane.EPS = 0.0001;

// The four arrow keys
OrbitControls3Dpane.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

// Mouse buttons
OrbitControls3Dpane.mouseButtons = { LEFT: THREE_MOUSE.LEFT, MIDDLE: THREE_MOUSE.MIDDLE, RIGHT: THREE_MOUSE.RIGHT };

///////////////////////////////////
// END Static class variables
///////////////////////////////////

export { OrbitControls3Dpane };
