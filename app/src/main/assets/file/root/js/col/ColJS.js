/* eslint-disable new-cap */
/* eslint-disable no-inner-declarations */
/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  './COL.js';
import { PlanInfo } from './util/PlanInfo.js';
import { Model } from './core/Model.js';
import { Layer } from './core/Layer.js';
import { PlanView } from './core/PlanView.js';
import './loaders/CO_ObjectLoader.js';

class ColJS {
    constructor(){
        // console.log('BEG ColJS::constructor');
        if (typeof this === 'undefined') {
            console.error('COL module needed.');
        }
    }

    setupFloorplanButtonGroup(floorplanButtonGroupEl) {
        
        let floorplanButtonGroupJqueryElement = $('#floorplanButtonGroupId');
        floorplanButtonGroupJqueryElement.append(this.previousImageButton.$);
        floorplanButtonGroupJqueryElement.append(this.playImagesInSelectedOverlayRectButton.$);
        floorplanButtonGroupJqueryElement.append(this.nextImageButton.$);
        floorplanButtonGroupJqueryElement.append(this.imageIndexInOverlayRectLabel.$);
        if(COL.doEnableWhiteboard) {
            floorplanButtonGroupJqueryElement.append(this._floorPlanWhiteboardMenu);
        }
        floorplanButtonGroupJqueryElement.append(this.onOffModeButton.$);

   
        if (COL.util.isTouchDevice()) {
        // tbd - remove the function onClick_floorplanButtonGroupEl
        // floorplanButtonGroupEl.addEventListener( 'click', onClick_floorplanButtonGroupEl, {capture: false, passive: false} );
            floorplanButtonGroupEl.addEventListener( 'touchstart', onTouchstart_floorplanButtonGroupEl, {capture: false, passive: false} );
            floorplanButtonGroupEl.addEventListener( 'touchmove', onTouchmove_floorplanButtonGroupEl, {capture: false, passive: false} );

            // added catch-all 'click', at element main-container-id to prevent an iOS side-effect of scaling-the-page when double-touching
            // function onClick_floorplanButtonGroupEl(event) {
            //     console.log('BEG onClick_floorplanButtonGroupEl111111111111111');

            //     // // prevent from trickling the event, when touching, which causes, in iOS to zoom the entire page
            //     // event.preventDefault();
            // }
        
            function onTouchstart_floorplanButtonGroupEl(event) {
                console.log('BEG ------------------ onTouchstart_floorplanButtonGroupEl');

            // // prevent from trickling the event, when touching and dragging, which causes a side effect of refreshing the page
            // event.preventDefault();
            }

            function onTouchmove_floorplanButtonGroupEl(event) {
                console.log('BEG onTouchmove_floorplanButtonGroupEl');

                // prevent from trickling the event, when touching and dragging, which causes a side effect of refreshing the page
                event.preventDefault();
            }
        }

        let divImageInfoEl = '<div id="divImageInfoId"><button id="buttonImageInfoId">Image Info</button></div>';
        floorplanButtonGroupJqueryElement.append(divImageInfoEl);

        // where the imageInfo is displayed
        this.imageInfoElement = $('<span id="imageInfoElementId"></span>');
        this.isButtonImageInfoOn = false;
        this.imageInfoElement.appendTo('#divImageInfoId');

        // http://jsfiddle.net/avnerm/wrf51ugd/19/
        $('#buttonImageInfoId').popover({
            placement: 'left',
            html: true,
            title: 'Image Info',
            content: 'NA',
            container: 'body',
            toggle: 'popover'
        });

        this.buttonImageInfo = document.getElementById('buttonImageInfoId');

        this.buttonImageInfo.addEventListener( 'click', onClick_imageInfoBtn, {capture: false, passive: false} );
        this.buttonImageInfo.addEventListener( 'mousedown', onMouseDown_imageInfoBtn, {capture: false, passive: false} );
        this.buttonImageInfo.addEventListener( 'touchstart', onTouchStart_imageInfoBtn, {capture: false, passive: false} );

    }

    async setupToolsPaneGui(floorplanButtonGroupEl) {
        if(COL.isOldGUIEnabled) {
            var _$border = $('<div id="col-tools-pane-border"></div>');

            _$border.css({
                width: '100%',
                background: 'none',
                verticalAlign: 'middle'
            });

            let iconDir = 'V1/img/icons/IcoMoon-Free-master/PNG/48px';

            let iconPath;
        
            this.imageIndexInOverlayRectLabel = new COL.component.Label({
                id: 'imageIndexInOverlayRectLabelId',
                label: 'Label0'
            });
            let imageIndexInOverlayRectLabel = $(this.imageIndexInOverlayRectLabel.$);
            imageIndexInOverlayRectLabel.addClass('ui-button');

            // --------------------------------------------------------------

            iconPath = iconDir + '/0313-arrow-left.png';
            this.previousImageButton = new COL.component.Button({
                id: 'previousImageBtn',
                tooltip: 'Previous image',
                icon: iconPath,
            });
            $(this.previousImageButton.$).addClass('ui-button');

            // --------------------------------------------------------------
        
            iconPath = iconDir + '/0019-play.png';
            this.playImagesInSelectedOverlayRectButton = new COL.component.ToggleButton({
                id: 'playImagesInSelectedOverlayRectBtnId',
                tooltip: 'Play images in overlayRect',
                icon: iconPath,
                on: false
            });

            let jqueryObj = $(this.playImagesInSelectedOverlayRectButton.$);
            jqueryObj.addClass('ui-button');

            // --------------------------------------------------------------

            iconPath = iconDir + '/0309-arrow-right.png';
            this.nextImageButton = new COL.component.Button({
                id: 'nextImageBtn',
                tooltip: 'Next image',
                icon: iconPath,
            });
            $(this.nextImageButton.$).addClass('ui-button');

            // --------------------------------------------------------------

            // playImagesInSelectedOverlayRect -> onOffMode
        
            iconPath = iconDir + '/0183-switch.png';
            this.onOffModeButton = new COL.component.ToggleButton({
                id: 'onOffModeBtnId',
                tooltip: 'Offline / Online mode',
                icon: iconPath,
                on: false
            });

            let onOffModeButton_jqueryObj = $(this.onOffModeButton.$);
            onOffModeButton_jqueryObj.addClass('ui-button');

            // --------------------------------------------------------------

            this.onOffModeButton.onClick(async function() {
                console.log('BEG onOffModeButton.onClick');

                try {
                    let isOnMode = COL.colJS.onOffModeButton.isOn();
                    console.log('isOnMode', isOnMode);

                    if(isOnMode) {
                        console.log('Directing11111111111111111111111111 to https://192.168.1.75'); 
                        window.location.href = 'https://192.168.1.80/index';
                    }
                    else {
                    // offline mode
                    // /home/avner/avner/softwarelib/jasonette/jasonette-android-branch-advance-webview
                    // ~/avner/softwarelib/jasonette/jasonette-android-branch-advance-webview/app/src/main/assets/file/hello.json
                        console.log('Directing222222222222222222222222222222 to file://root/html/raw/index.html'); 
                        window.location.href = 'file://root/html/raw/index.html';
                    }
                
                }
                catch(err) {
                    console.error('err', err);
                    console.error('Error in onOffModeButton()');
                }


            
                // let selectedLayer = COL.model.getSelectedLayer();
                // try {
                //     // disable the button (successive clicks, before the first click is processed
                //     // cause, e.g. to attach wrong image to imagesInfo, which results in skipping images)
                //     let playImagesState = COL.colJS.onOffModeButton.isOn() ? Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_SELECTED_OVERLAY_RECT : Layer.PLAY_IMAGES_STATE.NONE
                //     selectedLayer.setPlayImagesState(playImagesState);
                //     console.log('playImagesState0', playImagesState); 
                //     await selectedLayer.onOffMode();
                // }
                // catch(err) {
                //     console.error('err', err);
                //     console.error('Failed to play the images in the overlayRect');
                // }

                // // reset the play button 
                // selectedLayer.setPlayImagesState(Layer.PLAY_IMAGES_STATE.NONE);
                // // change the state of COL.colJS.onOffModeButton without
                // // trigerring a call to onOffModeButton.onClick
                // let event = undefined;
                // COL.colJS.onOffModeButton.toggle(null, event);
            
            // // update the buttons: previousImageButton, nextImageButton, play Buttons to their default state
            // // (e.g. enable if selectedOverlayRect is defined and has more than 1 image)
            // selectedLayer.updatePreviousPlayNextImageButtons();
            });

            this.previousImageButton.onClick(async function() {
            // console.log('BEG previousImageButton.onClick');
            
                try {
                // disable the button (successive clicks, before the first click is processed
                // cause, e.g. to attach wrong image to imagesInfo, which results in skipping images)
                    COL.colJS.previousImageButton.disabled(true);
                    let selectedLayer = COL.model.getSelectedLayer();
                    let doLoadNextImage = false;
                    await selectedLayer.loadNextOrPreviousImage(doLoadNextImage);
                }
                catch(err) {
                    console.error('err', err);
                    console.error('Failed to load the previous image');
                }

                // enable the button
                COL.colJS.previousImageButton.disabled(false);
            });

            this.playImagesInSelectedOverlayRectButton.onClick(async function() {
            // console.log('BEG playImagesInSelectedOverlayRectButton.onClick');
            
                let selectedLayer = COL.model.getSelectedLayer();
                try {
                // disable the button (successive clicks, before the first click is processed
                // cause, e.g. to attach wrong image to imagesInfo, which results in skipping images)
                    let playImagesState = COL.colJS.playImagesInSelectedOverlayRectButton.isOn() ? Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_SELECTED_OVERLAY_RECT : Layer.PLAY_IMAGES_STATE.NONE;
                    selectedLayer.setPlayImagesState(playImagesState);
                    console.log('playImagesState0', playImagesState); 
                    await selectedLayer.playImagesInSelectedOverlayRect();
                }
                catch(err) {
                    console.error('err', err);
                    console.error('Failed to play the images in the overlayRect');
                }

                // reset the play button 
                selectedLayer.setPlayImagesState(Layer.PLAY_IMAGES_STATE.NONE);
                // change the state of COL.colJS.playImagesInSelectedOverlayRectButton without
                // trigerring a call to playImagesInSelectedOverlayRectButton.onClick
                let event = undefined;
                COL.colJS.playImagesInSelectedOverlayRectButton.toggle(null, event);
            
                // update the buttons: previousImageButton, nextImageButton, play Buttons to their default state
                // (e.g. enable if selectedOverlayRect is defined and has more than 1 image)
                selectedLayer.updatePreviousPlayNextImageButtons();
            });
        
            this.nextImageButton.onClick(async function() {
                try {
                // disable the button (successive clicks, before the first click is processed
                // cause, e.g. to attach wrong image to imagesInfo, which results in skipping images)
                    COL.colJS.nextImageButton.disabled(true);
                    let selectedLayer = COL.model.getSelectedLayer();
                    let doLoadNextImage = true;
                    await selectedLayer.loadNextOrPreviousImage(doLoadNextImage);
                }
                catch(err) {
                    console.error('err', err);
                    console.error('Failed to load the next image');
                }

                // enable the button
                COL.colJS.nextImageButton.disabled(false);
            });
        }
    }

    setupPlanPaneGui() {
        this._planPaneWrapper = $('#planPaneWrapperId');
        this._planViewPane = $('#planViewPaneId');

        if(COL.doEnableWhiteboard) {
            this._floorPlanWhiteboard1 = $('<div id="floorPlanWhiteboardId" class="floorPlanWhiteboardClass"></div>');
            
            let floorPlanWhiteboardMenuHtml = `
<span id="floorPlanWhiteboardMenuWrapperId" class="floorPlanWhiteboardMenuWrapperClass">
  WhiteboardTool
  <select id="whiteboardToolId">
    <option value="brush">Brush</option>
    <option value="eraser">Eraser</option>
  </select>
</span>
`;
            
            // console.log('floorPlanWhiteboardMenuHtml', floorPlanWhiteboardMenuHtml); 

            this._floorPlanWhiteboardMenu = $(floorPlanWhiteboardMenuHtml);
            console.log('this._floorPlanWhiteboardMenu', this._floorPlanWhiteboardMenu); 
        }
        
    }

  
    async initColJS() {
        // console.log('BEG ColJS::initColJS');

        // integrateGuiMockup - the floorplanButtonGroupEl cannot serve as indication for 
        this.setupPlanPaneGui();

        if(COL.isOldGUIEnabled) {
            // set the top row of buttons
            await this.setupToolsPaneGui(floorplanButtonGroupEl);
        }

        if(COL.doEnableWhiteboard) {
            this._planPaneWrapper.append(this._floorPlanWhiteboard1);
        }

        if(COL.isOldGUIEnabled) {
            this.setupFloorplanButtonGroup();
        }
    
        // document.addEventListener("click", onClick_inPage);
    
        this._planPaneWrapper.appendTo('#main-container-id');
    
        let doSaveUsingGoogleDrive = true;
        doSaveUsingGoogleDrive = false;
        if(doSaveUsingGoogleDrive) {
            this.addGoogleDriveButtons();
        }
            
        this._planViewPane.addClass('planViewPaneClass');
        
        COL.model = new Model();
        await COL.model.initModel();

        let hamburgerBtnEl = document.getElementById('hamburgerBtnId');
        console.log('hamburgerBtnEl: ', hamburgerBtnEl);
        await COL.manageGUI.setPane(hamburgerBtnEl);
        COL.manageGUI.showHideProjectMenu(false);

        // // BEG prevent an iOS side-effect of scaling-the-page when double-touching
        // {
        //     // add catch-all 'click' eventListener, at the top-element main-container-id
        //     // to prevent an iOS side-effect of scaling-the-page when double-touching
        //     // tbd - leave these functions until problem of "iOS side-effect of scaling-the-page when double-touching" is resolved
        //     //   see section: "Fix - double-touch in iOS on floorPlanToggleButton, causes the page to scale up" in emacs notes.
        //     let grid_container1El = document.getElementById('main-container-id');

        //     grid_container1El.addEventListener( 'touchstart', onTouchStart_grid_container1El, {capture: false, passive: false} );
        //     grid_container1El.addEventListener( 'touchend', onTouchEnd_grid_container1El, {capture: false, passive: false} );
        //     grid_container1El.addEventListener( 'click', onClick_grid_container1El, {capture: false, passive: false} );

        //     var numTouchStart = 0;
        //     var doubleTouchStartTimestamp = 0;
        
        //     function onTouchStart_grid_container1El(event) {
        //         console.log('BEG onTouchStart_grid_container1El');
        //         numTouchStart++;
            
        //         var now1 = +(new Date());

        //         // console.log('--------- numTouchStart', numTouchStart); 
        //         // console.log('now1', now1);
        //         let delta1 = 500;
        //         let doubleTouchStartTimestamp_Upperlimit = doubleTouchStartTimestamp + delta1;
        //         // console.log('doubleTouchStartTimestamp_Upperlimit', doubleTouchStartTimestamp_Upperlimit);
        //         // console.log('doubleTouchStartTimestamp1', doubleTouchStartTimestamp);

        //         if (doubleTouchStartTimestamp_Upperlimit > now1){
        //             event.preventDefault();
        //             event.stopPropagation();
        //             console.log('double touchstart detected'); 
        //         }
        //         else {
        //             console.log('double touchstart NOT detected'); 
        //         }
            
        //         doubleTouchStartTimestamp = now1;
        //         // console.log('doubleTouchStartTimestamp2', doubleTouchStartTimestamp); 

        //     }

        //     var numTouchEnd = 0;
        //     var doubleTouchEndTimestamp = 0;

        //     function onTouchEnd_grid_container1El(event) {
        //         console.log('BEG onTouchEnd_grid_container1El');
        //         numTouchEnd++;
            
        //         var now3 = +(new Date());

        //         // console.log('--------- numTouchEnd', numTouchEnd); 
        //         // console.log('now3', now3);

        //         // let delta1 = 1000;
        //         let delta1 = 500;
        //         let doubleTouchEndTimestamp_Upperlimit = doubleTouchEndTimestamp + delta1;
        //         // console.log('doubleTouchEndTimestamp_Upperlimit', doubleTouchEndTimestamp_Upperlimit);
        //         // console.log('doubleTouchEndTimestamp1', doubleTouchEndTimestamp);

        //         // event.preventDefault();
        //         // return $('#main-container-id').trigger('click');
            
        //         if (doubleTouchEndTimestamp_Upperlimit > now3){
        //             event.preventDefault();
        //             event.stopPropagation();
        //         // console.log('double touchend detected'); 
        //         }
        //         else {
        //         // console.log('double touchend NOT detected'); 
        //         }
            
        //         doubleTouchEndTimestamp = now3;
        //     // console.log('doubleTouchEndTimestamp2', doubleTouchEndTimestamp); 
        //     }

        //     var numClick = 0;
        //     var doubleClickTimestamp = 0;
        //     function onClick_grid_container1El(event) {
        //         console.log('BEG onClick_grid_container1El');

        //         numClick++;
        //         var now2 = +(new Date());

        //         // console.log('--------------- numClick', numClick); 

        //         let delta2 = 1000;
        //         let doubleClickTimestamp_Upperlimit = doubleClickTimestamp + delta2;
        //         if (doubleClickTimestamp_Upperlimit > now2){
        //             event.preventDefault();
        //         // event.stopPropagation();
        //         // console.log('double click detected'); 
        //         }
        //         else {
        //         // console.log('double click NOT detected'); 
        //         }
        //         doubleClickTimestamp = now2;
        //         // console.log('doubleClickTimestamp2', doubleClickTimestamp); 

        //     // console.log('END onClick_grid_container1El');
        //     }
        // }
        // // END prevent an iOS side-effect of scaling-the-page when double-touching
    }

    setInternetConnectionStatus(isInternetConnected) {
        console.log('BEG setInternetConnectionStatus');

        $('#internetConnectionStatusId').removeClass('internet-connection-unknown');
        if(isInternetConnected) {
            $('#internetConnectionStatusId').removeClass('internet-disconnected');
            $('#internetConnectionStatusIconId').removeClass('bi-wifi-off');

            $('#internetConnectionStatusId').addClass('internet-connected');
            $('#internetConnectionStatusIconId').addClass('bi-wifi');            
        }
        else{
            $('#internetConnectionStatusId').removeClass('internet-connected');
            $('#internetConnectionStatusIconId').removeClass('bi-wifi');

            $('#internetConnectionStatusId').addClass('internet-disconnected');
            $('#internetConnectionStatusIconId').addClass('bi-wifi-off');            
        }
        COL.doWorkOnline = isInternetConnected;
    }

    async loadLayer(sitePlanName=undefined, zipFileName=undefined) {
        let layer = undefined;
        let planInfo = new PlanInfo({});
        try {

            // Clear all the toasts
            toastr.clear();
            
            // with the newGUI "planName === layerName"
            // e.g. 44_decourcy_drive_pilot_bay_gabriola_island__44_decourcy_drive_pilot_bay_gabriola_island.structure.layer0
            // because it is created with CreateLayerName like so: let layerName = planInfo.siteName + '__' + planInfo.name;
            // 
            // break sitePlanName to: siteName and planName to be compatible with the old GUI
            //
            // 44_decourcy_drive_pilot_bay_gabriola_island__44_decourcy_drive_pilot_bay_gabriola_island.structure.layer0
            // ->
            // 44_decourcy_drive_pilot_bay_gabriola_island
            // 44_decourcy_drive_pilot_bay_gabriola_island.structure.layer0

            const myArray = sitePlanName.split('__');
            let siteName = myArray[0];
            let planName = myArray[1];

            // Get the "text" of the select
            let titleStr = 'Site Plan Name: ' + planName;
            $('#dropdown_site_plan_name').html(titleStr);

            if(COL.util.isObjectInvalid(planName)) {
                await COL.model.setSelectedLayer(undefined);
                return;
            }
            // Get the the option "value"
            // let matchPattern1 = 'site_name.*' + siteName + '.*name.*' + planName;
            
            // e.g. "name.*geographic_map.structure.layer0"
            let matchPattern1 = 'name.*' + planName;

            let matchPattern2;
            if(COL.util.isObjectValid(zipFileName)) {
                // e.g. "geographic_map.zip"
                matchPattern2 = zipFileName;
            }
            else{
                matchPattern2 = 'from_webserver';
            }

            let optionIndex = COL.util.FindPlanInSiteplanMenu(matchPattern1, matchPattern2);

            let option = $('#sitesId')[0][optionIndex];
            // console.log('option.value', option.value);                 
            let planInfoStr = option.value;

            if(!COL.util.IsValidJsonString(planInfoStr)) {
                throw new Error('planInfoStr json string is invalid');
            }
            
            // ///////////////////////////////
            // Get planInfo from the "value" of the select
            // ///////////////////////////////
            
            let planInfoDict = JSON.parse(planInfoStr);
            planInfo = new PlanInfo({id: planInfoDict.id,
                name: planInfoDict.name,
                url: planInfoDict.url,
                planFilename: planInfoDict.plan_filename,
                siteId: planInfoDict.site_id,
                siteName: planInfoDict.site_name,
                files: planInfoDict.files,
                zipFileName: planInfoDict.zipFileName});

            // console.log('planInfoDict', planInfoDict);
            
            let loggedInFlag = COL.model.getLoggedInFlag();
            // console.log('loggedInFlag', loggedInFlag);

            if( COL.util.isObjectInvalid(planInfo.zipFileName) &&
               (loggedInFlag || (planInfo.siteName == 'demo_site')) ) {
                // ///////////////////////////////
                // user is logged-in (i.e. current_user.is_authenticated === true), or
                // user is logged-off and site is demo_site
                // planInfo is not from zip (i.e. from webserver)
                // Get planInfo from webServer
                // ///////////////////////////////
                // console.log('Get planInfo from webServer');
                
                let layerName = Layer.CreateLayerName(planInfo.siteName, planInfo.name);
                layer = COL.model.getLayerByName(layerName);

                if(COL.util.isObjectInvalid(layer)) {
                    // the layer is not yet in memory
                    layer = await COL.model.loadLayerFromWebServer(planInfo);
                }
            }
            else {
                // ///////////////////////////////
                // user is logged-in - planInfo is from zip
                // or
                // user is logged-off - planInfo is from zip (i.e. not demo_plan)
                //   (demo_plan the only plan that logged-off user can load from the web server)
                // ///////////////////////////////
                
                // Update the selectedZipFileInfo
                let zipFilesInfo = COL.model.getZipFilesInfo();
                let zipFileInfo = zipFilesInfo.getByKey(planInfo.zipFileName);
                COL.model.setSelectedZipFileInfo(zipFileInfo);
                
                layer = COL.model.getLayerFromLayersList(planInfo);
                if(COL.util.isObjectInvalid(layer)) {
                    // sanity check
                    throw new Error('layer is invalid');
                }
            }
            return layer;
        }
        catch(err) {
            console.error('err', err);
            console.error('Failed to load the plan file: ', planInfo.planFilename);

            // remove the canvas from planView
            let layer = COL.model.getLayerByName(planInfo.planFilename);
            
            if(COL.util.isObjectInvalid(layer)) {
                console.log('layer is invalid');
            }

            // raise a toast to indicate the failure
            let toastTitleStr = 'Change site';
            let msgStr = 'Failed.';
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);

            // rethrow
            throw new Error('Failed to loadObjectAndMaterialFiles fromWebServerObjFile2');
        }
    }

    addGoogleDriveButtons() {
        let overlayRectPaneWrapperEl = $('#overlayRectPaneWrapperId');

        let html1 = '<button id="google-drive-sign-in-or-out-button" style="margin-left: 25px">Sign In/Authorize</button>';
        overlayRectPaneWrapperEl.append(html1);

        let html2 = '<button id="google-drive-revoke-access-button" style="display: none; margin-left: 25px">Revoke access</button>';
        overlayRectPaneWrapperEl.append(html2);
        
        let html3 = '<div id="google-drive-auth-status" style="display: inline; padding-left: 25px"></div><hr>';
        overlayRectPaneWrapperEl.append(html3);

        let html4 = '<div id="dropboxAuthlink"></div>';
        overlayRectPaneWrapperEl.append(html4);
    }

    getImageIndexInOverlayRectLabel() {
        return this.imageIndexInOverlayRectLabel;
    }

    displayImageTextInfo(textInfoStr) {
        // console.log('BEG displayImageTextInfo'); 
        
        // show/hide imageTextInfo according to the state of imageInfoBtn

        // Set the popover body text (by setting element.innerText, element.innerHTML is set)
        let imageInfoElement = document.getElementById('imageInfoElementId');
        imageInfoElement.innerText = textInfoStr;
        
        // console.log('imageInfoElement.innerHTML', imageInfoElement.innerHTML);

        $('#buttonImageInfoId').popover('dispose');

        $('#buttonImageInfoId').popover({
            placement: 'left',
            html: true,
            title: 'Image Info',
            content: imageInfoElement.innerHTML,
            container: 'body',
            toggle: 'popover'
        });

        if(this.isButtonImageInfoOn) {
            $('#buttonImageInfoId').popover('show');

        }
        else {
            $('#buttonImageInfoId').popover('hide');
        }
    }

    // Set the selected plan for the user, so when the user revisits the site, he will be shown his last selected plan
    async set_selected_plan_id(planId) {
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/set_selected_plan/' + planId;

        let headersData = {
            'X-CSRF-Token': COL.model.csrf_token,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };

        let fetchData = { 
            method: 'PUT',
            headers: headersData
        };

        // https://localhost/api/v1_2/set_selected_plan/111
        // console.log('queryUrl', queryUrl); 
        let response = await fetch(queryUrl, fetchData);
        await COL.errorHandlingUtil.handleErrors(response);
        let dataAsJson = await response.json();
        return dataAsJson;
    }

}


$(window).ready(function () {
});

// --------------------------------------------------------------

$(window).on('load', function () {
    // console.log('BEG onWindow.load');

    // window.addEventListener('mousedown', onMouseDown5, {capture: false, passive: false});
    // window.addEventListener('mousemove', onMouseMove5, {capture: false, passive: false});
    // window.addEventListener('mouseup', onMouseUp5, {capture: false, passive: false});

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    // 'wheel' deprecates 'mousewheel'
    // window.addEventListener('wheel', onWheel5, {capture: false, passive: false});
    
    // window.addEventListener('touchstart', onTouchStart5, {capture: false, passive: false});
    // window.addEventListener('touchmove', onTouchMove5, {capture: false, passive: false});
    // window.addEventListener('touchend', onTouchEnd5, {capture: false, passive: false});

    // // https://developer.mozilla.org/en-US/docs/Web/Events
    // //
    // // window.addEventListener('click', onClick5, {capture: false, passive: false});
    // // window.addEventListener('dblclick', onDblClick5, {capture: false, passive: false});
    // // window.addEventListener('touchcancel', onTouchCancel5, {capture: false, passive: false});
    // window.addEventListener('fullscreenchange', onFullScreenChange5, {capture: false, passive: false});
    // window.addEventListener('fullscreenerror', onFullScreenError5, {capture: false, passive: false});
    // window.addEventListener('resize', onResize5, {capture: false, passive: false});

    // https:// stackoverflow.com/questions/71140193/binding-touch-and-scroll-to-wheel-event
    // window.addEventListener('scroll', onScroll5, {capture: false, passive: false});

});

// function onMouseDown5( event ) {
//     console.log('BEG onMouseDown5');
//     // event.preventDefault();
// }

// function onMouseMove5( event ) {
//     console.log('BEG onMouseMove5');
//     // event.preventDefault();
// }

// onMouseUp5 (and onTouchEnd5) are needed to
// - intercept click, wouch in the windows
// - apply preventDefault() - otherwise on iPad the window sometimes responds with "zoom-in" effect

// function onMouseUp5( event ) {
//     console.log('BEG onMouseUp5');
//     // event.preventDefault();
// }


// https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
// 'wheel' deprecates 'mousewheel'
function onWheel5( event ) {
    console.log('BEG onWheel5');
    // event.preventDefault();
}

function onTouchStart5( event ) {
    console.log('BEG onTouchStart5');
    // event.preventDefault();
}

function onTouchMove5( event ) {
    console.log('BEG onTouchMove555');
    // event.preventDefault();
}

// // --------------------------------------------------------------


// // onTouchEnd5 is problematic

// // onTouchEnd5 is needed in 2 contradicting configurations:
// // configuration1: preventDefault() prevents double clicking in iPad which sometimes causes the window to resize
// //
// // configuration2: preventDefault() causes problems (e.g. on Pixel3, iPad)
// // - clicking on edit button is not intercepted

// function onTouchEnd5( event ) {
//     console.log('BEG onTouchEnd55555555');
//     // event.preventDefault();
// };


// function onClick5( event ) {
//     console.log('BEG onClick5');
//     event.preventDefault();
// };

// function onDblClick5( event ) {
//     console.log('BEG onDblClick5');
//     event.preventDefault();
// };

// function onTouchCancel5( event ) {
//     console.log('BEG onTouchCancel5');
//     event.preventDefault();
// };

// function onFullScreenChange5( event ) {
//     console.log('BEG onFullScreenChange5');
//     event.preventDefault();
// };

// function onFullScreenError5( event ) {
//     console.log('BEG onFullScreenError5');
//     event.preventDefault();
// };

// function onResize5( event ) {
//     console.log('BEG onResize5');
//     event.preventDefault();
// };

function onScroll5( event ) {
    console.log('BEG onScroll5');
    // event.preventDefault();
    // event.stopPropagation();
}


$(window).resize(function (event) {
    console.log('BEG ColJS resize'); 
});


// --------------------------------------------------------------

// displaying the image info
async function onClick_imageInfoBtn(event) {
    // console.log('BEG onClick_imageInfoBtn'); 

    // "this" points to the button object
    let colJS = COL.colJS;
    colJS.isButtonImageInfoOn = !colJS.isButtonImageInfoOn;

    // update the image info that is displayed when toggling the "Info" button
    let selectedLayer = COL.model.getSelectedLayer();
    let textInfoStr = selectedLayer.getSelectedImageTextInfo();
    colJS.displayImageTextInfo(textInfoStr);
    
    // if(colJS.isButtonImageInfoOn){
    //     console.log('Image Info button is ON');
    // }
    // else {
    //     console.log('Image Info button is OFF');
    // }

    // console.log('END onClick_imageInfoBtn'); 
}

function onMouseDown_imageInfoBtn(event) {
    // console.log('BEG onMouseDown_imageInfoBtn'); 
}

function onTouchStart_imageInfoBtn(event) {
    console.log('BEG onTouchStart_imageInfoBtn'); 

    // prevent dragging the page via click and drag of the imageInfoBtn
    event.preventDefault();
    onClick_imageInfoBtn(event);
}

// Print the mouse coordinates in the page
function onClick_inPage(event) {
    console.log('BEG onClick_inPage'); 

    console.log('event.clientX', event.clientX); 
    console.log('event.clientY', event.clientY); 
}

export { ColJS };

// $(function(){
//     $('#testButton').on('click', function() {
//         toastr.error("Body message2",
//                      "Title",
//                      COL.errorHandlingUtil.toastrSettings);
//     });
// });
