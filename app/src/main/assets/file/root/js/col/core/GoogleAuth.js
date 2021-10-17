var GoogleAuth;

var SCOPE = 'https://www.googleapis.com/auth/drive';
function handleClientLoad() {
    // Load the API's client and auth2 modules.
    // Call the initClient function after the modules load.
    gapi.load('client:auth2', initClient);
}

function initClient() {
    // Retrieve the discovery document for version 3 of Google Drive API.
    // In practice, your app can retrieve one or more discovery documents.
    var discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

    // Initialize the gapi.client object, which app uses to make API requests.
    // Get API key and client ID from API Console.
    // 'scope' field specifies space-delimited list of access scopes.
    gapi.client.init({
        'apiKey': 'AIzaSyCiKR4G7t4PWFrc6EbUsKgNCAKjMBTRwEk',
        'discoveryDocs': [discoveryUrl],
        'clientId': '387558396950-i7nfqu8jsnqnbeooj51i26uvon93af2s.apps.googleusercontent.com',
        'scope': SCOPE
    }).then(function () {
        GoogleAuth = gapi.auth2.getAuthInstance();

        // Listen for sign-in state changes.
        GoogleAuth.isSignedIn.listen(updateSigninStatus);

        // Handle initial sign-in state. (Determine if user is already signed in.)
        var user = GoogleAuth.currentUser.get();
        setSigninStatus();

        // Call handleAuthClick function when user clicks on
        //      "Sign In/Authorize" button.
        $('#google-drive-sign-in-or-out-button').click(function() {
            handleAuthClick();
        }); 
        $('#google-drive-revoke-access-button').click(function() {
            revokeAccess();
        }); 
    });
}

function handleAuthClick() {
    if (GoogleAuth.isSignedIn.get()) {
        // User is authorized and has clicked 'Sign out' button.
        GoogleAuth.signOut();
    } else {
        // User is not signed in. Start Google auth flow.
        GoogleAuth.signIn();
    }
}

function revokeAccess() {
    GoogleAuth.disconnect();
}

function setSigninStatus(isSignedIn) {
    var user = GoogleAuth.currentUser.get();
    var isAuthorized = user.hasGrantedScopes(SCOPE);
    if (isAuthorized) {
        $('#google-drive-sign-in-or-out-button').html('Sign out');
        $('#google-drive-revoke-access-button').css('display', 'inline-block');
        $('#google-drive-auth-status').html('You are currently signed in and have granted ' +
                               'access to this app.');
    } else {
        $('#google-drive-sign-in-or-out-button').html('Sign In/Authorize');
        $('#google-drive-revoke-access-button').css('display', 'none');
        $('#google-drive-auth-status').html('You have not authorized this app or you are ' +
                               'signed out.');
    }
}

function updateSigninStatus(isSignedIn) {
    setSigninStatus();
}
