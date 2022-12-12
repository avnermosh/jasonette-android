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

async function onClick_planThumbnail(event) {
    console.log('BEG onClick_planThumbnail');
    // let iter = COL.model._layers.iterator();
    // while (iter.hasNext()) {
    //     let keyVal = iter.nextKeyVal();
    //     let layerKey = keyVal[0];
    //     let layerVal = keyVal[1];

    //     console.log('layerKey', layerKey); 
    //     console.log('layerVal', layerVal);
    // }

    
    // plan thumbnail was clicked. Update the selected plan
    let layerName = this.id;
    await COL.colJS.onSitesChanged(layerName);
    await COL.manageGUI.setPane(this);
}    

function onScroll_planThumbnailsPane( event ) {
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
}

var lastTouch = undefined;

function onTouchMove_planThumbnailsPane(event) {
    console.log('BEG onTouchMove_planThumbnailsPane');

    // Prevent from applying the _default_, _generic_ browser scroll to the planViewPane
    // (in such case, refresh symbol icon appears at the center-top of the page)
    // Instead, the planViewPane is _panned_ with custom logic
    // event.preventDefault();

    var currentTouch = event.changedTouches[0];
        
    if (lastTouch) {
        target.scrollTop += currentTouch.clientY - lastTouch.clientY;
    }
        
    lastTouch = currentTouch;
      
}


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

    COL.model.delayedMenuThumbnailPlan(event);
    // let layerName = this.id;
    // 44_decourcy_drive_pilot_bay_gabriola_island__44_decourcy_drive_pilot_bay_gabriola_island
    let layerName = event.target.id;
    await COL.model.selectLayerByName(layerName);
}

function onMouseMove_planThumbnailsPane(event) {
    console.log('BEG onMouseMove_planThumbnailsPane');

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
}

function onMouseWheel_planThumbnailsPane(event) {
    console.log('BEG onMouseWheel_planThumbnailsPane');
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

    event.preventDefault();

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
}

export { onScroll_planThumbnailsPane, onMouseDown_planThumbnailsPane, onMouseWheel_planThumbnailsPane, 
    onKeyDown_planThumbnailsPane, onKeyUp_planThumbnailsPane, 
    onTouchStart_planThumbnailsPane, onTouchMove_planThumbnailsPane, onClick_planThumbnail };