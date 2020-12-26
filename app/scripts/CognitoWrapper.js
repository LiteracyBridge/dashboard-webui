/* jshint undef:true, esversion:6, asi:true */
/* global $, $.Deferred, BootstrapDialog, console, AWS, AWSCognito */
/**
 * Created by bill on 4/17/17.
 */
/**
 * The best documentation is here: https://github.com/aws/amazon-cognito-identity-js/blob/master/README.md
 */
var CognitoWrapper;

CognitoWrapper = (function () {
    'use strict';

    const FALLBACK_CONFIG = {
        REGION: 'us-west-2',
        USER_POOL_ID: 'us-west-2_6EKGzq75p',
        CLIENT_ID: '5h9tg11mb73p4j2ca1oii7bhkn',

        ACCESS_CONTROL_API: 'https://cqmltfugtl.execute-api.us-west-2.amazonaws.com/prod',
        LIST_CHECKOUTS: 'https://7z4pu4vzqk.execute-api.us-west-2.amazonaws.com/prod',
        PROGRAM_SPEC: 'https://ftgnui9zvf.execute-api.us-west-2.amazonaws.com/PROD',
        ROLES: 'https://1cr03lc4tl.execute-api.us-west-2.amazonaws.com/PROD',
        STATS_QUERY: 'https://y06knefb5j.execute-api.us-west-2.amazonaws.com/Devo',
        TWBX: 'https://lkh9z46j7e.execute-api.us-west-2.amazonaws.com/prod',

    }
    const AMPLIO_CONFIG = {
        REGION: 'us-west-2',
        USER_POOL_ID: 'us-west-2_3evpQGyi5',
        CLIENT_ID: '5oviumtu4cmhspn9qt2bvn130s',

        ACCESS_CONTROL_API: 'https://ot0ietjo23.execute-api.us-west-2.amazonaws.com/prod',
        LIST_CHECKOUTS: 'https://9qh2jxd5tc.execute-api.us-west-2.amazonaws.com/prod',
        PROGRAM_SPEC: 'https://ogm62f19c1.execute-api.us-west-2.amazonaws.com/prod',
        ROLES: 'https://uomgzti07c.execute-api.us-west-2.amazonaws.com/prod',
        STATS_QUERY: 'https://l0im73yun2.execute-api.us-west-2.amazonaws.com/prod',
        TWBX: 'https://c8ul32rlr8.execute-api.us-west-2.amazonaws.com/prod',
    }

    function CognitoHelper(configInfo) {
        // const REGION = 'us-west-2';
        // const IDENTITY_POOL_ID = 'us-west-2:a544b58b-8be0-46db-aece-e6fe14d29124';
        // const USER_POOL_ID = 'us-west-2_6EKGzq75p';
        // const CLIENT_ID = '5h9tg11mb73p4j2ca1oii7bhkn';

        // Test pool
        // var REGION = 'us-west-2';
        // var USER_POOL_ID = 'us-west-2_x2lqWbAq6';
        // var CLIENT_ID = '66fiihue6qtttbh3c1g3iqs1i6';
        //
        // var ACCESS_CONTROL_API = 'https://cqmltfugtl.execute-api.us-west-2.amazonaws.com/prod';
        // var LIST_CHECKOUTS = 'https://7z4pu4vzqk.execute-api.us-west-2.amazonaws.com/prod';
        // let PROGRAM_SPEC = 'https://ftgnui9zvf.execute-api.us-west-2.amazonaws.com/PROD';
        // let ROLES = 'https://1cr03lc4tl.execute-api.us-west-2.amazonaws.com/PROD';
        // let STATS_QUERY = 'https://y06knefb5j.execute-api.us-west-2.amazonaws.com/Devo';
        // let TWBX = 'https://lkh9z46j7e.execute-api.us-west-2.amazonaws.com/prod';

        var REGION, USER_POOL_ID, CLIENT_ID, ACCESS_CONTROL_API, LIST_CHECKOUTS, PROGRAM_SPEC, ROLES, STATS_QUERY, TWBX;
        // setConfig(AMPLIO_CONFIG);

        var userPoolData;

        function setConfig(configInfo) {
            configInfo = configInfo || AMPLIO_CONFIG;
            REGION = configInfo.REGION;
            USER_POOL_ID = configInfo.USER_POOL_ID;
            CLIENT_ID = configInfo.CLIENT_ID;

            ACCESS_CONTROL_API = configInfo.ACCESS_CONTROL_API;
            LIST_CHECKOUTS = configInfo.LIST_CHECKOUTS;
            PROGRAM_SPEC = configInfo.PROGRAM_SPEC;
            ROLES = configInfo.ROLES;
            STATS_QUERY = configInfo.STATS_QUERY;
            TWBX = configInfo.TWBX;

            AWSCognito.config.region = REGION; //This is required to derive the endpoint
            userPoolData = {
                UserPoolId: USER_POOL_ID, // Your user pool id here
                ClientId: CLIENT_ID // Your client id here
            };

        }

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
                newPasswordRequired: function(err) {
                    console.log('Calling completeNewPasswordChallenge');
                    cognitoUser.completeNewPasswordChallenge('TalkingBook', {});
                }

            });

            return deferred.promise();
        }

        function createAccount(options) {
            function attribute(name, value) {
                let attribute = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
                    Name: name,
                    Value: value
                });
                attributeList.push(attribute);
            }

            let deferred = $.Deferred();

            let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPoolData);

            let email = options.email;
            let password = options.password;

            let attributeList = [];
            attribute('email', email);
            if (options.name) {
                attribute('name', options.name);
            } else if (options.username) {
                attribute('name', options.username);
            }
            if (options.phone) {
                attribute('phone_number', options.phone);
            }

            userPool.signUp(email, password, attributeList, null, function (err, result) {
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
                            onFailure: function (err) {
                                console.log('call result: ', err);
                                deferred.reject(err);
                            },
                            inputVerificationCode: function () {
                                console.log('inputVerificationCode');
                                gotCodePromise.done((code) => {
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
            if (!idToken) {
                return {};
            }
            return JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        }

        setConfig(configInfo);

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
            getJwtParams: getJwtParams,

            ACCESS_CONTROL_API: ACCESS_CONTROL_API,
            LIST_CHECKOUTS: LIST_CHECKOUTS,
            PROGRAM_SPEC: PROGRAM_SPEC,
            ROLES: ROLES,
            STATS_QUERY: STATS_QUERY,
            TWBX: TWBX,

        }
    }

    return {
        cognitoHelper: CognitoHelper,
        AMPLIO_CONFIG: AMPLIO_CONFIG,
        FALLBACK_CONFIG: FALLBACK_CONFIG
    }
})();
