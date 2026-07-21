######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#  SPDX-License-Identifier: Apache-2.0                                                                               #
######################################################################################################################

import time
from selenium.webdriver.common.keys import Keys
from helpers.website_model.dom_operator import DomOperator

TEXT_INPUT_NAME = 'text-input'
MESSAGE_LIST_CSS = '.message-list'
PAGE_READINESS_ELEMENT_XPATH = '//div[@class="message-text"]'
MENU_XPATH = '//button[@aria-label="menu options"]'
LAST_MESSAGE_XPATH = '(//div[@class="v-row message message-bot"])[last()]'
LAST_MESSAGE_TEXT_XPATH = '(//div[@class="v-row message message-bot"]//div[@class="message-text"])[last()]'

SIGNIN_XPATH = '//form//button'

class ChatPage:
    """
    Class to represent a chat page on a website.
    
    This class uses a DomOperator object to interact with the webpage.
    It includes functionality to wait for the page to load, send and receive chat messages,
    check for the presence of elements, and select a language locale from a menu.
    
    :param operator: The DomOperator object to operate on the webpage.
    """

    def __init__(self, operator: DomOperator) -> None:
        """
        Initialize ChatPage with a DomOperator object and signs in as current user if bot is configured to be private.
        
        :param operator: The DomOperator object to operate on the webpage.
        """

        self.operator = operator

        if self.operator.get_title() != 'QnABot Client':
            self.operator.select_xpath(SIGNIN_XPATH, wait=5, click=True)
        self.__wait_to_load()

    def __wait_to_load(self):
        """
        Private method to wait for the page to load by waiting for the presence of a specific element.
        """

        self.operator.wait_for_element_by_xpath(PAGE_READINESS_ELEMENT_XPATH)

    def __wait_for_message_response(self, message):
        """
        Private method to wait for a response to the given message.
        
        :param message: The message to wait for a response to.
        """
        self.operator.wait_for_element_by_xpath(f'(//div[normalize-space(text()) = "{message}"]/ancestor::div[contains(concat(" ", @class, " "), " message-human ")][1])[last()]/following-sibling::div[@class="v-row message message-bot"]', delay=30)
    def select_text_input(self):
        """
        Select the text input element on the chat page.
        
        :return: The selected text input element.
        """

        return self.operator.select_name(TEXT_INPUT_NAME)
    
    def send_message(self, message):
        """
        Send a message through the text input on the chat page and wait for a response.
        
        :param message: The message to send.
        """

        text_input = self.select_text_input()
        text_input.send_keys(message)
        text_input.send_keys(Keys.ENTER)
        self.__wait_for_message_response(message)

    def get_messages(self) -> str:
        """
        Get the text of all messages in the chat.
        
        :return: The text of all messages in the chat.
        """

        full_page = self.operator.select_css(MESSAGE_LIST_CSS)
        return full_page.text

    def get_last_message_element(self):
        """
        Get the last message element in the chat.

        :return: last message element.
        """
        return self.operator.select_xpath(LAST_MESSAGE_XPATH)

    def get_last_message_text(self) -> str:
        """
        Get the last message text in the chat.

        :return: the text content in the last message element.
        """
        return self.operator.select_xpath(LAST_MESSAGE_TEXT_XPATH).text

    def has_element_with_xpath(self, xpath) -> str:
        """
        Check if an element with the given XPath exists in the chat page.
        
        :param xpath: The XPath of the element.
        :return: True if the element exists, False otherwise.
        """

        return self.operator.element_exists_by_xpath(xpath)
    
    def select_locale(self, locale: str):
        """
        Select the given locale from the menu and wait for the locale info element to update.
        
        :param locale: The locale to select.
        """

        self.operator.select_xpath(MENU_XPATH, click=True)
        self.operator.wait_for_element_by_xpath(f'//div[@class="v-list-item-title" and normalize-space(text()) = "{locale}"]')
        self.operator.select_xpath(f'//div[@class="v-list-item-title" and normalize-space(text()) = "{locale}"]', click=True)
        self.operator.wait_for_element_by_xpath(f'//span[@class="localeInfo" and contains(text(), "{locale}")]')

    def send_positive_feedback(self):
        """
        Send positive feedback through the chat page.
        """
        self.operator.select_xpath('//i[contains(@class, "feedback-icons-positive")]', click=True)
        self.__wait_for_message_response('Thumbs up')
