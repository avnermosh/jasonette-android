/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

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
       } from '../../include/three.js/three.js-r120/build/three.module.js';

import { COL } from  "../COL.js";
import { Model } from "../core/Model.js";
import { TexturePanelPlugin } from "../core/TexturePanelPlugin.js";

import "./OrbitControlsUtils.js";
import "../util/Util.js";

"use strict";


class OrbitControlsTexPane extends THREE_EventDispatcher
{
    constructor(camera, domElement){
        super();
        // console.log('BEG construct OrbitControlsTexPane'); 
        this.domElement = ( COL.util.isObjectValid(domElement) ) ? domElement : document;

        if ( !camera.isOrthographicCamera ) {
            // sanity check
            throw new Error('camera is not orthographic');
        }
        this.camera = camera;

        // "target" sets the location of focus, where the camera orbits around
        // for texPane camera, it is alway the previous camera (position.x, position.x, 0), and
        // it gets updated to the new camera position (position.x, position.x, 0) after pan
        // so that the camera always look down (i.e. 90 degrees) at the target.
        this.target = new THREE_Vector3();

        // How far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = 0;
        this.maxDistance = Infinity;

        // How far you can zoom in and out ( OrthographicCamera only )
        this.minZoom = 0;
        this.maxZoom = Infinity;
        
        // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
        // zooming speed
        this.zoomSpeed = 1.0;

        // panning speed
        this.panSpeed = 1.0;

        // if true, pan in screen-space
        this.screenSpacePanning = false;

        // pixels moved per arrow key push
        this.keyPanSpeed = 7.0;

        // for reset
        this.target0 = this.target.clone();
        this.position0 = this.camera.position.clone();
        this.zoom0 = this.camera.zoom;

        ///////////////////////////////////////////////
        // BEG from the wrapper around update()
        ///////////////////////////////////////////////
        
        this.lastPosition = new THREE_Vector3();
        this.lastQuaternion = new THREE_Quaternion();

        this.cameraHeightAboveGround = 80;

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

        this.state = OrbitControlsTexPane.STATE.NONE;

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

    initOrbitControlsTexPane = function ()
    {
        // console.log('BEG initOrbitControlsTexPane');
        this.domElement.activate();
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

    saveState = function () {
        // console.log('BEG saveState');

        this.target0.copy( this.target );
        this.position0.copy( this.camera.position );
        this.zoom0 = this.camera.zoom;
    };

    reset = function (otherTarget, otherPosition, otherZoom) {
        // console.log('BEG OrbitControlsTexPane::reset()');
        this.target.copy( this.target0 );
        // this.camera.position.copy( this.position0 );
        this.camera.zoom = this.zoom0;

        this.camera.updateProjectionMatrix();

        this.update();
        this.setState( OrbitControlsTexPane.STATE.NONE );
    };

    setFromCameraInfo = function (cameraInfo) {
        // console.log('BEG setFromCameraInfo'); 

        this.camera.left = cameraInfo.cameraFrustumLeftPlane;
        this.camera.right = cameraInfo.cameraFrustumRightPlane;
        this.camera.top = cameraInfo.cameraFrustumTopPlane;
        this.camera.bottom = cameraInfo.cameraFrustumBottomPlane;
        this.camera.near = cameraInfo.cameraFrustumNearPlane;
        this.camera.far = cameraInfo.cameraFrustumFarPlane;
        this.camera.position.set( cameraInfo.cameraPosition.x,
                                  cameraInfo.cameraPosition.y,
                                  cameraInfo.cameraPosition.z );
        this.camera.zoom = cameraInfo.cameraZoom;
        
        this.target.set(this.camera.position.x, this.camera.position.y, 0);
        this.minZoom = cameraInfo.cameraMinZoom;

        this.camera.updateProjectionMatrix();
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
        // console.log('BEG OrbitControlsTexPane::update()');
        
        // move target to panned location
        this.target.add( this.panOffset );

        // Set the camera above the target.
        this.camera.position.set( this.target.x, this.target.y, this.cameraHeightAboveGround );
        
        this.camera.lookAt( this.target );

        this.panOffset.set( 0, 0, 0 );
        
        this.scale = 1;
        
        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > OrbitControlsTexPane.EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        let positionShift = this.lastPosition.distanceToSquared( this.camera.position );
        let condition3 = 8 * ( 1 - this.lastQuaternion.dot( this.camera.quaternion ) );

        if ( this.zoomChanged ||
             (positionShift > OrbitControlsTexPane.EPS) ||
             (condition3 > OrbitControlsTexPane.EPS) ) {

            this.lastPosition.copy( this.camera.position );
            this.lastQuaternion.copy( this.camera.quaternion );
            this.zoomChanged = false;

            let selectedLayer = COL.model.getSelectedLayer();
            if(COL.util.isObjectInvalid(selectedLayer))
            {
                console.warn('Layer is invalid');
                return false;
            }

            let texturePlugin = selectedLayer.getTexturePanelPlugin()
            let bBox = texturePlugin.getBoundingBox();
            let viewportExtendsOnX = texturePlugin.doesViewportExtendOnX();
            if(bBox)
            {
                this.limitPanning(bBox, viewportExtendsOnX);
            }
            TexturePanelPlugin.render2();
            
            return true;
        }

        return false;
    };
    
    dispose = function () {
        // console.log('BEG OrbitControls3Dpane.js::dispose()');
        
        // https://threejs.org/docs/#examples/en/controls/OrbitControls.dispose
        // nothing to be done here - event listeners are removed in TexturePanelPlugin
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

    setMinZoom2 = function (guiWindowWidth,
                guiWindowHeight,
                imageWidth,
                imageHeight,
                canvasWidth,
                canvasHeight) {
        // console.log('BEG setMinZoom2');
        
        let image_w_h_ratio = imageWidth / imageHeight;
        let guiWindow_w_h_ratio = guiWindowWidth / guiWindowHeight;
        let canvas_w_h_ratio = canvasWidth / canvasHeight;

        let zoomFactor = 1;
        if(guiWindow_w_h_ratio > image_w_h_ratio)
        {
            // canvasWidth is smaller than guiWindowWidth
            zoomFactor = guiWindowHeight / canvasHeight;

        }
        else
        {
            zoomFactor = guiWindowWidth / canvasWidth;
        }

        this.minZoom = zoomFactor;

        // make sure that the current zoom is bounded by the new value of this.minZoom 
        this.setZoom(this.camera.zoom);
    };

    setCameraAndCanvas = function (guiWindowWidth,
                       guiWindowHeight,
                       imageWidth,
                       imageHeight,
                       imageOrientation,
                       doRescale) {
        // console.log('BEG setCameraAndCanvas');
        
        let scaleX = 0;
        let scaleY = 0;
        if(doRescale)
        {
            // setCameraFrustumAndZoom -> setCameraFrustum
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


        let isTexturePane = true;
        let retVal1 = COL.OrbitControlsUtils.calcCanvasParams(guiWindowWidth,
                                                              guiWindowHeight,
                                                              imageWidth,
                                                              imageHeight,
                                                              isTexturePane);

        this.setMinZoom2(guiWindowWidth,
                         guiWindowHeight,
                         imageWidth,
                         imageHeight,
                         retVal1.canvasWidth,
                         retVal1.canvasHeight);

        this.setZoom(this.minZoom);
        this.camera.updateProjectionMatrix();

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

    pan_usingScreenCoords = function ( panStart_inScreenCoord, panEnd_inScreenCoord ) {
        // console.log('BEG pan_usingScreenCoords');

        let selectedLayer = COL.model.getSelectedLayer();
        let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();

        let panStart_inNDC_Coord = texturePanelPlugin.screenPointCoordToNormalizedCoord( panStart_inScreenCoord );
        let panEnd_inNDC_Coord = texturePanelPlugin.screenPointCoordToNormalizedCoord( panEnd_inScreenCoord );
        
        let panStart_inWorldCoord = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, panStart_inNDC_Coord);
        let panEnd_inWorldCoord = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(this.camera, panEnd_inNDC_Coord);

        let delta_inWorldCoord = new THREE_Vector3();
        delta_inWorldCoord.copy( panEnd_inWorldCoord );
        delta_inWorldCoord.sub( panStart_inWorldCoord );

        this.panLeft( delta_inWorldCoord.x );
        this.panUp( -delta_inWorldCoord.y );
    };

    pan_usingWorldCoords = function ( delta_inWorldCoord ) {
        // console.log('BEG pan_usingWorldCoords');
        
        this.panLeft( delta_inWorldCoord.x );
        this.panUp( -delta_inWorldCoord.y );
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
        
        // _TEXTURE_2D - x-red - directed right (on the screen), y-green directed up (on the screen), z-blue directed towards the camera

        let y1 = 0;
        let y1a = 0;
        let pos_y1 = 0;
        let y3 = 0;
        if(viewportExtendsOnX)
        {
            y1 = this.camera.position.y + (this.camera.bottom / this.camera.zoom);
            y1a = Math.max(y1, bbox.min.y);
            pos_y1 = y1a - (this.camera.bottom / this.camera.zoom);
            y3 = this.camera.position.y + (this.camera.top / this.camera.zoom);
        }
        else
        {
            y1 = this.camera.position.y + (this.camera.bottom * this.minZoom / this.camera.zoom);
            y1a = Math.max(y1, bbox.min.y);
            pos_y1 = y1a - (this.camera.bottom * this.minZoom / this.camera.zoom);
            y3 = this.camera.position.y + (this.camera.top * this.minZoom / this.camera.zoom);
        }

        let pos_y = 0;
        if((y1 <= bbox.min.y) && (y3 >= bbox.max.y))
        {
            // the camera view exceeds the image
            // Center the image (y axis) in the view window
            pos_y = (bbox.min.y + bbox.max.y) / 2;
        }
        else
        {
            let y2 = 0;
            let y2a = 0;
            if(viewportExtendsOnX)
            {
                y2 = pos_y1 + (this.camera.top / this.camera.zoom);
                y2a = Math.min(y2, bbox.max.y);
                pos_y = y2a - (this.camera.top / this.camera.zoom);
            }
            else
            {
                y2 = pos_y1 + (this.camera.top * this.minZoom / this.camera.zoom);
                y2a = Math.min(y2, bbox.max.y);
                pos_y = y2a - (this.camera.top * this.minZoom / this.camera.zoom);
            }
        }

        // Limit the panning
        this.camera.position.set(pos_x, pos_y, this.camera.position.z);
        this.camera.lookAt(pos_x, pos_y, this.target.z);
        this.target.set(pos_x, pos_y, 0);
    };

    ///////////////////////////////////
    // BEG Touch related functions
    ///////////////////////////////////

    handleTouchMove4 = function ( event ) {
        // console.log('BEG handleTouchMove4');

        // Prevent from applying the _default_, _generic_ browser scroll to the texture2D pane
        // Instead, the texture2D pane is _panned_ with custom logic
        event.preventDefault();

        switch ( event.touches.length ) {

            case 1:
                // one-finger touch
                this.setState( OrbitControlsTexPane.STATE.PAN );
                
                let point2d = new THREE_Vector2(event.touches[0].pageX,
                                                event.touches[0].pageY);
                this.handleMouseMove_orOneFingerTouchMove4(point2d);
                break;

            case 2: 
                // two-finger-pinch(zoom,dolly) touch
                this.setState( OrbitControlsTexPane.STATE.DOLLY );
                if(event.targetTouches.length == 2)
                {
                    // Enable "two-finger-pinch(zoom,dolly) touch" only if both touches are in the same DOM element.
                    let dx = Math.abs(event.touches[0].pageX - event.touches[1].pageX);
                    let dy = Math.abs(event.touches[0].pageY - event.touches[1].pageY);
                    let deltaPoint2d = new THREE_Vector2(dx, dy);

                    let x2 = (event.touches[0].pageX + event.touches[1].pageX) / 2;
                    let y2 = (event.touches[0].pageY + event.touches[1].pageY) / 2;
                    let centerPoint2d_inScreenCoord_end = new THREE_Vector2(x2, y2);

                    let selectedLayer = COL.model.getSelectedLayer();
                    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
                    this.centerPoint2d_inNDC_end = texturePanelPlugin.screenPointCoordToNormalizedCoord( centerPoint2d_inScreenCoord_end );
                    
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
                        
                        // console.log('TexturePanelPlugin.doDrawTwoFingerTouchCenterPoint', TexturePanelPlugin.doDrawTwoFingerTouchCenterPoint); 
                        if(TexturePanelPlugin.doDrawTwoFingerTouchCenterPoint)
                        {
                            // highlight the centerPoint between the two-finger touch
                            texturePanelPlugin._centerPoint_twoFingerTouch.position.copy( centerPoint3d_inWorldCoord_end );
                            texturePanelPlugin._centerPoint_twoFingerTouch.position.setZ( TexturePanelPlugin.pozitionZ );
                        }
                    }

                    this.handleTwoFingerTouchMove4();
                }

                break;

            default:
                this.setState( OrbitControlsTexPane.STATE.NONE );
        }

        // console.log('END handleTouchMove4');
    };

    ///////////////////////////////////
    // END Touch related functions
    ///////////////////////////////////

    ///////////////////////////////////
    // BEG Mouse related functions
    ///////////////////////////////////

    handleMouseDown_orTouchStart4 = function ( point2d ) {
        // console.log( 'BEG handleMouseDown_orTouchStart4' );

        this.panStart.set( point2d.x, point2d.y );
    };
    
    handleMouseMove_orOneFingerTouchMove4 = function ( point2d_inScreenCoord ) {
        // console.log( 'BEG handleMouseMove_orOneFingerTouchMove4' );

        this.panEnd.set( point2d_inScreenCoord.x, point2d_inScreenCoord.y );
        // pan the pane
        this.pan_usingScreenCoords( this.panStart, this.panEnd );

        // update panStart for the future
        this.panStart.copy( this.panEnd );
        this.update();
    };
    

    handleTwoFingerTouchMove4 = function () {
        // console.log( 'BEG handleTwoFingerTouchMove4' );

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
    handleMouseDown4 = async function ( event ) {
        // console.log('BEG handleMouseDown4'); 

        event.preventDefault();
        let point2d = new THREE_Vector2(event.clientX, event.clientY);
        switch ( event.button ) {
            case OrbitControlsTexPane.mouseButtons.LEFT:
                this.handleMouseDown_orTouchStart4( point2d );
                break;
        }
    };

    handleMouseWheel4 = function ( event ) {
        console.log('BEG handleMouseWheel4');

        if ( this.state !== OrbitControlsTexPane.STATE.NONE )
        {
            return;
        }

        if ( event.deltaY < 0 ) {
            this.dollyInOut( this.getZoomScale(), true );
        }
        else if ( event.deltaY > 0 ) {
            this.dollyInOut( this.getZoomScale(), false );
        }
        TexturePanelPlugin.render2();
        this.update();
    };

    ///////////////////////////////////
    // END Mouse related functions
    ///////////////////////////////////

    handleContextMenu4 = function ( event ) {
        // TBD enables taking a snapshot of the texture2D pane. Possible future feature
        // for now disabling it so that it does not pop up the menu when right clicking in Edit mode
        event.preventDefault();
    };

};

///////////////////////////////////
// BEG Static class variables
///////////////////////////////////

OrbitControlsTexPane.STATE = { NONE: -1, NA1: 0, DOLLY: 1, PAN: 2 };

OrbitControlsTexPane.EPS = 0.0001;

// The four arrow keys
OrbitControlsTexPane.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

// Mouse buttons
OrbitControlsTexPane.mouseButtons = { LEFT: THREE_MOUSE.LEFT, MIDDLE: THREE_MOUSE.MIDDLE, RIGHT: THREE_MOUSE.RIGHT };

///////////////////////////////////
// END Static class variables
///////////////////////////////////

export { OrbitControlsTexPane };
