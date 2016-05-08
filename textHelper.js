/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';
var textHelper = (function () {
    var nameBlacklist = {
        nutrition: 1,
        nutritions: 1
    };

    return {
        completeHelp: 'Here\'s some things you can say,'
        + ' add value to type.'
        + ' add 100 calories.'
        + ' tell me the calorie count.'
        + ' new log.'
        + ' reset.'
        + ' and exit.',
        nextHelp: 'You can update a nutritional value, add a nutritional value, get the current types, or say help. What would you like?',

        getNutritionName: function (recognizedNutritionName) {
            if (!recognizedNutritionName) {
                return undefined;
            }
            var split = recognizedNutritionName.indexOf(' '), newName;

            if (split < 0) {
                newName = recognizedNutritionName;
            } else {
                //the name should only contain a first name, so ignore the second part if any
                newName = recognizedNutritionName.substring(0, split);
            }
            if (nameBlacklist[newName]) {
                //if the name is on our blacklist, it must be mis-recognition
                return undefined;
            }
            return newName;
        }
    };
})();
module.exports = textHelper;
