#!/usr/bin/env node
/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

/**
 * Syncs sanitizeAllowlist.js into the Fulfillment Lambda's and Content
 * Designer's sanitizeOutput.js files.
 *
 * Both outputs are fully self-contained (values inlined, no runtime import of
 * sanitizeAllowlist.js). This matters because es-proxy-layer is packaged into
 * a Lambda Layer zip whose Makefile only includes files inside es-proxy-layer/
 * — a cross-directory require would pass local tests but throw
 * MODULE_NOT_FOUND once deployed, since the canonical file is outside the zip.
 *
 * Usage: node source/bin/sync-sanitize-allowlist.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CANONICAL_PATH = path.join(__dirname, 'sanitizeAllowlist.js');
const { SANITIZE_ALLOWLIST } = require(CANONICAL_PATH);

const LAMBDA_PATH = path.join(ROOT, 'source/lambda/es-proxy-layer/lib/sanitizeOutput.js');
const DESIGNER_PATH = path.join(ROOT, 'source/website/js/components/designer/sanitizeOutput.js');

const GENERATED_HEADER = `/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

// AUTO-GENERATED — DO NOT EDIT DIRECTLY
// Source of truth: source/bin/sanitizeAllowlist.js
// Regenerate with: node source/bin/sync-sanitize-allowlist.js
`;

function serializeStyles(styles) {
    // RegExp values can't be JSON.stringify'd, so serialize each one via .toString().
    const tagEntries = Object.entries(styles).map(([tag, props]) => {
        const propEntries = Object.entries(props).map(([prop, patterns]) => {
            const patternList = patterns.map((regex) => regex.toString()).join(', ');
            return `${JSON.stringify(prop)}: [${patternList}]`;
        });
        return `    ${tag}: { ${propEntries.join(', ')} }`;
    });
    return `{\n${tagEntries.join(',\n')},\n}`;
}

function buildLambdaContent() {
    return `${GENERATED_HEADER}
const sanitizeHtml = require('sanitize-html');

const EXTRA_TAGS = ${JSON.stringify(SANITIZE_ALLOWLIST.extraAllowedTags)};
const EXTRA_ATTRS = ${JSON.stringify(SANITIZE_ALLOWLIST.extraAllowedAttributes)};
const ALLOWED_SCHEMES = ${JSON.stringify(SANITIZE_ALLOWLIST.allowedSchemesByTag)};
const ALLOWED_STYLES = ${serializeStyles(SANITIZE_ALLOWLIST.allowedStyles)};

// Sanitize outputs to prevent malicious attacks
function sanitize(data) {
    const sanitizeParams = {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(EXTRA_TAGS),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, ...EXTRA_ATTRS },
        allowedStyles: ALLOWED_STYLES,
        allowedSchemesByTag: ALLOWED_SCHEMES,
    };
    const sanitizedData = sanitizeHtml(data, sanitizeParams);
    return sanitizedData;
}

// Escapes hash if the input text starts with one or more hashes followed by a space.
function escapeHashMarkdown(text) {

    const match = /^(#+)/; // Matches one ore more hashes at the start of the text

    if(match.test(text)){ // If it matches the escape first hash symbol
        text = text.replace(/^#/, '\\\\#')
    };
    return text;
}

exports.escapeHashMarkdown = escapeHashMarkdown;
exports.sanitize = sanitize;
`;
}

function buildDesignerContent() {
    return `${GENERATED_HEADER}
import sanitizeHtml from 'sanitize-html';

const EXTRA_TAGS = ${JSON.stringify(SANITIZE_ALLOWLIST.extraAllowedTags)};
const EXTRA_ATTRS = ${JSON.stringify(SANITIZE_ALLOWLIST.extraAllowedAttributes)};
const ALLOWED_SCHEMES = ${JSON.stringify(SANITIZE_ALLOWLIST.allowedSchemesByTag)};
const ALLOWED_STYLES = ${serializeStyles(SANITIZE_ALLOWLIST.allowedStyles)};

// Sanitize outputs to prevent malicious attacks
export function sanitize(data) {
    const sanitizeParams = {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(EXTRA_TAGS),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, ...EXTRA_ATTRS },
        allowedStyles: ALLOWED_STYLES,
        allowedSchemesByTag: ALLOWED_SCHEMES,
    };
    return sanitizeHtml(data, sanitizeParams);
}
`;
}

const lambdaContent = buildLambdaContent();
const designerContent = buildDesignerContent();

const writes = [
    { target: LAMBDA_PATH, content: lambdaContent },
    { target: DESIGNER_PATH, content: designerContent },
];

const failures = writes
    .map(({ target, content }) => {
        try {
            fs.writeFileSync(target, content);
            return null;
        } catch (err) {
            return { target, err };
        }
    })
    .filter(Boolean);

if (failures.length > 0) {
    failures.forEach(({ target, err }) => {
        console.error(`Failed to write ${path.relative(ROOT, target)}: ${err.message}`);
    });
    throw new Error(`sync-sanitize-allowlist.js: ${failures.length} of ${writes.length} file(s) failed to write — see errors above`);
}

console.log('Synced source/bin/sanitizeAllowlist.js to:');
console.log(`  - ${path.relative(ROOT, LAMBDA_PATH)}`);
console.log(`  - ${path.relative(ROOT, DESIGNER_PATH)}`);
