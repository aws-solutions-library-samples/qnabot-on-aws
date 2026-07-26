/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const { isSafeKeyPath, DANGEROUS_SEGMENTS } = require('../lib/keyGuard');

describe('keyGuard', () => {
    describe('isSafeKeyPath', () => {
        test('allows simple safe key', () => {
            expect(isSafeKeyPath('myAttr')).toBe(true);
        });

        test('allows dot-notation safe path', () => {
            expect(isSafeKeyPath('namespace.subKey')).toBe(true);
        });

        test('allows deep safe path', () => {
            expect(isSafeKeyPath('qnabotcontext.slot.test')).toBe(true);
        });

        test('blocks __proto__', () => {
            expect(isSafeKeyPath('__proto__')).toBe(false);
        });

        test('blocks __lookupGetter__', () => {
            expect(isSafeKeyPath('__lookupGetter__')).toBe(false);
        });

        test('blocks __lookupSetter__', () => {
            expect(isSafeKeyPath('__lookupSetter__')).toBe(false);
        });

        test('blocks __defineGetter__', () => {
            expect(isSafeKeyPath('__defineGetter__')).toBe(false);
        });

        test('blocks __defineSetter__', () => {
            expect(isSafeKeyPath('__defineSetter__')).toBe(false);
        });

        test('blocks constructor', () => {
            expect(isSafeKeyPath('constructor')).toBe(false);
        });

        test('blocks prototype', () => {
            expect(isSafeKeyPath('prototype')).toBe(false);
        });

        test('blocks dangerous segment in dot-notation path', () => {
            expect(isSafeKeyPath('__lookupGetter__.constructor')).toBe(false);
        });

        test('blocks dangerous segment in bracket-notation path', () => {
            expect(isSafeKeyPath("a['__proto__']")).toBe(false);
        });

        test('blocks dangerous segment nested in otherwise safe path', () => {
            expect(isSafeKeyPath('safe.__proto__.also')).toBe(false);
        });
    });

    describe('DANGEROUS_SEGMENTS', () => {
        test('contains all expected dangerous segments', () => {
            expect(DANGEROUS_SEGMENTS.has('__proto__')).toBe(true);
            expect(DANGEROUS_SEGMENTS.has('__lookupGetter__')).toBe(true);
            expect(DANGEROUS_SEGMENTS.has('__lookupSetter__')).toBe(true);
            expect(DANGEROUS_SEGMENTS.has('__defineGetter__')).toBe(true);
            expect(DANGEROUS_SEGMENTS.has('__defineSetter__')).toBe(true);
            expect(DANGEROUS_SEGMENTS.has('constructor')).toBe(true);
            expect(DANGEROUS_SEGMENTS.has('prototype')).toBe(true);
        });
    });
});
