// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

////////////////////////////////////////////////////////////////
//
// The scene file is the main container for the application
// In the threejs examples there are e.g. scene, camera, light, renderer in the main html file
// The Scene3DtopDown class stores such telements
//
////////////////////////////////////////////////////////////////

import {Vector3 as THREE_Vector3,
        Vector2 as THREE_Vector2,
        Box3 as THREE_Box3,
        Vector4 as THREE_Vector4,
        Scene as THREE_Scene,
        MeshBasicMaterial as THREE_MeshBasicMaterial,
        CircleGeometry as THREE_CircleGeometry,
        DoubleSide as THREE_DoubleSide,
        Mesh as THREE_Mesh,
        OrthographicCamera as THREE_OrthographicCamera,
        Raycaster as THREE_Raycaster,
        AxesHelper as THREE_AxesHelper,
        AmbientLight as THREE_AmbientLight
       } from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from  "../COL.js";
import { Model } from "./Model.js";
import { IntersectionInfo } from  "../util/IntersectionInfo.js";
import { EditOverlayRect_Scene3DtopDown_TrackballControls } from "../orbitControl/EditOverlayRect_Scene3DtopDown_TrackballControls.js";
import { OrbitControls3Dpane } from  "../orbitControl/OrbitControls3Dpane.js";
import { OverlayRect } from "./OverlayRect.js";
// import { Whiteboard } from "./Whiteboard.js";
import "../util/Util.js";
import "../util/ThreejsUtil.js";
import "../util/Util.AssociativeArray.js";
import "../util/ErrorHandlingUtil.js";

const camera3DtopDownHeight = 2000;
var camera3DtopDownPosition0 = new THREE_Vector3(643, camera3DtopDownHeight, 603);

class Scene3DtopDown {
    constructor(){
        this._scene2;
        this._camera3DtopDown;
        this._orbitControls;
        this._renderer3DtopDown;
        
        // the mouseCoord in normalized units [-1, 1]
        this._mouse3DtopDown = new THREE_Vector2();
        
        this._bbox = undefined;
        this._raycaster3DtopDown;
        this.viewportExtendsOnX = false;
        this._currentViewportNormalized;
        this._editOverlayRect_Scene3DtopDown_TrackballControls = undefined;
        this._axesHelperIntersection;
        this._intersectedStructureInfo = new IntersectionInfo({intersectionLayer: undefined});
        this._intersectedOverlayRectInfo = new IntersectionInfo({intersectionLayer: undefined});
        this.timeStamp = 0;
        this.onMouseDownOrTouchStartStillProcessing = false;
        this.onMouseUpOrTouchUpStillProcessing = false;
        this._overlayRectRadius = 20;
        this._overlayRectScale = 1;
        
        this.lights = {
            AmbientLight: null,
            Headlight: null
        };

        this.lightsTopDown = {
            AmbientLight: null,
            Headlight: null
        };
    };

    // a.k.a. screenCoord_to_NDC_Coord
    // Normalized Device Coordinate (NDC)
    // https://threejs.org/docs/#api/en/math/Vector3.unproject
    // NDC_Coord (a.k.a. normalizedMouseCoord, mouseCoord) - is normalized to [-1, 1]
    // 
    screenPointCoordToNormalizedCoord = function(point2d) {
        // console.log('BEG screenPointCoordToNormalizedCoord');
        
        let mouseCoord = new THREE_Vector2();
        mouseCoord.x = ( ( point2d.x - this.get3DtopDownOffset().left - this._currentViewportNormalized.x ) /
                         this._currentViewportNormalized.z ) * 2 - 1;

        mouseCoord.y = - ( ( point2d.y - this.get3DtopDownOffset().top - this._currentViewportNormalized.y ) /
                           this._currentViewportNormalized.w ) * 2 + 1;
        
        return mouseCoord;
    };

    screenNormalizedPointCoordToPointCoord = function(mouseCoord) {
        // console.log('BEG screenNormalizedPointCoordToPointCoord');
        
        let size3DtopDown = this.get3DtopDownSize();
        let point2d = new THREE_Vector2();

        point2d.x = (this._currentViewportNormalized.z * ((mouseCoord.x + 1) / 2)) + this._currentViewportNormalized.x + this.get3DtopDownOffset().left
        point2d.y = -((this._currentViewportNormalized.w * ((mouseCoord.y - 1) / 2)) + this._currentViewportNormalized.y + this.get3DtopDownOffset().top);
        
        return point2d;
    };
    
    getMouseCoords = function() {
        return this._mouse3DtopDown;
    };

    setMouseCoords = function( event ) {
        // console.log('BEG setMouseCoords');
        
        // https://stackoverflow.com/questions/18625858/object-picking-from-small-three-js-viewport
        // https://stackoverflow.com/questions/28632241/object-picking-with-3-orthographic-cameras-and-3-viewports-three-js
        // You need to consider the viewport parameters and adjust the mouse.x and mouse.y values so they always remain in the interval [ - 1, + 1 ]. – WestLangley

        if(!this._mouse3DtopDown || !this._currentViewportNormalized)
        {
            // this._mouse3DtopDown, or this._currentViewportNormalized are not defined yet!!
            return null;
        }

        // console.log('event', event); 
        
        // // border of 0 for _topDownPaneWrapper
        // let border = 0;
        // let padding = 30;
        // let canvasTopDownEl = _renderer3DtopDown.domElement;
        // this._mouse3DtopDown.x = ( ( event.clientX - this.get3DtopDownOffset().left - (canvasTopDownEl.offsetLeft + border - padding) - this._currentViewportNormalized.x ) /
        //                       this._currentViewportNormalized.z ) * 2 - 1;

        // this._mouse3DtopDown.y = - ( ( event.clientY - this.get3DtopDownOffset().top - (canvasTopDownEl.offsetTop + border - padding) - this._currentViewportNormalized.y ) /
        //                         this._currentViewportNormalized.w ) * 2 + 1;

        // without "css grid layout" - we need to subtract this.get3DtopDownOffset().left, this.get3DtopDownOffset().top
        // this.get3DtopDownOffset includes the (border + padding) for _topDownPaneWrapper

        // # --------------------------------------------------------------

        this._mouse3DtopDown.x = ( ( event.clientX - this.get3DtopDownOffset().left - this._currentViewportNormalized.x ) /
                                   this._currentViewportNormalized.z ) * 2 - 1;

        this._mouse3DtopDown.y = - ( ( event.clientY - this.get3DtopDownOffset().top - this._currentViewportNormalized.y ) /
                                     this._currentViewportNormalized.w ) * 2 + 1;
        
        return this._mouse3DtopDown;
    };

    get3DtopDownSize = function() {
        // console.log('BEG get3DtopDownSize');
        
        let _topDownPane = $('#topDownPaneId');
        let size3DtopDown = { width: _topDownPane.innerWidth(),
                              height: _topDownPane.innerHeight() };
        // console.log('size3DtopDown', size3DtopDown);
        
        return size3DtopDown;
    };

    bound3DtopDownSize_bySizeOfParentElement = function () {
        // console.log('BEG bound3DtopDownSize_bySizeOfParentElement');
        
        let _topDownPaneWrapperEl = $('#topDownPaneWrapperId');
        let _topDownPaneWrapperEl_offset = _topDownPaneWrapperEl.offset();
        let grid_container1 = $('#grid-container1');
        
        if((_topDownPaneWrapperEl_offset.top + _topDownPaneWrapperEl.outerHeight()) > grid_container1.outerHeight())
        {
            _topDownPaneWrapperEl.outerHeight(grid_container1.outerHeight() - _topDownPaneWrapperEl_offset.top);
        }

        if((_topDownPaneWrapperEl_offset.left + _topDownPaneWrapperEl.outerWidth()) > grid_container1.outerWidth())
        {
            _topDownPaneWrapperEl.outerWidth(grid_container1.outerWidth() - _topDownPaneWrapperEl_offset.left);
        }
    };

    get3DtopDownOffset = function() {
        let _topDownPane = $('#topDownPaneId');

        return {
            left: _topDownPane.offset().left,
            top: _topDownPane.offset().top
        };
    };

    //SCENE INITIALIZATION  ________________________________________________________

    initScene3DtopDown = function() {
        // console.log('BEG initScene3DtopDown'); 

        ////////////////////////////////////////////////////
        // 3DtopDown
        ////////////////////////////////////////////////////
        
        //////////////////////////////////////
        // Set camera related parameters
        //////////////////////////////////////

        this._scene2 = new THREE_Scene();
        this._scene2.name = "__scene2";

        // Set camera frustum to arbitrary initial width height
        // These will change later when a selecting a new floor level
        let width1 = 1000 / 2;
        let height1 = 1000 / 2;

        let left = -width1;
        let right = width1;
        let top = height1;
        let bottom = -height1;

        let near = 0.1;
        let far = 100000;
        this._camera3DtopDown = new THREE_OrthographicCamera(left, right, top, bottom, near, far);
        this._camera3DtopDown.name = "camera1";

        let size3DtopDown = this.get3DtopDownSize();
        let size3DtopDownRatio = size3DtopDown.width / size3DtopDown.height;
        // console.log('size3DtopDownRatio', size3DtopDownRatio); 
        // console.log('size3DtopDown.width3', size3DtopDown.width);

        this._camera3DtopDown.updateProjectionMatrix();

        this._camera3DtopDown.lookAt( this._scene2.position );
        this._camera3DtopDown.updateMatrixWorld();

        this._scene2.add(this._camera3DtopDown);

        if(Scene3DtopDown.doDrawTwoFingerTouchCenterPoint)
        {
            //////////////////////////////////////////////////////////////
            // Add centerPoint between two-finger touch
            //////////////////////////////////////////////////////////////
            
            let numSegments = 32;
            const geometry = new THREE_CircleGeometry( this._overlayRectRadius, numSegments );
            const material = new THREE_MeshBasicMaterial( {
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                color: COL.util.redColor
            } );

            this._centerPoint_twoFingerTouch = new THREE_Mesh( geometry, material );
            this._centerPoint_twoFingerTouch.rotation.x = -Math.PI/2;
            this._centerPoint_twoFingerTouch.name = "centerPoint_twoFingerTouch";
            this._centerPoint_twoFingerTouch.visible = true;
            this._centerPoint_twoFingerTouch.updateMatrixWorld();
            this.addToScene(this._centerPoint_twoFingerTouch);
        }

        //////////////////////////////////////
        // Set other parameters
        //////////////////////////////////////

        // _group3DtopDown = new THREE_Object3D();
        // this._scene2.add(_group3DtopDown);

        this._raycaster3DtopDown = new THREE_Raycaster();

        //////////////////////////////////////
        // Set this._renderer3DtopDown
        // https://stackoverflow.com/questions/21548247/clean-up-threejs-webgl-contexts
        // set the _renderer3DtopDown2 as a member of Model, so that it
        // does not get disposed when disposing Layer::scene3DtopDown.
        //////////////////////////////////////

        this._renderer3DtopDown = COL.model.getRenderer3DtopDown();
        
        ////////////////////////////////////////////////////
        // Helpers
        ////////////////////////////////////////////////////
        
        // https://sites.google.com/site/threejstuts/home/polygon_offset
        // When both parameters are negative, (decreased depth), the mesh is pulled towards the camera (hence, gets in front).
        // When both parameters are positive, (increased depth), the mesh is pushed away from the camera (hence, gets behind).
        // order from far to near:
        // mesh (polygonOffsetUnits = 4, polygonOffsetFactor = 1)
        // this._axesHelperIntersection (polygonOffsetUnits = -4, polygonOffsetFactor = -1)
        

        
        this._axesHelperIntersection = new THREE_AxesHelper(500);
        this._axesHelperIntersection.material.linewidth = 20;
        this._axesHelperIntersection.material.polygonOffset = true;
        this._axesHelperIntersection.material.polygonOffsetUnits = -4;
        // this._axesHelperIntersection more in front, compared to e.g. mesh
        this._axesHelperIntersection.material.polygonOffsetFactor = -1;
        
        // this._scene2.add(this._axesHelperIntersection);

        // https://stackoverflow.com/questions/20554946/three-js-how-can-i-update-an-arrowhelper
        var sourcePos = this._scene2.position;
        sourcePos = new THREE_Vector3(0,0,0);

        var targetPos = this._camera3DtopDown.position;
        targetPos = new THREE_Vector3(1000 ,100 , 100);

        ////////////////////////////////////////////////////
        // INIT CONTROLS
        ////////////////////////////////////////////////////

        this.initializeOrbitControls3Dpane();
        

        ////////////////////////////////////////////////////
        // INIT LIGHTS 
        ////////////////////////////////////////////////////

        let lightTopDown = new THREE_AmbientLight("#808080");
        lightTopDown.name = "ambientLight1";
        this._scene2.add(lightTopDown);

        this.lightsTopDown.AmbientLight = new COL.core.AmbientLight(this._scene2, this._camera3DtopDown, this._renderer3DtopDown);
        this.lightsTopDown.name = "ambientLight2";
        this.lightsTopDown.AmbientLight = "ambientLight2";

        this.lightsTopDown.Headlight = new COL.core.Headlight(this._scene2, this._camera3DtopDown, this._renderer3DtopDown);
        this.lightsTopDown.Headlight.name = "headLight2";
        
        ////////////////////////////////////////////////////
        // EVENT HANDLERS
        ////////////////////////////////////////////////////

        let container3DtopDown = document.getElementById('topDownPaneId');
        if (COL.util.isTouchDevice())
        {
            container3DtopDown.addEventListener('touchmove', this._orbitControls.update.bind(this._orbitControls), {capture: false, passive: false});
        }
        else
        {
            container3DtopDown.addEventListener('mousemove', this._orbitControls.update.bind(this._orbitControls), {capture: false, passive: false});
            container3DtopDown.addEventListener('mousewheel', this._orbitControls.update.bind(this._orbitControls), {capture: false, passive: false});

            // needed for firefox ???
            // container3DtopDown.addEventListener('DOMMouseScroll', this._orbitControls.update.bind(this._orbitControls), {capture: false, passive: false}); // firefox
        }

        this._orbitControls.enableControls(true);
        
        $(window).resize(function () {
            // console.log('BEG topDown window resize');
            
            let selectedLayer = COL.model.getSelectedLayer();
            let scene3DtopDown = selectedLayer.getScene3DtopDown();
            // the size of the topDown pane stays the same, even though the size of the full window changed (this may require to scroll)
            // if doRescale == true, resize the plan view in the topDown pane to cover the full image. Otherwise leave the view as is.
            let doRescale = false;
            scene3DtopDown.set_camera_canvas_renderer_and_viewport1(doRescale);

            // tbd - resize the topDown pane itself, relative to the new size of the window, e.g.
            //   if the window is shrunk horizontally to 1/2 the original size, make the width of the topDown pane 1/2 as well, while keeping the same plan view
        });

        if(COL.doWorkOnline)
        {
            this.initializeEditTopDownOverlayControl();
        }

        
        // console.log('END initScene3DtopDown'); 
    };


    // set_camera_canvas_renderer_and_viewport1 - does:
    //  - sets the camera
    //    -- if rescaling the image, sets the camera position to center of the image, and height to Scene3DtopDown._heightOffset
    //  - sets _orbitControls
    //    -- calls OrbitControls3Dpane::setCameraAndCanvas - does xxx
    //  - sets _renderer3DtopDown
    //  - sets _currentViewportNormalized
    
    set_camera_canvas_renderer_and_viewport1 = function( doRescale = true ) {
        // console.log('BEG Scene3DtopDown set_camera_canvas_renderer_and_viewport1');

        let selectedLayer = COL.model.getSelectedLayer();
        let floorPlanMeshObj = selectedLayer.getFloorPlanMeshObj();

        
        if(COL.util.isObjectInvalid(floorPlanMeshObj))
        {
            // sanity check
            throw new Error('floorPlanMeshObj is invalid');
        }

        // ground_1 is given as the object.name for every floorPlan when creating a new .zip file, using the utility
        // webClient/scripts/create_site_zip_file.py, when creating a new .zip file,
        // ('ground_1' is defined in template file webClient/scripts/templateFiles/via_json/layer.template.json)
        // ground_1 === floor_plan (cannot just replace because exiting models already have 'ground_1')
        let selectedFloorObj = floorPlanMeshObj.getObjectByName('ground_1');
        if(selectedFloorObj)
        {
            // console.log('selectedFloorObj.material.map.image', selectedFloorObj.material.map.image);
            
            // bound the size of _topDownPaneWrapperEl pane by the size of it's parent element (grid-container1)
            this.bound3DtopDownSize_bySizeOfParentElement();

            // size3DtopDown - the size of the gui window
            let size3DtopDown = this.get3DtopDownSize();
            
            if(doRescale)
            {
                // Rescale the topDown view to cover the entire image
                this._bbox = new THREE_Box3().setFromObject(floorPlanMeshObj);
                this._bbox.getCenter( this._camera3DtopDown.position ); // this re-sets the position
                this._camera3DtopDown.position.setY(Scene3DtopDown._heightOffset);
                this._camera3DtopDown.updateProjectionMatrix();
            }
            
            // Update the camera frustum to cover the entire image
            let width1 = (this._bbox.max.x - this._bbox.min.x);
            let height1 = (this._bbox.max.z - this._bbox.min.z);
            let imageOrientation = 1;

            let retVal = this._orbitControls.setCameraAndCanvas(size3DtopDown.width,
                                                                size3DtopDown.height,
                                                                width1,
                                                                height1,                             
                                                                imageOrientation,
                                                                doRescale);
            this._viewportExtendsOnX = retVal.viewportExtendsOnX;

            this._renderer3DtopDown.setSize(size3DtopDown.width, size3DtopDown.height);
            
            // Set this._currentViewportNormalized (normalized by the pixelRatio)
            this._renderer3DtopDown.setViewport ( -retVal.canvasOffsetLeft, -retVal.canvasOffsetTop, retVal.canvasWidth, retVal.canvasHeight );

            let currentViewport = new THREE_Vector4();
            this._renderer3DtopDown.getCurrentViewport(currentViewport);

            let pixelRatio = this._renderer3DtopDown.getPixelRatio();
            this._currentViewportNormalized = new THREE_Vector4();
            this._currentViewportNormalized.copy(currentViewport)
            this._currentViewportNormalized.divideScalar(pixelRatio);
            this._orbitControls.update();
        }
    };


    initializeOrbitControls3Dpane = function() {
        // console.log('BEG initializeOrbitControls3Dpane'); 

        let container3DtopDown = document.getElementById('topDownPaneId');
        this._orbitControls = new OrbitControls3Dpane(this._camera3DtopDown, container3DtopDown);

        //////////////////////////////////////
        // Set rotate related parameters
        //////////////////////////////////////

        // No rotation.
        this._orbitControls.enableRotate = false;

        // Set the rotation angle (with 0 angle change range) to 0
        // coordinate axis system is:
        // x-red - directed right (on the screen), z-blue directed down (on the screen), y-green directed towards the camera
        this._orbitControls.minPolarAngle = 0; // radians
        this._orbitControls.maxPolarAngle = 0; // radians

        // No orbit horizontally.
        this._orbitControls.minAzimuthAngle = 0; // radians
        this._orbitControls.maxAzimuthAngle = 0; // radians

        //////////////////////////////////////
        // Set zoom related parameters
        //////////////////////////////////////

        this._orbitControls.zoomSpeed = 1.2;
        // this._orbitControls.minZoom = 1;
        // this._orbitControls.maxZoom = Infinity;

        //////////////////////////////////////
        // Set pan related parameters
        //////////////////////////////////////

        this._orbitControls.panSpeed = 0.6;
        // if true, pan in screen-space
        this._orbitControls.screenSpacePanning = true;
        // // pixels moved per arrow key push
        // this._orbitControls.keyPanSpeed = 7.0;

        this._orbitControls.keys = [65, 83, 68, 70, 71, 72];

        // https://css-tricks.com/snippets/javascript/javascript-keycodes/
        // shift        16
        // ctrl         17
        // alt  18

        $(document).keydown(function (event) {
            // ASCII 72 is 'h', so clicking Ctrl+h (or Meta+Shift+h) is intercepted here.
            // Inside the code calls the TexturePanelPlugin.reset, i.e. 
            // Ctrl+h is mapped to reseting the view of the scene

            if ((event.ctrlKey || (event.metaKey && event.shiftKey)) && event.which === 72) {
                event.preventDefault();
                this._orbitControls.reset();
            }
        });

        // need to set this._camera3DtopDown.position after construction of this._orbitControls
        this._camera3DtopDown.position.copy( camera3DtopDownPosition0 );
        this._camera3DtopDown.zoom = 0.42;

        this._orbitControls.target.copy(this._camera3DtopDown.position);
        // initial this._orbitControls.target.Y is set to 0
        this._orbitControls.target.setY(COL.y0);
        
        // enable this._orbitControls
        this.enableControls(true);

    };

    enableControls = function(doEnable) {
        // console.log('BEG Scene3DtopDown::enableControls');
        
        // reset, in case that scene3DtopDown is stuck waiting for the following events
        this.onMouseUpOrTouchUpStillProcessing = false;
        this.onMouseDownOrTouchStartStillProcessing = false;

        // let topDownPaneWrapperEl = document.getElementById('topDownPaneWrapperId');
        // topDownPaneWrapperEl.addEventListener( 'touchstart', onTouchStart7, {capture: false, passive: false} );
        
        let container3DtopDown = document.getElementById('topDownPaneId');
        if(doEnable)
        {
            container3DtopDown.addEventListener( 'contextmenu', onContextMenu1, {capture: false, passive: false} );
            if (COL.util.isTouchDevice())
            {
                container3DtopDown.addEventListener( 'touchstart', onTouchStart1, {capture: false, passive: false} );
            }
            else
            {
                container3DtopDown.addEventListener( 'mousedown', onMouseDown1, {capture: false, passive: false} );
                container3DtopDown.addEventListener( 'wheel', onMouseWheel1, {capture: false, passive: false} );
            }
            
            container3DtopDown.addEventListener( 'keydown', onKeyDown1, {capture: false, passive: false} );
            container3DtopDown.addEventListener( 'keyup', onKeyUp1, {capture: false, passive: false} );
        }
        else
        {
            container3DtopDown.removeEventListener( 'contextmenu', onContextMenu1, {capture: false, passive: false} );

            if (COL.util.isTouchDevice())
            {
                container3DtopDown.removeEventListener( 'touchstart', onTouchStart1, {capture: false, passive: false} );

                // comment2
                // theroetically, there is no need to remove onTouchMove1, because it is removal is handled in onTouchEnd1
                // But I have seen cases in editMode, where onTouchMove1 was still responding. This could have happenned due to some combination of
                // button-pressing + race condition ? e.g.
                // onTouchEnd1 hasn't finished processing, yet and the editMode button was already toggled ??
                // so to be safe we remove onTouchMove1 here as well
                container3DtopDown.removeEventListener( 'touchmove', onTouchMove1, {capture: false, passive: false} );
            }
            else
            {
                container3DtopDown.removeEventListener( 'mousedown', onMouseDown1, {capture: false, passive: false} );

                // see comment2
                container3DtopDown.removeEventListener( 'mousemove', onMouseMove1, {capture: false, passive: false} );

                container3DtopDown.removeEventListener( 'wheel', onMouseWheel1, {capture: false, passive: false} );
            }
            container3DtopDown.removeEventListener( 'keydown', onKeyDown1, {capture: false, passive: false} );
            container3DtopDown.removeEventListener( 'keyup', onKeyUp1, {capture: false, passive: false} );
        }
    };

    initializeEditTopDownOverlayControl = function() {

        // initialize EditTopDownOverlayControl:
        // - instantiate this._editOverlayRect_Scene3DtopDown_TrackballControls, and
        this._editOverlayRect_Scene3DtopDown_TrackballControls = new EditOverlayRect_Scene3DtopDown_TrackballControls( this._camera3DtopDown,
                                                                                                                       this._renderer3DtopDown.domElement );

        // - disable edit mode
        this.enableEditTopDownOverlayControl(false);

    };

    enableEditTopDownOverlayControl = function(doEnable) {
        this._editOverlayRect_Scene3DtopDown_TrackballControls.enableControls(doEnable);
    };
    
    getCamera3DtopDown = function() {
        return this._camera3DtopDown;
    };

    setCamera3DtopDown2 = function(camera3DtopDown) {
        this._camera3DtopDown = camera3DtopDown;
    };

    setCamera3DtopDown = function(mesh) {
        // console.log('BEG setCamera3DtopDown'); 

        this._bbox = mesh.bBox;

        if(this._bbox)
        {
            this._bbox.getCenter( this._camera3DtopDown.position ); // this re-sets the position
            // set the camera positionY to be higher than the floor
            this._camera3DtopDown.position.setY(Scene3DtopDown._heightOffset);
        }
        
        // Update the camera frustum to cover the entire image
        let width1 = (this._bbox.max.x - this._bbox.min.x) / 2;
        let height1 = (this._bbox.max.z - this._bbox.min.z) / 2;
        
        this._camera3DtopDown.left = -width1;
        this._camera3DtopDown.right = width1;
        this._camera3DtopDown.top = height1;
        this._camera3DtopDown.bottom = -height1;
        this._camera3DtopDown.updateProjectionMatrix();
    };

    addToScene = function(threejsObject) {
        // console.log('BEG addToScene'); 
        this._scene2.add(threejsObject);
    };

    removeFromScene = function(threejsObject) {
        // console.log('BEG removeFromScene'); 
        this._scene2.remove(threejsObject);
    };

    getScene2 = function() {
        return this._scene2;
    }

    getIntersectionStructureInfo = function() {
        return this._intersectedStructureInfo;    
    }
    
    getIntersectionOverlayRectInfo = function() {
        return this._intersectedOverlayRectInfo;    
    }

    clearIntersectionOverlayRectInfo = function() {
        this._intersectedOverlayRectInfo.clearCurrentIntersection();
    }

    insertCircleMesh = async function(intersectedStructurePoint, doSetAsSelectedOverlayRect = true) {
        console.log('BEG insertCircleMesh');

        let selectedLayer = COL.model.getSelectedLayer();
        let rectangleMesh = selectedLayer.createCircleMesh(intersectedStructurePoint);
        let overlayRect = undefined;
        if(rectangleMesh)
        {
            // ///////////////////////////////////////////////////////////
            // Add to overlayMeshGroup
            // ///////////////////////////////////////////////////////////

            let overlayMeshObj = selectedLayer.addToOverlayMeshGroup(rectangleMesh);

            // indicate that the overlayRect has changed (new overlayRect) compared to the back-end
            overlayRect = selectedLayer.getOverlayRectByName(overlayMeshObj.name);
            let overlayRectIsDirty2 = {
                isDirty_newOverlayRect: true
            };
            overlayRect.setIsDirty2(overlayRectIsDirty2);

            if(doSetAsSelectedOverlayRect)
            {
                await selectedLayer.setSelectedOverlayRect(overlayMeshObj);
            }
        }
        else
        {
            throw new Error('Failed to create rectangleMesh');
        }

        return overlayRect;
    };

    getOverlayRectRadius = function() {
        return this._overlayRectRadius;
    };
    
    setOverlayRectRadius = function(overlayRectRadius) {
        return this._overlayRectRadius = overlayRectRadius;
    };
    
    getOverlayRectScale = function() {
        return this._overlayRectScale;
    };
    
    setOverlayRectScale = function(overlayRectScale) {
        this._overlayRectScale = overlayRectScale;
    };
    
    getAxesHelperIntersection = function() {
        return this._axesHelperIntersection;
    };

    getOrbitControls = function() {
        return this._orbitControls;
    };

    setOrbitControls = function(controls) {
        this._orbitControls = controls;
    };

    getBoundingBox = function() {
        return this._bbox;
    };
    
    setBoundingBox = function(bbox) {
        return this._bbox = bbox;
    };

    doesViewportExtendOnX = function() {
        return this._viewportExtendsOnX;
    };

    getCurrentViewportNormalized = function() {
        return this._currentViewportNormalized;
    };

    setCurrentViewportNormalized = function(currentViewportNormalized) {
        this._currentViewportNormalized = currentViewportNormalized;
    };
    
    centerIntersectionPointInTopDownView = function() {

        console.log('BEG centerIntersectionPointInTopDownView'); 
        
        /////////////////////////////////////////////////////////////
        // center the topDown view by changing both
        // - the cameraTopDown position, and
        // - the cameraTopDown target (lookAt)
        /////////////////////////////////////////////////////////////
        
        let axesHelperIntersection = this.getAxesHelperIntersection();
        this._camera3DtopDown.position.copy(axesHelperIntersection.position);
        this._camera3DtopDown.position.setY(camera3DtopDownHeight);
        
        let orbitControls = this.getOrbitControls();
        orbitControls.target.copy(this._camera3DtopDown.position);
        // orbitControls.target.setY(0.0);
        orbitControls.target.setY(COL.y0);
    };

    getLayerIntersectionsInfo(intersects)
    {
        let selectedLayer = COL.model.getSelectedLayer();

        for (let i = 0; i < intersects.length; i++)
        {
            let intersectionCurr = intersects[i];
            if( (intersectionCurr.object.type === 'Mesh') && (intersectionCurr.object.name !== 'ring') )
            {
                // Found intersection with topDownMesh (floor)
                
                // Assuming that the intersection results are sorted by distance
                let intersectionCurr_object_id = COL.util.getNestedObject(intersectionCurr, ['object', 'id']);
                let floorPlanMesh = selectedLayer.getFloorPlanMeshObj();
                let intersectedStructureObject = floorPlanMesh.getObjectById(intersectionCurr_object_id);
                
                if(intersectedStructureObject)
                {
                    return {
                        selectedLayer: selectedLayer,
                        intersectionCurr: intersectionCurr
                    };
                }
            }
            else
            {
                // Can get here e.g. if intersecting with LineSegments
                // console.log('Intersection is not a mesh'); 
            }
        }
        
        return;
    };

    findIntersectionWithTopDownMesh = function(mesh) {
        // console.log('BEG findIntersectionWithTopDownMesh'); 
        // Find intersection with topDownMesh (floor)

        let intersects = this._raycaster3DtopDown.intersectObjects( mesh.children, true );
        this._intersectedStructureInfo.clearCurrentIntersection();

        let intersectedStructureInfo_currentIntersection = undefined;
        if(intersects.length > 0)
        {
            // Get the intersection info with the topDownMesh (floor)
            let intersectionInfo = this.getLayerIntersectionsInfo(intersects);
            if(intersectionInfo)
            {
                // Set this._intersectedStructureInfo to the topDownMesh (floor) that is intersected
                this._intersectedStructureInfo.intersectionLayer = intersectionInfo.selectedLayer;
                this._intersectedStructureInfo.currentIntersection = intersectionInfo.intersectionCurr;

                intersectedStructureInfo_currentIntersection = intersectionInfo.intersectionCurr;
            }
        }

        return intersectedStructureInfo_currentIntersection;
    };

    findIntersectionWithOverlayMeshGroup = async function(selectedLayer) {
        // console.log('BEG findIntersectionWithOverlayMeshGroup'); 

        // intersect with the overlayRects (circles)

        let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();

        //////////////////////////////////////////////////////
        // Intersect with ALL children objects of overlayMeshGroup
        // and then use the first Mesh object
        //////////////////////////////////////////////////////

        let intersectsOverlayRect = this._raycaster3DtopDown.intersectObjects( overlayMeshGroup.children, true );
        // console.log('intersectsOverlayRect.length', intersectsOverlayRect.length);

        // Reset any previous intersection info before finding a new one
        this._intersectedOverlayRectInfo.clearCurrentIntersection();

        if(intersectsOverlayRect.length > 0)
        {
            // Intersect only with objects of type Mesh (i.e. ignore intersection with e.g. Sprites)
            for (let i = 0; i < intersectsOverlayRect.length; i++) {
                let intersection = intersectsOverlayRect[i];
                if( (intersection.object.type === 'Mesh') && (intersection.object.name !== 'ring') )
                {
                    let isOverlayRectFilteredIn = COL.util.getNestedObject(intersection, ['object', 'material', 'userData', 'isOverlayRectFilteredIn']);
                    if(!selectedLayer._isMilestoneDatesFilterEnabled ||
                       (selectedLayer._isMilestoneDatesFilterEnabled && isOverlayRectFilteredIn))
                    {
                        // Sets this._intersectedOverlayRectInfo to the overlayRect (circle) that is intersected
                        this._intersectedOverlayRectInfo.currentIntersection = intersection;
                        break;
                    }
                }
            }
        }

        ///////////////////////////////////////////////////////////////
        // Sets selected overlayRect
        ///////////////////////////////////////////////////////////////
        
        let intersectedOverlayMeshObject = COL.util.getNestedObject(this._intersectedOverlayRectInfo, ['currentIntersection', 'object']);
        let intersectedOverlayMeshObjectPrev = COL.util.getNestedObject(this._intersectedOverlayRectInfo, ['previousIntersection', 'object']);
        
        if( intersectedOverlayMeshObject != intersectedOverlayMeshObjectPrev )
        {
            ///////////////////////////////////////////////////////////////
            // The currentIntersection differs from the previous intersection.
            // Possible use cases:
            // - selected an overlayRect that differs from the previous overlayRect.
            // - there is an intersection with overlayRect, and previously there was an intersection with different overlayRect.
            // - there is NO intersection with overlayRect, and previously there was an intersection with overlayRect.
            // - there is an intersection with overlayRect, and previously there was NO intersection with overlayRect.
            // Update setSelectedOverlayRect
            ///////////////////////////////////////////////////////////////

            this._intersectedOverlayRectInfo.updatePreviousIntersection();
            
            await selectedLayer.setSelectedOverlayRect(intersectedOverlayMeshObject);
        }
        
        return intersectsOverlayRect;
    };


    isValidIntersectionDistanceToNearestOverlayRect = function(selectedLayer, topDownPosition, selectedOverlayMeshObjName) {
        // console.log('BEG isValidIntersectionDistanceToNearestOverlayRect'); 

        // Find closest distance between floor intersection and overlayRects (circles)

        let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
        topDownPosition.setY(COL.y0);
        
        let minDistance = 1E6;
        let nearestOverlayRect = undefined;

        for (let i = 0; i < overlayMeshGroup.children.length; ++i) {

            if(selectedOverlayMeshObjName == overlayMeshGroup.children[i].name)
            {
                // Reached the selectedOverlayMeshObjName
                // Don't check the distance from the topDownPosition intersection point to the selected overlayRect.
                
                continue;
            }

            // the overlayRectPosition is projected onto the plan. Only the plannar distance is measured.
            // (typically all overlayRects are on the floor plan [i.e. y==0] except for overlayRects that are created via split.
            // and thir y position is set to 0 after they are moved)
            let overlayRectPosition = new THREE_Vector3();
            overlayRectPosition.copy( overlayMeshGroup.children[i].position );
            overlayRectPosition.setY(COL.y0);
            
            let distance = topDownPosition.distanceTo(overlayRectPosition);
            if (distance < minDistance)
            {
                minDistance = distance;
                nearestOverlayRect = overlayMeshGroup.children[i];
            }
        }
        
        // Set the threshold to be "2 x this._overlayRectRadius" so that the overlayRects do not overlap        
        let minDistanceThresh = 2 * this._overlayRectRadius;
        let retVal = (minDistance < minDistanceThresh) ? false : true;
        
        return retVal;
    };

    isPositionWithinTopDownPaneBoundaries = function(topDownPosition) {
        // console.log('BEG isPositionWithinTopDownPaneBoundaries');

        let isPositionWithinBoundaries = false;
        
        if((topDownPosition.x >= this._bbox.min.x) &&
           (topDownPosition.x < this._bbox.max.x) &&
           (topDownPosition.z >= this._bbox.min.z) &&
           (topDownPosition.z < this._bbox.max.z) )
        {
            isPositionWithinBoundaries = true;
        }

        // console.log('isPositionWithinBoundaries', isPositionWithinBoundaries);

        return isPositionWithinBoundaries;
    };
    
    findIntersections = async function() {
        // console.log('BEG findIntersections');

        this._raycaster3DtopDown.setFromCamera( this._mouse3DtopDown, this._camera3DtopDown );
        
        let selectedLayer = COL.model.getSelectedLayer();
        let floorPlanMesh = selectedLayer.getFloorPlanMeshObj();

        // Find intersection with topDownMesh (floor)
        let intersectedStructureInfo_currentIntersection = this.findIntersectionWithTopDownMesh(floorPlanMesh);

        // tbd - overlayRect -> overlayPoint

        if(intersectedStructureInfo_currentIntersection)
        {
            this._intersectedStructureInfo.currentIntersection = intersectedStructureInfo_currentIntersection;
            let intersectionPointCurr = this._intersectedStructureInfo.currentIntersection.point;
            let intersectionPointPrev = new THREE_Vector3();
            if(this._intersectedStructureInfo.previousIntersection)
            {
                intersectionPointPrev.copy(this._intersectedStructureInfo.previousIntersection.point);
            }
            
            intersectionPointCurr.setY(COL.y0);

            // order from far to near:
            //             console.log('floorPlanMesh.position', floorPlanMesh.position);
            //             console.log('this._axesHelperIntersection.position', this._axesHelperIntersection.position);

            let dist1 = intersectionPointCurr.distanceTo( intersectionPointPrev );
            let epsilon = 1.0;
            if ( dist1 > epsilon )
            {
                intersectionPointPrev.copy(intersectionPointCurr);
                this._axesHelperIntersection.position.copy( intersectionPointCurr );
            }

            // intersect with the overlayRects (circles)
            await this.findIntersectionWithOverlayMeshGroup(selectedLayer);
            Scene3DtopDown.render1();
        }
        else
        {
            // console.log('bar222'); 
        }
    };
    
    static render1 = function() {
        // console.log('BEG this.render1');

        let selectedLayer = COL.model.getSelectedLayer();
        if(COL.util.isObjectValid(selectedLayer))
        {
            let scene3DtopDown = selectedLayer.getScene3DtopDown();

            if(COL.util.isObjectValid(scene3DtopDown))
            {
                // tbd - multiple calls update()->render1()->update()... happen as long as, between the iterations, inside _orbitControls.update()
                // we are getting into the following code section, inside _orbitControls.update():
                //   if ( this.zoomChanged ||
                //      (positionShift > OrbitControls3Dpane.EPS) ||
                //      (condition3 > OrbitControls3Dpane.EPS) ) {
                //
                // check why the first call to _orbitControls.update() (which calls render1() does not already set the position to its final value...
                scene3DtopDown._orbitControls.update();
                scene3DtopDown._renderer3DtopDown.render(scene3DtopDown._scene2, scene3DtopDown._camera3DtopDown);
            }
        }
    };
    
    resetTrackball3DtopDown = function() {
        this._orbitControls.reset();
    };

    toJSON = function()
    {
        console.log('BEG Scene3DtopDown::toJSON()');

        return {
            _scene2: this._scene2,
            _camera3DtopDown: this._camera3DtopDown,
            _orbitControls: this._orbitControls,
            _renderer3DtopDown: this._renderer3DtopDown,
            _mouse3DtopDown: this._mouse3DtopDown,
            _bbox: this._bbox,
            _raycaster3DtopDown: this._raycaster3DtopDown,
            viewportExtendsOnX: this.viewportExtendsOnX,
            _currentViewportNormalized: this._currentViewportNormalized,
            _editOverlayRect_Scene3DtopDown_TrackballControls: this._editOverlayRect_Scene3DtopDown_TrackballControls,
            _axesHelperIntersection: this._axesHelperIntersection,
            _intersectedStructureInfo: this._intersectedStructureInfo,
            _intersectedOverlayRectInfo: this._intersectedOverlayRectInfo,
            timeStamp: this.timeStamp,
            onMouseDownOrTouchStartStillProcessing: this.onMouseDownOrTouchStartStillProcessing,
            onMouseUpOrTouchUpStillProcessing: this.onMouseUpOrTouchUpStillProcessing,
            lights: this.lights,
            lightsTopDown: this.lightsTopDown,
            _overlayRectRadius: this._overlayRectRadius,
            _overlayRectScale: this._overlayRectScale,
        };
    };

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile = function () {
        // console.log('BEG toJSON_forFile'); 

        this._scene2.traverse(async function ( child ) {
            if(child.name === 'objInstance1')
            {
                ////////////////////////////////////////////////////////////////////////////
                // Remove the floor plan image so it does not get exported as part of the
                // .json file (it is stored seperatly in the floorPlan image file)
                ////////////////////////////////////////////////////////////////////////////

                let meshObj1 = child.children[0];
                // sanity check
                if ( (meshObj1.type !== 'Mesh') || (meshObj1.name !== 'ground_1') || (COL.util.isObjectInvalid(meshObj1.material))) {
                    throw new Error('Invalid meshObj1. Should have: type "Mesh", name === "ground_1", material defined', );
                }
                meshObj1.material.map = null;
            }
        });

        let scene3DtopDown_asJson = this.toJSON();
        console.log('scene3DtopDown_asJson1', scene3DtopDown_asJson);

        // remove unneeded nodes
        delete scene3DtopDown_asJson._intersectedOverlayRectInfo;
        delete scene3DtopDown_asJson._intersectedStructureInfo;
        delete scene3DtopDown_asJson._editOverlayRect_Scene3DtopDown_TrackballControls;
        delete scene3DtopDown_asJson._raycaster3DtopDown;

        // there is nothing unique that is stored for _renderer3DtopDown
        // and there is a single _renderer3DtopDown for the entire model, i.e. it is not individual for each layer)
        // so the initial _renderer3DtopDown setting is good and there is no need to store _renderer3DtopDown per layer.
        delete scene3DtopDown_asJson._renderer3DtopDown;
        
        // store (overwrite) manipulated version of _orbitControls (e.g. witout camera)
        let orbitControls = this.getOrbitControls();
        scene3DtopDown_asJson._orbitControls = orbitControls.toJSON_forFile();
        
        scene3DtopDown_asJson.images = null;
        
        return scene3DtopDown_asJson;
    };


    fromJson = async function (layer, objectLoader, scene3DtopDown_asDict) {
        ////////////////////////////////////////////////////////////////////////////
        // Set:
        // - this._overlayRectRadius
        // - this._overlayRectScale
        ////////////////////////////////////////////////////////////////////////////
        
        if(COL.util.isObjectValid(scene3DtopDown_asDict._overlayRectRadius))
        {
            this.setOverlayRectRadius(scene3DtopDown_asDict._overlayRectRadius);
        }

        if(COL.util.isObjectValid(scene3DtopDown_asDict._overlayRectScale))
        {
            this.setOverlayRectScale(scene3DtopDown_asDict._overlayRectScale);
        }

        ////////////////////////////////////////////////////////////////////////////
        // Set:
        // - this._scene2
        ////////////////////////////////////////////////////////////////////////////

        let scene2_asDict = scene3DtopDown_asDict._scene2;
        const scene2 = objectLoader.parse( scene2_asDict );
        const children = [];
        scene2.traverse(o => children.push(o));
        
        // Then you can use a regular async-loop to do your work:
        for (let child of children) {
            if(child.name === 'objInstance1')
            {
                ////////////////////////////////////////////////////////////////////////////
                // add images related to floorPlan (e.g. floorPlan image) to imagesInfo_forLayer2
                ////////////////////////////////////////////////////////////////////////////
                
                let meshObj = child;
                layer.setFloorPlanMeshObj(meshObj);

                // tbd - I placed a question of await within traverse in: https://threejs.slack.com/archives/C0AR9959Q/p1615750972263800
                // other related links
                // https://advancedweb.hu/how-to-use-async-functions-with-array-foreach-in-javascript/
                await layer.populateFloorPlanObj();

                meshObj = layer.getFloorPlanMeshObj();
                // meshObj.children[0].geometry.boundingBox

                if(COL.doEnableWhiteboard)
                {
                    let floorPlanWhiteboard = new Whiteboard();
                    layer.setFloorPlanWhiteboard(floorPlanWhiteboard);
                }

                this.addToScene(meshObj);
                this.setCamera3DtopDown(meshObj);
                Scene3DtopDown.render1();
            }
            if(child.name === 'overlayRects')
            {
                ////////////////////////////////////////////////////////////////////////////
                // add images related to overlayRects (e.g. overlayRect images) to imagesInfo_forLayer2
                ////////////////////////////////////////////////////////////////////////////

                let overlayMeshGroup = child;
                layer.populateOverlayRects(overlayMeshGroup);

                let overlayMeshGroup_asJson = overlayMeshGroup.toJSON();
                let overlayMeshGroup_asJson_str = JSON.stringify(overlayMeshGroup_asJson);

                this.addToScene(overlayMeshGroup);
            }
        }

        ////////////////////////////////////////////////////////////////////////////
        // Set:
        // - this._camera3DtopDown
        ////////////////////////////////////////////////////////////////////////////

        let camera3DtopDown_asDict = scene3DtopDown_asDict._camera3DtopDown;
        const camera3DtopDown = objectLoader.parse( camera3DtopDown_asDict );
        this.setCamera3DtopDown2(camera3DtopDown);

        ////////////////////////////////////////////////////////////////////////////
        // Set:
        // - this._orbitControls
        // - this._viewportExtendsOnX
        // - this._currentViewportNormalized
        // - this._bbox
        ////////////////////////////////////////////////////////////////////////////

        this._orbitControls.camera = this.getCamera3DtopDown();
        this._orbitControls.fromJson(scene3DtopDown_asDict._orbitControls);
        
        this.viewportExtendsOnX = scene3DtopDown_asDict.viewportExtendsOnX;

        this._currentViewportNormalized = new THREE_Vector4(scene3DtopDown_asDict._currentViewportNormalized.x,
                                                            scene3DtopDown_asDict._currentViewportNormalized.y,
                                                            scene3DtopDown_asDict._currentViewportNormalized.z,
                                                            scene3DtopDown_asDict._currentViewportNormalized.w);

        this.setBoundingBox(scene3DtopDown_asDict._bbox);
        
    };
    
    dispose = function() {
        console.log('BEG Scene3DtopDown::dispose()');

        //////////////////////////////////////////////////////
        // Before Dispose
        //////////////////////////////////////////////////////

        // console.log( "Before Dispose");
        let scene3DtopDownAsJson = this.toJSON();
        // console.log('scene3DtopDownAsJson before dispose', scene3DtopDownAsJson); 
        
        //////////////////////////////////////////////////////
        // Dispose
        // https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534
        //////////////////////////////////////////////////////
        

        // dispose geometries and materials in scene
        // this.sceneTraverse();
        // console.log('BEG Scene3DtopDown:: this._scene2.traverse');
        this._scene2.traverse(function ( obj ) {
            COL.ThreejsUtil.disposeObject(obj);
        });

        if(!COL.doUseAnimateToRenderTopDownPane)
        {
            this._scene2 = null;
            this._camera3DtopDown = null;
        }

        // remove event listeners
        this.enableControls(false);

        // https://threejs.org/docs/#examples/en/controls/OrbitControls.dispose
        this._orbitControls.dispose();
        if(!COL.doUseAnimateToRenderTopDownPane)
        {
            this._orbitControls = null;
        }

        // this._renderer3DtopDown is not disposed because it is a member of class Model
        console.log( "this._renderer3DtopDown.info.programs.length", this._renderer3DtopDown.info.programs.length );
        
        this._mouse3DtopDown = null;

        this._bbox = null;

        this._raycaster3DtopDown = null;

        this._currentViewportNormalized = null;

        if(COL.util.isObjectValid(this._editOverlayRect_Scene3DtopDown_TrackballControls))
        {
            this._editOverlayRect_Scene3DtopDown_TrackballControls.dispose();
        }
        this._editOverlayRect_Scene3DtopDown_TrackballControls = null;

        this._axesHelperIntersection.material.dispose();
        this._axesHelperIntersection = null;

        this._intersectedStructureInfo.dispose();
        this._intersectedStructureInfo = null;

        this._intersectedOverlayRectInfo.dispose();
        this._intersectedOverlayRectInfo = null;

        this.lights.AmbientLight = null;
        this.lights.Headlight = null;

        this.lightsTopDown.AmbientLight = null;
        this.lightsTopDown.Headlight = null;

        //////////////////////////////////////////////////////
        // After Dispose
        //////////////////////////////////////////////////////

        // console.log( "After Dispose");

        // let scene3DtopDownAsJson2 = this.toJSON();
        // console.log('scene3DtopDownAsJson after dispose', scene3DtopDownAsJson2); 

    };
};

///////////////////////////////////
// BEG Static class variables
///////////////////////////////////

// https://stackoverflow.com/questions/35242113/define-a-const-in-class-constructor-es6
Scene3DtopDown._heightOffset = 1000;
Scene3DtopDown.overlayRectRadiusDefault = 20;
Scene3DtopDown.numSegments = 10;
// Scene3DtopDown.numSegments = 4;
Scene3DtopDown.doDrawTwoFingerTouchCenterPoint = false;

///////////////////////////////////
// END Static class variables
///////////////////////////////////

//INIT

$(window).ready(function () {
});

// $(window).on('load', ...) happens after $(window).ready   
// $(window).ready(function () {
$(window).on('load', function () {
    if(COL.doUseAnimateToRenderTopDownPane)
    {
        animate();
    }
});

function animate() {
    console.log('BEG Scene3DtopDown::animate'); 

    requestAnimationFrame(animate);
    Scene3DtopDown.render1();
};

async function onMouseDown1( event ) {
    // console.log('BEG onMouseDown1');

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    let container3DtopDown = document.getElementById('topDownPaneId');

    // Wait for onMouseUp1 to finish processing
    let index=0;
    while(scene3DtopDown.onMouseUpOrTouchUpStillProcessing)
    {
        console.log('scene3DtopDown.onMouseUpOrTouchUpStillProcessing', scene3DtopDown.onMouseUpOrTouchUpStillProcessing); 
        await COL.util.sleep(100);
        index = index+1;
        console.log('index', index);
    }
    
    scene3DtopDown.onMouseDownOrTouchStartStillProcessing = true;
    scene3DtopDown.setMouseCoords(event);

    await scene3DtopDown.findIntersections();
    
    // the event listener for onMouseDown1 is added in onMouseUp1
    container3DtopDown.removeEventListener( 'mousedown', onMouseDown1, {capture: false, passive: false} );
    container3DtopDown.addEventListener( 'mousemove', onMouseMove1, {capture: false, passive: false} );
    container3DtopDown.addEventListener( 'mouseup', onMouseUp1, {capture: false, passive: false} );

    orbitControls.setState( OrbitControls3Dpane.STATE.SELECT_OVERLAY_RECT );
    await orbitControls.handleMouseDown0( event );
    scene3DtopDown.onMouseDownOrTouchStartStillProcessing = false;

    // console.log('END onMouseDown1');
};

function onMouseMove1( event ) {
    // console.log('BEG onMouseMove1');
    
    // event.preventDefault();

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();

    scene3DtopDown.setMouseCoords(event);

    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.setState( OrbitControls3Dpane.STATE.DOLLY_PAN );
    let point2d = new THREE_Vector2(event.clientX, event.clientY);
    orbitControls.panTopDownPane(point2d);
};

async function onMouseUp1( event ) {
    // console.log('BEG onMouseUp1');

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();

    // Wait for onMouseDown1 to finish processing
    // console.log('scene3DtopDown.onMouseDownOrTouchStartStillProcessing', scene3DtopDown.onMouseDownOrTouchStartStillProcessing); 
    let index=0;
    while(scene3DtopDown.onMouseDownOrTouchStartStillProcessing)
    {
        console.log('scene3DtopDown.onMouseDownOrTouchStartStillProcessing', scene3DtopDown.onMouseDownOrTouchStartStillProcessing); 
        await COL.util.sleep(100);
        index = index+1;
        console.log('index', index); 
    }

    // handleMouseDown0 finished processing - we can proceed to process onMouseUp1
    scene3DtopDown.onMouseUpOrTouchUpStillProcessing = true;

    let container3DtopDown = document.getElementById('topDownPaneId');

    // the event listener for onMouseDown1 is removed at the beginning of onMouseDown1
    container3DtopDown.addEventListener( 'mousedown', onMouseDown1, {capture: false, passive: false} );

    container3DtopDown.removeEventListener( 'mousemove', onMouseMove1, {capture: false, passive: false} );
    // the event listener for onMouseUp1 is added at the beginning of onMouseDown1
    container3DtopDown.removeEventListener( 'mouseup', onMouseUp1, {capture: false, passive: false} );
    
    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.setState( OrbitControls3Dpane.STATE.NONE );

    scene3DtopDown.onMouseUpOrTouchUpStillProcessing = false;
    
    // console.log('END onMouseUp1');
};

function onMouseWheel1( event ) {
    // console.log('BEG onMouseWheel1'); 

    // event.preventDefault();
    
    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.handleMouseWheel0( event );
};

function onKeyDown1( event ) {
    // console.log('BEG onKeyDown1');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.handleKeyDown0( event );
};

function onKeyUp1( event ) {
    // console.log('BEG onKeyUp1');
};

// // touch event for when clicking on the topDown pane border 
// // example on how to differentiate in handling of event based on which element the event originated from.
// // commenting the event listener for now, because I also added "touch-action: none;" in #topDownPaneWrapperId, and .topDownPaneClass"
// // if the problem of double-touching the border resizes the entire window, happens again (on iOS devices, e.g. iPad)
// // use this function with event.preventDefault()

// function onTouchStart7( event ) {
//     console.log('Beg onTouchStart7');

//     if(event.currentTarget == event.target)
//     {
//         console.log('The user clicked on the topDownPaneWrapperId'); 
//     }
//     else
//     {
//         console.log('the user clicked on an element that is different than topDownPaneWrapperId, e.g. on the canvas'); 
//     }
//     // prevent the default behaviour to fix the problem of resizing the entire window when double-touching the topDownPane border.
//     event.preventDefault();
// };

async function onTouchStart1( event ) {
    // console.log('Beg onTouchStart1');

    event.preventDefault();

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    let container3DtopDown = document.getElementById('topDownPaneId');

    // Wait for onTouchEnd1 to finish processing
    let index=0;
    while(scene3DtopDown.onMouseUpOrTouchUpStillProcessing)
    {
        console.log('scene3DtopDown.onMouseUpOrTouchUpStillProcessing', scene3DtopDown.onMouseUpOrTouchUpStillProcessing); 
        await COL.util.sleep(100);
        index = index+1;
        console.log('index', index); 
    }
    
    scene3DtopDown.onMouseDownOrTouchStartStillProcessing = true;
    scene3DtopDown.setMouseCoords(event.touches[0]);

    await scene3DtopDown.findIntersections();
    
    // the event listener for onTouchStart1 is added in onTouchEnd1
    container3DtopDown.removeEventListener( 'touchstart', onTouchStart1, {capture: false, passive: false} );
    container3DtopDown.addEventListener( 'touchmove', onTouchMove1, {capture: false, passive: false} );
    container3DtopDown.addEventListener( 'touchend', onTouchEnd1, {capture: false, passive: false} );

    orbitControls.setState( OrbitControls3Dpane.STATE.SELECT_OVERLAY_RECT );
    let point2d = new THREE_Vector2(event.touches[0].pageX,
                                    event.touches[0].pageY);
    orbitControls.handleMouseDown_orTouchStart0( point2d );

    scene3DtopDown.onMouseDownOrTouchStartStillProcessing = false;

    // console.log('END onTouchStart1');
};

function onTouchMove1( event ) {
    // console.log('BEG onTouchMove1');

    // Prevent from applying the _default_, _generic_ browser scroll to the 3dTopDown pane
    // Instead, the 3dTopDown pane is _panned_ with custom logic
    event.preventDefault();
    
    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();

    scene3DtopDown.setMouseCoords(event.touches[0]);

    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.handleTouchMove0( event );
};

async function onTouchEnd1( event ) {
    // console.log('BEG onTouchEnd1'); 

    // event.preventDefault();

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();

    // Wait for onTouchStart1 to finish processing
    // console.log('scene3DtopDown.onMouseDownOrTouchStartStillProcessing', scene3DtopDown.onMouseDownOrTouchStartStillProcessing); 
    let index=0;
    while(scene3DtopDown.onMouseDownOrTouchStartStillProcessing)
    {
        console.log('scene3DtopDown.onMouseDownOrTouchStartStillProcessing', scene3DtopDown.onMouseDownOrTouchStartStillProcessing); 
        await COL.util.sleep(100);
        index = index+1;
        console.log('index', index); 
    }

    // handleMouseDown0 finished processing - we can proceed to process onMouseUp1
    scene3DtopDown.onMouseUpOrTouchUpStillProcessing = true;

    let container3DtopDown = document.getElementById('topDownPaneId');

    // the event listener for onTouchStart1 is removed at the beginning of onTouchStart1
    container3DtopDown.addEventListener( 'touchstart', onTouchStart1, {capture: false, passive: false} );
    
    container3DtopDown.removeEventListener( 'touchmove', onTouchMove1, {capture: false, passive: false} );
    // the event listener for onTouchEnd1 is added at the beginning of onTouchStart1
    container3DtopDown.removeEventListener( 'touchend', onTouchEnd1, {capture: false, passive: false} );

    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.setState( OrbitControls3Dpane.STATE.NONE );
    orbitControls.endTouchProcessing();
    
    scene3DtopDown.onMouseUpOrTouchUpStillProcessing = false;
    // console.log('END onTouchEnd1');
};

function onContextMenu1( event ) {
    console.log('BEG onContextMenu1');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.handleContextMenu0( event );
};

export { Scene3DtopDown };

