/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

/**
 * Safe expression evaluator for conditional chaining
 * 
 * This module provides a three-stage evaluation pipeline:
 * 1. Tokenizer: Breaks expression into discrete tokens
 * 2. Validator: Applies allowlist-based security checks
 * 3. Evaluator: Executes validated expression in restricted scope
 */

// Optional logging - gracefully handle when qnabot/logging is not available
let qnabot;
try {
    qnabot = require('qnabot/logging');
} catch (e) {
    // Fallback for non-Lambda environments (e.g., utility scripts)
    qnabot = {
        log: (...args) => console.log(...args),
        debug: (...args) => {}, // No-op for debug in non-Lambda
    };
}

// Security constants - Properties that enable prototype manipulation
const BLOCKED_PROPERTIES = new Set([
    '__proto__',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'constructor',
    'prototype',
    'call',
    'apply',
    'bind',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
]);

// Operators that enable assignment or mutation
const BLOCKED_OPERATORS = new Set(['=', '++', '--']);

// Allowed methods that can be called on objects
const ALLOWED_METHODS = new Set([
    'includes',
    'startsWith', 
    'endsWith',
    'indexOf',
    'toLowerCase',
    'toUpperCase',
    'trim',
]);

/**
 * Tokenize the expression into discrete tokens
 * 
 * Uses regex to split expression into:
 * - Multi-character operators (===, !==, &&, ||, etc.)
 * - String literals (single or double quoted)
 * - Numeric literals (integers and decimals)
 * - Single-character operators and punctuation
 * - Identifiers (variable names)
 * 
 * @param {string} expression - The expression to tokenize
 * @returns {Array<string>} Array of tokens
 * 
 * @example
 * tokenize("SessionAttributes.topic === 'weather'")
 * // Returns: ['SessionAttributes', '.', 'topic', '===', "'weather'"]
 */
function tokenize(expression) {
    const tokens = [];
    
    // This regex performs comprehensive single-pass tokenization of conditional expressions.
    // The complexity is inherent to the tokenization requirements and is justified for the
    // following reasons:
    //
    // 1. CORRECTNESS: The alternation order is critical - longer patterns must be matched
    //    before shorter ones to avoid partial matches (e.g., '===' before '==').
    //
    // 2. COMPREHENSIVE TOKEN COVERAGE: The regex handles distinct token types:
    //    - Multi-character comparison operators: ===, !==, ==, !=, <=, >=
    //    - Multi-character logical operators: &&, ||
    //    - Single-quoted string literals: '[^']*' (matches any content except single quotes)
    //    - Double-quoted string literals: "[^"]*" (matches any content except double quotes)
    //    - Decimal numbers: \d+\.\d+ (e.g., 3.14, 0.5)
    //    - Integer numbers: \d+ (e.g., 42, 100)
    //    - Single-character operators: [+\-<>!?:().] includes + - < > ! ? : ( ) .
    //    - Identifiers: \w+ (variable names like SessionAttributes, Question)
    //
    // 3. SECURITY: All tokens produced by this function are subsequently validated by validateTokens()
    //    which applies strict allowlist-based security checks. The tokenizer's job is only
    //    to break the expression into pieces - the validator ensures those pieces are safe.
    //
    // 4. MAINTAINABILITY: Despite the complexity, this regex is well-documented and has
    //    comprehensive test coverage. Splitting it into multiple simpler regexes would:
    //    - Reduce performance (multiple passes over the string)
    //    - Increase code complexity (need to manage multiple regex patterns and their order)
    //    - Make the tokenization logic harder to understand (scattered across multiple patterns)
    //    - Increase the risk of bugs (more complex control flow and state management)
    //
    const regex = /\s*(===|!==|==|!=|<=|>=|&&|\|\||'[^']*'|"[^"]*"|\d+\.\d+|\d+|[+\-<>!?:().[\]]|\w+)\s*/g; // NOSONAR javascript:S5843 - Regex complexity justified for tokenization use case
    
    let match;
    while ((match = regex.exec(expression)) !== null) {
        if (match[1]) {
            tokens.push(match[1]);
        }
    }
    
    return tokens;
}

/**
 * Check if token is a blocked property that could enable prototype manipulation
 * 
 * @param {string} token - Token to check
 * @throws {Error} If token is a blocked property
 * 
 * @example
 * // These will throw errors:
 * checkBlockedProperties('__proto__')
 * checkBlockedProperties('constructor')
 * checkBlockedProperties('prototype')
 */
function checkBlockedProperties(token) {
    if (BLOCKED_PROPERTIES.has(token)) {
        throw new Error(`Security violation: Property '${token}' is not allowed`);
    }
}

/**
 * Check if token is bracket notation which enables dynamic property access
 * 
 * @param {string} token - Token to check
 * @throws {Error} If token is a bracket
 * 
 * @example
 * // These will throw errors:
 * checkBracketNotation('[')
 * checkBracketNotation(']')
 * 
 * // Expression "SessionAttributes['topic']" would be blocked
 */
function checkBracketNotation(token) {
    if (token === '[' || token === ']') {
        throw new Error(`Security violation: Bracket notation not allowed`);
    }
}

/**
 * Check if token is an assignment operator
 * 
 * @param {string} token - Token to check
 * @throws {Error} If token is an assignment operator
 * 
 * @example
 * // These will throw errors:
 * checkAssignmentOperator('=')
 * checkAssignmentOperator('++')
 * checkAssignmentOperator('--')
 * 
 * // Expression "SessionAttributes.topic = 'new'" would be blocked
 */
function checkAssignmentOperator(token) {
    if (BLOCKED_OPERATORS.has(token)) {
        throw new Error(`Security violation: Operator '${token}' not allowed`);
    }
}

/**
 * Check if method call is in the allowlist
 * 
 * @param {string} token - Method name
 * @param {string} prevToken - Previous token
 * @param {string} nextToken - Next token
 * @throws {Error} If method is not in allowlist
 * 
 * @example
 * // Allowed:
 * // Question.includes('weather')
 * // SessionAttributes.topic.toLowerCase()
 * 
 * // Blocked:
 * // Question.toString()
 * // SessionAttributes.valueOf()
 */
function checkMethodCall(token, prevToken, nextToken) {
    // Pattern: . methodName (
    if (nextToken === '(' && prevToken === '.') {
        if (!ALLOWED_METHODS.has(token)) {
            const allowedList = Array.from(ALLOWED_METHODS).join(', ');
            throw new Error(
                `Security violation: Method '${token}' is not allowed. ` +
                `Allowed methods: ${allowedList}`
            );
        }
    }
}

/**
 * Check if standalone function call (not a method)
 * 
 * @param {string} token - Token to check
 * @param {string} prevToken - Previous token
 * @param {string} nextToken - Next token
 * @throws {Error} If standalone function call detected
 * 
 * @example
 * // Blocked:
 * // someFunction()
 * // eval('code')
 * 
 * // Allowed (these are methods, not standalone functions):
 * // Question.includes('test')
 */
function checkStandaloneFunctionCall(token, prevToken, nextToken) {
    // Only check identifiers (not operators or punctuation)
    if (/^[a-zA-Z_]\w*$/.test(token) && nextToken === '(' && prevToken !== '.') {
        throw new Error(
            `Security violation: Standalone function calls not allowed. ` +
            `Use dot notation for methods.`
        );
    }
}

/**
 * Check if identifier is a literal or keyword
 * 
 * @param {string} token - Token to check
 * @returns {boolean} True if token is a literal or keyword
 */
function isLiteralOrKeyword(token) {
    const literalsAndKeywords = new Set([
        'true', 'false', 'null', 'undefined'
    ]);
    return literalsAndKeywords.has(token);
}

/**
 * Check if top-level identifier is allowed in context
 * 
 * @param {string} token - Token to check
 * @param {string} prevToken - Previous token
 * @param {Array<string>} contextKeys - Allowed context property names
 * @throws {Error} If identifier is not in context
 * 
 * @example
 * // Allowed (assuming context has SessionAttributes):
 * // SessionAttributes.topic
 * // Question
 * 
 * // Blocked:
 * // unknownVariable
 * // maliciousCode
 */
function checkTopLevelIdentifier(token, prevToken, contextKeys) {
    // Only check identifiers that are not property access (not after '.')
    if (/^[a-zA-Z_]\w*$/.test(token) && prevToken !== '.') {
        if (!contextKeys.includes(token) && !isLiteralOrKeyword(token)) {
            throw new Error(
                `Security violation: Unknown identifier '${token}'. ` +
                `Allowed context properties: ${contextKeys.join(', ')}`
            );
        }
    }
}

/**
 * Validate that the tokenizer fully represents the original expression.
 * 
 * If the tokenizer silently drops characters (e.g., backticks, semicolons, curly braces),
 * those characters could enable bypass attacks (tagged template literals, statement injection).
 * This check ensures no characters were lost during tokenization.
 * 
 * @param {string} expression - The original expression
 * @param {Array<string>} tokens - The tokenized output
 * @throws {Error} If the expression contains characters not captured by the tokenizer
 */
function validateTokensCoverExpression(expression, tokens) {
    // Strip whitespace outside string literals only
    const stripped = expression.replace(/'[^']*'|"[^"]*"|\s+/g, (match) => {
        return match[0] === "'" || match[0] === '"' ? match : '';
    });
    const joined = tokens.join('');
    if (stripped !== joined) {
        throw new Error(
            'Security violation: Expression contains characters not recognized by the tokenizer'
        );
    }
}

/**
 * Validate tokens against security allowlist
 * 
 * Runs all security checks on the token stream to ensure:
 * - No prototype manipulation
 * - No dynamic property access
 * - No assignment operations
 * - Only allowed method calls
 * - No standalone function calls
 * - Only known context identifiers
 * 
 * @param {Array<string>} tokens - Array of tokens to validate
 * @param {Object} context - Sandbox context object
 * @throws {Error} If expression contains disallowed operations
 */
function validateTokens(tokens, context) {
    const contextKeys = Object.keys(context);
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const prevToken = i > 0 ? tokens[i - 1] : null;
        const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;
        
        // Run all security checks
        checkBlockedProperties(token);
        checkBracketNotation(token);
        checkAssignmentOperator(token);
        checkMethodCall(token, prevToken, nextToken);
        checkStandaloneFunctionCall(token, prevToken, nextToken);
        checkTopLevelIdentifier(token, prevToken, contextKeys);
        if (token === '?' && nextToken === '.') {
            throw new Error(`Security violation: Optional chaining (?.) is not allowed`);
        }
        // Reject calling the result of a grouped expression: (...)( ... )
        // This blocks the parenthesis-wrapping bypass where (obj.method)(args) evades checkMethodCall
        if (token === '(' && prevToken === ')') {
            throw new Error('Security violation: calling a parenthesized expression is not allowed');
        }
    }
}

/**
 * Safely evaluate the expression using Function constructor with restricted scope
 * 
 * Security: This evaluator relies on the validator to ensure the expression is safe.
 * The Function constructor creates an isolated scope with only the context properties
 * as parameters. Strict mode prevents common JavaScript pitfalls.
 * 
 * Note: The function can still access global objects (Object, Array, etc.) but the
 * validator should block any attempts to use them maliciously.
 * 
 * @param {string} expression - The validated expression string
 * @param {Object} context - Sandbox context object with allowed properties
 * @returns {*} Evaluation result (type depends on expression)
 * @throws {Error} If expression evaluation fails
 * 
 * @example
 * const context = { SessionAttributes: { topic: 'weather' }, Sentiment: 0.75 };
 * evaluateExpression("SessionAttributes.topic === 'weather'", context); // Returns: true
 * evaluateExpression("Sentiment > 0.5 ? 'positive' : 'negative'", context); // Returns: 'positive'
 */
function evaluateExpression(expression, context) {
    // Create a restricted scope with only context properties
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    
    try {
        // Use Function constructor with explicit parameters
        // This is safe because we've validated the expression tokens
        const evaluator = new Function(...contextKeys, `'use strict'; return (${expression});`); // NOSONAR javascript:S1523 - Function constructor used safely with validated expression
        return evaluator(...contextValues); // NOSONAR javascript:S1523 - Invocation of validated expression evaluator
    } catch (error) {
        throw new Error(`Expression evaluation failed: ${error.message}`);
    }
}

/**
 * Main entry point - safely evaluate a conditional chaining expression
 * 
 * This function implements a three-stage security pipeline:
 * 1. Tokenize: Break expression into discrete tokens
 * 2. Validate: Check tokens against security allowlist
 * 3. Evaluate: Execute validated expression in restricted scope
 * 
 * @param {string} expression - The expression to evaluate
 * @param {Object} context - Sandbox context with allowed properties
 * @returns {*} Evaluation result
 * @throws {Error} If expression is invalid or contains security violations
 * 
 * @example
 * const context = {
 *     SessionAttributes: { topic: 'weather', language: 'en' },
 *     Sentiment: 0.75,
 *     Question: 'What is the weather?'
 * };
 * 
 * safeEvaluate("SessionAttributes.topic === 'weather'", context); // true
 * safeEvaluate("Sentiment > 0.5 ? 'positive' : 'negative'", context); // 'positive'
 * safeEvaluate("Question.includes('weather')", context); // true
 */
function safeEvaluate(expression, context) {
    if (!expression || typeof expression !== 'string') {
        throw new Error('Expression must be a non-empty string');
    }
    
    if (!context || typeof context !== 'object') {
        throw new Error('Context must be an object');
    }
    
    qnabot.log('Safe evaluation - Expression:', expression);
    qnabot.debug('Safe evaluation - Context:', JSON.stringify(context, null, 2));
    
    // Stage 1: Tokenize
    const tokens = tokenize(expression);
    qnabot.debug('Safe evaluation - Tokens:', JSON.stringify(tokens));
    
    // Stage 1.5: Verify tokenizer captured all characters
    validateTokensCoverExpression(expression, tokens);
    
    // Stage 2: Validate
    validateTokens(tokens, context);
    
    // Stage 3: Evaluate
    const result = evaluateExpression(expression, context);
    qnabot.log('Safe evaluation - Result:', result);
    
    return result;
}

module.exports = {
    safeEvaluate,
    tokenize,
    validateTokens,
    validateTokensCoverExpression,
    evaluateExpression,
    ALLOWED_METHODS,
    BLOCKED_PROPERTIES,
    BLOCKED_OPERATORS
};
