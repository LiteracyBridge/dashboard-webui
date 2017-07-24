/**
 * Created by bill on 4/17/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, BootstrapDialog, console, AWS, AWSCognito */

/**
 * The best documentation is here: https://github.com/aws/amazon-cognito-identity-js/blob/master/README.md
 */
var CognitoWrapper = CognitoWrapper || {};

CognitoWrapper = (function () {
    'use strict';
    
    var REGION = 'us-west-2';
    var IDENTITY_POOL_ID = 'us-west-2:a544b58b-8be0-46db-aece-e6fe14d29124';
    var USER_POOL_ID = 'us-west-2_6EKGzq75p';
    var CLIENT_ID = '5h9tg11mb73p4j2ca1oii7bhkn';
    
    var cognitoUser;
    
    var idToken;

    // --------------------------------------------------------------------------------------
    // Currently unused AWS credential management. (Using CognitoWrapper only.)
    //
    // The code, here and in functions below, that starts with AWS. are for getting AWS
    // credentials from a CognitoWrapper sign in. If we're not using AWS proper, but just the
    // API Gateway, we don't need AWS, and can save 900K of the minimized code size!
    // However, if we do ever need AWS, say for S3, then we'll need to add this back.
    // AWS.config.region = REGION;
    // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    //     IdentityPoolId: IDENTITY_POOL_ID,
    // });
    // --------------------------------------------------------------------------------------
    AWSCognito.config.region = REGION; //This is required to derive the endpoint
    var userPoolData = {
        UserPoolId: USER_POOL_ID, // Your user pool id here
        ClientId: CLIENT_ID // Your client id here
    };
    
    
    function signIn(options) {
        var promise = $.Deferred();
        var username = options.username;
        var password = options.password;
        
        var authenticationData = {
            Username: username,
            Password: password,
        };
        var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var userData = {
            Username: username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                
                idToken = result.idToken.getJwtToken();
                console.log(idToken);
                promise.resolve();
    
                // --------------------------------------------------------------------------------------
                // Currently unused AWS credential management. (Using CognitoWrapper only.)
                //
                // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                //     IdentityPoolId: IDENTITY_POOL_ID, // your identity pool id here
                //     Logins: {
                //         // Change the key below according to the specific region your user pool is in.
                //         'cognito-idp.us-west-2.amazonaws.com/us-west-2_6EKGzq75p': result.getIdToken().getJwtToken()
                //     }
                // });
                //
                // Instantiate aws sdk service objects now that the credentials have been updated.
                // example: var s3 = new AWS.S3();
                //
                //call refresh method in order to authenticate user and get new temp credentials
                // AWS.config.credentials.refresh(function (error) {
                //     if (error) {
                //         promise.reject(error);
                //     } else {
                //         promise.resolve();
                //     }
                // });
                // --------------------------------------------------------------------------------------
            },
            
            onFailure: function (err) {
                promise.reject(err);
            },
            
        });
        
        return promise;
    }
    
    function createAccount(options) {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        
        var username = options.username;
        var email = options.email;
        var password = options.password;
        var phone = options.phone;
        
        var attributeList = [];
        
        var dataEmail = {
            Name: 'email',
            Value: email
        };
        
        var dataPhoneNumber = {
            Name: 'phone_number',
            Value: phone
        };
        var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
        var attributePhoneNumber = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPhoneNumber);
        
        attributeList.push(attributeEmail);
        attributeList.push(attributePhoneNumber);
        
        userPool.signUp(username, password, attributeList, null, function (err, result) {
            if (err) {
                promise.reject(err);
            } else {
                cognitoUser = result.user;
                promise.resolve(cognitoUser);
            }
        });
        
        return promise;
    }
    
    function confirmRegistration(options) {
        var promise = $.Deferred();
        
        var code = options.code;
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        
        cognitoUser.confirmRegistration(code, true, function (err, result) {
            if (err) {
                promise.reject(err);
            } else {
                promise.resolve(result);
            }
        });
        
        return promise;
    }
    
    function forgotPassword(options) {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        
        cognitoUser.forgotPassword({
            onSuccess: promise.resolve,
            onFailure: promise.reject
        });
        
        return promise;
    }
    
    
    function confirmPassword(options) {
        var promise = $.Deferred();
        
        var verificationCode = options.code;
        var newPassword = options.password;
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        
        cognitoUser.confirmPassword(verificationCode, newPassword, {
            onSuccess: promise.resolve,
            onFailure: promise.reject
        });
        
        
        return promise;
    }
    
    function resendConfirmationCode(options) {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        cognitoUser.resendConfirmationCode(function (err, result) {
            if (err) {
                promise.reject(err);
            } else {
                promise.resolve(result);
            }
        });
        
        
        return promise;
    }
    
    function getCurrentUser(options) {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    promise.reject(err);
                    return;
                }
                console.log('session validity: ' + session.isValid());
                idToken = session.idToken.getJwtToken();
                console.log(idToken);
                promise.resolve();
    
                // --------------------------------------------------------------------------------------
                // Currently unused AWS credential management. (Using CognitoWrapper only.)
                //
                // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                //     IdentityPoolId: IDENTITY_POOL_ID, // your identity pool id here
                //     Logins: {
                //         // Change the key below according to the specific region your user pool is in.
                //         'cognito-idp.us-west-2.amazonaws.com/us-west-2_6EKGzq75p': session.getIdToken().getJwtToken()
                //     }
                // });
                //
                // //call refresh method in order to authenticate user and get new temp credentials
                // AWS.config.credentials.refresh(function (error) {
                //     if (error) {
                //         promise.reject(error);
                //     } else {
                //         promise.resolve();
                //     }
                // });
                // --------------------------------------------------------------------------------------
            });
        } else {
            promise.reject('Not signed in.');
        }
        
        return promise;
    }
    
    function getEmailVerificationCode(gotCodePromise) {
        var promise = $.Deferred();

        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
    
        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    console.log('Can not get user session');
                    promise.reject(err);
                    return;
                }
                if (session.isValid()) {
                    cognitoUser.getAttributeVerificationCode('email', {
                        onSuccess: function (result) {
                            console.log('call result: ' + result);
                            promise.resolve(result);
                        },
                        onFailure: function(err) {
                            console.log('call result: ', err);
                            promise.reject(err);
                        },
                        inputVerificationCode: function() {
                            console.log('inputVerificationCode');
                            gotCodePromise.done((code)=>{
                                cognitoUser.verifyAttribute('email', code, this);
                            });
                            //var verificationCode = prompt('Please input verification code: ' ,'');
                            //cognitoUser.verifyAttribute('email', verificationCode, this);
                        }
                    });
                } else {
                    console.log('Session is not valid');
                    promise.reject();
                }
            });
        } else {
            console.log('User is not signed in');
            promise.reject('Not signed in.');
        }
        
        return promise;
    }
    
    function getSessionValidity() {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    promise.reject(err);
                    return;
                }
                if (session.isValid()) {
                    promise.resolve();
                } else {
                    promise.reject();
                }
                
            });
        } else {
            promise.reject('Not signed in.');
        }
        
        return promise;
    }
    
    function getUserAttributes() {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    promise.reject(err);
                    return;
                }
                
                // NOTE: getSession must be called to authenticate user before calling getUserAttributes
                cognitoUser.getUserAttributes(function (err, attributes) {
                    if (err) {
                        promise.reject(err);
                    } else {
                        // Add the username into the attributes.
                        attributes.push({Name: 'username', Value: cognitoUser.username});
                        promise.resolve(attributes);
                    }
                });
            });
        } else {
            promise.reject('Not signed in.');
        }
        
        return promise;
    }
    
    function updateUserAttributes(options) {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    promise.reject(err);
                    return;
                }
                var attrs = options.attributes;
                var attributeList = Object.keys(attrs).map((key) => {
                    return new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                        Name: key,
                        Value: attrs[key]
                    });
                });
                
                cognitoUser.updateAttributes(attributeList, function (err, result) {
                    if (err) {
                        promise.reject(err);
                        return;
                    }
                    promise.resolve('call result: ' + result);
                });
            });
        } else {
            promise.reject('Not signed in.');
        }
        
        return promise;
    }
    
    function signOut() {
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
        cognitoUser && cognitoUser.signOut();
        
        // So that the API is consistently promise based.
        var promise = $.Deferred();
        promise.resolve();
        return promise;
    }
    
    function changePassword(options) {
        var promise = $.Deferred();
        
        var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        var cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser !== null) {
            // NOTE: getSession must be called to authenticate user before calling getUserAttributes
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    promise.reject(err);
                    return;
                }
                
                cognitoUser.changePassword(options.oldPassword, options.newPassword, function (err, result) {
                    if (err) {
                        promise.reject(err);
                    } else {
                        promise.resolve(result);
                    }
                });
            });
        } else {
            promise.reject('Not signed in.');
        }
        
        return promise;
    }
    
    return {
        signIn: signIn,
        createAccount: createAccount,
        resetPassword: confirmPassword,
        confirmRegistration: confirmRegistration,
        resendConfirmationCode: resendConfirmationCode,
        forgotPassword: forgotPassword,
        confirmPassword: confirmPassword,
        getCurrentUser: getCurrentUser,
        getEmailVerificationCode: getEmailVerificationCode,
        getUserAttributes: getUserAttributes,
        updateAttributes: updateUserAttributes,
        getSessionValidity: getSessionValidity,
        signOut: signOut,
        changePassword: changePassword,
        
        getIdToken: () => idToken
    }
})();
