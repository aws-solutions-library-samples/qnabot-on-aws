/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const { S3Client, waitUntilObjectExists, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const customSdkConfig = require('sdk-config/customSdkConfig');
const region = process.env.AWS_REGION;
const s3 = new S3Client(customSdkConfig('C010', { region }));
const stride = parseInt(process.env.STRIDE);
const _ = require('lodash');
const qnabot = require('qnabot/logging');
const qna_settings = require('qnabot/settings');
const convertxlsx = require('./convert-xlsx');
const delete_existing_content = require('./delete_existing_content');
// imports from es-proxy-layer
const get_embeddings = require('/opt/lib/embeddings.js');
const request = require('/opt/lib/request.js');

async function get_settings() {
    const settings = await qna_settings.getSettings();
    qnabot.debug('Merged Settings: ', settings);
    return settings;
}
// async function es_bulk_load(body) {
// Disable bulk load.. Instead save docs one at a time, for now, due to issues with k-nn index after bulk load
//     const es_response = await request({
//         url: `https://${process.env.ES_ENDPOINT}/_bulk`,
//         method: 'POST',
//         headers: { 'Content-Type': 'application/x-ndjson' },
//         body,
//     });
//     qnabot.log('Response (first 500 chars): ', JSON.stringify(es_response, null, 2).slice(0, 500));
//     return es_response;
// };

async function es_store_doc(index, id, body) {
    const es_response = await request({
        url: `https://${process.env.ES_ENDPOINT}/${index}/_doc/${id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
    });
    qnabot.debug('Response: ', JSON.stringify(es_response, null, 2).slice(0, 500));
    return es_response;
}

function isCompleteChar(str, pos) {
    try {
        const charCode = str.charCodeAt(pos);
        // If we see the replacement character (�), it's not a complete char
        if (charCode === 0xFFFD) {
            return false;
        }
        return charCode !== undefined && !Number.isNaN(charCode);
    } catch (e) {
        return false;
    }
}

exports.step = async function (event, context) {
    try {
        qnabot.log('step');
        qnabot.log('Request', JSON.stringify(event, null, 2));
        const Bucket = event.Records[0].s3.bucket.name;
        const Key = decodeURI(event.Records[0].s3.object.key);
        const output_bucket = process.env.OUTPUT_S3_BUCKET;
        const output_key = `status-import/${Key.split('/').pop()}`
        let progress;
        await waitUntilObjectExists(
            {
                client: s3,
                maxWaitTime: 10
            },
            {
                Bucket,
                Key
            }
        );
        const x = await s3.send(new GetObjectCommand({ Bucket, Key }));
        const res = await x.Body.transformToString();
        const config = JSON.parse(res);
        qnabot.log('Config:', JSON.stringify(config, null, 2));
        while (config.progress < 1 ) {
            if (config.status === 'InProgress') {
                // NOSONAR TODO - design a more robust way to identify target ES index for auto import of metrics and feedback
                // Filenames must match across:
                // aws-ai-qna-bot/templates/import/UpgradeAutoImport.js
                // aws-ai-qna-bot/templates/master/UpgradeAutoExport.js
                // and pattern in /aws-ai-qna-bot/lambda/import/index.js
                const esindex = getOsIndex(Key);
                qnabot.log('Importing to index: ', esindex);
                try {
                    const params = {
                        Bucket: config.bucket,
                        Key: config.key,
                        VersionId: config.version,
                        Range: `bytes=${config.start}-${config.end}`
                    };
                    const result = await s3.send(new GetObjectCommand(params));
                    const originalChunk = await result.Body.transformToString();
                    let lastComplete = originalChunk.length;
                    while (lastComplete > 0 && !isCompleteChar(originalChunk, lastComplete - 1)) {
                        lastComplete--;
                    }
                    const modifiedChunkData = originalChunk.slice(0, lastComplete);
                    const encoder = new TextEncoder();
                    const byteLength = encoder.encode(modifiedChunkData).length;
                    const settings = await get_settings();
                    let objects = [];
                    const arrayResults = await processQuestionArray(config.buffer, modifiedChunkData, s3, params);
                    config.buffer = arrayResults.buffer;
                    objects = arrayResults.objects;

                    const { out, success, failed } = await processQuestionObjects(objects, settings, esindex, config);
                    config.count = success;
                    config.failed = failed;
                    qnabot.log('Current contentRange: ', result.ContentRange);
                    const tmp = result.ContentRange.match(/bytes (.*)-(.*)\/(.*)/); // NOSONAR - javascript:S5852 - input is user controlled and we have a limit on the number of characters
                    progress = (parseInt(tmp[2]) + 1) / parseInt(tmp[3]);
                    const ES_formatted_content = `${out.join('\n')}\n`;
                    await delete_existing_content.delete_existing_content(esindex, config, ES_formatted_content); // check and delete existing content (if parameter to delete has been passed in the options {file}
                    /*
                        // Disable bulk load.. Instead save docs one at a time, for now, due to issues with k-nn index after bulk load
                        .then(function (result) {
                            return es_bulk_load(result)
                                .then(x => {
                                    config.EsErrors.push(x.errors)
                                })
                        })
                        */
                    config.start = config.start + byteLength;
                    config.end = config.start + config.stride;
                    config.progress = progress;
                    config.time.rounds += 1;
                    qnabot.log(`next content range: ${config.start} - ${config.end}`);
                } catch (error) {
                    qnabot.log('An error occured while config status was InProgress: ', error);
                    config.status = error.message || 'Error'
                    config.message = JSON.stringify(error);
                    await s3.send(new PutObjectCommand({ Bucket: output_bucket, Key: output_key, Body: JSON.stringify(config) }));
                    throw error;
                }
            }
        }
        try {
            if (config.progress >= 1 && config.status == "InProgress") {
                config.status = 'Complete';
                config.time.end = new Date().toISOString();
                qnabot.log('EndConfig:', JSON.stringify(config, null, 2));
                await s3.send(new PutObjectCommand({ Bucket: output_bucket, Key: output_key, Body: JSON.stringify(config) }));
            }
        } catch (err) {
            qnabot.log('An error occured while finalizing config: ', err);
            throw err;
        }
    } catch (err) {
        qnabot.log('An error occured while getting parsing for config: ', err);
        throw err;
    }
};

exports.start = async function (event, context) {
    try {
        qnabot.log('starting');
        qnabot.log('Request', JSON.stringify(event, null, 2));
        const bucket = event.Records[0].s3.bucket.name;
        const key = decodeURI(event.Records[0].s3.object.key);
        qnabot.log(bucket, key);
        const config = {
            stride,
            start: 0,
            end: stride,
            buffer: '',
            count: 0,
            failed: 0,
            progress: 0,
            EsErrors: [],
            time: {
                rounds: 0,
                start: new Date().toISOString()
            },
            status: 'InProgress',
            bucket,
            key,
            version: event.Records[0].s3.object.versionId
        };
        qnabot.log('Config: ', JSON.stringify(config));
        const out_key = `status/${decodeURI(event.Records[0].s3.object.key.split('/').pop())}`;
        qnabot.log(bucket, out_key);
        const putParams = {
            Bucket: bucket,
            Key: out_key,
            Body: JSON.stringify(config)
        };
        await s3.send(new PutObjectCommand(putParams));
        putParams.Bucket = process.env.OUTPUT_S3_BUCKET;
        putParams.Key = `status-import/${decodeURI(event.Records[0].s3.object.key.split('/').pop())}`;
        await s3.send(new PutObjectCommand(putParams));
    } catch (x) {
        qnabot.log('An error occured in start function: ', x);
        throw new Error(JSON.stringify({
            type: '[InternalServiceError]',
            data: x
        }));
    }
};

async function processQuestionArray(buffer, response, s3, s3Params) {
    let objects = [];
    try {
        buffer += response;
        if (buffer.startsWith('PK')) {
            qnabot.log('starts with PK, must be an xlsx');
            const s3Object = await s3.send(new GetObjectCommand(s3Params));
            const readableStreamFile = Buffer.concat(await s3Object.Body.toArray())
            const questionArray = await convertxlsx.convertxlsx(readableStreamFile);
            qnabot.log('number of items processed: ', questionArray.length);
            questionArray.forEach((question) => {
                const questionStr = JSON.stringify(question);
                qnabot.log(questionStr);
                objects.push(questionStr);
            });
            buffer = '';
        } else {
            objects = buffer.split(/\n/);
            JSON.parse(objects[objects.length - 1]);
            buffer = '';
        }
        const modifiedBuffer = buffer
        return {
            buffer:modifiedBuffer, 
            objects:objects
        };

    } catch (e) {
        qnabot.log('An error occured while processing question array: ', e);
        buffer = objects.pop();
        const modifiedBuffer = buffer
        return {
            buffer:modifiedBuffer, 
            objects:objects
        };
    }
}

async function processQuestionObjects(objects, settings, esindex, config) {
    const out = [];
    let success = config.count || 0;
    let failed = config.failed || 0;
    for (const x of objects) {
        try {
            let obj = JSON.parse(x);
            const timestamp = _.get(obj, 'datetime', '');
            let docid;
            if (timestamp === '') {
                // only metrics and feedback items have datetime field.. This must be a qna, quiz, or text item.
                obj.type = obj.type || 'qna';
                obj = await handleQuestionByType(obj, settings);
                docid = obj._id || obj.qid;
            } else {
                docid = obj._id || `${obj.qid}_upgrade_restore_${timestamp}`;
                stringifySessionAttributes(obj);
            } 
            delete obj._id;
            out.push(
                JSON.stringify({
                    index: {
                        _index: esindex,
                        _id: docid
                    }
                })
            );
            success += 1;
            out.push(JSON.stringify(obj));

            // Save docs one at a time, for now, due to issues with k-nn index after bulk load
            await es_store_doc(esindex, docid, obj);
        } catch (e) {
            failed += 1;
            qnabot.log('Failed to Parse:', e.message, x);
            if (e.name === 'Error') {
                throw e
            }
        }
    }
    return { out, success, failed };
}

async function handleQuestionByType(obj, settings) {
    if (obj.type != 'slottype' && obj.type != 'text') {
        obj.q = obj.q.map((x) => {
            x = x.replace(/\\*"/g, ''); // NOSONAR - javascript:S5852 - input is user controlled and we have a limit on the number of characters
            return x;
        });
    }
    if (obj.type === 'qna') {
        try {
            obj = await handleEmbeddings(obj, settings);
        } catch (err) {
            qnabot.log('skipping question due to exception', err?.message);
            let msg;
            try {
                msg = _.get(JSON.parse(err.message), 'message', 'Error');
            } catch (e) {
                msg = e.name === 'SyntaxError' ? _.get(err, 'message', 'Error') : 'Error';
            };
            throw new Error(msg);
        }
        delete obj.q;
    } else if (obj.type === 'text') {
        // passage field embeddings
        const { passage } = obj;
        if (passage) {
            obj.passage_vector = await get_embeddings('a', passage, settings);
        }
    }
    return obj;
}

async function handleEmbeddings(obj, settings) {
    // question embeddings
    obj.questions = await Promise.all(
        obj.q.map(async (x) => {
            const q_embeddings = await get_embeddings('q', x, settings);
            if (q_embeddings) {
                return {
                    q: x,
                    q_vector: q_embeddings
                };
            }
            return {
                q: x
            };
        })
    );

    // answer embeddings
    const answer = obj.a;
    if (answer) {
        obj.a_vector = await get_embeddings('a', answer, settings);
    }
    obj.quniqueterms = obj.q.join(' ');
    return obj;
}

function stringifySessionAttributes(obj) {
    const sessionAttrs = _.get(obj, 'entireResponse.session', {});
    for (const key of Object.keys(sessionAttrs)) {
        if (typeof sessionAttrs[key] !== 'string') {
            sessionAttrs[key] = JSON.stringify(sessionAttrs[key]);
        }
    }
}

function getOsIndex(Key) {
    let esindex = process.env.ES_INDEX;
    if (Key.match(/ExportAll_QnABot_[^/]*_metrics\.json$/)) {
        esindex = process.env.ES_METRICSINDEX;
    } else if (Key.match(/ExportAll_QnABot_[^/]*_feedback\.json$/)) {
        esindex = process.env.ES_FEEDBACKINDEX;
    }
    return esindex;
}

exports.getOsIndex = getOsIndex;
