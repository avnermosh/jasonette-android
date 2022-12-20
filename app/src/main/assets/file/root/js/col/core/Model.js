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
// import { ManageGUI } from "../manageGUI.js";

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
        this.modelVersion = undefined;
        this.minZipVersion = undefined;
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

        // container for the db operations that are executed in single request
        this.image_db_operations_array = [];

        // context-menu related variables
        this.timeoutID = undefined;
        this.isPlanThumbnailMenuVisible = false;

        this.csrf_token = COL.util.getCSRFToken();

        $('#planThumbnailsMenuId li').click(async function(event) {
            console.log('BEG #planThumbnailsMenuId li click');

            {
                // Prevent multiple click events firing JQuery
                // https://stackoverflow.com/questions/12708691/prevent-multiple-click-events-firing-jquery
                event.stopImmediatePropagation();
                event.preventDefault();
            }
            
            switch($(this).attr('data-action')) {
                case 'third': 
                    console.log('third');
                    break;
            }
        });
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
    
    async initModel() {
        // console.log('BEG initModel');

        console.log('COL.doWorkOnline before', COL.doWorkOnline);
        try {
            let systemParamsAsJson = await this.getSystemParams();
            // force setting COL.doWorkOnline to false
            // throw new Error('dummy throw');
            
            this.setSystemParams(systemParamsAsJson);
            COL.doWorkOnline = true;
        }
        catch(err){
            // getSystemParams failed with exception.
            // This indicates that the system is in offline mode (i.e. no web server)
            // this can happen:
            // - if there is no connection to the server (e.g. server is down, or internet is down, etc..)
            // - if working from files within a mobile device with the "Offline" button (i.e. working from from files)
            console.log('Detected offline mode.');
            COL.doWorkOnline = false;
        }
        console.log('COL.doWorkOnline after', COL.doWorkOnline);

        let getCurrentUserResultAsJson = {dummy_val: 'True'};
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
            // in mobile app (e.g. jasonette-android), and offline mode
            // load canned demo siteplan.
            // in online mode, the demo_site is loaded from the webserver)
            window.$agent_jasonette_android.trigger('media.loadDemoZipFileHeaders');
        }

        this.detectWebGL();
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


        // window.resizeTo(
        //     window.screen.availWidth / 2,
        //     window.screen.availHeight / 2
        // );

        // console.log('window.innerWidth2:', window.innerWidth);
        // console.log('window.screen.availWidth2:', window.screen.availWidth);
        // console.log('document.documentElement.clientWidth2:', document.documentElement.clientWidth);
        // console.log('window.devicePixelRatio2', window.devicePixelRatio); 
        // raise a toast to show the browser type
        let toastTitleStr = 'BrowserDetect';
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
        console.log('BEG GetUrlBase444');

        console.log('window.$agent_jasonette_android', window.$agent_jasonette_android);
        console.log('window.location.origin', window.location.origin);
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
        
        console.log('urlBase', urlBase);

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

    getModelVersion () {
        return this.modelVersion;
    }

    setModelVersion (modelVersion) {
        this.modelVersion = modelVersion;
    }

    getMinZipVersion () {
        return this.minZipVersion;
    }

    setMinZipVersion (minZipVersion) {
        this.minZipVersion = minZipVersion;
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

        // "https://192.168.1.75/avner/img/168/188/general_metadata.json"
        let general_metadata_filename = 'general_metadata.json';
        let queryUrl = Model.GetUrlBase() + COL.model.getUrlImagePathBase() +
            '/' + planInfo.siteId + '/' +
            planInfo.id + '/' + general_metadata_filename;
        
        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);
        let dataAsJson = await response.json();
        // console.log('dataAsJson', dataAsJson);
        layer.setGeneralMetadata(dataAsJson);
        
        let layerGeneralMetadata = layer.getGeneralMetadata();
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
        await this.setSelectedLayer(layer);
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
            await this._selectedLayer.updateLayerImageRelatedRenderring();

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
        this.isUserLoggedIn = isUserLoggedIn;
    }

    async getSystemParams () {
        // console.log('BEG getSystemParams');
        
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_system_params';
        // https://localhost/api/v1_2/get_system_params
        // console.log('queryUrl', queryUrl); 
        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);
        let systemParamsAsJson = await response.json();
        // console.log('systemParamsAsJson', systemParamsAsJson); 
        return systemParamsAsJson;
    }

    setSystemParams (systemParamsAsJson) {
        // console.log('systemParamsAsJson', systemParamsAsJson);

        this.setModelVersion( parseFloat(systemParamsAsJson['modelVersion']) );
        this.setMinZipVersion( parseFloat(systemParamsAsJson['minZipVersion']) );
    }

    // /////////////////////////////////
    // BEG Add context-menu to ThumbnailPlan
    // /////////////////////////////////

    delayedMenuThumbnailPlan(event) {
        console.log('BEG delayedMenuThumbnailPlan');
        
        if(this.isPlanThumbnailMenuVisible) {
            // a previous menu exist. Clear it first before setting a new menu.
            this.clearMenuThumbnailPlan();
        }

        let timeIntervalInMilliSec = 500;
        this.timeoutID = window.setTimeout(this.showMenuThumbnailPlan.bind(this, event), timeIntervalInMilliSec);
    }
    
    showMenuThumbnailPlan(event) {
        console.log('BEG showMenuThumbnailPlan');
        
        $('#planThumbnailsMenuId').finish().toggle(100).css({
            top: event.pageY + 'px',
            left: event.pageX + 'px'
        });
        this.isPlanThumbnailMenuVisible = true;
        // this.setState(OverlayRect.STATE.CONTEXT_MENU);
    }

    clearMenuThumbnailPlan() {
        console.log('BEG clearMenuThumbnailPlan');

        window.clearTimeout(this.timeoutID);
        this.isPlanThumbnailMenuVisible = false;
        $('#planThumbnailsMenuId').hide(100);
    }

    // /////////////////////////////////
    // END Add context-menu to ThumbnailPlan
    // /////////////////////////////////

}

export { Model };

