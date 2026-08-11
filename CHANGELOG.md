# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.4.5] - 2026-08-11

### Security

- Updated `js-yaml` to `3.15.1` and `4.3.1`.
- Updated `nanoid` to `3.3.18`.

## [7.4.4] - 2026-08-06

### Security

- Updated `brace-expansion` to `5.0.9`.
- Updated `cryptography` to `50.0.0`.
- Downgraded `bodybuilder` to `2.4.0`, removing the vulnerable `lodash.unset` transitive dependency.
- Unified the sanitize-html allowlist shared between the Fulfillment Lambda and Content Designer into a single canonical source, automatically synced at build time.

### Fixed

- Fixed NightSwatch `test_llm.py` functional tests to configure only one of `temperature`/`topP` for Bedrock LLM model params, matching Claude 4.x-class model requirements.

## [7.4.3] - 2026-07-28

### Security

- Updated `postcss` to `8.5.23`.
- Updated `brace-expansion` to `5.0.8`.

## [7.4.2] - 2026-07-26

### Security

- Updated `fast-xml-parser` to `5.10.1`.
- Fixed sandbox expression evaluator bypass enabling arbitrary code execution.

### Fixed

- Addressed issues impacting Content Designer accessibility and chat client rendering on fresh deployments.

## [7.4.1] - 2026-07-22

### Security

- Updated `@babel/core` to `7.29.6`.
- Updated `js-yaml` to `3.15.0` and `4.3.0`.
- Updated `fast-xml-parser` to `5.7.0`.
- Updated `postcss` to `8.5.10`.
- Updated `qs` to `6.15.2`.
- Updated `@tootallnate/once` to `2.0.1`.
- Updated `uuid` to `11.1.1`.
- Updated `idna`, `requests`, and `pytest` Python dependencies.
- Updated `axios` to `1.18.1`.
- Updated `brace-expansion` to `1.1.16` / `2.1.2` / `5.0.7`.
- Updated `body-parser` to `1.20.6`.

### Fixed

- Fixed polynomial ReDoS vulnerability in `getOsIndex()` regex patterns in the import Lambda ([CodeQL #1](https://github.com/aws-solutions/qnabot-on-aws/security/code-scanning/1), [#2](https://github.com/aws-solutions/qnabot-on-aws/security/code-scanning/2)).
- Fixed incomplete string replacement in contraction expansion in the es-proxy-layer ([CodeQL #6](https://github.com/aws-solutions/qnabot-on-aws/security/code-scanning/6)).
- Fixed website `sanitizeOutput.js` stripping `style` attribute from `<span>` tags, preventing color styling in Content Designer markdown answers (Issue [#869](https://github.com/aws-solutions/qnabot-on-aws/issues/869)).
- Fixed SSO profile detection in deployment scripts to support SSO sessions (PR [#789](https://github.com/aws-solutions/qnabot-on-aws/pull/789)).
- Fixed non-deterministic CloudFormation template generation by filtering and sorting extension/example file lists (PR [#795](https://github.com/aws-solutions/qnabot-on-aws/pull/795)).

## [7.4.0] - 2026-07-01

### Changed

- Migrated website build tooling from Webpack/Jest to Vite/Vitest. See the [README](./README.md) for updated dev commands.

### Security

- Fixed Arbitrary Code Execution via Handlebars sandbox bypass.
- Fixed Lex session attribute injection enabling cross-account Lambda invocation.
- Fixed missing Alexa Skill authorization. New `AlexaSkillIds` CloudFormation parameter restricts Alexa invocations to registered skill IDs only. **Existing Alexa users must provide their Alexa Skill ID(s) during stack update to restore Alexa functionality.** See [Getting answers using Amazon Alexa](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/step-4-interact-with-the-chatbot.html#getting-answers-using-amazon-alexa) in the Implementation Guide for details.

### Fixed

- Replaced deprecated `cfn-lambda` npm package with native CloudFormation SDK calls, eliminating aws-sdk v2 dependency.
- Fixed Claude `topP`/`temperature` parameter conflict for Bedrock LLM (Issue [#892](https://github.com/aws-solutions/qnabot-on-aws/issues/892)).
- Fixed Comprehend PII regex causing Lambda outage on large payloads; added `span[translate]` to sanitization allowlist to restore span color rendering (Issue [#895](https://github.com/aws-solutions/qnabot-on-aws/issues/895)).

## [7.3.16] - 2026-06-18

### Security

- Updated `form-data` to `4.0.6`
- Updated `ws` to `7.5.11`
- Updated `cryptography` to `49.0.0`

## [7.3.15] - 2026-06-15

### Security

- Fixed stored XSS bypass via specialty bot routing by adding server-side sanitization to `altMessages` responses.

## [7.3.14] - 2026-06-09

### Security

- Updated launch-editor to `2.14.1`

### Fixed

- Replaced deprecated `Url.resolve()` with `new URL()` in es-proxy-layer (`cfn.js`, `cleanmetrics.js`, `handler.js`, `qid.js`)

## [7.3.13] - 2026-05-26

### Security

- Updated js-cookie to `3.0.7`

## [7.3.12] - 2026-05-21

### Security

- Fixed stored XSS vulnerability in `alt.html` and `alt.markdown` Q&A response fields by adding server-side sanitization and aligning the Content Designer allowlist. Custom HTML tags and attributes outside the default allowlist will be excluded from Q&A responses and from content saved in the Content Designer. See [Server-side sanitization and using custom tags and attributes in responses](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/server-side-html-sanitization.html) in the Implementation Guide for details on the default allowlist and customization instructions.

### Fixed

- Fixed fresh stack CREATE failure by removing the `aws-sdk: npm:dry-uninstall@*` override from `cfn-lambda-layer`.

## [7.3.11] - 2026-05-18

### Security

- Updated urllib3 to `2.7.0`
- Updated langsmith to `0.7.0`

## [7.3.10] - 2026-05-13

### Security

- Updated fast-xml-builder to `1.1.7`
- Updated urllib3 to `2.7.0`
- Updated fast-uri to `3.1.2`
- Updated @babel/plugin-transform-modules-systemjs to `7.29.4`
- Removed aws-sdk v2 from cfn-lambda-layer

## [7.3.9] - 2026-05-08

### Security

- Updated axios to `1.16.0`

## [7.3.8] - 2026-04-28

### Security

- Upgraded @xmldom/xmldom to `0.8.13`
- Upgraded fast-xml-parser, follow-redirects, and postcss
- Removed hardcoded fallback encryption key from conditional chaining encryptor
- Added post-tokenization validation to expression evaluator to prevent bypass via unrecognized characters

## [7.3.7] - 2026-04-15

### Security

- Updated axios to `1.15.0`
- Fixed hardcoded encryption key in conditional chaining encryptor
- Fixed expression evaluator sandbox bypass via bracket notation
- Added null check for failed decryption in conditional chaining evaluation

## [7.3.6] - 2026-04-02

### Fixed

- Fixed `.sort()` without comparator in fulfillment Lambda
- Fixed duplicate HTML IDs in Cognito login template
- Added explicit boto3 timeout config to Q Business Lambda hook

### Security

- Updated handlebars to `4.7.9`
- Updated path-to-regexp to `0.1.13`
- Updated fast-xml-parser to `5.5.9`
- Updated node-forge to `1.4.0`
- Updated picomatch to `2.3.2`
- Updated brace-expansion to `5.0.5`
- Updated yaml to `1.10.3`
- Updated @xmldom/xmldom to `0.8.12`
- Updated lodash to `4.18.1`

## [7.3.5] - 2026-03-24

### Security

- Updated flatted to `3.4.2`

## [7.3.4] - 2026-03-19

### Fixed

- Empty string settings now correctly persist instead of falling back to defaults [Issue #818](https://github.com/aws-solutions/qnabot-on-aws/issues/818)

### Security

- Updated flatted to `3.4.1`
- Updated fast-xml-parser to `5.5.6`

## [7.3.3] - 2026-03-05

### Security

- Updated fast-xml-parser to `5.4.2`
- Updated minimatch to `3.1.5`, `9.0.9`, and `10.2.4`
- Updated serialize-javascript to `7.0.4`
- Updated underscore to `1.13.8`

## [7.3.2] - 2026-02-24

### Security

- Updated ajv to `6.14.0`
- Updated bn.js to `5.2.3`
- Updated fast-xml-parser to `5.3.6`
- Updated minimatch to `3.1.3`
- Updated werkzeug to `3.1.6`

## [7.3.1] - 2026-02-17

### Security

- Updated axios to `1.13.5`
- Updated cryptography to `46.0.5`
- Updated langsmith to `0.4.12`
- Updated qs to `6.14.2`
- Updated JSONPath `0.11.2` to jsonpath-plus `10.3.0`

## [7.3.0] - 2026-02-03

**Note: we recommend that you first deploy these changes in a non-production environment. This is true for all releases, but especially important for minor and major releases.**

### Added

- New conditional chaining evaluation process [Issue #855](https://github.com/aws-solutions/qnabot-on-aws/issues/855)
- Operational metrics for conditional chaining

### Changed

- Updated Lambda runtimes to Node.js 24 and Python 3.14 [Issue #848](https://github.com/aws-solutions/qnabot-on-aws/issues/848)
- Updated AWS SDK v3 dependencies
- Scoped Fulfillment Lambda IAM policy to least privilege for OpenSearch access

### Fixed

- Fixed UI bug where existing questions showed original data when user cancels updates
- Fixed character validation checks for adding and editing fields in Content Designer

### Security

- Removed static-eval usage and replaced with limited, custom expression evaluator [Issue #855](https://github.com/aws-solutions/qnabot-on-aws/issues/855)
- Updated lodash to `4.17.23`
- Updated diff to `8.0.3`
- Updated eslint to `9.39.2`
- Updated fast-xml-parser to `5.3.4`

## [7.2.4] - 2026-01-14

### Security

- Updated urllib3 to `2.6.3`
- Updated werkzeug to `3.1.5`

## [7.2.3] - 2025-12-31

### Security

- Updated langchain to `0.3.37`
- Updated qs to `6.14.1`

## [7.2.2] - 2025-12-11

### Security

- Updated urllib3 to `2.6.1`
- Updated jws to `3.2.3`

## [7.2.1] - 2025-12-03

### Security

- Updated node-forge to `1.3.2`
- Updated werkzeug to `3.1.4`
- Updated express to `4.22.0`

## [7.2.0] - 2025-11-20

**Note: we recommend that you first deploy these changes in a non-production environment. This is true for all releases, but especially important for minor and major releases.**

### Added

- Cross-region inference profile support for LLMs and Embeddings. `LLMBedrockModelId` and `BedrockKnowledgeBaseModel` now support all `TEXT` input/output modality-based [foundation](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) and [cross-region inference models](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- `EmbeddingsBedrockModelId` now supports [Global Cohere Embed V4 and Amazon Nova Multimodal Embeddings Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)

### Removed

- [AppRegistry](https://docs.aws.amazon.com/servicecatalog/latest/arguide/intro-app-registry.html) removal from solution

### Security

- Updated glob to `10.5.0`
- Updated js-yaml to `4.1.1`

## [7.1.3] - 2025-09-18

### Security

- Updated axios to `1.12.2`

## [7.1.2] - 2025-09-04

### Changed

- Cached BedrockRuntimeClient instances to prevent resource exhaustion

### Fixed

- Fixed an issue where using the "Select All" toggle would incorrectly delete all questions, even after individual questions were deselected.

## [7.1.1] - 2025-08-26

### Security

- Updated sha.js to `2.4.12`
- Updated cipher-base to `1.0.6`
- Mitigated security findings from Amazon Inspector

## [7.1.0] - 2025-07-31

### Added

- Ability to enable dedicated master nodes for Amazon OpenSearch domain. `OpenSearchDedicatedMasterNodes`, `OpenSearchMasterNodeCount` & `OpenSearchMasterNodeInstanceType` CloudFormation parameters have been added

### Changed

- Updated Amazon OpenSearch version to `2.19`

### Security

- Updated linkifyjs to `4.3.2`

## [7.0.8] - 2025-09-04

### Fixed

- Cached BedrockRuntimeClient instances to prevent resource exhaustion

### Security

- Updated sha.js to `2.4.12`
- Updated cipher-base to `1.0.6`
- Mitigated security findings from Amazon Inspector
- Updated linkifyjs to `4.3.2`

## [7.0.7] - 2025-07-24

### Security

- Updated form-data to `4.0.4`
- Updated on-header to `1.1.0`

## [7.0.6] - 2025-06-26

### Security

- Updated pbkdf2 to `3.1.3`
- Updated webpack-dev-server to `5.2.2`
- Update brace-expansion to `1.1.12`
- Update requests to `2.32.4`
- Update urllib3 to `2.5.0`

## [7.0.5] - 2025-04-28

### Security

- Updated h11 to `0.16.0`
- Updated http-proxy-middlware to `2.0.9`

## [7.0.4] - 2025-04-03

### Security

- Removed tar-fs due to security vulnerability

## [7.0.3] - 2025-03-27

### Fixed

- Update SSM parameter migration to only migrate specified parameters [Issue #815](https://github.com/aws-solutions/qnabot-on-aws/issues/815)

## [7.0.2] - 2025-03-13

### Security

- Updated axios to `1.8.2`
- Updated jinja2 to `3.1.6`
- Updated @babel/core to `7.26.10`
- Updated @babel/helpers to `7.26.10`
- Updated @babel/runtime to `7.26.10`

## [7.0.1] - 2025-02-24

### Fixed

- Alexa Skill Kit issue where trigger would not get created in the lambda function during CFN deployment [Issue #804](https://github.com/aws-solutions/qnabot-on-aws/issues/804)
- Sanitization change to allow `<details>` and `<summary>` tags [Issue #751](https://github.com/aws-solutions/qnabot-on-aws/issues/751)
- Fixed Amazon Translate breaking markdown links from added spaces [Issue #805](https://github.com/aws-solutions/qnabot-on-aws/issues/805)

### Security

- Patched serialize-javascript, cryptography, & certifi vulnerability

## [7.0.0] - 2025-01-23

### Added

- Streaming responses feature that enhances QnABot responses by providing real-time streaming from Large Language Models (LLMs) to the chat interface. This introduces a cloudformation parameter `EnableStreaming` to optionally create resources needed for streaming through a nested stack. See [README](./source/docs/llm_streaming_responses/README.md).
- Enhanced Guardrail Integration that implements pre-processing and post-processing guardrails to provide improved content control and broader security for your chatbot application. See [README](./source/docs/bedrock_guardrails/README.md).
- Implemented Converse API to simplify LLM workflows by providing a consistent interface for different LLM providers, role prompting and eliminating the need for input tagging for Bedrock Guardrails. This introduces customizable system prompts `LLM_GENERATE_QUERY_SYSTEM_PROMPT` and `LLM_QA_SYSTEM_PROMPT` in content designer to support role-based prompting. For more information, see system prompts in [supported models and model features](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html) and [using Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html).
- Ability to use both RAG with Bedrock KnowledgeBase and Kendra as fallback options. A new setting `FALLBACK_ORDER` in the content designer allows users to specify the fallback order of these options.
- Ability to set a TTL on records added to the DynamoDB UsersTable. ([PR #671](https://github.com/aws-solutions/qnabot-on-aws/pull/671)) - contributed by ([@richhaase](https://github.com/richhaase))
- Mistral as a new LLM provider option and support for [latest Anthropic Sonnet 3.5 V2, Haiku 3.5 V1, Amazon Nova Models, Ai21 Jambda Instruct, Cohere R plus and Meta Llama 3.1 models.](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)

### Changed

- Upgraded to Node 20.
- Upgraded AWS SDK dependencies.
- Migrated Settings to DynamoDB store rather than SSM, allowing for longer custom settings and prompts.
- Moved Amazon Q Business Plugin from samples repo to QnABot repo as an example lambda hook
- Reduced the size of Bedrock KnowledgeBase output by removing citations from plaintext response.
- Updated OpenSearch EBSOptions VolumeType to `gp3` from `gp2`.
- Updated IAM permissions and cloudformation outputs.
- Added additional non-user input fields to OpenSearch metrics data redaction exclusion list.
- Migrated to Poetry for Python dependency management
- Updated innerHTML usages to innerText per security best practices

### Fixed

- Fixed issues with Excel file import and character handling when reading questions import file
- Improvements for merging of chained items ([PR #720](https://github.com/aws-solutions/qnabot-on-aws/pull/720)) - contributed by ([@amendlik](https://github.com/amendlik))

### Deprecated

- Settings stored in SSM Parameters. These will automatically be moved to DynamoDB when you upgrade.
- Sagemaker embeddings and LLM workflows.
- KendraCrawlerSNS Topic workflow [Issue #742](https://github.com/aws-solutions/qnabot-on-aws/issues/742)
- Bedrock LLM Models Cohere Command Text, Jurassic-2 Mid and Ultra per [Amazon Bedrock Model Lifefycle](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html#versions-for-eol)

### Security

- Patched Jinja2, nanoid, path-to-regexp vulnerability

## [6.1.5] - 2024-11-20

### Security

- Patched langchain, cross-spawn & elliptic vulnerability

## [6.1.4] - 2024-10-31

### Fixed

- PII usage leaks and improvements. See [README](./source/docs/PII_Detection_And_Redaction/README.md).

### Security

- Patched http-proxy-middleware vulnerability

## [6.1.3] - 2024-10-17

### Security

- Patched async and micromatch vulnerability

## [6.1.2] - 2024-10-07

### Fixed

- Cleared context state credential and updated the page history after logout

### Changed

- Added [Anthropic Claude 3.5 Sonnet](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) as an additional option to the list LLM models provided through cloudformation parameters `LLMBedrockModelId` and `BedrockKnowledgeBaseModel`

### Deprecated

- Sagemaker support has been deprecated and will be removed in the next release

## [6.1.1] - 2024-09-26

### Fixed

- Added back .gitignore to fix custom deployment issues through github repo
- Improved performance of lambda invocation from frontend to save settings faster
- Fixed bug that limited response card buttons to only 5 buttons [Issue #765](https://github.com/aws-solutions/qnabot-on-aws/issues/765)
- Security patch for body-parser, micromatch, path-to-regexp, and webpack
- Added support for crawled links in Bedrock Knowledge Base to be shown as referenced links
- Fixed an issue where the context is expanded by default and can't be closed when Knowledge Base returns lists in the response
- Fixed limit on import file sizes [Issue #766](https://github.com/aws-solutions/qnabot-on-aws/issues/766)

## [6.1.0] - 2024-08-29

### Added

- Integration with Guardrails for Amazon Bedrock and Amazon Bedrock Knowledge Base Integration (see [documentation](./source/docs/bedrock_guardrails/README.md))
- Ability to customize [prompt template](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html) for RAG using Amazon Bedrock Knowledge Base through setting  `KNOWLEDGE_BASE_PROMPT_TEMPLATE` (see [documentation](./source/docs/bedrock_knowledgebase_rag/README.md)).
- Ability to customize [inference parameters](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html) for LLM specified in `BedrockKnowledgeBaseModel` inference parameters for `BedrockKnowledgeBaseModel` through setting  `KNOWLEDGE_BASE_MODEL_PARAMS` (see [documentation](./source/docs/bedrock_knowledgebase_rag/README.md))
- Ability to customize [search type](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html) (e.g. `SEMANTIC` or`HYBRID`) for how data sources in the knowledge base are queried through setting `KNOWLEDGE_BASE_SEARCH_TYPE` (see [documentation](./source/docs/bedrock_knowledgebase_rag/README.md))
- Ability to customize [maximum number of retrieved results](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html) for RAG using Amazon Bedrock Knowledge Base through setting  `KNOWLEDGE_BASE_MAX_NUMBER_OF_RETRIEVED_RESULTS` (see [documentation](./source/docs/bedrock_knowledgebase_rag/README.md)).
- Ability to customize [metadata and filters](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html) for RAG using Amazon Bedrock Knowledge through setting  `KNOWLEDGE_BASE_METADATA_FILTERS` (see [documentation](./source/docs/bedrock_knowledgebase_rag/README.md))
- Added an option to specify the retention period for log groups through cloudformation parameter `LogRetentionPeriod`
- Anonymized operational metrics for some designer settings

### Changed

- Improved fault tolerance of Testall, Export, Import functionalities and added ContentDesignerOutputBucket
- Added [Amazon Titan Text Embeddings V2](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) as an additional option to the list of embedding models provided through cloudformation parameter EmbeddingsBedrockModelId
- Added [Amazon Titan Text Premier](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) as an additional option to the list LLM models provided through cloudformation parameters LLMBedrockModelId and BedrockKnowledgeBaseModel. [Issue 746](https://github.com/aws-solutions/qnabot-on-aws/issues/746)
- Changed Sagemaker LLM image to latest
- Changed `CustomQnABotSettings` parameter store to [Advanced Tier](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html) to accommodate storing additional custom settings

### Removed

- Removed Amazon Lex V1 resources
- Removed Canvas LMS integration

### Fixed

- Fixed import settings in content designer for double byte characters
- Fixed an edge case where the Knowledge Base could return a context starting with `#` characters, causing font differences in the returned text due to [Markdown](https://www.markdownguide.org/basic-syntax/) formatting
- Fixed session attribute `qnabot_gotanswer` not being set to `true` after receiving hits from Knowledge Base

### Security

- Security patch for axios, moto, read-excel-file, handlebars, boto3, click, elliptic & postcss

## [6.0.3] - 2024-08-06

### Security

- Patched fast-xml-parser vulnerability

## [6.0.2] - 2024-07-22

### Added

- Added a migration [documentation](./source/docs/update_or_migrate_deployment/README.md) for Migrating QnABot configurations and data from existing deployment to new deployment
- Added a [documentation](./source/docs/bedrock_knowledgebase_rag/README.md) for Bedrock Knowledge Base

### Fixed

- Improve logout functionality which signs out the user and invalidates the access and refresh tokens that Amazon Cognito issued to a user. [Issue #747](https://github.com/aws-solutions/qnabot-on-aws/issues/747)
- Fixed bug that restricted import of questions with answers that consisted of only double-byte characters. [Issue #731](https://github.com/aws-solutions/qnabot-on-aws/issues/731)
- Fixed bug with chained questions causing errors in the fulfillment lambda.

### Changed

- Removed aws-sdk (JavaScript V2) from dependency list.
- Updated parameter description for elicit response bot settings in the content designer settings. [Issue #745](https://github.com/aws-solutions/qnabot-on-aws/issues/745)
- Removed LLM models `meta.llama2-70b-chat-v1` and `meta.llama2-13b-chat-v1` from the list of models in the Cloudformation parameter `LLMBedrockModelId` since these models will be [unavailable on Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html#versions-for-eol) starting from August 12, 2024.
- Updated the setting `LLM_QA_NO_HITS_REGEX` in the Content Designer to include a default pattern `Sorry, I don't know` in prompts specified through the setting `LLM_QA_PROMPT_TEMPLATE` and other patterns returned by LLMs in their responses.
- Constrainted the query made to Bedrock Knowledge Base to maximum of 1000 characters input query as per the [input requirements](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerateInput.html#API_agent-runtime_RetrieveAndGenerateInput_Contents).

## [6.0.1] - 2024-06-26

### Fixed

- Fixed bug that was restricting stack names to be below 26 characters. [Issue #741](https://github.com/aws-solutions/qnabot-on-aws/issues/741)
- Fixed a looping issue when using slots and chaining ([PR #721](https://github.com/aws-solutions/qnabot-on-aws/pull/721)) - contributed by ([@amendlik](https://github.com/amendlik))
- Github links with incorrect paths.

### Changed

- Security patches for braces, urllib3, and ws.
- Improved latency of IAM policy propagation when switching the Bedrock embedding model.

## [6.0.0] - 2024-06-07

### Added

- Integration with Amazon Bedrock
- Integration with Amazon Bedrock Knowledge Base
- Enabled Fine Grain Access Control in Amazon OpenSearch Service by default. A new `OpenSearchFineGrainAccessControl` CloudFormation parameter has been added
- Content Designer UI improvements (grouped fields)
- Anonymized operational metrics
- Enabled Kendra based authentication utilizing QnABot idToken. A new `AltSearchKendraIndexAuth` CloudFormation parameter has been added
([PR #513](https://github.com/aws-solutions/qnabot-on-aws/pull/513)) - contributed by ([@JasonHammett](https://github.com/JasonHammett))

### Changed

- Migrated AWS JavaScript SDK from v2 to v3 for [Amazon Lex Web UI](https://aws.amazon.com/blogs/machine-learning/deploy-a-web-ui-for-your-chatbot/) Integration
- Upgraded Amazon OpenSearch Service domain from 1.3 to 2.11 unlocking features such as snapshot management via OpenSearch Dashboards (for more information see [Amazon OpenSearch release history](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/release-notes.html))
- [Renamed](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/rename.html) Elasticsearch to Opensearch and Kibana to OpenSearch Dashboards
- Migrated from ElasticSearch client to [OpenSearch client](https://opensearch.org/docs/latest/clients/javascript/index/)
- Changed SageMaker LLM model from `Falcon-40b` to `Llama-2-13b-chat` and Sagemaker embedding model intfloat/e5-large-v2 now uses the Jumpstart version of the model
- Removed the cloudformation parameter `Encryption` to prevent disabling of Amazon OpenSearch Service domain and Amazon S3 encryptions
- Updated Amazon OpenSearch Service domain minimum TLS policy to 1.2
- Rewrote and migrate S3 object deletion custom resources from JavaScript to Python to address 3rd party security vulnerability
- Updated CloudFormation template parameter groupings
- Kendra index configuration has been moved from Content Designer settings to CloudFormation parameters to restrict IAM permissions. The CloudFormation parameter `DefaultKendraIndex` has been replaced with three separate parameters: `KendraWebPageIndexId`, `KendraFaqIndexId`, and `AltSearchKendraIndexes`.
- Updated question validation when importing or creating questions in Content Designer
- Kendra Webcrawler will now create data source in the native language if supported by Kendra. Kendra can now query in different languages. ([issue #713](https://github.com/aws-solutions/qnabot-on-aws/issues/713))
- Standardized folder structure
- Made logging enhancements for Amazon OpenSearch Service and Amazon Data Firehose
- Added case conversion handlebars helpers([PR #719](https://github.com/aws-solutions/qnabot-on-aws/pull/719)) - contributed by ([@amendlik](https://github.com/amendlik))
- Consolidated common AWS SDK dependencies to reduce overall solution artifact size and lambdas deployment package size
- Patched security vulnerabilities and and integrated with CloudFormation Guard evaluation tool
- Added ability to TestAll in a selected locale, the locales to be tested should be defined in the template parameter `LexV2BotLocaleIds`
- Improved security for LLM inputs and outputs

### Fixed

- Forgot password functionality for Content Designer login
- Chat client will now prompt the user after credentials are expired
- Specialty bot routing fixes, Lex Intent state fixes, handlebar processing of SSML injects "\n" into response ([PRs #726](https://github.com/aws-solutions/qnabot-on-aws/pull/726)) - contributed by ([@bobpskier](https://github.com/bobpskier))
- Secured Cognito roles ([PR #670](https://github.com/aws-solutions/qnabot-on-aws/pull/670)) - contributed by ([@amendlik](https://github.com/amendlik))
- Improved error messages for embeddings ([issue #665](https://github.com/aws-solutions/qnabot-on-aws/issues/665))
- AWS environment variable for region is wrongly set ([issue #714](https://github.com/aws-solutions/qnabot-on-aws/issues/714))
- Fixed testall lambda timing out during status "Lex" when testing against large set of Q&As - contributed by ([@jeve7](https://github.com/jeve7))
- Fix Austrian German neural voice name ([PR #729](https://github.com/aws-solutions/qnabot-on-aws/pull/729)) - contributed by ([@malte-aws](https://github.com/malte-aws))
- Fix npm update command ([PR #681](https://github.com/aws-solutions/qnabot-on-aws/pull/681)) - contributed by ([@zherink](https://github.com/zherink))
- Fix build exits with code 1, if a CF template is invalid ([PR #733](https://github.com/aws-solutions/qnabot-on-aws/pull/733)) - contributed by ([@richhaase](https://github.com/richhaase))

## [5.5.2] - 2024-05-08

### Fixed

- Fixed an issue with the testall functionality which may introduce a high number of versions stored in the testall S3 bucket when the Content designer has no Q&As.

### Changed

- Security patch for idna

## [5.5.1] - 2024-04-01

### Fixed

- Document chaining was not working when using Lambda functions for chaining. This has been resolved. ([issue #687](https://github.com/aws-solutions/qnabot-on-aws/issues/687))
- ESWarmer lambda was generating a big amount of log data in CloudWatch. This is now fixed. ([issue #692](https://github.com/aws-solutions/qnabot-on-aws/issues/692))

### Changed

- QnaBot Client to now use code grant instead of implicit grant for Cognito Authorization
- Security patch for webpack-dev-middleware
- Template to ensure an embedding instance size of 1 is at least choosen since serverless is no longer available for the embedding model

## [5.5.0] - 2024-01-04

### Added

- Added Core-Language parameter to the QnABot deployment. This parameter allows the user to select during the deployment a core language which will be used by the OpenSearch language analyzers to look for question and answers. With this update, QnABot can now be deployed natively in 33 Languages with a more syntactical accuracy for matching questions and answers
- Bot routing enhancements including passing initial utterance to specialty bot and receive session attributes from specialty bot ([issue #376](https://github.com/aws-solutions/qnabot-on-aws/issues/376)) - contributed by ([@bobpskier](https://github.com/bobpskier))
- Improved error handling. Added custom error handling question to QnaUtility and some errors are appended to chat client message when ENABLE_DEBUG_RESPONSES is set to 'true'
- Added 'PROTECTED_UTTERANCES' setting which allows the user to configure a comma-separated list of utterances that will be ignored by LLM query disambiguation and translation. This fixes a bug where feedback (thumbs up/thumbs down) and language selection would be disambiguated instead of triggering the respective workflow
- Added 'getQuestion' handlebar that returns the original matched question without hard-coding ([issue #397](https://github.com/aws-solutions/qnabot-on-aws/issues/397))
- Added functional test collection for verifying deployed QnABots
- Added Service API Usage Tracking
- Added deployment parameter to enable selection of opensearch instance type ([issue #599](https://github.com/aws-solutions/qnabot-on-aws/issues/599))

### Changed

- Migrated out of Bluebird promises to native promises
- Migrated to AWS SDK for JavaScript v3
- Upgraded to Webpack 5
- Upgraded to Vue3
- Upgraded to Vuetify 3
- Upgraded to latest LLM Image
- Code Quality improvements based on SonarQube analysis
- Security patches for npm

### Fixed

- Fixed chaining not working when combined with bot routing ([issue #508](https://github.com/aws-solutions/qnabot-on-aws/issues/508)) - contributed by ([@bobpskier](https://github.com/bobpskier))
- Fixed issue with chaining causing QnABot to become unresponsive when chaining rule evaluation fails. Improved error reporting when debugging is enabled.
- Fixed issue preventing lambda hooks defined in the templates/extensions directory from being executed by the fulfillment lambda.
- Fixed issue where LLM errors return 'no_hits' response instead of error message.
- Fixed bug where positive feedback is not published to SNS.
- Fixed content designer settings using different casing standard for boolean values ([issue #666](https://github.com/aws-solutions/qnabot-on-aws/issues/666))
- Fixed inclusion of OpenSearch QnA results in text passages ([issue #669](https://github.com/aws-solutions/qnabot-on-aws/issues/669)) - contributed by ([@cristi-constantin](https://github.com/cristi-constantin))
- Fixed issue where session attributes become undefined when translate isn't enabled.
- Fixed issue where settings were being evaluated as strings instead of numbers. Settings that are saved as stings that represent positive, negative, whole, or decimal numbers will be parsed as numbers.
- Fixed issue where kendra redirect does not use redirect query when users locale matches kendra index locale

## [5.4.5] - 2023-11-01

### Changed

- Security patch for browserify-sign

## [5.4.4] - 2023-10-24

### Changed

- Security patch for urllib3

### Fixed

- Fixed fulfillment throws an exception when a Preprocessing Lambda Hook is configured([issue #651](https://github.com/aws-solutions/qnabot-on-aws/issues/651))
- Improved error handling

## [5.4.3] - 2023-10-13

### Fixed

- Fixed issue where Alexa schema was not exporting the utterances list.

## [5.4.2] - 2023-09-30

### Added

- Self-hosting web fonts. Font files used by QnABot UI are now served from QnABot server instead of using third party font provider.

### Changed

- Security patches for npm and pip packages
- Lambda runtimes updated to NodeJS 18 for CFN Bootstrap Lambda
- SonarQube Quality Gates fix
- Bluebird Promise Migration (Partial)
  - Utilize native promises supported in JavaScript
  - Full migration planned for v5.5.0. Done as a prerequisite for JavaScript SDK v3 migration planned for v6.0.0
  - Remaining changes to be implemented in v5.5.0 include ./website, ./cfn, & ./templates

### Fixed

- Fixed request signing issue when using Custom domain ([issue #605](https://github.com/aws-solutions/qnabot-on-aws/issues/605))
- Fixed Sagemaker LLM deployment ([issue #635](https://github.com/aws-solutions/qnabot-on-aws/issues/635))
- Fixed voice integration with LLM response
- Fixed unsupported SSML tags
- Fixed Kendra API retrieval bug

## [5.4.1] - 2023-07-27

### Changed

- LLM README documentation

## [5.4.0] - 2023-07-27

**Note: we recommend that you first deploy these changes in a non-production environment. This is true for all releases, but especially important for minor and major releases.**

### Added

- New (optional) query disambiguation and text generation features through the use of Large Language Models (LLMs) to enable enhanced conversational chat and response synthesis. Details at [README](docs/LLM_Retrieval_and_generative_question_answering/README.md)
  - In order to provide this functionality, the solution will provision an inference endpoint hosted on Amazon SageMaker
  - If enabled, this has cost implications. Please [refer to the IG](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/plan-your-deployment.html#cost) to see cost estimates
- [App Registry integration](https://docs.aws.amazon.com/servicecatalog/latest/arguide/intro-app-registry.html), QnABot will now register an application in System Manager to enable various application management tools

### Changed

- Lambda runtimes updated to NodeJS 18
- Python runtimes Changed to Python 3.10
- Security patches for npm and pip packages

## [5.3.5] - 2023-07-12

### Changed

- removal of ElasticSearchUpdate custom resource to prevent CFNLambda recursion alert (#618)
- Security patches for pip packages

## [5.3.4] - 2023-05-19

### Changed

- Security patches for npm and pip packages

### Fixed

- Fix Connect Voice response failure when QID has buttons (#607)

## [5.3.3] - 2023-04-20

### Changed

- Security patches for npm packages

## [5.3.2] - 2023-04-17

### Added

- Added new parameter for configurable Opensearch EBS Volume Size (#567)
- Added MetricsBucket to stack outputs (#571)

### Fixed

- Fix Lambda Embeddings documentation with correct event definition (#576)
- Fix broken urls in prairielinetrail tour example (#577)
- Fix bug causing CONNECT_IGNORE_WORDS from working correctly (#589)
- Fix QIDs not matching correctly when the score is less than 1 (#592)
- Improved handling of Lex and Connect response limits (#593)

### Changed

- Security patches for npm and pip packages
- Update Connect Interactive Message limits

## [5.3.1] - 2023-03-15

### Fixed

- Bug causing bot Fulfillment to fail on embeddings updates (#566)

### Changed

- VPC documentation update (SageMaker Serverless is not supported within a VPC)
- Security patches for npm and pip packages

## [5.3.0] - 2023-02-23

**Note: we recommend that you first deploy these changes in a non-production environment. This is true for all releases, but especially important for minor and major releases.**

### Added

- New (optional) text embeddings feature to enable built-in semantic search capabilities. Details at [README](docs/semantic_matching_using_LLM_embeddings/README.md)
  - In order to provide this functionality, the solution will provision an inference endpoint hosted on Amazon SageMaker
  - If enabled, this has cost implications. Please [refer to the IG](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/plan-your-deployment.html#cost) to see cost estimates

### Changed

- Migrated solution from ElasticSearch v7.10 to OpenSearch v1.3
- Updated TEST tab to include support for clientfilters
- Security patches for npm and pip packages
- Added/Updated unit tests for JS Lambda Hook SDK
- Added unit tests for connect lambda
- Added unit tests for genesys lambda

## [5.2.7] - 2023-02-08

### Changed

- Security patches for npm and pip packages
- Added unit tests for JS Lambda Hook SDK

## [5.2.6] - 2023-01-11

### Changed

- Security patches for npm and pip packages

### Fixed

- Missing awaits when merging default and custom settings

## [5.2.5] - 2022-12-19

### Changed

- Security patches for npm and pip packages
- Added Support for latest LexV2 languages (see [Multi-language Support](docs/multilanguage_support/README.md))
  - Updated::
    - English (IN), Spanish (LATAM), Portuguese (PR), Mandarin (PRC) to use neural voice
  - New languages:
    - Cantonese
    - Dutch
    - Finnish
    - Gulf Arabic
    - Hindi
    - Norwegian
    - Polish
    - Swedish
- Added unit tests for translate lambda
- Added unit tests for schema lambda
- Added unit tests for qnabot-common-layer

### Fixed

- Fix undefined exception in kendra.js function
- Readd fulfillment widget into CloudWatch dashboard (#495)
- Convert template urls to https for nested stacks
- Update URLs and references to old repo/branch name
- Fix for case sensitivity on clientFilterValues (#518)

## [5.2.4] - 2022-11-19

### Changed

- Security patches for npm and pip packages

## [5.2.3] - 2022-11-09

### Changed

- Security patches for npm and pip packages

## [5.2.2] - 2022-10-24

### Changed

- Security patches for npm and pip packages
- `axios` npm package removed from lambda/cfn
- Add retries for elasticsearch api requests with 5xx error codes to improve stability of initial stack deployment
- Split the creation of Lex Bot Versions in CF templates into batches of 3 to improve stability of initial stack deployment

### Fixed

- Lex rebuild failures when there is any single character utterance (#503)
- ElicitResponse bug causing bot to prompt 'What is the question?' (#506)

## [5.2.1] - 2022-09-15

### Changed

- Security patches for npm packages.
- `safe-eval` npm package was replaced by `vm2` package, and `node-sass` was replaced by `sass` package.
- `multer` npm package removed.
- Node.js Lambda runtime to Nodejs.16

### Fixed

- Error when the image URL is not provided in the Response card.

## [5.2.0] - 2022-07-14

### Added

- Intent and Slot matching (an early implementation). This new capability supports creating dedicated custom Intents for a QnABot {Item ID}. You can extend QnABot to support one or more related intents.
For example, you might create an intent that makes a car reservation, or assists an agent during a live chat or call (via Amazon Connect).
More details in [README](https://github.com/aws-solutions/qnabot-on-aws/blob/v5.2.0/docs/intent_slot_matching/README.md)
- Support for using custom domain names for QnABot Designer and Client interfaces.
More details in [README](https://github.com/aws-solutions/qnabot-on-aws/blob/v5.2.0/docs/custom_domain_name_setup/README.md)
- AWS QnABot Command Line Interface (CLI) - the AWS QnABot CLI supports the capability to import and export questions and answers via command line.
More details in [README](https://github.com/aws-solutions/qnabot-on-aws/blob/v5.2.0/docs/qnabot_cli.md)
- Kendra Redirect - with the Kendra Redirect feature, you can now include a Kendra query within a Item ID.
More details in [README](https://github.com/aws-solutions/qnabot-on-aws/blob/v5.2.0/docs/kendra_redirect/README.md)
- Integration with Canvas LMS (an early example implementation).
Students use their schools' learning management system (LMS) to keep track of their assignments, grades, and their course work.
With this integration, students will be able to ask QnABot about their grades, syllabus, enrollments, assignments, and announcements.
More details in [README](https://github.com/aws-solutions/qnabot-on-aws/blob/v5.2.0/docs/canvaslms_integration.md)
- Changed import functionality to support importing of QnABot questions and answers from a Excel file when uploaded to S3 data folder.
- Added support for importing session attributes via Excel.
- Updated runtime of Lambda functions (using Python runtime) to use Python runtime version 3.9.

### Changed

- Solution GitHub repository's name was changed to QnABot on AWS.

### Fixed

- Client Type was not detected when using LexWebUI with LexV2.
- Implemented small score boost for items with no topic when topic is not set in the query. This breaks the ties, and allows a predictable response for an ambiguous question when there is no topic, by preferring an answer that also has no topic.
- `Test All` functionality when `ENFORCE_VERIFIED_IDENTITY` is `true`.
- Queries containing only {stop words} should return no_hits instead of random answer.
- Metric logging issue when field count exceeds index limit.
- Kendra support for multilanguage content search match.
- QnABot Client not displaying updated language(s).
- Updated es-warmer function to use qnabot common lib to pick up package for qnabot/logging. Without this, es-warmer immediately fails and does not complete keeping elasticsearch cache loaded with questions.
- Addressed several issues related to presentation of Amazon Alexa skill cards.
- Changed QnABot templates to use native Lex V2 Cloudformation template syntax for response bots.
- Handling response card images with long URLs.

## [5.1.2] - 2022-03-14

### Added

- Logic to support Amazon Connect Interactive Messages
- New set of example questions to be imported for Genesys Cloud CX.

### Changed

- Genesys Cloud CX Call Flow export wizard to use new session attributes referenced in example questions
- Policies in nested templates by further scoping down policies and adding cfn_nag suppressions as appropriate
- Node module dependencies for html-webpack-plugin(4.5.2), and chalk(3.2.0). Removed unused dependencies
    for js-xlsx and read-excel-file.

## [5.1.1] - 2022-02-04

### Added

- Expanded language support for voice and text interactions. Also included support for Neural voices for Lex language locales. See [supported languages](docs/multilanguage_support/README.md#supported-languages).
- Expanded `config.json` to support `LexV2BotLocaleIds` parameter.
- Updated `LexV2BotLocaleIds` parameter in CloudFormation template to include link to supported languages.
- Updated [Multi Language Support readme](docs/multilanguage_support/README.md#supported-languages) and added supported languages section.
- Updated `ENABLE_MULTI_LANGUAGE_SUPPORT` setting in [Settings readme](docs/settings.md) with link to supported languages.

### Fixed

- Fixed Kendra Webcrawler data source sync issue by adding support to check for Kendra webcrawler data source {status} before initiating sync
- Fixed issue where the Kendra Webcrawler data source {settings} page in Kendra console was resulting in a blank page - by updating configuration parameters for data source create and update steps

## [5.1.0] - 2021-12-09

### Added

- Tags to questions in Content Designer and ability to create reports in Kibana.
- Integration with Genesys call center platform.
- Client Filtering with Session Attributes (i.e., Support to allow the same set of questions to be answered differently based on a session attribute).
- Intelligent redaction of Personally Identifiable Information in logs with Amazon Comprehend.
- A QnABot client (e.g. a Connect contact flow) can now optionally provide a value for session attribute, `qnabotUserId`. When this session attribute is set, QnABot tracks user activity based on the provided value. If not set, QnABot continues to track user activity based on the request userId (LexV1) or sessionId (LexV2). NOTE: `qnabotUserId` value is not used when user authentication using JWTs is enabled - in this case users are securely identified and verified from the JWT.
- Support for pre and post processing AWS Lambda Hooks.
- Setting that determines whether Amazon Kendra responses are abbreviated when sent via SSML (`ALT_SEARCH_KENDRA_ABBREVIATE_MESSAGE_FOR_SSML`)
- Setting that determines the types of responses that Amazon Kendra returns (`ALT_SEARCH_KENDRA_RESPONSE_TYPES`: `ANSWER`, `DOCUMENT`, `QUESTION_ANSWER`)

### Fixed

- Test tab in Content Designer to show same results as the web client when using Kendra FAQ.
- Broken link in documentation for downloading CloudFormation template.
- Integration with Slack on Amazon LexV2 bots.
- QnABot will set the sessionAttribute from CONNECT_NEXT_PROMPT_VARNAME to an empty string if QnABot is in a response bot in a voice channel. This will prevent QnABot from saying the next prompt in the middle of a response bot flow.
- Kendra FAQ sync where export Lambda was missing the Layer containing qnabot log.
- Bug with response bots with Alexa where QnABot was filling in a malformed reprompt.text in the response.
- Excel import improvements and bug fixes.

### Changed

- Bot routing capability to have multiple-bot architecture (e.g., General bot routing questions to specialty bots).
- The built-in Amazon Kendra “web page indexer” with the new Kendra Web Crawler Datasource.

## [5.0.1] - 2021-10-20

### Added

- Architecture diagram and more details on [README.md](README.md)

### Fixed

- Regex Redaction in CloudWatch and Amazon OpenSearch Service.
- Outdated NPM dependencies via Dependabot alerts and `npm audit` tool.

### Changed

- License from Amazon Software License to Apache License 2

## [5.0.0] - 2021-09-24

### Added

- AWS QnABot release as an AWS Solution Implementation
  - AWS QnABot now has a [landing page](https://aws.amazon.com/solutions/implementations/qnabot-on-aws/) and [Implementation Guide](https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/welcome.html)

### Changed

- Minor changes in IAM scopes to enhance security posture.
- Amazon Connect integration wizard now uses Amazon LexV2 bots in all Regions (no longer requires the 'LexV2 Only' setting to be true.)

### Fixed

- Bug fixes related to multiple language support

## [4.7.3] - 2021-08-04

### Changed

- The QnABot fulfillment Lambda function can now be configured for provisioned concurrency to further improve query
    response times after periods of inactivity.

### Fixed

- Bug fix for proper invocation of ESWarmer lambda
- Bug fix to resolve sporadic API Compression CloudFormation exception

## [4.7.2] - 2021-07-08

### Changed

- LexV2 built-in Elicit Response bots have been added.
- Custom settings can now be exported and imported from the Content Designer Settings page.

### Fixed

- Bug fix "TypeError: AWS.LexRuntimeV2 is not a constructor" when using Lex V2 based Elicit Response Bots.
- Bug fix "Cannot read property 'buttons' of undefined" when no buttons specified in response card.
- Bug fix Protect against TypeError exception while processing fallback intent case for an invalid response provided to a LexV2 Response Bot.

## [4.7.1] - 2021-07-03

### Changed

- Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) version 7.10 is now utilized.
- Encrypted Amazon Elasticsearch Service (production) instance types now use m6g.large.elasticsearch for improved price/performance/memory.
- The QnABot fulfillment Lambda function has been optimized to reduce query response times and variability,
    especially after periods of inactivity.
- Custom settings can now be exported and imported from the Content Designer Settings page.

### Added

- LexV2 built-in Elicit Response bots have been added.

### Fixed

- Bug fix when ES_SCORE_ANSWER_FIELD is set to true. Prior to this fix, answer fields were not
    utilized fully in Amazon Elasticsearch Service queries.

## [4.7.0] - 2021-06-06

### Changed

- QnABot now supports LexV2 with voice interaction in multiple languages.
  - Two installation/update modes are now available:
    - (i) LexV1 + LexV2 (default, recommended for most AWS regions.
    - (ii) LexV2-only (currently recommended for AWS regions where LexV1 is not available).
  - LexV2 locales are specified via a new CloudFormation parameter
    - The default locales are US English, US Spanish and Canadian French.
- The QnABot web client now uses LexV2 and supports dynamic bot locale selection from a new title bar menu.
- Custom LexV2 Elicit Response bots are now supported. The built-in response bots still use LexV1 and are
    available only when QnABot is installed in LexV1+LexV2 mode.
- CloudFormation deployment is now available for Canada/Montreal region (LexV2-only mode).
- Amazon Connect integration in the Canada/Montreal region supports multiple voice languages using LexV2.
- The Content Designer 'Test All' feature now uses LexV2.
- Content Designer's "Rebuild Lex Bot" feature now rebuilds both LexV2 and LexV1 bots
- Non-English LexV2 bot locales are automatically generated with sample utterances translated from English questions using Amazon Translate.
- Content Designer's Import feature now supports Excel spreadsheets as well as the existing JSON format.
- QnABot's Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) cache is now automatically kept warm to improve query time consistency.
- Negative feedback (thumbs down) messages can now generate notifications (text, email, etc.) using Amazon SNS.

## [4.6.0] - 2021-04-30

### Changed

- Kendra integration is now fully automated during install or update when the new default Kendra Index ID parameter is provided.
- Kendra custom no_hits item required in earlier releases is no longer required to turn on Kendra Fallback and should be removed, configurable confidence thresholds now available for filtering Kendra results.
- Kibana dashboard now shows additional detail on questions answered via Kendra FAQ and Kendra Fallback.
- Standard markdown is now automatically converted to Slack markdown when using Slack, Kibana dashboard logs and metrics retention period is now configurable during install or update, Lambda runtime upgraded to Node.js 12.x.

### Added

- Two new settings have been added

  - ALT_SEARCH_KENDRA_FALLBACK_CONFIDENCE_SCORE - Answers will only be returned at or above the specified [confidence level](https://aws.amazon.com/about-aws/whats-new/2020/09/amazon-kendra-launches-confidence-scores/) when using Kendra Fallback.
  - ALT_SEARCH_KENDRA_FAQ_CONFIDENCE_SCORE - Synchronized FAQ questions will only be matched to an Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) question if the Kendra FAQ confidence level is at or above the specified confidence level.

## [4.5.2] - 2021-04-08

### Fixed

- Fix for new Kendra resources deployed in VPC addressing issues in 4.5.0 and 4.5.1.

## [4.5.1] - 2021-03-15

### Fixed

- Fix for incorrect Thumbs Up / Thumbs Down processing in 4.5.0.
- Fix for multi-language support when manually switching languages in 4.5.0.
- Improve formatting of markdown responses from Kendra ANSWER responses.

## [4.5.0] - 2021-03-07

### Added

- Added single click deployment support for four additional regions

- Added Personal Identifiable Information detection support using Amazon Comprehend - [readme](./docs/PII_Detection/README.md)
- Added web indexing support using Amazon Kendra - [readme](./docs/kendra_crawler_guide/README.md)
- Added Amazon Translate custom terminology support - [readme](./docs/custom_terminology_guide/README.md)
- Added multi-language translation with QnABot Kendra fallback processing
- Added support for signing S3 URLs for bot responses, using handlebar syntax - [readme](./lambda/proxy-es/lib/HANDLEBARS_README.md)
- Added support to defining user specified custom settings

### Changed

- Changed unencrypted Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) instance types to be t3.small.elasticsearch
- Changed default number of nodes for Amazon Elasticsearch Service cluster to 4 for better production level
    cluster performance and resiliency. This can be changed to 2 for development clusters if desired.
- Lambdahook responses can now be used with document chaining and are translated when multi-language support is enabled
- Improved support when contractions are used in utterances
- Kendra Fallback message prefixes are now configurable in QnABot settings.
- To improve performance, resiliency, and security, the Amazon Elasticsearch Service cluster will default to using ENCRYPTED nodes
    using the c5.large.elasticsearch instance type. If UNENCRYPTED is selected, the
    t3.small.elasticsearch instance types will be used. The default number of nodes in a new cluster is now 4 for improved
    resiliency. The number of cluster nodes can be reduced to 2 for development environments
    if desired.
- QnABot distribution Regions now available for one click deployment have increased to 8 regions. These are Northern Virginia (us-east-1), Oregon (us-west-2), Ireland (eu-west-1), London (eu-west-2), Frankfurt (eu-central-1), Sydney (ap-southeast-2), Singapore (ap-southeast-1), and Tokyo (ap-northeast-1).

### Fixed

- Fixed bugs and defects

## [4.4.1] - 2020-12-29

### Added

- Added support for setting 'profile' as an identity attribute from cognito federation.

### Fixed

- Fix for Designer UI from breaking change in highlight.js due to dependabot alert / change.
- Fix syntax error introduced in 4.4.0 QNAPin and QNAPinNoConfirm bots that prevents updates from succeeding.

## [4.4.0] - 2020-12-24

### Changed

- Preview VPC support - [readme](./VPCSupportREADME.md)
- Preview BotRouter support - [read](./BotRoutingREADME.md)
- Upgrade to Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) version 7.9
- Slack client support via Lex with Slack specific markdown support

### Added

- Added support for Alexa re-prompt functionality

### Fixed

- Bug fixes and defect enhancements

## [4.3.2] - 2020-11-09

### Changed

- Support lengthy answer definition for Kendra FAQ
- Check of FAQ deletion in Kendra when FAQ content is being resynced
- Support multiple responses when using Test in content designer with Kendra FAQ enabled

### Fixed

- Bug fixes for Kendra FAQ integration
- Fix for exception - "Cannot convert undefined or null to object" when Session Attributes are no provided during Lex input. [Issue #229](https://github.com/aws-solutions/qnabot-on-aws/issues/229)
- Package version updates to address current github dependabot alerts

## [4.3.0] - 2020-09-21

### Added

- New Connect Wizard available in the Content Designer UI to assist integration with a Connect Contact Flow.
- New 4-node Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) domain support for improved fault tolerance in deployment template.

### Changed

- Elicit Response bot support for confirmation responses using phone keypad 1 = yes 2 = no.
- Security improvements in API Gateway.
- ID token values removed from session event after validation and redacted from logging.
- Setting to limit the number of Kendra fallback search results.
- Setting to allow signed URLs for S3 documents in Kendra search results.

## [4.2.4] - 2020-09-03

### Added

- Add CONNECT_IGNORE_WORDS to settings which allows single character words to be ignored during input to QnABot via Connect. Default is empty string but can be set to an array such as "a,e" such that single character inputTranscript uses the Connect Error branch in Get customer input.

### Changed

- Display Kendra document names as the URL and add ability to generate Signed S3 URLs for Kendra document integration. Uses new setting named ALT_SEARCH_KENDRA_S3_SIGNED_URLS. Set this to true to convert Kendra based S3 document URLs to signed urls allowing access.
- Expose session attributes in the res object as an object such that they are usable in Kibana UI.

### Fixed

- Fix to ensure a "Test" invocation, when using a topic, always uses Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) to perform the query.

## [4.2.2] - 2020-08-28

### Fixed

- Fix KendraFallback Lambda Function lodash dependency

## [4.2.1] - 2020-08-25

### Changed

- Return Error if Lex inputTranscript is an empty string or not present. Processing an empty inputTranscript produces other downstream failure.

## [4.2.0] - 2020-08-24

### Added

- New Kendra FAQ support (Beta version) using the setting KENDRA_FAQ_INDEX. New menu item in Designer UI to export Questions as a Kendra FAQ. See revised Blog Post for details.
- New GetSessionAttribute Handlebars helper to obtain session attribute. Works similar to lodash get(). Will not through exception and will return a default value.

### Changed

- Enhanced handlebars to support string concatenation including handlevar 'variables' like Session Attributes and UserInfo, etc. Use case, e.g. to build a url containing a users email, eg a google calendar URL. Example of syntax now supported - in this case to dynamically build a personalized URL based on user info. `{{setSessionAttr 'link' 'https://calendar.google.com/calendar/embed?src=' UserInfo.Email '&ctz=America%2FNew_York'}}`
- Moved 'previous' and 'navigation' session attributes under a new 'qnabotcontext' session attribute so that Connect (and other) clients have fewer session attributes to preserve.
- Allows Chaining rule Lambda function to return a modified session object in addition to the string for chaining.
- Allows Chaining of up to 10 documents. Each document's Lambda hooks will also be invoked in sequence if defined.
- Added a new Repeat QID in the QNAUtility example package. Allows QnABot to easily repeat the last answer.
- Allow the chaining rule to specify a specific QID rather than an answer. A QID can be specified in the chaining rule by using string such as QID::<qid> e.g. QID::Admin.001. Note, the new QID::<qid> syntax can also be used from the webUI, say as button values if/when you prefer to target a specific QID (exact query) rather than rely on question matching.
- Upgrades to and installs Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) 7.7.

### Fixed

- Fixed a defect to allow conditional chaining to be invoked after an elicit response bot failure.

## [4.1.0] - 2020-08-02

### Changed

- Install / Upgrade now supports the option to configure S3 Buckets and Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) cluster using encryption at rest
- Install / Upgrade now supports the option to require Cognito based user authorization to access the built-in full screen web UI (Public/Private parameter in template) - Public is the default
- Enhanced Kendra fallback integration to use a specific answer if there is a best answer available and bold face highlighted words from Kendra response
- Enhanced Kibana dashboard to identify Lex client channels - Connect, Web, SMS
- Improved internal use of Booleans from settings configuration.
- Update to 0.17.0 of embedded lex-web-ui
- Enhanced Connect integration
  - Added session attribute named "qnabot_qid" that holds the matching question id found in Amazon Elasticsearch Service
  - Added session attribute "qnabot_gotanswer" that holds boolean true/fale if an answer was fround
  - Encapsulating all Kendra and Elicit Response Bot session attributes into a single "qnabotcontext" attribute making it easier to store and reset in Connect contact flow

### Added

- Added two settings parameters to enforce user identity verification check, so that bot can be secured for use by authenticated users only
  - ENFORCE_VERIFIED_IDENTITY. Default is false. Set to true to make QnABot require verified identity from client
  - NO_VERIFIED_IDENTITY_QUESTION. The default is "no_verified_identity". If user identity cannot be verified, replace question string with this. If not verified, the system will respond to user's question with the result of searching for NO_VERIFIED_IDENTITY_QUESTION. This allows a customizable message which informs the user that they must log in. A default question with qid "no_verified_identity" is included in QNAUtility example package.
- Added Comprehend sentiment analysis to all utterances and text captured by the QNAFreeText elicit response bot
- Added new QNAYesNoExit elicit response bot which allows a user to exit the YesNoExit question using "exit", "bye", "quit", "admin", "rep","representative","stop", "help", "bye", "goodbye" which sets the Yes_No_Exit slot value / session attribute to "Exit".

### Fixed

- Resolved additional dependabot identified security issues with dependent packages
- Fixed lambda/fulfillment unit tests
- Fixed defect where response bot was not triggered on next question when using lambda function for conditional chaining

## [4.0.0] - 2020-06-04

### Changed

- Update to Amazon Elasticsearch Service (succeeded by Amazon OpenSearch Service) 7.4
- Update to 0.16.0 of embedded lex-web-ui
- npm audit package updates
- Improved question matching accuracy and tuning
- Tolerance for typos and minor spelling errors with fuzzy matching setting
- Easier troubleshooting when using voice or multi-language support with new debug setting
- SSML support when using Amazon Connect
- Full upgrade support without data loss when upgrading from previous versions
- Disable response card titles in embedded lex-web-ui

### Added

- Added region launch links to README

### Fixed

- Fix to CustomNoHits to use configured setting
- Fixes and improvements to Amazon Kendra integration, support FAQ answers
- Fix to redacting feature with respect to kibana metrics
- Fix to language responses in Language extension. Added mapping of 'Chinese' to use 'Simplified Chinese'

## [3.0.3] - 2020-04-26

### Changed

- Enhanced CFN lex create/update to identify and use versions of the Bot externally created

### Added

- Added content tuning Readme

## [3.0.2] - 2020-04-22

### Changed

- Improved scale using Lex versions and aliases
- Elicit Response Bots allowing QnABot to ask its own questions
- Conditional chaining to jump to other items based on user answers

### Added

- New Connect Callback example bot and questions
- New launch regions to install QnABot in eu-west-1, ap-southeast-2, us-west-2
- Editable settings

## [2.6.0] - 2019-12-31

### Changed

- Update handlebars in extensions / samples to use version ^4.3.0

### Added

- Addition of Kendra Fallback feature

### Fixed

- Fix for the Next/Previous sample functions when the next or previous questions reference a lambda hook

## [2.5.0] - 2019-11-26

### Changed

- IAM Policy updates
- Update of default utterances for Alexa
- Change to NodeJS 10.X for Lambdas
- Updated reInvent2019 workshop

## [2.4.0] - 2019-10-16

### Added

- added use of SSM Parameter store to hold default configuration settings
- added use of use of Comprehend for better selection of appropriate answer
- added use of AMAZON.Fallback intent
- added QnABot version number to cloudformation stack description
- added newline to separate records injected to firehose

### Changed

- Updated lex-web-ui to 0.14.8
- support for Test All functionality
- separated import and export functionality into nested stacks freeing up ability to add resources to master stack
- updates to npm module versions
- improved accuracy by adding use of AWS Comprehend to identify nouns and verbs to confirm in identified question whose answer is being returned

### Fixed

- fix for alexa repeat intent
- fix for better handling of tab navigation between questions and test tab

## [2.3.0] - 2019-05-01

### Changed

- upgraded to nodejs 8.10

## [2.1.0] - 2018-05-31

### Fixed

- issue in stack name namespacing with different profiles

### Added

- support for html, markdown, and SSML alternate answers
- quiz document type and lambda hook
- feedback example lambda hook
- navigation example lambda hook
- kibana integration in designer ui
- examples are in a nested template
- support for IE11 and Edge for client page

## [2.0.1] - 2018-05-31

### Fixed

- serviceCreateRole issue in CNFLambda when creating lex bots

## [2.0.0] - 2018-05-04

### Fixed

- QnABot is now a single template

### Added

- new ui based on vuetify
- topic memory
- lambda hooks
- more integration tests
- Cognito Hosted Login for Admin Screen
- Improved Importing
- Backups to s3
- Better deployment scripts using namespaces and AWS CLI Profiles.

### Removed

- link parsing
- cloudfront distributions

## [1.1.0] - 2018-01-05

### Fixed

- spelling in documentation
- small bugs

## [1.0.0] - 2017-11-06

### Added

- initial
