######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#  SPDX-License-Identifier: Apache-2.0                                                                               #
######################################################################################################################
import base64
import json
import os
import random
import string
import uuid
import boto3
from botocore.config import Config

BOTO3_CONFIG = Config(connect_timeout=5, read_timeout=30)

AMAZONQ_APP_ID = os.environ.get("AMAZONQ_APP_ID")
AMAZONQ_REGION = os.environ.get("AMAZONQ_REGION") or os.environ["AWS_REGION"]
AMAZONQ_ENDPOINT_URL = os.environ.get("AMAZONQ_ENDPOINT_URL") or f'https://qbusiness.{AMAZONQ_REGION}.api.aws'
print("AMAZONQ_ENDPOINT_URL:", AMAZONQ_ENDPOINT_URL)


def get_amazonq_response(prompt, context, attachments, qbusiness_client):
    print(f"get_amazonq_response: prompt={prompt}, app_id={AMAZONQ_APP_ID}, context={context}")
    input_prompt = {
        "applicationId": AMAZONQ_APP_ID,
        "userMessage": prompt
    }
    if context:
        if context["conversationId"]:
            input_prompt["conversationId"] = context["conversationId"]
        if context["parentMessageId"]:
            input_prompt["parentMessageId"] = context["parentMessageId"]
    else:
        input_prompt["clientToken"] = str(uuid.uuid4())

    if attachments:
        input_prompt["attachments"] = attachments

    print("Amazon Q Input: ", input_prompt)
    try:
        resp = qbusiness_client.chat_sync(**input_prompt)
    except Exception as e:
        print("Amazon Q Exception: ", e)
        resp = {
            "systemMessage": "Amazon Q Error: " + str(e)
        }
    print("Amazon Q Response: ", json.dumps(resp, default=str))
    return resp


def get_settings_from_lambdahook_args(event):
    lambdahook_settings = {}
    lambdahook_args_list = event["res"]["result"].get("args", [])
    print("LambdaHook args: ", lambdahook_args_list)
    if len(lambdahook_args_list):
        try:
            lambdahook_settings = json.loads(lambdahook_args_list[0])
        except Exception as e:
            print(f"Failed to parse JSON:", lambdahook_args_list[0], e)
            print("..continuing")
    return lambdahook_settings


def get_args_from_lambdahook_args(event):
    parameters = {}
    lambdahook_args_list = event["res"]["result"].get("args", [])
    print("LambdaHook args: ", lambdahook_args_list)
    if len(lambdahook_args_list):
        try:
            parameters = json.loads(lambdahook_args_list[0])
        except Exception as e:
            print(f"Failed to parse JSON:", lambdahook_args_list[0], e)
            print("..continuing")
    return parameters


def get_s3_file(s3_path, verified_identity_id):
    if s3_path.startswith("s3://"):
        s3_path = s3_path[5:]
    bucket, key = s3_path.split("/", 1)
    # Only allow reading files under the caller's Cognito-verified Identity ID.
    if not verified_identity_id or not (key == verified_identity_id or key.startswith(f"{verified_identity_id}/")):
        print(f"get_s3_file: rejecting s3_path not scoped to caller's verified "
              f"identity ({verified_identity_id!r}): {bucket}/{key}")
        return None
    s3 = boto3.resource('s3', config=BOTO3_CONFIG)
    obj = s3.Object(bucket, key)
    return obj.get()['Body'].read()


COGNITO_IDENTITY_REGION = os.environ.get("COGNITO_IDENTITY_REGION") or AMAZONQ_REGION
COGNITO_IDENTITY_CLIENT = boto3.client('cognito-identity', region_name=COGNITO_IDENTITY_REGION, config=BOTO3_CONFIG)

# Caches the discovered Identity Pool ID per login provider across warm
# Lambda invocations, so discovery only runs once per cold start.
_IDENTITY_POOL_ID_CACHE = {}


def get_user_pool_login_provider(idtokenjwt):
    """Derives the Cognito `Logins` provider key (e.g.
    "cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX") from the
    token's own `iss` claim, avoiding a separate CognitoUserPoolId setting.
    The token's issuer is already verified upstream, so trusting `iss`
    here adds no new unverified input.
    """
    decoded = json.loads(base64.urlsafe_b64decode(idtokenjwt.split('.')[1] + '==').decode())
    iss = decoded.get("iss", "")
    return iss.split("://", 1)[-1]


def discover_identity_pool_id(login_provider, cognito_identity_client):
    """Finds the Identity Pool that trusts the given User Pool login
    provider, avoiding a separate CognitoIdentityPoolId setting. There's
    no direct Cognito API for this reverse lookup, so it scans every
    Identity Pool in the account/region for a matching provider, caching
    the result (see _IDENTITY_POOL_ID_CACHE).

    Returns None if no pool trusts this User Pool.
    """
    if login_provider in _IDENTITY_POOL_ID_CACHE:
        return _IDENTITY_POOL_ID_CACHE[login_provider]
    paginator = cognito_identity_client.get_paginator("list_identity_pools")
    for page in paginator.paginate(MaxResults=60):
        for pool in page.get("IdentityPools", []):
            pool_id = pool["IdentityPoolId"]
            detail = cognito_identity_client.describe_identity_pool(IdentityPoolId=pool_id)
            providers = detail.get("CognitoIdentityProviders", [])
            if any(p.get("ProviderName") == login_provider for p in providers):
                _IDENTITY_POOL_ID_CACHE[login_provider] = pool_id
                return pool_id
    print(f"discover_identity_pool_id: no Identity Pool found trusting provider {login_provider!r}")
    # Do not cache negative results, so a later-created pool or a transient
    # list_identity_pools failure can be re-discovered on the next request.
    return None


def verify_identity_matches_cognito(claimed_session_id, idtokenjwt, cognito_identity_client):
    """Verifies claimed_session_id is genuinely the caller's Cognito
    Identity ID by asking cognito-identity:GetId to recompute it from
    this request's verified token, and comparing the two.

    This is stateless and authoritative on every request, including the
    first -- unlike an earlier DynamoDB-binding design (see git history)
    that trusted an unclaimed session_id on its first use.

    Returns True if claimed_session_id matches; False otherwise (reject).
    """
    if not claimed_session_id:
        return False
    try:
        login_provider = get_user_pool_login_provider(idtokenjwt)
        if not login_provider:
            print("verify_identity_matches_cognito: could not derive login provider "
                  "from idtokenjwt's iss claim -- rejecting (fail closed)")
            return False
        identity_pool_id = discover_identity_pool_id(login_provider, cognito_identity_client)
        if not identity_pool_id:
            print("verify_identity_matches_cognito: no Identity Pool discovered for "
                  f"{login_provider!r} -- rejecting (fail closed)")
            return False
        response = cognito_identity_client.get_id(
            IdentityPoolId=identity_pool_id,
            Logins={login_provider: idtokenjwt},
        )
    except Exception as e:
        # Fail closed on any error -- malformed/non-JWT token, Cognito
        # throttling, transient failure, etc. A security check that fails
        # open on error is not a security check.
        print(f"verify_identity_matches_cognito: verification failed: {e}")
        return False
    actual_identity_id = response.get("IdentityId")
    if actual_identity_id != claimed_session_id:
        print(f"verify_identity_matches_cognito: rejecting -- claimed session_id "
              f"{claimed_session_id!r} does not match the Identity ID Cognito computed "
              f"for this request's verified token ({actual_identity_id!r})")
        return False
    return True


def get_attachments(event, idtokenjwt, cognito_identity_client):
    session_id = event["req"].get("_event", {}).get("sessionId")
    if not verify_identity_matches_cognito(session_id, idtokenjwt, cognito_identity_client):
        event["res"]["session"].pop("userFilesUploaded", None)
        return []
    user_files_uploaded = event["req"]["session"].get("userFilesUploaded", [])
    attachments = []
    for user_file in user_files_uploaded:
        print(f"getAttachments: userFile={user_file}")
        try:
            data = get_s3_file(user_file.get("s3Path"), session_id)
        except Exception as e:
            print(f"get_s3_file: failed to read {user_file.get('s3Path')}: {e}")
            data = None
        if data is None:
            continue
        attachments.append({
            "data": data,
            "name": user_file["fileName"]
        })
    # delete userFilesUploaded from session
    event["res"]["session"].pop("userFilesUploaded", None)
    return attachments


def format_response(event, amazonq_response):
    # get settings, if any, from lambda hook args
    # e.g: {"Prefix":"<custom prefix heading>", "ShowContext": False}
    lambdahook_settings = get_settings_from_lambdahook_args(event)
    prefix = lambdahook_settings.get("Prefix", "Amazon Q Answer:")
    show_context_text = lambdahook_settings.get("ShowContextText", True)
    show_source_links = lambdahook_settings.get("ShowSourceLinks", True)
    # set plaintext, markdown, & ssml response
    if prefix in ["None", "N/A", "Empty"]:
        prefix = None
    plainttext = amazonq_response["systemMessage"]
    markdown = amazonq_response["systemMessage"]
    ssml = amazonq_response["systemMessage"]
    if prefix:
        plainttext = f"{prefix}\n\n{plainttext}"
        markdown = f"**{prefix}**\n\n{markdown}"
    if show_context_text:
        format_show_context(amazonq_response)
    if show_source_links:
        format_show_source_links(amazonq_response)

    # add plaintext, markdown, and ssml fields to event.res
    event["res"]["message"] = plainttext
    event["res"]["session"]["appContext"] = {
        "altMessages": {
            "markdown": markdown,
            "ssml": ssml
        }
    }
    # preserve conversation context in session
    amazonq_context = {
        "conversationId": amazonq_response.get("conversationId"),
        "parentMessageId": amazonq_response.get("systemMessageId")
    }
    event["res"]["session"]["qnabotcontext"]["amazonq_context"] = amazonq_context
    # TODO - can we determine when Amazon Q has a good answer or not?
    # For now, always assume it's a good answer.
    # QnAbot sets session attribute qnabot_gotanswer True when got_hits > 0
    event["res"]["got_hits"] = 1
    return event

def format_show_context(amazonq_response):
    context_text = ""
    for source in amazonq_response.get("sourceAttributions", []):
        title = source.get("title", "title missing")
        snippet = source.get("snippet", "snippet missing")
        url = source.get("url")
        if url:
            context_text = f'{context_text}<br><a href="{url}">{title}</a>'
        else:
            context_text = f'{context_text}<br><u><b>{title}</b></u>'
        # Returning too large of a snippet can break QnABot by exceeding the event payload size limit
        context_text = f"{context_text}<br>{snippet}\n"[:5000]
    if context_text:
        markdown = f'{markdown}\n<details><summary>Context</summary><p style="white-space: pre-line;">{context_text}</p></details>'

def format_show_source_links(amazonq_response):
    source_links = []
    for source in amazonq_response.get("sourceAttribution", []):
        title = source.get("title", "link (no title)")
        url = source.get("url")
        if url:
            source_links.append(f'<a href="{url}">{title}</a>')
    if len(source_links):
        markdown = f'{markdown}<br>Sources: ' + ", ".join(source_links)

def get_idc_iam_credentials(jwt):
    sso_oidc_client = boto3.client('sso-oidc', config=BOTO3_CONFIG)
    idc_sso_resp = sso_oidc_client.create_token_with_iam(
        clientId=os.environ.get("IDC_CLIENT_ID"),
        grantType="urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion=jwt,
    )

    print(idc_sso_resp)
    idc_sso_id_token_jwt = json.loads(base64.b64decode(idc_sso_resp['idToken'].split('.')[1] + '==').decode())

    sts_context = idc_sso_id_token_jwt["sts:identity_context"]
    sts_client = boto3.client('sts', config=BOTO3_CONFIG)
    session_name = "qbusiness-idc-" + "".join(
        random.choices(string.ascii_letters + string.digits, k=32) # NOSONAR
    )
    assumed_role_object = sts_client.assume_role(
        RoleArn=os.environ.get("AMAZONQ_ROLE_ARN"),
        RoleSessionName=session_name,
        ProvidedContexts=[{
            "ProviderArn": "arn:aws:iam::aws:contextProvider/IdentityCenter",
            "ContextAssertion": sts_context
        }]
    )
    creds_object = assumed_role_object['Credentials']

    return creds_object


def lambda_handler(event, context): # NOSONAR Lambda Handler
    print("Received event: %s" % json.dumps(event))
    args = get_args_from_lambdahook_args(event) # NOSONAR args for Lambda Handler
    # llm_generated_query is only set when LLM_GENERATE_QUERY_ENABLE is on;
    # fall back to req.question, matching llm.js's own fallback.
    user_input = event["req"].get("llm_generated_query", {}).get("orig") or event["req"]["question"]
    qnabotcontext = event["req"]["session"].get("qnabotcontext", {})
    amazonq_context = qnabotcontext.get("amazonq_context", {})

    # Get the IDC IAM credentials
    # idtokenjwt is absent for unauthenticated Lex Web UI sessions.
    token = event["req"]["session"].get("idtokenjwt")
    if not token:
        print("lambda_handler: no idtokenjwt in session")
        event["res"]["message"] = "This feature requires you to be signed in."
        event["res"]["got_hits"] = 0
        return event
    decoded_token = json.loads(base64.b64decode(token.split('.')[1] + '==').decode())
    jti = decoded_token['jti']

    dynamo_resource = boto3.resource('dynamodb', config=BOTO3_CONFIG)
    dynamo_table = dynamo_resource.Table(os.environ.get('DYNAMODB_CACHE_TABLE_NAME'))

    kms_client = boto3.client('kms', config=BOTO3_CONFIG)
    kms_key_id = os.environ.get("KMS_KEY_ID")

    # Check if JTI exists in caching DB
    response = dynamo_table.get_item(Key={'jti': jti})

    if 'Item' in response:
        creds = json.loads((kms_client.decrypt(
            KeyId=kms_key_id,
            CiphertextBlob=response['Item']['Credentials'].value))['Plaintext'])
    else:
        creds = get_idc_iam_credentials(token)
        exp = creds['Expiration'].timestamp()
        creds.pop('Expiration')
        # Encrypt the credentials and store them in the caching DB
        encrypted_creds = \
            kms_client.encrypt(KeyId=kms_key_id,
                               Plaintext=bytes(json.dumps(creds).encode()))['CiphertextBlob']
        dynamo_table.put_item(Item={'jti': jti, 'ExpiresAt': int(exp), 'Credentials': encrypted_creds})

    # get_attachments() verifies the caller's claimed session_id against
    # Cognito via cognito-identity:GetId -- see verify_identity_matches_cognito().
    attachments = get_attachments(event, token, COGNITO_IDENTITY_CLIENT)

    # Assume the qbusiness role with the IDC IAM credentials to create the qbusiness client
    assumed_session = boto3.Session(
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken']
    )

    qbusiness_client = assumed_session.client("qbusiness", config=BOTO3_CONFIG)
    amazonq_response = get_amazonq_response(user_input, amazonq_context, attachments, qbusiness_client)
    event = format_response(event, amazonq_response)
    print("Returning response: %s" % json.dumps(event))
    return event
