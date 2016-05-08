/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';
var AWS = require("aws-sdk");

var storage = (function () {
    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    /*
     * The log class stores all log states for the Nutritional values
     */
    function log(session, data) {
        if (data) {
            this.data = data;
        } else {
            this.data = {
                nutritions: [], 
                scores: {}
            };
        }
        this._session = session;
    }

    log.prototype = {
        isEmptyScore: function () {
            //check if any one had non-zero score,
            //it can be used as an indication of whether the log has just started
            var allEmpty = true;
            var logData = this.data;
            logData.nutritions.forEach(function (nutrition) {
                if (logData.scores[nutrition] !== 0) {
                    allEmpty = false;
                }
            });
            return allEmpty;
        },
        /*isNutritionDataSet: function (){

        };*/
        save: function (callback) {
            //save the log states in the session,
            //so next time we can save a read from dynamoDB
            this._session.attributes.currentlog = this.data;
            dynamodb.putItem({
                TableName: 'HealthInformationUserData',
                Item: {
                    CustomerId: {
                        S: this._session.user.userId
                    },
                    Data: {
                        S: JSON.stringify(this.data)
                    }
                }
            }, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                }
                if (callback) {
                    callback();
                }
            });
        }
    };

    return {
        loadlog: function (session, callback) {
            if (session.attributes.currentlog) {
                console.log('get log from session=' + session.attributes.currentlog);
                callback(new log(session, session.attributes.currentlog));
                return;
            }
            dynamodb.getItem({
                TableName: 'HealthInformationUserData',
                Key: {
                    CustomerId: {
                        S: session.user.userId
                    }
                }
            }, function (err, data) {
                var currentlog;
                if (err) {
                    console.log(err, err.stack);
                    currentlog = new log(session);
                    session.attributes.currentlog = currentlog.data;
                    callback(currentlog);
                } else if (data.Item === undefined) {
                    currentlog = new log(session);
                    session.attributes.currentlog = currentlog.data;
                    callback(currentlog);
                } else {
                    console.log('get log from dynamodb=' + data.Item.Data.S);
                    currentlog = new log(session, JSON.parse(data.Item.Data.S));
                    session.attributes.currentlog = currentlog.data;
                    callback(currentlog);
                }
            });
        },
        newlog: function (session) {
            return new log(session);
        }
    };
})();
module.exports = storage;
