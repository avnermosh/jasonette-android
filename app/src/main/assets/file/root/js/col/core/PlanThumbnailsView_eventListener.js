/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================
'use strict';

import {
    Vector2 as THREE_Vector2,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from './Model.js';

var lastPoint = undefined;
var firstPoint = undefined;
var deltaPoint = undefined;
var scrollTop = undefined;

async function onMouseDown_planThumbnailsPane(event) {
    console.log('BEG onMouseDown_planThumbnailsPane');

    let planThumbnailEl = document.getElementById('planThumbnailsPaneId');
    
    planThumbnailEl.removeEventListener('mousedown', onMouseDown_planThumbnailsPane, {
        capture: false,
        passive: false,
    });
    
    planThumbnailEl.addEventListener('mousemove', onMouseMove_planThumbnailsPane, {
        capture: false,
        passive: false,
    });
    
    planThumbnailEl.addEventListener('mouseup', onMouseUp_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    await handleMouseDown_orOneFingerTouchStart_planThumbnail(event);
}

async function handleMouseDown_orOneFingerTouchStart_planThumbnail(event) {
    console.log('BEG handleMouseDown_orOneFingerTouchStart_planThumbnail');

    if (COL.util.isTouchDevice()) {
        firstPoint = event.changedTouches[0];
    }
    else{
        firstPoint = event;
    }
    console.log('firstPoint', firstPoint);
    lastPoint = firstPoint;

    let layerName = event.target.id;
    if( COL.util.isObjectValid(layerName) ) {
        await COL.model.selectLayerByName(layerName);
    }
}

async function onMouseUp_planThumbnailsPane(event) {
    // console.log('BEG onMouseUp_planThumbnailsPane');

    let planThumbnailEl = document.getElementById('planThumbnailsPaneId');
    
    planThumbnailEl.addEventListener('mousedown', onMouseDown_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    planThumbnailEl.removeEventListener('mousemove', onMouseMove_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    planThumbnailEl.removeEventListener('mouseup', onMouseUp_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    await handleMouseUp_orOneFingerTouchEnd_planThumbnail(event);
}

function onKeyDown_planThumbnailsPane(event) {
    console.log('BEG onKeyDown_planThumbnailsPane');
}

function onKeyUp_planThumbnailsPane(event) {
    console.log('BEG onKeyUp_planThumbnailsPane');
}

async function onTouchStart_planThumbnailsPane(event) {
    console.log('Beg onTouchStart_planThumbnailsPane');

    let planThumbnailEl = document.getElementById('planThumbnailsPaneId');
    
    planThumbnailEl.removeEventListener('touchstart', onTouchStart_planThumbnailsPane, {
        capture: false,
        passive: false,
    });
    
    planThumbnailEl.addEventListener('touchmove', onTouchMove_planThumbnailsPane, {
        capture: false,
        passive: false,
    });
    
    planThumbnailEl.addEventListener('touchend', onTouchEnd_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    // event.preventDefault();

    await handleMouseDown_orOneFingerTouchStart_planThumbnail(event);
}

async function onScroll_planThumbnailsPane( event ) {
    console.log('BEG onScroll_planThumbnailsPane');

    console.log('this1', this);
    // let el1 = this;
    let el1 = document.getElementById('planThumbnailsPaneId');
    console.log('el1', el1);
    console.log('el1.scrollTop', el1.scrollTop);
    // let planThumbnailsPaneScrollPosition = { 
    //     scrollTop: el1.scrollTop,
    //     scrollLeft: el1.scrollLeft
    // };
    // COL.model.setPlanThumbnailsPaneScrollPosition(planThumbnailsPaneScrollPosition);

    // await handleMouseUp_orOneFingerTouchEnd_planThumbnail(event);

}

async function onMouseWheel_planThumbnailsPane(event) {
    console.log('BEG onMouseWheel_planThumbnailsPane');

    let el1 = document.getElementById('planThumbnailsPaneId');
    console.log('el1', el1);
    console.log('el1.scrollTop', el1.scrollTop);
    let planThumbnailsPaneScrollPosition = { 
        scrollTop: el1.scrollTop,
        scrollLeft: el1.scrollLeft
    };
    COL.model.setPlanThumbnailsPaneScrollPosition(planThumbnailsPaneScrollPosition);

    // await handleMouseUp_orOneFingerTouchEnd_planThumbnail(event);
}

function onMouseMove_planThumbnailsPane(event) {
    console.log('BEG onMouseMove_planThumbnailsPane');

    console.log('event.clientY', event.clientY);
    lastPoint = event;
}

function onTouchMove_planThumbnailsPane(event) {
    console.log('BEG onTouchMove_planThumbnailsPane');

    // Prevent from applying the _default_, _generic_ browser scroll to the planViewPane
    // (in such case, refresh symbol icon appears at the center-top of the page)
    // Instead, the planViewPane is _panned_ with custom logic
    // event.preventDefault();

    let currentPoint = event.changedTouches[0];
        
    // console.log('event.target.scrollTop', event.target.scrollTop);
    // if (lastPoint) {
    //     event.target.scrollTop += currentPoint.clientY - lastPoint.clientY;
    // }
    console.log('currentPoint.clientY', currentPoint.clientY);
    lastPoint = currentPoint;
    // console.log('lastPoint', lastPoint);
    // let el1 = document.getElementById('planThumbnailsPaneId');
    // console.log('el1', el1);
    // console.log('el1.scrollTop', el1.scrollTop);

}

async function handleMouseUp_orOneFingerTouchEnd_planThumbnail(event) {
    console.log('BEG handleMouseUp_orOneFingerTouchEnd_planThumbnail');

    // let deltaPointX = lastPoint.clientX - firstPoint.clientX;
    let deltaPointY = Math.abs(lastPoint.clientY - firstPoint.clientY);
    // console.log('deltaPointX', deltaPointX);
    console.log('deltaPointY', deltaPointY);
    // event.target.scrollTop += currentPoint.clientY - lastPoint.clientY;


    let deltaPointY_thresh = 10;
    if(deltaPointY < deltaPointY_thresh) {
        // consider as not scrolled
        // Show the selected plan
        let layerName = event.target.id;
        let layer = COL.model.getLayerByName(layerName);
        await COL.model.setSelectedLayer(layer);
        await COL.manageGUI.setPane(event.target);
    }
    else{
        let el1 = document.getElementById('planThumbnailsPaneId');
        // console.log('el1', el1);
        console.log('el1.scrollTop', el1.scrollTop);
    
        let planThumbnailsPaneScrollPosition = { 
            scrollTop: el1.scrollTop,
            scrollLeft: el1.scrollLeft
        };
        console.log('planThumbnailsPaneScrollPosition', planThumbnailsPaneScrollPosition);
    
        COL.model.setPlanThumbnailsPaneScrollPosition(planThumbnailsPaneScrollPosition);
    
        let planThumbnailsPaneScrollPosition2 = COL.model.getPlanThumbnailsPaneScrollPosition();
        console.log('planThumbnailsPaneScrollPosition2', planThumbnailsPaneScrollPosition2);
    }

}

async function onTouchEnd_planThumbnailsPane(event) {
    console.log('BEG onTouchEnd_planThumbnailsPane');

    let planThumbnailEl = document.getElementById('planThumbnailsPaneId');
    
    planThumbnailEl.addEventListener('touchstart', onTouchStart_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    planThumbnailEl.removeEventListener('touchmove', onTouchMove_planThumbnailsPane, {
        capture: false,
        passive: false,
    });
    
    planThumbnailEl.removeEventListener('touchend', onTouchEnd_planThumbnailsPane, {
        capture: false,
        passive: false,
    });

    await handleMouseUp_orOneFingerTouchEnd_planThumbnail(event);
}

export { onScroll_planThumbnailsPane, onMouseDown_planThumbnailsPane, onMouseWheel_planThumbnailsPane, 
    onKeyDown_planThumbnailsPane, onKeyUp_planThumbnailsPane, 
    onTouchStart_planThumbnailsPane };    