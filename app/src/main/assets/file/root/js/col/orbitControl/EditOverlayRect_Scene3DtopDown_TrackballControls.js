/*
 * @author zz85 / https://github.com/zz85
 * @author mrdoob / http://mrdoob.com
 * Running this will allow you to drag three.js objects around the screen.
 */

import {Raycaster as THREE_Raycaster,
        Vector2 as THREE_Vector2,
        Vector3 as THREE_Vector3,
        MOUSE as THREE_MOUSE,
        EventDispatcher as THREE_EventDispatcher
       } from '../../static/three.js/three.js-r120/build/three.module.js';

import { COL } from  "../COL.js";
import { OverlayRect } from "../core/OverlayRect.js";
import { Model } from "../core/Model.js";
import "../util/Util.js";
import { Scene3DtopDown } from "../core/Scene3DtopDown.js";
import { OrbitControls3Dpane } from "./OrbitControls3Dpane.js";

class EditOverlayRect_Scene3DtopDown_TrackballControls extends THREE_EventDispatcher {
    constructor(_camera, _domElement){
        super();

        this._raycaster = new THREE_Raycaster();
        this._mouse = new THREE_Vector2();
        this._intersection = new THREE_Vector3();

        this._selectedStructureObj = null;
        this._editedOverlayMeshObjInitialPosition = new THREE_Vector3();
        
        this._hoveredOverlayRect = null;

        this.onMouseDownOrTouchStartEditOverlayStillProcessing = false;
        this.onMouseUpOrTouchUpEditOverlayStillProcessing = false;

        this._camera = _camera;
        this._domElement = _domElement;
        
        this.enableControls(true);
    };

    dispose = function () {
        console.log('BEG EditOverlayRect_Scene3DtopDown_TrackballControls::dispose()');

        console.log('EditOverlayRect_Scene3DtopDown_TrackballControls before dispose', this); 
        
        this._raycaster = null;
        this._mouse = null;
        this._intersection = null;
        this._selectedStructureObj = null;

        this._editedOverlayMeshObjInitialPosition = null;
        this._hoveredOverlayRect = null;
        
        this._camera = null;
        this.enableControls(false);

        console.log('EditOverlayRect_Scene3DtopDown_TrackballControls after dispose', this); 
        
    };
    
    enableControls = function(doEnable) {
        // console.log('BEG EditOverlayRect_Scene3DtopDown_TrackballControls.enableControls()');

        // reset, in case that scene3DtopDown is stuck waiting for the following events
        this.onMouseDownOrTouchStartEditOverlayStillProcessing = false;
        this.onMouseUpOrTouchUpEditOverlayStillProcessing = false;
        
        if(doEnable)
        {
            if (COL.util.isTouchDevice())
            {
                this._domElement.addEventListener( 'touchstart', onTouchStart3, {capture: false, passive: false} );
            }
            else
            {
                this._domElement.addEventListener( 'mousedown', onMouseDown3, {capture: false, passive: false} );
                this._domElement.addEventListener( 'wheel', onMouseWheel3, {capture: false, passive: false} );
            }
        }
        else
        {
            if (COL.util.isTouchDevice())
            {
                this._domElement.removeEventListener( 'touchstart', onTouchStart3, {capture: false, passive: false} );
                // see comment2 in Scene3DtopDown.js
                this._domElement.removeEventListener( 'touchmove', onTouchMove3, {capture: false, passive: false} );
            }
            else
            {
                this._domElement.removeEventListener( 'mousedown', onMouseDown3, {capture: false, passive: false} );
                // see comment2 in Scene3DtopDown.js
                this._domElement.removeEventListener( 'mousemove', onMouseMove3, {capture: false, passive: false} );

                this._domElement.removeEventListener( 'wheel', onMouseWheel3, {capture: false, passive: false} );
            }
        }
    };

    translateOverlayRect2 = function() {
        // console.log('BEG translateOverlayRect2'); 
        
        ///////////////////////////////////////
        // move the position of overlayRect
        ///////////////////////////////////////

        let selectedLayer = COL.model.getSelectedLayer();
        let scene3DtopDown = selectedLayer.getScene3DtopDown();
        let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();
        let editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);
        editedOverlayMeshObj.position.copy( this._intersection.point );

        // update the position of the overlayRect (i.e. overlayMeshObj) in overlayMeshGroup
        // (this is needed to persist the changes when syncing the changes to the webserver)
        let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
        let overlayMeshObj = overlayMeshGroup.getObjectByName( editedOverlayMeshObj.name, true );
        overlayMeshObj.position.copy(editedOverlayMeshObj.position);
        overlayMeshObj.updateMatrixWorld();

        let overlayRect = selectedLayer.getOverlayRectByName(overlayMeshObj.name);
        if(COL.util.isObjectInvalid(overlayRect))
        {
            // sanity check
            throw new Error('overlayRect is invalid');
        }

        // indicate that the overlayRect has changed (translated) compared to the overlayRect in the back-end
        let overlayRectIsDirty2 = {
            isDirty_moved: true
        };
        overlayRect.setIsDirty2(overlayRectIsDirty2);
        
    };

    
    handleMouseDown_orOneFingerTouchStart3 = async function()
    {
        console.log('BEG handleMouseDown_orOneFingerTouchStart3');
        
        // findIntersections on mouse down prevents from side effects
        // e.g. the following useCase:
        // - in edit mode
        // - having intersection from previous mousedown interaction
        // - clicking in non overlayRect area
        // - without the call to findIntersections the previously selected overlay rect will be moved
        // - with the call to findIntersections, intersects with the non overlayRect area, and clears the intersection info ->
        //   which results in nothing gets moved - good!
        let selectedLayer = COL.model.getSelectedLayer();
        let scene3DtopDown = selectedLayer.getScene3DtopDown();

        await scene3DtopDown.findIntersections();

        let intersectedStructureInfo = scene3DtopDown.getIntersectionStructureInfo();
        let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();

        this._selectedStructureObj = COL.util.getNestedObject(intersectedStructureInfo, ['currentIntersection', 'object']);

        // the following 2 objects are different -
        // - selectedLayer.getSelectedOverlayRect(), - this is the selected overlayRect
        // - COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']) -
        //     this is the intersection with overlayRect, which may be undefined if clicking on a place in the plan where there is no overlayRect
        let editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);

        if(COL.util.isObjectValid(this._selectedStructureObj))
        {
            if(COL.util.isObjectValid(editedOverlayMeshObj))
            {
                this._intersection = COL.util.getNestedObject(intersectedStructureInfo, ['currentIntersection']);
                this._selectedStructureObj = this._intersection.object;
                this._editedOverlayMeshObjInitialPosition.copy( editedOverlayMeshObj.position );
                this._domElement.style.cursor = 'move';
            }
        }
        
        // console.log('END handleMouseDown_orOneFingerTouchStart3');
    };
    
    handleMouseMove_orOneFingerTouchMove3 = async function()
    {
        // console.log('BEG handleMouseMove_orOneFingerTouchMove3');

        let selectedLayer = COL.model.getSelectedLayer();
        if(!selectedLayer)
        {
            // Layer is not yet defined
            return;
        }

        if( !selectedLayer.getEditOverlayRectFlag() )
        {
            // sanity check - should not get here
            throw new Error('handleMouseMove_orOneFingerTouchMove3 called while not in editMode');
        }

        let scene3DtopDown = selectedLayer.getScene3DtopDown();

        // let orbitControls = scene3DtopDown.getOrbitControls();
        // let orbitControlsState = orbitControls.getState();
        // console.log('orbitControlsState', orbitControlsState); 
        
        this._mouse = scene3DtopDown.getMouseCoords();
        this._camera = scene3DtopDown.getCamera3DtopDown();
        
        this._raycaster.setFromCamera( this._mouse, this._camera );

        let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();
        let editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);

        if(COL.util.isObjectValid(this._selectedStructureObj)) {
            
            if(COL.util.isObjectValid(editedOverlayMeshObj)) {
                /////////////////////////////////////////////////////////
                // An overlayRect is selected
                // intersect with the selected structure (which must be selected)
                // and use the new intersection point for translation
                // of the overlayRect
                /////////////////////////////////////////////////////////

                var intersects2 = this._raycaster.intersectObjects( [this._selectedStructureObj] );
                if(intersects2.length > 0)
                {
                    this._intersection = intersects2[0];
                    this.translateOverlayRect2();
                }
                this.dispatchEvent( { type: 'drag', object: editedOverlayMeshObj } );
                Scene3DtopDown.render1();
            }
            else
            {
                /////////////////////////////////////////////////////////
                // An overlayRect is NOT selected
                // intersect with the list of overlayRects
                // if intersection is found - change the icon to ???
                // 
                // 'pointer' == icon in the shape of "arrow"
                // 'auto' == icon in the shape of "hand feast"
                // 'drag' == icon in the shape of "???"
                /////////////////////////////////////////////////////////

                this._raycaster.setFromCamera( this._mouse, this._camera );

                let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
                let intersects = this._raycaster.intersectObjects( overlayMeshGroup.children, true );
                
                if ( intersects.length > 0 ) {
                    var overlayRect1 = intersects[0].object;
                    
                    if ( this._hoveredOverlayRect !== overlayRect1 ) {
                        this.dispatchEvent( { type: 'hoveron', object: overlayRect1 } );

                        this._domElement.style.cursor = 'pointer';
                        this._hoveredOverlayRect = overlayRect1;
                    }
                }
                else {

                    if ( this._hoveredOverlayRect !== null ) {

                        // No intersection with overlayRect is found, and the this._hoveredOverlayRect
                        // (from previous interaction) is not null. Set the pointer to "auto"
                        
                        this.dispatchEvent( { type: 'hoveroff', object: this._hoveredOverlayRect } );

                        this._domElement.style.cursor = 'auto';
                        this._hoveredOverlayRect = null;
                    }
                }
            }
        }

        // console.log('END handleMouseMove_orOneFingerTouchMove3');
    };
    
    validateIntersectionPoint = async function() {
        // console.log('BEG validateIntersectionPoint'); 

        let selectedLayer = COL.model.getSelectedLayer();
        if(!selectedLayer)
        {
            return;
        }        
        
        if( !selectedLayer.getEditOverlayRectFlag() )
        {
            // sanity check - should not get here
            throw new Error('handleMouseUp_orTouchUp3 called while not in editMode');
        }

        let scene3DtopDown = selectedLayer.getScene3DtopDown();
        let orbitControls = scene3DtopDown.getOrbitControls();
        let orbitControlsState = orbitControls.getState();
        // console.log('orbitControlsState', orbitControlsState);

        if( orbitControlsState == OrbitControls3Dpane.STATE.SELECT_OVERLAY_RECT ||
            orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT ||
            orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_MOVE_OVERLAY_RECT )
        {
            // console.log('foo111111111111111'); 
            // Find intersection with topDownMesh (floor)
            scene3DtopDown._raycaster3DtopDown.setFromCamera( scene3DtopDown._mouse3DtopDown, scene3DtopDown._camera3DtopDown );
            let floorPlanMesh = selectedLayer.getFloorPlanMeshObj();
            let intersectedStructureInfo_currentIntersection = scene3DtopDown.findIntersectionWithTopDownMesh(floorPlanMesh);

            
            let intersectedStructureInfo = scene3DtopDown.getIntersectionStructureInfo();

            let editedOverlayMeshObj = undefined;
            let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
            if( COL.util.isObjectValid(selectedOverlayRect) )
            {
                editedOverlayMeshObj = selectedOverlayRect.getMeshObject();
            }
            else
            {
                await scene3DtopDown.findIntersectionWithOverlayMeshGroup(selectedLayer);
                let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();
                editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);
            }

            // Find closest distance between floor intersection and overlayRects (circles)
            let topDownPosition = intersectedStructureInfo.currentIntersection.point;
            if(COL.util.isObjectInvalid(editedOverlayMeshObj))
            {
                //////////////////////////////////////////////////////////////////////////
                // clicked on a point that does not overlap any overlayRect
                // if the distance from other overlayRects is valid (i.e. not too close to
                // existing overlayRect, add a new overlayRect)
                //////////////////////////////////////////////////////////////////////////
                
                let selectedOverlayMeshObjName = undefined;
                let isValidIntersectionDistance = scene3DtopDown.isValidIntersectionDistanceToNearestOverlayRect(
                    selectedLayer, topDownPosition, selectedOverlayMeshObjName);

                // check if position is within boundaries of topDownPane
                let isPositionWithinBoundaries = scene3DtopDown.isPositionWithinTopDownPaneBoundaries(topDownPosition);
                
                if(isValidIntersectionDistance && isPositionWithinBoundaries)
                {
                    // The position is valid
                    // - clicked "far" enough from an existing overlayRect
                    // - the position is within boundaries of the topDown pane

                    // Add new overlayMesh
                    await scene3DtopDown.insertCircleMesh(topDownPosition);

                    // after adding the new overlayMesh, calling to findIntersections() again causes the
                    // new overlayMesh to be marked as the selectedOverlayRect
                    await scene3DtopDown.findIntersections();

                    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                    if( COL.util.isObjectValid(selectedOverlayRect) )
                    {
                        editedOverlayMeshObj = selectedOverlayRect.getMeshObject();
                    }
                }
                else
                {
                    // clicked near an existing overlayMesh
                    // console.log('Intersection distance to nearest overlayMesh is INVALID!!'); 
                }
            }
            
            if(COL.util.isObjectValid(editedOverlayMeshObj))
            {
                /////////////////////////////////////////
                // Validate the position. check that the:
                // - distance to existing overlayRects is valid
                // - position is within boundaries of the topDown pane
                /////////////////////////////////////////

                let intersectedStructureInfo = scene3DtopDown.getIntersectionStructureInfo();

                let isValidIntersectionDistance = scene3DtopDown.isValidIntersectionDistanceToNearestOverlayRect(
                    selectedLayer, editedOverlayMeshObj.position, editedOverlayMeshObj.name);
                
                // check if position is within boundaries of topDownPane
                let isPositionWithinBoundaries = scene3DtopDown.isPositionWithinTopDownPaneBoundaries(topDownPosition);

                if(!isValidIntersectionDistance || !isPositionWithinBoundaries)
                {
                    // console.log('The position is INVALID!!');
                    // The position is invalid
                    // revert the editedOverlayMeshObj to its original position
                    editedOverlayMeshObj.position.copy( this._editedOverlayMeshObjInitialPosition );
                }

                this.dispatchEvent( { type: 'dragend', object: editedOverlayMeshObj } );

                /////////////////////////////////////////
                // delete meshObjectPrev - if it has no images
                // this takes care of a use-case where the user:
                // - selects an overlayRect (overlayRect1), does not add any image, and
                // - selects another overlayRect (overlayRect2)
                // overlayRect1 will be removed
                /////////////////////////////////////////

                let selectedOverlayRectPrev = selectedLayer.getSelectedOverlayRectPrev();
                let meshObjectPrev = undefined;
                if( COL.util.isObjectValid(selectedOverlayRectPrev) )
                {
                    meshObjectPrev = selectedOverlayRectPrev.getMeshObject();
                }
                
                if(meshObjectPrev && (meshObjectPrev.name != editedOverlayMeshObj.name))
                {
                    if(selectedOverlayRectPrev.getImagesNames().size() == 0)
                    {
                        // remove meshObjectPrev from overlayMeshGroup - it has no images
                        selectedLayer.removeFromOverlayMeshGroup(meshObjectPrev);
                    }
                }
            }
            else
            {
                // editedOverlayMeshObj may be undefined if we did not click on a valid location in the first place
                // e.g. too close to an existing image dot
            }
        }
    };
            
    handleMouseUp_orTouchUp3 = async function() {
        // console.log('BEG handleMouseUp_orTouchUp3');
        
        await this.validateIntersectionPoint();
        
        this._domElement.style.cursor = this._hoveredOverlayRect ? 'pointer' : 'auto';
        Scene3DtopDown.render1();
    };

};

///////////////////////////////////
// BEG Static class variables
///////////////////////////////////

// Mouse buttons
EditOverlayRect_Scene3DtopDown_TrackballControls.mouseButtons = { LEFT: THREE_MOUSE.LEFT, MIDDLE: THREE_MOUSE.MIDDLE, RIGHT: THREE_MOUSE.RIGHT };

///////////////////////////////////
// END Static class variables
///////////////////////////////////


async function onMouseDown3( event ) {
    // console.log('BEG onMouseDown3');
    
    let selectedLayer = COL.model.getSelectedLayer();
    if(!selectedLayer)
    {
        // Layer is not yet defined
        return;
    }

    if( !selectedLayer.getEditOverlayRectFlag() )
    {
        // sanity check - should not get here
        throw new Error('onMouseDown3 called while not in editMode');
    }

    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;

    editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing = true;

    scene3DtopDown.setMouseCoords(event);

    // console.log('editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing', editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing); 
    let index0=0;
    while(editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing)
    {
        console.log('editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing', editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing); 
        await COL.util.sleep(100);
        index0 = index0+1;
        console.log('index0', index0); 

    }
    
    // the event listener for onMouseDown3 is added in onMouseUp3
    editOverlayRectControls._domElement.removeEventListener( 'mousedown', onMouseDown3, {capture: false, passive: false} );
    editOverlayRectControls._domElement.addEventListener( 'mousemove', onMouseMove3, {capture: false, passive: false} );
    editOverlayRectControls._domElement.addEventListener( 'mouseup',onMouseUp3, {capture: false, passive: false} );

    switch ( event.button ) {
        case EditOverlayRect_Scene3DtopDown_TrackballControls.mouseButtons.LEFT:
            let orbitControls = scene3DtopDown.getOrbitControls();

            await scene3DtopDown.findIntersections();
            let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();
            let editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);
            if( COL.util.isObjectValid(editedOverlayMeshObj) )
            {
                // found intersection with overlayRect - move_overlayRect
                orbitControls.setState( OrbitControls3Dpane.STATE.EDIT_MODE_MOVE_OVERLAY_RECT );
                await editOverlayRectControls.handleMouseDown_orOneFingerTouchStart3();
            }
            else
            {
                // No intersection with overlayRect:
                // - select new overlayRect (if mousemove/touchmove is NOT called before mouseup/touchend), or
                // - move_topDownPane (if mousemove/touchmove is called before mouseup/touchend)

                orbitControls.setState( OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT );
                await orbitControls.handleMouseDown0( event );
            }

            break;
    }

    editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing = false;
    
    // console.log('END onMouseDown3');
};

function onMouseMove3( event ) {
    // console.log('BEG onMouseMove3');

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;
    let orbitControls = scene3DtopDown.getOrbitControls();
    let orbitControlsState = orbitControls.getState();

    scene3DtopDown.setMouseCoords(event);

    if( orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_MOVE_OVERLAY_RECT )
    {
        // disable editOverlayRect_syncWithBackendBtn
        // (this button is enabled when finishing to edit the overlayRect, e.g. in onMouseUp3)
        let sceneBar = COL.model.getSceneBar();
        sceneBar.disable_editOverlayRect_syncWithBackendBtn(true);
        
        // found intersection with overlayRect - move_overlayRect
        editOverlayRectControls.handleMouseMove_orOneFingerTouchMove3();
    }
    else if( orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT ||
             orbitControlsState == OrbitControls3Dpane.STATE.DOLLY_PAN )
    {
        // no intersection with overlayRect - move_topDownPane
        if( orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT )
        {
            orbitControls.setState( OrbitControls3Dpane.STATE.DOLLY_PAN );
        }

        let point2d = new THREE_Vector2(event.clientX, event.clientY);
        orbitControls.panTopDownPane(point2d);
    }
    
    // console.log('END onMouseMove3');
};

async function onMouseUp3( event ) {
    // console.log('BEG onMouseUp3');

    // tbd - onMouseUp3 has preventDefault() but not onMouseUp1, onTouchEnd1, onTouchEnd3
    //  make similar pattern
    event.preventDefault();

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;
    let orbitControls = scene3DtopDown.getOrbitControls();

    editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing = true;

    // console.log('editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing', editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing); 
    let index0=0;
    while(editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing)
    {
        console.log('editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing', editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing); 
        await COL.util.sleep(100);
        index0 = index0+1;
        console.log('index0', index0); 

    }

    // the event listener for onMouseDown3 is removed at the beginning of onMouseDown3
    editOverlayRectControls._domElement.addEventListener( 'mousedown', onMouseDown3, {capture: false, passive: false} );
    editOverlayRectControls._domElement.removeEventListener( 'mousemove', onMouseMove3, {capture: false, passive: false} );
    editOverlayRectControls._domElement.removeEventListener( 'mouseup',onMouseUp3, {capture: false, passive: false} );
    
    await editOverlayRectControls.handleMouseUp_orTouchUp3();
    orbitControls.setState( OrbitControls3Dpane.STATE.NONE );
    
    editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing = false;

    // enable editOverlayRect_syncWithBackendBtn
    // (this button is disabled when editing the overlayRect, e.g. in onMouseMove3)
    let sceneBar = COL.model.getSceneBar();
    sceneBar.disable_editOverlayRect_syncWithBackendBtn(false);

    // console.log('END onMouseUp3');
};

function onMouseWheel3( event ) {
    // console.log('BEG onMouseWheel3'); 

    // event.preventDefault();
    
    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    orbitControls.handleMouseWheel0( event );
};

async function onTouchStart3( event ) {
    console.log('BEG onTouchStart3');

    event.preventDefault();
    
    let selectedLayer = COL.model.getSelectedLayer();
    if(!selectedLayer)
    {
        // Layer is not yet defined
        return;
    }

    if( !selectedLayer.getEditOverlayRectFlag() )
    {
        // sanity check - should not get here
        throw new Error('onTouchStart3 called while not in editMode');
    }

    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;
    let orbitControls = scene3DtopDown.getOrbitControls();
    let orbitControlsState = orbitControls.getState();

    editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing = true;

    scene3DtopDown.setMouseCoords(event.touches[0]);

    // console.log('editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing', editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing); 
    let index0=0;
    while(editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing)
    {
        console.log('editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing', editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing); 
        await COL.util.sleep(100);
        index0 = index0+1;
        console.log('index0', index0); 

    }

    // the event listener for onTouchStart3 is added in onTouchEnd3
    editOverlayRectControls._domElement.removeEventListener( 'touchstart', onTouchStart3, {capture: false, passive: false} );
    editOverlayRectControls._domElement.addEventListener( 'touchmove', onTouchMove3, {capture: false, passive: false} );
    editOverlayRectControls._domElement.addEventListener( 'touchend', onTouchEnd3, {capture: false, passive: false} );

    // Note that when doing 2-finger touch, the event.touches.length is 1
    // (maybe because of the sensitivity of the system)
    // but event.touches.length is 2 (e.g. in onTouchMove3) as soon as we start to move the 2-fingers
    switch ( event.touches.length ) {

        case 1:
            // one-finger touch
            await scene3DtopDown.findIntersections();
            let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();
            let editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);
            if( COL.util.isObjectValid(editedOverlayMeshObj) )
            {
                // found intersection with overlayRect - move_overlayRect
                orbitControls.setState( OrbitControls3Dpane.STATE.EDIT_MODE_MOVE_OVERLAY_RECT );
                await editOverlayRectControls.handleMouseDown_orOneFingerTouchStart3();
            }
            else
            {
                // No intersection with overlayRect:
                // - select new overlayRect (if mousemove/touchmove is NOT called before mouseup/touchend), or
                // - move_topDownPane (if mousemove/touchmove is called before mouseup/touchend)

                orbitControls.setState( OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT );

                let point2d = new THREE_Vector2(event.touches[0].pageX,
                                                event.touches[0].pageY);
                orbitControls.handleMouseDown_orTouchStart0( point2d );
            }
            
            break;

        case 2:
            // two-finger touch
            orbitControls.setState( OrbitControls3Dpane.STATE.DOLLY_PAN );

            // on 2-finger touch, we want to 
            // - disable overlayRect select, 
            // - disable creation of newOverlayRect
            // (when doing 2 finger touch, initially there is a 1-finger touch which causes to
            //  select an existing overlayRect or add a new overlayRect.
            // clearOverlayRectsWithoutImages() takes care to revert this)
            selectedLayer.clearOverlayRectsWithoutImages();
            
            let point2d = new THREE_Vector2(event.touches[0].pageX,
                                            event.touches[0].pageY);
            orbitControls.handleMouseDown_orTouchStart0( point2d );
            break;

            
        default:
            orbitControls.setState( OrbitControls3Dpane.STATE.NONE );
            break;
    }

    await editOverlayRectControls.validateIntersectionPoint();
    
    // if ( orbitControlsState !== OrbitControls3Dpane.STATE.NONE ) {
    editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing = false;

    // console.log('END onTouchStart3');
};

function onTouchMove3( event ) {
    // console.log('BEG onTouchMove3');
    
    // Prevent the default behaviour which causes the entire page to refresh the page, 
    // when touching, and dragging the finger down near the top of the page
    // (in such case, refresh symbol icon appears at the center-top of the page)
    event.preventDefault();

    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let orbitControls = scene3DtopDown.getOrbitControls();
    let orbitControlsState = orbitControls.getState();
    let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;

    if( !selectedLayer.getEditOverlayRectFlag() )
    {
        // sanity check - should not get here
        throw new Error('onTouchMove3 called while not in editMode');
    }

    if( orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_MOVE_OVERLAY_RECT )
    {
        // move_overlayRect
        switch ( event.touches.length ) {

            case 1: 
                // one-finger touch
                scene3DtopDown.setMouseCoords(event.touches[0]);
                
                editOverlayRectControls.handleMouseMove_orOneFingerTouchMove3();
                break;
            case 2: 
                // two-finger touch
                orbitControls.handleTouchMove0( event );
                break;

            default:
                orbitControls.setState( OrbitControls3Dpane.STATE.NONE );
        }
    }
    else if( orbitControlsState == OrbitControls3Dpane.STATE.EDIT_MODE_SELECT_OVERLAY_RECT ||
             orbitControlsState == OrbitControls3Dpane.STATE.DOLLY_PAN )
    {
        orbitControls.handleTouchMove0( event );
    }
};

async function onTouchEnd3( event ) {
    // console.log('BEG onTouchEnd3');
    
    let selectedLayer = COL.model.getSelectedLayer();
    let scene3DtopDown = selectedLayer.getScene3DtopDown();
    let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;
    let orbitControls = scene3DtopDown.getOrbitControls();

    editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing = true;

    // console.log('editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing', editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing); 
    let index0=0;
    while(editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing)
    {
        console.log('editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing', editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing); 
        await COL.util.sleep(100);
        index0 = index0+1;
        console.log('index0', index0); 

    }
    
    // the event listener for onTouchStart3 is removed at the beginning of onTouchStart3
    editOverlayRectControls._domElement.addEventListener( 'touchstart', onTouchStart3, {capture: false, passive: false} );

    // we need "passive: false" in order to call preventDefault(). Otherwise the default behaviour causes the entire page to refresh the page
    // (refresh symbol icon appears at the center-top of the page)
    editOverlayRectControls._domElement.removeEventListener( 'touchmove', onTouchMove3, {capture: false, passive: false} );
    
    // the event listener for onTouchEnd3 is added in onTouchStart3
    editOverlayRectControls._domElement.removeEventListener( 'touchend', onTouchEnd3, {capture: false, passive: false} );

    await editOverlayRectControls.handleMouseUp_orTouchUp3();
    orbitControls.setState( OrbitControls3Dpane.STATE.NONE );
    orbitControls.endTouchProcessing();

    editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing = false;

    // console.log('END onTouchEnd3');
};

export { EditOverlayRect_Scene3DtopDown_TrackballControls };
