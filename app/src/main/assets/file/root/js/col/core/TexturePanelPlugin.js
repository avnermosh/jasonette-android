// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import {Vector3 as THREE_Vector3,
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
        Sprite as THREE_Sprite
       } from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from  "../COL.js";
import { Model } from "./Model.js";
import { Layer } from "./Layer.js";
import { ImageInfo } from "./ImageInfo.js";
import "../gui/Component.js";
import {CSS2DRenderer} from "../../static/CSS2DRenderer.js";
import { OrbitControlsTexPane } from  "../orbitControl/OrbitControlsTexPane.js";
import "../orbitControl/OrbitControlsUtils.js";
import "../util/Util.js";
import "../util/ThreejsUtil.js";

'use strict';

// tbd - rename TexturePanelPlugin -> TexturePane ??

class TexturePanelPlugin {
    constructor(){
        this.texCamera;
        this.texScene;
        this.texRenderer;
        this.texLabelRenderer;
        this.texControls;
        this.rotationVal = 0;
        this.flipY = true;
        
        // https://threejs.org/docs/#api/en/objects/Sprite
        // textureSprite1 is the threejs planar Sprite object to show the selected images
        this.textureSprite1;

        // Bounding box around the texture image
        this.bbox;
        
        this.viewportExtendsOnX = false;
        this.currentViewportNormalized;

        this.imageWidth = undefined;
        this.imageHeight = undefined;

        // the mouseCoord in normalized units [-1, 1]
        this.texPaneMouseCoord = new THREE_Vector2();
    };

    initTexturePanelPlugin = function() {
        // console.log('BEG initTexturePanelPlugin');

        //////////////////////////////////////
        // Set camera related parameters
        //////////////////////////////////////

        // https://discourse.threejs.org/t/does-change-in-camera-position-impact-the-left-top-right-and-bottom-parameters-of-orthographic-camera/5501
        // left,right,top,bottom are in world units, i.e. for OrthographicCamera: leftBorderX = camera.position.x + (camera.left / camera.zoom);
        //
        // left,right,top,bottom (-50, 50, 50, -50) goes together with textureSprite.scale (100, 100, 1)
        // because the vertices of textureSprite.geometry.attributes.position.data.array which is of type THREE_Sprite are normalized (-0.5 - 0.5)
        // then the combination of left,right,top,bottom (-50, 50, 50, -50), and textureSprite.scale (100, 100, 1) fills in the entire window
        // for combination of left,right,top,bottom (-50, 50, 50, -50), and textureSprite.scale (50, 100, 1) the image covers 1/2 of the window on the x axis
        // for combination of left,right,top,bottom (-200, 200, 200, -200), and textureSprite.scale (100, 100, 1) the image covers 1/4 of the window on the x axis, and on the y axis

        let left = -100;
        let right = 100;
        let top = 50;
        let bottom = -50;
        let near = -500;
        let far = 1000;

        this.texCamera = new THREE_OrthographicCamera(left, right, top, bottom, near, far);
        this.texCamera.name = 'texCamera';
        this.texCamera.position.set( 0, 0, 80 );
        
        this.texScene = new THREE_Scene();
        this.texScene.name = 'texScene';

        //////////////////////////////////////
        // Set texRenderer related parameters
        //////////////////////////////////////

        this.texRenderer = COL.model.getRendererTexturePane();

        ////////////////////////////////////////////////////
        // INIT CONTROLS
        ////////////////////////////////////////////////////

        // this.setTexControls();
        this.initializeOrbitControlsTex();

        if(COL.model.isStickyNotesEnabled())
        {
            this.texLabelRenderer = new CSS2DRenderer();
            this.texLabelRenderer.domElement.id = 'canvasTexLabel';

            let texRendererSize = new THREE_Vector2();
            this.texRenderer.getSize(texRendererSize);
            this.texLabelRenderer.setSize( texRendererSize.width, texRendererSize.height );
            this.texLabelRenderer.domElement.style.position = 'absolute';
            this.texLabelRenderer.domElement.style.top = 0;
        }

        if(TexturePanelPlugin.doDrawTwoFingerTouchCenterPoint)
        {
            //////////////////////////////////////////////////////////////
            // Add centerPoint between two-finger touch
            // Update the two-finger touch points
            //////////////////////////////////////////////////////////////
            
            let numSegments = 32;
            const geometry = new THREE_CircleGeometry( TexturePanelPlugin.overlayRectRadius, numSegments );
            const material = new THREE_MeshBasicMaterial( {
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                color: COL.util.redColor
            } );

            this.texCenterPoint_twoFingerTouch = new THREE_Mesh( geometry, material );
            this.texCenterPoint_twoFingerTouch.name = "texCenterPoint_twoFingerTouch";
            this.texCenterPoint_twoFingerTouch.visible = true;
            this.texCenterPoint_twoFingerTouch.updateMatrixWorld();
            this.texScene.add(this.texCenterPoint_twoFingerTouch);

            // # --------------------------------------------------------------
            // Add the two-finger touch points

            const geometry0 = new THREE_CircleGeometry( (2 * TexturePanelPlugin.overlayRectRadius), numSegments );
            this.texTwoFingerTouch0 = new THREE_Mesh( geometry0, material );
            this.texTwoFingerTouch0.name = "texTwoFingerTouch0";
            this.texTwoFingerTouch0.visible = true;
            this.texTwoFingerTouch0.updateMatrixWorld();
            this.texScene.add(this.texTwoFingerTouch0);

            this.texTwoFingerTouch1 = new THREE_Mesh( geometry0, material );
            this.texTwoFingerTouch1.name = "texTwoFingerTouch1";
            this.texTwoFingerTouch1.visible = true;
            this.texTwoFingerTouch1.updateMatrixWorld();
            this.texScene.add(this.texTwoFingerTouch1);
            

            // # --------------------------------------------------------------
            // Add the line between the two-finger touch points
            
            const material2 = new THREE_LineBasicMaterial( {
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                linewidth: 80,
                color: COL.util.redColor
            } );

            // https://sbcode.net/threejs/geometry-to-buffergeometry/
            
            // const geometry2 = new THREE_Geometry();
            // geometry2.vertices.push(new THREE_Vector3(-10, 0, TexturePanelPlugin.pozitionZ));
            // geometry2.vertices.push(new THREE_Vector3(0, 10, TexturePanelPlugin.pozitionZ));

            const points = []
            points.push(new THREE.Vector3(-5, 0, 0))
            points.push(new THREE.Vector3(5, 0, 0))
            const geometry2 = new THREE.BufferGeometry().setFromPoints( points )

            
            this.texLineBetween_twoFingerTouch = new THREE_Line( geometry2, material2 );
            this.texLineBetween_twoFingerTouch.name = "texLineBetween_twoFingerTouch";
            this.texLineBetween_twoFingerTouch.visible = true;
            this.texLineBetween_twoFingerTouch.updateMatrixWorld();
            this.texScene.add(this.texLineBetween_twoFingerTouch);
        }


        ////////////////////////////////////////////////////
        // EVENT HANDLERS
        ////////////////////////////////////////////////////

        let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');
        if (COL.util.isTouchDevice())
        {
            texCanvasWrapperElement.addEventListener('touchmove', this.texControls.update.bind(this.texControls), {capture: false, passive: false});
        }
        else
        {
            texCanvasWrapperElement.addEventListener('mousemove', this.texControls.update.bind(this.texControls), {capture: false, passive: false});
            texCanvasWrapperElement.addEventListener('mousewheel', this.texControls.update.bind(this.texControls), {capture: false, passive: false});
            texCanvasWrapperElement.addEventListener('DOMMouseScroll', this.texControls.update.bind(this.texControls), {capture: false, passive: false}); // firefox
        }
        
        this.texControls.addEventListener('change', function () {
            // console.log('intercepted texControls "change" event');
            TexturePanelPlugin.render2();
        });
        
        $(window).resize(function () {
            // console.log('BEG TexturePanelPlugin window resize2');
            let selectedLayer = COL.model.getSelectedLayer();

            if(COL.util.isObjectValid(selectedLayer))
            {
                let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();

                let textureImage = selectedLayer.getCurrentTextureImage();
                let materialTexture = COL.util.getNestedObject(textureImage, ['material', 'map']);
                
                if(COL.util.isObjectValid(materialTexture))
                {
                    let doRescale = false;
                    texturePanelPlugin.set_camera_canvas_renderer_and_viewport2(selectedLayer, materialTexture, doRescale);
                }
            }
        });
    };

    _init = function() {
        this.hideWidgets();
    };

    getTexCanvasWrapperSize = function() {
        // console.log('BEG TexturePanelPlugin getTexCanvasWrapperSize');
        let texCanvasWrapper = $('#texCanvasWrapperId');
        let texCanvasWrapperSize = {width: texCanvasWrapper.innerWidth(),
                                    height: texCanvasWrapper.innerHeight()};

        return texCanvasWrapperSize;
    };

    getTexPaneOffset = function() {
        let texCanvasWrapper = $('#texCanvasWrapperId');

        return {
            left: texCanvasWrapper.offset().left,
            top: texCanvasWrapper.offset().top
        };
    };

    screenPointCoordToNormalizedCoord = function(point2d) {
        // console.log('BEG screenPointCoordToNormalizedCoord');
        
        let mouseCoord = new THREE_Vector2();
        mouseCoord.x = ( ( point2d.x - this.getTexPaneOffset().left - this.currentViewportNormalized.x ) /
                         this.currentViewportNormalized.z ) * 2 - 1;

        mouseCoord.y = - ( ( point2d.y - this.getTexPaneOffset().top - this.currentViewportNormalized.y ) /
                           this.currentViewportNormalized.w ) * 2 + 1;
        
        return mouseCoord;
    };

    screenNormalizedPointCoordToPointCoord = function(mouseCoord) {
        // console.log('BEG screenNormalizedPointCoordToPointCoord');
        
        let texCanvasWrapperSize = this.getTexCanvasWrapperSize();
        let point2d = new THREE_Vector2();
        point2d.x = (this.currentViewportNormalized.z * ((mouseCoord.x + 1) / 2)) + this.currentViewportNormalized.x + this.getTexPaneOffset().left
        point2d.y = -((this.currentViewportNormalized.w * ((mouseCoord.y - 1) / 2)) + this.currentViewportNormalized.y + this.getTexPaneOffset().top);
        
        return point2d;
    };
    
    getTexPaneMouseCoords = function() {
        return this.texPaneMouseCoord;
    };

    setTexPaneMouseCoords = function( event ) {
        // console.log('BEG setTexPaneMouseCoords');
        
        if(!this.texPaneMouseCoord || !this.currentViewportNormalized)
        {
            // this.texPaneMouseCoord, or this.currentViewportNormalized are not defined yet!!
            return null;
        }

        this.texPaneMouseCoord.x = ( ( event.clientX - this.get3DtopDownOffset().left - this.currentViewportNormalized.x ) /
                                     this.currentViewportNormalized.z ) * 2 - 1;

        this.texPaneMouseCoord.y = -( ( event.clientY - this.get3DtopDownOffset().top - this.currentViewportNormalized.y ) /
                                      this.currentViewportNormalized.w ) * 2 + 1;
        
        return this.texPaneMouseCoord;
    };

    toJSON = function()
    {
        console.log('BEG TexturePanelPlugin::toJSON()');

        return {
            texCamera: this.texCamera,
            texScene: this.texScene,
            texRenderer: this.texRenderer,
            texLabelRenderer: this.texLabelRenderer,
            texControls: this.texControls,
            rotationVal: this.rotationVal,
            flipY: this.flipY,
            textureSprite1: this.textureSprite1,
            bbox: this.bbox,
            viewportExtendsOnX: this.viewportExtendsOnX,
            currentViewportNormalized: this.currentViewportNormalized,
            imageWidth: this.imageWidth,
            imageHeight: this.imageHeight,
        };
    };

    dispose = function() {
        // console.log('BEG TexturePanelPlugin::dispose()');

        //////////////////////////////////////////////////////
        // Before Dispose
        //////////////////////////////////////////////////////

        // console.log( "Before Dispose");
        let texturePanelPluginAsJson = this.toJSON();
        // console.log('texturePanelPluginAsJson before dispose', texturePanelPluginAsJson); 
        
        //////////////////////////////////////////////////////
        // Dispose
        // https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534
        //////////////////////////////////////////////////////
        

        if(!COL.doUseAnimateToRenderTexturePane)
        {
            this.texCamera = null;
        }

        this.texScene.traverse(function ( obj ) {
            COL.ThreejsUtil.disposeObject(obj);
        });

        if(!COL.doUseAnimateToRenderTexturePane)
        {
            this.texScene = null;
        }

        // this.texRenderer is not disposed because it is a member of class Model
        COL.ThreejsUtil.disposeObject(this.texLabelRenderer);

        // remove event listeners
        this.enableControls(false);

        this.texControls.dispose();
        if(!COL.doUseAnimateToRenderTexturePane)
        {
            // comment out for now until animate() is disabled
            this.texControls = null;
        }

        
        COL.ThreejsUtil.disposeObject(this.textureSprite1);

        this.bbox = null;
        
        this.currentViewportNormalized = null;
        

        //////////////////////////////////////////////////////
        // After Dispose
        //////////////////////////////////////////////////////

        // console.log( "After Dispose");

        // let texturePanelPluginAsJson2 = this.toJSON();
        // console.log('texturePanelPluginAsJson after dispose', texturePanelPluginAsJson2); 

    };

    getTexScene = function() {
        return this.texScene;
    };

    getTexLabelRenderer = function() {
        return this.texLabelRenderer;
    };
    
    getTexCamera = function() {
        return this.texCamera;
    };

    // set_camera_canvas_renderer_and_viewport2 - does for a specific texture:
    // 
    //  - sets the texCamera
    //    - sets the texCamera position
    //       - if camera of the specific texture does NOT pre-exists, sets the camera Frustum And Zoom
    //       - if camera of the specific texture does pre-exists, sets the texCamera position to the previous camera position
    //
    //  - sets texControls
    //    - sets the texControls.camera, texControls.target, texControls.minZoom
    //       - if the specific texture already has a camera, sets variables of the texControls object from the new camera
    //       - if the specific texture already does NOT have a camera, sets variables of the texControls object from the existing settings for the texture
    //
    //  - sets textureSprite1
    //    - adds textureSprite1 texScene
    //
    //  - updateCameraAndCanvasForTheSelectedImage
    //    -- calls OrbitControls3Dpane::setCameraAndCanvas - does xxx
    // 
    //  - sets _renderer3DtopDown
    //  - sets currentViewportNormalized

    set_camera_canvas_renderer_and_viewport2 = function(layer, materialTexture, doRescale) {
        // console.log('BEG set_camera_canvas_renderer_and_viewport2'); 

        let imageInfo = ImageInfo.getSelectedImageInfo(layer);
        if(COL.util.isObjectInvalid(imageInfo))
        {
            console.error( 'imageInfo is not defined'); 
            return;
        }

        let imageOrientation = -1;
        if(COL.util.isObjectValid(COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation'])))
        {
            imageOrientation = Number(imageInfo.imageTags.imageOrientation);
        }
        
        //////////////////////////////////////////////////
        // Set the texCamera
        //////////////////////////////////////////////////

        let cameraInfo = imageInfo.cameraInfo;

        // use cameraFrustumLeftPlane as indication to if the camera is valid 
        let cameraFrustumLeftPlane = COL.util.getNestedObject(imageInfo, ['cameraInfo', 'cameraFrustumLeftPlane']);
        let cameraFrustumLeftPlane_isValid = COL.util.isObjectValid(cameraFrustumLeftPlane);
        if(doRescale)
        {
            cameraFrustumLeftPlane_isValid = undefined;
        }

        let flipY = true;
        if(cameraFrustumLeftPlane_isValid)
        {
            ////////////////////////////////////////////////////////////////
            // Set this.texCamera from existing camera setting for this image (e.g. from imageInfo.cameraInfo.cameraFrustumLeftPlane)
            // this.texCamera is assigned WITHOUT CLONE,
            // so changes in texControls (OrbitControlsTexPane.js) e.g. zoom-in are reflected in cameraInfo.camera22
            ////////////////////////////////////////////////////////////////

            this.texControls.setFromCameraInfo(cameraInfo);
            this.rotationVal = cameraInfo.rotationVal;
            this.flipY = cameraInfo.flipY;
            // position of this.texCamera is set from previous camera setting for this image
        }
        else
        {
            ////////////////////////////////////////////////////////////////
            // Update the camera to cover the entire image
            ////////////////////////////////////////////////////////////////

            let rotationParams = COL.OrbitControlsUtils.getRotationParams(imageOrientation);

            this.rotationVal = rotationParams.rotationVal;
            this.flipY = rotationParams.flipY;

            let near = -500;
            let far = 1000;

            // tbd - remove previous camera to prevent memory leak ???
            // this.texCamera.dispose();
            // google threejs dispose OrthographicCamera
            
            this.texCamera = new THREE_OrthographicCamera(-(materialTexture.image.width/2),
                                                          materialTexture.image.width/2,
                                                          materialTexture.image.height/2,
                                                          -(materialTexture.image.height/2),
                                                          near,
                                                          far);
            this.texCamera.position.set( 0, 0, TexturePanelPlugin.initialCameraHeightAboveGround );
            this.texCamera.updateProjectionMatrix();

            this.texControls.camera = this.texCamera;

            // tbd - redundant ? (also called from this.updateCameraAndCanvasForTheSelectedImage())
            imageInfo.setCameraInfo(this.texControls, this.rotationVal, this.flipY);

            // the camera is invalid so set doRescale to true regardless of it's initial value
            doRescale = true;
        }

        this.texCamera.updateProjectionMatrix();

        //////////////////////////////////////////////////
        // Set the textureSprite1
        //////////////////////////////////////////////////

        let retVal = COL.OrbitControlsUtils.getScaleAndRatio((this.texCamera.right - this.texCamera.left),
                                                             (this.texCamera.top - this.texCamera.bottom),
                                                             imageOrientation);

        materialTexture.flipY = this.flipY;

        let material = new THREE_SpriteMaterial( { map: materialTexture,
                                                   color: 0xffffff,
                                                   rotation: this.rotationVal,
                                                   fog: true } );
        let textureSpriteTmp = new THREE_Sprite( material );
        textureSpriteTmp.position.set( 0, 0, 0 );
        textureSpriteTmp.scale.set( retVal.scaleX, retVal.scaleY, 1 );
        textureSpriteTmp.name = "textureSprite";

        // TBD - delete previously existing this.textureSprite1 (to prevent memory leak ??)
        this.textureSprite1 = textureSpriteTmp;
        
        //////////////////////////////////////////////////
        // Set the bbox for the textureSprite1
        //////////////////////////////////////////////////

        this.bbox = new THREE_Box3().setFromObject(this.textureSprite1);
        if(this.textureSprite1.material.rotation === 0)
        {
            // landscape
        }
        else
        {
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
        
        //Add the mesh to the scene
        this.texScene.add(this.textureSprite1);
        
        this.updateCameraAndCanvasForTheSelectedImage(layer, cameraFrustumLeftPlane_isValid, doRescale);

    };
    
    getBoundingBox = function() {
        return this.bbox;
    };

    doesViewportExtendOnX = function() {
        return this.viewportExtendsOnX;
    };

    showStickyNotes = function(layer) {
        
        let noteArray = layer.getNoteArray();

        let iter = noteArray.iterator();
        while (iter.hasNext()) {
            let note = iter.next();
            
            let noteElementId = note.getNoteId();
            let noteElement = document.getElementById(noteElementId);
            if(!noteElement)
            {
                console.error( 'noteElement is not defined for noteElementId:', noteElementId );
                continue;
            }

            let selectedLayer = COL.model.getSelectedLayer();
            let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
            if(COL.util.isObjectValid(selectedOverlayRect))
            {
                let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
                
                if(note.getImageFilename() === selectedImageFilename)
                {
                    // Show the note
                    noteElement.classList.remove("inactive-note");
                    noteElement.classList.add("active-note");
                    note.activate();
                }
                else
                {
                    // hide the note
                    noteElement.classList.remove("active-note");
                    noteElement.classList.add("inactive-note");
                    note.deactivate();
                }
            }
            else
            {
                // hide the note
                noteElement.classList.remove("active-note");
                noteElement.classList.add("inactive-note");
                note.deactivate();
            }
        }

    };

    getRotationVal = function() {
        return this.rotationVal;
    };
    
    getFlipY = function() {
        return this.flipY;
    };

    getTexControls = function() {
        return this.texControls;
    };
    
    setTexControls = function() {
        // console.log('BEG setTexControls');

        // Need to be similar to what is in OrbitControlsTexPane.js constructor
        let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');

        this.texControls = new OrbitControlsTexPane(this.texCamera, texCanvasWrapperElement);
        
        //////////////////////////////////////
        // Set default zoom related parameters
        //////////////////////////////////////

        this.texControls.zoomSpeed = 0.8;
        this.texControls.minZoom = 1;
        this.texControls.maxZoom = Infinity;

        //////////////////////////////////////
        // Set pan related parameters
        //////////////////////////////////////

        // if true, pan in screen-space
        this.texControls.screenSpacePanning = true;

        this.texControls.panSpeed = 0.6;
        
        this.enableControls(true);
    };

    initializeOrbitControlsTex = function() {
        // console.log('BEG initializeOrbitControlsTex'); 

        let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');
        this.texControls = new OrbitControlsTexPane(this.texCamera, texCanvasWrapperElement);

        //////////////////////////////////////
        // Set rotate related parameters
        //////////////////////////////////////

        // No rotation.
        this.texControls.enableRotate = false;

        // Set the rotation angle (with 0 angle change range) to 0
        // coordinate axis system is:
        // x-red - directed right (on the screen), z-blue directed down (on the screen), y-green directed towards the camera
        this.texControls.minPolarAngle = 0; // radians
        this.texControls.maxPolarAngle = 0; // radians

        // No orbit horizontally.
        this.texControls.minAzimuthAngle = 0; // radians
        this.texControls.maxAzimuthAngle = 0; // radians

        //////////////////////////////////////
        // Set zoom related parameters
        //////////////////////////////////////

        this.texControls.zoomSpeed = 1.2;
        // this.texControls.minZoom = 1;
        // this.texControls.maxZoom = Infinity;

        //////////////////////////////////////
        // Set pan related parameters
        //////////////////////////////////////

        this.texControls.panSpeed = 0.6;
        // if true, pan in screen-space
        this.texControls.screenSpacePanning = true;
        // // pixels moved per arrow key push
        // this.texControls.keyPanSpeed = 7.0;

        this.texControls.keys = [65, 83, 68, 70, 71, 72];

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
                this.texControls.reset();
            }
        });

        // _camera3DtopDown -> texCamera
        // need to set this.texCamera.position after construction of this.texControls
        this.texCamera.position.copy( TexturePanelPlugin.initialCameraHeightPosition );
        this.texCamera.zoom = 0.42;

        this.texControls.target.copy(this.texCamera.position);
        // initial this.texControls.target.Y is set to 0
        this.texControls.target.setY(COL.y0);
        
        // enable this.texControls
        this.enableControls(true);

    };

    enableControls = function(doEnable) {

        let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');

        if(doEnable)
        {
            texCanvasWrapperElement.addEventListener( 'contextmenu', onContextMenu2, {capture: false, passive: false} );
            if (COL.util.isTouchDevice())
            {
                texCanvasWrapperElement.addEventListener( 'touchstart', onTouchStart2, {capture: false, passive: false} );
            }
            else
            {
                texCanvasWrapperElement.addEventListener( 'mousedown', onMouseDown2, {capture: false, passive: false} );
                texCanvasWrapperElement.addEventListener( 'wheel', onMouseWheel2, {capture: false, passive: false} );
            }
            
            texCanvasWrapperElement.addEventListener( 'keydown', onKeyDown2, {capture: false, passive: false} );
            texCanvasWrapperElement.addEventListener( 'keyup', onKeyUp2, {capture: false, passive: false} );
        }
        else
        {
            texCanvasWrapperElement.removeEventListener( 'contextmenu', onContextMenu2, {capture: false, passive: false} );

            if (COL.util.isTouchDevice())
            {
                texCanvasWrapperElement.removeEventListener( 'touchstart', onTouchStart2, {capture: false, passive: false} );
            }
            else
            {
                texCanvasWrapperElement.removeEventListener( 'mousedown', onMouseDown2, {capture: false, passive: false} );
                texCanvasWrapperElement.removeEventListener( 'wheel', onMouseWheel2, {capture: false, passive: false} );
            }
            texCanvasWrapperElement.removeEventListener( 'keydown', onKeyDown2, {capture: false, passive: false} );
            texCanvasWrapperElement.removeEventListener( 'keyup', onKeyUp2, {capture: false, passive: false} );
        }
    };

    
    // loadTextureImageToTexturePane - loads the texture to the texturePane
    // 
    // textureImage - stores the texture image (in textureImage.material.map)
    // 
    // textureImage, and imageInfo - store complementary information of the image
    // imageInfo - stores other information e.g. the imageWidth, imageHeight, but not the actual image map.
    
    loadTextureImageToTexturePane = function(layer, textureImage) {
        // console.log('BEG loadTextureImageToTexturePane');
        
        // // RemoveME:
        // console.clear();

        let imageInfoVec = layer.getImagesInfo();
        // tbd - tbd1 - get rid of selectedOverlayRect, instead use the name from textureImage ???
        let selectedOverlayRect = layer.getSelectedOverlayRect();
        if(COL.util.isObjectInvalid(selectedOverlayRect))
        {
            // sanity check
            throw new Error('selectedOverlayRect is invalid');
        }
        let selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
        let imageInfo = imageInfoVec.getByKey(selectedImageFilename);
        
        if(COL.util.isObjectInvalid(textureImage))
        {
            throw new Error('textureImage is invalid');
        }
        
        let texCanvasWrapper = $('#texCanvasWrapperId');

        if(COL.model.isStickyNotesEnabled())
        {
            texCanvasWrapper.append(this.texLabelRenderer.domElement);
        }

        //Always remove everything from the scene when creating the meshes and adding them to the scene
        for (let i = this.texScene.children.length - 1; i >= 0; i--) {
            if(this.texScene.children[i].type == "Sprite")
            {
                // three js remove vs dispose
                // https://discourse.threejs.org/t/correctly-remove-mesh-from-scene-and-dispose-material-and-geometry/5448
                // renderer.renderLists.dispose();
                const object = this.texScene.children[i];
                object.geometry.dispose();
                object.material.dispose();
                this.texScene.remove(object);
            }
        }
        
        this.showWidgets();

        // materialTexture stores the color/texture for the "material" (https://threejs.org/docs/#api/en/materials/MeshBasicMaterial)
        // The object type of materialTexture is: 'Texture' (https://threejs.org/docs/#api/en/textures/Texture)
        let materialTexture = textureImage.material.map;
        // materialTexture.needsUpdate = true;

        if(!imageInfo.imageWidth) {
            imageInfo.imageWidth = materialTexture.image.width;
            imageInfo.imageHeight = materialTexture.image.height;
        }
        imageInfoVec.set(selectedImageFilename, imageInfo);
        layer.setImagesInfo(imageInfoVec);
        // console.log('imageInfoVec.size()', imageInfoVec.size());
        
        //////////////////////////////////////////////////
        // Set:
        // texCamera
        // textureSprite1
        // bbox for the textureSprite1
        //////////////////////////////////////////////////

        let doRescale = false;
	// tbd - doRescale should be set to false to preserve the zoom-in state when visiting a pre-visited image
        // (it is currently set to true - to work arounsd a bug where sometimes images get the attributes of other images
        //  and appear rotated)
        doRescale = true;
        this.set_camera_canvas_renderer_and_viewport2(layer, materialTexture, doRescale);        
        // this.showStickyNotes(layer);

        // TexturePanelPlugin.render2();
        
    };

    static render2 = function() {
        // console.log('BEG TexturePanelPlugin render2');

        // "render2" does not work as a "class instance method"
        // if using "this" in the line: "this.texControls.addEventListener('change', this.render2);"
        // when called from OrbitControlsTexPane, "this" maps to "OrbitControlsTexPane" (instead of "TexturePanelPlugin")
        // as a result, the "this.texRenderer", "this.texScene", "this.texCamera" are undefined
        //
        // by:
        // 1. making it a "class static method", and
        // 2. calling selectedLayer.getTexturePanelPlugin() to get texturePanelPlugin
        // the local variables "texRenderer2", "texScene2", "texCam2" are valid
        //
        // tbd - check if other "addEventListener(.." involve this in other places in the project.
        //       can be a problem
        //       e.g. in GoogleUploadBlobToDrive.js: xhr.upload.addEventListener('progress', this.onProgress)

        let selectedLayer = COL.model.getSelectedLayer();
        if(COL.util.isObjectValid(selectedLayer))
        {
            let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
            // texturePanelPlugin.texControls.update();
            let texScene2 = texturePanelPlugin.getTexScene();
            let texCam2 = texturePanelPlugin.getTexCamera();
            let texLabelRenderer2 = texturePanelPlugin.getTexLabelRenderer();

            // console.log('texturePanelPlugin.texRenderer.info.memory.geometries', texturePanelPlugin.texRenderer.info.memory.geometries);
            // console.log('texturePanelPlugin.texRenderer.info.memory.textures', texturePanelPlugin.texRenderer.info.memory.textures);
            // console.log('texturePanelPlugin.texRenderer.info.programs.length', texturePanelPlugin.texRenderer.info.programs.length);
            
            texturePanelPlugin.texRenderer.render(texScene2, texCam2);
            
            if(COL.model.isStickyNotesEnabled())
            {
                texLabelRenderer2.render(texScene2, texCam2);
            }
        }
    };

    // updateCameraAndCanvasForTheSelectedImage - updates the texCamera and the canvas for a specific texture:
    // 
    //  - sets the texCamera
    //    - sets the texCamera position
    //       - if camera of the specific texture does NOT pre-exists, to the center of the image, and height to TexturePanelPlugin::initialCameraHeightAboveGround, or
    //       - if camera of the specific texture does pre-exists, to the previous camera position
    //
    //  - sets the texRenderer viewport
    //    - calls calcCanvasParams (e.g. offsetLeft, offsetTop) to set the viewport
    //
    //   - sets imageInfo attributes from the specific texture, to save the current state of the texture view (e.g. zoom) 

    updateCameraAndCanvasForTheSelectedImage = function(layer, cameraFrustumLeftPlane_isValid, doRescale) {
        // console.log('BEG updateCameraAndCanvasForTheSelectedImage');

        // console.log('doRescale', doRescale); 
        /////////////////////////////////////////////////////////////////////////////////////
        // Set this.texCamera to default position (where the selected image is centered and fills the entire canvas)
        /////////////////////////////////////////////////////////////////////////////////////

        let imageInfo = ImageInfo.getSelectedImageInfo(layer);
        
        let imageOrientation = COL.util.getNestedObject(imageInfo, ['imageTags', 'imageOrientation']);
        if(COL.util.isObjectInvalid(imageOrientation))
        {
            imageOrientation = -1;
        }

        // texCanvasWrapperSize - the size of the gui window
        let texCanvasWrapperSize = this.getTexCanvasWrapperSize();
        let guiWindowWidth = texCanvasWrapperSize.width;
        let guiWindowHeight = texCanvasWrapperSize.height;


        let retVal0 = undefined;
        let retVal = undefined;

        if(cameraFrustumLeftPlane_isValid)
        {
            //////////////////////////////////////////////////////////////////////
            // camera parameter cameraFrustumLeftPlane is valid
            // Get the scale and image ratio from the existing camera setting
            //////////////////////////////////////////////////////////////////////

            retVal0 = COL.OrbitControlsUtils.getScaleAndRatio((this.texCamera.right - this.texCamera.left),
                                                              (this.texCamera.top - this.texCamera.bottom),
                                                              imageOrientation);

            this.imageWidth = (this.texCamera.right - this.texCamera.left);
            this.imageHeight = (this.texCamera.top - this.texCamera.bottom);
            
            let isTexturePane = true;
            let retVal1 = COL.OrbitControlsUtils.calcCanvasParams(guiWindowWidth,
                                                                  guiWindowHeight,
                                                                  this.imageWidth,
                                                                  this.imageHeight,
                                                                  isTexturePane);
            // console.log('retVal1', retVal1);
            
            retVal = {
                scaleX: retVal0.scaleX,
                scaleY: retVal0.scaleY,
                viewportExtendsOnX: retVal1.viewportExtendsOnX,
                canvasOffsetLeft: retVal1.canvasOffsetLeft,
                canvasOffsetTop: retVal1.canvasOffsetTop,
                canvasWidth: retVal1.canvasWidth,
                canvasHeight: retVal1.canvasHeight
            };

            this.texControls.setMinZoom2(guiWindowWidth,
                                         guiWindowHeight,
                                         this.imageWidth,
                                         this.imageHeight,
                                         retVal1.canvasWidth,
                                         retVal1.canvasHeight);

            this.texCamera.updateProjectionMatrix();

        }
        else
        {
            //////////////////////////////////////////////////////////////////////
            // camera parameter cameraFrustumLeftPlane is invalid
            // Set the camera frustum, zoom to cover the entire image
            //////////////////////////////////////////////////////////////////////
            
            this.imageWidth = COL.util.getNestedObject(this.textureSprite1, ['material', 'map', 'image', 'width']);
            if(COL.util.isNumberInvalid(this.imageWidth))
            {
                console.error('this.textureSprite1', this.textureSprite1); 
                throw new Error('this.textureSprite1.material.map.image.width is invalid.');
            }
            
            this.imageHeight = COL.util.getNestedObject(this.textureSprite1, ['material', 'map', 'image', 'height']);
            if(COL.util.isNumberInvalid(this.imageHeight))
            {
                throw new Error('this.textureSprite1.material.map.image.height is invalid.');
            }

            retVal = this.texControls.setCameraAndCanvas(guiWindowWidth,
                                                         guiWindowHeight,
                                                         this.imageWidth,
                                                         this.imageHeight,
                                                         imageOrientation,
                                                         doRescale);
        }

        /////////////////////////////////////////////////////////////////////////////////////
        // Scale the texture such that it fits the entire image
        /////////////////////////////////////////////////////////////////////////////////////

        this.textureSprite1.scale.set( retVal.scaleX, retVal.scaleY, 1 );
        this.viewportExtendsOnX = retVal.viewportExtendsOnX;

        // tbd - should texCanvasWrapperSize be set only one time ???
        this.texRenderer.setSize(texCanvasWrapperSize.width, texCanvasWrapperSize.height);

        if(COL.model.isStickyNotesEnabled())
        {
            this.texLabelRenderer.setSize(retVal.canvasWidth, retVal.canvasHeight);
        }

        // Set viewport
        this.texRenderer.setViewport( -retVal.canvasOffsetLeft,
                                      -retVal.canvasOffsetTop,
                                      retVal.canvasWidth,
                                      retVal.canvasHeight );

        let currentViewport = new THREE_Vector4();
        this.texRenderer.getCurrentViewport(currentViewport);
        
        let pixelRatio = this.texRenderer.getPixelRatio();
        this.currentViewportNormalized = new THREE_Vector4();
        this.currentViewportNormalized.copy(currentViewport)
        this.currentViewportNormalized.divideScalar(pixelRatio);

        if(doRescale)
        {
            this.texControls.setZoom(this.texControls.minZoom);
        }
        
        if(!cameraFrustumLeftPlane_isValid)
        {
            /////////////////////////////////////////////////////////////////////////////////////
            // imageInfo.cameraInfo.cameraFrustumLeftPlane is invalid
            // Set imageInfo.cameraInfo
            /////////////////////////////////////////////////////////////////////////////////////

            imageInfo.setCameraInfo(this.texControls, this.rotationVal, this.flipY);
            this.texCamera.updateProjectionMatrix();
        }
        TexturePanelPlugin.render2();
    };

    hideWidgets = function() {
        $("#texCanvasWrapperId").hide();
        $("#texInfoContainer").hide();
    };

    showWidgets = function() {
        $("#texCanvasWrapperId").show();
        $("#texInfoContainer").show();
    };

};

///////////////////////////////////
// BEG Static class variables
///////////////////////////////////

// camera3DtopDownHeight -> 2000
// camera3DtopDownPosition0 -> texCameraHeightPosition0 -> initialCameraHeightPosition
TexturePanelPlugin.initialCameraHeightPosition = new THREE_Vector3(643, 603, 2000);
TexturePanelPlugin.initialCameraHeightAboveGround = 80;
TexturePanelPlugin.overlayRectRadius = 40;
TexturePanelPlugin.pozitionZ = 0.1;
TexturePanelPlugin.doDrawTwoFingerTouchCenterPoint = false;

///////////////////////////////////
// END Static class variables
///////////////////////////////////


//INIT

// $(window).on('load', ...) happens after $(window).ready   
// $(window).ready(function () {
$(window).on('load', function () {
    if(COL.doUseAnimateToRenderTexturePane)
    {
        animate();
    }
});

function animate() {
    console.log('BEG TexturePanelPlugin::animate'); 

    requestAnimationFrame(animate);
    TexturePanelPlugin.render2();
};

$(document).on("SceneLayerSelected", function (event, layer) {
    // console.log('BEG SceneLayerSelected');
});

async function onMouseDown2( event ) {
    console.log('BEG onMouseDown2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    texControls.setState( OrbitControlsTexPane.STATE.PAN );

    let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');
    texCanvasWrapperElement.removeEventListener( 'mousedown', onMouseDown2, {capture: false, passive: false} );
    texCanvasWrapperElement.addEventListener( 'mouseup', onMouseUp2, {capture: false, passive: false} );
    texCanvasWrapperElement.addEventListener( 'mousemove', onMouseMove2, {capture: false, passive: false} );
    await texControls.handleMouseDown4( event );
};

function onMouseMove2( event ) {
    // console.log('BEG onMouseMove2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    texControls.setState( OrbitControlsTexPane.STATE.PAN );
    let point2d = new THREE_Vector2(event.clientX, event.clientY);
    texControls.handleMouseMove_orOneFingerTouchMove4( point2d );
};

async function onMouseUp2( event ) {
    // console.log('BEG onMouseUp2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();

    let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');
    texCanvasWrapperElement.addEventListener( 'mousedown', onMouseDown2, {capture: false, passive: false} );
    texCanvasWrapperElement.removeEventListener( 'mousemove', onMouseMove2, {capture: false, passive: false} );
    texCanvasWrapperElement.removeEventListener( 'mouseup', onMouseUp2, {capture: false, passive: false} );
    texControls.setState( OrbitControlsTexPane.STATE.NONE );
};

function onMouseWheel2( event ) {
    // console.log('BEG onMouseWheel2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    texControls.handleMouseWheel4( event );
};

function onKeyDown2( event ) {
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    texControls.handleKeyDown4( event );
};

function onKeyUp2( event ) {
};

async function onTouchStart2( event ) {
    // console.log('BEG onTouchStart2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    
    let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');
    texCanvasWrapperElement.removeEventListener( 'touchstart', onTouchStart2, {capture: false, passive: false} );
    texCanvasWrapperElement.addEventListener( 'touchend', onTouchEnd2, {capture: false, passive: false} );
    texCanvasWrapperElement.addEventListener( 'touchmove', onTouchMove2, {capture: false, passive: false} );
    texControls.setState( OrbitControlsTexPane.STATE.PAN );

    let point2d = new THREE_Vector2(event.touches[0].pageX,
                                    event.touches[0].pageY);
    texControls.handleMouseDown_orTouchStart4( point2d );
    
};

function onTouchMove2( event ) {
    // console.log('BEG onTouchMove2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    texControls.handleTouchMove4( event );

};

async function onTouchEnd2( event ) {
    // console.log('BEG onTouchEnd2');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();

    let texCanvasWrapperElement = document.getElementById('texCanvasWrapperId');
    texCanvasWrapperElement.addEventListener( 'touchstart', onTouchStart2, {capture: false, passive: false} );
    texCanvasWrapperElement.removeEventListener( 'touchmove', onTouchMove2, {capture: false, passive: false} );
    texCanvasWrapperElement.removeEventListener( 'touchend', onTouchEnd2, {capture: false, passive: false} );

    texControls.setState( OrbitControlsTexPane.STATE.NONE );
    texControls.endTouchProcessing();
};

function onContextMenu2( event ) {
    let selectedLayer = COL.model.getSelectedLayer();
    let texturePanelPlugin = selectedLayer.getTexturePanelPlugin();
    let texControls = texturePanelPlugin.getTexControls();
    texControls.handleContextMenu4( event );
};

export { TexturePanelPlugin };
