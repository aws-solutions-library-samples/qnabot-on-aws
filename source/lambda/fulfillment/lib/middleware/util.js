/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const _ = require('lodash');
const { Lambda } = require('@aws-sdk/client-lambda');
const customSdkConfig = require('sdk-config/customSdkConfig');
const region = process.env.AWS_REGION || 'us-east-1';
const lambda = new Lambda(customSdkConfig('C013', { region }));
const qnabot = require('qnabot/logging');

exports.getLambdaArn = function (name) {
    const match = name.match(/QNA:(.*)/);
    if (match) {
        return process.env[match[1]] || name;
    }
    return name;
};

exports.isSameAccountArn = function (arn) {
    // Bare function names (no 'arn:' prefix) are passed by legitimate callers
    // (e.g. Quiz.js sets session.queryLambda = process.env.AWS_LAMBDA_FUNCTION_NAME).
    // The cross-account injection attack requires a full ARN to route invocation
    // to attacker-controlled infrastructure — that case is verified below.
    if (!arn.startsWith('arn:')) {
        return true;
    }
    const match = arn.match(/^arn:aws[\w-]*:lambda:[^:]+:(\d{12}):/);
    return match && match[1] === process.env.AWS_ACCOUNT_ID;
};

exports.invokeLambda = async function (params) {
    qnabot.log(`Invoking ${params.FunctionName}`);
    const payload = params.Payload || JSON.stringify({
        req: params.req,
        res: params.res,
    });
    qnabot.debug('Invoke Lambda Payload:', payload);
    const result = await lambda.invoke({
        FunctionName: params.FunctionName,
        InvocationType: params.InvocationType || 'RequestResponse',
        Payload: payload,
    });

    if (!result.FunctionError) {
        try {
            if (result.Payload && Object.keys(result.Payload).length !== 0) {
                const payloadObj = Buffer.from(result.Payload).toString();
                const parsed = JSON.parse(payloadObj);
                qnabot.log('Response', JSON.stringify(parsed, null, 2));
                return parsed;
            }
        } catch (e) {
            qnabot.log("An error occurred while parsing payload: ", e);
            throw e;
        }
    } else {
        let error_message;

        switch (params.req._type) {
        case 'LEX':
            error_message = new LexError(_.get(params, 'req._settings.ERRORMESSAGE', 'Exception from Lambda Hook'));
            break;
        case 'ALEXA':
            error_message = new AlexaError(_.get(params, 'req._settings.ERRORMESSAGE', 'Exception from Lambda Hook'));
            break;
        }

        qnabot.log('Error Response', JSON.stringify(error_message, null, 2));
        throw error_message;
    }
};

function Respond(message) {
    this.action = 'RESPOND';
    this.message = message;
}

function AlexaError(errormessage) {
    this.action = 'RESPOND';
    this.message = {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'PlainText',
                text: errormessage,
            },
            card: {
                type: 'Simple',
                title: 'Processing Error',
                content: errormessage,
            },
            shouldEndSession: true,
        },
    };
}

function LexError(errormessage) {
    this.action = 'RESPOND';
    this.message = {
        dialogAction: {
            type: 'Close',
            fulfillmentState: 'Fulfilled',
            message: {
                contentType: 'PlainText',
                content: errormessage,
            },
        },
    };
}