/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';
var textHelper = require('./textHelper'),
    storage = require('./storage');

var registerIntentHandlers = function (intentHandlers, skillContext) {
    intentHandlers.NewlogIntent = function (intent, session, response) {
        //reset for all existing nutritional values
        storage.loadlog(session, function (currentlog) {
            if (currentlog.data.nutritions.length === 0) {
                response.ask('New log initiated. Who\'s information is this for?',
                    'Please tell me who\'s information this is for?');
                return;
            }
            currentlog.data.nutritions.forEach(function (nutrition) {
                currentlog.data.scores[nutrition] = 0
            });
            currentlog.save(function () {
                var speechOutput = 'New log started with '
                    + currentlog.data.nutritions.length + ' existing nutritional type';
                if (currentlog.data.nutritions.length > 1) {
                    speechOutput += 's';
                }
                speechOutput += '.';
                if (skillContext.needMoreHelp) {
                    speechOutput += '. You can update a nutritional type, add another nutritional type, reset all nutritional types or exit. What would you like?';
                    var repromptText = 'You can update a nutritional type, add another nutritional type, reset all nutritional types or exit. What would you like?';
                    response.ask(speechOutput, repromptText);
                } else {
                    response.tell(speechOutput);
                }
            });
        });
    };

    intentHandlers.AddNutritionIntent = function (intent, session, response) {
        //add a nutritional value to the current log, 
        //terminate or continue the conversation based on whether the intent
        //is from a one shot command or not.
        var newNutritionName = textHelper.getNutritionName(intent.slots.NutritionName.value);
        if (!newNutritionName) {
            response.ask('OK. What do you want to add?', 'What do you want to add?');
            return;
        }
        storage.loadlog(session, function (currentlog) {
            var speechOutput,
                reprompt;
            if (currentlog.data.scores[newNutritionName] !== undefined) {
                speechOutput = newNutritionName + ' has already been added.';
                if (skillContext.needMoreHelp) {
                    response.ask(speechOutput + ' What else?', 'What else?');
                } else {
                    response.tell(speechOutput);
                }
                return;
            }
            speechOutput = newNutritionName + ' has been added to your log. ';
            currentlog.data.nutritions.push(newNutritionName);
            currentlog.data.scores[newNutritionName] = 0;
            if (skillContext.needMoreHelp) {
                if (currentlog.data.nutritions.length == 1) {
                    speechOutput += 'Would you like to set a value to a nutritional type or add another type. You can also say, I am Done Adding nutritional types.';
                    reprompt = textHelper.nextHelp;
                } else {
                    speechOutput += 'What is your next desired nutritional type?';
                    reprompt = textHelper.nextHelp;
                }
            }
            currentlog.save(function () {
                if (reprompt) {
                    response.ask(speechOutput, reprompt);
                } else {
                    response.tell(speechOutput);
                }
            });
        });
    };

    intentHandlers.AddScoreIntent = function (intent, session, response) {
        //give a nutritional value, ask additional question if slot values are missing.
        var nutritionName = textHelper.getNutritionName(intent.slots.NutritionName.value),
            score = intent.slots.ScoreNumber,
            scoreValue;
        if (!nutritionName) {
            response.ask('sorry, I did not hear the nutritional type, please say that again', 'Please say the type again');
            return;
        }
        scoreValue = parseInt(score.value);
        if (isNaN(scoreValue)) {
            console.log('Invalid nutritional type = ' + score.value);
            response.ask('sorry, I did not hear the type, please say that again', 'please say the type again');
            return;
        }
        storage.loadlog(session, function (currentlog) {
            var targetNutrition, speechOutput = '', newScore;
            if (currentlog.data.nutritions.length < 1) {
                response.ask('sorry, no nutritional type added to the log yet, what can I do for you?', 'what can I do for you?');
                return;
            }
            for (var i = 0; i < currentlog.data.nutritions.length; i++) {
                if (currentlog.data.nutritions[i] === nutritionName) {
                    targetNutrition = currentlog.data.nutritions[i];
                    break;
                }
            }
            if (!targetNutrition) {
                response.ask('Sorry, ' + nutritionName + ' has not been added to the log. What else?', nutritionName + ' has not been added to the log. What else?');
                return;
            }
            newScore = currentlog.data.scores[targetNutrition] + scoreValue;
            currentlog.data.scores[targetNutrition] = newScore;

            speechOutput += scoreValue + ' for ' + targetNutrition + '. ';
            if (currentlog.data.nutritions.length == 1 || currentlog.data.nutritions.length > 3) {
                speechOutput += targetNutrition + ' has ' + newScore + ' in total.';
                return;
            } else {
                speechOutput += 'That\'s ';
                currentlog.data.nutritions.forEach(function (nutrition, index) {
                    if (index === currentlog.data.nutritions.length - 1) {
                        speechOutput += 'And ';
                    }
                    speechOutput +=  nutrition + ', ' + currentlog.data.scores[nutrition];
                    speechOutput += ', ';
                });
            }
            currentlog.save(function () {
                response.tell(speechOutput);
            });
        });
    };

    intentHandlers.TellScoresIntent = function (intent, session, response) {
        //tells the scores in the leaderboard and send the result in card.
        storage.loadlog(session, function (currentlog) {
            var sortedNutritionScores = [],
                continueSession,
                speechOutput = '',
                leaderboard = '';
            if (currentlog.data.nutritions.length === 0) {
                response.tell('Nobody has joined the log.');
                return;
            }
            currentlog.data.nutritions.forEach(function (nutrition) {
                sortedNutritionScores.push({
                    score: currentlog.data.scores[nutrition],
                    nutrition: nutrition
                });
            });
            sortedNutritionScores.sort(function (p1, p2) {
                return p2.score - p1.score;
            });
            sortedNutritionScores.forEach(function (nutritionScore, index) {
                if (index === 0) {
                    speechOutput += nutritionScore.nutrition + ' has up to ' + nutritionScore.score;
                    if (nutritionScore.score > 1) {
                        speechOutput += 's';
                    }
                } else if (index === sortedNutritionScores.length - 1) {
                    speechOutput += 'And ' + nutritionScore.nutrition + ' has ' + nutritionScore.score;
                } else {
                    speechOutput += nutritionScore.nutrition + ', ' + nutritionScore.score;
                }
                speechOutput += '. ';
                leaderboard += 'No.' + (index + 1) + ' - ' + nutritionScore.nutrition + ' : ' + nutritionScore.score + '\n';
            });
            response.tellWithCard(speechOutput, "nutritional data", leaderboard);
        });
    };

    intentHandlers.ResetNutritionIntent = function (intent, session, response) {
        //remove all nutritional values
        storage.newlog(session).save(function () {
            response.ask('New log started without type, what do you want to add first?', 'What do you want to add first?');
        });
    };

    intentHandlers['AMAZON.HelpIntent'] = function (intent, session, response) {
        var speechOutput = textHelper.completeHelp;
        if (skillContext.needMoreHelp) {
            response.ask(textHelper.completeHelp + ' So, how can I help?', 'How can I help?');
        } else {
            response.tell(textHelper.completeHelp);
        }
    };

    intentHandlers['AMAZON.CancelIntent'] = function (intent, session, response) {
        if (skillContext.needMoreHelp) {
            response.tell('Okay.  I will miss you. Goodbye.');
        } else {
            response.tell('');
        }
    };

    intentHandlers['AMAZON.StopIntent'] = function (intent, session, response) {
        if (skillContext.needMoreHelp) {
            response.tell('Okay.  I will miss you. Goodbye.');
        } else {
            response.tell('');
        }
    };
};
exports.register = registerIntentHandlers;
