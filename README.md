# Guidance for QnABot on AWS

## Overview

QnABot on AWS is a multi-channel, multi-language conversational interface (chatbot) that responds to your customer’s questions, answers, and feedback. It allows you to deploy a fully functional chatbot across multiple channels including chat, voice, SMS, and Amazon Alexa. The Guidance’s content management environment, and contact center integration wizard allow you to set up and customize an environment that provides the following benefits:

-   Enhance your customer’s experience by providing personalized tutorials and question and answer support with intelligent multi-part interaction

-   Reduce call center wait times by automating customer support workflows

-   Implement the latest machine learning technology to create engaging, human-like interactions for chatbots

## Architecture Overview

Deploying this Guidance with the default parameters deploys the following components in your AWS account (bordered components are optional).

![Architecture](source/docs/architecture.png)

Figure 1: QnABot on AWS architecture

The high-level process flow for the Guidance components deployed with the AWS CloudFormation template is as follows:

1.	The admin deploys the Guidance into their AWS account, opens the Content Designer UI or [Amazon Lex](https://aws.amazon.com/lex/) web client, and uses [Amazon Cognito](https://aws.amazon.com/cognito/) to authenticate.

2. After authentication, [Amazon API Gateway](http://aws.amazon.com/api-gateway/) and [Amazon S3](http://aws.amazon.com/s3/) deliver the contents of the Content Designer UI.

3. The admin configures questions and answers in the Content Designer and the UI sends requests to Amazon API Gateway to save the questions and answers.

4. The `Content Designer` [AWS Lambda](http://aws.amazon.com/lambda/) function saves the input in [Amazon OpenSearch Service](http://aws.amazon.com/opensearch-service/) in a questions bank index. If using [text embeddings](source/docs/semantic_matching_using_LLM_embeddings/README.md), these requests will first pass through a LLM model hosted on [Amazon Bedrock](https://aws.amazon.com/bedrock/) to generate embeddings before being saved into the question bank on OpenSearch. In addition, the `Content Designer` saves default and custom [configuration settings](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/modifying-configuration-settings.html) in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/). 

5. Users of the chatbot interact with Amazon Lex via the web client UI, [Amazon Alexa](https://developer.amazon.com/en-US/alexa) or [Amazon Connect](https://aws.amazon.com/connect/). 

6. Amazon Lex forwards requests to the `Bot Fulfillment` AWS Lambda function. Users can also send requests to this Lambda function via Amazon Alexa devices. 
    > **_NOTE:_** When streaming is enabled, the chat client uses Amazon Lex sessionId to establish WebSocket connections through API Gateway V2.

7. The user and chat information is stored in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) to disambiguate follow up questions from previous question and answer context.

8. [Amazon Comprehend](https://aws.amazon.com/comprehend/) and [Amazon Translate](https://aws.amazon.com/translate/) (if necessary) are used by the `Bot Fulfillment` AWS Lambda function to translate non-native Language requests to the native Language selected by the user during the deployment and look up the answer in Amazon OpenSearch Service.
9. If using LLM features such as [text generation](source/docs/LLM_Retrieval_and_generative_question_answering/README.md) and  [text embeddings](source/docs/semantic_matching_using_LLM_embeddings/README.md), these requests will first pass through various foundational models hosted on Amazon Bedrock to generate the search query and embeddings to compare with those saved in the question bank on OpenSearch.

    a. If pre-processing guardrails are enabled, they scan and block potentially harmful user inputs before they reach the QnABot application. This acts as the first line of defense to prevent malicious or inappropriate queries from being processed.
    
    b. If using Bedrock guardrails for LLMs or Knowledge Base, it can apply contextual guarding and safety controls during LLM inference to ensure appropriate answer generation.
    
    c. If post-processing guardrails are enabled, they scan, mask, or block potentially harmful content in the final responses before they are sent to the client through the fulfillment Lambda. This serves as the last line of defense to ensure that sensitive information (like PII) is properly masked and inappropriate content is blocked.

10. If no match is returned from the OpenSearch question bank or text passages, then the Bot fulfillment Lambda function forwards the request as follows: 

    a. If an [Amazon Kendra](https://aws.amazon.com/kendra/) index is [configured for fallback](source/docs/Kendra_Fallback_README.md), then the `Bot Fulfillment` AWS Lambda function forwards the request to Kendra if no match is returned from the OpenSearch question bank.
    The text generation LLM can optionally be used to create the search query and to synthesize a response from the returned document excerpts.
    
    b. If a [Bedrock Knowledge Base](https://aws.amazon.com/bedrock/knowledge-bases/) ID is [configured](source/docs/LLM_Retrieval_and_generative_question_answering/README.md), then the `Bot Fulfillment` AWS Lambda function forwards the request to the Bedrock Knowledge Base. 
    The `Bot Fulfillment` AWS Lambda function leverages the RetrieveAndGenerate or RetrieveAndGenerateStream APIs to fetch the relevant results for an user's query, augment the foundational model's prompt and return the response.

11. When streaming is enabled, RAG-enhanced LLM responses from text passages or external data sources is streamed via WebSocket connection using same Lex sessionId, while the final response is processed through the fulfillment Lambda.

12. User interactions with the `Bot Fulfillment` function generate logs and metrics data, which is sent to [Amazon Kinesis Data Firehose](http://aws.amazon.com/kinesis/data-firehose/) then to Amazon S3 for later data analysis. 
The [OpenSearch Dashboards](source/docs/overview/images/image9.png) can be used to view usage history, logged utterances, no hits utterances, positive user feedback, and negative user feedback and also provides the ability to create custom reports.

13. The [OpenSearch Dashboards](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/dashboards.html) can be used to view usage history, logged utterances, no hits utterances, positive user feedback, and negative user feedback, and also provides the ability to create custom reports.

14. Using [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/), the admins can monitor service logs and use the CloudWatch dashboard created by QnABot to monitor deployment’s operational health.

Refer to the [implementation guide](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws) for detailed instructions on deploying QnABot in your AWS account.

Alternatively, if you want to custom deploy QnABot on AWS, refer to the details below.

## Custom deployment of QnABot on AWS

### Environment Prerequisites

-   Run Linux. (tested on Amazon Linux 2)
-   Install npm >11.0.0 and node >24.X.X ([instructions](https://nodejs.org/en/download/))
-   Install and configure git lfs ([instructions](https://git-lfs.com/))
-   Clone this repo.
-   Set up an AWS account. ([instructions](https://AWS.amazon.com/free/))
-   Configure AWS CLI and a local credentials file. ([instructions](https://docs.AWS.amazon.com/cli/latest/userguide/cli-chap-welcome.html))
-   Install Python >=3.14
-   Install Poetry. Below is one of the ways to install poetry. For other ways to install poetry, refer [Poetry installation instructions](https://python-poetry.org/docs/#installation)

```shell
## Install pipx via pip
python3 -m pip install --user pipx
python3 -m pipx ensurepath

## OR Install pipx via brew
brew install pipx
pipx ensurepath

## Install poetry
pipx install poetry

## Install poetry export plugin (required for build process)
poetry self add poetry-plugin-export
```

### Build a version

Navigate to the root directory of QnABot (directory will be created once you have cloned this repo).

Start from the /source directory.

```shell
cd source

Install node.js modules of QnABot:

```shell
npm install
```

Next, set up your configuration file:

```shell
npm run config
```

now edit `config.json` for the following parameters:

| param              | description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| region             | the AWS region to launch stacks in                                          |
| profile            | the AWS credential profile to use                                           |
| namespace          | a logical name space to run your templates in such as dev, test and/or prod |
| devEmail(required) | the email to use when creating admin users in automated stack launches      |

Next, use the following command to launch a CloudFormation template to create the S3 bucket to be used for Lambda code and CloudFormation templates. Wait for this template to complete (you can watch progress from the command line or [AWS CloudFormation console](https://console.AWS.amazon.com/cloudformation/home))

```shell
npm run bootstrap
```

Finally, use the following command to launch template to deploy the QnABot in your AWS account. When the stack has completed you will be able to log into the Designer UI (The URL is an output of the template). A temporary password to the email in your config.json:

```shell
npm run up
```

If you have an existing stack you can run the following to update your stack:

```shell
npm run update
```

## Testing

### Running Unit Tests

To run unit tests execute the following command from the root folder:

```shell
npm test
```

To update the test snapshots when modifying the /website or /templates directory, execute the following command:

```shell
npm run test:update:snapshot
```

### Running Regression Tests

**NOTE: Running regression tests will create, modify, and delete content and settings from the Content Designer. Only run regression tests on non-production bots where loss or modification of content and settings is acceptable.**

This runs integration tests against a deployed QnABot deployment in your account. Before running the tests follow the above steps to build and deploy a version or deploy using the template from the QnABot landing page: [Launch QnABot](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/step-1-launch-the-stack.html). 

#### Prerequisites
Before getting started, ensure you have the following dependencies installed on your system:

```bash
# Install Python 3
brew install python@3

# Install browser drivers for automated testing
brew install geckodriver
brew install --cask chromedriver
pip3 install virtualenv

# Install Poetry for dependency management.
## Install pipx via pip
python3 -m pip install --user pipx
python3 -m pipx ensurepath

## OR Install pipx via brew
brew install pipx
pipx ensurepath

## Install poetry
pipx install poetry

## Install poetry export plugin (required for build process)
poetry self add poetry-plugin-export
```

Follow the below steps to run the integration tests

1. Start from the /.nightswatch directory:
```bash
cd .nightswatch
```

2. Install the project dependencies

```bash
poetry install
source $(poetry env info --path)/bin/activate
```

3. Ensure you are logged in to the AWS CLI.

Set the following environment variables to point to the a QnA Bot deployment under test:

```bash
export CURRENT_STACK_REGION='<QNA BOT Region>'
export CURRENT_STACK_NAME='<QNA BOT Cloudformation Stack Name>'
export EMAIL='<admin user e-mail>
```

Optionally provide a username and password for an Admin user to test with. If these environment variables are not set then a default 'QnaAdmin' user will be created during the initial test. If you want to run a specific test then provide a username since the default user will only be created in the initial test.

```bash
export USER='<QNA BOT existing admin user>'
export PASSWORD='<QNA BOT existing admin password>'
```

If you'd like to launch the browser while running tests then also set the below env variable:

```bash
export HEADLESS_BROWSER='false'
```

If you'd like to see to start and end time for each test:

```bash
export TIMESTAMPS='true'
```

If you want to use a specific AWS profile for the test. If not set, the regression test will use the current AWS session that it's running in.

```bash
export TEST_ACCOUNT_PROFILE_NAMES='<AWS profile name>'
```

4. The Kendra tests will only run if the deployed bot has these features enabled. Follow the steps in the Implementation Guide to enable these features to test them:
 - Kendra 
   - Create an index and note the Index ID. For IAM role, you can create a custom new role for this from the dropdown. [Creating an index](https://docs.aws.amazon.com/kendra/latest/dg/create-index.html)
   - Update deployed stack's parameters KendraWebPageIndexId, KendraFaqIndexId and AltSearchKendraIndexes with Index ID created in the previous step.

5. Run the regression tests from within the test folder:

```bash
cd functional
pytest -v
```

## Publishing
Power users interested in releasing a custom QnABot can use the following instructions for publishing the deployment artifacts available to external users.

Create an S3 bucket to host the templates from (see $DIST_OUTPUT_BUCKET below). You will also need regional buckets for each region your users will deploy from. The regional buckets must be named $DIST_OUTPUT_BUCKET-$AWS_REGION. You will need to provide appropriate access permissions to the buckets for your targeted users. Please refer to the below links for buckets security and access control best practices:
- [Performing block public access operations on an access point](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-accesshtml#access-control-block-public-access-policy-status)
- [Amazon S3 Access Management](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-best-practices.html)
- [Amazon S3 security](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security.html)

**NOTE: All buckets must have versioning enabled, otherwise the stack will fail to deploy.**

Set the following environment variables for your custom QnABot:

```shell
export DIST_OUTPUT_BUCKET='<name of the bucket to upload artifacts to>'
export SOLUTION_NAME='<name of your custom bot>'
export VERSION='<bot version>'
export AWS_REGIONS=("us-east-1" "us-west-2" "ap-southeast-1" "ap-southeast-2" "ca-central-1" "eu-west-1" "ap-northeast-1" "eu-central-1" "eu-west-2" "ap-northeast-2")
```

The above variables will determine the bucket URL path where your bot will be hosted from. The AWS_REGIONS array is a list of all regions QnABot supports. The list can be modified as necessary if your bot version will not be deployed in certain regions.

Run the following commands to upload the current local version to the specified bucket:
```shell
cd deployment
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION
aws s3 cp global-s3-assets/  s3://$DIST_OUTPUT_BUCKET/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control
```

Create S3 buckets for each region if they do not already exist. These buckets will need to be configured for public use:
```shell
for region in "${AWS_REGIONS[@]}";
do
  if aws s3api head-bucket --bucket "$DIST_OUTPUT_BUCKET-$region" 2>/dev/null
  then 
    echo "Bucket exists: s3://$DIST_OUTPUT_BUCKET-$region"
  else 
    aws s3api create-bucket --bucket "$DIST_OUTPUT_BUCKET-$region"
    echo "Created bucket: s3://$DIST_OUTPUT_BUCKET-$region"
  fi
done
```

Run the below command for each region:
```shell
for region in "${AWS_REGIONS[@]}";
do
  if aws s3api head-bucket --bucket "$DIST_OUTPUT_BUCKET-$region" 2>/dev/null
  then 
    aws s3 cp regional-s3-assets/ s3://$DIST_OUTPUT_BUCKET-$region/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control 
  else 
    echo "Bucket not found: s3://$DIST_OUTPUT_BUCKET-$region"
  fi
done

```

The template can be deployed from the following URL for all regions:
```shell
echo https://$DIST_OUTPUT_BUCKET.s3.amazonaws.com/$SOLUTION_NAME/$VERSION/qnabot-on-aws-main.template
```

### Publishing best practices
1. Never overwrite a published artifact when it is available to external users. Increment the version to upload new artifacts and keep previous versions immutable. Enable bucket versioning to recover artifacts. You may also decide to have a 'latest' version which will always contain the latest version of your bot.
1. After uploading the artifacts, deploy and test from the S3 URL before releasing to any external users.

## Run Vite in Development Mode

In order to run Vite in Development Mode, make sure to have the following:
- Existing deployment of QnABot on AWS

Navigate to the root directory of QnABot (directory will be created once you have cloned this repo).

```shell
npm install
```

### Local Development with API Proxy

> ⚠️ **Security Warning:** This script adds `http://localhost:8080` as an allowed callback URL to your Cognito User Pool App Client. Only use this against development/test stacks — adding localhost callback URLs to a production environment creates an open redirect vulnerability. Always run `--cleanup` when you're done, and never leave localhost URLs configured on production deployments.

For local development with Hot Module Replacement (HMR) and API proxy to your deployed QnABot stack:

```shell
npm run dev:proxy -- --stack-name <my-qnabot-stack> --region <region>
```

Or provide the API URL directly:

```shell
npm run dev:proxy -- --api-url <https://abc123.execute-api.region.amazonaws.com> --stage prod
```

> **Note:** When using `--stack-name`, the script automatically fetches the Cognito User Pool configuration from CloudFormation and offers to add `http://localhost:8080` to the allowed callback/logout URLs (with a confirmation prompt). When using `--api-url`, this automatic Cognito configuration is not available — you will need to manually add `http://localhost:8080` to the callback and logout URLs in the Cognito User Pool App Client settings.

To remove localhost callback URLs from Cognito after development:

```shell
npm run dev:proxy -- --cleanup --stack-name <my-qnabot-stack> --region <region>
```

This starts the Vite dev server at `http://localhost:8080` with:
- Hot Module Replacement (HMR) for instant updates as you edit files
- API proxy configured to forward requests to your deployed QnABot backend
- Automatic Cognito App Client configuration for localhost callbacks

The dev server provides fast refresh and improved developer experience while connecting to your deployed backend services.

## Designer UI Compatibility

Currently the only browsers supported are:

-   Chrome
-   Firefox

## Built With

-   [Vue](https://vuejs.org/)
-   [Vite](https://vitejs.dev/)
-   [Vitest](https://vitest.dev/)

## License

Refer to [LICENSE.txt](LICENSE.txt) file for details.

## New features

Refer to [CHANGELOG.md](CHANGELOG.md) file for details of new features in each version.

A [workshop](https://qnabot.workshop.aws) is also available that walks you through QnABot features.

## QnABot Deployable Solution Versions

As QnABot evolves over the years, it makes use of various services and functionality which may go in and out of support. This section serves as a reference to the deployable solution versions along with links to their Public and VPC CloudFormation templates.

_Note: **Deployable solution versions** refers to the ability to deploy the version of QnABot in their AWS accounts. **Actively supported versions** for QnABot is only available for the latest version of QnABot._

### Deployable Versions
- [v7.4.2](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.4.2) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.4.2/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.4.2/qnabot-on-aws-vpc.template)
- [v7.4.1](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.4.1) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.4.1/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.4.1/qnabot-on-aws-vpc.template)
  - _Note: Fresh deployments of this version have a known issue where the Content Designer is inaccessible after login. Please use v7.4.2 or later for new deployments. Existing stack updates are not affected._
- [v7.4.0](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.4.0) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.4.0/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.4.0/qnabot-on-aws-vpc.template)
  - _Note: Fresh deployments of this version have a known issue where the Content Designer is inaccessible after login. Please use v7.4.2 or later for new deployments. Existing stack updates are not affected._
  - _Note: Alexa Skill authorization is now enforced via the new `AlexaSkillIds` CloudFormation parameter. **Existing Alexa users must provide their Alexa Skill ID(s) during stack update** to restore Alexa functionality. New deployments have Alexa disabled by default. See [Getting answers using Amazon Alexa](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/step-4-interact-with-the-chatbot.html#getting-answers-using-amazon-alexa) in the Implementation Guide for details._
- [v7.3.16](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.16) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.16/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.16/qnabot-on-aws-vpc.template)
- [v7.3.15](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.15) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.15/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.15/qnabot-on-aws-vpc.template)
- [v7.3.14](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.14) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.14/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.14/qnabot-on-aws-vpc.template)
- [v7.3.13](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.13) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.13/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.13/qnabot-on-aws-vpc.template)
- [v7.3.12](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.12) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.12/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.12/qnabot-on-aws-vpc.template)
  - _Note: Fixed stored XSS vulnerability in `alt.html` and `alt.markdown` Q&A response fields by adding server-side sanitization and aligning the Content Designer allowlist. Custom HTML tags and attributes outside the default allowlist will be excluded from Q&A responses and from content saved in the Content Designer. See [Server-side sanitization and using custom tags and attributes in responses](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/server-side-html-sanitization.html) in the Implementation Guide for details on the default allowlist and customization instructions._
- [v7.3.11](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.11) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.11/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.11/qnabot-on-aws-vpc.template)
- [v7.3.10](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.10) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.10/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.10/qnabot-on-aws-vpc.template)
- [v7.3.9](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.9) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.9/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.9/qnabot-on-aws-vpc.template)
- [v7.3.8](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.8) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.8/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.8/qnabot-on-aws-vpc.template)
- [v7.3.7](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.7) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.7/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.7/qnabot-on-aws-vpc.template)
- [v7.3.6](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.6) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.6/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.6/qnabot-on-aws-vpc.template)
- [v7.3.5](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.5) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.5/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.5/qnabot-on-aws-vpc.template)
- [v7.3.4](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.4) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.4/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.4/qnabot-on-aws-vpc.template)
- [v7.3.3](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.3) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.3/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.3/qnabot-on-aws-vpc.template)
- [v7.3.2](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.2) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.2/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.2/qnabot-on-aws-vpc.template)
- [v7.3.1](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.1) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.1/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.1/qnabot-on-aws-vpc.template)
- [v7.3.0](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.3.0) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.0/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.3.0/qnabot-on-aws-vpc.template)
  - _Note: Lambda Runtimes have been updated in the v7.3.0 release. Solution now uses: [**nodejs24** and python3.14]_
- [v7.2.4](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.2.4) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.4/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.4/qnabot-on-aws-vpc.template)
- [v7.2.3](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.2.3) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.3/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.3/qnabot-on-aws-vpc.template)
- [v7.2.2](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.2.2) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.2/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.2/qnabot-on-aws-vpc.template)
- [v7.2.1](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.2.1) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.1/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.1/qnabot-on-aws-vpc.template)
- [v7.2.0](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.2.0) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.0/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.2.0/qnabot-on-aws-vpc.template)
- [v7.1.3](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.1.3) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.3/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.3/qnabot-on-aws-vpc.template)
- [v7.1.2](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.1.2) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.2/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.2/qnabot-on-aws-vpc.template)
- [v7.1.1](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.1.1) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.1/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.1/qnabot-on-aws-vpc.template)
- [v7.1.0](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.1.0) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.0/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.1.0/qnabot-on-aws-vpc.template)
- [v7.0.8-modelBackport](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.8-modelBackport) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.8-modelBackport/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.8-modelBackport/qnabot-on-aws-vpc.template)
  - _Note: Recommended to use the latest deployable version of QnABot_
- [v7.0.8](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.8) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.8/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.8/qnabot-on-aws-vpc.template)
- [v7.0.7](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.7) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.7/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.7/qnabot-on-aws-vpc.template)
- [v7.0.6](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.6) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.6/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.6/qnabot-on-aws-vpc.template)
- [v7.0.5](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.5) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.5/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.5/qnabot-on-aws-vpc.template)
- [v7.0.4](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.4) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.4/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.4/qnabot-on-aws-vpc.template)
- [v7.0.3](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v7.0.3) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.3/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v7.0.3/qnabot-on-aws-vpc.template)
  - _Note: Lambda Runtimes have been updated in the v7.0.0 release. Solution now uses: [**nodejs20** and python3.10]_
- [v6.1.5](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.1.5) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.5/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.5/qnabot-on-aws-vpc.template)
- [v6.1.4](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.1.4) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.4/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.4/qnabot-on-aws-vpc.template)
- [v6.1.3](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.1.3) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.3/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.3/qnabot-on-aws-vpc.template)
- [v6.1.2](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.1.2) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.2/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.2/qnabot-on-aws-vpc.template)
- [v6.1.1](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.1.1) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.1/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.1/qnabot-on-aws-vpc.template)
- [v6.1.0](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.1.0) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.0/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.1.0/qnabot-on-aws-vpc.template)
- [v6.0.3](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.0.3) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.3/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.3/qnabot-on-aws-vpc.template)
- [v6.0.2](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.0.2) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.2/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.2/qnabot-on-aws-vpc.template)
- [v6.0.1](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.0.1) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.1/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.1/qnabot-on-aws-vpc.template)
- [v6.0.0](https://github.com/aws-solutions/qnabot-on-aws/releases/tag/v6.0.0) - [Public](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.0/qnabot-on-aws-main.template)/[VPC](https://solutions-reference.s3.amazonaws.com/qnabot-on-aws/v6.0.0/qnabot-on-aws-vpc.template)
  - _Note: AWS SDK for Javascript have been updated from v2 to v3.


### Undeployable Versions
- All solutions less than `v6.0.0` are no longer recommended to be deployed due to Lambda Runtime & other package deprecations. This information is provided as is and you are strongly encouraged to check the deprecation calendar and end of life of the frameworks used in the solution.

### Upcoming/Recent deprecations
- python3.10 is scheduled to enter [deprecation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported) on Jun 30, 2026.
- nodejs20 is scheduled to enter [deprecation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported) on Apr 30, 2026.
- AWS SDK for JavaScript v2 is scheduled to enter end-of-support phase on Sep 8, 2025.
- nodejs18 has entered [deprecation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported) on Sep 1, 2025.

### Why would a solution version no longer be deployable?
For QnABot, the most common reason is due to [AWS Lambda Runtimes being deprecated](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtime-support-policy). When a Lambda runtime has been marked as deprecated, customers can no longer create new Lambda functions in their AWS account. This means that older versions of our solutions that make use of those runtimes will fail to deploy. This makes it hard for the community to provide support as we are unable to deploy a similar environment to investigate issues and reproduce bug reports.

### What should I do if my version of the solution is no longer deployable?
If you've currently got an existing deployment working for you, there is nothing requiring you to update. However, it is **_strongly_** recommended that you build a plan to test and migrate production deployments to a supported version. The further away a deployment gets from `latest` the greater risk it is at to experiencing instability (especially with regards to deployment).

And for those looking to get started with the solution for the first time, it is always recommended you use the latest version. It is the most secure, stable, and feature-rich version of QnABot!

### How do I update my solution version?
In most cases, a simple [Update Stack operation](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/update-the-solution.html) should allow you to migrate your instance onto a newer version while maintaining your data on the new deployment.

> Note: For those upgrading from `v5.4.X` to later versions, if you are upgrading from a deployment with LLMApi set to SAGEMAKER then set this value to DISABLED before upgrading. After upgrading, return this value back to SAGEMAKER.

The team _**strongly**_ recommends that any upgrades (especially between minor/major versions) first be tested on a non-production instance to check for any regressions. This is critical if you have made custom modifications to your deployment, integrate with external services, or are jumping between multiple versions. Additionally, when upgrading between multiple major/minor versions, it is recommended to upgrade to the next major/minor version instead of skipping between multiple major/minor versions (Example: 6.0.X >> 6.1.X >> 7.0.X >> 7.1.X).

Some additional precautions you can take are:

 - export all of your questions using the Content Designer UI ([instructions](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/use-qnabot-on-aws.html#importing-and-exporting-chatbot-answers))
 - export all of your settings using the Content Designer UI (click `Export Settings` at the bottom of settings page)
 - backup DynamoDB table ([instructions](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/amazon-dynamodb-backups.html)) 
 - create a manual snapshot of your OpenSearch Domain ([instructions](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshots.html))

> Note: For a more detailed steps, see [update or migrate deployment](/source/docs/update_or_migrate_deployment/README.md).
 ---
## Collection of operational metrics
This solution sends operational metrics to AWS (the "Data") about the use of this solution. We use this Data to better understand how customers use this solution and related services and products. AWS's collection of this Data is subject to the [AWS Privacy Notice](https://aws.amazon.com/privacy/).

---

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
