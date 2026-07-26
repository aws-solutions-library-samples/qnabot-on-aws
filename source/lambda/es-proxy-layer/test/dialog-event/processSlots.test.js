/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const processSlotsFixtures = require('./processSlots.fixtures')
const { processSlots }= require('../../lib/dialog-event/processSlots');

describe('When calling processSlots function', () => {

    test('Should use slotValue from request and return response and do not cache', async () => {
        const res = {};
        const processSlotResponse = await processSlots(processSlotsFixtures.createRequestObject("What is QnABot?", true),
            res, processSlotsFixtures.returnHit(false));

        expect(processSlotResponse.slots.test).toEqual(5);
    });

    test('Should use slotValue from request and return response and do cache', async () => {
        const res = {
            "session": {
            }};
        const processSlotResponse = await processSlots(processSlotsFixtures.createRequestObject("What is QnABot?", true),
            res, processSlotsFixtures.returnHit(true));

        expect(processSlotResponse.slots.test).toEqual(5);

        expect(processSlotResponse.session.qnabotcontext.slot.test).toEqual(5);
    });

    test('Should use Cached Value from Response session', async () => {
        const processSlotResponse = await processSlots(processSlotsFixtures.createRequestObject("What is QnABot?", false),
            processSlotsFixtures.createResponseObjectWithSession, processSlotsFixtures.returnHit(true));

        expect(processSlotResponse.slots.test).toEqual(10);
    });

    test('Should set value to Null if request and response session does not have a value', async () => {
        const res = {};
        const processSlotResponse = await processSlots(processSlotsFixtures.createRequestObject("What is QnABot?", false),
            res, processSlotsFixtures.returnHit(true));

        expect(processSlotResponse.slots.test).toBeNull();
        expect(processSlotResponse.nextSlotToElicit).toEqual('test');
    });

    test('Should set value to Null if request and response session does not have a value and hit does not cache any value', async () => {
        const res = {};
        const processSlotResponse = await processSlots(processSlotsFixtures.createRequestObject("What is QnABot?", false),
            res, processSlotsFixtures.returnHit(false));

        expect(processSlotResponse.slots.test).toBeNull();
        expect(processSlotResponse.nextSlotToElicit).toEqual('test');
    });

    test('Should return response as is if hit does not contain slots', async () => {
        const empty_obj = {};
        const processSlotResponse = await processSlots(processSlotsFixtures.createRequestObject("What is QnABot?", false),
            empty_obj, empty_obj);

        expect(processSlotResponse).toMatchObject(empty_obj);
    })

    test('blocks slot name that would plant a prototype property into res.session', () => {
        const hit = { slots: [{ slotName: '__lookupGetter__', slotRequired: false, slotValueCached: true }] };
        const req = { slots: { '__lookupGetter__': 'malicious' } };
        const res = { session: {} };
        const out = processSlots(req, res, hit);
        expect(Object.hasOwn(out.session?.qnabotcontext?.slot ?? {}, '__lookupGetter__')).toBe(false);
        expect(Object.hasOwn(out.slots ?? {}, '__lookupGetter__')).toBe(false);
    });

    test('legitimate slot name still cached correctly', () => {
        const hit = { slots: [{ slotName: 'city', slotRequired: false, slotValueCached: true }] };
        const req = { slots: { city: 'Seattle' } };
        const res = { session: {} };
        const out = processSlots(req, res, hit);
        expect(out.slots.city).toBe('Seattle');
        expect(out.session.qnabotcontext.slot.city).toBe('Seattle');
    });

    test('blocks dangerous slot name in fallback path (no matching req.slots entry)', () => {
        const hit = { slots: [{ slotName: '__proto__', slotRequired: true, slotValueCached: false }] };
        const req = { slots: {} };
        const res = { session: {} };
        const out = processSlots(req, res, hit);
        expect(out.slots?.['__proto__']).toBeUndefined();
    });
});

