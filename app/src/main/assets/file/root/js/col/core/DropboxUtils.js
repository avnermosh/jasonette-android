import { Model } from "./Model.js";

(function(window){
    window.utils = {
        parseQueryString: function(str) {
            var ret = Object.create(null);

            if (typeof str !== 'string') {
                return ret;
            }

            str = str.trim().replace(/^(\?|#|&)/, '');

            if (!str) {
                return ret;
            }

            str.split('&').forEach(function (param) {
                var parts = param.replace(/\+/g, ' ').split('=');
                // Firefox (pre 40) decodes `%3D` to `=`
                // https://github.com/sindresorhus/query-string/pull/37
                var key = parts.shift();
                var val = parts.length > 0 ? parts.join('=') : undefined;

                key = decodeURIComponent(key);

                // missing `=` should be `null`:
                // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                val = val === undefined ? null : decodeURIComponent(val);

                if (ret[key] === undefined) {
                    ret[key] = val;
                } else if (Array.isArray(ret[key])) {
                    ret[key].push(val);
                } else {
                    ret[key] = [ret[key], val];
                }
            });

            return ret;
        }
    };
})(window);


// On google photobuilder3 ???
// var CLIENT_ID = '42zjexze6mfpf7x';

// On Dropbox - photobuilder2
var CLIENT_ID = '62b9hq4011kone0';

uploadToDropbox_viaHardcodedAccessToken = function (blob1, zipFilename) {
    console.log('BEG uploadToDropbox_viaHardcodedAccessToken');
    console.log('zipFilename', zipFilename); 
    //code below after having included dropbox-sdk-js in your project.  
    //Dropbox is in scope!
    let accessToken1 = 'a3BbSLzZS8sAAAAAAAAKxcqUEpdncnkY3T6GvdnmdlAAf9AklK6wNJP-7fxdaoR6';
    var dbx = new Dropbox.Dropbox({ accessToken: accessToken1 });
    let pathVar = '/foo.zip';
    
    dbx.filesUpload({path: pathVar, contents: blob1})
};


///////////////////////////////////////////////////////////////////
// BEG viaImplicitGrant (a.k.a tokenGrant)
// based on
// http://www.gethugames.in/2012/04/authentication-and-authorization-for-google-apis-in-javascript-popup-window-tutorial.html
///////////////////////////////////////////////////////////////////

// TBD - maybe enable validateToken ??

var OAUTHURL    =   'https://www.dropbox.com/oauth2/authorize?';

var VALIDURL    =   'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=';

var SCOPE       =   'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

// var REDIRECT    =   'http://localhost/auth.html'
// var REDIRECT    =   COL.model.getUrlBase() + 'auth.html';
var REDIRECT    =   'http://192.168.1.74/auth.html'


var LOGOUT      =   'http://accounts.google.com/Logout';
var TYPE        =   'token';

// var _url = 'https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=62b9hq4011kone0&redirect_uri=http://localhost/auth.html';
var _url        =   OAUTHURL + 'response_type=' + TYPE + '&client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT;
console.log('_url', _url);

var acToken;
var tokenType;
var expiresIn;
var user;
var loggedIn    =   false;

function login() {
    console.log('BEG login');
    var win         =   window.open(_url, "windowname1", 'width=800, height=600'); 

    var pollTimer   =   window.setInterval(function() { 
        console.log('BEG pollTimer');
        try {

            // The indexOf() method returns the position of the first occurrence of REDIRECT in win.document.URL
            if (win.document.URL.indexOf(REDIRECT) != -1) {

                // page URL matches the Redirect URL, which will happen after successful login is made.
                // Once user logged in and authorized the application, he will be redirected to the url REDIRECT
                
                window.clearInterval(pollTimer);
                var url =   win.document.URL;

                acToken =   gup(url, 'access_token');
                console.log('acToken', acToken); 

                tokenType = gup(url, 'token_type');
                console.log('tokenType', tokenType); 

                expiresIn = gup(url, 'expires_in');
                console.log('expiresIn', expiresIn);
                
                win.close();

                // validateToken(acToken);
            }
        } catch(e) {
            //                 console.log('catch error', e); 
        }
    }, 500);
}

function validateToken(token) {
    console.log('BEG validateToken');
    $.ajax({
        url: VALIDURL + token,
        data: null,
        success: function(responseText){  
            getUserInfo();
            loggedIn = true;
            $('#loginText').hide();
            $('#logoutText').show();
        },  
        dataType: "jsonp"  
    });
}

function getUserInfo() {
    console.log('BEG getUserInfo');
    $.ajax({
        url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + acToken,
        data: null,
        success: function(resp) {
            user    =   resp;
            console.log(user);
            $('#uName').text('Welcome ' + user.name);
            $('#imgHolder').attr('src', user.picture);
        },
        dataType: "jsonp"
    });
}

//credits: http://www.netlobo.com/url_query_string_javascript.html
// gup - Get Url Params
function gup(url, name) {
    console.log('BEG gup');
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\#&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( url );
    if( results == null )
        return "";
    else
        return results[1];
}

function startLogoutPolling() {
    console.log('BEG startLogoutPolling');
    $('#loginText').show();
    $('#logoutText').hide();
    loggedIn = false;
    $('#uName').text('Welcome ');
    $('#imgHolder').attr('src', 'none.jpg');
}

uploadToDropbox_viaImplicitGrant = function (blob1, zipFilename) {
    console.log('BEG uploadToDropbox_viaImplicitGrant');
    console.log('zipFilename', zipFilename); 
    //code below after having included dropbox-sdk-js in your project.  
    //Dropbox is in scope!
    login();
    
    var dbx = new Dropbox.Dropbox({ accessToken: acToken });
    
    let pathVar = '/' + zipFilename;
    console.log('pathVar', pathVar); 
    
    // dbx.filesUpload({path: pathVar, contents: blob1})
    dbx.filesUpload({path: pathVar, contents: blob1, mode: 'overwrite'})
    
};

///////////////////////////////////////////////////////////////////
// END viaImplicitGrant (a.k.a tokenGrant)
///////////////////////////////////////////////////////////////////

