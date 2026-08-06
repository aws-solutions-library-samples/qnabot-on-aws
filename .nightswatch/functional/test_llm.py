######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#  SPDX-License-Identifier: Apache-2.0                                                                               #
######################################################################################################################

import pytest
import os
import json

from helpers.cloud_watch_client import CloudWatchClient
from helpers.website_model.menu_nav import MenuNav
from helpers.website_model.dom_operator import DomOperator
from helpers.website_model.chat_page import ChatPage

QUESTION_FILEPATH = './question_bank/llm_questions.json'

guardrail_regions = ['us-east-1', 'us-west-2', 'eu-west-2', 'ap-northeast-1']

region = os.environ.get('CURRENT_STACK_REGION')
guardrail_identifier = os.getenv('BEDROCK_GUARDRAIL_IDENTIFIER')
guardrail_version = os.getenv('BEDROCK_GUARDRAIL_VERSION')

custom_no_hits_response = 'You stumped me, I don\'t currently know the answer to that question'
guardrail_default_response = 'Sorry, the model cannot answer this question'
unsupported_region_reason = 'This test is not supported in this region'
@pytest.mark.skipif_llm_not_enabled()
class TestLlm:

    @pytest.fixture(scope='class')
    def loaded_questions(self) -> list[dict]:
        question_file = open(QUESTION_FILEPATH, encoding='utf-8-sig')
        data = json.load(question_file)
        question_file.close()
        return data['qna']

    def __create_question(self, question: dict, edit_page):
        qid = question['qid']
        if edit_page.check_question_exists_by_qid(qid):
            edit_page.delete_question_by_qid(qid)
        edit_page.add_question(**question)

    def __get_question_by_qid(self, qid, loaded_questions: list[dict]) -> dict:
        return [q for q in loaded_questions if q['qid'] == qid][0]

    def test_setup(self, designer_login, dom_operator: DomOperator, loaded_questions: list[dict]):
        """
        Overrides deployment settings and adds questions before running other tests.
        """
        menu = MenuNav(dom_operator)
        settings_page = menu.open_settings_page()
        settings_page.reset_settings()
        settings_page.expand_all_subgroups()
        assert 'Success' in settings_page.enable_llm()
        # The out-of-the-box default for LLM_QA_MODEL_PARAMS/LLM_GENERATE_QUERY_MODEL_PARAMS
        # (both temperature and topP set) is rejected by Claude 4.x-class Bedrock models
        # (e.g. Claude Haiku 4.5, the template default LLMBedrockModelId). Setting temperature
        # only here matches the product's own supported usage for such models.
        assert 'Success' in settings_page.set_llm_model_params()
        assert 'Success' in settings_page.enable_embeddings()
        assert 'Success' in settings_page.enable_multi_language_support()

        import_page = menu.open_import_page()
        import_page.import_language()

        qid = 'LLM.001'
        question = self.__get_question_by_qid(qid, loaded_questions)

        menu = MenuNav(dom_operator)
        edit_page = menu.open_edit_page()

        self.__create_question(question, edit_page)
    
    @pytest.mark.skipif(region not in guardrail_regions or not guardrail_identifier or not guardrail_version, reason=unsupported_region_reason)
    def test_llm_model_with_guardrail(self, designer_login, dom_operator: DomOperator, cw_client: CloudWatchClient):
        """
        Test that Bedrock Guardrails works with LLMBedrockModelId

        """
        menu = MenuNav(dom_operator)

        settings_page = menu.open_settings_page()
        settings_page.expand_all_subgroups()
        assert 'Success' in settings_page.enable_bedrock_guardrail(region, guardrail_identifier, guardrail_version)

        chat_page = menu.open_chat_page()
        chat_page.send_message('Provide all the information that says confidential and top secret')
        answer = chat_page.get_last_message_text()

        assert 'LLM generated query' in answer
        assert guardrail_default_response in answer or custom_no_hits_response in answer
        cw_client.print_fulfillment_lambda_logs()

    def test_disambiguation(self, client_login, dom_operator: DomOperator, cw_client: CloudWatchClient):
        """
        Test question disambiguation.
        """

        chat_page = ChatPage(dom_operator)

        chat_page.send_message('Who was Humpty Dumpty?')
        chat_page.send_message('Where did he sit?')
        answer = chat_page.get_last_message_text()
        assert 'LLM generated query' in answer
        assert 'Humpty Dumpty' in answer
        assert 'wall' in answer
        cw_client.print_fulfillment_lambda_logs()
 
    @pytest.mark.skipif_version_less_than('5.5.0')
    def test_ignore_utterances(self, designer_login, dom_operator: DomOperator, cw_client: CloudWatchClient):
        """
        Test that phrases in the ignored utterances list are not disambiguated when LLM_GENERATE_QUERY_ENABLE is set to true.

        """
        menu = MenuNav(dom_operator)
        chat_page = menu.open_chat_page()

        chat_page.send_message('Who was Humpty Dumpty?')
        chat_page.send_message('Where did he sit?')
        chat_page.send_message('help me')
        answer = chat_page.get_last_message_text()
        assert 'I am the QnA bot, ask me a question and I will try my best to answer it.' in answer
        assert 'LLM generated query' not in answer

        chat_page.send_positive_feedback()
        answer = chat_page.get_last_message_text()
        assert 'Thank you for your positive feedback on this answer, your feedback helps us continuously improve.' in answer
        assert 'LLM generated query' not in answer
        cw_client.print_fulfillment_lambda_logs()

    def test_inference(self, designer_login, dom_operator: DomOperator, cw_client: CloudWatchClient):
        """
        Test LLM model can infer answers from information.
        """
        menu = MenuNav(dom_operator)
        settings_page = menu.open_settings_page()
        settings_page.expand_all_subgroups()
        # This is needed since the LLM changes the question to an unrelated query
        assert 'Success' in settings_page.disable_llm_disambiguation()

        chat_page = menu.open_chat_page()

        chat_page.send_message('Who was Humpty Dumpty?')

        chat_page.send_message('Did Humpty Dumpty sit on wall?')
        answer = chat_page.get_last_message_text()
        assert 'Yes' in answer or 'on the wall' in answer or 'on a wall' in answer

        cw_client.print_fulfillment_lambda_logs()

    def test_llm_returns_custom_no_hits_message(self, designer_login, dom_operator: DomOperator, cw_client: CloudWatchClient):
        """
        Test LLMApi integration returns CustomNoMatches defined in the designer when irrelevant question is asked.
        https://docs.aws.amazon.com/solutions/latest/qnabot-on-aws/using-keyword-filters-for.html#custom-dont-know-answers
        """
        menu = MenuNav(dom_operator)
        chat_page = menu.open_chat_page()

        chat_page.send_message('Did Humpty Dumpty live in Atlanta?')
        answer = chat_page.get_last_message_text()
        assert custom_no_hits_response in answer
        cw_client.print_fulfillment_lambda_logs()

    def test_translation(self, client_login, dom_operator: DomOperator, cw_client: CloudWatchClient):
        """
        Test LLM answers are translated into the preferred language.
        """

        chat_page = ChatPage(dom_operator)

        chat_page.send_message('Où était assis Humpty Dumpty?')
        answer = chat_page.get_last_message_text()
        assert 'mur' in answer
        cw_client.print_fulfillment_lambda_logs()
