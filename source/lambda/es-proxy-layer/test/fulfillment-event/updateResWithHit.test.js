/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const _ = require('lodash');
const qnabot = require('qnabot/logging');
const { updateResWithHit } = require('../../lib/fulfillment-event/updateResWithHit');

const { 
    req,
    res,
    hit,
} = require('./updateResWithHit.fixtures')

jest.mock('qnabot/settings');
jest.mock('qnabot/logging');

describe('updateResWithHit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    })

    test('add hit to res (SSML response type)', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);

        const expectedRes = {...clonedRes};
        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expectedRes.type = 'SSML';
        expectedRes.tags = ['tag'];
        expectedRes.result = clonedHit;
        expectedRes.result.r.send = true;
        expectedRes.session.qnabot_qid = expectedRes.result.qid;
        expectedRes.session.qnabot_gotanswer = true;
        expectedRes.session.appContext = {};
        expectedRes.session.appContext.altMessages = expectedRes.result.alt;
        expectedRes.session.qnabotcontext.previous = {
            q: 'How can I publish Kindle books?',
            qid: 'qid',
        };
        expectedRes.session.qnabotcontext.navigation.hasParent = true;
        expectedRes.session.qnabotcontext.navigation.previous = ['test', 'Help'];
        expectedRes.card = clonedHit.r;
        expectedRes.card.send = true;
        expectedRes.answerSource = 'OPENSEARCH';
        expectedRes.message = expectedRes.result.alt.ssml;
        expectedRes.plainMessage = expectedRes.result.a;
        expectedRes.reprompt = {
            text: '<speak>rp<speak>',
            type: 'SSML'
        };

        expect(response).toStrictEqual(expectedRes);
    });

    test('renames answersource', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.answersource = 'Kendra FAQ';

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.answerSource).toBe('KENDRA FAQ');
    });

    test('no ssml when ssml preferred response type', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.ssml = '';

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.type).toBe('PlainText');
        expect(response.plainMessage).toBe(clonedRes.result.a);
        expect(response.message).toBe(clonedRes.result.a);
    });

    test('with card defined', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedRes.card = {};
        const expectedCard = {...clonedHit.r, send: true};

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);
        expect(response.card).toStrictEqual(expectedCard);
        expect(response.card.send).toBe(true);
    });

    test('add hit with no previous', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedRes.session.qnabotcontext.navigation.previous = [];

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.qnabotcontext.navigation.previous).toStrictEqual(['Help']);
    });

    test('add hit with previous matching previous qid', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedRes.session.qnabotcontext.navigation.previous = ['Help'];

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.qnabotcontext.navigation.previous).toStrictEqual(['Help']);
    });

    test('trim previous array if too long', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedRes.session.qnabotcontext.navigation.previous = 'this is some long previous history array that should be trimmed'.split(' ');

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.qnabotcontext.navigation.previous).toStrictEqual(['is','some','long','previous','history','array','that','should','be','trimmed', 'Help']);
    });

    test('res does not have parent if next', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.next = ['test'];

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.qnabotcontext.navigation.hasParent).toBe(false);
    });

    test('res does not have parent if next', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.next = ['test'];

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.qnabotcontext.navigation.hasParent).toBe(false);
    });

    test('sanitizes XSS from alt.html field', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.html = '<img src=x onerror="alert(document.domain)">';

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.appContext.altMessages.html).not.toContain('onerror');
        expect(response.session.appContext.altMessages.html).not.toContain('alert');
    });

    test('sanitizes script tags from alt.html field', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.html = '<p>Hello</p><script>steal(document.cookie)</script>';

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.appContext.altMessages.html).toBe('<p>Hello</p>');
    });

    test('sanitizes XSS from alt.markdown field', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.markdown = '<img src=x onerror="alert(1)">Some text';

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.appContext.altMessages.markdown).not.toContain('onerror');
    });

    test('preserves safe HTML in alt.html field', () => {
        const clonedReq = _.cloneDeep(req);
        const clonedRes = _.cloneDeep(res);
        const clonedHit = _.cloneDeep(hit);
        clonedHit.alt.html = '<p>Safe <b>content</b> with <a href="https://example.com">link</a></p>';

        const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

        expect(response.session.appContext.altMessages.html).toBe(
            '<p>Safe <b>content</b> with <a href="https://example.com">link</a></p>'
        );
    });

    describe('addSessionAttributes key validation', () => {
        test('writes legitimate sa key to session normally', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [{ text: 'myCustomVar', value: 'hello' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(response.session.myCustomVar).toBe('hello');
        });

        test('writes dot-separated sa key to session normally', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [{ text: 'namespace.subKey', value: 'someValue' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(response.session.namespace.subKey).toBe('someValue');
        });

        test('blocks sa key __lookupGetter__', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            // The exact sa field from the PoC
            clonedHit.sa = [{ text: '__lookupGetter__.constructor', value: 'seed' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            // Must NOT write __lookupGetter__ as own property — that would bypass safeGet
            expect(Object.hasOwn(response.session, '__lookupGetter__')).toBe(false);
        });

        test('blocks sa key __proto__', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [{ text: '__proto__.polluted', value: 'yes' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(({}).polluted).toBeUndefined();
        });

        test('blocks sa key constructor', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [{ text: 'constructor.prototype.polluted', value: 'yes' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(Object.hasOwn(response.session, 'constructor')).toBe(false);
        });

        test('blocks sa key __lookupSetter__', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [{ text: '__lookupSetter__', value: 'attack' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(Object.hasOwn(response.session, '__lookupSetter__')).toBe(false);
        });

        test('blocks sa key __defineGetter__', () => {
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [{ text: '__defineGetter__', value: 'attack' }];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(Object.hasOwn(response.session, '__defineGetter__')).toBe(false);
        });

        test('processes subsequent valid sa keys after a blocked one', () => {
            // A blocked key must not abort processing of the rest of the sa array
            const clonedReq = _.cloneDeep(req);
            const clonedRes = _.cloneDeep(res);
            const clonedHit = _.cloneDeep(hit);
            clonedHit.sa = [
                { text: '__lookupGetter__.constructor', value: 'seed' },  // blocked
                { text: 'myValidKey', value: 'validValue' },               // should still write
            ];

            const response = updateResWithHit(clonedReq, clonedRes, clonedHit);

            expect(Object.hasOwn(response.session, '__lookupGetter__')).toBe(false);
            expect(response.session.myValidKey).toBe('validValue');
        });
    });

})
