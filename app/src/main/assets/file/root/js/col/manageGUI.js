/* eslint-disable no-case-declarations */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from './COL.js';
import { Model } from './core/Model.js';
import { OrbitControlsPlanView } from './orbitControl/OrbitControlsPlanView.js';
import { OrbitControlsImageView } from './orbitControl/OrbitControlsImageView.js';
import { OverlayRect } from './core/OverlayRect.js';
import { onMouseDown_planThumbnailsPane, onWheel_planThumbnailsPane, 
    onTouchStart_planThumbnailsPane } from './core/PlanThumbnailsView_eventListener.js';
import { Annotation } from './core/Annotation.js';
import { ImageView } from './core/ImageView.js';

// //////////////////////////////////////////////////////////

class ManageGUI {

    initGui() {
        console.log('BEG initGui');

        COL.manageGUI.paneType = ManageGUI.PANE_TYPE.PLAN_TUMBNAILS;

        document.getElementById('planPaneWrapperId').onclick =
          this.toggleProjectMenu(false);

        document.getElementById('imageViewPaneId').onclick =
           this.toggleProjectMenu(false);

        document.getElementById('overlayRectImageThumbnailsPaneId').onclick =
           this.toggleProjectMenu(false);

        document
            .getElementById('hamburgerBtnId')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('planViewBackBtnId')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('imageViewBackBtnId')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('imagesBackBtnId')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('list-option-plans')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('list-option-photos')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('list-option-people')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('list-option-settings')
            .addEventListener('click', COL.manageGUI.setPane);
        document
            .getElementById('openZipFileInputId')
            .addEventListener('change', COL.manageGUI.loadModelFromFile);
        document
            .getElementById('openZipFileIconId')
            .addEventListener('click', async function(){
                console.log('Clicked on openZipFileInputId');
                if( COL.util.isObjectValid(window.$agent_jasonette_android) ) {
                    await COL.manageGUI.loadModelFromFile();
                }
                else{
                    $(openZipFileInputId).trigger('click');
                }
            }); 
        document
            .getElementById('syncFromZipFileToWebServerBtnId')
            .addEventListener('click', COL.manageGUI.syncFromZipFileToWebServer);
        document
            .getElementById('addOverlayRectId')
            .addEventListener('click', COL.manageGUI.addOverlayRect);
        document
            .getElementById('addPhotoInputId')
            .addEventListener('change', COL.manageGUI.addPhoto);

        document
            .getElementById('toggleAnnotationVerticalIconBarId')
            .addEventListener('click', COL.manageGUI.toggleAnnotationVerticalIconBar, {capture: false, passive: false}); 
            
        document
            .getElementById('annotationDeleteModeId')
            .addEventListener('click', COL.manageGUI.toggleAnnotationDeleteMode, {capture: false, passive: false}); 
        document
            .getElementById('annotationMoveModeId')
            .addEventListener('click', COL.manageGUI.toggleAnnotationMoveMode, {capture: false, passive: false}); 
            
        document
            .getElementById('annotationShapeId')
            .addEventListener('click', COL.manageGUI.manageAnnotationShape, {capture: false, passive: false}); 
        document
            .getElementById('annotationRectShapeId')
            .addEventListener('click', COL.manageGUI.setRectShape, {capture: false, passive: false}); 
        document
            .getElementById('annotationCircleShapeId')
            .addEventListener('click', COL.manageGUI.setCircleShape, {capture: false, passive: false}); 

        document
            .getElementById('annotationFreeDrawModeId')
            .addEventListener('click', COL.manageGUI.toggleAnnotationFreeDrawMode, {capture: false, passive: false}); 

        document
            .getElementById('annotationBrushColorId')
            .addEventListener('click', COL.manageGUI.toggleAnnotationColorGroup, {capture: false, passive: false}); 
        document
            .getElementById('annotationRedBrushColorId')
            .addEventListener('click', COL.manageGUI.setBrushColorRed, {capture: false, passive: false}); 
        document
            .getElementById('annotationBlueBrushColorId')
            .addEventListener('click', COL.manageGUI.setBrushColorBlue, {capture: false, passive: false}); 
            
        document
            .getElementById('addPhotoIconId')
            .addEventListener('click', function(){
                console.log('Clicked on addPhotoIconId');
                if( COL.util.isObjectValid(window.$agent_jasonette_android) ) {
                    // window.$agent_jasonette_android is defined, i.e. the client is the jasonette mobile app
                    // trigger a request to add an image from the camera or from the
                    // file system on the mobile device
                    console.log('Before trigger media.pickerAndCamera'); 
                    window.$agent_jasonette_android.trigger('media.pickerAndCamera');
                }
                else{
                    $(addPhotoInputId).trigger('click');
                }
            }); 
        document
            .getElementById('listOptionLogInId')
            .addEventListener('click', COL.manageGUI.login);

        this.toggleProjectMenu(true);
    }

    // function to hide all panes
    hideAllPanes() {
        if (COL.paneDivs !== undefined) {
            COL.paneDivs.forEach(function (el) {
                el.style.display = 'none';
            });
        }
    }

    // function to hide all buttons
    hideAllButtons() {
        if (COL.buttonDivs !== undefined) {
            COL.buttonDivs.forEach(function (el) {
                el.style.display = 'none';
            });
        }
    }

    async login() {
        console.log('BEG login'); 

        let dbSystemParamsAsJson = await COL.model.getDbSystemParams();
        let databaseVersion = dbSystemParamsAsJson['database_version'];
        if(!COL.loaders.utils.validateVersion(databaseVersion, COL.model.dbVersion, 'Equal')) {
            let msgStr = 'Database version validation failed.';
            // throw new Error(msgStr);

            let toastTitleStr = 'Login to the webserver';
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            return;
        }

        let serverAddress = await COL.util.getDataFromIndexedDb('serverAddress');
        // let serverAddress = '192.168.1.74';
        window.location.href='https://' + serverAddress + '/login';
    }

    async syncFromZipFileToWebServer() {
        // console.log('BEG syncFromZipFileToWebServer'); 

        // let doUploadToWebServer = confirm("Uploading to the webserver will overwrite all pre-existing data for the site!");
        // if(!doUploadToWebServer)
        // {
        //     // The user cancelled the operation. Do not upload.
        //     return;
        // }

        let spinnerJqueryObj = $('#inProgressSpinnerId');
        let spinnerEl = document.getElementById('inProgressSpinnerId');
        spinnerEl.setAttribute('data-text', 'Uploading sites to the webserver');
        spinnerJqueryObj.addClass('is-active');
        
        let toastTitleStr = 'sync FromZipFileToWebServer - Sync site plans from the zip file to the webserver';
        try {

            // /////////////////////////////////////////
            // sync the site to the webserver
            // do
            // - syncZipSitesWithWebServer
            //   - syncZipSiteWithWebServer
            //     - syncZipSitePlanWithWebServer
            //       - syncZipSitePlanFilesWithWebServer
            //         - syncFilesOfTheCurrentZipFileLayer(imagesInfo, imageFilenames, syncRetVals)
            //         - syncFilesOfTheCurrentZipFileLayer(metaDataBlobsInfo, metaDataFilenames, syncRetVals)
            // /////////////////////////////////////////

            let selectedLayer = COL.model.getSelectedLayer();
            let selectedLayerNameFromZipfile = selectedLayer.name;
            // console.log('selectedLayerNameFromZipfile', selectedLayerNameFromZipfile);

            let selectedLayerNameAfterSync = selectedLayerNameFromZipfile.replace('_zip','');
            // console.log('selectedLayerNameAfterSync', selectedLayerNameAfterSync);

            let retval1 = await COL.model.fileZip.syncZipSitesWithWebServer();

            // take1 - load view_sites
            // // Reload the view_sites page to update '#sitesId option' with the correct siteId, planId after syncing the zipfile layers
            // // disable cache, so that '#sitesId option' data is reread from the db
            // let queryUrl = Model.GetUrlBase() + 'view_sites';
            // let headersData = {
            //     'X-CSRF-Token': COL.util.getCSRFToken(),
            //     'Cache-Control': 'no-cache, no-store, must-revalidate'
            // };
            // let fetchData = { 
            //     method: 'GET', 
            //     headers: headersData,
            // };
                    
            // take2 - set new selected layer
            // let response = await fetch(queryUrl, fetchData);
            // await COL.errorHandlingUtil.handleErrors(response);
    
            // take3 - load window - see 'take3' below
            
            // take4 - use loadLayer
            // but... the planInfo of the layer (e.g. siteId, planId) need to refer to the new 
            // updated data, after deleting and recreating the plan in the db, siteId, planId change...
            // e.g. use code like below
            // let layer = await COL.colJS.loadLayer(sitePlanName, optionValueAsDict.zipFileName);
            // 
            // currently there are problems where selecting a plan does not respond.
            // this may be related to the fact that having too many event listeners e.g. for move
            // by the number of layers (actually there should only be one single eventlistener 
            // e.g. for move)
            //
            // for now we are using take3, but ideally we should be able use take4 and 
            // to refrain from reloading the window and just reload the layers.

            // trying to set the selected layer to the equivalent layer in the webserver to the zip layer from
            // where sync was triggerred
            // 
            // let selectedLayer2 = await COL.model.selectLayerByName(selectedLayerNameAfterSync);
            // console.log('selectedLayer11', selectedLayer2);

            let retval = retval1.retval;
            let syncZipSitesWithWebServer_statusStr = retval1.syncZipSitesWithWebServer_statusStr;

            // ////////////////////////////////////////////////////
            // raise a toast
            // ////////////////////////////////////////////////////
            
            if(retval) {
                let msgStr = 'Succeeded to sync: ' + syncZipSitesWithWebServer_statusStr;
                toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);

                let msgStr1 = toastTitleStr + ': ' + msgStr;
                console.log('msgStr1', msgStr1); 
                // alert(msgStr1);

                // tbd - currently after loading from zipfile the pre-loaded plan that was loaded from the webserver
                // is temporarily lost and shows up as duplicate of the plan that is loaded from the zipfile
                // so the remedy is to reload the page to show the plan that was loaded from the zipfile
                // as single plan, as seen in the webserver after the sync
                // 
                // reload the page to reload the plans, that were synced plans from the zip file to the webserver, from the webserver.
                // take3 - load window
                window.location.reload(true);
                // await COL.manageGUI.loadPlansAsThumbnails();

                // TBD
                // // mark the status
                // isLayerFromZipFile;
               
            }
            else {
                let msgStr = 'Failed to sync from zip file:' + syncZipSitesWithWebServer_statusStr;
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
        }
        catch(err) {
            console.error('Error from syncFromZipFileToWebServer:', err);

            let msgStr = 'Failed to sync from zip file. ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }

        spinnerJqueryObj.removeClass('is-active');
    }

    async loadModelFromFile(event) {
        // the user clicked on the button openZipFileInputId
        console.log('BEG loadModelFromFile');

        let toastTitleStr = 'Load model from zip file';
        try{
            if( COL.util.isObjectValid(window.$agent_jasonette_android) ) {
            // window.$agent_jasonette_android is defined, i.e. the client is the jasonette mobile app
            // call loadModelFromFile() which will
            // trigger a request to load the .zip file from the file system on the mobile device.
                console.log('Before trigger media.loadZipFileHeaders'); 
                window.$agent_jasonette_android.trigger('media.loadZipFileHeaders');
    
            // (the callback from trigger media.loadZipFileHeaders internally calls
            //  onChange_openZipFileButton, which calls setPane, to show the plan of the zipfile)
            }
            else{
                var input = event.srcElement;
                // var files = input.files;
                // the input has an array of files in the `files` property, each one has a name that you can use. We're just using the name here.
                var fileName = input.files[0].name;
                let sceneBar = COL.model.getSceneBar();
                // Convert from FileList to array
                // https://stackoverflow.com/questions/25333488/why-isnt-the-filelist-object-an-array
                let filesToOpenArray = Array.from(input.files);
                
                // await sceneBar.onChange_openZipFileButton1(filesToOpenArray);
                await sceneBar.onChange_openZipFileButton1(input);
    
                // (onChange_openZipFileButton1 internally calls onChange_openZipFileButton, 
                //  which calls setPane, to show the plan of the zipfile)
                let msgStr = 'Succeeded to load';
                toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
    
        }
        catch(err) {
            console.error('Error from loadModelFromFile:', err);
            let msgStr = err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }

    }

    async addOverlayRect(obj) {
        console.log('BEG addOverlayRect');

        let selectedLayer = COL.model.getSelectedLayer();
        let planView = COL.getPlanView();
        let orbitControls = planView.getOrbitControls();
        orbitControls.setState(OrbitControlsPlanView.STATE.EDIT_MODE_ADD_OVERLAY_RECT);
    }

    async addPhoto(event) {
        console.log('BEG addPhoto');

        if( COL.util.isObjectValid(window.$agent_jasonette_android) ) {
            // window.$agent_jasonette_android is defined, i.e. the client is the jasonette mobile app
            // trigger a request to add an image from the camera or from the
            // file system on the mobile device
            console.log('Before trigger media.pickerAndCamera'); 
            window.$agent_jasonette_android.trigger('media.pickerAndCamera');
        }
        else{
            var input = event.srcElement;
            // var files = input.files;
            // the input has an array of files in the `files` property, each one has a name that you can use. We're just using the name here.
            let sceneBar = COL.model.getSceneBar();
            // Convert from FileList to array
            // https://stackoverflow.com/questions/25333488/why-isnt-the-filelist-object-an-array
            let filesToOpenArray = Array.from(input.files);
            sceneBar.onChange_openImageFileButton(filesToOpenArray);
        }
        let selectedLayer = COL.model.getSelectedLayer();
    
        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
        if(COL.util.isObjectValid(selectedOverlayRect)){
            selectedLayer.showSelectedOverlayRect();
            // selectedOverlayRect.setState(OverlayRect.STATE.ADD_PHOTO);
        }
    }

    toggleAnnotationVerticalIconBar() {
        // console.log('BEG toggleAnnotationVerticalIconBar');

        COL.manageGUI.toggleElementDisplay('verticalIconBarId', 'flex');
        const toggleAnnotationVerticalIconBarEl = document.getElementById('toggleAnnotationVerticalIconBarId');
        toggleAnnotationVerticalIconBarEl.classList.toggle('bi-caret-up');
        toggleAnnotationVerticalIconBarEl.classList.toggle('bi-caret-down');
    }

    toggleAnnotationColorGroup() {
        // console.log('BEG toggleAnnotationColorGroup');
        COL.manageGUI.toggleElementDisplay('annotationColorIconBarId', 'flex');
    }

    toggleAnnotationDeleteMode() {
        // console.log('BEG toggleAnnotationDeleteMode');
        let isAnnotationDeleteModeEmphasized = COL.manageGUI.toggleEmphasizeElement('annotationDeleteModeId');
        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();
        if(isAnnotationDeleteModeEmphasized){
            orbitControls.setState( OrbitControlsImageView.STATE.EDIT_MODE_DELETE_ANNOTATION );
        }
        else{
            orbitControls.setState( OrbitControlsImageView.STATE.NONE );
        }
    }

    toggleAnnotationMoveMode() {
        // console.log('BEG toggleAnnotationMoveMode');
        let isAnnotationMoveModeEmphasized = COL.manageGUI.toggleEmphasizeElement('annotationMoveModeId');
        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();
        if(isAnnotationMoveModeEmphasized){
            orbitControls.setState( OrbitControlsImageView.STATE.EDIT_MODE_MOVE_ANNOTATION );
        }
        else{
            orbitControls.setState( OrbitControlsImageView.STATE.NONE );
        }
    }
    
    toggleAnnotationFreeDrawMode() {
        // console.log('BEG toggleAnnotationFreeDrawMode');
        let isAnnotationFreeDrawModeEmphasized = COL.manageGUI.toggleEmphasizeElement('annotationFreeDrawModeId');
        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();

        if(isAnnotationFreeDrawModeEmphasized){
            orbitControls.setState( OrbitControlsImageView.STATE.EDIT_MODE_ADD_FREE_DRAW_ANNOTATION );
        }
        else{
            orbitControls.setState( OrbitControlsImageView.STATE.NONE );
        }
        // console.log('COL.model.fabricCanvas.isDrawingMode after: ', COL.model.fabricCanvas.isDrawingMode);
    }

    manageAnnotationShape() {
        // console.log('BEG manageAnnotationShape');

        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();

        // - change the orbit state to NONE
        orbitControls.setState( OrbitControlsImageView.STATE.NONE );

        // toggle emphasize the annotationShapeId
        let isAnnotationShapeEmphasized = COL.manageGUI.toggleEmphasizeElement('annotationShapeId');

        // Show/hide the shapes-horizontal-icon-bar depending on isAnnotationShapeEmphasized.
        COL.manageGUI.setElementDisplay('annotationShapeIconBarId', isAnnotationShapeEmphasized, 'flex');
    }
    
    emphasizeElement(elementId, doEmphasize) {
        // console.log('BEG emphasizeElement');

        const elementEl = document.getElementById(elementId);
        if (doEmphasize) {
            elementEl.classList.add('emphasizeElement');
            elementEl.classList.remove('deEmphasizeElement');
        }
        else {
            elementEl.classList.add('deEmphasizeElement');
            elementEl.classList.remove('emphasizeElement');
        }
    }

    toggleEmphasizeElement(elementId) {
        // console.log('BEG toggleEmphasizeElement');

        const elementEl = document.getElementById(elementId);
        let isEmphasized = elementEl.classList.contains('emphasizeElement');

        // toggle the emphasized element
        let doEmphasize = !isEmphasized;
        COL.manageGUI.emphasizeElement(elementId, doEmphasize);

        return doEmphasize;
    }

    setElementDisplay(elementId, doDisplayElement, displayType) {
        const elementEl = document.getElementById(elementId);
        if (doDisplayElement) {
            elementEl.style.display = displayType;
        }
        else {
            elementEl.style.display = '';
        }
    }
    
    toggleElementDisplay(elementId, displayType) {
        // console.log('BEG toggleElementDisplay');

        const elementEl = document.getElementById(elementId);
        let isElementDisplayed = elementEl.style.display == '' ? false : true;
        // toggle the state
        let doDisplayElement = !isElementDisplayed;
        COL.manageGUI.setElementDisplay(elementId, doDisplayElement, displayType);
    }
    
    setRectShape(event) {
        // console.log('BEG setRectShape.');
        COL.manageGUI.setShape(Annotation.SHAPE.RECT);

        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();
        orbitControls.setState( OrbitControlsImageView.STATE.EDIT_MODE_ADD_SHAPE_ANNOTATION );
    }

    setCircleShape(event) {
        // console.log('BEG setCircleShape.');
        
        // COL.manageGUI.setShape(Annotation.SHAPE.CIRCLE);
        COL.manageGUI.setShape(Annotation.SHAPE.ELLIPSE);

        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();
        orbitControls.setState( OrbitControlsImageView.STATE.EDIT_MODE_ADD_SHAPE_ANNOTATION );
    }

    setShape(shape) {
        // console.log('BEG setShape.');

        const annotationShapeGroupEl = document.getElementById('annotationShapeId');
        switch (shape) {
            case Annotation.SHAPE.NONE:
                annotationShapeGroupEl.classList.add('bi-circle-square');
                annotationShapeGroupEl.classList.remove('bi-square');
                annotationShapeGroupEl.classList.remove('bi-circle');
                COL.manageGUI.emphasizeElement('annotationShapeId', false);
                break;
            case Annotation.SHAPE.RECT:
                annotationShapeGroupEl.classList.remove('bi-circle-square');
                annotationShapeGroupEl.classList.add('bi-square');
                annotationShapeGroupEl.classList.remove('bi-circle');
                COL.manageGUI.emphasizeElement('annotationShapeId', true);
                COL.manageGUI.setElementDisplay('annotationShapeIconBarId', false, 'flex');
                break;
            case Annotation.SHAPE.CIRCLE:
            case Annotation.SHAPE.ELLIPSE:
                annotationShapeGroupEl.classList.remove('bi-circle-square');
                annotationShapeGroupEl.classList.remove('bi-square');
                annotationShapeGroupEl.classList.add('bi-circle');
                COL.manageGUI.emphasizeElement('annotationShapeId', true);
                COL.manageGUI.setElementDisplay('annotationShapeIconBarId', false, 'flex');
                break;
            default:
                throw new Error('Annotation shape is not supported: ' + shape);
        }

        Annotation.SetShape(shape);
    }

    setBrushColorRed(event) {
        // console.log('BEG setBrushColorRed.');
        COL.manageGUI.setAnnotationBrushColor('red');
    }

    setBrushColorBlue(event) {
        // console.log('BEG setBrushColorBlue.');
        COL.manageGUI.setAnnotationBrushColor('blue');
    }

    setAnnotationBrushColor(color) {
        // console.log('BEG setAnnotationBrushColor.');
        const annotationBrushColorEl = document.getElementById('annotationBrushColorId');
        annotationBrushColorEl.style.color = color;
        Annotation.setAnnotationBrushColor(color);
    }

    async addAnnotationShape1(event, shape) {
        // console.log('BEG addAnnotationShape1');

        // prevent from trickling the event, when touching and dragging, which causes a side effect of refreshing the page
        event.preventDefault();

        let imageView = COL.model.getImageView();
        await imageView.addAnnotationShape2(shape);
    }

    showPlanView(elementId) {
        let selectedLayer = COL.model.getSelectedLayer();
        // console.log('selectedLayer.name', selectedLayer.name);
        // console.log('selectedLayer.isLayerFromZipFile', selectedLayer.isLayerFromZipFile);

        // show or hide the button to syncFromZipFileToWebServer
        if(selectedLayer.isLayerFromZipFile) {
            // show
            document.querySelector('#syncFromZipFileToWebServerBtnId').style.display = 'inline-flex';
        }
        else{
            // hide
            document.querySelector('#syncFromZipFileToWebServerBtnId').style.display = 'none';
        }

        if (COL.manageGUI.isProjectMenuOn()) {
            // the projectMenu his shown. Keep showing all the plans, hide the projectMenu, show the hamburgerBtn
            document.querySelector('#planPaneWrapperId').style.display = 'block';
            document.querySelector('#planThumbnailsPaneId').style.display = 'block';

            COL.manageGUI.toggleProjectMenu(false);
            document.querySelector('#hamburgerBtnId').style.display = 'block';
        }
        else {
            // the projectMenu his hidden. Show the selected plan, hide the other plans
            document.querySelector('#planPaneWrapperId').style.display = 'block';
            document.querySelector('#planViewPaneId').style.display = 'block';
            document.querySelector('#planViewBackBtnId').style.display = 'block';

            // Update the SyncWithWebServerStatus according to the status of the layer.
            COL.util.setSyncWithWebServerStatus(selectedLayer.getSyncWithWebServerStatus());
        }
    }

    getPaneType() {
        return COL.manageGUI.paneType;
    }

    async setPane(obj) {
        console.log('BEG setPane');

        let elementId = undefined;
        let isPlanImg = false;
        let isImgTag = false;

        if (obj instanceof Event) {
            elementId = obj.currentTarget.id;
            // console.log('elementId1: ', elementId);
        }
        else if (obj instanceof Element) {

            if (obj.classList.contains('plan-image')) {
                isPlanImg = true;
            }
            else if (obj.tagName == 'IMG') {
                // clicked on element with tag 'img' (note: the tag is an html feature and is unrelated
                // to the filename, i.e. the filename can be called something other than IMG_xxx).
                isImgTag = true;
            }
            elementId = obj.id;
        }
        else {
            console.error('obj: ', obj);
            throw new Error('obj is invalid. It should be an instance of event or DOM element.');
        }

        // console.log('Hide everything');
        // At first: hide all buttons and panes to ensure that only one will be open
        COL.manageGUI.hideAllButtons();
        COL.manageGUI.hideAllPanes();

        // console.log('elementId: ', elementId);

        if (isPlanImg) {
            // Show the planView pane
            COL.manageGUI.showPlanView(elementId);
            COL.clickedElements.push(elementId);
            COL.manageGUI.paneType = ManageGUI.PANE_TYPE.SELECTED_PLAN;
        }
        else if (isImgTag) {
            // Show the imageView pane
            let selectedLayer = COL.model.getSelectedLayer();
            let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
            await selectedOverlayRect.updateImageViewPane(selectedLayer);

            // Handle by tag
            document.querySelector('#imageViewBackBtnId').style.display = 'block';
            document.querySelector('#imageViewPaneId').style.display = 'block';

            let imageView = COL.model.getImageView();
            imageView.enableControls(true);
            // entering imageView - start clean: clear the pointerEventCache array.
            // to start with 0 pointerEvents
            ImageView.pointerEventCache = [];

            // push an undefined value, just so it can be popped out later
            COL.clickedElements.push(elementId);
            COL.manageGUI.paneType = ManageGUI.PANE_TYPE.SELECTED_IMAGE;
        }
        else {
            // Handle by id
            if (!elementId) {
                throw new Error('elementId is invalid');
            }

            const items = document.getElementsByClassName('list-group-item active');
            let selectedLayer = COL.model.getSelectedLayer();

            switch (elementId) {
                case 'hamburgerBtnId':
                    document.querySelector('#hamburgerBtnId').style.display = 'block';

                    if (items[0].id === 'list-option-plans') {
                        // Show the planThumbnails pane
                        // the "plans" option is selected in the projectMenu
                        COL.manageGUI.showPlanThumbnails();
                        COL.manageGUI.paneType = ManageGUI.PANE_TYPE.PLAN_TUMBNAILS;
                    }
                    else{
                        // another option in the hamburger menu was chosen that is not 'Plans' (e.g. 'Photos'). Don't showPlanThumbnails
                    }

                    COL.manageGUI.toggleProjectMenu(true);
                    break;

                case 'planViewBackBtnId':
                    // Show the planThumbnails pane
                    COL.manageGUI.showPlanThumbnails();
                    COL.manageGUI.paneType = ManageGUI.PANE_TYPE.PLAN_TUMBNAILS;
                    break;

                case 'imagesBackBtnId':
                    // Show the planView pane
                    const lastPlanViewId = COL.clickedElements.pop();
                    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                    if (selectedOverlayRect.isMenuVisible) {
                        selectedOverlayRect.clearMenuThumbnailImage();
                    }
        
                    // console.log('lastPlanViewId', lastPlanViewId);
                    COL.manageGUI.showPlanView(lastPlanViewId);
                    COL.manageGUI.paneType = ManageGUI.PANE_TYPE.SELECTED_PLAN;
                    break;

                case 'overlayRectImageThumbnailsPaneId':
                    // Show the overlayRectThumbnailImages pane
                    document.querySelector('#imagesBackBtnId').style.display = 'block';
                    document.querySelector('#overlayRectImageThumbnailsPaneWrapperId').style.display = 'block';
                    document.querySelector('#overlayRectImageThumbnailsPaneId').style.display = 'block';
                    document.querySelector('#addPhotoIconId').style.display = 'block';
                    document.getElementById(elementId).style.display = 'block';
                    COL.manageGUI.paneType = ManageGUI.PANE_TYPE.IMAGE_TUMBNAILS;
                    break;

                case 'imageViewBackBtnId':
                    // Show the overlayRectThumbnailImages pane
                    document.querySelector('#imagesBackBtnId').style.display = 'block';
                    document.querySelector('#overlayRectImageThumbnailsPaneWrapperId').style.display = 'block';
                    document.querySelector('#overlayRectImageThumbnailsPaneId').style.display = 'block';
                    document.querySelector('#addPhotoIconId').style.display = 'block';
                    let imageView = COL.model.getImageView();
                    imageView.enableControls(false);
                    COL.manageGUI.paneType = ManageGUI.PANE_TYPE.IMAGE_TUMBNAILS;
                    COL.clickedElements.pop();

                    break;

                case 'list-option-plans':
                    document.querySelector('#hamburgerBtnId').style.display = 'block';
                    document.querySelector('#planPaneWrapperId').style.display = 'block';
                    document.querySelector('#planThumbnailsPaneId').style.display = 'block';
                    COL.manageGUI.paneType = ManageGUI.PANE_TYPE.PLAN_TUMBNAILS;

                    // toggle the ProjectMenu
                    COL.manageGUI.toggleProjectMenu(
                        !COL.manageGUI.isProjectMenuOn()
                    );
                    break;

                case 'list-option-photos':
                case 'list-option-people':
                case 'list-option-settings':
                    document.querySelector('#hamburgerBtnId').style.display = 'block';
                    // toggle the ProjectMenu
                    COL.manageGUI.toggleProjectMenu(!COL.manageGUI.isProjectMenuOn());
                    break;
            } // end of switch
        }
    }

    // very_long_name -> very_lon...
    truncateLongString(str, n){
        return (str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
    }
      
    // Load the plans that belong to the group and display them as thumbnails in planThumbnailsPane 
    async loadPlansAsThumbnails () {
        // console.log('BEG loadPlansAsThumbnails');

        let planListEl = document.getElementById('plan-list');
        let _this = this;
        // Remove all previous thumbnails
        planListEl.innerHTML = '';
        let numPlans = $('#sitesId option').length;
        // console.log('numPlans: ', numPlans);

        // tbd - investigate why calling getDataFromIndexedDb()
        //       causes the scrollPosition to not restore to the previous location
        // let doDisplayDemoSite1 = await COL.util.getDataFromIndexedDb('doDisplayDemoSite1');
        let doDisplayDemoSite = COL.model.getDoDisplayDemoSite();

        let sitePlanName = 'na';
        if(numPlans > 0) {
            for(let i = 0; i < numPlans; i++){
                try{
                    // reset the sitePlanName to inital value to avoid reporting a wrong sitePlanName, 
                    // if the block throws, before the sitePlanName is parsed.
                    sitePlanName = 'na';

                    let option = $('#sitesId')[0][i];
                    // console.log('option.value', option.value); 
                    // console.log('option.text', option.text); 

                    let optionValueAsDict = JSON.parse(option.value);
                    sitePlanName = optionValueAsDict.site_name + '__' + optionValueAsDict.name;

                    if(optionValueAsDict.site_name == 'demo_site' && !doDisplayDemoSite){
                        // ///////////////////////////////
                        // site is demo_site, and doDisplayDemoSite is false
                        // Don't load the layer
                        // ///////////////////////////////
                        continue;
                    }
                    // create the layer and load the floorPlanImage
                    let layer = await COL.colJS.loadLayer(sitePlanName, optionValueAsDict.zipFileName);

                    const liEl = document.createElement('li');
                    const figureEl = document.createElement('figure');
                    const figcaptionEl = document.createElement('figcaption');

                    let siteName = layer.planInfo.siteName;
                    let planFilename = layer.planInfo.planFilename;
                    let layerSubname = planFilename;
                    // extract part of planFilename (xxx.yyy.foo.json -> foo)
                    var substrings = planFilename.split( '.' );
                    if(COL.util.isObjectValid(substrings) && (substrings.length > 2)){
                        layerSubname = substrings[ substrings.length - 2 ];
                    }

                    // Create the plan-name-to-be-dispalyed-in-the-footer
                    let numChars = 25;
                    let siteSubName = this.truncateLongString(siteName, numChars);
                    figcaptionEl.innerHTML = '<p class="p-class">' + siteSubName + '<br>' + layerSubname + '</p>';
                    if(layer.isLayerFromZipFile) {
                        figcaptionEl.innerHTML = '<p class="p-class">' + siteSubName + '<br>' + layerSubname + ' (zip)</p>';
                    }
                    else{
                        figcaptionEl.innerHTML = '<p class="p-class">' + siteSubName + '<br>' + layerSubname + '</p>';
                    }
                
                    let planThumbnailEl =  document.createElement('img');
                    planThumbnailEl.setAttribute('id', layer.name);
                
                    let floorPlanImageFilename = layer.getFloorPlanImageFilename();
                    let [imageBlobUrl, imageAnnotationBlobUrl] = await layer.getImageBlobUrl_andImageAnnotationBlobUrl(floorPlanImageFilename);
                    planThumbnailEl.setAttribute('src', imageBlobUrl);
                    planThumbnailEl.setAttribute('class','plan-image');
        
                    if (COL.util.isTouchDevice()) {
                        planThumbnailEl.addEventListener('touchstart', onTouchStart_planThumbnailsPane, {
                            capture: false,
                            passive: false,
                        });
                    }
                    else{
                        planThumbnailEl.addEventListener('mousedown', onMouseDown_planThumbnailsPane, {
                            capture: false,
                            passive: false,
                        });
                        planThumbnailEl.addEventListener('wheel', onWheel_planThumbnailsPane, {
                            capture: false,
                            passive: false,
                        });
                    }

                    figureEl.appendChild(planThumbnailEl);
                    figureEl.appendChild(figcaptionEl);
                    liEl.appendChild(figureEl);
                    planListEl.appendChild(liEl);

                }
                catch(err) {
                    // Failed to load the layer, e.g. because the version isn't supprted.
                    // Continue to the next layer
                    let msgStr = 'Failed to load the layer: ' + sitePlanName + ', err: ' + err;
                    console.error(msgStr);

                    // remove the canvas from planView, and update the options list.
                    $('#sitesId')[0].remove(i);
                    numPlans -= 1;
                    i -= 1;

                    continue;    
                }

            }
        }
        else {
            // layer.clearRenderingOfThumbnailPlans();
        }
    }
      

    async showPlanThumbnails() {
        // console.log('BEG showPlanThumbnails');

        // ////////////////////////////////////////////////////////
        // show all plans
        // ////////////////////////////////////////////////////////

        document.querySelector('#hamburgerBtnId').style.display = 'block';
        document.querySelector('#planPaneWrapperId').style.display = 'block';
        document.querySelector('#planThumbnailsPaneId').style.display = 'block';

        {
            // tbd - investigate why calling getDataFromIndexedDb()
            //       causes the scrollPosition to not restore to the previous location
    
            // let planThumbnailsPaneScrollPosition = COL.model.getPlanThumbnailsPaneScrollPosition();
            // console.log('planThumbnailsPaneScrollPosition', planThumbnailsPaneScrollPosition);
            // let el1 = document.getElementById('planThumbnailsPaneId');
            // // console.log('el1', el1);
            // console.log('el1.scrollTop', el1.scrollTop);
            // el1.scrollTop = planThumbnailsPaneScrollPosition.scrollTop;
            // console.log('el1.scrollTop22', el1.scrollTop);
            // // add         compute of planThumbnailsPaneScrollPosition to mouseUp
            // // debug pageY, clientY
        }

        await COL.manageGUI.loadPlansAsThumbnails();
        // await this.loadPlansAsThumbnails();

        const planThumbnailsPaneEl = document.getElementById(
            'planThumbnailsPaneId'
        );
        const children = planThumbnailsPaneEl.children;

        // Modify the height of each element with class "rowPlanPane" to fill helf the viewport
        const nodeList = document.querySelectorAll('.rowPlanPane');
        for (let i = 0; i < nodeList.length; i++) {
            // nodeList[i].style.height = "50vh";
            this.fillViewPort(nodeList[i], false);
        }

        // show all plans
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            child.style.display = 'block';
        }

        COL.model.updateIsSyncedWithWebServer();

    }

    fillViewPort(element, doFillViewPort) {
        console.log('BEG fillViewPort');

        if (doFillViewPort) {
            element.classList.remove('fillHalfViewPort');
            element.classList.add('fillViewPort');
        }
        else {
            element.classList.remove('fillViewPort');
            element.classList.add('fillHalfViewPort');
        }
    }

    isProjectMenuOn() {
        const x = document.getElementById('project-menu-id');
        const retval = x.style.display === 'block' ? true : false;
        return retval;
    }

    toggleProjectMenu(doShowProjectMenu) {
        // console.log('BEG toggleProjectMenu');
        
        // show / hide the projectMenu
        const projectMenuEl = document.getElementById('project-menu-id');

        if(COL.util.isObjectValid(COL.model)) {
            let loggedInFlag = COL.model.getLoggedInFlag();
            if(loggedInFlag) {
                document.querySelector('#listOptionLogInId').style.display = 'none';
                document.querySelector('#list-option-logOutId').style.display = 'block';
            }
            else{
                document.querySelector('#listOptionLogInId').style.display = 'block';
                document.querySelector('#list-option-logOutId').style.display = 'none';
            }
        }
        else{
            document.querySelector('#listOptionLogInId').style.display = 'block';
            document.querySelector('#list-option-logOutId').style.display = 'none';
        }

        if (doShowProjectMenu) {
            projectMenuEl.style.display = 'block';
        }
        else {
            projectMenuEl.style.display = 'none';
        }
    }
}

// /////////////////////////////////
// BEG Static class variables
// /////////////////////////////////

ManageGUI.PANE_TYPE = {
    NONE: -1,
    PLAN_TUMBNAILS: 0,
    SELECTED_PLAN: 1,
    IMAGE_TUMBNAILS: 2,
    SELECTED_IMAGE: 3
};

export { ManageGUI };
