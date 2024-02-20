/* eslint-disable no-case-declarations */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

// //////////////////////////////////////////////////////////////
//
// The scene file is the main container for the application
// In the threejs examples there are e.g. scene, camera, light, renderer in the main html file
// The PlanView class stores such telements
//
// //////////////////////////////////////////////////////////////

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
    OrthographicCamera as THREE_OrthographicCamera,
    Raycaster as THREE_Raycaster,
    AxesHelper as THREE_AxesHelper,
    AmbientLight as THREE_AmbientLight,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from './Model.js';
import { IntersectionInfo } from '../util/IntersectionInfo.js';
import { OrbitControlsPlanView } from '../orbitControl/OrbitControlsPlanView.js';
import { OverlayRect } from './OverlayRect.js';
// import { Whiteboard } from "./Whiteboard.js";
import '../util/Util.js';
import '../util/ThreejsUtil.js';
import '../util/Util.AssociativeArray.js';
import '../util/ErrorHandlingUtil.js';
import { onMouseDownOrTouchStart_planView, onWheel_planView, onMouseUpOrTouchEnd_planView,
    onKeyDown_planView, onKeyUp_planView } from './PlanViewEventListeners.js';

const cameraPlanViewHeight = 2000;
var cameraPlanViewPosition0 = new THREE_Vector3(
    643,
    cameraPlanViewHeight,
    603
);

class PlanView {
    constructor() {
        this.scene;
        this.camera;
        this.orbitControls;

        // the mouseCoord in normalized units [-1, 1]
        this.mouse = new THREE_Vector2();

        this.bbox = undefined;
        this.raycasterPlanView = new THREE_Raycaster();
        this.viewportExtendsOnX = false;
        this.currentViewportNormalized;

        this.axesHelperIntersection;
        this.intersectedStructureInfo = new IntersectionInfo();
        this.intersectedOverlayRectInfo = new IntersectionInfo();
        this.timeStamp = 0;
        this.overlayRectRadius = 20;
        this.overlayRectScale = 1;

        this.lights = {
            AmbientLight: null,
            Headlight: null,
        };

        // context-menu related variables
        // this.menu = undefined;
        this.timeoutID = undefined;
        this.isMenuVisible = false;

        // time measurements that will impact the behavior (e.g. if in moveMode and clicked for too long, do nothing)
        this.mouseDown_time = undefined;
        // set the durationthresh to 1 sec
        this.mouseDown_toMouseUp_durationThresh = 1000;
    }

    // a.k.a. screenCoord_to_NDC_Coord
    // Normalized Device Coordinate (NDC)
    // https://threejs.org/docs/#api/en/math/Vector3.unproject
    // NDC_Coord (a.k.a. normalizedMouseCoord, mouseCoord) - is normalized to [-1, 1]
    //
    // https://stackoverflow.com/questions/18625858/object-picking-from-small-three-js-viewport
    // https://stackoverflow.com/questions/28632241/object-picking-with-3-orthographic-cameras-and-3-viewports-three-js
    // You need to consider the viewport parameters and adjust the mouse.x and mouse.y values so they always remain in the interval [ - 1, + 1 ]. – WestLangley

    screenPointCoordToNormalizedCoord(point2d) {

        let mouseCoord = new THREE_Vector2();
        mouseCoord.x = ((point2d.x - this.getPlanViewOffset().left -
            this.currentViewportNormalized.x) /
            this.currentViewportNormalized.z) * 2 - 1;

        mouseCoord.y = -((point2d.y - this.getPlanViewOffset().top -
            this.currentViewportNormalized.y) /
            this.currentViewportNormalized.w) * 2 + 1;

        return mouseCoord;
    }

    screenNormalizedPointCoordToPointCoord(mouseCoord) {
        // console.log('BEG screenNormalizedPointCoordToPointCoord');

        let point2d = new THREE_Vector2();

        point2d.x = this.currentViewportNormalized.z * ((mouseCoord.x + 1) / 2) +
            this.currentViewportNormalized.x +
            this.getPlanViewOffset().left;

        point2d.y = -(this.currentViewportNormalized.w * ((mouseCoord.y - 1) / 2) +
            this.currentViewportNormalized.y +
            this.getPlanViewOffset().top);

        return point2d;
    }

    getMouse() {
        return this.mouse;
    }

    boundPlanViewSize_bySizeOfParentElement() {
    // console.log('BEG boundPlanViewSize_bySizeOfParentElement');

        let planPaneWrapperEl = $('#planPaneWrapperId');
        let planPaneWrapperEloffset = planPaneWrapperEl.offset();
        let grid_container1 = $('#main-container-id');

        if (
            planPaneWrapperEloffset.top + planPaneWrapperEl.outerHeight() >
      grid_container1.outerHeight()
        ) {
            planPaneWrapperEl.outerHeight(
                grid_container1.outerHeight() - planPaneWrapperEloffset.top
            );
        }

        if (
            planPaneWrapperEl.left + planPaneWrapperEl.outerWidth() >
      grid_container1.outerWidth()
        ) {
            planPaneWrapperEl.outerWidth(
                grid_container1.outerWidth() - planPaneWrapperEloffset.left
            );
        }
    }

    getPlanViewOffset() {
        let planViewPane = $('#planViewPaneId');

        return {
            left: planViewPane.offset().left,
            top: planViewPane.offset().top,
        };
    }

    // SCENE INITIALIZATION  ________________________________________________________

    initPlanView() {
    // console.log('BEG initPlanView');

        // ////////////////////////////////////
        // Set camera related parameters
        // ////////////////////////////////////

        this.scene = new THREE_Scene();
        this.scene.name = '__scene';

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
        this.camera = new THREE_OrthographicCamera(
            left,
            right,
            top,
            bottom,
            near,
            far
        );
        this.camera.name = 'camera1';

        let sizePlanView = PlanView.GetMainContainerSize();
        let sizePlanViewRatio = sizePlanView.width / sizePlanView.height;

        this.camera.updateProjectionMatrix();

        this.camera.lookAt(this.scene.position);
        this.camera.updateMatrixWorld();

        this.addToScene(this.camera);

        if (PlanView.doDrawTwoFingerTouchCenterPoint) {
            // ////////////////////////////////////////////////////////////
            // Add centerPoint between two-finger touch
            // ////////////////////////////////////////////////////////////

            let numSegments = 32;
            const geometry = new THREE_CircleGeometry(
                this.overlayRectRadius,
                numSegments
            );
            const material = new THREE_MeshBasicMaterial({
                opacity: 0.3,
                transparent: true,
                side: THREE_DoubleSide,
                color: COL.util.Color.Red,
            });

            this.centerPoint_twoFingerTouch = new THREE_Mesh(geometry, material);
            this.centerPoint_twoFingerTouch.rotation.x = -Math.PI / 2;
            this.centerPoint_twoFingerTouch.name = 'centerPoint_twoFingerTouch';
            this.centerPoint_twoFingerTouch.visible = true;
            this.centerPoint_twoFingerTouch.updateMatrixWorld();
            this.addToScene(this.centerPoint_twoFingerTouch);
        }

        // ////////////////////////////////////
        // Set other parameters
        // ////////////////////////////////////

        // _groupPlanView = new THREE_Object3D();
        // this.addToScene(_groupPlanView);


        // //////////////////////////////////////////////////
        // Helpers
        // //////////////////////////////////////////////////

        // https://sites.google.com/site/threejstuts/home/polygonoffset
        // When both parameters are negative, (decreased depth), the mesh is pulled towards the camera (hence, gets in front).
        // When both parameters are positive, (increased depth), the mesh is pushed away from the camera (hence, gets behind).
        // order from far to near:
        // mesh (polygonOffsetUnits = 4, polygonOffsetFactor = 1)
        // this.axesHelperIntersection (polygonOffsetUnits = -4, polygonOffsetFactor = -1)

        this.axesHelperIntersection = new THREE_AxesHelper(500);
        this.axesHelperIntersection.material.linewidth = 20;
        this.axesHelperIntersection.material.polygonOffset = true;
        this.axesHelperIntersection.material.polygonOffsetUnits = -4;
        // this.axesHelperIntersection more in front, compared to e.g. mesh
        this.axesHelperIntersection.material.polygonOffsetFactor = -1;

        // this.addToScene(this.axesHelperIntersection);

        // https://stackoverflow.com/questions/20554946/three-js-how-can-i-update-an-arrowhelper
        var sourcePos = this.scene.position;
        sourcePos = new THREE_Vector3(0, 0, 0);

        var targetPos = this.camera.position;
        targetPos = new THREE_Vector3(1000, 100, 100);

        // //////////////////////////////////////////////////
        // INIT CONTROLS
        // //////////////////////////////////////////////////

        this.initializeOrbitControlsPlanView();

        // //////////////////////////////////////////////////
        // INIT LIGHTS
        // //////////////////////////////////////////////////

        let lightPlanView = new THREE_AmbientLight('#808080');
        lightPlanView.name = 'ambientLight1';
        this.addToScene(lightPlanView);

        let rendererPlanView = COL.model.getRendererPlanView();

        this.lights.AmbientLight = new COL.core.AmbientLight(
            this.scene,
            this.camera,
            rendererPlanView
        );
        this.lights.name = 'ambientLight2';
        this.lights.AmbientLight = 'ambientLight2';

        this.lights.Headlight = new COL.core.Headlight(
            this.scene,
            this.camera,
            rendererPlanView
        );
        this.lights.Headlight.name = 'headLight2';

        // //////////////////////////////////////////////////
        // EVENT HANDLERS
        // //////////////////////////////////////////////////

        let containerPlanView = document.getElementById('planView3dCanvasId');
        if (COL.util.isTouchDevice()) {
            containerPlanView.addEventListener(
                'touchmove',
                this.orbitControls.update.bind(this.orbitControls),
                { capture: false, passive: false }
            );
        }
        else {
            // no need the binding of mousemove to orbitControls.update.bind
            //   the eventListener on mousemove is triggered after mousedown
            //   we can probably remove the binding of the OrbitControlsPlanView::update()
            //   because:
            //   1. the onMouseMoveOrTouchMove_planView eventListener on mousemove, (while mousedown) calls OrbitControlsPlanView::update()
            //   2. there is no functionality need for OrbitControlsPlanView::update() when there is no mousedown
        }

        $('#planViewMenuId li').click(async function(event) {
            console.log('BEG #planViewMenuId li click');

            {
                // Prevent multiple click events firing JQuery
                // https://stackoverflow.com/questions/12708691/prevent-multiple-click-events-firing-jquery
                event.stopImmediatePropagation();
                event.preventDefault();
            }
            
            let selectedLayer = COL.model.getSelectedLayer();
            let planView = COL.getPlanView();
            let orbitControls = planView.getOrbitControls();
            switch($(this).attr('data-action')) {
                case 'moveOverlayRect': 
                {
                    console.log('moveOverlayRect');
                    planView.clearMenuPlanView();
                    orbitControls.setState( OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT );
                    break;
                }

                case 'deleteOverlayRect':
                {
                    if (confirm('Are you sure you want to delete this overlayRect?')) {
                        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                        if (COL.util.isObjectValid(selectedOverlayRect)) {
                            // delete the overlayRect
                            let meshObject = selectedOverlayRect.getMeshObject();
                            selectedLayer.removeFromOverlayMeshGroup(meshObject);
                            await selectedLayer.setSelectedOverlayRect(undefined);
    
                            // mark as not-synced after deleting an overlayRect. 
                            selectedLayer.setSyncWithWebServerStatus(false);
    
                            // sync to the webserver after deleting an overlayRect. 
                            let syncStatus = await selectedLayer.syncBlobsWithWebServer();
                            if(!syncStatus) {
                                throw new Error('Error from sync BlobsWithWebServer while deleting overlayRect');
                            }
                            PlanView.Render();
                        }
            
                        planView.clearMenuPlanView();
                        // No need to keep a state e.g. EDIT_MODE_DELETE_OVERLAY_RECT. 
                        // because the delete operation has no lingering effects.
                        orbitControls.setState( OrbitControlsPlanView.STATE.NONE );
                    }
                    break;
                }

                case 'mergeOverlayRectStart': 
                {
                    console.log('mergeOverlayRectStart');

                    // start the merge
                    planView.clearMenuPlanView();
                    orbitControls.setState( OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT );
                    selectedLayer.mergeOverlayRectsStart();

                    break;
                }
                case 'mergeOverlayRectEnd': 
                {
                    console.log('mergeOverlayRectEnd');

                    planView.clearMenuPlanView();
                    orbitControls.setState( OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT );
                    // - merge all selectedForMergeOverlayRects into the first overlayRect
                    await selectedLayer.mergeOverlayRectsEnd();

                    break;
                }
            }
            // call onMouseUpOrTouchEnd_planView to keep the correct state for addEventListener/removeEventListener
            await onMouseUpOrTouchEnd_planView();
        });
    }

    // set_camera_canvas_renderer_and_viewport1 - does:
    //  - sets the camera
    //    -- if rescaling the image, sets the camera position to center of the image, and height to PlanView.heightOffset
    //  - sets orbitControls
    //    -- calls OrbitControlsPlanView::setCameraAndCanvas - does xxx
    //  - sets _rendererPlanView
    //  - sets currentViewportNormalized

    set_camera_canvas_renderer_and_viewport1(doRescale = true) {
    // console.log('BEG PlanView set_camera_canvas_renderer_and_viewport1');

        let selectedLayer = COL.model.getSelectedLayer();
        let floorPlanMeshObj = selectedLayer.getFloorPlanMeshObj();

        if (COL.util.isObjectInvalid(floorPlanMeshObj)) {
            // sanity check
            throw new Error('floorPlanMeshObj is invalid');
        }

        // The mesh object.name is floorplanMesh for every floorPlan when creating a new .zip file, using the utility
        // webClient/scripts/create_site_zip_file.py, when creating a new .zip file,
        // ('floorplanMesh' is defined in template file webClient/scripts/templateFiles/via_json/layer.template.json)
        let selectedFloorObj = floorPlanMeshObj.getObjectByName('floorplanMesh');
        if (selectedFloorObj) {
            // bound the size of planPaneWrapperEl pane by the size of it's parent element (main-container-id)
            this.boundPlanViewSize_bySizeOfParentElement();

            // sizePlanView - the size of the gui window
            let sizePlanView = PlanView.GetMainContainerSize();

            if (doRescale) {
                // Rescale the planView view to cover the entire image
                this.bbox = new THREE_Box3().setFromObject(floorPlanMeshObj);
                this.bbox.getCenter(this.camera.position); // this re-sets the position
                this.camera.position.setY(PlanView.heightOffset);
                this.camera.updateProjectionMatrix();
            }

            // Update the camera frustum to cover the entire image
            let width1 = this.bbox.max.x - this.bbox.min.x;
            let height1 = this.bbox.max.z - this.bbox.min.z;
            let imageOrientation = 1;

            let retVal = this.orbitControls.setCameraAndCanvas(
                sizePlanView.width,
                sizePlanView.height,
                width1,
                height1,
                imageOrientation,
                doRescale
            );
            this.viewportExtendsOnX = retVal.viewportExtendsOnX;

            let rendererPlanView = COL.model.getRendererPlanView();

            rendererPlanView.setSize(
                sizePlanView.width,
                sizePlanView.height
            );

            // Set this.currentViewportNormalized (normalized by the pixelRatio)
            rendererPlanView.setViewport(
                -retVal.canvasOffsetLeft,
                -retVal.canvasOffsetTop,
                retVal.canvasWidth,
                retVal.canvasHeight
            );

            let currentViewport = new THREE_Vector4();
            rendererPlanView.getCurrentViewport(currentViewport);

            let pixelRatio = rendererPlanView.getPixelRatio();
            this.currentViewportNormalized = new THREE_Vector4();
            this.currentViewportNormalized.copy(currentViewport);
            this.currentViewportNormalized.divideScalar(pixelRatio);
            this.orbitControls.update();
        }
    }

    initializeOrbitControlsPlanView() {
    // console.log('BEG initializeOrbitControlsPlanView');

        let containerPlanView = document.getElementById('planView3dCanvasId');
        this.orbitControls = new OrbitControlsPlanView(
            this.camera, containerPlanView);

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
        this.camera.position.copy(cameraPlanViewPosition0);
        this.camera.zoom = 0.42;

        this.orbitControls.target.copy(this.camera.position);
        // initial this.orbitControls.target.Y is set to 0
        this.orbitControls.target.setY(COL.y0);

        // enable this.orbitControls
        this.enableControls(true);
    }

    enableControls(doEnable) {
        // console.log('BEG PlanView::enableControls');

        // let planPaneWrapperEl = document.getElementById('planPaneWrapperId');
        // planPaneWrapperEl.addEventListener( 'touchstart', onTouchStartplanPaneWrapper, {capture: false, passive: false} );

        let containerPlanView = document.getElementById('planView3dCanvasId');
    
        if (doEnable) {
            if (COL.util.isTouchDevice()) {
                containerPlanView.addEventListener('touchstart', onMouseDownOrTouchStart_planView, {
                    capture: false,
                    passive: false,
                });
            }
            else {
                containerPlanView.addEventListener('mousedown', onMouseDownOrTouchStart_planView, {
                    capture: false,
                    passive: false,
                });
                containerPlanView.addEventListener('wheel', onWheel_planView, {
                    capture: false,
                    passive: false,
                });
            }

            containerPlanView.addEventListener('keydown', onKeyDown_planView, {
                capture: false,
                passive: false,
            });
            containerPlanView.addEventListener('keyup', onKeyUp_planView, {
                capture: false,
                passive: false,
            });
        }
        else {
            if (COL.util.isTouchDevice()) {
                containerPlanView.removeEventListener('touchstart', onMouseDownOrTouchStart_planView, {
                    capture: false,
                    passive: false,
                });

                // // comment2
                // // theroetically, there is no need to remove 'touchmove' eventListener, because its removal is handled in onMouseUpOrTouchEnd_planView
                // // But I have seen cases in editMode, where 'touchmove' eventListener was still responding. This could have happenned due to some combination of
                // // button-pressing + race condition ? e.g.
                // // 'touchmove' eventListener hasn't finished processing, yet and the editMode button was already toggled ??
                // // so to be safe we remove 'touchmove' eventListener here as well
                // containerPlanView.removeEventListener('touchmove', onMouseMoveOrTouchMove_planView, {
                //     capture: false,
                //     passive: false,
                // });
            }
            else {
                containerPlanView.removeEventListener('mousedown', onMouseDownOrTouchStart_planView, {
                    capture: false,
                    passive: false,
                });
                
                // // see comment2
                // containerPlanView.removeEventListener('mousemove', onMouseMoveOrTouchMove_planView, {
                //     capture: false,
                //     passive: false,
                // });

                containerPlanView.removeEventListener('wheel', onWheel_planView, {
                    capture: false,
                    passive: false,
                });
            }
            containerPlanView.removeEventListener('keydown', onKeyDown_planView, {
                capture: false,
                passive: false,
            });
            containerPlanView.removeEventListener('keyup', onKeyUp_planView, {
                capture: false,
                passive: false,
            });
        }
    }

    getCameraPlanView() {
        return this.camera;
    }

    setCameraPlanView2(cameraPlanView) {
        this.camera = cameraPlanView;
    }

    setCameraPlanView(mesh) {
        // console.log('BEG setCameraPlanView');

        this.bbox = mesh.bBox;

        if (this.bbox) {
            this.bbox.getCenter(this.camera.position); // this re-sets the position
            // set the camera positionY to be higher than the floor
            this.camera.position.setY(PlanView.heightOffset);
        }

        // Update the camera frustum to cover the entire image
        let width1 = (this.bbox.max.x - this.bbox.min.x) / 2;
        let height1 = (this.bbox.max.z - this.bbox.min.z) / 2;

        this.camera.left = -width1;
        this.camera.right = width1;
        this.camera.top = height1;
        this.camera.bottom = -height1;
        this.camera.updateProjectionMatrix();
    }

    addToScene(threejsObject) {
    // console.log('BEG addToScene');
        this.scene.add(threejsObject);
    }

    removeFromScene(threejsObject) {
    // console.log('BEG removeFromScene');
        this.scene.remove(threejsObject);
    }

    clearScene() {
        for (let i = 0; i < this.scene.children.length; i++) {
            // don't clear the camera and the lights
            if ( (this.scene.children[i].type == 'OrthographicCamera') ||
                 (this.scene.children[i].type == 'AmbientLight') ) {
                continue;
            }
            this.scene.remove(this.scene.children[i]);
            i--;
        }
    }

    getIntersectionStructureInfo() {
        return this.intersectedStructureInfo;
    }

    getIntersectionOverlayRectInfo() {
        return this.intersectedOverlayRectInfo;
    }

    clearIntersectionOverlayRectInfo() {
        this.intersectedOverlayRectInfo.clearIntersection();
    }

    async insertOverlayRectMesh(intersectedStructurePoint, doSetAsSelectedOverlayRect = true) {
        // console.log('BEG insertOverlayRectMesh');

        let selectedLayer = COL.model.getSelectedLayer();
        let materialAttributes = {
            opacity: 0.91,
            transparent: true,
            side: THREE_DoubleSide,
            color: COL.util.Color.Acqua, 
        };
        let circleMesh = selectedLayer.createMesh( intersectedStructurePoint, 'circle', materialAttributes );
        if(COL.util.isObjectInvalid(circleMesh)) {
            // sanity check
            throw new Error('Failed to create circleMesh');
        }

        // ///////////////////////////////////////////////////////////
        // Add circleMesh to overlayMeshGroup,
        // Create new overlayRect and 
        // Add the new overlayRect to overlayRects
        // ///////////////////////////////////////////////////////////

        let overlayMeshObj = selectedLayer.addToOverlayMeshGroup_createOverlayRect_andAddToOverlayRects(circleMesh);
        
        // indicate that the overlayRect has changed (new overlayRect) compared to the back-end
        let overlayRect = selectedLayer.getOverlayRectByName(overlayMeshObj.name);
        let overlayRectIsDirty2 = {
            isDirty_newOverlayRect: true,
        };
        overlayRect.setIsDirty2(overlayRectIsDirty2);

        if (doSetAsSelectedOverlayRect) {
            await selectedLayer.setSelectedOverlayRect(overlayMeshObj);
            // await selectedLayer.showSelectedOverlayRect();
        }

        return overlayRect;
    }

    getOverlayRectRadius() {
        return this.overlayRectRadius;
    }

    setOverlayRectRadius(overlayRectRadius) {
        return (this.overlayRectRadius = overlayRectRadius);
    }

    getOverlayRectScale() {
        return this.overlayRectScale;
    }

    setOverlayRectScale(overlayRectScale) {
        this.overlayRectScale = overlayRectScale;
    }

    getAxesHelperIntersection() {
        return this.axesHelperIntersection;
    }

    getOrbitControls() {
        return this.orbitControls;
    }

    setOrbitControls(controls) {
        this.orbitControls = controls;
    }

    getBoundingBox() {
        return this.bbox;
    }

    setBoundingBox(bbox) {
        return (this.bbox = bbox);
    }

    doesViewportExtendOnX() {
        return this.viewportExtendsOnX;
    }

    getCurrentViewportNormalized() {
        return this.currentViewportNormalized;
    }

    setCurrentViewportNormalized(currentViewportNormalized) {
        this.currentViewportNormalized = currentViewportNormalized;
    }

    centerIntersectionPointInPlanViewView() {
        console.log('BEG centerIntersectionPointInPlanViewView');

        // ///////////////////////////////////////////////////////////
        // center the planView view by changing both
        // - the cameraPlanView position, and
        // - the cameraPlanView target (lookAt)
        // ///////////////////////////////////////////////////////////

        let axesHelperIntersection = this.getAxesHelperIntersection();
        this.camera.position.copy(axesHelperIntersection.position);
        this.camera.position.setY(cameraPlanViewHeight);

        let orbitControls = this.getOrbitControls();
        orbitControls.target.copy(this.camera.position);
        // orbitControls.target.setY(0.0);
        orbitControls.target.setY(COL.y0);
    }

    getLayerIntersectionsInfo(intersects) {
        let selectedLayer = COL.model.getSelectedLayer();

        for (let i = 0; i < intersects.length; i++) {
            let intersectionCurr = intersects[i];
            if (intersectionCurr.object.type === 'Mesh' &&intersectionCurr.object.name !== 'ring') {
                // Found intersection with planViewMesh (floor)

                // Assuming that the intersection results are sorted by distance
                let intersectionCurr_object_id = COL.util.getNestedObject(intersectionCurr,['object', 'id']);
                let floorPlanMesh = selectedLayer.getFloorPlanMeshObj();
                let intersectedStructureObject = floorPlanMesh.getObjectById(intersectionCurr_object_id);

                if (intersectedStructureObject) {
                    return intersectionCurr;
                }
            }
            else {
                // Can get here e.g. if intersecting with LineSegments
                // console.log('Intersection is not a mesh');
            }
        }

        return;
    }

    findIntersectionWithPlanViewMesh() {
        console.log('BEG findIntersectionWithPlanViewMesh');
        // Find intersection with planViewMesh (floor)

        let selectedLayer = COL.model.getSelectedLayer();
        let floorPlanMeshObj = selectedLayer.getFloorPlanMeshObj();

        this.raycasterPlanView.setFromCamera(this.mouse,this.camera);
        let intersects = this.raycasterPlanView.intersectObjects(floorPlanMeshObj.children,true);
        this.intersectedStructureInfo.clearIntersection();

        if (intersects.length > 0) {
            // Get the intersection info with the planViewMesh (floor)
            let intersectionCurr = this.getLayerIntersectionsInfo(intersects);
            if (intersectionCurr) {
                // Set this.intersectedStructureInfo to the planViewMesh (floor) that is intersected
                this.intersectedStructureInfo.currentIntersection = intersectionCurr;
            }
        }

        return this.intersectedStructureInfo.currentIntersection;
    }

    async findIntersectionWithOverlayMeshGroup(selectedLayer) {
    // console.log('BEG findIntersectionWithOverlayMeshGroup');

        // intersect with the overlayRects (circles)

        let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
  
        // ////////////////////////////////////////////////////
        // Intersect with ALL children objects of overlayMeshGroup
        // and then use the first Mesh object
        // ////////////////////////////////////////////////////

        this.raycasterPlanView.setFromCamera(this.mouse,this.camera);
        let intersectsOverlayRect = this.raycasterPlanView.intersectObjects(overlayMeshGroup.children,true);
        // console.log('intersectsOverlayRect.length', intersectsOverlayRect.length);

        // Reset any previous intersection info before finding a new one
        this.intersectedOverlayRectInfo.clearIntersection();

        if (intersectsOverlayRect.length > 0) {
            // Intersect only with objects of type Mesh (i.e. ignore intersection with e.g. Sprites)
            for (let i = 0; i < intersectsOverlayRect.length; i++) {
                let intersection = intersectsOverlayRect[i];
                if (intersection.object.type === 'Mesh' && intersection.object.name !== 'ring') {
                    let isOverlayRectFilteredIn = COL.util.getNestedObject(intersection, [
                        'object',
                        'material',
                        'userData',
                        'isOverlayRectFilteredIn',
                    ]);
                    if (!selectedLayer.isMilestoneDatesFilterEnabled ||
                        (selectedLayer.isMilestoneDatesFilterEnabled && isOverlayRectFilteredIn)) {
                        // Sets this.intersectedOverlayRectInfo to the overlayRect (circle) that is intersected
                        this.intersectedOverlayRectInfo.currentIntersection = intersection;
                        break;
                    }
                }
            }
        }

        let intersectedOverlayMeshObject = COL.util.getNestedObject(this.intersectedOverlayRectInfo,['currentIntersection', 'object']);

        return intersectedOverlayMeshObject;
    }

    async validateIntersectionPoint() {
        // console.log('BEG validateIntersectionPoint');
    
        let selectedLayer = COL.model.getSelectedLayer();
        if (!selectedLayer) {
            return;
        }
    
        let orbitControls = this.getOrbitControls();
        let orbitControlsState = orbitControls.getState();
    
        switch(orbitControlsState) {
            case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT: 
            {
                // Find intersection with planViewMesh (floor)
                this.findIntersectionWithPlanViewMesh();
    
                let editedOverlayMeshObj = undefined;
                let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                if (COL.util.isObjectValid(selectedOverlayRect)) {
                    editedOverlayMeshObj = selectedOverlayRect.getMeshObject();
                }
                else {
                    let intersectedOverlayMeshObject = await this.findIntersectionWithOverlayMeshGroup(selectedLayer);
    
                    if(orbitControlsState == OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT) {
                        if (COL.util.isObjectValid(intersectedOverlayMeshObject)) {
                        // Update selectedOverlayRect
                            await selectedLayer.setSelectedOverlayRect(intersectedOverlayMeshObject);
                            await selectedLayer.showSelectedOverlayRect();
                        }
          
                        let intersectedOverlayRectInfo = this.getIntersectionOverlayRectInfo();
                        editedOverlayMeshObj = COL.util.getNestedObject( intersectedOverlayRectInfo, ['currentIntersection', 'object'] );
                    }
                }
    
                // Find closest distance between floor intersection and overlayRects (circles)
                let planViewPosition = this.intersectedStructureInfo.currentIntersection.point;
                if (COL.util.isObjectInvalid(editedOverlayMeshObj) &&
                (orbitControlsState == OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT) ) {
                // ////////////////////////////////////////////////////////////////////////
                // clicked on a point that does not overlap any overlayRect
                // if the distance from other overlayRects is valid (i.e. not too close to
                // existing overlayRect, add a new overlayRect)
                // ////////////////////////////////////////////////////////////////////////
    
                    let selectedOverlayMeshObjName = undefined;
                    let isValidIntersectionDistance = this.isValidIntersectionDistanceToNearestOverlayRect(
                        selectedLayer,
                        planViewPosition,
                        selectedOverlayMeshObjName
                    );
    
                    // check if position is within boundaries of planViewPane
                    let isPositionWithinBoundaries = this.isPositionWithinPaneBoundaries(planViewPosition);
    
                    if (isValidIntersectionDistance && isPositionWithinBoundaries) {
                    // The position is valid
                    // - clicked "far" enough from an existing overlayRect
                    // - the position is within boundaries of the planViewPane
    
                        let overlayMeshGroup1 = selectedLayer.getOverlayMeshGroup();
                        // Add new overlayMesh
                        await this.insertOverlayRectMesh(planViewPosition);
                        let overlayMeshGroup2 = selectedLayer.getOverlayMeshGroup();
    
                        // after adding the new overlayMesh, calling to findIntersections() again causes the
                        // new overlayMesh to be marked as the selectedOverlayRect
                        await this.findIntersections();
                    
                        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                        if (COL.util.isObjectValid(selectedOverlayRect)) {
                            editedOverlayMeshObj = selectedOverlayRect.getMeshObject();
                        }
                    }
                    else {
                    // clicked near an existing overlayMesh
                    // console.log('Intersection distance to nearest overlayMesh is INVALID!!');
                    }
                }
    
                if (COL.util.isObjectValid(editedOverlayMeshObj)) {
                // ///////////////////////////////////////
                // Validate the position. check that the:
                // - distance to existing overlayRects is valid
                // - position is within boundaries of the planViewPane
                // ///////////////////////////////////////
    
                    let isValidIntersectionDistance = this.isValidIntersectionDistanceToNearestOverlayRect(
                        selectedLayer,
                        editedOverlayMeshObj.position,
                        editedOverlayMeshObj.name
                    );
    
                    // check if position is within boundaries of planViewPane
                    let isPositionWithinBoundaries = this.isPositionWithinPaneBoundaries(planViewPosition);
    
                    if (!isValidIntersectionDistance || !isPositionWithinBoundaries) {
                    // console.log('The position is INVALID!!');
                    // The position is invalid
                    // revert the editedOverlayMeshObj to its original position
                        editedOverlayMeshObj.position.copy(this.editedOverlayMeshObjInitialPosition);
                    }
    
                // this.dispatchEvent({ type: 'dragend', object: editedOverlayMeshObj });
                }
                else {
                // editedOverlayMeshObj may be undefined if we did not click on a valid location in the first place
                // e.g. too close to an existing image dot
                }

                break;
            }
            case OrbitControlsPlanView.STATE.NONE: 
            case OrbitControlsPlanView.STATE.DOLLY_PAN:
            case OrbitControlsPlanView.STATE.DOLLY_ZOOM:
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT:
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
            case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
                break;

            default:
                let msgStr = 'orbitControls state is not supported: ' + orbitControls.getStateAsStr();
                throw new Error(msgStr);

        }
    }
    
    isValidIntersectionDistanceToNearestOverlayRect(
        selectedLayer,
        planViewPosition,
        selectedOverlayMeshObjName
    ) {
    // console.log('BEG isValidIntersectionDistanceToNearestOverlayRect');

        // Find closest distance between floor intersection and overlayRects (circles)

        let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
        planViewPosition.setY(COL.y0);

        let minDistance = 1e6;
        let nearestOverlayRect = undefined;

        for (let i = 0; i < overlayMeshGroup.children.length; ++i) {
            if (selectedOverlayMeshObjName == overlayMeshGroup.children[i].name) {
                // Reached the selectedOverlayMeshObjName
                // Don't check the distance from the planViewPosition intersection point to the selected overlayRect.

                continue;
            }

            // the overlayRectPosition is projected onto the plan. Only the plannar distance is measured.
            // (typically all overlayRects are on the floor plan [i.e. y==0] except for overlayRects that are created via split.
            // and thir y position is set to 0 after they are moved)
            let overlayRectPosition = new THREE_Vector3();
            overlayRectPosition.copy(overlayMeshGroup.children[i].position);
            overlayRectPosition.setY(COL.y0);

            let distance = planViewPosition.distanceTo(overlayRectPosition);
            if (distance < minDistance) {
                minDistance = distance;
                nearestOverlayRect = overlayMeshGroup.children[i];
            }
        }

        // Set the threshold to be "2 x this.overlayRectRadius" so that the overlayRects do not overlap
        let minDistanceThresh = 2 * this.overlayRectRadius;
        let retVal = minDistance < minDistanceThresh ? false : true;

        return retVal;
    }

    isPositionWithinPaneBoundaries(planViewPosition) {
    // console.log('BEG isPositionWithinPaneBoundaries');

        let isPositionWithinBoundaries = false;

        if (
            planViewPosition.x >= this.bbox.min.x &&
      planViewPosition.x < this.bbox.max.x &&
      planViewPosition.z >= this.bbox.min.z &&
      planViewPosition.z < this.bbox.max.z
        ) {
            isPositionWithinBoundaries = true;
        }

        // console.log('isPositionWithinBoundaries', isPositionWithinBoundaries);

        return isPositionWithinBoundaries;
    }

    async findIntersections() {
        // console.log('BEG findIntersections');

        let selectedLayer = COL.model.getSelectedLayer();

        // Find intersection with planViewMesh (floor)
        this.intersectedStructureInfo.currentIntersection = this.findIntersectionWithPlanViewMesh();

        // tbd - overlayRect -> overlayPoint

        if (this.intersectedStructureInfo.currentIntersection) {
            let intersectionPointCurr = this.intersectedStructureInfo.currentIntersection.point;
            let intersectionPointPrev = new THREE_Vector3();
            intersectionPointCurr.setY(COL.y0);

            // order from far to near:
            let dist1 = intersectionPointCurr.distanceTo(intersectionPointPrev);
            let epsilon = 1.0;
            if (dist1 > epsilon) {
                intersectionPointPrev.copy(intersectionPointCurr);
                this.axesHelperIntersection.position.copy(intersectionPointCurr);
            }

            // intersect with the overlayRects (circles)
            let intersectedOverlayMeshObject = await this.findIntersectionWithOverlayMeshGroup(selectedLayer);
            await selectedLayer.setSelectedOverlayRect(intersectedOverlayMeshObject);

            PlanView.Render();
        }
    }

    static GetMainContainerSize() {
        // console.log('BEG GetMainContainerSize');

        let mainContainerEl = $('#main-container-id');

        if(mainContainerEl.innerWidth() == 0 || mainContainerEl.innerHeight() == 0) {
            throw new Error('mainContainerEl inner size is invalid');
        }

        let sizePlanView = {
            width: mainContainerEl.innerWidth(),
            height: mainContainerEl.innerHeight(),
        };

        return sizePlanView;
    }

    static Render() {
    // console.log('BEG this.Render');

        let planView = COL.getPlanView();

        if (COL.util.isObjectValid(planView)) {
            // tbd - multiple calls update()->Render()->update()... happen as long as, between the iterations, inside orbitControls.update()
            // we are getting into the following code section, inside orbitControls.update():
            //   if ( this.zoomChanged ||
            //      (positionShift > OrbitControlsPlanView.EPS) ||
            //      (condition3 > OrbitControlsPlanView.EPS) ) {
            //
            // check why the first call to orbitControls.update() (which calls Render() does not already set the position to its final value...
            planView.orbitControls.update();
                
            COL.model.getRendererPlanView().render(
                planView.scene,
                planView.camera
            );
        }
    }

    resetTrackballPlanView() {
        this.orbitControls.reset();
    }

    toJSON() {
        // console.log('BEG PlanView::toJSON()');

        if (COL.util.isNumberInvalid(this.orbitControls.minZoom)) {
            throw new Error('minZoom is invalid.');
        }

        let planViewAsJson = {
            scene: this.scene,
        };

        return planViewAsJson;
    }

    // create a filtered/manipulated json, to be exported to file
    // e.g. without some members, and with some members manipulated (e.g. some nested entries removed)
    toJSON_forFile() {
        console.log('BEG toJSON_forFile');

        this.scene.traverse(async function (child) {
            if (child.name === 'floorplanGroup') {
                // //////////////////////////////////////////////////////////////////////////
                // Remove the floor plan image so it does not get exported as part of the
                // .json file (it is stored seperatly in the floorPlan image file)
                // //////////////////////////////////////////////////////////////////////////

                let meshObj1 = child.children[0];
                // sanity check
                if (meshObj1.type !== 'Mesh' || meshObj1.name !== 'floorplanMesh' || COL.util.isObjectInvalid(meshObj1.material)) {
                    throw new Error('Invalid meshObj1. Should have: type "Mesh", name === "floorplanMesh", or invalid material');
                }
                meshObj1.material.map = null;
            }
        });

        let planView_asJson = this.toJSON();
        // console.log('planView_asJson1', planView_asJson);

        // remove unneeded nodes
        delete planView_asJson.intersectedOverlayRectInfo;
        delete planView_asJson.intersectedStructureInfo;
        delete planView_asJson.raycasterPlanView;

        // store (overwrite) manipulated version of orbitControls (e.g. witout camera)
        let orbitControls = this.getOrbitControls();
        planView_asJson.orbitControls = orbitControls.toJSON_forFile();

        planView_asJson.images = null;

        return planView_asJson;
    }

    // Split PlanView::fromJson to 2 functions:
    // PlanView::fromJson -> Layer::setPlanViewForSelectedLayer
    // PlanView::fromJson -> Layer::fromJson

    async fromJson(layer, objectLoader, planView_asDict) {
        // console.log('BEG PlanView::fromJson()');
        
        // //////////////////////////////////////////////////////////////////////////
        // Set:
        // - this.overlayRectRadius
        // - this.overlayRectScale
        // //////////////////////////////////////////////////////////////////////////

        if (COL.util.isObjectValid(planView_asDict.overlayRectRadius)) {
            this.setOverlayRectRadius(planView_asDict.overlayRectRadius);
        }

        if (COL.util.isObjectValid(planView_asDict.overlayRectScale)) {
            this.setOverlayRectScale(planView_asDict.overlayRectScale);
        }

        // //////////////////////////////////////////////////////////////////////////
        // Set:
        // - this.scene
        // //////////////////////////////////////////////////////////////////////////

        let scene_asDict = planView_asDict.scene;
        const scene = objectLoader.parse(scene_asDict);
        const children = [];
        scene.traverse((o) => children.push(o));

        // Then you can use a regular async-loop to do your work:
        for (let child of children) {
            if (child.name === 'floorplanGroup') {
                // //////////////////////////////////////////////////////////////////////////
                // add images related to floorPlan (e.g. floorPlan image) to imagesInfo_forLayer2
                // //////////////////////////////////////////////////////////////////////////

                let meshObj = child;
                layer.setFloorPlanMeshObj(meshObj);

                await layer.populateFloorPlanObj();
                
                meshObj = layer.getFloorPlanMeshObj();
                // meshObj.children[0].geometry.boundingBox

                if (COL.doEnableWhiteboard) {
                    let floorPlanWhiteboard = new Whiteboard();
                    layer.setFloorPlanWhiteboard(floorPlanWhiteboard);
                }

                this.addToScene(meshObj);
                this.setCameraPlanView(meshObj);
                PlanView.Render();
            }
            if (child.name === 'overlayRects') {
                // //////////////////////////////////////////////////////////////////////////
                // add images related to overlayRects (e.g. overlayRect images) to imagesInfo_forLayer2
                // //////////////////////////////////////////////////////////////////////////

                let overlayMeshGroup = child;
                layer.populateOverlayRects(overlayMeshGroup);

                let overlayMeshGroup_asJson = overlayMeshGroup.toJSON();
                let overlayMeshGroup_asJson_str = JSON.stringify(
                    overlayMeshGroup_asJson
                );

                this.addToScene(overlayMeshGroup);
            }
        }

        // //////////////////////////////////////////////////////////////////////////
        // Set:
        // - this.camera
        // //////////////////////////////////////////////////////////////////////////

        let cameraPlanView_asDict = planView_asDict.camera;
        const cameraPlanView = objectLoader.parse(cameraPlanView_asDict);
        this.setCameraPlanView2(cameraPlanView);

        // //////////////////////////////////////////////////////////////////////////
        // Set:
        // - this.orbitControls
        // - this.viewportExtendsOnX
        // - this.currentViewportNormalized
        // - this.bbox
        // //////////////////////////////////////////////////////////////////////////

        this.orbitControls.camera = this.getCameraPlanView();
        this.orbitControls.fromJson(planView_asDict.orbitControls);

        this.viewportExtendsOnX = planView_asDict.viewportExtendsOnX;

        this.currentViewportNormalized = new THREE_Vector4(
            planView_asDict.currentViewportNormalized.x,
            planView_asDict.currentViewportNormalized.y,
            planView_asDict.currentViewportNormalized.z,
            planView_asDict.currentViewportNormalized.w
        );

        this.setBoundingBox(planView_asDict.bbox);
    }

    dispose() {
        console.log('BEG PlanView::dispose()');

        // ////////////////////////////////////////////////////
        // Before Dispose
        // ////////////////////////////////////////////////////

        // ////////////////////////////////////////////////////
        // Dispose
        // https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534
        // ////////////////////////////////////////////////////

        // dispose geometries and materials in scene
        // this.sceneTraverse();
        // console.log('BEG PlanView:: this.scene.traverse');
        this.scene.traverse(function (obj) {
            COL.ThreejsUtil.disposeObject(obj);
        });

        // remove event listeners
        this.enableControls(false);

        // https://threejs.org/docs/#examples/en/controls/OrbitControls.dispose
        this.orbitControls.dispose();

        this.mouse = null;

        this.bbox = null;

        this.raycasterPlanView = null;

        this.currentViewportNormalized = null;

        this.axesHelperIntersection.material.dispose();
        this.axesHelperIntersection = null;

        this.intersectedStructureInfo.dispose();
        this.intersectedStructureInfo = null;

        this.intersectedOverlayRectInfo.dispose();
        this.intersectedOverlayRectInfo = null;

        this.lights.AmbientLight = null;
        this.lights.Headlight = null;

        // ////////////////////////////////////////////////////
        // After Dispose
        // ////////////////////////////////////////////////////

        // console.log( "After Dispose");
    }

    // /////////////////////////////////
    // BEG Add context-menu to selected plan
    // http://jsfiddle.net/avnerm/Lz08n1ex/97
    // /////////////////////////////////

    delayedMenuPlanView(event) {
        // console.log('BEG delayedMenuPlanView');
        if(this.isMenuVisible) {
            // a previous menu exist. Clear it first before setting a new menu.
            this.clearMenuPlanView();
        }

        let timeIntervalInMilliSec = 500;
        let planView = COL.getPlanView();
        this.timeoutID = setTimeout(PlanView.ShowMenuPlanView, timeIntervalInMilliSec, event);
    }
    
    // We need to use static function PlanView.ShowMenuPlanView
    // because the function that is trigerred by setTimeout(), has "this" of type "Window" (and not the instance, e.g. PlanView)
    // even if triggering the instance function planView.showMenuPlanView()
    static ShowMenuPlanView(event) {
        // console.log('BEG ShowMenuPlanView');

        let planView = COL.getPlanView();
        planView.showMenuPlanView(event);
    }

    showMenuPlanView(event) {
        // console.log('BEG showMenuPlanView');

        if (COL.util.isTouchDevice()) {
            let currentTouch = event.changedTouches[0];
            $('#planViewMenuId').finish().toggle(100).css({
                top: currentTouch.pageY + 'px',
                left: currentTouch.pageX + 'px'
            });
        }
        else{
            $('#planViewMenuId').finish().toggle(100).css({
                top: event.pageY + 'px',
                left: event.pageX + 'px'
            });
        }

        this.isMenuVisible = true;
        let orbitControls = this.getOrbitControls();
        orbitControls.setState(OrbitControlsPlanView.STATE.CONTEXT_MENU);
    }

    clearMenuPlanView() {
        // console.log('BEG clearMenuPlanView');

        window.clearTimeout(this.timeoutID);
        this.isMenuVisible = false;
        $('#planViewMenuId').hide(100);
    }

    // /////////////////////////////////
    // END Add context-menu to selected plan
    // /////////////////////////////////

}

// /////////////////////////////////
// BEG Static class variables
// /////////////////////////////////

// https://stackoverflow.com/questions/35242113/define-a-const-in-class-constructor-es6
PlanView.heightOffset = 1000;
PlanView.overlayRectRadiusDefault = 20;
PlanView.numSegments = 10;
// PlanView.numSegments = 4;
PlanView.doDrawTwoFingerTouchCenterPoint = false;

// /////////////////////////////////
// END Static class variables
// /////////////////////////////////

// INIT

$(window).ready(function () {});

// $(window).on('load', ...) happens after $(window).ready
// $(window).ready(function () {
$(window).on('load', function () {});

export { PlanView };
