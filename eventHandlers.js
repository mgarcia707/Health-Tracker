/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';
var storage = require('./storage'),
    textHelper = require('./textHelper');

var registerEventHandlers = function (eventHandlers, skillContext) {
    eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
        //if nutrition said a one shot command that triggered an intent event,
        //it will start a new session, and then we should avoid speaking too many words.
        skillContext.needMoreHelp = false;
    };

    eventHandlers.onLaunch = function (launchRequest, session, response) {
        //Speak welcome message and ask nutrition questions
        //based on whether there are nutritions or not.
        storage.loadlog(session, function (currentlog) {
            var speechOutput = '',
                reprompt;
                //speechOutput += String(val);
            if (currentlog.data.nutritions.length === 0) {
                speechOutput += 'Welcome to the Health Tracker. Let\'s start your log. What type of nutrition would you like to input?';
                reprompt = "Please tell me the type that you desire?";
            } else if (currentlog.isEmptyScore()) {
                speechOutput += 'No Nutritional values added';
                if (currentlog.data.nutritions.length > 1) {
                    speechOutput += 's';
                }
                speechOutput += ' in the log. You can update a nutritional type, add another nutritional type, reset all nutritional types or exit. Which would you like?';
                reprompt = textHelper.completeHelp;
            } else {
                speechOutput += 'you have ' + currentlog.data.nutritions.length + ' Nutritional types added. What can I do for you next?';
                reprompt = textHelper.nextHelp;
            }
            response.ask(speechOutput, reprompt);
        });
    };
};
exports.register = registerEventHandlers;
