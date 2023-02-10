/* eslint-disable no-unreachable */
/* eslint-disable new-cap */
/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

// //////////////////////////////////////////////////////////////
//
// The Model file is 
//
// //////////////////////////////////////////////////////////////

import {WebGLRenderer as THREE_WebGLRenderer,
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
        this.minSoftwareVersion = '1.0.0';
        this.dbVersion = '1.0.0';
        this.fileZip = undefined;
        this._layers = new COL.util.AssociativeArray();
        this._selectedLayer = null;
        this._zipFilesInfo = new COL.util.AssociativeArray();
        this._selectedZipFileInfo = undefined;
        this.sceneBar = undefined;
        this.isUserLoggedIn = false;
        this._rendererPlanView2 = undefined;
        this._rendererImageViewPane = undefined;
        this.planThumbnailsPaneScrollPosition = undefined;
        this.isSyncedWithWebServer = undefined;

        // container for the db operations that are executed in single request
        this.image_db_operations_array = [];

        // context-menu related variables
        this.timeoutID = undefined;
        this.isPlanThumbnailMenuVisible = false;

        this.csrf_token = COL.util.getCSRFToken();
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
            this._rendererImageViewPane = new THREE_WebGLRenderer({
                preserveDrawingBuffer: false,
                alpha: true,
                canvas: selectedImage3dCanvasEl});
        }
        else {
            // force webGL1
            this._rendererImageViewPane = new THREE_WebGL1Renderer({
                preserveDrawingBuffer: false,
                alpha: true,
                canvas: selectedImage3dCanvasEl});
        }

        
        let _rendererImageViewPane_isWebGL2 = this._rendererImageViewPane.capabilities.isWebGL2;
        console.log('_rendererImageViewPane_isWebGL2', _rendererImageViewPane_isWebGL2);

        let factor = 0.5;
        // factor = 0.1;
        factor = 1.0;
        console.log('factor', factor); 
        
        this._rendererImageViewPane.setPixelRatio(window.devicePixelRatio * factor);
        let imageViewPaneSize = this.getimageViewPaneSize2();
        this._rendererImageViewPane.setSize( imageViewPaneSize.width, imageViewPaneSize.height );
        
        // Webgl canvas background color
        this._rendererImageViewPane.setClearColor(0XDBDBDB, 1);

        let rendererImageViewPaneJqueryObject = $('#' + this._rendererImageViewPane.domElement.id);
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
        let rowNum = this._milestoneDatesRowNum;
        
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
        this._advancedSettingModalBtnEl = '<a href="#" class="ui-button" data-bs-toggle="modal" data-bs-target="#basicModal" id="advanced-settings-modal-btn">☰</a>';

        $('#project-menu-id').append(this._advancedSettingModalBtnEl);

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
            COL.model.setDataToIndexedDb('serverAddress', serverAddress);
        };
        document.getElementById('doDisplayDemoSiteId').onchange = function(){
            // console.log('BEG onchange doDisplayDemoSiteId');
            COL.model.setDataToIndexedDb('doDisplayDemoSite', this.checked);
        };
    }

    async updateSettingsOnClientSide(){
        // fill in the field serverAddress from localforage indexedDb
        let serverAddressVal = await this.getDataFromIndexedDb('serverAddress');
        document.getElementById('serverAddressId').value = serverAddressVal;
        document.getElementById('softwareVersionId').innerText = COL.softwareVersion;

        // Update the status of doDisplayDemoSite in the web page and load the demo_site if doDisplayDemoSite is selected 
        let doDisplayDemoSite = await this.getDataFromIndexedDb('doDisplayDemoSite');
        // console.log('doDisplayDemoSite', doDisplayDemoSite);
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
        // let dbSystemParamsAsJson;
        try {
            let dbSystemParamsAsJson = await this.getDbSystemParams();
            // force setting COL.doWorkOnline to false
            // throw new Error('dummy throw');
            COL.colJS.setConnectionToTheServerStatus(true);
        }
        catch(err){
            // getDbSystemParams failed with exception.
            // This indicates that there is no connection to the server (e.g. server is down, or internet is down, etc..)
            console.log('Detected offline mode.');
            COL.colJS.setConnectionToTheServerStatus(false);
        }

        let endTime1 = performance.now();
        let duration1 = endTime1 - startTime1;
        console.log('duration1: ' + duration1 + ' milliseconds.');
        
        console.log('COL.doWorkOnline before', COL.doWorkOnline);
        console.log('COL.doWorkOnline after', COL.doWorkOnline);

        let getCurrentUserResultAsJson = {dummy_val: 'True'};
        COL.model.setLoggedInFlag(false);
        if(COL.doWorkOnline) {
            // //////////////////////////////////////////////////////////////////////////////
            // check if the user is logged-on
            // //////////////////////////////////////////////////////////////////////////////

            // http://localhost/api/v1_2/get_current_user
            getCurrentUserResultAsJson = await this.get_current_user();
            if(getCurrentUserResultAsJson['user_email']) {
                COL.model.setLoggedInFlag(true);
            }
        }

        this._browserDetect = undefined;
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
        // - this._rendererPlanView2
        // - this._rendererImageViewPane
        // //////////////////////////////////////////////////////////////////////////////

        // https://stackoverflow.com/questions/21548247/clean-up-threejs-webgl-contexts
        // set the _rendererPlanView2 as a member of Model, so that it does
        // not get disposed when disposing Layer::planView.

        let canvasPlanViewEl = document.getElementById('planView3dCanvasId');
        if(COL.doUseWebGL2) {
            this._rendererPlanView2 = new THREE_WebGLRenderer({antialias: true, canvas: canvasPlanViewEl});
        }
        else {
            // force webGL1
            this._rendererPlanView2 = new THREE_WebGL1Renderer({antialias: true, canvas: canvasPlanViewEl});
        }

        let _rendererPlanView2_isWebGL2 = this._rendererPlanView2.capabilities.isWebGL2;
        console.log('_rendererPlanView2_isWebGL2', _rendererPlanView2_isWebGL2);
            
        // Set the background color, and the opacity of the canvas
        // https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setClearColor
        this._rendererPlanView2.setClearColor (0xffffff, 0.9);

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

        if(COL.doEnableWhiteboard) {
            // //////////////////////////////////////////////////////////////////////////////
            // Set floorPlanWhiteboard
            // //////////////////////////////////////////////////////////////////////////////

            // let floorPlanWhiteboard = document.getElementById("floorPlanWhiteboardId");
            // planViewPaneEl.appendChild(floorPlanWhiteboard);
        }
            
        // //////////////////////////////////////////////////////////////////////////////
        // Report _rendererPlanView2 webGL capabilities
        // //////////////////////////////////////////////////////////////////////////////

        let isWebGL2 = this._rendererPlanView2.capabilities.isWebGL2;
        console.log('isWebGL2', isWebGL2);
        console.log('Layer.maxNumImageBlobsInMeomry', Layer.maxNumImageBlobsInMeomry);
            
        // console.log('this._rendererPlanView2.capabilities', this._rendererPlanView2.capabilities);
        // console.log('this._rendererPlanView2.capabilities.maxTextureSize', this._rendererPlanView2.capabilities.maxTextureSize);

        if(!COL.doWorkOnline && COL.util.isObjectValid(window.$agent_jasonette_android)) {
            let doDisplayDemoSite = await this.getDataFromIndexedDb('doDisplayDemoSite');
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

    async setDataToIndexedDb(key, data) {
        await localforage.setItem(key, data);
        console.log('Data has been saved to local db.');
    }

    async getDataFromIndexedDb(key) {
        let val1 = await localforage.getItem(key);
        if(key == 'serverAddress' && COL.util.isObjectInvalid(val1) ) {
            val1 = 'bldlog.com';
        }
        console.log('val1', val1);

        return val1;
    }

    getSyncWithWebServerStatus() {
        return this.isSyncedWithWebServer;
    }
        
    setSyncWithWebServerStatus(otherIsSyncedWithWebserver) {
        this.isSyncedWithWebServer = otherIsSyncedWithWebserver;
        COL.util.setSyncWithWebServerStatus(this.isSyncedWithWebServer);
    }

    updateIsSyncedWithWebServer() {
        console.log('BEG updateIsSyncedWithWebServer');

        let foundNonSyncedLayer = false;
        console.log('this._layers.size()', this._layers.size());
        
        let iter = this._layers.iterator();
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
        
        this._browserDetect = new BrowserDetect();
        this._browserDetect.init();

        // e.g. For Pixel3:
        // navigator.userAgent Mozilla/5.0 (Linux; Android 11; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36
        // console.log('navigator.userAgent', navigator.userAgent); 
        // console.log('this._browserDetect.OS', this._browserDetect.OS);
        console.log('this._browserDetect.browser', this._browserDetect.browser);
        console.log('this._browserDetect.version', this._browserDetect.version);

        // raise a toast to show the browser type
        // let toastTitleStr = 'BrowserDetect';
        let msgStr = navigator.userAgent + ', OS: ' +
            this._browserDetect.OS + ', Browser: ' +
            this._browserDetect.browser + ', Version: ' +
            this._browserDetect.version;
        // toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        console.log('msgStr', msgStr); 
    }

    getBrowserDetect () {
        return this._browserDetect;
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
        return this._rendererPlanView2;
    }

    getRendererImageViewPane () {
        return this._rendererImageViewPane;
    }
    
    getSceneBar () {
        return this.sceneBar;
    }

    getUrlImagePathBase () {
        return 'avner/img';
    }

    static GetUrlBase () {
        // console.log('BEG GetUrlBase444');

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

        // console.log('COL.model', COL.model); 
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_current_user';
        let dataAsJson = await fetch(queryUrl).then(response => response.json());
        return dataAsJson;
    }

    getZipFilesInfo () {
        return this._zipFilesInfo;
    }

    setZipFilesInfo (zipFileInfo) {
        this._zipFilesInfo.set(zipFileInfo.zipFileName, zipFileInfo);
    }

    getSelectedZipFileInfo () {
        return this._selectedZipFileInfo;
    }

    setSelectedZipFileInfo (zipFileInfo) {
        this._selectedZipFileInfo = zipFileInfo;
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

    createLayer (planInfo, isLayerFromZipFile=false) {
        // console.log('BEG createLayer');

        let layerName = Layer.CreateLayerName(planInfo.siteName, planInfo.name);
        let layer = this._layers.getByKey(layerName);
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

        // console.log('this._layers.size()', this._layers.size()); 
        layer = new Layer(layerName, planInfo, isLayerFromZipFile);
        layer.initLayer();
        return layer;
    }

    getLayerByName (name) {
        // this.printLayersInfo2();
        return this._layers.getByKey(name);
    }

    getLayerFromLayersList (planInfo) {

        if(COL.util.isObjectInvalid(planInfo)) {
            // at this point planInfo must be defined
            throw new Error('planInfo is invalid');
        }
        
        let layer = undefined;
        let iter = this._layers.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let layerKey = keyVal[0];
            let layerVal = keyVal[1];

            // console.log('layerKey', layerKey); 
            // console.log('layerVal', layerVal);

            let layerPlanInfo = layerVal.getPlanInfo();
            if(layerPlanInfo && (layerPlanInfo.siteId == planInfo.siteId) && (layerPlanInfo.id == planInfo.id)) {
                layer = layerVal;
                break;
            }
        }
        
        return layer;
    }
    
    printLayersInfo2 () {

        console.log('_layers.size()', this._layers.size());
        
        let iter = this._layers.iterator();
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
        let layer = COL.model.createLayer(planInfo);

        // "https://192.168.1.75/avner/img/168/188/geographic_map.structure.layer0.json"
        let planFilename = planInfo.planFilename;
        console.log('planFilename', planFilename);

        let queryUrl = Model.GetUrlBase() + COL.model.getUrlImagePathBase() +
            '/' + planInfo.siteId + '/' +
            planInfo.id + '/' + planFilename;
        
        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);
        let dataAsJson = await response.json();
        console.log('dataAsJson', dataAsJson);
        // get the generalInfo section from the entire json data
        let generalInfoAsJson = dataAsJson['generalInfo'];
        let layerSoftwareVersion = COL.util.getNestedObject(generalInfoAsJson, ['softwareVersion']);

        if(!COL.loaders.utils.validateVersion(layerSoftwareVersion, COL.model.getMinSoftwareVersion(), 'GreaterOrEqual')) {
            let msgStr = 'Version validation failed while loading layer from web server. planFilename: ' + planFilename;
            throw new Error(msgStr);
        }

        if(COL.loaders.utils.isSemVerSmaller(layerSoftwareVersion, COL.getSoftwareVersion())) {
            // migrate the layer to the new vesion
            layer.migrateVersion(layerSoftwareVersion, COL.getSoftwareVersion());
        }

        layer.setGeneralInfo(generalInfoAsJson);

        await COL.loaders.CO_ObjectLoader.loadLayerJson_fromWebServer(layer, planInfo.siteId, planInfo.id);
    
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

        // Add/update layer to _layers            
        this._layers.set(layer.name, layer);
    }

    async selectLayerByName (layerName) {
        let layer = this._layers.getByKey(layerName);
        if(COL.util.isObjectValid(layer)) {
            await this.setSelectedLayer(layer);
        }
    }

    removeLayerByName (name) {
        // console.log('BEG removeLayerByName');

        // console.log('this._layers', this._layers);
        // this._layers.printKeysAndValues();
        
        let layer = this.getLayerByName(name);

        // https://www.tutorialrepublic.com/faq/how-to-determine-if-variable-is-undefined-or-null-in7-javascript.php
        // check for both undefined, null with the "equality operator" "==" (as opposed to the "strict equality operator" "===" )
        if(COL.util.isObjectValid(layer)) {
            layer = this._layers.remove(layer.name);
            if (layer) {

                console.log('layer', layer); 
                
                layer.dispose();
                layer = null;
                // delete layer;
            }
            if (COL.util.isObjectValid(this._selectedLayer) && (this._selectedLayer.name == name)) {
                // The removed layer was the selected layer. Clear the selected layer
                this._selectedLayer = undefined;
            }
        }
    }

    async setSelectedLayer(layer) {
        console.log('BEG setSelectedLayer'); 

        // //////////////////////////////////////////////////////////////////////////////
        // Setup the new selectedLayer
        // //////////////////////////////////////////////////////////////////////////////

        this._selectedLayer = layer;

        if(COL.util.isObjectInvalid(layer)) {
            // unselect the layer
            // mark the plan in the siteplan menu to the "No sites selected"
            $('#sitesId')[0].selectedIndex = 0;

        }
        else {
            await this._selectedLayer.updateImageThumbnailsRelatedRenderring();

            // //////////////////////////////////////////////////////////////////////////////
            // Adjust the camera, canvas, renderer, and viewport1 to the planViewPane
            // //////////////////////////////////////////////////////////////////////////////

            let planView = this._selectedLayer.getPlanView();
            // Set doRescale so that the camera position is restored from the layer.json file
            let doRescale = false;
            doRescale = true;
            planView.set_camera_canvas_renderer_and_viewport1(doRescale);
            $(document).trigger('SceneLayerSelected', [this._selectedLayer]);
        }
        
    }

    getSelectedLayer () {
        return this._selectedLayer;
    }
    
    getLayers () {
        return this._layers;
    }

    async getSiteByName(siteName) {
        
        // ////////////////////////////////////////////////
        // Query - get_site_by_name
        // ////////////////////////////////////////////////

        // http://localhost/api/v1_2/get_site_by_name/modelWith4Images
        console.log('Query - get_site_by_name'); 
        
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_site_by_name/' + siteName;
        console.log('queryUrl', queryUrl);

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
        // renderer -> _rendererPlanView
        // this._rendererPlanView.forceContextLoss();
        // this._rendererPlanView.context = null;
        // this._rendererPlanView.domElement = null;
        // this._rendererPlanView = null;
        // this._rendererPlanView.dispose();
        
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

        let serverAddress = await COL.model.getDataFromIndexedDb('serverAddress');
        let queryUrl = 'https://' + serverAddress + '/api/v1_2/get_system_params';
        // https://localhost/api/v1_2/get_system_params
        // console.log('queryUrl', queryUrl); 
        let response = await fetch(queryUrl);
        let endTime1 = performance.now();
        let duration1 = endTime1 - startTime1;
        console.log('duration1: ' + duration1 + ' milliseconds.');

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

