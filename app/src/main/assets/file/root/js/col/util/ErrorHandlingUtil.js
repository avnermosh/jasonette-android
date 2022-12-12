// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from '../COL.js';

COL.errorHandlingUtil = {};


COL.errorHandlingUtil.handleErrors = async function (response, forceOkValToFalse) {

    if (!response.ok || COL.util.isObjectValid(forceOkValToFalse)) {
        let dataAsJson = await response.json();
        let msgStr = 'Request rejected with status: ' + response.status + ', and message: ' + dataAsJson.message;
        throw Error(msgStr);
    }

    if (response.message == 'offline' || response.url == 'https://localhost/static/offline/offline.html') {
        // The response is from offline.html
        // - set the page to the content of offline.html (without reloading the page), and
        // - throw an error, (no point to continue the javascript process)

        let dataAsText = await response.text();
        document.getElementsByTagName('html')[0].innerHTML = dataAsText;
        // console.log('document.getElementsByTagName("html")[0]', document.getElementsByTagName("html")[0]);
        // window.history.pushState({"html":dataAsText, "pageTitle":response.pageTitle}, "", queryUrl);

        let msgStr = 'Network is offline. response status: ' + response.status + ', response.message: ' + response.message;
        throw Error(msgStr);
    }

    return response;
};

// var bootstrap_alert = function() {};

COL.errorHandlingUtil.bootstrap_alert_success = function (message) {
    $('<div id="bootstrap_alert_success" class="alert alert-success alert-dismissible my-alerts fade show" role="alert">' + message + '<button type="button" class="close" data-dismiss="alert"><span>×</span></button></div>').appendTo($('#alert_placeholder'));
};

COL.errorHandlingUtil.bootstrap_alert_warning = function (message) {
    $('<div id="bootstrap_alert_warning" class="alert alert-warning alert-dismissible my-alerts fade show" role="alert">' + message + '<button type="button" class="close" data-dismiss="alert"><span>×</span></button></div>').appendTo($('#alert_placeholder'));
};

COL.errorHandlingUtil.bootstrap_alert_danger = function (message) {
    $('<div id="bootstrap_alert_danger" class="alert alert-danger alert-dismissible my-alerts fade show" role="alert">' + message + '<button type="button" class="close" data-dismiss="alert"><span>×</span></button></div>').appendTo($('#alert_placeholder'));
};

// let timeOutInMillisec = 2000;
// let extendedTimeOutInMillisec = 2000;

// https://stackoverflow.com/questions/35990151/toastr-js-keep-toasts-visible-indefinitely
// make the toast sticky (show indefinitly)
let timeOutInMillisec = 2000;
let extendedTimeOutInMillisec = 0;
let closeButton = true;
let closeDurationInMillisec = 1000;
COL.errorHandlingUtil.toastrSettings = { 
    
    // How long the toast will display without user interaction (0 prevents timeout)
    timeOut: timeOutInMillisec,
    
    // How long the toast will display after a user hovers over it (0 prevents timeout ?)
    extendedTimeOut: extendedTimeOutInMillisec,

    closeButton: closeButton,
    closeDuration: closeDurationInMillisec};

