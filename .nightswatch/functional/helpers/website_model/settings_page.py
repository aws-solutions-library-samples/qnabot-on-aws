######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#  SPDX-License-Identifier: Apache-2.0                                                                               #
######################################################################################################################

import time
import os
import selenium

from helpers.utils.textbox import Textbox
from helpers.website_model.dom_operator import DomOperator

EMPTY_MESSAGE_ID = 'EMPTYMESSAGE'
MULTI_LANGUAGE_SUPPORT_ID = 'ENABLE_MULTI_LANGUAGE_SUPPORT'
ENABLE_KENDRA_ID = 'ENABLE_KENDRA_WEB_INDEXER'
ENABLE_KENDRA_FALLBACK_ID = 'KENDRA_FAQ_ES_FALLBACK'
KENDRA_INDEX_ID = 'KENDRA_INDEXER_URLS'
ENABLE_EMBEDDINGS_ID = 'EMBEDDINGS_ENABLE'
EMBEDDINGS_SCORE_THRESHOLD_ID = 'EMBEDDINGS_SCORE_THRESHOLD'
EMBEDDINGS_SCORE_ANSWER_THRESHOLD_ID = 'EMBEDDINGS_SCORE_ANSWER_THRESHOLD'
EMBEDDINGS_TEXT_PASSAGE_SCORE_THRESHOLD_ID = 'EMBEDDINGS_TEXT_PASSAGE_SCORE_THRESHOLD'
ENABLE_CUSTOM_TERMINOLOGY_ID = 'ENABLE_CUSTOM_TERMINOLOGY'
ENABLE_FILTER_ID = 'ES_USE_KEYWORD_FILTERS'
FILTER_CRITERIA_ID = 'ES_MINIMUM_SHOULD_MATCH'
KENDRA_INDEXER_CRAWL_DEPTH_ID = 'KENDRA_INDEXER_CRAWL_DEPTH'
KENDRA_INDEXER_MODE_ID = 'KENDRA_INDEXER_CRAWL_MODE'
KENDRA_INDEXER_SCHEDULE_ID = 'KENDRA_INDEXER_SCHEDULE'
KENDRA_MAX_DOCUMENT_COUNT = 'ALT_SEARCH_KENDRA_MAX_DOCUMENT_COUNT'

ENABLE_DEBUG_RESPONSES_ID = 'ENABLE_DEBUG_RESPONSES'
ES_SCORE_TEXT_ITEM_PASSAGES_ID = 'ES_SCORE_TEXT_ITEM_PASSAGES'
LLM_GENERATE_QUERY_ENABLE_ID = 'LLM_GENERATE_QUERY_ENABLE'
LLM_QA_ENABLE_ID = 'LLM_QA_ENABLE'
LLM_QA_USE_KENDRA_RETRIEVAL_API_ID = 'LLM_QA_USE_KENDRA_RETRIEVAL_API'
LLM_QA_SHOW_CONTEXT_TEXT_ID = 'LLM_QA_SHOW_CONTEXT_TEXT'
LLM_QA_SHOW_SOURCE_LINKS_ID = 'LLM_QA_SHOW_SOURCE_LINKS'

PRE_PROCESSING_LAMBDA_ID = 'LAMBDA_PREPROCESS_HOOK'
POST_PROCESSING_LAMBDA_ID = 'LAMBDA_POSTPROCESS_HOOK'
FALLBACK_ORDER_ID = 'FALLBACK_ORDER'

SAVE_XPATH = "//button[span='Save']"
RESET_XPATH = "//button[span='Reset to defaults']"
SAVE_STATUS_CSS = '#error-modal'
SAVE_MODAL_CLOSE_XPATH = "//button[span='close']"

CHATBOT_TESTING_SUBGROUP_ID = 'chatbot_testing_subgroup'
LANGUAGE_IDENTIFICATION_SUBGROUP_ID = 'language_identification_subgroup'
OPEN_SEARCH_SUBGROUP_ID = 'opensearch_subgroup'
SECURITY_AND_PRIVACY_SUBGROUP_ID = 'security_and_privacy_subgroup'
QUERY_MATCHING_SUBGROUP_ID = 'query_matching_subgroup'
AMAZON_LEX_SUBGROUP_ID = 'amazon_lex_subgroup'
ADVANCED_SUBGROUP_ID = 'advanced_subgroup'
AMAZON_CONNECT_SUBGROUP_ID = 'amazon_connect_subgroup'
AMAZON_ALEXA_SUBGROUP_ID = 'amazon_alexa_subgroup'
AMAZON_KENDRA_SUBGROUP_ID = 'amazon_kendra_subgroup'
TEXT_GENERATION_GENERAL_SUBGROUP_ID = 'text_generation_general_subgroup'
AMAZON_BEDROCK_KNOWLEDGE_BASES_SUBGROUP_ID = 'amazon_bedrock_knowledge_bases_subgroup'

KNOWLEDGE_BASE_SEARCH_TYPE_ID = 'KNOWLEDGE_BASE_SEARCH_TYPE'
KNOWLEDGE_BASE_MAX_NUMBER_OF_RETRIEVED_RESULTS_ID = 'KNOWLEDGE_BASE_MAX_NUMBER_OF_RETRIEVED_RESULTS'
KNOWLEDGE_BASE_MODEL_PARAMS_ID = 'KNOWLEDGE_BASE_MODEL_PARAMS'
KNOWLEDGE_BASE_PROMPT_TEMPLATE_ID = 'KNOWLEDGE_BASE_PROMPT_TEMPLATE'

BEDROCK_GUARDRAIL_IDENTIFIER_ID = 'BEDROCK_GUARDRAIL_IDENTIFIER'
BEDROCK_GUARDRAIL_VERSION_ID = 'BEDROCK_GUARDRAIL_VERSION'
BEDROCK_GUARDRAIL_SUBGROUP_ID = 'text_generation_guardrail_subgroup'

PREPROCESS_GUARDRAIL_IDENTIFIER_ID = 'PREPROCESS_GUARDRAIL_IDENTIFIER'
PREPROCESS_GUARDRAIL_VERSION_ID = 'PREPROCESS_GUARDRAIL_VERSION'

POSTPROCESS_GUARDRAIL_IDENTIFIER_ID = 'POSTPROCESS_GUARDRAIL_IDENTIFIER'
POSTPROCESS_GUARDRAIL_VERSION_ID = 'POSTPROCESS_GUARDRAIL_VERSION'

class SettingsPage:
    """
    Class representing a Settings Page.

    This class provides methods to interact with and manipulate the settings of Q&A bot.

    Attributes:
        operator (DomOperator): An instance of DomOperator to manipulate and interact with the DOM.
    """

    def __init__(self, operator: DomOperator) -> None:
        """
        Initializes the SettingsPage with a DomOperator instance.

        Args:
            operator (DomOperator): An instance of DomOperator to manipulate and interact with the DOM.
        """

        self.operator = operator

    def save_settings(self) -> str:
        """Saves the current settings and returns the status of the operation."""

        self.operator.select_xpath(SAVE_XPATH, click=True)
        self.operator.wait_for_element_by_xpath(SAVE_MODAL_CLOSE_XPATH)
        time.sleep(2)

        status = self.operator.select_css(SAVE_STATUS_CSS).text
        self.operator.select_xpath(SAVE_MODAL_CLOSE_XPATH, click=True)

        return status

    def reset_settings(self) -> str:
        """Resets the current settings."""

        self.operator.select_xpath(RESET_XPATH, click=True)
        time.sleep(1)

    def select_setting_by_label(self, label: str):
        """
        Selects a setting by its label.

        Args:
            label (str): The label of the setting to select.

        Returns:
            The selected WebElement.
        """

        return self.operator.select_id(label, click=False)
    
    def __set_element_value(self, element, value):
        """
        Private method to set the value of a WebElement.

        Args:
            element: The WebElement to update.
            value: The value to set in the WebElement.
        """

        textbox = Textbox(element)
        textbox.set_value(value)
    
    def __get_element_value(self, element) -> str:
        """
        Private method to get the value of a WebElement.

        Args:
            element: The WebElement to update.
        Returns:
            The value of the WebElement.
        """

        textbox = Textbox(element)
        return textbox.get_value()

    def customize_empty_message(self, message) -> str:
        """
        Customizes the empty message setting and saves the changes.

        Args:
            message (str): The new empty message.

        Returns:
            The status of the save operation.
        """

        customize_empty_message = self.operator.select_id(EMPTY_MESSAGE_ID)
        self.__set_element_value(customize_empty_message, message)
        return self.save_settings()
    
    def enable_debug_response(self) -> str:
        """
        Enables debug responses during the chat conversation and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_debug = self.operator.select_id(ENABLE_DEBUG_RESPONSES_ID)
        self.__set_element_value(enable_debug, 'true')
        return self.save_settings()
    

    def enable_multi_language_support(self) -> str:
        """
        Enables the multi-language support setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_multi_language_support = self.operator.select_id(MULTI_LANGUAGE_SUPPORT_ID)
        self.__set_element_value(enable_multi_language_support, 'true')
        return self.save_settings()

    def enable_kendra(self, indexer_url: str, depth: int=2, mode: str='subdomains', schedule: str='rate(1 day)', doc_count: str='10') -> str:
        """
        Enables the Kendra setting and configures Kendra parameters.

        Args:
            indexer_url (str): The URL of the indexer.
            depth (int, optional): The crawl depth. Defaults to 3.
            mode (str, optional): The indexing mode. Defaults to 'subdomains'.
            schedule (str, optional): The indexing schedule. Defaults to 'rate(1 day)'.
            doc_count (str, optional): The number of docs returned by Kendra. Defaults to '10'.

        Returns:
            The status of the save operation.
        """

        enable_kendra_web_indexer = self.operator.select_id(ENABLE_KENDRA_ID)
        self.__set_element_value(enable_kendra_web_indexer, 'true')

        update_kendra_indexer_urls = self.operator.select_id(KENDRA_INDEX_ID)
        self.__set_element_value(update_kendra_indexer_urls, indexer_url)

        update_kendra_indexer_crawl_depth = self.operator.select_id(KENDRA_INDEXER_CRAWL_DEPTH_ID)
        self.__set_element_value(update_kendra_indexer_crawl_depth, depth)

        update_kendra_indexer_mode = self.operator.select_id(KENDRA_INDEXER_MODE_ID)
        self.__set_element_value(update_kendra_indexer_mode, mode)

        update_kendra_indexer_schedule = self.operator.select_id(KENDRA_INDEXER_SCHEDULE_ID)
        self.__set_element_value(update_kendra_indexer_schedule, schedule)

        update_kendra_doc_count = self.operator.select_id(KENDRA_MAX_DOCUMENT_COUNT)
        self.__set_element_value(update_kendra_doc_count, doc_count)

        return self.save_settings()

    def enable_kendra_fallback(self) -> str:
        """
        Enables the Kendra fallback setting.

        Returns:
            The status of the save operation.
        """

        enable_kendra_web_indexer = self.operator.select_id(ENABLE_KENDRA_FALLBACK_ID)
        self.__set_element_value(enable_kendra_web_indexer, 'true')

        return self.save_settings()

    def disable_kendra_fallback(self) -> str:
        """
        Disables the Kendra fallback setting.

        Returns:
            The status of the save operation.
        """

        enable_kendra_web_indexer = self.operator.select_id(ENABLE_KENDRA_FALLBACK_ID)
        self.__set_element_value(enable_kendra_web_indexer, 'false')

        return self.save_settings()

    def enable_embeddings(self) -> str:
        """
        Enables the embeddings setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_embeddings = self.operator.select_id(ENABLE_EMBEDDINGS_ID)
        self.__set_element_value(enable_embeddings, 'true')

        return self.save_settings()

    def disable_embeddings(self) -> str:
        """
        Disables the embeddings setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        disable_embeddings = self.operator.select_id(ENABLE_EMBEDDINGS_ID)
        self.__set_element_value(disable_embeddings, 'false')
        return self.save_settings()

    def set_fallback_order(self, order: str) -> str:
        """
        Sets the FALLBACK_ORDER setting and saves the changes.

        Args:
            order: The fallback order value (e.g. 'OPENSEARCH_FIRST', 'KNOWLEDGEBASE-FIRST').

        Returns:
            The status of the save operation.
        """
        fallback_order = self.operator.select_id(FALLBACK_ORDER_ID)
        self.__set_element_value(fallback_order, order)
        return self.save_settings()

    def enable_llm(self) -> str:
        """
        Enables LLM setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_debug = self.operator.select_id(ENABLE_DEBUG_RESPONSES_ID)
        self.__set_element_value(enable_debug, 'true')

        enable_item_passages = self.operator.select_id(ES_SCORE_TEXT_ITEM_PASSAGES_ID)
        self.__set_element_value(enable_item_passages, 'true')

        enable_generative_query = self.operator.select_id(LLM_GENERATE_QUERY_ENABLE_ID)
        self.__set_element_value(enable_generative_query, 'true')

        enable_llm_qa = self.operator.select_id(LLM_QA_ENABLE_ID)
        self.__set_element_value(enable_llm_qa, 'true')

        enable_llm_kendra = self.operator.select_id(LLM_QA_USE_KENDRA_RETRIEVAL_API_ID)
        self.__set_element_value(enable_llm_kendra, 'true')

        enable_show_context_text = self.operator.select_id(LLM_QA_SHOW_CONTEXT_TEXT_ID)
        self.__set_element_value(enable_show_context_text, 'true')

        enable_source_links = self.operator.select_id(LLM_QA_SHOW_SOURCE_LINKS_ID)
        self.__set_element_value(enable_source_links, 'true')

        return self.save_settings()

    def disable_llm(self) -> str:
        """
        Disables LLM setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_item_passages = self.operator.select_id(ES_SCORE_TEXT_ITEM_PASSAGES_ID)
        self.__set_element_value(enable_item_passages, 'false')

        enable_generative_query = self.operator.select_id(LLM_GENERATE_QUERY_ENABLE_ID)
        self.__set_element_value(enable_generative_query, 'false')

        enable_llm_qa = self.operator.select_id(LLM_QA_ENABLE_ID)
        self.__set_element_value(enable_llm_qa, 'false')

        enable_llm_kendra = self.operator.select_id(LLM_QA_USE_KENDRA_RETRIEVAL_API_ID)
        self.__set_element_value(enable_llm_kendra, 'false')

        enable_show_context_text = self.operator.select_id(LLM_QA_SHOW_CONTEXT_TEXT_ID)
        self.__set_element_value(enable_show_context_text, 'false')

        enable_source_links = self.operator.select_id(LLM_QA_SHOW_SOURCE_LINKS_ID)
        self.__set_element_value(enable_source_links, 'false')

        return self.save_settings()

    def disable_llm_disambiguation(self):
        enable_generative_query = self.operator.select_id(LLM_GENERATE_QUERY_ENABLE_ID)
        self.__set_element_value(enable_generative_query, 'false')

        return self.save_settings()
    
    def enable_bedrock_guardrail(self, region, guardrail_identifier, guardrail_version, selector='bedrock'):
        """
        Enables the Bedrock guardrail for functional tests based on the nightswatch or local environment. 

        Args:
            region (str): The region for the guardrail.

        Returns:
            The status of the save operation.
        """

        mappings = {
            'us-east-1': ('6wptcgn6mi7x', 2),
            'us-west-2': ('nnbn5202wy5g', 2),
            'eu-west-2': ('jsj81qgv3ky5', 2),
            'ap-northeast-1': ('672yn8u1u3v5', 1),
            'ap-southeast-1': ('9svj21mhvizz', 1),
            'ap-southeast-2': ('8t3dz616x886', 1),
            'ca-central-1': ('vci2abppnly8', 1),
            'eu-central-1': ('kxzczv00h33w', 1),
        }

        if os.getenv('NIGHTSWATCH_TEST_DIR'):
            guardrail_identifier = mappings[region][0]
            guardrail_version = mappings[region][1]

        if not guardrail_identifier or not guardrail_version:
            return self.save_settings()
        
        valid_selectors = ['bedrock', 'preprocess', 'postprocess']
        
        if selector not in valid_selectors:
            raise ValueError(f"Invalid selector. Must be one of {valid_selectors}")
    
        selector_id = BEDROCK_GUARDRAIL_IDENTIFIER_ID
        selector_version_id = BEDROCK_GUARDRAIL_VERSION_ID
        
        if selector == 'preprocess':
            selector_id = PREPROCESS_GUARDRAIL_IDENTIFIER_ID
            selector_version_id = PREPROCESS_GUARDRAIL_VERSION_ID
        if selector == 'postprocess':
            selector_id = POSTPROCESS_GUARDRAIL_IDENTIFIER_ID
            selector_version_id = POSTPROCESS_GUARDRAIL_VERSION_ID
            
        get_guardrail_identifier = self.operator.select_id(selector_id)
        self.__set_element_value(get_guardrail_identifier, guardrail_identifier)

        get_guardrail_version = self.operator.select_id(selector_version_id)
        self.__set_element_value(get_guardrail_version, guardrail_version)

        return self.save_settings()

    def enable_custom_terminology(self) -> str:
        """
        Enables the custom terminology setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_custom_terminology = self.operator.select_id(ENABLE_CUSTOM_TERMINOLOGY_ID)
        self.__set_element_value(enable_custom_terminology, 'true')
        return self.save_settings()

    def enable_filter(self) -> str:
        """
        Enables the filter setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        enable_filter = self.operator.select_id(ENABLE_FILTER_ID)
        self.__set_element_value(enable_filter, 'true')
        return self.save_settings()

    def disable_filter(self) -> str:
        """
        Disables the filter setting and saves the changes.

        Returns:
            The status of the save operation.
        """

        disable_filter = self.operator.select_id(ENABLE_FILTER_ID)
        self.__set_element_value(disable_filter, 'false')
        return self.save_settings()

    def set_match_criteria(self, criteria: str) -> str:
        """
        Sets the match criteria setting and saves the changes.

        Args:
            criteria (str): The match criteria to set.

        Returns:
            The status of the save operation.
        """

        match_criteria = self.operator.select_id(FILTER_CRITERIA_ID)
        self.__set_element_value(match_criteria, criteria)
        return self.save_settings()

    def get_no_hits_response(self) -> str:
        """
        Returns the no hits response from the settings page.

        Returns:
            The no hits response from the settings page.
        """

        ho_hits = self.operator.select_id(EMPTY_MESSAGE_ID)
        return self.__get_element_value(ho_hits)

    def set_pre_processing_lambda(self, l: str) -> str:
        """
        Sets the pre-processing lambda setting and saves the changes.

        Args:
            l (str): The lambda function to set.

        Returns:
            The status of the save operation.
        """

        pre_processing_lambda = self.operator.select_id(PRE_PROCESSING_LAMBDA_ID)
        self.__set_element_value(pre_processing_lambda, l)
        return self.save_settings()


    def set_post_processing_lambda(self, l: str) -> str:
        """
        Sets the post-processing lambda setting and saves the changes.

        Args:
            l (str): The lambda function to set.

        Returns:
            The status of the save operation.
        """

        post_processing_lambda = self.operator.select_id(POST_PROCESSING_LAMBDA_ID)
        self.__set_element_value(post_processing_lambda, l)
        return self.save_settings()

    def disable_kb_prompt(self) -> str:
        """
        Disables prompt for knowledge base which is enabled by default

        Returns:
            The status of the save operation.
        """
        kb_prompt = self.operator.select_id(KNOWLEDGE_BASE_PROMPT_TEMPLATE_ID)
        self.__set_element_value(kb_prompt, '')

        return self.save_settings()
    def enable_kb_advanced(self, knowledge_base_model) -> str:
        """
        Enables advanced settings for the knowledge base

        Returns:
            The status of the save operation.
        """
        kb_search_type = self.operator.select_id(KNOWLEDGE_BASE_SEARCH_TYPE_ID)
        kb_max_results = self.operator.select_id(KNOWLEDGE_BASE_MAX_NUMBER_OF_RETRIEVED_RESULTS_ID)
        kb_model_params = self.operator.select_id(KNOWLEDGE_BASE_MODEL_PARAMS_ID)

        if knowledge_base_model.startswith('anthropic'):
            self.__set_element_value(kb_search_type, 'HYBRID')
            self.__set_element_value(kb_max_results, 4)
            self.__set_element_value(kb_model_params, '{"temperature": 0.1, "maxTokens": 300, "topP": 0.9, "top_k": 240 }')
        else:
            self.__set_element_value(kb_search_type, 'HYBRID')
            self.__set_element_value(kb_max_results, 5)
            self.__set_element_value(kb_model_params, '{"temperature": 0.1, "maxTokens": 300, "topP": 0.9 }')
            

        return self.save_settings()
    
    def expand_all_subgroups(self) -> None:
        """
        Expands all subgroups in the settings page.
        """

        try:
            chatbot_testing_subgroup = self.operator.select_id(CHATBOT_TESTING_SUBGROUP_ID)
            if chatbot_testing_subgroup.get_attribute('aria-expanded') == 'false':
                chatbot_testing_subgroup.click()
                self.operator.wait_for_element_attribute(CHATBOT_TESTING_SUBGROUP_ID, 'aria-expanded', 'true')

            language_identification_subgroup = self.operator.select_id(LANGUAGE_IDENTIFICATION_SUBGROUP_ID)
            if language_identification_subgroup.get_attribute('aria-expanded') == 'false':
                language_identification_subgroup.click()
                self.operator.wait_for_element_attribute(LANGUAGE_IDENTIFICATION_SUBGROUP_ID, 'aria-expanded', 'true')

            opensearch_subgroup = self.operator.select_id(OPEN_SEARCH_SUBGROUP_ID)
            if opensearch_subgroup.get_attribute('aria-expanded') == 'false':
                opensearch_subgroup.click()
                self.operator.wait_for_element_attribute(OPEN_SEARCH_SUBGROUP_ID, 'aria-expanded', 'true')

            security_and_privacy_subgroup = self.operator.select_id(SECURITY_AND_PRIVACY_SUBGROUP_ID)
            if security_and_privacy_subgroup.get_attribute('aria-expanded') == 'false':
                security_and_privacy_subgroup.click()
                self.operator.wait_for_element_attribute(SECURITY_AND_PRIVACY_SUBGROUP_ID, 'aria-expanded', 'true')

            query_matching_subgroup = self.operator.select_id(QUERY_MATCHING_SUBGROUP_ID)
            if query_matching_subgroup.get_attribute('aria-expanded') == 'false':
                query_matching_subgroup.click()
                self.operator.wait_for_element_attribute(QUERY_MATCHING_SUBGROUP_ID, 'aria-expanded', 'true')

            advanced_subgroup = self.operator.select_id(ADVANCED_SUBGROUP_ID)
            if advanced_subgroup.get_attribute('aria-expanded') == 'false':
                advanced_subgroup.click()
                self.operator.wait_for_element_attribute(ADVANCED_SUBGROUP_ID, 'aria-expanded', 'true')

            amazon_lex_subgroup = self.operator.select_id(AMAZON_LEX_SUBGROUP_ID)
            if amazon_lex_subgroup.get_attribute('aria-expanded') == 'false':
                amazon_lex_subgroup.click()
                self.operator.wait_for_element_attribute(AMAZON_LEX_SUBGROUP_ID, 'aria-expanded', 'true')

            amazon_connect_subgroup = self.operator.select_id(AMAZON_CONNECT_SUBGROUP_ID)
            if amazon_connect_subgroup.get_attribute('aria-expanded') == 'false':
                amazon_connect_subgroup.click()
                self.operator.wait_for_element_attribute(AMAZON_CONNECT_SUBGROUP_ID, 'aria-expanded', 'true')

            amazon_alexa_subgroup = self.operator.select_id(AMAZON_ALEXA_SUBGROUP_ID)
            if amazon_alexa_subgroup.get_attribute('aria-expanded') == 'false':
                amazon_alexa_subgroup.click()
                self.operator.wait_for_element_attribute(AMAZON_ALEXA_SUBGROUP_ID, 'aria-expanded', 'true')

            amazon_kendra_subgroup = self.operator.select_id(AMAZON_KENDRA_SUBGROUP_ID)
            if amazon_kendra_subgroup.get_attribute('aria-expanded') == 'false':
                amazon_kendra_subgroup.click()
                self.operator.wait_for_element_attribute(AMAZON_KENDRA_SUBGROUP_ID, 'aria-expanded', 'true')

            text_generation_general_subgroup = self.operator.select_id(TEXT_GENERATION_GENERAL_SUBGROUP_ID)
            if text_generation_general_subgroup.get_attribute('aria-expanded') == 'false':
                text_generation_general_subgroup.click()
                self.operator.wait_for_element_attribute(TEXT_GENERATION_GENERAL_SUBGROUP_ID, 'aria-expanded', 'true')

            amazon_bedrock_knowledge_bases_subgroup = self.operator.select_id(AMAZON_BEDROCK_KNOWLEDGE_BASES_SUBGROUP_ID)
            if amazon_bedrock_knowledge_bases_subgroup.get_attribute('aria-expanded') == 'false':
                amazon_bedrock_knowledge_bases_subgroup.click()
                self.operator.wait_for_element_attribute(AMAZON_BEDROCK_KNOWLEDGE_BASES_SUBGROUP_ID, 'aria-expanded', 'true')

            bedrock_guardrail_general_subgroup = self.operator.select_id(BEDROCK_GUARDRAIL_SUBGROUP_ID)
            if bedrock_guardrail_general_subgroup.get_attribute('aria-expanded') == 'false':
                bedrock_guardrail_general_subgroup.click()
                self.operator.wait_for_element_attribute(BEDROCK_GUARDRAIL_SUBGROUP_ID, 'aria-expanded', 'true')

        except selenium.common.exceptions.ElementClickInterceptedException:
            # The exception above happens when a window obscures the settings page,
            # In this case it is safe to ignore that error and continue on with the test.
            pass
