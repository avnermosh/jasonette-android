/* eslint-disable no-case-declarations */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from './COL.js';
import { OrbitControlsPlanView } from './orbitControl/OrbitControlsPlanView.js';
import { OverlayRect } from './core/OverlayRect.js';
import { onClick_planThumbnail, onMouseDown_planThumbnailsPane } from './core/PlanThumbnailsView_eventListener.js';

// //////////////////////////////////////////////////////////

class ManageGUI {

    initGui() {
        console.log('BEG initGui');

        document.getElementById('planPaneWrapperId').onclick =
          this.showHideProjectMenu(false);

        document.getElementById('overlayRectPaneWrapperId').onclick =
           this.showHideProjectMenu(false);

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
            .addEventListener('click', function(){
                console.log('Clicked on openZipFileInputId');
                if( COL.util.isObjectValid(window.$agent_jasonette_android) ) {
                    // window.$agent_jasonette_android is defined, i.e. the client is the jasonette mobile app
                    // trigger a request to load the .zip file from the file system on the mobile device.
                    console.log('Before trigger media.loadZipFileHeaders'); 
                    window.$agent_jasonette_android.trigger('media.loadZipFileHeaders');
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

        this.showHideProjectMenu(true);
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


    async syncFromZipFileToWebServer() {
        console.log('BEG syncFromZipFileToWebServer'); 

        // let doUploadToWebServer = confirm("Uploading to the webserver will overwrite all pre-existing data for the site!");
        // if(!doUploadToWebServer)
        // {
        //     // The user cancelled the operation. Do not upload.
        //     return;
        // }

        let spinnerJqueryObj = $('#inProgressSpinnerId');
        spinnerJqueryObj.addClass('is-active');
        
        let toastTitleStr = 'Sync site plans from the zip file to the webserver';
        try {

            // /////////////////////////////////////////
            // sync the site to the webserver
            // do
            // - syncZipSitesWithWebServer2
            //   - syncZipSiteWithWebServer2
            //     - syncZipSitePlanWithWebServer2
            //       - syncZipSitePlanEntryWithWebServer2
            //       - syncZipSitePlanFilesWithWebServer2
            //         - syncFilesOfTheCurrentZipFileLayer2(imagesInfo, imageFilenames, syncRetVals)
            //         - syncFilesOfTheCurrentZipFileLayer2(metaDataFilesInfo, metaDataFilenames, syncRetVals)
            // /////////////////////////////////////////

            let retval1 = await COL.model.fileZip.syncZipSitesWithWebServer2();

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
                window.location.reload(true);
                // await COL.manageGUI.loadPlansAsThumbnails();
                
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
        console.log('BEG loadModelFromFile');

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
            var fileName = input.files[0].name;
            let sceneBar = COL.model.getSceneBar();
            // Convert from FileList to array
            // https://stackoverflow.com/questions/25333488/why-isnt-the-filelist-object-an-array
            let filesToOpenArray = Array.from(input.files);
            
            // await sceneBar.onChange_openZipFileButton1(filesToOpenArray);
            await sceneBar.onChange_openZipFileButton1(input);
            
            // For jasonette
            // onClick_openZipFileButton
        }
        let hamburgerBtnEl = document.getElementById('hamburgerBtnId');
        console.log('hamburgerBtnEl: ', hamburgerBtnEl);
        COL.manageGUI.setPane(hamburgerBtnEl);
        COL.manageGUI.showHideProjectMenu(false);
        
        let selectedLayer = COL.model.getSelectedLayer();
        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
        if(COL.util.isObjectValid(selectedOverlayRect)){
            selectedLayer.showSelectedOverlayRect();
            // selectedOverlayRect.setState(OverlayRect.STATE.ADD_PHOTO);
        }
    }

    async addOverlayRect(obj) {
        console.log('BEG addOverlayRect');

        let selectedLayer = COL.model.getSelectedLayer();
        let planView = selectedLayer.getPlanView();
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

    
    showPlanView(elementId) {
        let selectedLayer = COL.model.getSelectedLayer();
        console.log('selectedLayer.name', selectedLayer.name);
        console.log('selectedLayer.isLayerFromZipFile', selectedLayer.isLayerFromZipFile);
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

            COL.manageGUI.showHideProjectMenu(false);
            document.querySelector('#hamburgerBtnId').style.display = 'block';
        }
        else {
            // the projectMenu his hidden. Show the selected plan, hide the other plans
            document.querySelector('#planPaneWrapperId').style.display = 'block';
            document.querySelector('#planViewPaneId').style.display = 'block';
            document.querySelector('#planViewBackBtnId').style.display = 'block';
        }
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
                // clicked on element with tag 'img'
                isImgTag = true;
            }
            elementId = obj.id;
        }
        else {
            console.error('obj: ', obj);
            throw new Error(
                'obj is invalid. It should be an instance of event or DOM element.'
            );
        }

        // console.log('Hide everything');
        // At first: hide all buttons and panes to ensure that only one will be open
        COL.manageGUI.hideAllButtons();
        COL.manageGUI.hideAllPanes();

        console.log('elementId: ', elementId);

        if (isPlanImg) {
            // Show the planView
            COL.manageGUI.showPlanView(elementId);
            COL.clickedElements.push(elementId);
        }
        else if (isImgTag) {
            // Show the selectedImage

            // Handle by tag
            document.querySelector('#imageViewBackBtnId').style.display = 'block';
            document.querySelector('#overlayRectPaneWrapperId').style.display = 'block';
            document.querySelector('#imageViewPaneId').style.display = 'block';

            // push an undefined value, just so it can be popped out later
            COL.clickedElements.push(elementId);
        }
        else {
            // Handle by id
            if (!elementId) {
                throw new Error('elementId is invalid');
            }

            const items = document.getElementsByClassName('list-group-item active');
            switch (elementId) {
                case 'hamburgerBtnId':
                    document.querySelector('#hamburgerBtnId').style.display = 'block';

                    if (items[0].id === 'list-option-plans') {
                        // the "plans" option is selected in the projectMenu - show the allPlans pane
                        COL.manageGUI.showAllPlans();
                    }
                    else{
                        // another option in the hamburger menu was chosen that is not 'Plans' (e.g. 'Photos'). Don't showAllPlans
                    }

                    COL.manageGUI.showHideProjectMenu(true);
                    break;

                case 'planViewBackBtnId':
                    // Show allPlans
                    COL.manageGUI.showAllPlans();
                    break;

                case 'imagesBackBtnId':
                    // Show planView
                    const lastPlanViewId = COL.clickedElements.pop();
                    let selectedLayer = COL.model.getSelectedLayer();
                    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                    if (selectedOverlayRect.isMenuVisible) {
                        selectedOverlayRect.clearMenuThumbnailImage();
                    }
        
                    console.log('lastPlanViewId', lastPlanViewId);
                    COL.manageGUI.showPlanView(lastPlanViewId);
                    break;

                case 'overlayRectImageThumbnailsPaneId':
                    // Show overlayRect thumbnail images
                    document.querySelector('#imagesBackBtnId').style.display = 'block';
                    document.querySelector('#overlayRectPaneWrapperId').style.display = 'block';
                    document.querySelector('#overlayRectImageThumbnailsPaneId').style.display = 'block';
                    document.querySelector('#addPhotoIconId').style.display = 'block';
                    document.getElementById(elementId).style.display = 'block';
                    break;

                case 'imageViewBackBtnId':
                    // Show overlayRect thumbnail images
                    document.querySelector('#imagesBackBtnId').style.display = 'block';
                    document.querySelector('#overlayRectPaneWrapperId').style.display = 'block';
                    document.querySelector('#overlayRectImageThumbnailsPaneId').style.display = 'block';
                    document.querySelector('#addPhotoIconId').style.display = 'block';
                    COL.clickedElements.pop();
                    break;

                case 'list-option-plans':
                    document.querySelector('#hamburgerBtnId').style.display = 'block';
                    document.querySelector('#planPaneWrapperId').style.display = 'block';
                    document.querySelector('#planThumbnailsPaneId').style.display = 'block';

                    // toggle the ProjectMenu
                    COL.manageGUI.showHideProjectMenu(
                        !COL.manageGUI.isProjectMenuOn()
                    );
                    break;

                case 'list-option-photos':
                case 'list-option-people':
                case 'list-option-settings':
                    document.querySelector('#hamburgerBtnId').style.display = 'block';
                    // toggle the ProjectMenu
                    COL.manageGUI.showHideProjectMenu(
                        !COL.manageGUI.isProjectMenuOn()
                    );
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

        if(numPlans > 0) {
            // skipping i=0 which is for "no-plan-selected"
            for(let i = 1; i < numPlans; i++){
                let option = $('#sitesId')[0][i];
                // console.log('option.value', option.value); 
                // console.log('option.text', option.text); 

                let optionValueAsDict = JSON.parse(option.value);
                let sitePlanName = optionValueAsDict.site_name + '__' + optionValueAsDict.name;

                // create the layer and load the floorPlanImage
                let layer = await COL.colJS.loadLayer(sitePlanName);
                let floorPlanImageFilename = layer.getFloorPlanImageFilename();
                let blobUrl = await layer.getImageBlobUrl(floorPlanImageFilename);

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

                let numChars = 25;
                let siteSubName = this.truncateLongString(siteName, numChars);
                figcaptionEl.innerHTML = '<p class="p-class">' + siteSubName + '<br>' + layerSubname + '</p>';                  
                
                let planThumbnailEl =  document.createElement('img');
                // console.log('layer.isLayerFromZipFile', layer.isLayerFromZipFile);
                planThumbnailEl.setAttribute('id', layer.name);
                
                planThumbnailEl.setAttribute('src', blobUrl);
                planThumbnailEl.setAttribute('class','plan-image');
        
                planThumbnailEl.addEventListener('click', onClick_planThumbnail);
                planThumbnailEl.addEventListener('mousedown', onMouseDown_planThumbnailsPane, {
                    capture: false,
                    passive: false,
                });

                figureEl.appendChild(planThumbnailEl);
                figureEl.appendChild(figcaptionEl);
                liEl.appendChild(figureEl);
                planListEl.appendChild(liEl);
            }
        }
        else {
            // layer.clearRenderingOfThumbnailPlans();
        }
    }
      

    async showAllPlans() {
        // ////////////////////////////////////////////////////////
        // show all plans
        // ////////////////////////////////////////////////////////

        document.querySelector('#hamburgerBtnId').style.display = 'block';
        document.querySelector('#planPaneWrapperId').style.display = 'block';
        document.querySelector('#planThumbnailsPaneId').style.display = 'block';

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

    showHideProjectMenu(doShowProjectMenu) {
        console.log('BEG showHideProjectMenu');
        // show / hide the projectMenu
        const projectMenuEl = document.getElementById('project-menu-id');

        if(COL.util.isObjectValid(COL.model)) {
            let loggedInFlag = COL.model.getLoggedInFlag();
            if(loggedInFlag) {
                document.querySelector('#list-option-logInId').style.display = 'none';
                document.querySelector('#list-option-logOutId').style.display = 'block';
            }
            else{
                document.querySelector('#list-option-logInId').style.display = 'block';
                document.querySelector('#list-option-logOutId').style.display = 'none';
            }
        }
        else{
            document.querySelector('#list-option-logInId').style.display = 'block';
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

export { ManageGUI };