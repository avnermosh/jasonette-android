/* eslint-disable new-cap */
/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================
'use strict';
import {
    Vector2 as THREE_Vector2,
    Vector3 as THREE_Vector3,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from './Model.js';
import { Layer } from './Layer.js';
import { IntersectionInfo } from '../util/IntersectionInfo.js';
import { OrbitControlsPlanView } from '../orbitControl/OrbitControlsPlanView.js';
import { OverlayRect } from './OverlayRect.js';
import { PlanView } from './PlanView.js';

async function onMouseDownOrTouchStart_planView(event) {
    // console.log('BEG onMouseDownOrTouchStart_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }

    event.preventDefault();

    let containerPlanView = document.getElementById('planView3dCanvasId');
    let planView = selectedLayer.getPlanView();

    if (COL.util.isTouchDevice()) {
        containerPlanView.removeEventListener('touchstart', onMouseDownOrTouchStart_planView, {
            capture: false,
            passive: false,
        });
    
        containerPlanView.addEventListener('touchmove', onMouseMoveOrTouchMove_planView, {
            capture: false,
            passive: false,
        });

        containerPlanView.addEventListener('touchend', onMouseUpOrTouchEnd_planView, {
            capture: false,
            passive: false,
        });
        planView.setMouseOrTouchCoords(event.touches[0]);
    }
    else{
        containerPlanView.removeEventListener('mousedown', onMouseDownOrTouchStart_planView, {
            capture: false,
            passive: false,
        });
    
        containerPlanView.addEventListener('mousemove', onMouseMoveOrTouchMove_planView, {
            capture: false,
            passive: false,
        });

        containerPlanView.addEventListener('mouseup', onMouseUpOrTouchEnd_planView, {
            capture: false,
            passive: false,
        });
        planView.setMouseOrTouchCoords(event);
    }

    await handleMouseDown_orOneFingerTouchStart_planView(event);
}

function onMouseMoveOrTouchMove_planView(event) {
    // console.log('BEG onMouseMoveOrTouchMove_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }

    let planView = selectedLayer.getPlanView();
    if (COL.util.isTouchDevice()) {
        // Prevent from applying the _default_, _generic_ browser scroll to the planViewPane
        // (in such case, refresh symbol icon appears at the center-top of the page)
        // Instead, the planViewPane is _panned_ with custom logic
        event.preventDefault();

        if(!selectedLayer.getEditOverlayRectFlag()) {
            planView.setMouseOrTouchCoords(event.touches[0]);
        
            switch (event.touches.length) {
                case 1:
                    // single-finger-pinch(zoom,dolly) touch
                    handleMouseMove_orOneFingerTouchMove_planView(event);
                    break;
        
                case 2:
                    // two-finger-pinch(zoom,dolly) touch
                    if (event.targetTouches.length == 2) {
                        handleTwoFingerTouchMove_planView(event);
                    }
                    break;
                default:
                {
                    throw new Error('The value of event.targetTouches.length is invalid: ' + event.targetTouches.length);
                }
            }
        }
        else{
            planView.setMouseOrTouchCoords(event.touches[0]);
            handleMouseMove_orOneFingerTouchMove_planView(event);    
        }
    }
    else{
        planView.setMouseOrTouchCoords(event);
        handleMouseMove_orOneFingerTouchMove_planView(event);
    }
}

async function onMouseUpOrTouchEnd_planView(event) {
    // console.log('BEG onMouseUpOrTouchEnd_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }

    if (COL.util.isTouchDevice()) {
        // console.log('event.touches.length3', event.touches.length);

        if(COL.util.isObjectInvalid(event) || event.touches.length == 0) {
            // the event is invalid, i.e. this function was called without an event, e.g. when clicking on the menu of planView,
            // to keep the correct state for addEventListener/removeEventListener, the function onMouseUpOrTouchEnd_planView()
            // is called without an event.

            let containerPlanView = document.getElementById('planView3dCanvasId');
            // the event listener for onMouseDownOrTouchStart_planView is removed at the beginning of onMouseDownOrTouchStart_planView
            containerPlanView.addEventListener('touchstart', onMouseDownOrTouchStart_planView, {
                capture: false,
                passive: false,
            });
        
            containerPlanView.removeEventListener('touchmove', onMouseMoveOrTouchMove_planView, {
                capture: false,
                passive: false,
            });
    
            containerPlanView.removeEventListener('touchend', onMouseUpOrTouchEnd_planView, {
                capture: false,
                passive: false,
            });
        
            await handleMouseUp_orTouchEnd_planView();
        }
        else{
            // there are more touch events.
            // For example, after removing one finger from 2-finger touch.
            // In such case keep responding to single-finger touchmove
        }
    }
    else{
        let containerPlanView = document.getElementById('planView3dCanvasId');
        containerPlanView.addEventListener('mousedown', onMouseDownOrTouchStart_planView, {
            capture: false,
            passive: false,
        });
    
        containerPlanView.removeEventListener('mousemove', onMouseMoveOrTouchMove_planView, {
            capture: false,
            passive: false,
        });
    
        containerPlanView.removeEventListener('mouseup', onMouseUpOrTouchEnd_planView, {
            capture: false,
            passive: false,
        });
    
        if (COL.util.isObjectValid(event)) {
            event.preventDefault();
        }
    
        await handleMouseUp_orTouchEnd_planView();
    }

    // console.log('orbitControlsState4:', orbitControls.getState());
}

function onMouseWheel_planView(event) {
    console.log('BEG onMouseWheel_planView');

    // event.preventDefault();

    let selectedLayer = COL.model.getSelectedLayer();
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();
    handleMouseWheel_planView(event);
}

function onKeyDown_planView(event) {
    console.log('BEG onKeyDown_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    if(selectedLayer.getEditOverlayRectFlag()) {
        handleMouseWheel_planView(event);
    }
}


function onKeyUp_planView(event) {
    // console.log('BEG onKeyUp_planView');
}

// /////////////////////////////////
// BEG Touch related functions
// /////////////////////////////////

// // touch event for when clicking on the planViewPane border
// // example on how to differentiate in handling of event based on which element the event originated from.
// // commenting the event listener for now, because I also added "touch-action: none;" in #planPaneWrapperId, and .planViewPaneClass"
// // if the problem of double-touching the border resizes the entire window, happens again (on iOS devices, e.g. iPad)
// // use this function with event.preventDefault()

// function onTouchStart_planPaneWrapper( event ) {
//     console.log('Beg onTouchStart_planPaneWrapper');

//     if(event.currentTarget == event.target)
//     {
//         console.log('The user clicked on the planPaneWrapperId');
//     }
//     else
//     {
//         console.log('the user clicked on an element that is different than planPaneWrapperId, e.g. on the canvas');
//     }
//     // prevent the default behaviour to fix the problem of resizing the entire window when double-touching the planViewPane border.
//     event.preventDefault();
// };


// /////////////////////////////////
// END Touch related functions
// /////////////////////////////////

// /////////////////////////////////
// BEG mouse/touch shared functions
// /////////////////////////////////

async function handleMouseDown_orOneFingerTouchStart_planView(event) {
    // console.log('BEG handleMouseDown_orOneFingerTouchStart_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    // take time - this will impact the behavior (e.g. if in moveMode) depending on the duration of the click
    planView.mouseDown_time = Date.now();

    let intersectedOverlayMeshObject = await planView.findIntersectionWithOverlayMeshGroup(selectedLayer);
    await selectedLayer.setSelectedOverlayRect(intersectedOverlayMeshObject);
    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();

    let orbitControlsState = orbitControls.getState();

    // TBD - possible future option - add delayedMenu for context-menu, also when clicking in dead area 
    // (i.e. not on overlayRect), for planView related operations, e.g.
    // taking a snapshot of the Scene3D pane. Possible future feature

    if (COL.util.isObjectValid(selectedOverlayRect)) {
        if(selectedOverlayRect.getState()== OverlayRect.STATE.MOVE_OVERLAY_RECT) {
            orbitControls.setState(OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT);
        }
        else {
            // we clicked an overlayRect. Show the context-menu (on delay)
            planView.delayedMenuPlanView(event);
        }
    }

    let point2d = COL.util.getPointFromEvent(event);
    // console.log('event.type', event.type);
    if (((event instanceof MouseEvent) && (event.button == OrbitControlsPlanView.mouseButtons.LEFT)) || 
         event instanceof TouchEvent)  {
        // mouseCoords and screenCoordNormalized are the same thing
        // they refer to the location inside the window-screen (not the entire GUI window)
        orbitControls.panPointStart.set(point2d.x, point2d.y);
        orbitControls.panPointEnd.copy(orbitControls.panPointStart);
        orbitControls.panPointCurrent.copy(orbitControls.panPointStart);
    }

    // console.log('orbitControlsState1:', orbitControls.getState());    

    switch(orbitControlsState) {
        case OrbitControlsPlanView.STATE.NONE: 
            if (COL.util.isObjectValid(intersectedOverlayMeshObject)) {
                orbitControls.setState(OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT);
            }
            break;

        case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT:
        case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
            // render the plan to show the overlayRects that are selected for merge
            PlanView.Render();
            break;

        case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT:
        case OrbitControlsPlanView.STATE.DOLLY_PAN:
        case OrbitControlsPlanView.STATE.DOLLY_ZOOM:
            orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
            break;

        case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT:
        case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
            if (((event instanceof MouseEvent) && (event.button == OrbitControlsPlanView.mouseButtons.LEFT)) || 
                    event instanceof TouchEvent)  {
                await planView.findIntersections();
    
                let intersectedOverlayRectInfo = planView.getIntersectionOverlayRectInfo();
                let editedOverlayMeshObj = COL.util.getNestedObject(intersectedOverlayRectInfo,['currentIntersection', 'object']);

                if (COL.util.isObjectValid(editedOverlayMeshObj)) {
                    // found intersection with overlayRect - move_overlayRect
                    await handleMouseDown_orOneFingerTouchStart0_planViewInEditMode();
                }
            }
            break;

        case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
            if(planView.isMenuVisible) {
                planView.clearMenuPlanView();
            }
            orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
            break;

        default:
            let msgStr = 'orbitControls state is not supported: ' + orbitControls.getState();
            throw new Error(msgStr);
    }
}


async function handleMouseDown_orOneFingerTouchStart0_planViewInEditMode() {
    console.log('BEG handleMouseDown_orOneFingerTouchStart0_planViewInEditMode');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
    // Layer is not yet defined
        return;
    }

    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    if (!selectedLayer.getEditOverlayRectFlag()) {
        // sanity check
        throw new Error('Should not reach here. handleMouseDown_orOneFingerTouchStart0_planViewInEditModeplanVieweInEditMode should only be called in editMode');
    }
    // findIntersections on mouse down prevents from side effects
    // e.g. the following useCase:
    // - in edit mode
    // - having intersection from previous mousedown interaction
    // - clicking in non overlayRect area
    // - without the call to findIntersections the previously selected overlay rect will be moved
    // - with the call to findIntersections, intersects with the non overlayRect area, and clears the intersection info ->
    //   which results in nothing gets moved - good!
    await planView.findIntersections();
    let intersectedStructureInfo = planView.getIntersectionStructureInfo();
    let intersectedOverlayRectInfo = planView.getIntersectionOverlayRectInfo();
    orbitControls._selectedStructureObj = COL.util.getNestedObject( intersectedStructureInfo, ['currentIntersection', 'object']);
    // the following 2 objects are different -
    // - selectedLayer.getSelectedOverlayRect(), - this is the selected overlayRect
    // - COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']) -
    //     this is the intersection with overlayRect, which may be undefined if clicking on a place in the plan where there is no overlayRect
    let editedOverlayMeshObj = COL.util.getNestedObject( intersectedOverlayRectInfo, ['currentIntersection', 'object'] );
    if (COL.util.isObjectValid(orbitControls._selectedStructureObj)) {
        if (COL.util.isObjectValid(editedOverlayMeshObj)) {
            orbitControls._intersection = COL.util.getNestedObject( intersectedStructureInfo, ['currentIntersection'] );
            orbitControls._selectedStructureObj = orbitControls._intersection.object;
            orbitControls._editedOverlayMeshObjInitialPosition.copy( editedOverlayMeshObj.position );
            orbitControls.domElement.style.cursor = 'move';
        }
    }
}

async function handleMouseUp_orTouchEnd_planView() {
    // console.log('BEG handleMouseUp_orTouchEnd_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    let orbitControlsState = orbitControls.getState();
    // console.log('orbitControlsState3:', orbitControls.getState());    

    // clear the timeout for the context-menu
    // (mouseup cancels the delayed timer, to prevent the menu from being displayed if mousedown was not pressed long enough)
    window.clearTimeout(planView.timeoutID);
    if(orbitControlsState !== OrbitControlsPlanView.STATE.CONTEXT_MENU) {
        if(planView.isMenuVisible) {
            // for each of the options in the context-menu, we make sure to close the context-menu
            planView.clearMenuPlanView();
        }
    }

    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
    switch(orbitControlsState) {
        case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT:

            if (COL.util.isObjectValid(selectedOverlayRect) &&
                (selectedOverlayRect.getState() == OverlayRect.STATE.MOVED_OVERLAY_RECT)) {
                // the overlayRect moved, so regardless of the click duration keep the move mode.
                orbitControls.setState(OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT);
                // and set the the edit mode to STATE.MOVE_OVERLAY_RECT (to be ready for the next mouseDown event)
                selectedOverlayRect.setState(OverlayRect.STATE.MOVE_OVERLAY_RECT);
            }
            else{
                const mouseDown_toMouseUp_duration = Date.now() - planView.mouseDown_time;
                if(mouseDown_toMouseUp_duration <  planView.mouseDown_toMouseUp_durationThresh) {
                    // the overlayRect is in moveMode, did not actually move, and the click duration was short
                    // cancel the state EDIT_MODE_MOVE_OVERLAY_RECT
                    orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
                }
            }
            await orbitControls.validateOverlayRect();

            // mark as not-synced after moving an overlayRect. 
            selectedLayer.setSyncWithWebServerStatus(false);

            // sync to the webserver after moving an overlayRect. 
            let syncStatus = await selectedLayer.syncBlobsWithWebServer();
            if(!syncStatus) {
                throw new Error('Error from _syncWithBackendBtn from within handleMouseUp_orTouchEnd_planView');
            }

            break;

        case OrbitControlsPlanView.STATE.DOLLY_ZOOM: 
            orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
            break;

        case OrbitControlsPlanView.STATE.DOLLY_PAN: 
            let panPointDelta = new THREE_Vector2();
            panPointDelta.subVectors ( orbitControls.panPointEnd, orbitControls.panPointStart );
            let panPointDeltaThresh = 10;
            // console.log('panPointDelta.length()', panPointDelta.length());

            if(panPointDelta.length() <= panPointDeltaThresh){
                // the distance from panPointStart to panPointEnd is less than panPointDeltaThresh
                // if intersecting with overlayRect, show the selected overlayRect 
                if (COL.util.isObjectValid(selectedOverlayRect)) {
                    await selectedLayer.showSelectedOverlayRect();
                }
            }

            orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
            break;

        case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT: 
            if (COL.util.isObjectValid(selectedOverlayRect)) {
                await selectedLayer.showSelectedOverlayRect();
            }
            orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
            break;

        case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
            if (COL.util.isObjectValid(selectedOverlayRect)) {
                await selectedLayer.showSelectedOverlayRect();
            }
            await orbitControls.validateOverlayRect();
            break;

        case OrbitControlsPlanView.STATE.NONE: 
        case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
        case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT:
            break;

        case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
            orbitControls.setState(OrbitControlsPlanView.STATE.NONE);
            break;

        default:
            let msgStr = 'orbitControls state is not supported: ' + orbitControls.getState();
            throw new Error(msgStr);
    }
}



function handleMouseMove_orOneFingerTouchMove_planView(event) {
    // console.log('BEG handleMouseMove_orOneFingerTouchMove_planView');
    let selectedLayer = COL.model.getSelectedLayer();
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();
    let orbitControlsState = orbitControls.getState();
    // console.log('orbitControlsState5:', orbitControls.getState());    

    switch(orbitControlsState) {
        case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT:
            let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();

            if (COL.util.isObjectValid(selectedOverlayRect) && 
            (selectedOverlayRect.getState() == OverlayRect.STATE.MOVE_OVERLAY_RECT ||
             selectedOverlayRect.getState() == OverlayRect.STATE.MOVED_OVERLAY_RECT) ) {
            // The user is in move mode, and the selectedOverlayRect actually moved (we are in onMouseMove)
            // Set the editMode to STATE.MOVED_OVERLAY_RECT

                selectedOverlayRect.setState(OverlayRect.STATE.MOVED_OVERLAY_RECT);
        
                // found intersection with overlayRect - move_overlayRect
                handleMouseMove_orOneFingerTouchMove0_planViewInEditMode();
            }
            break;

        case OrbitControlsPlanView.STATE.DOLLY_PAN: 
        {
            let point2d = COL.util.getPointFromEvent(event);
            panPlanPane(point2d);
            break;
        }

        case OrbitControlsPlanView.STATE.NONE: 
        case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
        case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT: 
        {
            // BEG check if moved-enough
            let panPointDelta = new THREE_Vector2();
            let point2d = COL.util.getPointFromEvent(event);
            panPointDelta.subVectors ( point2d, orbitControls.panPointStart );
            let panPointDeltaThresh = 10;
            if(panPointDelta.length() > panPointDeltaThresh){
                // the distance from panPointStart to point2d is bigger than panPointDeltaThresh - consider as moved.
                if(orbitControlsState == OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT) {
                    // clear the timeout for the context-menu
                    // (mouseup cancels the delayed timer, to prevent the menu from being displayed if mousedown was not pressed long enough)
                    console.log('planView.timeoutID2', planView.timeoutID);
                    window.clearTimeout(planView.timeoutID);
                }
    
                // even if there was intersection with overlayRect - change the state to DOLLY_PAN
                orbitControls.setState(OrbitControlsPlanView.STATE.DOLLY_PAN);
                panPlanPane(point2d);
            }
            // END check if moved-enough

            break;
        }

        case OrbitControlsPlanView.STATE.DOLLY_ZOOM:
        case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
        case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT:
        case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
            break;

        default:
            let msgStr = 'orbitControls state is not supported: ' + orbitControls.getState();
            throw new Error(msgStr);
    }
}


async function handleMouseMove_orOneFingerTouchMove0_planViewInEditMode() {
    console.log('BEG handleMouseMove_orOneFingerTouchMove0_planViewInEditMode');
    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
    // Layer is not yet defined
        return;
    }
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    orbitControls._mouse = planView.getMouseCoords();
    orbitControls.camera = planView.getCameraPlanView();

    orbitControls._raycaster.setFromCamera(orbitControls._mouse, orbitControls.camera);

    let intersectedOverlayRectInfo = planView.getIntersectionOverlayRectInfo();
    let editedOverlayMeshObj = COL.util.getNestedObject( intersectedOverlayRectInfo, ['currentIntersection', 'object'] );
    if (COL.util.isObjectValid(orbitControls._selectedStructureObj)) {
        if (COL.util.isObjectValid(editedOverlayMeshObj)) {
            // ///////////////////////////////////////////////////////
            // An overlayRect is selected
            // intersect with the selected structure (which must be selected)
            // and use the new intersection point for translation
            // of the overlayRect
            // ///////////////////////////////////////////////////////

            var intersects2 = orbitControls._raycaster.intersectObjects([orbitControls._selectedStructureObj]);
                
            if (intersects2.length > 0) {
                orbitControls._intersection = intersects2[0];
                orbitControls.translateOverlayRect2();
            }
            orbitControls.dispatchEvent({ type: 'drag', object: editedOverlayMeshObj });
            PlanView.Render();
        }
        else {
            // ///////////////////////////////////////////////////////
            // An overlayRect is NOT selected
            // intersect with the list of overlayRects
            // if intersection is found - change the icon to ???
            //
            // 'pointer' == icon in the shape of "arrow"
            // 'auto' == icon in the shape of "hand feast"
            // 'drag' == icon in the shape of "???"
            // ///////////////////////////////////////////////////////

            orbitControls._raycaster.setFromCamera(orbitControls._mouse, orbitControls.camera);

            let overlayMeshGroup = selectedLayer.getOverlayMeshGroup();
            let intersects = orbitControls._raycaster.intersectObjects(overlayMeshGroup.children,true);

            if (intersects.length > 0) {
                var overlayRect1 = intersects[0].object;

                if (orbitControls._hoveredOverlayRect !== overlayRect1) {
                    orbitControls.dispatchEvent({ type: 'hoveron', object: overlayRect1 });

                    orbitControls.domElement.style.cursor = 'pointer';
                    orbitControls._hoveredOverlayRect = overlayRect1;
                }
            }
            else {
                if (orbitControls._hoveredOverlayRect !== null) {
                    // No intersection with overlayRect is found, and the orbitControls._hoveredOverlayRect
                    // (from previous interaction) is not null. Set the pointer to "auto"

                    orbitControls.dispatchEvent({
                        type: 'hoveroff',
                        object: orbitControls._hoveredOverlayRect,
                    });

                    orbitControls.domElement.style.cursor = 'auto';
                    orbitControls._hoveredOverlayRect = null;
                }
            }
        }
    }
}

function panPlanPane(point2d_inScreenCoord) {
    // console.log('BEG panPlanPane');
    let selectedLayer = COL.model.getSelectedLayer();
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    orbitControls.panPointEnd.set(point2d_inScreenCoord.x, point2d_inScreenCoord.y);
    // pan the planPane
    orbitControls.pan_usingScreenCoords(orbitControls.panPointCurrent, orbitControls.panPointEnd);
    // update panPointCurrent for the future
    orbitControls.panPointCurrent.copy(orbitControls.panPointEnd);
    orbitControls.update();
}

function handleTwoFingerTouchMove_planView(event) {
    // console.log( 'BEG handleTwoFingerTouchMove_planView' );

    let selectedLayer = COL.model.getSelectedLayer();
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();
    // console.log('orbitControlsState7:', orbitControls.getState());    

    {
        // on 2-finger touch, we want to
        // - disable overlayRect select,
        // - disable creation of newOverlayRect
        // (when doing 2 finger touch, initially there is a 1-finger touch which causes to
        //  select an existing overlayRect or add a new overlayRect.
        // clearOverlayRectsWithoutImages() takes care to revert orbitControls)
        selectedLayer.clearOverlayRectsWithoutImages();

        // Enable "two-finger-pinch(zoom,dolly) touch" only if both touches are in the same DOM element.
        let dx = Math.abs(event.touches[0].pageX - event.touches[1].pageX);
        let dy = Math.abs(event.touches[0].pageY - event.touches[1].pageY);
        let deltaPoint2d = new THREE_Vector2(dx, dy);

        let centerPointX = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        let centerPointY = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        let centerPoint2d_inScreenCoord_end = new THREE_Vector2(centerPointX, centerPointY);

        orbitControls.centerPoint2d_inNDC_end = planView.screenPointCoordToNormalizedCoord(centerPoint2d_inScreenCoord_end);

        let centerPoint3d_inWorldCoord_end = COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(orbitControls.camera, 
            orbitControls.centerPoint2d_inNDC_end);

        orbitControls.deltaPoint2d_inScreenCoord_end = new THREE_Vector2(deltaPoint2d.x,deltaPoint2d.y);

        switch(orbitControls.getState()) {
            case OrbitControlsPlanView.STATE.DOLLY_ZOOM: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_START_OVERLAY_RECT:
            case OrbitControlsPlanView.STATE.EDIT_MODE_MERGE_END_OVERLAY_RECT:
                break;

            case OrbitControlsPlanView.STATE.DOLLY_PAN: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_MOVE_OVERLAY_RECT:
            case OrbitControlsPlanView.STATE.NONE: 
            case OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.SELECT_OVERLAY_RECT: 
            case OrbitControlsPlanView.STATE.CONTEXT_MENU: 
                {
                    orbitControls.setState(OrbitControlsPlanView.STATE.DOLLY_ZOOM);
                    
                    // ////////////////////////////////////////////////////////
                    // First time in 2-finger touch move.
                    // Prepare for panning the centerPoint, after the scale,
                    // such that the object pointed at, appears between the 2 fingers
                    // - set centerPoint2d_inNDC_start to centerPoint2d_inNDC_end
                    // - set deltaPoint2d_inScreenCoord_start to deltaPoint2d_inScreenCoord_end
                    // ////////////////////////////////////////////////////////
        
                    orbitControls.centerPoint2d_inNDC_start.copy(orbitControls.centerPoint2d_inNDC_end);
                    orbitControls.deltaPoint2d_inScreenCoord_start.copy(
                        orbitControls.deltaPoint2d_inScreenCoord_end
                    );
        
            
                    // console.log('PlanView.doDrawTwoFingerTouchCenterPoint', PlanView.doDrawTwoFingerTouchCenterPoint);
                    if (PlanView.doDrawTwoFingerTouchCenterPoint) {
                    // highlight the centerPoint between the two-finger touch
                        planView._centerPoint_twoFingerTouch.position.copy(
                            centerPoint3d_inWorldCoord_end
                        );
                        planView._centerPoint_twoFingerTouch.position.setY(COL.y0);
                    }
                }
                break;
    
            default:
                let msgStr = 'orbitControls state is not supported: ' + orbitControls.getState();
                throw new Error(msgStr);
        }
    }

    // ////////////////////////////////////////////////////////
    // Apply zoom
    // ////////////////////////////////////////////////////////

    let lengthDollyStart = orbitControls.deltaPoint2d_inScreenCoord_start.length();
    let lengthDollyEnd = orbitControls.deltaPoint2d_inScreenCoord_end.length();

    let factor = lengthDollyEnd / lengthDollyStart;
    // console.log('orbitControls.getZoom()2', orbitControls.getZoom());
    let zoomNew = orbitControls.getZoom() * factor;
    orbitControls.setZoom(zoomNew);
    // console.log('orbitControls.getZoom()3', orbitControls.getZoom());

    orbitControls.deltaPoint2d_inScreenCoord_start.copy(
        orbitControls.deltaPoint2d_inScreenCoord_end
    );

    // ////////////////////////////////////////////////////////////////////////////////////
    // Apply pan (after zoom, and/or moving the 2 fingers)
    // such that the object between the two-finger touch appears between the 2 fingers (after pinching and after moving the 2-fingers)
    // - calc the delta in worldCoord, between the object pointed at, before and after the zoom.
    //   and pan the camera so that the object pointed at, appears between the two-fingers
    // ////////////////////////////////////////////////////////////////////////////////////
    let centerPoint3d_inWorldCoord_start =
      COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(
          orbitControls.camera,
          orbitControls.centerPoint2d_inNDC_start
      );
    let centerPoint3d_inWorldCoord_end =
      COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord(
          orbitControls.camera,
          orbitControls.centerPoint2d_inNDC_end
      );
    let delta_inWorldCoords = new THREE_Vector3(
        centerPoint3d_inWorldCoord_end.x - centerPoint3d_inWorldCoord_start.x,
        centerPoint3d_inWorldCoord_end.y - centerPoint3d_inWorldCoord_start.y,
        centerPoint3d_inWorldCoord_end.z - centerPoint3d_inWorldCoord_start.z
    );
    orbitControls.centerPoint2d_inNDC_start.copy(orbitControls.centerPoint2d_inNDC_end);
    orbitControls.pan_usingWorldCoords(delta_inWorldCoords);
    
    orbitControls.update();
}

function handleMouseWheel_planView(event) {
    console.log('BEG handleMouseWheel_planView');

    let selectedLayer = COL.model.getSelectedLayer();
    let planView = selectedLayer.getPlanView();
    let orbitControls = planView.getOrbitControls();

    if (orbitControls.state !== OrbitControlsPlanView.STATE.NONE) {
        return;
    }
    if (event.deltaY < 0) {
        orbitControls.dollyInOut(orbitControls.getZoomScale(), true);
    }
    else if (event.deltaY > 0) {
        orbitControls.dollyInOut(orbitControls.getZoomScale(), false);
    }
    orbitControls.update();
}

// /////////////////////////////////
// END mouse/touch shared functions
// /////////////////////////////////


export { onMouseDownOrTouchStart_planView, onMouseWheel_planView, onMouseUpOrTouchEnd_planView,
    onKeyDown_planView, onKeyUp_planView };