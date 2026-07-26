/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const { signUrls } = require('../lib/signS3URL');
const handlebars = require('../lib/handlebars');
const _ = require('lodash');

const { req, res, hit } = require('./handlebars.fixtures')

jest.mock('qnabot/settings');
jest.mock('qnabot/logging');
jest.mock('../lib/signS3URL');
signUrls.mockImplementation(async (url, timeout) => {
    return ['https://signedurl.s3.amazonaws.com/']
});

describe('handlebars', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    })

    test('returns copy of original hit if no handlebars present', async () => {
        const response = await handlebars(req, res, hit);
        expect(response).toStrictEqual(hit);
    });

    test('evaluates if condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond 70 '>' 60}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (==)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond true '==' true}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (===)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond true '===' true}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct')
    });

    test('evaluates if condition (!=)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond true '!=' false}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct')
    });

    test('evaluates if condition (!==)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond true '!==' false}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct')
    });

    test('evaluates if condition (<)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond 1 '<' 2}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (<=)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond 1 '<=' 1}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (>=)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond 1 '>=' 1}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (&&)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond true '&&' true}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (||)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond false '||' true}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('correct');
    });

    test('evaluates if condition (unknown operator)', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifCond false '?' true}}correct{{else}}incorrect{{/ifCond}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('incorrect');
    });

    test('evaluates ifLang condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifLang 'en'}}Hello!{{else}}Sorry, I don't speak your language.{{/ifLang}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("Hello!");
    });

    test('evaluates ifLang condition when user lang does not match', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#ifLang 'es'}}Hello!{{else}}Sorry, I don't speak your language.{{/ifLang}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("");
    });

    test('evaluates defaultLang condition with previous match lang as true', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        clonedHit.a = "{{#defaultLang}}Sorry, I don't speak your language.{{/defaultLang}}";
        clonedReq.session.matchlang = 'true'
        const response = await handlebars(clonedReq, res, clonedHit);
        expect(response.a).toBe("");
    });

    test('evaluates defaultLang condition with previous match lang as false', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        clonedHit.a = "{{#defaultLang}}Sorry, I don't speak your language.{{/defaultLang}}";
        clonedReq.session.matchlang = 'false'
        const response = await handlebars(clonedReq, res, clonedHit);
        expect(response.a).toBe("Sorry, I don't speak your language.");
    });

    test('evaluates defaultLang condition with previous match lang is undefined', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        clonedHit.a = "{{#defaultLang}}Sorry, I don't speak your language.{{/defaultLang}}";
        clonedReq.session.matchlang = undefined;
        const response = await handlebars(clonedReq, res, clonedHit);
        expect(response).toStrictEqual({...clonedHit, ...{a: "Sorry, I don't speak your language."}});
    });

    test('evaluates setLang condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{#setLang}}{{/setLang}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("");
    });

    test('does not evaluate setLang condition if ENABLE_MULTI_LANGUAGE_SUPPORT is off', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        clonedHit.a = "{{#setLang}}{{/setLang}}";
        clonedReq._settings.ENABLE_MULTI_LANGUAGE_SUPPORT = '';
        const response = await handlebars(clonedReq, res, clonedHit);
        expect(response.a).toBe("");
    });

    test('evaluate setLang condition when currentPreferredLocale is set', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{#setLang}}{{/setLang}}";
        clonedRes.session.qnabotcontext.userPreferredLocale = 'en';
        const response = await handlebars(req, clonedRes, clonedHit);
        expect(response.a).toBe("");
    });

    test('evaluate setLang condition when userLanguageCode matches set language', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{#setLang 'en' true}}English{{/setLang}}";
        clonedRes.session.qnabotcontext.userPreferredLocale = 'en';
        const response = await handlebars(req, clonedRes, clonedHit);
        expect(response.a).toBe("English");
    });

    test('evaluate setLang condition when userLanguageCode does not match set language', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{#setLang 'fr' true}}English{{/setLang}}";
        clonedReq._event.inputTranscript = 'Swahili';
        clonedRes.session.qnabotcontext.userPreferredLocale = 'en';
        const response = await handlebars(clonedReq, clonedRes, clonedHit);
        expect(response.a).toBe("Sorry, the requested language is not available.");
    });

    test('evaluate setLang condition when language not supported', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{#setLang}}{{/setLang}}";
        clonedReq._event.inputTranscript = 'Yiddish';
        clonedRes.session.qnabotcontext.userPreferredLocale = 'en';
        const response = await handlebars(clonedReq, clonedRes, clonedHit);
        expect(response.a).toBe("Sorry, the requested language is not available.");
    });

    test('evaluate setLang condition when input transciprt is not a string', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{#setLang}}{{/setLang}}";
        clonedReq._event.inputTranscript = {};
        clonedRes.session.qnabotcontext.userPreferredLocale = 'en';
        const response = await handlebars(clonedReq, clonedRes, clonedHit);
        expect(response.a).toBe("Sorry, the requested language is not available.");
    });

    test('evaluate resetLang condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{#resetLang 'Your language has been reset.' }}{{/resetLang}}";
        clonedReq.session.qnabotcontext.userPreferredLocale = 'es';
        clonedRes.session.qnabotcontext.userPreferredLocale = 'es';
        const response = await handlebars(clonedReq, clonedRes, clonedHit);
        expect(response.a).toBe("Your language has been reset.");
        expect(clonedReq.session.qnabotcontext.userPreferredLocale).toBe("");
        expect(clonedRes.session.qnabotcontext.userPreferredLocale).toBe("");
    });

    test('evaluate setSessionAttr condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedRes = _.cloneDeep(res);
        clonedHit.a = "{{setSessionAttr 'myAttribute' 'AWS'}}";
        const response = await handlebars(req, clonedRes, clonedHit);
        expect(response).toStrictEqual({...clonedHit, ...{a: ""}});
        expect(clonedRes.session.myAttribute).toBe('AWS');
    });

    test('evaluate getSessionAttr condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedRes = _.cloneDeep(res);
        clonedRes.session.myAttribute = 'test';
        clonedHit.a = "{{getSessionAttr 'myAttribute'}}";
        const response = await handlebars(req, clonedRes, clonedHit);
        expect(response.a).toBe("test");
    });

    test('evaluate getQuestion condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{getQuestion}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("original question");
    });

    test('evaluate getSlot condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        const clonedReq = _.cloneDeep(req);
        clonedReq.slots.mySlot = 'test';
        clonedHit.a = "{{getSlot 'mySlot'}}";
        const response = await handlebars(clonedReq, res, clonedHit);
        expect(response.a).toBe("test");
    });

    test('evaluate signS3URL condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{signS3URL 'https://qna.s3.amazonaws.com/test.json'}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("https://signedurl.s3.amazonaws.com/");
    });

    test('evaluate toUpperCase condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{toUpperCase 'hello, world!'}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("HELLO, WORLD!");
    });

    test('evaluate toUpperCase with null returns false', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = '{{toUpperCase null}}';
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('false');
    });

    test('evaluate toLowerCase condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{toLowerCase 'HELLO, WORLD!'}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("hello, world!");
    });

    test('evaluate toLowerCase with null returns false', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = '{{toLowerCase null}}';
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('false');
    });

    test('evaluate toTitleCase condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{toTitleCase 'hello, world!'}}";
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("Hello, World!");
    });

    test('evaluate toTitleCase with null returns false', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = '{{toTitleCase null}}';
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe('false');
    });

    test('evaluate randomPick condition', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{randomPick 'a' 'b' 'c'}}";
        const response = await handlebars(req, res, clonedHit);
        expect(['a', 'b', 'c']).toContain(response.a);
    });

    test('handleSa handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.sa = [{}]; 
        try {
            await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe('You must pass a string or Handlebars AST to Handlebars.compile. You passed undefined');
        };
    });

    test('handleR handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.r.title = "{{text.notValid()}}"; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('handleRp handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.rp = "{{text.notValid()}}"; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('handleSsml handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.ssml = "{{text.notValid()}}"; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('handleMarkdown handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.markdown = "{{text.notValid()}}"; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('handleA handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "{{text.notValid()}}"; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('kendraRedirectQueryText handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.kendraRedirectQueryText = "{{text.notValid()}}"; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('kendraRedirectQueryArgs handles errors', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.kendraRedirectQueryArgs = ["{{text.notValid()}}"]; 
        try {
            const response = await handlebars(req, res, clonedHit);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Parse error');
        }
    });

    test('without fields', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.a = "";
        clonedHit.alt.markdown = "";
        clonedHit.alt.ssml = "";
        clonedHit.rp = "";
        clonedHit.r = undefined;
        clonedHit.sa = undefined;
        clonedHit.kendraRedirectQueryText = "";
        clonedHit.kendraRedirectQueryArgs = undefined;
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("");
    });

    test('without card fields', async () => {
        const clonedHit = _.cloneDeep(hit);
        clonedHit.r = {};
        const response = await handlebars(req, res, clonedHit);
        expect(response.a).toBe("test");
    });

    describe('security - prototype traversal protection', () => {
        test('getSessionAttr blocks prototype traversal - toString.constructor does not return Function', async () => {
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{getSessionAttr "toString.constructor" ""}}';
            const response = await handlebars(req, res, clonedHit);
            expect(response.a).toBe('');
            expect(response.a).not.toContain('Function');
        });

        test('getSessionAttr returns own session property normally', async () => {
            const clonedRes = _.cloneDeep(res);
            clonedRes.session.userName = 'testuser';
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{getSessionAttr "userName" ""}}';
            const response = await handlebars(req, clonedRes, clonedHit);
            expect(response.a).toBe('testuser');
        });

        test('getSlot blocks prototype traversal - toString.constructor does not return Function', async () => {
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{getSlot "toString.constructor" ""}}';
            const response = await handlebars(req, res, clonedHit);
            expect(response.a).toBe('');
            expect(response.a).not.toContain('Function');
        });

        test('setSessionAttr blocks __proto__ key', async () => {
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{setSessionAttr "__proto__.polluted" "yes"}}';
            const response = await handlebars(req, res, clonedHit);
            expect(response.a).toBe('');
            expect(({}).polluted).toBeUndefined();
        });

        test('setSessionAttr blocks constructor key', async () => {
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{setSessionAttr "constructor.prototype.polluted" "yes"}}';
            const response = await handlebars(req, res, clonedHit);
            expect(response.a).toBe('');
        });

        test('setSessionAttr allows legitimate keys that contain blocked words as substrings', async () => {
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{setSessionAttr "deconstructorMode" "on"}}';
            await handlebars(req, clonedRes, clonedHit);
            // setSessionAttr always returns '' but should set the session attr
            expect(clonedRes.session.deconstructorMode).toBe('on');
        });

        test('getSessionAttr refuses dangerous segment even if planted as own property', async () => {
            const clonedRes = _.cloneDeep(res);
            clonedRes.session.__lookupGetter__ = Object.prototype.__lookupGetter__;
            const clonedHit = _.cloneDeep(hit);
            clonedHit.a = '{{getSessionAttr "__lookupGetter__" ""}}';
            const response = await handlebars(req, clonedRes, clonedHit);
            expect(response.a).toBe('');
            expect(typeof response.a).not.toBe('function');
        });
    });
});



