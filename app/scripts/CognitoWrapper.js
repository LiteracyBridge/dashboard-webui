/**
 * Created by bill on 4/17/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, BootstrapDialog, console, AWS, AWSCognito */

/**
 * The best documentation is here: https://github.com/aws/amazon-cognito-identity-js/blob/master/README.md
 */
var CognitoWrapper;

CognitoWrapper = (function () {
    'use strict';

    const REGION = 'us-west-2';
    const IDENTITY_POOL_ID = 'us-west-2:a544b58b-8be0-46db-aece-e6fe14d29124';
    const USER_POOL_ID = 'us-west-2_6EKGzq75p';
    const CLIENT_ID = '5h9tg11mb73p4j2ca1oii7bhkn';

    let cognitoUser;

    let idToken;

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
    let userPoolData = {
        UserPoolId: USER_POOL_ID, // Your user pool id here
        ClientId: CLIENT_ID // Your client id here
    };

    function signIn(options) {
        let deferred = $.Deferred();
        let username = options.username;
        let password = options.password;

        let authenticationData = {
            Username: username,
            Password: password,
        };
        let authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let userData = {
            Username: username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {

                idToken = result.idToken.getJwtToken();
                console.log('SignIn, JWT Params:')
                console.log(getJwtParams());
                deferred.resolve();

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
                deferred.reject(err);
            },

        });

        return deferred.promise();
    }

    function createAccount(options) {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);

        let username = options.username;
        let email = options.email;
        let password = options.password;
        let phone = options.phone;

        let attributeList = [];

        let dataEmail = {
            Name: 'email',
            Value: email
        };

        let dataPhoneNumber = {
            Name: 'phone_number',
            Value: phone
        };
        let attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
        let attributePhoneNumber = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPhoneNumber);

        attributeList.push(attributeEmail);
        attributeList.push(attributePhoneNumber);

        userPool.signUp(username, password, attributeList, null, function (err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                cognitoUser = result.user;
                deferred.resolve(cognitoUser);
            }
        });

        return deferred.promise();
    }

    function confirmRegistration(options) {
        let deferred = $.Deferred();

        let code = options.code;

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

        cognitoUser.confirmRegistration(code, true, function (err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result);
            }
        });

        return deferred.promise();
    }

    function forgotPassword(options) {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

        cognitoUser.forgotPassword({
            onSuccess: deferred.resolve,
            onFailure: deferred.reject
        });

        return deferred.promise();
    }


    function confirmPassword(options) {
        let deferred = $.Deferred();

        let verificationCode = options.code;
        let newPassword = options.password;

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

        cognitoUser.confirmPassword(verificationCode, newPassword, {
            onSuccess: deferred.resolve,
            onFailure: deferred.reject
        });


        return deferred.promise();
    }

    function resendConfirmationCode(options) {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let userData = {
            Username: options.username,
            Pool: userPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        cognitoUser.resendConfirmationCode(function (err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result);
            }
        });


        return deferred.promise();
    }

    function getCurrentUser() {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                console.log('session validity: ' + session.isValid());
                idToken = session.idToken.getJwtToken();
                console.log('getCurrentUser, JWT Params:')
                console.log(getJwtParams());
                deferred.resolve();

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
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function deleteCurrentUser() {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                cognitoUser.deleteUser(function (err, result) {
                    if (err) {
                        deferred.reject(err.message || JSON.stringify(err));
                        return;
                    }
                    deferred.resolve(result);
                });
            });
        } else {
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function getEmailVerificationCode(gotCodePromise) {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    console.log('Can not get user session');
                    deferred.reject(err);
                    return;
                }
                if (session.isValid()) {
                    cognitoUser.getAttributeVerificationCode('email', {
                        onSuccess: function (result) {
                            console.log('call result: ' + result);
                            deferred.resolve(result);
                        },
                        onFailure: function(err) {
                            console.log('call result: ', err);
                            deferred.reject(err);
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
                    deferred.reject();
                }
            });
        } else {
            console.log('User is not signed in');
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function getSessionValidity() {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                if (session.isValid()) {
                    deferred.resolve();
                } else {
                    deferred.reject();
                }

            });
        } else {
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function getUserAttributes() {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                // NOTE: getSession must be called to authenticate user before calling getUserAttributes
                cognitoUser.getUserAttributes(function (err, attributes) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        // Add the username into the attributes.
                        attributes.push({Name: 'username', Value: cognitoUser.username});
                        deferred.resolve(attributes);
                    }
                });
            });
        } else {
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function updateUserAttributes(options) {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                let attrs = options.attributes;
                let attributeList = Object.keys(attrs).map((key) => {
                    return new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                        Name: key,
                        Value: attrs[key]
                    });
                });

                cognitoUser.updateAttributes(attributeList, function (err, result) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    deferred.resolve('call result: ' + result);
                });
            });
        } else {
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function signOut() {
        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();
        let ignored = cognitoUser && cognitoUser.signOut();

        // So that the API is consistently promise based.
        let deferred = $.Deferred();
        deferred.resolve();
        return deferred.promise();
    }

    function changePassword(options) {
        let deferred = $.Deferred();

        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);
        let cognitoUser = userPool.getCurrentUser();

        if (cognitoUser !== null) {
            // NOTE: getSession must be called to authenticate user before calling getUserAttributes
            cognitoUser.getSession(function (err, session) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                cognitoUser.changePassword(options.oldPassword, options.newPassword, function (err, result) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(result);
                    }
                });
            });
        } else {
            deferred.reject('Not signed in.');
        }

        return deferred.promise();
    }

    function getJwtParams() {
        if (!idToken) { return {}; }
        return JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    }

    return {
        signIn: signIn,
        createAccount: createAccount,
        confirmRegistration: confirmRegistration,
        resendConfirmationCode: resendConfirmationCode,
        forgotPassword: forgotPassword,
        confirmPassword: confirmPassword,
        getCurrentUser: getCurrentUser,
        deleteCurrentUser: deleteCurrentUser,
        getEmailVerificationCode: getEmailVerificationCode,
        getUserAttributes: getUserAttributes,
        updateAttributes: updateUserAttributes,
        getSessionValidity: getSessionValidity,
        signOut: signOut,
        changePassword: changePassword,

        getIdToken: () => idToken,
        getJwtParams: getJwtParams
    }
})();
