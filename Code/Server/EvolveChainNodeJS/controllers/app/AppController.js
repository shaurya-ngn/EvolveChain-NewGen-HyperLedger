const fs = require("fs");
const ejs = require('ejs');
const path = require("path");
const _ = require('lodash');
const config = require('config');
const status = config.get('status');
const messages = config.get('messages');
var ObjectId = require('mongodb').ObjectID;
var mongo = require('mongodb');
const md5 = require('md5');
const commonUtility = require('../../helpers/CommonUtility');
const logManager = require('../../helpers/LogManager');
const BaseController = require('../BaseController');
const App = require('../../models/apps');
const Document = require('../../models/document');
const File = require('../../models/files');
const BASE_PATH = config.get('base_path');
const PUBLIC_PATH = config.get('PUBLIC_PATH');


mongo.MongoClient.connect(config.get('MONGODB_URL'), function (err, db) {
    if (err) {
        // logManager.Write("Database....." + err);
    }
    else {
        database = db.db(config.get('DB_NAME'));
        bucket = new mongo.GridFSBucket(database);
    }
});

class AppController extends BaseController {

    //#region Initialize
    async Initialize(req, res) {

        req.checkBody("ip", messages.req_IP).notEmpty();
        req.checkBody("device_type", messages.req_device_type).notEmpty();
        req.checkBody("device_name", messages.req_device_name).notEmpty();
        req.checkBody("os_version", messages.req_os_version).notEmpty();
        req.checkBody("vendor_uuid", messages.req_vendor_uuid).notEmpty();

        try {

            let result = await req.getValidationResult();

            if (!result.isEmpty()) {
                let error = this.GetErrors(result);
                logManager.Log(`Initialize:Error- ${error}`);

                return this.GetErrorResponse(error, res);
            }

            let body = _.pick(req.body, ['ip', 'device_type', 'device_name', 'os_version', 'vendor_uuid']);
            logManager.Log(`Initialize:${body.ip}`);
            body.key = md5(Date.now());
            body.SERVER_ADDR = md5(req.connection.localAddress);
            body.REMOTE_ADDR = md5(req.connection.remoteAddress);

            commonUtility.RemoveNull(params); // remove blank value from array
            
            var newApp = new App(params);

            newApp.save().then((lastAddedApp) => {
                return this.GetSuccessResponse("Initialize", lastAddedApp, res);
                     }).catch(function (error) {
                return this.GetErrorResponse(error, res);
            });
            // //Newgen:check if vendor_uuid already exist then update the info else add new record
            // let conditions = {
            //     vendor_uuid: body.vendor_uuid
            // }

            // App.findOne(conditions, (error, app) => {

            //     if (error) return this.GetErrorResponse(error, res);

            //     if (!app) {
            //         var params = {
            //             IP: body.ip,
            //             device_type: body.device_type,
            //             device_name: body.device_name,
            //             os_version: body.os_version,
            //             vendor_uuid: body.vendor_uuid,
            //             key: body.key,
            //             isdelete: '0',
            //             Server: body.SERVER_ADDR,
            //             Refer: body.REMOTE_ADDR
            //         }
            //         commonUtility.RemoveNull(params); // remove blank value from array
            //         var newApp = new App(params);

            //         newApp.save().then((lastAddedApp) => {
            //             return this.GetSuccessResponse("Initialize", lastAddedApp, res);
            //             // return res.status(status.OK).jsonp(response);

            //         }).catch(function (error) {
            //             return this.GetErrorResponse(error, res);
            //         });
            //     }
            //     else {
            //         return this.GetSuccessResponse("Initialize", app, res);
            //     }
            // });

        } catch (e) {
            console.log(`Error :: ${e}`);
            let error = `Error :: ${e}`;
            return this.GetErrorResponse(error, res);
        }
    }
    //#endregion

    async SetPin(req, res) {

        if (_.isUndefined(req.params.key) || req.params.key == '' || req.params.key == null) {
            return this.GetErrorResponse('Key missing!', res);
        }

        req.checkBody("pin", messages.req_pin).notEmpty();
        req.checkBody("pin", messages.req_pin_numeric).isNumeric();
        req.checkBody("pin", messages.req_pin_length).isLength({ min: 4, max: 4 });

        try {

            let result = await req.getValidationResult();
            if (!result.isEmpty()) {
                let error = this.GetErrors(result);
                return this.GetErrorResponse(error, res);

            }

            let body = _.pick(req.body, ['pin']);
            body.key = req.params.key;
            let targetPin = md5(body.pin);
            let conditions = {
                key: body.key
            }

            App.findOne(conditions, (error, app) => {

                if (error) return this.GetErrorResponse(error, res);

                if (!app)
                    this.GetErrorResponse(messages.invalid_key, res);

                // return res.status(status.OK).jsonp({
                //     "success": 0,
                //     "error": messages.invalid_key
                // });

                var params = {
                    pin: targetPin
                }

                App.update({
                    _id: app._id
                }, {
                        $set: params
                    }).then((success) => {
                        app.pin = targetPin;
                        return this.GetSuccessResponse("SetPin", app, res);
                    }).catch(function (error) {
                        this.GetErrorResponse(error, res);
                        // return res.status(status.OK).jsonp({'success': 0,"error": error});
                    });
            })

        } catch (e) {
            console.log(`Error :: ${e}`);
            let error = `Error :: ${e}`;
            this.GetErrorResponse(error, res);
        }
    }

    async CheckPin(req, res) {

        if (_.isUndefined(req.params.key) || req.params.key == '' || req.params.key == null) {
            return res.status(status.OK).json({ 'success': 0, 'now': Date.now(), 'error': 'Key missing!' });
        }

        try {

            let key = req.params.key;

            let conditions = {
                key: key
            }

            App.findOne(conditions, (error, app) => {

                if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                if (!app) return res.status(status.OK).jsonp({
                    "success": 0,
                    "error": messages.invalid_key
                });

                var response = {
                    'success': 1,
                    'now': Date.now(),
                    'key': app.key,
                    'pin': app.pin,
                    'Server': app.Server,
                    'Refer': app.Refer
                }
                return res.status(status.OK).jsonp(response);
            })

        } catch (e) {
            console.log(`Error :: ${e}`);
            let err = `Error :: ${e}`;
            return res.status(status.OK).json({ 'success': 0, "error": err });
        }
    }

    async ChangePin(req, res) {

        if (_.isUndefined(req.params.key) || req.params.key == '' || req.params.key == null) {
            return res.status(status.OK).json({ 'success': 0, 'now': Date.now(), 'error': 'Key missing!' });
        }

        req.checkBody("pin", messages.req_pin).notEmpty();
        req.checkBody("new_pin", messages.req_new_pin).notEmpty();
        req.checkBody("new_pin", messages.req_new_pin_numeric).isNumeric();
        req.checkBody("new_pin", messages.req_new_pin_length).isLength({ min: 4, max: 4 });

        try {
            let result = await req.getValidationResult();

            if (!result.isEmpty()) {
                let error = this.GetErrors(result);
                return this.GetErrorResponse(error, res);
            }

            let body = _.pick(req.body, ['pin', 'new_pin']);

            if (body.pin == body.new_pin) {
                return res.status(status.OK).json({ 'success': 0, 'now': Date.now(), 'error': messages.same_pin });
            }

            body.key = req.params.key;

            let conditions = {
                key: body.key,
                pin: md5(body.pin)
            }

            App.findOne(conditions, (error, app) => {

                if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                if (!app) return res.status(status.OK).jsonp({
                    "success": 0,
                    "error": messages.mismatch_old_pin
                });

                var params = {
                    pin: md5(body.new_pin)
                }

                App.update({
                    _id: app._id
                }, {
                        $set: params
                    }).then((success) => {

                        var response = {
                            'success': 1,
                            'now': Date.now(),
                            'result': 'New Pin updated',
                            'pin': body.new_pin
                        }
                        return res.status(status.OK).jsonp(response);

                    }).catch(function (error) {
                        return res.status(status.OK).jsonp({ 'success': 0, "error": error });
                    });
            })

        } catch (e) {
            console.log(`Error :: ${e}`);
            let err = `Error :: ${e}`;
            return res.status(status.OK).json({ 'success': 0, "error": err });
        }
    }

    async GetProfile(req, res) {

        if (_.isUndefined(req.params.key) || req.params.key == '' || req.params.key == null) {
            return res.status(status.OK).json({ 'success': 0, 'now': Date.now(), 'error': 'Key missing!' });
        }

        try {
            let key = req.params.key;

            let conditions = {
                key: key
            }

            App.findOne(conditions, (error, app) => {

                if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                if (!app) return res.status(status.OK).jsonp({
                    "success": 0,
                    "error": messages.invalid_key
                });

                let document_query = {
                    hash: app.hash
                }

                Document.findOne(document_query, (error, doc) => {

                    if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                    if (!doc) return res.status(status.OK).jsonp({
                        "success": 0,
                        "error": messages.document_not_found
                    });

                    this.GetImage(doc.hash, 'profile_img', function (response) {
                        if (response.error == true) {
                            return res.status(status.OK).jsonp({
                                "success": 0,
                                "error": messages.something_wentwrong
                            });
                        }
                        else {
                            var response = {
                                'success': 1,
                                'now': Date.now(),
                                'result': messages.get_profile,
                                'kyc_id': doc.kyc_id,
                                'email': doc.email,
                                'name': doc.details.Name,
                                'phone': doc.phone,
                                'address': doc.details.Address,
                                'passport': doc.details.Passport,
                                'tax': doc.details.Tax,
                                'identity': doc.details.Identity,
                                'driving': doc.details.Driving,
                                'profile': config.get('FTP_URL') + "/profiles/" + doc.profile,
                            }
                            return res.status(status.OK).jsonp(response);
                        }
                    });
                })
            })

        } catch (e) {
            console.log(`Error :: ${e}`);
            let err = `Error :: ${e}`;
            return res.status(status.OK).json({ 'success': 0, "error": err });
        }
    }

    async Logout(req, res) {

        if (_.isUndefined(req.params.key) || req.params.key == '' || req.params.key == null) {
            return res.status(status.OK).json({ 'success': 0, 'now': Date.now(), 'error': 'Key missing!' });
        }

        try {

            let key = req.params.key;

            let conditions = {
                key: key,
                isdelete: '0'
            }

            App.findOne(conditions, (error, app) => {

                if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                if (!app) return res.status(status.OK).jsonp({
                    "success": 0,
                    "error": messages.invalid_login
                });

                var response = {
                    'success': 1,
                    'now': Date.now(),
                    'result': messages.success_logout
                }
                return res.status(status.OK).jsonp(response);
            })

        } catch (e) {
            console.log(`Error :: ${e}`);
            let err = `Error :: ${e}`;
            return res.status(status.OK).json({ 'success': 0, "error": err });
        }
    }

    async Login(req, res) {

        if (_.isUndefined(req.params.key) || req.params.key == '' || req.params.key == null) {
            return res.status(status.OK).json({ 'success': 0, 'now': Date.now(), 'error': 'Key missing!' });
        }

        req.checkBody("kycid", messages.req_kycid).notEmpty();
        req.checkBody("number", messages.req_number).notEmpty();
        req.checkBody("Ip", messages.req_IP).notEmpty();

        try {
            let result = await req.getValidationResult();

            if (!result.isEmpty()) {

                let error = this.GetErrors(result);
                return this.GetErrorResponse(error, res);

            }

            let body = _.pick(req.body, ['kycid', 'number', 'Ip']);

            body.key = req.params.key;

            var conditions = {
                key: body.key,
                isdelete: '0'
            }

            App.findOne(conditions, (error, app) => {

                if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                if (!app) return res.status(status.OK).jsonp({
                    "success": 0,
                    "error": messages.invalid_key
                });

                var conditions = {
                    kyc_id: body.kycid,
                    "$or": [{
                        "details.Identity.no": body.number
                    }, {
                        "details.Tax.id": body.number
                    }]
                }

                Document.findOne(conditions, (error, doc) => {

                    if (error) return res.status(status.OK).jsonp({ "success": 0, "error": error });

                    if (!doc) return res.status(status.OK).jsonp({
                        "success": 0,
                        "error": messages.document_not_found
                    });
                    //doc.Verify.Score = 70;
                    if (doc.Verify.Score >= 70) { // check for verify score
                        var conditions = {
                            hash: doc.hash
                        }

                        var params = {
                            isdelete: '1'
                        }

                        this.UpdateApp(conditions, params, function (response) {
                            if (response.error == true) {
                                return res.status(status.OK).jsonp({
                                    "success": 0,
                                    "error": response.message
                                });
                            }
                            else {
                                var conditions = {
                                    key: body.key
                                }

                                var params = {
                                    email: doc.email,
                                    hash: doc.hash,
                                    phone: doc.phone,
                                    IP: body.Ip,
                                    isdelete: '0'
                                }

                                this.UpdateApp(conditions, params, function (response) {
                                    if (response.error == true) {
                                        return res.status(status.OK).jsonp({
                                            "success": 0,
                                            "error": response.message
                                        });
                                    }
                                    else {
                                        if (_.isUndefined(doc.profile) || _.isEmpty(doc.profile)) {
                                            // below code not verified -> need to confirm
                                            this.GetImage(doc.hash, 'profile_img', function (response) {
                                                if (response.error == true) {
                                                    return res.status(status.OK).jsonp({
                                                        "success": 0,
                                                        "error": response.message
                                                    });
                                                }
                                                else {

                                                    var path = response.data.path;

                                                    var path = path
                                                    var save = path

                                                    commonUtility.ImageResize(path, save, 300, function (response) {
                                                        if (response.error == true) {
                                                            return res.status(status.OK).jsonp({
                                                                "success": 0,
                                                                "error": messages.something_wentwrong
                                                            });
                                                        }
                                                        else {
                                                            var profile = response.data;

                                                            var conditions = {
                                                                hash: doc.hash
                                                            }

                                                            var params = {
                                                                profile: profile
                                                            }

                                                            this.UpdateDocument(conditions, params, function (response) {
                                                                if (response.error == true) {
                                                                    return res.status(status.OK).jsonp({
                                                                        "success": 0,
                                                                        "error": messages.something_wentwrong
                                                                    });
                                                                }
                                                                else {
                                                                    var doc_updated = response.data;
                                                                    var response = {
                                                                        'success': 1,
                                                                        'now': Date.now(),
                                                                        'result': messages.login_success,
                                                                        'kyc_id': doc_updated.kyc_id,
                                                                        'email': doc_updated.email,
                                                                        'name': doc_updated.details.Name,
                                                                        'phone': doc_updated.phone,
                                                                        'address': doc_updated.details.Address,
                                                                        'passport': doc_updated.details.Passport,
                                                                        'tax': doc_updated.details.Tax,
                                                                        'identity': doc_updated.details.Identity,
                                                                        'driving': doc_updated.details.Driving,
                                                                        'profile': config.get('base_url') + "/" + doc_updated.profile,
                                                                    }
                                                                    return res.status(status.OK).jsonp(response);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });

                                        }
                                        else {
                                            var response = {
                                                'success': 1,
                                                'now': Date.now(),
                                                'result': messages.login_success,
                                                'kyc_id': doc.kyc_id,
                                                'email': doc.email,
                                                'name': doc.details.Name,
                                                'phone': doc.phone,
                                                'address': doc.details.Address,
                                                'passport': doc.details.Passport,
                                                'tax': doc.details.Tax,
                                                'identity': doc.details.Identity,
                                                'driving': doc.details.Driving,
                                                'profile': config.get('base_url') + "/" + doc.profile,
                                            }
                                            return res.status(status.OK).jsonp(response);
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        return res.status(status.OK).jsonp({
                            "success": 0,
                            "error": messages.KYC_not_veryfied
                        });
                    }
                })
            })

        } catch (e) {
            console.log(`Error :: ${e}`);
            let err = `Error :: ${e}`;
            return res.status(status.OK).json({ 'success': 0, "error": err });
        }
    }


    //Common function for Success/Failure response

    GetSuccessResponse(apiName, appEntity, res) {
        var response = {};
        switch (apiName) {
            case "Initialize":
                response = {
                    'success': 1,
                    'now': Date.now(),
                    'key': appEntity.key,
                    'ip': appEntity.IP,
                    'Server': appEntity.Server,
                    'Refer': appEntity.Refer
                };
                break;
            case "SetPin":
                response = {
                    'success': 1,
                    'now': Date.now(),
                    'key': appEntity.key,
                    'pin': appEntity.pin,
                    'Server': appEntity.Server,
                    'Refer': appEntity.Refer
                }
                break;
        }

        return res.status(status.OK).jsonp(response);
    }



    // async getErrors(result,callback) // common function for check errors
    // {

    //     let resultArray = {
    //         "success": 0,
    //         "now": Date.now(),
    //         "error": result.array()[0].msg
    //     }
    //     callback(resultArray);
    // }

    // common for update App
    async UpdateApp(conditions, params = [], callback) // common function for update App
    {
        let response = {
            'error': true,
            'data': [],
            'message': messages.something_wentwrong,
        }

        App.update(conditions,
            {
                $set: params
            }).then((success) => {
                App.findOne(conditions, (error, app) => {

                    if (error) {

                        let err = `Error :: ${error}`;
                        response.message = err;

                    } else if (!app) {

                        response.message = messages.app_not_found;

                    } else {
                        response.error = false;
                        response.message = messages.app_data;
                        response.data = app;
                    }

                    callback(response);
                })
            }).catch(function (error) {
                response.message = error;
                callback(response);
            });
    }

    // common for update document
    async UpdateDocument(conditions, params = [], callback) // common function for update Document
    {
        let response = {
            'error': true,
            'data': [],
            'message': messages.something_wentwrong,
        }

        Document.update(conditions,
            {
                $set: params
            }).then((success) => {
                Document.findOne(conditions, (error, doc) => {

                    if (error) {

                        let err = `Error :: ${error}`;
                        response.message = err;

                    } else if (!doc) {

                        response.message = messages.doc_not_found;

                    } else {
                        response.error = false;
                        response.message = messages.doc_data;
                        response.data = doc;
                    }

                    callback(response);
                })
            }).catch(function (error) {
                response.message = error;
                callback(response);
            });
    }

    // common for get image
    async GetImage(id = null, type = null, callback) {
        let response = {
            'error': true,
            'data': [],
            'message': messages.something_wentwrong,
        }
        var file_field = 'details_' + type + '_id';

        Document.findOne({ 'hash': id }, (error, doc) => {

            if (error) {
                response.message = error;
                callback(response);
            } else if (!doc) {
                response.message = messages.app_not_found;
                callback(response);
            } else {
                var conditions = {
                    [file_field]: doc._id.toString()
                }

                File.findOne(conditions, (error, fileData) => {

                    if (error) {

                        let err = `Error :: ${error}`;
                        response.message = err;
                        callback(response);

                    } else if (!fileData) {

                        response.message = messages.app_not_found;
                        callback(response);

                    } else {
                        //console.log(fileData);return false;
                        var image_name_name = fileData._id + '_' + fileData.filename;
                        var path = PUBLIC_PATH + '/webroot/documents/' + image_name_name;
                        var return_path = config.get('COMPANY_URL') + '/documents/' + image_name_name;

                        var image_name_name = fileData._id + '_' + fileData.filename;
                        var path = 'public/webroot/documents/' + image_name_name;
                        var return_path = config.get('COMPANY_URL') + '/documents/' + image_name_name;

                        bucket.openDownloadStream(fileData._id)
                            .pipe(fs.createWriteStream(path))
                            .on('error', function (error) {
                                assert.ifError(error);
                                response.message = err;
                            })
                            .on('finish', function () {
                                console.log('done!');
                                response.error = false;
                                response.message = messages.image_data;
                                response.data = { "return_path": return_path, "path": path };
                                callback(response);
                            });

                    }
                });
            }
        })
    }

}

module.exports = new AppController();