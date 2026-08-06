/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */
import sanitizeHtml from 'sanitize-html';
import { sanitize } from '../../../js/components/designer/sanitizeOutput.js';
import { SANITIZE_ALLOWLIST } from '../../../../bin/sanitizeAllowlist.js';

function sanitizeFromCanonical(data) {
    const sanitizeParams = {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(SANITIZE_ALLOWLIST.extraAllowedTags),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, ...SANITIZE_ALLOWLIST.extraAllowedAttributes },
        allowedStyles: SANITIZE_ALLOWLIST.allowedStyles,
        allowedSchemesByTag: SANITIZE_ALLOWLIST.allowedSchemesByTag,
    };
    return sanitizeHtml(data, sanitizeParams);
}

const testCases = [
    '<details><summary>x</summary>y</details>',
    '<img src="https://example.com/img.png" alt="test" />',
    '<img src="data:image/png;base64,aGVsbG8=" />',
    '<p style="white-space: pre-line">text</p>',
    '<span translate="no">text</span>',
    '<span style="color: #ff0000">text</span>',
    '<span style="color: rgb(255, 0, 0)">text</span>',
    '<a href="https://example.com">link</a>',
    '<a href="mailto:test@example.com">mail</a>',
    '<a href="tel:+15551234567">tel</a>',
    '<question>q</question><references>r</references><chatHistory>h</chatHistory><followUpMessage>f</followUpMessage>',
    '<img src="x" onerror="alert(1)" />',
    '<a href="javascript:alert(1)">x</a>',
    '<script>alert(1)</script>',
];

describe('allowlist sync check — Designer sanitizeOutput.js must not have drifted from source/bin/sanitizeAllowlist.js', () => {
    // If any case below fails: node source/bin/sync-sanitize-allowlist.js
    testCases.forEach((input) => {
        test(`matches canonical allowlist output for: ${input}`, () => {
            expect(sanitize(input)).toBe(sanitizeFromCanonical(input));
        });
    });
});
