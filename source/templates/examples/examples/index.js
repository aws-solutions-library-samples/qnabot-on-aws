/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const fs = require('fs');
const _ = require('lodash');
const util = require('../../util');
const responsebots_lexv2 = require('./responsebots-lexv2.js').resources;

const js = fs.readdirSync(`${__dirname}/js`)
    .filter((x) => !x.match(/(.*).(test|fixtures).js/)) // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
    .filter((x) => x.match(/(.*).js/)) // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
    .sort((a, b) => a.localeCompare(b))
    .map((file) => {
        const name = file.match(/(.*).js/)[1]; // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
        return {
            name: `ExampleJSLambda${name}`,
            resource: jslambda(name),
            logGroupName: `${name}LogGroup`,
            logGroupResource: jsLambdaLogGroup(name),
            id: `${name}JS`,
        };
    });

const py = fs.readdirSync(`${__dirname}/py`, { withFileTypes: true })
    .filter((x) => x.isFile())
    .map((x) => x.name)
    .filter((x) => x.match(/(.*).py/)) // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
    .sort((a, b) => a.localeCompare(b))
    .map((file) => {
        const name = file.match(/(.*).py/)[1]; // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
        return {
            name: `ExamplePYTHONLambda${name}`,
            resource: pylambda(name),
            logGroupName: `${name}LogGroup`,
            logGroupResource: pyLambdaLogGroup(name),
            id: `${name}PY`,
        };
    });

module.exports = Object.assign(
    responsebots_lexv2,
    _.fromPairs(js.map((x) => [x.logGroupName, x.logGroupResource])),
    _.fromPairs(js.map((x) => [x.name, x.resource])),
    _.fromPairs(py.map((x) => [x.logGroupName, x.logGroupResource])),
    _.fromPairs(py.map((x) => [x.name, x.resource])),
    {
        FeedbackSNS: {
            Type: 'AWS::SNS::Topic',
            Properties: {
                KmsMasterKeyId : 'alias/aws/sns',
            },
        },
        feedbacksnspolicy: { // https://docs.aws.amazon.com/dtconsole/latest/userguide/set-up-sns.html
            Type: 'AWS::SNS::TopicPolicy',
            Properties: {
                PolicyDocument: {
                    Id: 'MysnsTopicPolicy',
                    Version: '2012-10-17',
                    Statement: [{
                        Sid: 'My-statement-id',
                        Effect: 'Allow',
                        Principal: {
                            AWS: { 'Fn::Sub': '${AWS::AccountId}' },
                        },
                        Action: [
                            'SNS:GetTopicAttributes',
                            'SNS:SetTopicAttributes',
                            'SNS:AddPermission',
                            'SNS:RemovePermission',
                            'SNS:DeleteTopic',
                            'SNS:Subscribe',
                            'SNS:ListSubscriptionsByTopic',
                            'SNS:Publish',
                            'SNS:Receive',
                        ],
                        Resource: [{ 'Fn::Sub': 'arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:*' }],
                    }],
                },
                Topics: [{ Ref: 'FeedbackSNS' }],
            },
        },
        InvokePolicy: {
            Type: 'AWS::IAM::ManagedPolicy',
            Properties: {
                PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Action: [
                            'lambda:InvokeFunction',
                        ],
                        Resource: js.concat(py)
                            .map((x) => ({ 'Fn::GetAtt': [x.name, 'Arn'] })),
                    }],
                },
                Roles: [{ Ref: 'FulfillmentLambdaRole' }],
            },
        },
        QuizKey: {
            Type: 'AWS::KMS::Key',
            Properties: {
                Description: 'QNABot Internal KMS CMK for quiz workflow',
                EnableKeyRotation: true,
                KeyPolicy: {
                    Version: '2012-10-17',
                    Id: 'key-default-1',
                    Statement: [
                        {
                            Sid: 'Allow administration of the key', // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kms-key.html
                            Effect: 'Allow',
                            Principal: { AWS: { Ref: 'AWS::AccountId' } },
                            Action: [
                                'kms:Create*',
                                'kms:Describe*',
                                'kms:Enable*',
                                'kms:List*',
                                'kms:Put*',
                                'kms:Update*',
                                'kms:Revoke*',
                                'kms:Disable*',
                                'kms:Get*',
                                'kms:Delete*',
                                'kms:ScheduleKeyDeletion',
                                'kms:CancelKeyDeletion',
                            ],
                            Resource: '*', // these actions cannot be bound to resources other than *
                        },
                        {
                            Sid: 'Enable IAM User Permissions', // https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
                            Effect: 'Allow',
                            Principal: {
                                AWS:
                            { 'Fn::Sub': 'arn:aws:iam::${AWS::AccountId}:root' },
                            },
                            Action: 'kms:*',
                            Resource: '*', // these actions cannot be bound to resources other than *
                        },
                    ],
                },
            },
        },
        LambdaHookExamples: {
            Type: 'Custom::QnABotExamples',
            Properties: Object.assign(
                _.fromPairs(js.map((x) => [x.id, { Ref: x.name }])),
                _.fromPairs(py.map((x) => [x.id, { Ref: x.name }])),
                {
                    ServiceToken: { 'Fn::GetAtt': ['ExampleWriteLambda', 'Arn'] },
                    photos: { 'Fn::Sub': '${ApiUrlName}/examples/photos' },
                    Bucket: { Ref: 'AssetBucket' },
                    version: { Ref: 'ExampleCodeVersion' },
                },
            ),
        },
        ExampleCodeVersion: {
            Type: 'Custom::S3Version',
            Properties: {
                ServiceToken: { Ref: 'CFNLambda' },
                Bucket: { Ref: 'BootstrapBucket' },
                Key: { 'Fn::Sub': '${BootstrapPrefix}/lambda/examples.zip' },
                BuildDate: (new Date()).toISOString(),
            },
        },
        ExampleWriteLambdaLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                LogGroupName: {
                    'Fn::Join': [
                        '-',
                        [
                            { 'Fn::Sub': '/aws/lambda/${AWS::StackName}-ExampleWriteLambda' },
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
        ExampleWriteLambda: {
            Type: 'AWS::Lambda::Function',
            Properties: {
                Code: {
                    S3Bucket: { Ref: 'BootstrapBucket' },
                    S3Key: {
                        'Fn::Join': ['', [
                            { Ref: 'BootstrapPrefix' },
                            '/lambda/examples.zip',
                        ]],
                    },
                    S3ObjectVersion: { Ref: 'ExampleCodeVersion' },
                },
                Environment: {
                    Variables: {
                        ...util.getCommonEnvironmentVariables()
                    }
                },
                Handler: 'cfn.handler',
                LoggingConfig: {
                    LogGroup: { Ref: 'ExampleWriteLambdaLogGroup' },
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
        ExampleLambdaRole: {
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
                    util.amazonKendraReadOnlyAccess(),
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
                    {
                        PolicyName: 'SNSQNALambda',
                        PolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Action: [
                                        'sns:Publish',
                                    ],
                                    Resource: { Ref: 'FeedbackSNS' },
                                },
                            ],
                        },
                    },
                    {
                        PolicyName: 'LambdaQnABotStdExecution',
                        PolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [{
                                Effect: 'Allow',
                                Action: [
                                    'lambda:InvokeFunction',
                                ],
                                Resource: [
                                    'arn:aws:lambda:*:*:function:qna-*',
                                    'arn:aws:lambda:*:*:function:QNA-*',
                                    { 'Fn::Join': ['', ['arn:aws:lambda:*:*:function:', { 'Fn::Select': ['0', { 'Fn::Split': ['-', { Ref: 'AWS::StackName' }] }] }, '-*']] },
                                ],
                            },
                            {
                                Effect: 'Allow',
                                Action: [
                                    'cloudformation:DescribeStacks',
                                ],
                                Resource: [
                                    { Ref: 'AWS::StackId' },
                                ],
                            }],

                        },
                    },
                    {
                        PolicyName: 'KendraFeedback',
                        PolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Action: [
                                        'kendra:SubmitFeedback',
                                    ],
                                    Resource: [{ 'Fn::Sub': 'arn:${AWS::Partition}:kendra:${AWS::Region}:${AWS::AccountId}:index/*' }],
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
                        '/lambda/examples.zip',
                    ]],
                },
                S3ObjectVersion: { Ref: 'ExampleCodeVersion' },
            },
            Environment: {
                Variables: {
                    ES_INDEX: { Ref: 'Index' },
                    FIREHOSE_NAME: { Ref: 'FeedbackKinesisFirehoseName' },
                    ES_ADDRESS: { Ref: 'ESAddress' },
                    QUIZ_KMS_KEY: { Ref: 'QuizKey' },
                    CFSTACK: { Ref: 'AWS::StackName' },
                    ...util.getCommonEnvironmentVariables()
                },
            },
            Handler: `js/${name}.handler`,
            LoggingConfig: {
                LogGroup: { Ref: `${name}LogGroup` },
            },
            MemorySize: '128',
            Role: { 'Fn::GetAtt': ['ExampleLambdaRole', 'Arn'] },
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
                Value: 'Example',
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
                        '/lambda/examples.zip',
                    ]],
                },
                S3ObjectVersion: { Ref: 'ExampleCodeVersion' },
            },
            Environment: {
                Variables: {
                    ES_INDEX: { Ref: 'Index' },
                    FIREHOSE_NAME: { Ref: 'FeedbackKinesisFirehoseName' },
                    ES_ADDRESS: { Ref: 'ESAddress' },
                    QUIZ_KMS_KEY: { Ref: 'QuizKey' },
                    SNS_TOPIC_ARN: { Ref: 'FeedbackSNS' },
                    CFSTACK: { Ref: 'AWS::StackName' },
                    ...util.getCommonEnvironmentVariables()
                },
            },
            Handler: `py/${name}.handler`,
            LoggingConfig: {
                LogGroup: { Ref: `${name}LogGroup` },
            },
            MemorySize: '128',
            Role: { 'Fn::GetAtt': ['ExampleLambdaRole', 'Arn'] },
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
                Value: 'Example',
            }],
        },
        Metadata: {
            cfn_nag: util.cfnNag(['W92']),
            guard: util.cfnGuard('LAMBDA_CONCURRENCY_CHECK', 'LAMBDA_INSIDE_VPC'),
        },
    };
}

function jsLambdaLogGroup(name) {
    return {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
            LogGroupName: {
                'Fn::Join': [
                    '-',
                    [
                        { 'Fn::Sub': '/aws/lambda/${AWS::StackName}' },
                        `ExampleJSLambda${name}`,
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

function pyLambdaLogGroup(name) {
    return {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
            LogGroupName: {
                'Fn::Join': [
                    '-',
                    [
                        { 'Fn::Sub': '/aws/lambda/${AWS::StackName}' },
                        `ExamplePYTHONLambda${name}`,
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
