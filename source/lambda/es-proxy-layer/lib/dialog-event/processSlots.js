/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const _ = require('lodash');
const qnabot = require('qnabot/logging');
const { isSafeKeyPath } = require('../keyGuard');

function useCachedValue(slotName, slot_sessionAttrName, res, slotRequired, nextSlotToElicit) {
    qnabot.log(
        `Slot value caching enabled for: '${slotName}' using session attribute '${slot_sessionAttrName}'`,
    );
    const cachedValue = _.get(res.session, slot_sessionAttrName);
    if (cachedValue) {
        qnabot.log(`Filling slot ${slotName} using cached value: ${cachedValue}`);
        _.set(res, `slots.${slotName}`, cachedValue);
    } else {
        qnabot.log(`No cached value for slot ${slotName}`);
        _.set(res, `slots.${slotName}`, null);
        if (slotRequired && !nextSlotToElicit) {
            nextSlotToElicit = slotName;
        }
    }
    return [res, nextSlotToElicit];
}

function useSlotValue(slotName, slotValue, res, slotValueCached, slot_sessionAttrName) {
    qnabot.log(`Slot ${slotName} already filled: ${slotValue}`);
    _.set(res, `slots.${slotName}`, slotValue);
    if (slotValueCached) {
        if (!isSafeKeyPath(slot_sessionAttrName)) {
            qnabot.log(`WARNING: blocked dangerous slot session attr '${slot_sessionAttrName}'`);
            return res;
        }
        qnabot.log(
            `Slot value caching enabled for: '${slotName}' setting session attribute '${slot_sessionAttrName}'`,
        );
        _.set(res.session, slot_sessionAttrName, slotValue);
    }

    return res;
}

function processSlots(req, res, hit) {
    const qid_slots = _.get(hit, 'slots');
    let nextSlotToElicit;

    if (!qid_slots) {
        return res;
    }

    for (const slot of qid_slots) {
        const slotName = _.get(slot, 'slotName');
        if (!isSafeKeyPath(slotName)) {
            qnabot.log(`WARNING: blocked dangerous slot name '${slotName}'`);
            continue;
        }
        const slotValue = _.get(req, `slots.${slotName}`);
        const slotRequired = _.get(slot, 'slotRequired', false);
        const slotValueCached = _.get(slot, 'slotValueCached');
        const slot_sessionAttrName = `qnabotcontext.slot.${slotName}`;
        if (slotValue) {
            res = useSlotValue(slotName, slotValue, res, slotValueCached, slot_sessionAttrName);
        } else if (slotValueCached) {
            [res, nextSlotToElicit] = useCachedValue(slotName, slot_sessionAttrName, res, slotRequired, nextSlotToElicit);
        } else {
            qnabot.log(`Slot value caching is not enabled for: ${slotName}`);
            _.set(res, `slots.${slotName}`, null);
            if (slotRequired && !nextSlotToElicit) {
                nextSlotToElicit = slotName;
            }
        }
    }
    qnabot.log(`Set next slot to elicit: ${nextSlotToElicit}`);
    res.nextSlotToElicit = nextSlotToElicit;
    // Placeholder to add optional lambda hook for slot validation / runtime hints, etc. (future)
    return res;
}
exports.processSlots = processSlots;
