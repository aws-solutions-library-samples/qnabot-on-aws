/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const fs = require('fs');
const _ = require('lodash');
const util = require('../../util');

const js = fs.readdirSync(`${__dirname}/js_lambda_hooks`)
    .filter((name) => !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
        if (fs.existsSync(`${__dirname}/js_lambda_hooks/${name}/${name}.js`)) {
            return {
                name: `EXT${name}`,
                resource: jslambda(name),
                codeVersionName: `CodeVersion${name}`,
                codeVersionResource: codeVersion(name),
                logGroupName: `${name}LogGroup`,
                logGroupResource: lambdaLogGroup(name),
                id: `${name}JS`,
            };
        }
    })
    .filter(Boolean);

const py = fs.readdirSync(`${__dirname}/py_lambda_hooks`)
    .filter((name) => !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
        name: `EXT${name}`,
        resource: pylambda(name),
        codeVersionName: `CodeVersion${name}`,
        codeVersionResource: codeVersion(name),
        logGroupName: `${name}LogGroup`,
        logGroupResource: lambdaLogGroup(name),
        id: `${name}PY`,
    }));

const lambda_hooks = js.concat(py);

module.exports = Object.assign(
    _.fromPairs(lambda_hooks.map((x) => [x.logGroupName, x.logGroupResource])),
    _.fromPairs(lambda_hooks.map((x) => [x.name, x.resource])),
    _.fromPairs(lambda_hooks.map((x) => [x.codeVersionName, x.codeVersionResource])),
    {
        EXTUiImport: {
            Type: 'Custom::ExtensionsUiImport',
            Properties: Object.assign(
                _.fromPairs(lambda_hooks.map((x) => [x.id, { Ref: x.name }])),
                {
                    ServiceToken: { 'Fn::GetAtt': ['EXTUiImportLambda', 'Arn'] },
                    photos: { 'Fn::Sub': '${ApiUrlName}/examples/photos' },
                    Bucket: { Ref: 'AssetBucket' },
                    version: { Ref: 'EXTUiImportVersion' },
                },
            ),
        },
        EXTUiImportLambdaLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                LogGroupName: {
                    'Fn::Join': [
                        '-',
                        [
                            { 'Fn::Sub': '/aws/lambda/${AWS::StackName}-EXTUiImportLambda' },
                            { 'Fn::Select': ['2', { 'Fn::Split': ['/', { Ref: 'AWS::StackId' }] }] },
                        ],
                    ],
                },
                RetentionInDays: {
                    'Fn::If': [
                        'LogRetentionPeriodIsNotZero',
                        { Ref: 'LogRetentionPeriod' },
                        { Ref: 'AWS::NoValue' },
                    ],
                },
            },
            Metadata: {
                guard: util.cfnGuard('CLOUDWATCH_LOG_GROUP_ENCRYPTED', 'CW_LOGGROUP_RETENTION_PERIOD_CHECK'),
            },
        },
        EXTUiImportLambda: {
            Type: 'AWS::Lambda::Function',
            Properties: {
                Code: {
                    S3Bucket: { Ref: 'BootstrapBucket' },
                    S3Key: {
                        'Fn::Join': ['', [
                            { Ref: 'BootstrapPrefix' },
                            '/lambda/EXTUiImports.zip',
                        ]],
                    },
                    S3ObjectVersion: { Ref: 'EXTUiImportVersion' },
                },
                Environment: {
                    Variables: {
                        ...util.getCommonEnvironmentVariables()
                    },
                },
                Handler: 'ui_import.handler',
                LoggingConfig: {
                    LogGroup: { Ref: 'EXTUiImportLambdaLogGroup' },
                },
                MemorySize: '128',
                Role: { Ref: 'CFNLambdaRole' },
                Runtime: process.env.npm_package_config_lambdaRuntime,
                Timeout: 300,
                VpcConfig: {
                    'Fn::If': ['VPCEnabled', {
                        SubnetIds: { 'Fn::Split': [',', { Ref: 'VPCSubnetIdList' }] },
                        SecurityGroupIds: { 'Fn::Split': [',', { Ref: 'VPCSecurityGroupIdList' }] },
                    }, { Ref: 'AWS::NoValue' }],
                },
                TracingConfig: {
                    'Fn::If': ['XRAYEnabled', { Mode: 'Active' },
                        { Ref: 'AWS::NoValue' }],
                },
                Layers: [
                    { Ref: 'AwsSdkLayerLambdaLayer' },
                ],
                Tags: [{
                    Key: 'Type',
                    Value: 'CustomResource',
                }],
            },
            Metadata: {
                cfn_nag: util.cfnNag(['W92', 'W58']),
                guard: util.cfnGuard('LAMBDA_CONCURRENCY_CHECK', 'LAMBDA_INSIDE_VPC'),
            },
        },
        EXTUiImportVersion: {
            Type: 'Custom::S3Version',
            Properties: {
                ServiceToken: { Ref: 'CFNLambda' },
                Bucket: { Ref: 'BootstrapBucket' },
                Key: { 'Fn::Sub': '${BootstrapPrefix}/lambda/EXTUiImports.zip' },
                BuildDate: (new Date()).toISOString(),
            },
        },
        JsLambdaHookSDKLambdaLayerCodeVersion: {
            Type: 'Custom::S3Version',
            Properties: {
                ServiceToken: { Ref: 'CFNLambda' },
                Bucket: { Ref: 'BootstrapBucket' },
                Key: { 'Fn::Sub': '${BootstrapPrefix}/lambda/js_lambda_hook_sdk.zip' },
                BuildDate: new Date().toISOString(),
            },
        },
        JsLambdaHookSDKLambdaLayer: {
            Type: 'AWS::Lambda::LayerVersion',
            Properties: {
                Content: {
                    S3Bucket: { Ref: 'BootstrapBucket' },
                    S3Key: { 'Fn::Sub': '${BootstrapPrefix}/lambda/js_lambda_hook_sdk.zip' },
                    S3ObjectVersion: { Ref: 'JsLambdaHookSDKLambdaLayerCodeVersion' },
                },
                LayerName: {
                    'Fn::Join': [
                        '-',
                        [
                            'JsLambdaHookSDK',
                            { 'Fn::Select': ['0', { 'Fn::Split': ['-', { Ref: 'AWS::StackName' }] }] }
                        ],
                    ],
                },
                CompatibleRuntimes: [process.env.npm_package_config_lambdaRuntime],
            },
        },
        ExtensionsInvokePolicy: {
            Type: 'AWS::IAM::ManagedPolicy',
            Properties: {
                PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Action: [
                            'lambda:InvokeFunction',
                        ],
                        Resource: lambda_hooks
                            .map((x) => ({ 'Fn::GetAtt': [x.name, 'Arn'] })),
                    }],
                },
                Roles: [{ Ref: 'FulfillmentLambdaRole' }],
            },
        },
        ExtensionLambdaRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'lambda.amazonaws.com',
                            },
                            Action: 'sts:AssumeRole',
                        },
                    ],
                },
                Path: '/',
                Policies: [
                    util.basicLambdaExecutionPolicy(),
                    util.lambdaVPCAccessExecutionRole(),
                    util.xrayDaemonWriteAccess(),
                    {
                        PolicyName: 'LambdaFeedbackKinesisFirehoseQNALambda',
                        PolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Action: [
                                        'kms:Encrypt',
                                        'kms:Decrypt',
                                    ],
                                    Resource: { 'Fn::GetAtt': ['QuizKey', 'Arn'] },
                                },
                                {
                                    Effect: 'Allow',
                                    Action: [
                                        'lambda:InvokeFunction',
                                    ],
                                    Resource: [
                                        { 'Fn::Join': ['', ['arn:aws:lambda:', { Ref: 'AWS::Region' }, ':', { Ref: 'AWS::AccountId' }, ':function:qna-*']] },
                                        { 'Fn::Join': ['', ['arn:aws:lambda:', { Ref: 'AWS::Region' }, ':', { Ref: 'AWS::AccountId' }, ':function:QNA-*']] },
                                        { Ref: 'QIDLambdaArn' },
                                    ],
                                },
                                {
                                    Effect: 'Allow',
                                    Action: [
                                        'firehose:PutRecord',
                                        'firehose:PutRecordBatch',
                                    ],
                                    Resource: [
                                        { Ref: 'FeedbackKinesisFirehose' },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
            Metadata: {
                cfn_nag: util.cfnNag(['W11', 'W12']),
                guard: util.cfnGuard('IAM_NO_INLINE_POLICY_CHECK'),
            },
        },
    },
);
function jslambda(name) {
    return {
        Type: 'AWS::Lambda::Function',
        Properties: {
            Code: {
                S3Bucket: { Ref: 'BootstrapBucket' },
                S3Key: {
                    'Fn::Join': ['', [
                        { Ref: 'BootstrapPrefix' },
                        `/lambda/EXT${name}.zip`,
                    ]],
                },
                S3ObjectVersion: { Ref: `CodeVersion${name}` },
            },
            Environment: {
                Variables: {
                    ES_INDEX: { Ref: 'Index' },
                    FIREHOSE_NAME: { Ref: 'FeedbackKinesisFirehoseName' },
                    ES_ADDRESS: { Ref: 'ESAddress' },
                    QUIZ_KMS_KEY: { Ref: 'QuizKey' },
                },
            },
            Handler: `${name}.handler`,
            LoggingConfig: {
                LogGroup: { Ref: `${name}LogGroup` },
            },
            MemorySize: '2048',
            Role: { 'Fn::GetAtt': ['ExtensionLambdaRole', 'Arn'] },
            Runtime: process.env.npm_package_config_lambdaRuntime,
            Timeout: 300,
            VpcConfig: {
                'Fn::If': ['VPCEnabled', {
                    SubnetIds: { 'Fn::Split': [',', { Ref: 'VPCSubnetIdList' }] },
                    SecurityGroupIds: { 'Fn::Split': [',', { Ref: 'VPCSecurityGroupIdList' }] },
                }, { Ref: 'AWS::NoValue' }],
            },
            Layers: [
                { Ref: 'AwsSdkLayerLambdaLayer' },
                { Ref: 'JsLambdaHookSDKLambdaLayer' },
            ],
            TracingConfig: {
                'Fn::If': ['XRAYEnabled', { Mode: 'Active' },
                    { Ref: 'AWS::NoValue' }],
            },
            Tags: [{
                Key: 'Type',
                Value: 'LambdaHook',
            }],
        },
        Metadata: {
            cfn_nag: util.cfnNag(['W92']),
            guard: util.cfnGuard('LAMBDA_CONCURRENCY_CHECK', 'LAMBDA_INSIDE_VPC'),
        },
    };
}
function pylambda(name) {
    return {
        Type: 'AWS::Lambda::Function',
        Properties: {
            Code: {
                S3Bucket: { Ref: 'BootstrapBucket' },
                S3Key: {
                    'Fn::Join': ['', [
                        { Ref: 'BootstrapPrefix' },
                        `/lambda/EXT${name}.zip`,
                    ]],
                },
                S3ObjectVersion: { Ref: `CodeVersion${name}` },
            },
            Environment: {
                Variables: {
                    ES_INDEX: { Ref: 'Index' },
                    FIREHOSE_NAME: { Ref: 'FeedbackKinesisFirehoseName' },
                    ES_ADDRESS: { Ref: 'ESAddress' },
                    QUIZ_KMS_KEY: { Ref: 'QuizKey' },
                    PYTHONPATH: '/var/task/py_modules:/var/runtime:/opt/python',
                    ...util.getCommonEnvironmentVariables()
                },
            },
            Handler: `${name}.handler`,
            LoggingConfig: {
                LogGroup: { Ref: `${name}LogGroup` },
            },
            MemorySize: '2048',
            Role: { 'Fn::GetAtt': ['ExtensionLambdaRole', 'Arn'] },
            Runtime: process.env.npm_package_config_pythonRuntime,
            Timeout: 300,
            VpcConfig: {
                'Fn::If': ['VPCEnabled', {
                    SubnetIds: { 'Fn::Split': [',', { Ref: 'VPCSubnetIdList' }] },
                    SecurityGroupIds: { 'Fn::Split': [',', { Ref: 'VPCSecurityGroupIdList' }] },
                }, { Ref: 'AWS::NoValue' }],
            },
            TracingConfig: {
                'Fn::If': ['XRAYEnabled', { Mode: 'Active' },
                    { Ref: 'AWS::NoValue' }],
            },
            Tags: [{
                Key: 'Type',
                Value: 'LambdaHook',
            }],
        },
        Metadata: {
            cfn_nag: util.cfnNag(['W92']),
            guard: util.cfnGuard('LAMBDA_CONCURRENCY_CHECK', 'LAMBDA_INSIDE_VPC'),
        },
    };
}

function codeVersion(name) {
    return {
        Type: 'Custom::S3Version',
        Properties: {
            ServiceToken: { Ref: 'CFNLambda' },
            Bucket: { Ref: 'BootstrapBucket' },
            Key: { 'Fn::Sub': `\${BootstrapPrefix}/lambda/EXT${name}.zip` },
            BuildDate: (new Date()).toISOString(),
        },
    };
}

function lambdaLogGroup(name) {
    return {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
            LogGroupName: {
                'Fn::Join': [
                    '-',
                    [
                        { 'Fn::Sub': '/aws/lambda/${AWS::StackName}' },
                        `EXT${name}`,
                        { 'Fn::Select': ['2', { 'Fn::Split': ['/', { Ref: 'AWS::StackId' }] }] },
                    ],
                ],
            },
            RetentionInDays: {
                'Fn::If': [
                    'LogRetentionPeriodIsNotZero',
                    { Ref: 'LogRetentionPeriod' },
                    { Ref: 'AWS::NoValue' },
                ],
            },
        },
        Metadata: {
            guard: util.cfnGuard('CLOUDWATCH_LOG_GROUP_ENCRYPTED', 'CW_LOGGROUP_RETENTION_PERIOD_CHECK'),
        },
    };
}
