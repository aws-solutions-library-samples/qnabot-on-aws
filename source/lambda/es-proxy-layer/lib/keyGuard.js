/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const _ = require('lodash');

// Prototype property names that must not appear in any user-controlled key path
const DANGEROUS_SEGMENTS = new Set([
    '__proto__', '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__', 'constructor', 'prototype',
]);

/**
 * Returns true if the key path contains no dangerous prototype property segments.
 * Uses _.toPath() to correctly parse both dot-notation and bracket-notation paths.
 *
 * @param {string} key - The key path to validate
 * @returns {boolean} true if safe, false if dangerous
 *
 * @example
 * isSafeKeyPath('myAttr')                    // true
 * isSafeKeyPath('namespace.subKey')          // true
 * isSafeKeyPath('__proto__')                 // false
 * isSafeKeyPath('__lookupGetter__.constructor') // false
 * isSafeKeyPath("a['__proto__']")            // false
 */
function isSafeKeyPath(key) {
    return !_.toPath(key).some((p) => DANGEROUS_SEGMENTS.has(p));
}

module.exports = { isSafeKeyPath, DANGEROUS_SEGMENTS };
