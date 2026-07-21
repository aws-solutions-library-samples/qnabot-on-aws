/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { start, step } = require('../index');
const { mockClient } = require('aws-sdk-client-mock');
const s3Mock = mockClient(S3Client);
const qnabot = require('qnabot/logging');
const qnabotSettings = require('qnabot/settings');
const { Readable } = require('stream');
const { sdkStreamMixin } = require('@smithy/util-stream');
const delete_existing_content = require('../delete_existing_content');
jest.mock('../delete_existing_content');
require('aws-sdk-client-mock-jest');

const request = {
    'Records': [
        {
            's3': {
                's3SchemaVersion': '1.0',
                'configurationId': 'testConfigId',
                'bucket': {
                    'name': 'qna-test-importbucket',
                    'arn': 'arn:aws:s3:::qna-test-importbucket'
                },
                'object': {
                    'key': 'data/import_questions.json',
                    'versionId': 'testVersionId'
                }
            }
        }
    ]
};

const config = {
    stride: 20000,
    start: 0,
    end: 20000,
    buffer: '',
    count: 0,
    failed: 0,
    progress: 0,
    EsErrors: [],
    time: {
        rounds: 0,
        start: '2023-12-15T19:28:54.566Z'
    },
    status: 'InProgress',
    bucket: 'qna-test-importbucket',
    key: 'data/import_questions.json',
    version: 'testVersion'
};

describe('when calling start function', () => {
    const OLD_ENV = process.env;
    beforeEach(() => {
        process.env = { ...OLD_ENV };
        s3Mock.reset();
        qnabot.log = jest.fn();
    });

    afterEach(() => {
        process.env = OLD_ENV;
        s3Mock.restore();
        jest.clearAllMocks();
    });

    it('should call start and update status correctly', async () => {
        await start(request, null);
        expect(qnabot.log).toHaveBeenCalledWith('starting');
        expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 2);
    });

    it('should handle an error', async () => {
        const error = new Error('test error');
        s3Mock.on(PutObjectCommand).rejects(error);
        await expect(start(request, null)).rejects.toThrow();
        expect(qnabot.log).toHaveBeenCalledWith('An error occured in start function: ', error);
    });
});

describe('when calling step function', () => {
    const OLD_ENV = process.env;
    process.env.ES_INDEX = 'testEsIndex';
    process.env.ES_ENDPOINT = 'testEndpoint';
    process.env.OUTPUT_S3_BUCKET = 'contentDesignerOutputBucket'
    beforeEach(() => {
        process.env = { ...OLD_ENV };
        s3Mock.reset();
        qnabot.log = jest.fn();
    });

    afterEach(() => {
        process.env = OLD_ENV;
        s3Mock.restore();
        jest.clearAllMocks();
    });

    it('should successfully execute step', async () => {
        jest.spyOn(qnabotSettings, 'getSettings').mockResolvedValue({ EMBEDDINGS_ENABLE: false });

        const mockQuestion = {
            q: ['Which file formats are supported by the QnA Bot question designer import?'],
            a: 'JSON and xlsx.',
            qid: 'Import.001'
        };

        const mockTextItem = {
            passage: ['Test passage'],
            a: 'Test answer',
            qid: 'text.001',
            type: 'text'
        };

        const mockResponse = {
            index: {
                _index: 'qna-test',
                _id: 'Import.001'
            },
            a: 'JSON and xlsx.',
            qid: 'Import.001',
            type: 'qna',
            questions: [
                {
                    q: 'Which file formats are supported by the QnA Bot question designer import?'
                }
            ],
            quniqueterms: 'Which file formats are supported by the QnA Bot question designer import?',
            datetime: '2023-01-02T00:00:00.000Z'
        };
        delete_existing_content.delete_existing_content.mockResolvedValue(mockResponse);

        const stream1 = new Readable();
        stream1.push(JSON.stringify(config));
        stream1.push(null);
        const sdkStream1 = sdkStreamMixin(stream1);

        const stream2 = new Readable();
        stream2.push(JSON.stringify(mockQuestion) + '\n');
        stream2.push(JSON.stringify(mockTextItem) + '\n');
        stream2.push(null);
        const sdkStream2 = sdkStreamMixin(stream2);

        s3Mock
            .on(GetObjectCommand)
            .resolvesOnce({ Body: sdkStream1, ContentRange: 'bytes 0-1299/1300' })
            .resolvesOnce({ Body: sdkStream2, ContentRange: 'bytes 0-1299/1300' });
        await step(request, null);
        expect(qnabot.log).toHaveBeenCalledWith('step');
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 2);
        expect(s3Mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json'
        });
        expect(s3Mock).toHaveReceivedNthCommandWith(3, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json',
            'Range': 'bytes=0-20000',
            'VersionId': 'testVersion'
        });
        expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    });

    it('should successfully process data containing invalid/partial chracter', async () => {
        jest.spyOn(qnabotSettings, 'getSettings').mockResolvedValue({ EMBEDDINGS_ENABLE: false });

        const mockQuestion = {
            q: ['Which file formats are supported by the QnA Bot question designer import?'],
            a: 'JSON and xlsx.',
            qid: 'Import.001'
        };

        const mockResponse = {
            index: {
                _index: 'qna-test',
                _id: 'Import.001'
            },
            a: 'JSON and xlsx.',
            qid: 'Import.001',
            type: 'qna',
            questions: [
                {
                    q: 'Which file formats are supported by the QnA Bot question designer import?'
                }
            ],
            quniqueterms: 'Which file formats are supported by the QnA Bot question designer import?',
            datetime: '2023-01-02T00:00:00.000Z'
        };
        delete_existing_content.delete_existing_content.mockResolvedValue(mockResponse);

        const stream1 = new Readable();
        stream1.push(JSON.stringify(config));
        stream1.push(null);
        const sdkStream1 = sdkStreamMixin(stream1);

        const stream2 = new Readable();
        stream2.push(`${JSON.stringify(mockQuestion)}{q: ['Test�`);
        stream2.push(null);
        const sdkStream2 = sdkStreamMixin(stream2);

        s3Mock
            .on(GetObjectCommand)
            .resolvesOnce({ Body: sdkStream1, ContentRange: 'bytes 0-1299/1300' })
            .resolvesOnce({ Body: sdkStream2, ContentRange: 'bytes 0-1299/1300' });
        await step(request, null);
        expect(qnabot.log).toHaveBeenCalledWith('step');
        expect(qnabot.log).toHaveBeenCalledWith('next content range: 133 - 20133');
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 2);
        expect(s3Mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json'
        });
        expect(s3Mock).toHaveReceivedNthCommandWith(3, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json',
            'Range': 'bytes=0-20000',
            'VersionId': 'testVersion'
        });
        expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    });

    it('should handle config status not InProgress', async () => {
        const mockOptions = {
            status: 'Complete'
        };

        const stream1 = new Readable();
        stream1.push(JSON.stringify(mockOptions));
        stream1.push(null);
        const sdkStream1 = sdkStreamMixin(stream1);

        s3Mock.on(GetObjectCommand).resolvesOnce({ Body: sdkStream1 });

        await step(request, null);
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
        expect(s3Mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json'
        });
    });

    it('should handle an error with first GetObjectCommand', async () => {
        const error = new Error('test error');
        s3Mock.on(GetObjectCommand).rejects(error);
        await expect(step(request, null)).rejects.toThrow('test error');
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
        expect(qnabot.log).toHaveBeenCalledWith('An error occured while getting parsing for config: ', error);
    });

    it('should handle an error with second GetObjectCommand', async () => {
        const error = new Error('test error');

        const mockOptions = {
            'progress': 0,
            'time': {
                'rounds': 0,
            },
            'status': 'InProgress'
        };

        const stream1 = new Readable();
        stream1.push(JSON.stringify(mockOptions));
        stream1.push(null);
        const sdkStream1 = sdkStreamMixin(stream1);

        s3Mock.on(GetObjectCommand).resolvesOnce({ Body: sdkStream1 });

        s3Mock.on(GetObjectCommand, {
            'Bucket': undefined,
            'Key': undefined,
            'Range': 'bytes=undefined-undefined',
            'VersionId': undefined
        }).rejects(error);

        await expect(step(request, null)).rejects.toThrow('test error');
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 2);
        expect(s3Mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json'
        });
        expect(s3Mock).toHaveReceivedNthCommandWith(3, GetObjectCommand, {
            'Bucket': undefined,
            'Key': undefined,
            'Range': 'bytes=undefined-undefined',
            'VersionId': undefined
        });
        expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
        expect(s3Mock).toHaveReceivedCommandWith(PutObjectCommand, {"Body": "{\"progress\":0,\"time\":{\"rounds\":0},\"status\":\"test error\",\"message\":\"{}\"}", "Bucket": "contentDesignerOutputBucket", "Key": "status-import/import_questions.json"});
        
        expect(qnabot.log).toHaveBeenCalledWith('An error occured while config status was InProgress: ', error);
    });

    it('should handle an error with buffer', async () => {
        jest.spyOn(qnabotSettings, 'getSettings').mockResolvedValue({ EMBEDDINGS_ENABLE: false });

        const mockOptions = {
            'progress': 0,
            'time': {
                'rounds': 0,
            },
            'status': 'InProgress'
        };

        const errorConfig = {
            'stride': 20000,
            'start': 0,
            'end': 20000,
            'count': 0,
            'failed': 0,
            'progress': 0,
            'EsErrors': [],
            'time': {
                'rounds': 0,
                'start': '2023-12-15T19:28:54.566Z'
            },
            'status': 'InProgress',
            'bucket': 'qna-test-importbucket',
            'key': 'data/import_questions.json',
            'version': 'testVersion'
        };
        const stream1 = new Readable();
        stream1.push(JSON.stringify(mockOptions));
        stream1.push(null);
        const sdkStream1 = sdkStreamMixin(stream1);

        const stream2 = new Readable();
        stream2.push(JSON.stringify(errorConfig));
        stream2.push(null);
        const sdkStream2 = sdkStreamMixin(stream2);

        s3Mock
            .on(GetObjectCommand)
            .resolvesOnce({ Body: sdkStream1 })
            .resolvesOnce({ Body: sdkStream2, ContentRange: 'bytes 0-2525/2526' });

        await step(request, null);
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 2);
        expect(s3Mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.json'
        });
        expect(s3Mock).toHaveReceivedNthCommandWith(3, GetObjectCommand, {
            'Bucket': undefined,
            'Key': undefined,
            'Range': 'bytes=undefined-undefined',
            'VersionId': undefined
        });
        expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    });


    it('should successfully execute step with xlsx', async () => {
        jest.spyOn(qnabotSettings, 'getSettings').mockResolvedValue({ EMBEDDINGS_ENABLE: false });

        let xlsxConfig = config;

        xlsxConfig.key = "data/import_questions.xlsx";
        xlsxConfig.buffer = "PK"
        let xlsxRequest = request;

        request.Records[0].s3.object.key = "data/import_questions.xlsx";
        const mockOptions = {
            q: ['Which file formats are supported by the QnA Bot question designer import?'],
            a: 'JSON and xlsx.',
            qid: 'Import.001'
        };

        const mockResponse = {
            index: {
                _index: 'qna-test',
                _id: 'Import.001'
            },
            a: 'JSON and xlsx.',
            qid: 'Import.001',
            type: 'qna',
            questions: [
                {
                    q: 'Which file formats are supported by the QnA Bot question designer import?'
                }
            ],
            quniqueterms: 'Which file formats are supported by the QnA Bot question designer import?',
            datetime: '2023-01-02T00:00:00.000Z'
        };
        delete_existing_content.delete_existing_content.mockResolvedValue(mockResponse);

        const stream1 = new Readable();
        stream1.push(JSON.stringify(xlsxConfig));
        stream1.push(null);
        const sdkStream1 = sdkStreamMixin(stream1);

        const stream2 = new Readable();
        stream2.push(JSON.stringify(mockOptions));
        stream2.push(null);
        const sdkStream2 = sdkStreamMixin(stream2);

        s3Mock
            .on(GetObjectCommand)
            .resolvesOnce({ Body: sdkStream1, ContentRange: 'bytes 0-1299/1300' })
            .resolvesOnce({ Body: sdkStream2, ContentRange: 'bytes 0-1299/1300' });
        await step(xlsxRequest, null);
        expect(qnabot.log).toHaveBeenCalledWith('step');
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 3);
        expect(s3Mock).toHaveReceivedNthCommandWith(2, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.xlsx'
        });
        expect(s3Mock).toHaveReceivedNthCommandWith(3, GetObjectCommand, {
            'Bucket': 'qna-test-importbucket',
            'Key': 'data/import_questions.xlsx',
            'Range': 'bytes=0-20000',
            'VersionId': 'testVersion'
        });
        expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    });

});

describe('getOsIndex', () => {
    const { getOsIndex } = require('../index');
    const OLD_ENV = process.env;

    beforeEach(() => {
        process.env = { ...OLD_ENV };
        process.env.ES_INDEX = 'test-index';
        process.env.ES_METRICSINDEX = 'test-metrics-index';
        process.env.ES_FEEDBACKINDEX = 'test-feedback-index';
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    test('returns ES_METRICSINDEX for metrics export key', () => {
        expect(getOsIndex('ExportAll_QnABot_20240101_120000_metrics.json')).toBe('test-metrics-index');
        expect(getOsIndex('exports/ExportAll_QnABot_20240101_metrics.json')).toBe('test-metrics-index');
    });

    test('returns ES_FEEDBACKINDEX for feedback export key', () => {
        expect(getOsIndex('ExportAll_QnABot_20240101_120000_feedback.json')).toBe('test-feedback-index');
        expect(getOsIndex('exports/ExportAll_QnABot_20240101_feedback.json')).toBe('test-feedback-index');
    });

    test('returns default ES_INDEX for non-metrics non-feedback key', () => {
        expect(getOsIndex('some_other_import_file.json')).toBe('test-index');
        expect(getOsIndex('ExportAll_QnABot_partial.json')).toBe('test-index');
    });
});
