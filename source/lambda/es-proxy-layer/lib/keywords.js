
/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

// start connection
const _ = require('lodash');
const { Comprehend } = require('@aws-sdk/client-comprehend');
const qnabot = require('qnabot/logging');
const region = process.env.AWS_REGION || 'us-east-1';
const { TranslateClient, TranslateTextCommand} = require('@aws-sdk/client-translate');
const { getSupportedLanguages, getComprehendSyntaxSupportedLanguages } = require('./supportedLanguages');
const customSdkConfig = require('sdk-config/customSdkConfig');

const stopwords = 'a,an,and,are,as,at,be,but,by,for,if,in,into,is,it,not,of,on,or,such,that,the,their,then,there,these,they,this,to,was,will,with';

async function get_keywords_from_comprehend(params) {
    // get keywords from question using Comprehend syntax api
    let keywords = '';
    const keyword_syntax_types = _.get(params, 'keyword_syntax_types') || 'NOUN,PROPN,VERB,INTJ';
    const syntax_confidence_limit = _.get(params, 'syntax_confidence_limit') || 0.20;

    const nativeLang = _.get(params.settings, 'NATIVE_LANGUAGE', 'English');
    const backupLang = _.get(params.settings, 'BACKUP_LANGUAGE', 'English');
    const supportedLangMap = getSupportedLanguages();
    const comprehendLangMap = getComprehendSyntaxSupportedLanguages();
    const langSupported = comprehendLangMap[nativeLang];
    const backupLangCode = supportedLangMap[backupLang];
    const nativeLangCode = supportedLangMap[nativeLang];


    if (backupLang !== nativeLang && !langSupported) {
        qnabot.log('Native Language does not support Comprehend Syntax and so we are using the translation value from backup language');

        const questionInBackup = _.get(params, 'QuestionInBackupLanguage');
        const questionLocale = _.get(params, 'localeIdentified');
        // if we don't go through fulfillment lambda this will be null
        if (!questionLocale || !questionInBackup) {
            qnabot.log("questionLocale and/or questionInBackup don't exist in Keywords es-proxy. Meaning this did not go through fulfillment multi-lang");
            return '';
        }
        qnabot.debug('Translated question in Keywords : ', questionInBackup);
        const comprehend_params = {
            LanguageCode: backupLangCode,
            Text: questionInBackup,
        };
        if (questionInBackup && comprehend_params.Text) {
            keywords = await detectSyntaxUsingComprehend(comprehend_params, keyword_syntax_types, syntax_confidence_limit, keywords);
        }
        
        qnabot.debug('detected the following keywords with the length: ', keywords, keywords.length);
        if (keywords.length !== 0) {
            // Translate the keywords back to the locale identified for the question asked by user
            const translate = new TranslateClient(customSdkConfig('C017', { region }));
            const translate_params = {
                SourceLanguageCode: 'auto',
                TargetLanguageCode: questionLocale,
                Text: String(keywords),
            };
            const translateTextCMD = new TranslateTextCommand(translate_params);
            qnabot.debug('translate parameters for keywords: ', translate_params);
            const translatedKeywords = await translate.send(translateTextCMD);
            qnabot.debug('translatedKeywords: ', translatedKeywords.TranslatedText);
            return translatedKeywords.TranslatedText;
         }
         qnabot.debug('KEYWORDS:', keywords);
         return keywords;
    }

    qnabot.log('Native Language does support Comprehend Syntax');
    const comprehend_params = {
        LanguageCode: nativeLangCode,
        Text: params.question,
    };
    keywords = await detectSyntaxUsingComprehend(comprehend_params, keyword_syntax_types, syntax_confidence_limit, keywords);
    qnabot.debug('KEYWORDS:', keywords);
    
    return keywords;
}

async function detectSyntaxUsingComprehend(comprehend_params, keyword_syntax_types, syntax_confidence_limit, keywords) {
    const comprehend = new Comprehend(customSdkConfig('C017', { region }));
    qnabot.debug('Parameters for detectSyntax comprehend', comprehend_params);
    const data = await comprehend.detectSyntax(comprehend_params);
    for (const syntaxtoken of data.SyntaxTokens) {
        qnabot.debug(
            `WORD = '${syntaxtoken.Text}', `
            + `PART OF SPEECH = ${syntaxtoken.PartOfSpeech.Tag}, `
            + `SCORE: ${syntaxtoken.PartOfSpeech.Score}`,
        );

        if (keyword_syntax_types.split(',').indexOf(syntaxtoken.PartOfSpeech.Tag) === -1) {
            qnabot.debug('X part of speech not in list:', keyword_syntax_types);
        } else if (stopwords.split(',').indexOf(syntaxtoken.Text.toLowerCase()) !== -1) {
            qnabot.debug(`X '${syntaxtoken.Text}' is a stop word`);
        } else if (syntaxtoken.PartOfSpeech.Score < syntax_confidence_limit) {
            qnabot.debug('X score < ', syntax_confidence_limit, ' (threshold)');
        } else {
            qnabot.debug(`+KEYWORD: ${syntaxtoken.Text}`);
            if (!(syntaxtoken.Text.startsWith('\'') || syntaxtoken.Text.startsWith('`'))) {
                keywords = `${keywords + syntaxtoken.Text} `;
            } else {
                qnabot.debug(`Not including ${syntaxtoken.Text}`);
            }
        }
    }
    return String(keywords);
}

async function get_keywords(params) {
    let contraction_list;
    let new_question = '';
    let new_word = '';
    try {
        contraction_list = JSON.parse(params.es_expand_contractions);
    } catch {
        qnabot.log(`Improperly formatted JSON in ES_EXPAND_CONTRACTIONS: ${params.es_expand_contractions}`);
        contraction_list = {};
    }

    for (const word of params.question.split(' ')) {
        for (const contraction in contraction_list) {
            new_word = '';
            if (word.toLowerCase() == contraction.toLowerCase() || word.toLowerCase() == contraction.toLowerCase().replace(/'/g, '’')) {
                new_word = contraction_list[contraction];
                break;
            }
        }
        new_question += ` ${new_word != '' ? new_word : word}`;
    }
    qnabot.log(`Question after expanding contractions${new_question}`);
    params.question = new_question.trim();

    if (_.get(params, 'use_keyword_filters')) {
        qnabot.log('use_keyword_filters is true; detecting keywords from question using Comprehend');
        return get_keywords_from_comprehend(params);
    }
    qnabot.log('use_keyword_filters is false');
    return Promise.resolve('');
}

module.exports = function (params) {
    return get_keywords(params);
};