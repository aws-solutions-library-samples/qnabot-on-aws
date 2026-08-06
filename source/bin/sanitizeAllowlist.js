/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

/**
 * Canonical sanitize-html allowlist for QnABot. Single source of truth —
 * do not edit the generated copies in es-proxy-layer/lib/sanitizeOutput.js
 * or website/js/components/designer/sanitizeOutput.js directly; they're
 * regenerated automatically on every build.
 */

const SANITIZE_ALLOWLIST = {
    extraAllowedTags: ['question', 'references', 'chatHistory', 'followUpMessage', 'details', 'summary', 'img'],
    extraAllowedAttributes: {
        a: ['href'],
        p: ['style'],
        span: ['translate', 'style'],
    },
    allowedStyles: {
        p: { 'white-space': [/^pre-line$/] },
        span: {
            color: [
                /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
                /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
            ],
        },
    },
    allowedSchemesByTag: {
        img: ['https', 'data'],
        a: ['http', 'https', 'mailto', 'tel'],
    },
};

module.exports = { SANITIZE_ALLOWLIST };
