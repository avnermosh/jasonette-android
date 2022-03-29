// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  "./COL.js";
import { ApiService } from "./core/ApiService.js";
import { PlanInfo } from "./util/PlanInfo.js";
import { Model } from "./core/Model.js";
import { Layer } from "./core/Layer.js";
import { Scene3DtopDown } from "./core/Scene3DtopDown.js";
import "./loaders/CO_ObjectLoader.js";

class ColJS {
    constructor(){
        // console.log('BEG ColJS::constructor');
        
        // $('#divSitePlanMenuId').click()
        
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event
        // The change event is fired for <select> element when an alteration to the element's value is committed by the user


        // on change in #sitesId, trigger the function "onSitesChanged"
        $('#sitesId').on('change', this.onSitesChanged);
        
        // if (typeof component === 'undefined') {
        //     console.error("COL.gui.component module needed.");
        // }

        if (typeof this === 'undefined') {
            console.error("COL module needed.");
        }

        this.oldPlanInfoStr = '';
    };

    setupTexturePaneGui = function () {
        this._$texturePaneWrapper = $('<div id="texturePaneWrapperId"></div>');
        // tbd RemoveME - no such class "texturePaneWrapper"??
        this._$texturePaneWrapper.addClass("texturePaneWrapper");

        this.texCanvasWrapper = $('<div id="texCanvasWrapperId"></div>');
        // tbd RemoveME - no such class "texCanvasWrapper" (id but not class ?) ??
        this.texCanvasWrapper.addClass("texCanvasWrapper");

        const canvas1 = document.createElement('canvas');
        canvas1.setAttribute("id", "canvas1");
        const context = canvas1.getContext( '2d' );
        this._$texturePaneWrapper.append(canvas1);
    };

    setupToolsPaneGui = async function (floorplanButtonGroupEl) {
        var _$border = $('<div id="col-tools-pane-border"></div>');

        _$border.css({
            width: "100%",
            background: "none",
            verticalAlign: "middle"
        });

        let iconDir = "V1/img/icons/IcoMoon-Free-master/PNG/48px";

        let iconPath = iconDir + "/0182-power.png";
        console.log('iconPath', iconPath); 
        this.floorPlanToggleButton = new COL.component.ToggleButton({
            id: "floorPlanToggleButtonId",
            tooltip: "Master button",
            icon: iconPath,
            on: true
        });
        $(this.floorPlanToggleButton.$).addClass("ui-button");
        
        this.imageIndexInOverlayRectLabel = new COL.component.Label({
            id: "imageIndexInOverlayRectLabelId",
            label: "Label0"
        });
        let imageIndexInOverlayRectLabel = $(this.imageIndexInOverlayRectLabel.$);
        imageIndexInOverlayRectLabel.addClass("ui-button");

        // --------------------------------------------------------------

        iconPath = iconDir + "/0313-arrow-left.png";
        this.previousImageButton = new COL.component.Button({
            id: "previousImageBtn",
            tooltip: "Previous image",
            icon: iconPath,
        });
        $(this.previousImageButton.$).addClass("ui-button");

        // --------------------------------------------------------------
        
        iconPath = iconDir + "/0019-play.png";
        this.playImagesInSelectedOverlayRectButton = new COL.component.ToggleButton({
            id: "playImagesInSelectedOverlayRectBtnId",
            tooltip: "Play images in overlayRect",
            icon: iconPath,
            on: false
        });

        let jqueryObj = $(this.playImagesInSelectedOverlayRectButton.$);
        jqueryObj.addClass("ui-button");

        // --------------------------------------------------------------

        iconPath = iconDir + "/0309-arrow-right.png";
        this.nextImageButton = new COL.component.Button({
            id: "nextImageBtn",
            tooltip: "Next image",
            icon: iconPath,
        });
        $(this.nextImageButton.$).addClass("ui-button");

        // --------------------------------------------------------------

        // playImagesInSelectedOverlayRect -> onOffMode
        
        iconPath = iconDir + "/0183-switch.png";
        this.onOffModeButton = new COL.component.ToggleButton({
            id: "onOffModeBtnId",
            tooltip: "Offline / Online mode",
            icon: iconPath,
            on: false
        });

        let onOffModeButton_jqueryObj = $(this.onOffModeButton.$);
        onOffModeButton_jqueryObj.addClass("ui-button");


        // --------------------------------------------------------------

        iconPath = iconDir + "/0006-pencil.png";
        this.makeShiftButton = new COL.component.ToggleButton({
            id: "makeShiftBtnId",
            tooltip: "Makeshift button - for experimentation of new features",
            icon: iconPath,
            on: false
        });

        let makeShiftButton_jqueryObj = $(this.makeShiftButton.$);
        makeShiftButton_jqueryObj.addClass("ui-button");




        this._topDownPaneWrapper.append(this._topDownPane);
        if(COL.doEnableWhiteboard)
        {
            this._topDownPaneWrapper.append(this._floorPlanWhiteboard1);
        }
        this._topDownPaneWrapper.append(this._resizer);
        
        this._$texturePaneWrapper.appendTo('#grid-container1');

        let floorplanButtonGroupJqueryElement = $('#floorplanButtonGroupId');
        floorplanButtonGroupJqueryElement.append(this.floorPlanToggleButton.$);
        floorplanButtonGroupJqueryElement.append(this.previousImageButton.$);
        floorplanButtonGroupJqueryElement.append(this.playImagesInSelectedOverlayRectButton.$);
        floorplanButtonGroupJqueryElement.append(this.nextImageButton.$);
        floorplanButtonGroupJqueryElement.append(this.imageIndexInOverlayRectLabel.$);
        if(COL.doEnableWhiteboard)
        {
            floorplanButtonGroupJqueryElement.append(this._floorPlanWhiteboardMenu);
        }
        floorplanButtonGroupJqueryElement.append(this.onOffModeButton.$);
        floorplanButtonGroupJqueryElement.append(this.makeShiftButton.$);

        let spinnerEl_jqueryObj = $('<div id="cssLoaderId" class="loader loader-default"></div>');
        floorplanButtonGroupJqueryElement.append(spinnerEl_jqueryObj);
        
        if (COL.util.isTouchDevice())
        {
            // tbd - remove the function onClick_floorplanButtonGroupEl
            // floorplanButtonGroupEl.addEventListener( 'click', onClick_floorplanButtonGroupEl, {capture: false, passive: false} );
            floorplanButtonGroupEl.addEventListener( 'touchstart', onTouchstart_floorplanButtonGroupEl, {capture: false, passive: false} );
            floorplanButtonGroupEl.addEventListener( 'touchmove', onTouchmove_floorplanButtonGroupEl, {capture: false, passive: false} );

            // added catch-all 'click', at element grid-container1 to prevent an iOS side-effect of scaling-the-page when double-touching
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

        if(COL.doUseBootstrap)
        {
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

            // document.addEventListener("click", onClick_inPage);
        }

        this._topDownPaneWrapper.appendTo('#grid-container1');

        let doSaveUsingGoogleDrive = true;
        doSaveUsingGoogleDrive = false;
        if(doSaveUsingGoogleDrive) {
            this.addGoogleDriveButtons();
        }
        
        this._$texturePaneWrapper.append(this.texCanvasWrapper);

        COL.util.addElement('texCanvasWrapperId', 'div', 'imageTextInfo', '', 'imageTextInfo');

        this._topDownPane.addClass("topDownPaneClass");

        this.setTopDownResizer();

        this.floorPlanToggleButton.onClick(function (event) {
            console.log('BEG floorPlanToggleButton.onClick');
            COL.colJS.toggleSceneBarAndTopDownPane(COL.colJS.floorPlanToggleButton.isOn());
        });

        this.onOffModeButton.onClick(async function() {
            console.log('BEG onOffModeButton.onClick');

            try {
                let isOnMode = COL.colJS.onOffModeButton.isOn();
                console.log('isOnMode', isOnMode);

                if(isOnMode)
                {
                    console.log('Directing11111111111111111111111111 to https://192.168.1.75'); 
                    window.location.href = "https://192.168.1.80/index";
                }
                else
                {
                    // offline mode
                    // /home/avner/avner/softwarelib/jasonette/jasonette-android-branch-advance-webview
                    // ~/avner/softwarelib/jasonette/jasonette-android-branch-advance-webview/app/src/main/assets/file/hello.json
                    console.log('Directing222222222222222222222222222222 to file://root/html/raw/index.html'); 
                    window.location.href = "file://root/html/raw/index.html";
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

        this.makeShiftButton.onClick(async function() {
            // console.log('BEG makeShiftButton.onClick');

            try {
                // with every click set the layer to undefined (the layer can be set again by selecting a layer from the combo box).
                console.log('set layer to undefined');
                await COL.model.setSelectedLayer(undefined);
                
            }
            catch(err) {
                console.error('err', err);
                console.error('Error in makeShiftButton()');
            }
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
                let playImagesState = COL.colJS.playImagesInSelectedOverlayRectButton.isOn() ? Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_SELECTED_OVERLAY_RECT : Layer.PLAY_IMAGES_STATE.NONE
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

    };

    setupTopDownPaneGui = function () {
        this._topDownPaneWrapper = $('<div id="topDownPaneWrapperId"></div>');
        this._topDownPane = $('<div id="topDownPaneId"></div>');

        if(COL.doEnableWhiteboard)
        {
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
        
        this._resizer = $('<div id="topDownPaneResizerId"></div>');
    };

    
    initColJS = async function () {
        // console.log('BEG ColJS::initColJS');

        let floorplanButtonGroupEl = document.getElementById('floorplanButtonGroupId');
        // console.log('floorplanButtonGroupEl', floorplanButtonGroupEl); 
        let doSetupTopDownAndTextureGui = false;
        if(COL.util.isObjectValid(floorplanButtonGroupEl))
        {
            // the floorplanButtonGroupEl exists, i.e. the main page is view_sites.html
            doSetupTopDownAndTextureGui = true;
        }
        else
        {
            // the floorplanButtonGroupEl does not exists. This can happen if the html page is e.g. admin_view_groups.html
            // where the site buttons are not created and not presented
        }
        // console.log('doSetupTopDownAndTextureGui', doSetupTopDownAndTextureGui);
        
        if(doSetupTopDownAndTextureGui)
        {
            this.setupTexturePaneGui();

            this.setupTopDownPaneGui();

            // set the top row of buttons
            await this.setupToolsPaneGui(floorplanButtonGroupEl);
        }
        
        COL.model = new Model(doSetupTopDownAndTextureGui);
        await COL.model.initModel(doSetupTopDownAndTextureGui);

        // add catch-all 'click' eventListener, at the top-element grid-container1
        // to prevent an iOS side-effect of scaling-the-page when double-touching
        // tbd - leave these functions until problem of "iOS side-effect of scaling-the-page when double-touching" is resolved
        //   see section: "Fix - double-touch in iOS on floorPlanToggleButton, causes the page to scale up"
        let grid_container1El = document.getElementById('grid-container1');

        grid_container1El.addEventListener( 'touchstart', onTouchStart_grid_container1El, {capture: false, passive: false} );
        grid_container1El.addEventListener( 'touchend', onTouchEnd_grid_container1El, {capture: false, passive: false} );
        grid_container1El.addEventListener( 'click', onClick_grid_container1El, {capture: false, passive: false} );

        var numTouchStart = 0;
        var doubleTouchStartTimestamp = 0;
        
        function onTouchStart_grid_container1El(event) {
            // console.log('BEG onTouchStart_grid_container1El');
            numTouchStart++;
            
            var now1 = +(new Date());

            // console.log('--------- numTouchStart', numTouchStart); 
            // console.log('now1', now1);
            let delta1 = 500;
            let doubleTouchStartTimestamp_Upperlimit = doubleTouchStartTimestamp + delta1;
            // console.log('doubleTouchStartTimestamp_Upperlimit', doubleTouchStartTimestamp_Upperlimit);
            // console.log('doubleTouchStartTimestamp1', doubleTouchStartTimestamp);

            if (doubleTouchStartTimestamp_Upperlimit > now1){
                event.preventDefault();
                event.stopPropagation();
                // console.log('double touchstart detected'); 
            }
            else
            {
                // console.log('double touchstart NOT detected'); 
            }
            
            doubleTouchStartTimestamp = now1;
            // console.log('doubleTouchStartTimestamp2', doubleTouchStartTimestamp); 

        }

        var numTouchEnd = 0;
        var doubleTouchEndTimestamp = 0;

        function onTouchEnd_grid_container1El(event) {
            // console.log('BEG onTouchEnd_grid_container1El');
            numTouchEnd++;
            
            var now3 = +(new Date());

            // console.log('--------- numTouchEnd', numTouchEnd); 
            // console.log('now3', now3);

            // let delta1 = 1000;
            let delta1 = 500;
            let doubleTouchEndTimestamp_Upperlimit = doubleTouchEndTimestamp + delta1;
            // console.log('doubleTouchEndTimestamp_Upperlimit', doubleTouchEndTimestamp_Upperlimit);
            // console.log('doubleTouchEndTimestamp1', doubleTouchEndTimestamp);

            // event.preventDefault();
            // return $('#grid-container1').trigger('click');
            
            if (doubleTouchEndTimestamp_Upperlimit > now3){
                event.preventDefault();
                event.stopPropagation();
                // console.log('double touchend detected'); 
            }
            else
            {
                // console.log('double touchend NOT detected'); 
            }
            
            doubleTouchEndTimestamp = now3;
            // console.log('doubleTouchEndTimestamp2', doubleTouchEndTimestamp); 
        }

        var numClick = 0;
        var doubleClickTimestamp = 0;
        function onClick_grid_container1El(event) {
            // console.log('BEG onClick_grid_container1El');

            numClick++;
            var now2 = +(new Date());

            // console.log('--------------- numClick', numClick); 

            let delta2 = 1000;
            let doubleClickTimestamp_Upperlimit = doubleClickTimestamp + delta2;
            if (doubleClickTimestamp_Upperlimit > now2){
                event.preventDefault();
                // event.stopPropagation();
                // console.log('double click detected'); 
            }
            else
            {
                // console.log('double click NOT detected'); 
            }
            doubleClickTimestamp = now2;
            // console.log('doubleClickTimestamp2', doubleClickTimestamp); 

            // console.log('END onClick_grid_container1El');
        }
    };

    
    // /////////////////////////////////////////////////////////////////////////////////
    // The function "onSitesChanged" re-renders the topDown Pane based on a newly selected plan. It:
    // - checks if user is logged in (via get_current_user) - this will dictate how the
    //   selected planInfo is extracted from the "sites menu"
    // - extracts the selected planInfo
    // - re-renders the topDown Pane
    // 
    // /////////////////////////////////////////////////////////////////////////////////

    onSitesChanged = async function () {
        console.log('BEG onSitesChanged');

        let planFilename = '';
        let mtlFilename = '';
        // the SitePlanNames menu (the dropdown combo-box)
        let sitesEl = undefined;
        try {

            // Clear all the toasts
            toastr.clear();
            
            // disable the SitePlanNames menu
            sitesEl = document.getElementById("sitesId");
            sitesEl.disabled=true;
            
            let sitePlanName = $( "#sitesId option:selected" ).text();

            // Get the "text" of the select
            let titleStr = 'Site Plan Name: ' + sitePlanName;
            $('#dropdown_site_plan_name').html(titleStr);

            // collapse the dropdown divSitePlanMenu (like clicking on the hamburger icon)
            // $('#navbarMainMenuButtonId').click();
            $('#navbarSupportedContent15Id').removeClass("show");
            
            let optionIndex = $('#sitesId')[0].selectedIndex;
            if(optionIndex == 0)
            {
                await COL.model.setSelectedLayer(undefined);
                // enable the SitePlanNames menu
                sitesEl.disabled=false;
                return;
            }

            // Get the the selected option "value"
            let planInfoStr = $( "#sitesId option:selected" ).val();
            if(!COL.util.IsValidJsonString(planInfoStr)) {
                throw new Error('planInfoStr json string is invalid');
            }
            
            // ///////////////////////////////
            // Get planInfo from the "value" of the select
            // ///////////////////////////////
            
            let planInfoDict = JSON.parse(planInfoStr);
            let planInfo = new PlanInfo({id: planInfoDict.id,
                                         name: planInfoDict.name,
                                         url: planInfoDict.url,
                                         planFilename: planInfoDict.plan_filename,
                                         siteId: planInfoDict.site_id,
                                         siteName: planInfoDict.site_name,
                                         files: planInfoDict.files,
                                         zipFileName: planInfoDict.zipFileName});

            console.log('planInfoDict', planInfoDict);
            
            let loggedInFlag = COL.model.getLoggedInFlag();
            // console.log('loggedInFlag', loggedInFlag);

            if( COL.util.isObjectInvalid(planInfo.zipFileName) &&
               (loggedInFlag || (planInfo.siteName == "demo_site")) )
            {
                // ///////////////////////////////
                // user is logged-in (i.e. current_user.is_authenticated === true), or
                // user is logged-off and site is demo_site
                // planInfo is not from zip (i.e. from webserver)
                // Get planInfo from webServer
                // ///////////////////////////////
                // console.log('Get planInfo from webServer');
                
                // console.log('planInfo1', planInfo); 
                
                ApiService.LOAD_FROM_TYPE = ApiService.API_SERVICE_TYPES.APIServiceMultiFile;

                planFilename = planInfo.planFilename;

                let layerName = Layer.CreateLayerName(planInfo);
                let layer = COL.model.getLayerByName(layerName);

                if(COL.util.isObjectInvalid(layer))
                {
                    // the layer is not yet in memory
                    layer = COL.model.createLayer(planInfo);

                    // "https://192.168.1.75/avner/img/168/188/general_metadata.json"
                    let general_metadata_filename = 'general_metadata.json';
                    let queryUrl = COL.model.getUrlBase() + COL.model.getUrlImagePathBase() +
                        '/' + planInfo.siteId + '/' +
                        planInfo.id + '/' + general_metadata_filename;
                    
                    let response = await fetch(queryUrl);
                    await COL.errorHandlingUtil.handleErrors(response);
                    let dataAsJson = await response.json();
                    // console.log('dataAsJson', dataAsJson);
                    layer.setGeneralMetadata(dataAsJson);
                    
                    let layerGeneralMetadata = layer.getGeneralMetadata();
                    await COL.loaders.CO_ObjectLoader.loadLayerJson_fromWebServer(layer, planInfo);

                    COL.model.addLayer(layer);

                    await COL.model.setSelectedLayer(layer);

                    $(document).trigger("SceneLayerAdded", [layer, COL.model.getLayers().size()]);
                }
                else
                {
                    // the layer already exist in memory
                    await COL.model.setSelectedLayer(layer);
                }

                Scene3DtopDown.render1();

                if(loggedInFlag)
                {
                    // the user may not be logged-in, in the case of demo_site, 
                    let dataAsJson = await COL.colJS.set_selected_plan_id(planInfo.id);
                }

                // save the previous selection so it can be reverted to if the next selection fails.
                this.oldPlanInfoStr = planInfoStr;
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
                
                ApiService.LOAD_FROM_TYPE = ApiService.API_SERVICE_TYPES.ApiServiceZip;

                let layer = COL.model.getLayerByPlanInfo(planInfo);
                if(COL.util.isObjectInvalid(layer))
                {
                    // sanity check
                    throw new Error('layer is invalid');
                }
                await COL.model.setSelectedLayer(layer);
            }
            
            // enable the SitePlanNames menu
            sitesEl.disabled=false;

            // console.log('END onSitesChanged');
        }
        catch(err) {
            console.error('err', err);
            console.error('Failed to load the plan files: ', planFilename, mtlFilename);

            // remove the canvas from topDown
            let layer = COL.model.getLayerByName(planFilename);
            
            if(COL.util.isObjectValid(layer))
            {
                COL.model.removeCanvasFrom3DtopDownPane(layer);
                COL.model.removeCanvasFromTexturePane(layer);
            }
            else
            {
                console.log('layer is invalid');
            }

            // enable the SitePlanNames menu
            sitesEl.disabled=false;

            // raise a toast to indicate the failure
            let toastTitleStr = "Load site from web server";
            let msgStr = "Failed.";
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);

            // revert to the previous selection
            document.getElementById('sitesId').value=this.oldPlanInfoStr;
            
            // rethrow
            throw new Error('Failed to loadObjectAndMaterialFiles fromWebServerObjFile2');
        }
    };

    addGoogleDriveButtons = function () {
        let html1 = '<button id="google-drive-sign-in-or-out-button" style="margin-left: 25px">Sign In/Authorize</button>';
        this._$texturePaneWrapper.append(html1);

        let html2 = '<button id="google-drive-revoke-access-button" style="display: none; margin-left: 25px">Revoke access</button>';
        this._$texturePaneWrapper.append(html2);
        
        let html3 = '<div id="google-drive-auth-status" style="display: inline; padding-left: 25px"></div><hr>';
        this._$texturePaneWrapper.append(html3);

        let html4 = '<div id="dropboxAuthlink"></div>';
        this._$texturePaneWrapper.append(html4);
    };

    getImageIndexInOverlayRectLabel = function () {
        return this.imageIndexInOverlayRectLabel;
    };

    setTopDownResizer = function () {
        console.log('BEG setTopDownResizer'); 
        // https://jsfiddle.net/RainStudios/mw786v1w/

        this._resizer.addClass("topDownPaneResizerClass");

        let resizerEl = document.getElementById('topDownPaneResizerId');
        
        if (COL.util.isTouchDevice())
        {
            resizerEl.addEventListener( 'touchstart', onTouchStartTopDownInitResize, {capture: false, passive: false} );

            function onTouchStartTopDownInitResize(event) {
                console.log('BEG onTouchStartTopDownInitResize'); 
                event.preventDefault();
                
                window.addEventListener('touchmove', onTouchMoveTopDownResize, {capture: false, passive: false});
                window.addEventListener('touchend', onTouchEndTopDownStopResize, {capture: false, passive: false});
            }

            // onTouchMoveTopDownResize === onMouseMoveTopDownResize
            function onTouchMoveTopDownResize(event) {
                // console.log('BEG onTouchMoveTopDownResize');

                // event.preventDefault();
                
	        let pageX = event.touches[0].pageX;
	        let pageY = event.touches[0].pageY;
                
                let _topDownPaneWrapperEl = document.getElementById('topDownPaneWrapperId');
                _topDownPaneWrapperEl.style.width = (pageX - _topDownPaneWrapperEl.offsetLeft) + 'px';
                _topDownPaneWrapperEl.style.height = (pageY - _topDownPaneWrapperEl.offsetTop) + 'px';
                Scene3DtopDown.render1();
            }

            // onTouchEndTopDownStopResize === onMouseUpTopDownStopResize
            function onTouchEndTopDownStopResize(event) {
                console.log('BEG onTouchEndTopDownStopResize'); 
                window.removeEventListener('touchmove', onTouchMoveTopDownResize, {capture: false, passive: false});
                window.removeEventListener('touchend', onTouchEndTopDownStopResize, {capture: false, passive: false});

                // call resize
                let selectedLayer = COL.model.getSelectedLayer();
                let scene3DtopDown = selectedLayer.getScene3DtopDown();
                let doRescale = false;
                scene3DtopDown.set_camera_canvas_renderer_and_viewport1(doRescale);
                Scene3DtopDown.render1();
            }
        }
        else
        {
            resizerEl.addEventListener('mousedown', onMouseDownTopDownInitResize, {capture: false, passive: false});

            function onMouseDownTopDownInitResize(event) {
                // console.log('BEG onMouseDownTopDownInitResize'); 
                window.addEventListener('mousemove', onMouseMoveTopDownResize, {capture: false, passive: false});
                window.addEventListener('mouseup', onMouseUpTopDownStopResize, {capture: false, passive: false});
            }
            function onMouseMoveTopDownResize(event) {
                // console.log('BEG onMouseMoveTopDownResize');
                let _topDownPaneWrapperEl = document.getElementById('topDownPaneWrapperId');
                _topDownPaneWrapperEl.style.width = (event.clientX - _topDownPaneWrapperEl.offsetLeft) + 'px';
                _topDownPaneWrapperEl.style.height = (event.clientY - _topDownPaneWrapperEl.offsetTop) + 'px';
                Scene3DtopDown.render1();
            }
            function onMouseUpTopDownStopResize(event) {
                // console.log('BEG onMouseUpTopDownStopResize'); 
                window.removeEventListener('mousemove', onMouseMoveTopDownResize, {capture: false, passive: false});
                window.removeEventListener('mouseup', onMouseUpTopDownStopResize, {capture: false, passive: false});
                // call resize
                let selectedLayer = COL.model.getSelectedLayer();
                let scene3DtopDown = selectedLayer.getScene3DtopDown();
                let doRescale = false;
                scene3DtopDown.set_camera_canvas_renderer_and_viewport1(doRescale);
                Scene3DtopDown.render1();
            }            
        }
    };

    displayImageTextInfo = function (textInfoStr) {
        if(COL.doUseBootstrap)
        {
            // console.log('BEG displayImageTextInfo'); 
            
            // show/hide imageTextInfo according to the state of imageInfoBtn

            // Set the popover body text (by setting element.innerText, element.innerHTML is set)
            let imageInfoElement = document.getElementById('imageInfoElementId');
            imageInfoElement.innerText = textInfoStr;
            
            // console.log('imageInfoElement.innerHTML', imageInfoElement.innerHTML);

            $('#buttonImageInfoId').popover('dispose')

            $('#buttonImageInfoId').popover({
                placement: 'left',
                html: true,
                title: 'Image Info',
                content: imageInfoElement.innerHTML,
                container: 'body',
                toggle: 'popover'
            });

            if(this.isButtonImageInfoOn) {
                $("#buttonImageInfoId").popover('show');

            }
            else {
                $("#buttonImageInfoId").popover('hide');
            }
        }
    };

    toggleSceneBarAndTopDownPane = function (isOn) {
        // console.log('BEG toggleSceneBarAndTopDownPane');
        
        let sceneBar = document.getElementById('col-scenebarId');
        let editOptionsGroup = document.getElementById('editOptionsId');
        let playImagesInAllOverlayRectsButtonEl = document.getElementById('playImagesInAllOverlayRectsButtonId');
        
        
        let _topDownPaneWrapper1 = document.getElementById('topDownPaneWrapperId');
        if(isOn) {
            // show the topDown pane
            _topDownPaneWrapper1.style.display = "";

            // show the scenebar buttons
            // sceneBar.style.display = "";

            if(COL.util.isObjectValid(editOptionsGroup))
            {
                // editOptionsGroup can be invalid if not logged-in

                // show the editOptionsGroup buttons
                editOptionsGroup.style.display = "";
            }
            playImagesInAllOverlayRectsButtonEl.style.display = "";
        }
        else {
            // hide the topDown pane
            _topDownPaneWrapper1.style.display = "none";

            // hide the scenebar buttons
            // sceneBar.style.display = "none";

            if(COL.util.isObjectValid(editOptionsGroup))
            {
                // editOptionsGroup can be invalid if not logged-in

                // hide the editOptionsGroup buttons
                editOptionsGroup.style.display = "none";
            }
            playImagesInAllOverlayRectsButtonEl.style.display = "none";
        }
    };

    // Set the selected plan for the user, so when the user revisits the site, he will be shown his last selected plan
    set_selected_plan_id = async function (planId) {
        let queryUrl = COL.model.getUrlBase() + 'api/v1_2/set_selected_plan/' + planId;

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
    };

};


$(window).ready(function () {
});

// --------------------------------------------------------------

$(window).on('load', function () {
    // window.addEventListener('mousedown', onMouseDown5, {capture: false, passive: false});
    // window.addEventListener('mousemove', onMouseMove5, {capture: false, passive: false});
    // window.addEventListener('mouseup', onMouseUp5, {capture: false, passive: false});

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
    // window.addEventListener('scroll', onScroll5, {capture: false, passive: false});

    // // document.body.ontouchmove = (e) => { e.preventDefault(); return false; };
    // // document.body.ontouchstart = onTouchStart6;
    // // document.body.ontouchmove = onTouchMove6;
    
    // document.body.addEventListener('mousedown', onMouseDown6, {capture: false, passive: false});
    // document.body.addEventListener('touchstart', onTouchStart6, {capture: false, passive: false});
    // document.body.addEventListener('touchmove', onTouchMove6, {capture: false, passive: false});
    
});

// function onMouseDown5( event ) {
//     // console.log('BEG onMouseDown5');
//     // event.preventDefault();
// };

// function onMouseMove5( event ) {
//     // console.log('BEG onMouseMove5');
//     // event.preventDefault();
// };

// // onMouseUp5 (and onTouchEnd5) are needed to
// // - intercept click, wouch in the windows
// // - apply preventDefault() - otherwise on iPad the window sometimes responds with "zoom-in" effect

// function onMouseUp5( event ) {
//     // console.log('BEG onMouseUp5');
//     // event.preventDefault();
// };

// function onTouchStart5( event ) {
//     console.log('BEG onTouchStart5');
//     // event.preventDefault();
// };

// function onTouchMove5( event ) {
//     console.log('BEG onTouchMove555');
//     // event.preventDefault();
// };

// // --------------------------------------------------------------

// function onMouseDown6( event ) {
//     // console.log('BEG onMouseDown6');
//     // event.preventDefault();
// };

// function onTouchStart6( event ) {
//     console.log('BEG onTouchStart6666666666666666666666666666666666666666');

//     // calling  preventDefault() here causes side effects:
//     // - onTouchMove6() is trigerred
//     // - cannot toggle the editMode button (does not toggle to 'red')
//     // pevent.preventDefault();
// };

// function onTouchMove6( event ) {
//     console.log('BEG onTouchMove666666666');
//     // event.preventDefault();
// };


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

// function onScroll5( event ) {
//     console.log('BEG onScroll5233');
//     event.preventDefault();
//     // event.stopPropagation();
// };


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
};

function onMouseDown_imageInfoBtn(event) {
    // console.log('BEG onMouseDown_imageInfoBtn'); 
};

function onTouchStart_imageInfoBtn(event) {
    // console.log('BEG onTouchStart_imageInfoBtn'); 

    // prevent dragging the page via click and drag of the imageInfoBtn
    event.preventDefault();
    onClick_imageInfoBtn(event);
};

// Print the mouse coordinates in the page
function onClick_inPage(event) {
    console.log('BEG onClick_inPage'); 

    console.log('event.clientX', event.clientX); 
    console.log('event.clientY', event.clientY); 
};

export { ColJS };

// $(function(){
//     $('#testButton').on('click', function() {
//         toastr.error("Body message2",
//                      "Title",
//                      COL.errorHandlingUtil.toastrSettings);
//     });
// });
