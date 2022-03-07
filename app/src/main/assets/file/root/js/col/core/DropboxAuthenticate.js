// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { Model } from "./Model.js";

var CLIENT_ID = '42zjexze6mfpf7x';
// Parses the url and gets the access token if it is in the urls hash
function getAccessTokenFromUrl() {
    return utils.parseQueryString(window.location.hash).access_token;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function isAuthenticated() {
    return !!getAccessTokenFromUrl();
}

// Render a list of items to #files
function renderItems(items) {
    var filesContainer = document.getElementById('files');
    items.forEach(function(item) {
        var li = document.createElement('li');
        li.innerHTML = item.name;
        filesContainer.appendChild(li);
    });
}

// This example keeps both the authenticate and non-authenticated setions
// in the DOM and uses this function to show/hide the correct section.
function showPageSection(elementId) {
    document.getElementById(elementId).style.display = 'block';
}
if (isAuthenticated()) {
    showPageSection('authed-section');
    // Create an instance of Dropbox with the access token and use it to
    // fetch and render the files in the users root directory.
    var dbx = new Dropbox.Dropbox({ accessToken: getAccessTokenFromUrl() });
    dbx.filesListFolder({path: ''})
        .then(function(response) {
            renderItems(response.entries);
        })
        .catch(function(error) {
            console.error(error);
        });
}
else {
    showPageSection('pre-auth-section');
    // Set the login anchors href using dbx.getAuthenticationUrl()
    var dbx = new Dropbox.Dropbox({ clientId: CLIENT_ID });
    // COL.model.getUrlBase()
    // var authUrl = dbx.getAuthenticationUrl('http://localhost:8080/auth');

    // let urlStr = COL.model.getUrlBase() + '8080/auth';

    let URL_BASE = 'http://192.168.1.74';
    let urlStr = URL_BASE + ':8080/auth';
    var authUrl = dbx.getAuthenticationUrl(urlStr);
    
    document.getElementById('dropboxAuthlink').href = authUrl;
}
