/* eslint-disable no-unreachable */
/* eslint-disable new-cap */
/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';
import { ImageView } from './ImageView.js';

// //////////////////////////////////////////////////////////////
//
// The Model file is 
//
// //////////////////////////////////////////////////////////////

import {
    WebGLRenderer as THREE_WebGLRenderer,
    Vector2 as THREE_Vector2,
    Color,
} from '../../static/three.js/three.js-r135/build/three.module.js';

//        WebGLRenderer as THREE_WebGL1Renderer,

import { COL } from  '../COL.js';
import { PlanView } from './PlanView.js';
// import { Whiteboard } from "./Whiteboard.js";
import '../util/Util.js';
import '../util/Util.AssociativeArray.js';
import './Core.js';
import { Layer } from './Layer.js';
import { SceneBar } from '../gui/SceneBar.js';
import { BrowserDetect } from '../util/browser_detect.js';
import { ImageInfo } from './ImageInfo.js';

/**
 * @file Defines the Model class
 */

/**         
 * @class Creates a new Model 
 * @param {String} name The name of the mesh file
 * @memberOf COL.core
 */

class Model {

    constructor(){
        this.minSoftwareVersion = '1.3.0';
        this.dbVersion = '1.0.0';
        this.fileZip = undefined;
        this.layers = new COL.util.AssociativeArray();
        this.selectedLayer = null;
        this.zipFilesInfo = new COL.util.AssociativeArray();
        this.selectedZipFileInfo = undefined;
        this.sceneBar = undefined;
        this.isUserLoggedIn = false;

        // ////////////////////////////////////
        // https://stackoverflow.com/questions/21548247/clean-up-threejs-webgl-contexts
        // set the rendererPlanView2 as a member of Model, so that it
        // does not get disposed when disposing Layer::planView.
        // ////////////////////////////////////
        
        this.rendererPlanView2 = undefined;
        this.rendererImageView = undefined;
        this.planThumbnailsPaneScrollPosition = {scrollTop: 0, scrollLeft: 0};
        this.isSyncedWithWebServer = undefined;

        this.doDisplayDemoSite = false;

        // container for the db operations that are executed in single request
        this.image_db_operations_array = [];

        // context-menu related variables
        this.timeoutID = undefined;
        this.isPlanThumbnailMenuVisible = false;

        // https://stackoverflow.com/questions/60350747/fabric-js-patterns-how-create-pattern-for-canvas-background-from-rects-without
        // fabric.devicePixelRatio = Math.max(Math.floor(fabric.devicePixelRatio), 1);
        fabric.devicePixelRatio = 1;

        // the width/height of the canvas is updated when loading the image
        // (no need to set it up at this stage of fabricCanvas construction)
        this.fabricCanvas = new fabric.Canvas('canvasId1', {
            // list of color names
            // http://fabricjs.com/docs/fabric.js.html#line6347
            backgroundColor: 'cadetblue',
            isDrawingMode: false,
            // PointerEvent is used instead of MouseEvent, and TouchEvent.
            enablePointerEvents: true
        });
        
        this.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(this.fabricCanvas);

        this.fabricCanvas.freeDrawingBrush.decimate = 100;
        this.fabricCanvas.freeDrawingBrush.width = 10;
        this.fabricCanvas.freeDrawingBrush.color = '#407e91';

        this.imageView = undefined;
                  
        this.fabricCanvas.on('after:render', function() {
            // console.log('BEG fabricCanvas.on after:render');
            let imageView = COL.model.getImageView();
            if(COL.util.isObjectValid(imageView)) {
                if(COL.util.isObjectValid(imageView.surface)) {
                    imageView.surface.material.map.needsUpdate = true;
                }
            }
        });

        fabric.Object.prototype.objectCaching = true;

        this.fabricCanvas.on('path:created', async function(opt) {
            // console.log('BEG path:created');

            let imageView = COL.model.getImageView();
            if(COL.util.isObjectValid(imageView)) {
                if(COL.util.isObjectValid(imageView.surface)) {
                    imageView.surface.material.map.needsUpdate = true;
                }
            }

            COL.model.fabricCanvas.renderAll();
            ImageView.Render2();
            // sync the updated imageInfo to the webServer after creating a path.
            let selectedLayer = COL.model.getSelectedLayer();
            let imageInfo = ImageInfo.getSelectedImageInfo(selectedLayer);
            await imageInfo.updateAnnotationBlob();
        });
    }

    getDoDisplayDemoSite() {
        return this.doDisplayDemoSite;
    }

    setDoDisplayDemoSite(doDisplayDemoSite) {
        this.doDisplayDemoSite = doDisplayDemoSite;
    }

    getFabricCanvas() {
        return this.fabricCanvas;
    }
    
    getimageViewPaneSize2() {
        // console.log('BEG getimageViewPaneSize2');
        let imageViewPaneEl = $('#imageViewPaneId');
        let imageViewPaneSize = {width: imageViewPaneEl.innerWidth(),
            height: imageViewPaneEl.innerHeight()};

        return imageViewPaneSize;
    }

    setRendererImageViewPane () {
        let selectedImage3dCanvasEl = document.getElementById('selectedImage3dCanvasId');
        if(COL.doUseWebGL2) {
            this.rendererImageView = new THREE_WebGLRenderer({
                preserveDrawingBuffer: false,
                alpha: true,
                canvas: selectedImage3dCanvasEl});
        }
        else {
            // force webGL1
            this.rendererImageView = new THREE_WebGL1Renderer({
                preserveDrawingBuffer: false,
                alpha: true,
                canvas: selectedImage3dCanvasEl});
        }
        
        let rendererImageView_isWebGL2 = this.rendererImageView.capabilities.isWebGL2;
        console.log('rendererImageView_isWebGL2', rendererImageView_isWebGL2);

        let factor = 0.5;
        // factor = 0.1;
        factor = 1.0;
        console.log('factor', factor); 
        
        this.rendererImageView.setPixelRatio(window.devicePixelRatio * factor);
        let imageViewPaneSize = this.getimageViewPaneSize2();
        this.rendererImageView.setSize( imageViewPaneSize.width, imageViewPaneSize.height );
        
        // Webgl canvas background color
        this.rendererImageView.setClearColor(0XDBDBDB, 1);

        let rendererImageViewPaneJqueryObject = $('#' + this.rendererImageView.domElement.id);
        rendererImageViewPaneJqueryObject.addClass('showFullSize');
    }
    
    createAdvancedSettingModal () {
        // --------------------------------------------------------------
        // http://jsfiddle.net/Transformer/5KK5W/
        // for date setting
        
        // https://mdbootstrap.com/docs/standard/forms/checkbox/
        // for checkbox setting in table cell

        // define the PlanView Settings Modal, which includes:
        // - slider for the radius of the overlayRect
        // - milestoneDates table
        // - tbd - option to see cross-hair between the 2 fingers

        let dataSliderInitialValue = 2;
        let rowNum = this.milestoneDatesRowNum;
        
        // value="Remove1" sets the label inside the button (as opposed to setting it besides the button if used after the element)
        let planViewSettingModalEl = `
<div class="modal fade" id="basicModal" tabindex="-1" role="dialog" aria-labelledby="basicModal" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-bs-dismiss="modal" aria-hidden="true">&times;</button>
        <h3 class="modal-title" id="myModalLabel">PlanView Settings Modal</h3>
      </div>
      <div id="modalBodyId" class="modal-body">
        <label>
          Server address:
          <input id="serverAddressId" type="text" value="bldlog.com"/>
        </label>
        <label>
          Load Demo Site
          <input type="checkbox" id="doDisplayDemoSiteId" name="checkbox1" value="value1">
        </label>
        <p>
            Software Version: <span id="softwareVersionId"></span>
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-bs-dismiss="modal">Cancel</button>
        <button type="button" id="advancedSettingSaveBtnId" class="btn btn-primary">Save changes</button>
      </div>
    </div>
  </div>
</div>
`;
        
        $('#main-container-id').append(planViewSettingModalEl);
    }

    initAdvancedViewSettingModal () {
        console.log('BEG initAdvancedViewSettingModal');

        this.createAdvancedSettingModal();
        
        // define the PlanView Settings Modal button
        this.advancedSettingModalBtnEl = '<a href="#" class="ui-button" data-bs-toggle="modal" data-bs-target="#basicModal" id="advanced-settings-modal-btn">☰</a>';

        $('#project-menu-id').append(this.advancedSettingModalBtnEl);

        $('#advanced-settings-modal-btn').click(function() {
            console.log('BEG onclick advanced-settings-modal-btn');
        });

        document.getElementById('advancedSettingSaveBtnId').onclick = function() {
            console.log('BEG advancedSettingSaveBtnId');
        };     

        document.getElementById('serverAddressId').onchange = function(){
            console.log('BEG onchange serverAddressId');
            let serverAddress = document.getElementById('serverAddressId').value;
            console.log('serverAddressId', serverAddress);
            COL.util.setDataToIndexedDb('serverAddress', serverAddress);
        };
        document.getElementById('doDisplayDemoSiteId').onchange = function(){
            // console.log('BEG onchange doDisplayDemoSiteId');
            COL.util.setDataToIndexedDb('doDisplayDemoSite', this.checked);
            this.setDoDisplayDemoSite(this.checked);
        };
    }

    async updateSettingsOnClientSide(){
        // fill in the field serverAddress from localforage indexedDb
        let serverAddressVal = await COL.util.getDataFromIndexedDb('serverAddress');
        document.getElementById('serverAddressId').value = serverAddressVal;
        document.getElementById('softwareVersionId').innerText = COL.softwareVersion;

        // Update the status of doDisplayDemoSite in the web page and load the demo_site if doDisplayDemoSite is selected 

        // tbd - investigate why calling getDataFromIndexedDb()
        //       causes the scrollPosition to not restore to the previous location
        // let doDisplayDemoSite = await COL.util.getDataFromIndexedDb('doDisplayDemoSite');
        let doDisplayDemoSite = this.getDoDisplayDemoSite();
        document.getElementById('doDisplayDemoSiteId').checked = doDisplayDemoSite;

        const url = new URL(window.location);
        let hostname = undefined;

        if(window.location.protocol == 'file:') {
            hostname = 'local device';
        }
        else {
            hostname = url.hostname;
        }

        document.getElementById('settingStrId').innerText = 'Host: ' + hostname + '\n' + 'Software Version: ' + COL.softwareVersion;
    }
    async initModel() {
        // console.log('BEG initModel');

        let startTime1 = performance.now();
        let isConnectedToServer;
        try {
            let dbSystemParamsAsJson = await this.getDbSystemParams();
            // force setting COL.doWorkOnline to false
            // throw new Error('dummy throw');
            isConnectedToServer = true;
        }
        catch(err){
            // getDbSystemParams failed with exception.
            // This indicates that there is no connection to the server (e.g. server is down, or internet is down, etc..)
            console.log('Detected no connection to the server.');
            isConnectedToServer = false;
        }
        COL.colJS.setConnectionToTheServerStatus(isConnectedToServer);

        let endTime1 = performance.now();
        let duration1 = endTime1 - startTime1;
        console.log('duration1: ' + duration1 + ' milliseconds.');
        

        let getCurrentUserResultAsJson = {dummy_val: 'True'};
        COL.model.setLoggedInFlag(false);
        COL.doWorkOnline = false;
        if(isConnectedToServer) {
            // //////////////////////////////////////////////////////////////////////////////
            // check if the user is logged-on
            // //////////////////////////////////////////////////////////////////////////////

            // http://localhost/api/v1_2/get_current_user
            getCurrentUserResultAsJson = await this.get_current_user();
            if(getCurrentUserResultAsJson['user_email']) {
                COL.model.setLoggedInFlag(true);
                // the machine is connected to the server and the user is logged-in.
                COL.doWorkOnline = true;
            }
        }

        console.log('COL.doWorkOnline', COL.doWorkOnline);
        this.browserDetect = undefined;
        this.detectUserAgent();
        
        this.sceneBar = new SceneBar(COL.component);

        let user_role = getCurrentUserResultAsJson['user_role'];
        console.log('user_role', user_role); 

        if(COL.isOldGUIEnabled) {
            await this.sceneBar.initSceneBar(user_role, COL.component);
        }
        else{
            // await this.sceneBar.initSceneBar(user_role, COL.component);
            // create the advancedSetting modal (e.g. set the server address)
            this.initAdvancedViewSettingModal();
        }

        // //////////////////////////////////////////////////////////////////////////////
        // Set renderers:
        // - this.rendererPlanView2
        // - this.rendererImageView
        // //////////////////////////////////////////////////////////////////////////////

        // https://stackoverflow.com/questions/21548247/clean-up-threejs-webgl-contexts
        // set the rendererPlanView2 as a member of Model, so that it does
        // not get disposed when disposing Layer::planView.

        let canvasPlanViewEl = document.getElementById('planView3dCanvasId');
        if(COL.doUseWebGL2) {
            this.rendererPlanView2 = new THREE_WebGLRenderer({antialias: true, canvas: canvasPlanViewEl});
        }
        else {
            // force webGL1
            this.rendererPlanView2 = new THREE_WebGL1Renderer({antialias: true, canvas: canvasPlanViewEl});
        }

        let rendererPlanView2_isWebGL2 = this.rendererPlanView2.capabilities.isWebGL2;
        console.log('rendererPlanView2_isWebGL2', rendererPlanView2_isWebGL2);
            
        // Set the background color, and the opacity of the canvas
        // https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setClearColor
        this.rendererPlanView2.setClearColor (0xffffff, 0.9);

        let planViewPaneEl = document.getElementById('planViewPaneId');

        const toggleToolbar = document.querySelectorAll('.toggle-toolbar');
        const stickyToolbarContainer1 = document.querySelector(
            '.sticky-toolbar-container1'
        );
                
        toggleToolbar.forEach(function (element) {
            element.addEventListener('click', function () {
                stickyToolbarContainer1.classList.toggle('show-toolbar');
            });
        });
    
        this.setRendererImageViewPane();

        this.imageView = new ImageView();
        this.imageView.initSelectedView();

        if(COL.doEnableWhiteboard) {
            // //////////////////////////////////////////////////////////////////////////////
            // Set floorPlanWhiteboard
            // //////////////////////////////////////////////////////////////////////////////

            // let floorPlanWhiteboard = document.getElementById("floorPlanWhiteboardId");
            // planViewPaneEl.appendChild(floorPlanWhiteboard);
        }
            
        // //////////////////////////////////////////////////////////////////////////////
        // Report rendererPlanView2 webGL capabilities
        // //////////////////////////////////////////////////////////////////////////////

        let isWebGL2 = this.rendererPlanView2.capabilities.isWebGL2;
        console.log('isWebGL2', isWebGL2);
        console.log('Layer.maxNumImageBlobsInMeomry', Layer.maxNumImageBlobsInMeomry);
            
        // console.log('this.rendererPlanView2.capabilities', this.rendererPlanView2.capabilities);
        // console.log('this.rendererPlanView2.capabilities.maxTextureSize', this.rendererPlanView2.capabilities.maxTextureSize);

        if(!COL.doWorkOnline && COL.util.isObjectValid(window.$agent_jasonette_android)) {
            // tbd - investigate why calling getDataFromIndexedDb()
            //       causes the scrollPosition to not restore to the previous location
            // let doDisplayDemoSite = await COL.util.getDataFromIndexedDb('doDisplayDemoSite');
            let doDisplayDemoSite = this.getDoDisplayDemoSite();
            if(doDisplayDemoSite) {
                // in mobile app (e.g. jasonette-android), and offline mode
                // load canned demo siteplan.
                // in online mode, the demo_site is loaded from the webserver)
                window.$agent_jasonette_android.trigger('media.loadDemoZipFileHeaders');
            }
        }

        this.detectWebGL();

        // enable all the tooltips
        // https://getbootstrap.com/docs/5.2/components/tooltips/
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        this.updateSettingsOnClientSide();

    }

    getImageView () {
        return this.imageView;
    }

    getSyncWithWebServerStatus() {
        return this.isSyncedWithWebServer;
    }
        
    setSyncWithWebServerStatus(otherIsSyncedWithWebserver) {
        this.isSyncedWithWebServer = otherIsSyncedWithWebserver;
        COL.util.setSyncWithWebServerStatus(this.isSyncedWithWebServer);
    }

    updateIsSyncedWithWebServer() {
        // console.log('BEG updateIsSyncedWithWebServer');

        let foundNonSyncedLayer = false;
        let iter = this.layers.iterator();
        while (iter.hasNext()) {
            let layerObj = iter.next();
            if(!layerObj.getSyncWithWebServerStatus()) {
                this.setSyncWithWebServerStatus(false);
                foundNonSyncedLayer = true;
                break;
            }
        }
        if(!foundNonSyncedLayer) {
            this.setSyncWithWebServerStatus(true);
        }
    }

    detectUserAgent () {
        // console.log('BEG detectUserAgent');
        
        this.browserDetect = new BrowserDetect();
        this.browserDetect.init();

        // e.g. For Pixel3:
        // navigator.userAgent Mozilla/5.0 (Linux; Android 11; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36
        // console.log('navigator.userAgent', navigator.userAgent); 
        // console.log('this.browserDetect.OS', this.browserDetect.OS);
        console.log('this.browserDetect.browser', this.browserDetect.browser);
        console.log('this.browserDetect.version', this.browserDetect.version);

        // raise a toast to show the browser type
        // let toastTitleStr = 'BrowserDetect';
        let msgStr = navigator.userAgent + ', OS: ' +
            this.browserDetect.OS + ', Browser: ' +
            this.browserDetect.browser + ', Version: ' +
            this.browserDetect.version;
        // toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        console.log('msgStr', msgStr); 
    }

    getBrowserDetect () {
        return this.browserDetect;
    }

    detectWebGL () {
        // console.log('BEG detectWebGL');
        
        // https://stackoverflow.com/questions/23769780/how-to-get-opengl-version-using-javascript
        const gl = document.createElement('canvas').getContext('webgl');
        if(gl) {
            // console.log(gl.getParameter(gl.VERSION));
            // console.log(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
            // console.log(gl.getParameter(gl.VENDOR));
        }
        else {
            // console.log('webgl is not supported'); 
        }

        const gl2 = document.createElement('canvas').getContext('webgl2');
        if(gl2) {
            // console.log(gl2.getParameter(gl2.VERSION));
            // console.log(gl2.getParameter(gl2.SHADING_LANGUAGE_VERSION));
            // console.log(gl2.getParameter(gl2.VENDOR));
        }
        else {
            // console.log('webgl2 is not supported'); 
        }
    }

    getRendererPlanView () {
        return this.rendererPlanView2;
    }

    getRendererImageViewPane () {
        return this.rendererImageView;
    }
    
    getSceneBar () {
        return this.sceneBar;
    }

    getUrlImagePathBase () {
        return 'avner/img';
    }

    static GetUrlBase () {
        // console.log('BEG GetUrlBase');

        // console.log('window.$agent_jasonette_android', window.$agent_jasonette_android);
        // console.log('window.location.origin', window.location.origin);
        let urlBase;
        if(window.location.origin == 'file://'){
            // In mobile app, and using the local html,js,css files.
            // Add dummy origin to satisfy the fetch request.
            // (e.g. change from file:///android_asset/file/root/js/col/core/Model.js 
            // to https://192.168.1.79/android_asset/file/root/js/col/core/Model.js)
            // 
            // Webview will then intercept the fetch the request and respond properly.
            // (if not adding the dummy origin, an error occurs: 'URL scheme "file" is not supported')
            urlBase ='https://192.168.1.79/';
        }
        else{
            // In browser (e.g. chrome, firefox), and pointing to remote server (e.g. https://bldlog.com, https://192.168.1.74), or
            // in mobile app, and pointing to remote server.
            urlBase = window.location.origin + '/';
        }
        
        // console.log('urlBase', urlBase);

        return urlBase;
    }

    async get_current_user() {
        // console.log('BEG get_current_user'); 

        let serverAddress = await COL.util.getDataFromIndexedDb('serverAddress');
        let queryUrl = 'https://' + serverAddress + '/api/v1_2/get_current_user';

        let fetchData = { 
            timeout: COL.fetchTimeoutInMilliSec
        };
        let dataAsJson = await COL.util.fetchWithTimeout(queryUrl, fetchData)
            .then(response => response.json());

        return dataAsJson;
    }

    getZipFilesInfo () {
        return this.zipFilesInfo;
    }

    setZipFilesInfo (zipFileInfo) {
        this.zipFilesInfo.set(zipFileInfo.zipFileName, zipFileInfo);
    }

    getSelectedZipFileInfo () {
        return this.selectedZipFileInfo;
    }

    setSelectedZipFileInfo (zipFileInfo) {
        this.selectedZipFileInfo = zipFileInfo;
    }

    getMinSoftwareVersion () {
        return this.minSoftwareVersion;
    }

    getDbVersion () {
        return this.dbVersion;
    }

    getPlanThumbnailsPaneScrollPosition () {
        return this.planThumbnailsPaneScrollPosition;
    }

    setPlanThumbnailsPaneScrollPosition (planThumbnailsPaneScrollPosition) {
        this.planThumbnailsPaneScrollPosition = planThumbnailsPaneScrollPosition;
    }

    createLayer ({planInfo, isLayerFromZipFile=false}) {
        // console.log('BEG createLayer');

        let layerName = Layer.CreateLayerName(planInfo.siteName, planInfo.name);
        let layer = this.layers.getByKey(layerName);
        if(COL.util.isObjectValid(layer)) {
            // tbd - currently - removing the existing layer - still leaves the existing layer in the sitePlan menu
            //       Remove from the site plan as well? or only after syncing to the webserver ??
            //       Add a warning that syncing to the webserver will wipe previous data of the layer ??
            //
            // console.log('remove the existing layer before creating the new layer'); 
            // remove the existing layer before creating the new layer
            this.removeLayerByName(layerName);
            // throw('Layer already exists');
        }

        // console.log('this.layers.size()', this.layers.size()); 
        layer = new Layer(layerName, planInfo, isLayerFromZipFile);
        layer.initLayer();
        return layer;
    }

    getLayerByName (name) {
        // this.printLayersInfo2();
        return this.layers.getByKey(name);
    }

    getLayerFromLayersList (planInfo) {

        if(COL.util.isObjectInvalid(planInfo)) {
            // at this point planInfo must be defined
            throw new Error('planInfo is invalid');
        }
        
        let layer = undefined;
        let iter = this.layers.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let layerKey = keyVal[0];
            let layerVal = keyVal[1];

            // console.log('layerKey', layerKey); 
            // console.log('layerVal', layerVal);

            let layerPlanInfo = layerVal.getPlanInfo();
            if(layerPlanInfo && (layerPlanInfo.siteId == planInfo.siteId) && 
                (layerPlanInfo.id == planInfo.id) &&
                (layerPlanInfo.name == planInfo.name)) {
                layer = layerVal;
                break;
            }
        }
        
        return layer;
    }
    
    printLayersInfo2 () {

        console.log('layers.size()', this.layers.size());
        
        let iter = this.layers.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let layerName = keyVal[0];
            let layerObj = keyVal[1];

            console.log('layerName', layerName); 
            console.log('layerObj', layerObj);
            // let imagesInfo = layer.getImagesInfo();
            // imagesInfo.printKeysAndValues();
        }
    }
    
    async loadLayerFromWebServer(planInfo) {
        let layer = COL.model.createLayer({planInfo: planInfo});

        // "https://192.168.1.75/avner/img/168/188/geographic_map.layer0.json"
        let planFilename = planInfo.planFilename;
        // console.log('planFilename', planFilename);

        let queryUrl = Model.GetUrlBase() + COL.model.getUrlImagePathBase() +
            '/' + planInfo.siteId + '/' +
            planInfo.id + '/' + planFilename;
        
        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);
        let dataAsJson = await response.json();
        // console.log('dataAsJson', dataAsJson);
        // get the generalInfo section from the entire json data
        let generalInfoAsJson = dataAsJson['generalInfo'];
        let layerSoftwareVersion = COL.util.getNestedObject(dataAsJson, ['generalInfo', 'softwareVersion']);
        if(COL.util.isObjectInvalid(layerSoftwareVersion)) {
            let msgStr = 'softwareVersion is invalid. planFilename: ' + planFilename;
            throw new Error(msgStr);
        }

        if(!COL.loaders.utils.validateVersion(layerSoftwareVersion, COL.model.getMinSoftwareVersion(), 'GreaterOrEqual')) {
            let msgStr = 'Version validation failed while loading layer from web server. planFilename: ' + planFilename;
            throw new Error(msgStr);
        }

        layer.setGeneralInfo(generalInfoAsJson);

        // load the layer from the webserver
        await COL.loaders.CO_ObjectLoader.loadLayerJson_fromWebServer(layer, planInfo.siteId, planInfo.id);

        if(COL.loaders.utils.isSemVerSmaller(layerSoftwareVersion, COL.getSoftwareVersion())) {
            // migrate the layer to the new vesion
            layer.migrateVersion(layerSoftwareVersion, COL.getSoftwareVersion(), generalInfoAsJson);
        }

        COL.model.addLayerToList(layer);

        return layer;
    }


    addLayerToList (layer) {
        // console.log('BEG addLayerToList'); 
        // TBD - why add Layer is called multiple times
        
        if (!(layer instanceof Layer)) {
            console.error('The parameter must be an instance of Layer');
            return;
        }

        // Add/update layer to layers            
        this.layers.set(layer.name, layer);
    }

    async selectLayerByName (layerName) {
        let layer = this.layers.getByKey(layerName);
        if(COL.util.isObjectValid(layer)) {
            await this.setSelectedLayer(layer);
        }
    }

    removeLayerByName (name) {
        // console.log('BEG removeLayerByName');

        // console.log('this.layers', this.layers);
        // this.layers.printKeysAndValues();
        
        let layer = this.getLayerByName(name);

        // https://www.tutorialrepublic.com/faq/how-to-determine-if-variable-is-undefined-or-null-in7-javascript.php
        // check for both undefined, null with the "equality operator" "==" (as opposed to the "strict equality operator" "===" )
        if(COL.util.isObjectValid(layer)) {
            layer = this.layers.remove(layer.name);
            if (layer) {

                console.log('layer', layer); 
                
                layer.dispose();
                layer = null;
                // delete layer;
            }
            if (COL.util.isObjectValid(this.selectedLayer) && (this.selectedLayer.name == name)) {
                // The removed layer was the selected layer. Clear the selected layer
                this.selectedLayer = undefined;
            }
        }
    }

    async setSelectedLayer(layer) {
        console.log('BEG setSelectedLayer'); 

        // //////////////////////////////////////////////////////////////////////////////
        // Setup the new selectedLayer
        // //////////////////////////////////////////////////////////////////////////////

        this.selectedLayer = layer;

        if(this.selectedLayer.isLayerFromZipFile) {
            // update the selectedZipFileInfo
            let selectedLayerZipFileName = this.selectedLayer.planInfo.zipFileName;
            let zipFileInfo = COL.model.getZipFilesInfo().getByKey(selectedLayerZipFileName);
            COL.model.setSelectedZipFileInfo(zipFileInfo);
        }

        if(COL.util.isObjectInvalid(layer)) {
            // unselect the layer
            // mark the plan in the siteplan menu to the "No sites selected"
            $('#sitesId')[0].selectedIndex = 0;

        }
        else {
            await this.selectedLayer.updateImageThumbnailsRelatedRenderring();

            // //////////////////////////////////////////////////////////////////////////////
            // Adjust the camera, canvas, renderer, and viewport1 to the planViewPane
            // //////////////////////////////////////////////////////////////////////////////

            let planView = COL.getPlanView();
            // Set doRescale so that the camera position is restored from the layer.json file
            let doRescale = false;
            doRescale = true;
            planView.set_camera_canvas_renderer_and_viewport1(doRescale);
            $(document).trigger('SceneLayerSelected', [this.selectedLayer]);
        }
        
        this.selectedLayer.setPlanViewForSelectedLayer();
    }

    getSelectedLayer () {
        return this.selectedLayer;
    }
    
    getLayers () {
        return this.layers;
    }

    async getSiteByName(siteName) {
        
        // ////////////////////////////////////////////////
        // Query - get_site_by_name
        // ////////////////////////////////////////////////

        // http://localhost/api/v1_2/get_site_by_name/modelWith4Images
        // console.log('Query - get_site_by_name'); 
        
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_site_by_name/' + siteName;
        // console.log('queryUrl', queryUrl);

        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);

        let dataAsJson = await response.json();
        return dataAsJson;
    }
    
    
    /**
     * Removes the object from memory
     */
    dispose () {
        console.log('BEG Model::dispose()');
        throw('Not implemented yet');

        // https://github.com/mrdoob/three.js/blob/master/examples/webgl_test_memory2.html
        // let rendererPlanView = COL.model.getRendererPlanView();
        // rendererPlanView.forceContextLoss();
        // rendererPlanView.context = null;
        // rendererPlanView.domElement = null;
        // rendererPlanView = null;
        // rendererPlanView.dispose();

        this.imageView.dispose();
        COL.planView.dispose();

        this.name = null;
    }

    isStickyNotesEnabled () {
        return false;
        // return true;
    }

    getLoggedInFlag () {
        return this.isUserLoggedIn;
    }

    setLoggedInFlag (isUserLoggedIn) {
        // console.log('BEG setLoggedInFlag');

        if(isUserLoggedIn) {
            $('#loggedInStatusId').removeClass('logged-out');
            $('#loggedInStatusIconId').removeClass('bi-arrow-left-square');

            $('#loggedInStatusId').addClass('logged-in');
            $('#loggedInStatusIconId').addClass('bi-arrow-right-square');
        }
        else{
            $('#loggedInStatusId').removeClass('logged-in');
            $('#loggedInStatusIconId').removeClass('bi-arrow-right-square');

            $('#loggedInStatusId').addClass('logged-out');
            $('#loggedInStatusIconId').addClass('bi-arrow-left-square');
        }
        this.isUserLoggedIn = isUserLoggedIn;
    }

    async getDbSystemParams () {
        // console.log('BEG getDbSystemParams');
        
        let startTime1 = performance.now();
        // let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_system_params';

        let serverAddress = await COL.util.getDataFromIndexedDb('serverAddress');
        let queryUrl = 'https://' + serverAddress + '/api/v1_2/get_system_params';
        // https://localhost/api/v1_2/get_system_params
        // console.log('queryUrl', queryUrl); 

        // let response = await fetch(queryUrl);
        let response;
        try {
            let fetchData = { 
                method: 'GET',
                timeout: COL.fetchTimeoutInMilliSec
            };

            response = await COL.util.fetchWithTimeout(queryUrl, fetchData);
        }
        catch (err) {
            // Timeouts with err.name === 'AbortError', if the request takes longer than COL.fetchTimeoutInMilliSec
            if(err.name === 'AbortError') {
                console.error('Fetch request from the web server timed out. err: ' + err);
            }
        }

        let endTime1 = performance.now();
        let duration1 = endTime1 - startTime1;
        console.log('duration1: ' + duration1 + ' milliseconds.');
        // console.log('response', response);
        await COL.errorHandlingUtil.handleErrors(response);
        let dbSystemParamsAsJson = await response.json();
        let endTime2 = performance.now();
        let duration2 = endTime2 - startTime1;
        console.log('duration2: ' + duration2 + ' milliseconds.');
        // console.log('dbSystemParamsAsJson', dbSystemParamsAsJson); 
        return dbSystemParamsAsJson;
    }

}
  
export { Model };
