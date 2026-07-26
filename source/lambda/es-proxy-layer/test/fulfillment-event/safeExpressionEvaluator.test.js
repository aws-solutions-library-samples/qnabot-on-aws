/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const {
    safeEvaluate,
    tokenize,
    validateTokens,
    evaluateExpression,
    ALLOWED_METHODS,
    BLOCKED_PROPERTIES,
    BLOCKED_OPERATORS
} = require('../../lib/fulfillment-event/safeExpressionEvaluator');

// Mock qnabot logging
jest.mock('qnabot/logging', () => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
}));

describe('Safe Expression Evaluator', () => {
    const mockContext = {
        SessionAttributes: { 
            topic: 'weather', 
            language: 'en',
            preferences: { theme: 'dark' }
        },
        Sentiment: 0.75,
        Question: 'What is the weather?',
        LexOrAlexa: 'LEX',
        UserInfo: { userName: 'testuser', age: 25 }
    };

    describe('tokenize', () => {
        test('tokenizes simple equality comparison', () => {
            const tokens = tokenize("SessionAttributes.topic === 'weather'");
            expect(tokens).toEqual(['SessionAttributes', '.', 'topic', '===', "'weather'"]);
        });

        test('tokenizes logical AND combination', () => {
            const tokens = tokenize("SessionAttributes.topic === 'weather' && Sentiment > 0.5");
            expect(tokens).toEqual([
                'SessionAttributes', '.', 'topic', '===', "'weather'",
                '&&',
                'Sentiment', '>', '0.5'
            ]);
        });

        test('tokenizes ternary operator', () => {
            const tokens = tokenize("Sentiment > 0.5 ? 'positive' : 'negative'");
            expect(tokens).toEqual([
                'Sentiment', '>', '0.5', '?', "'positive'", ':', "'negative'"
            ]);
        });

        test('tokenizes string concatenation', () => {
            const tokens = tokenize("'Hello ' + UserInfo.userName");
            expect(tokens).toEqual(["'Hello '", '+', 'UserInfo', '.', 'userName']);
        });

        test('tokenizes method call', () => {
            const tokens = tokenize("Question.includes('weather')");
            expect(tokens).toEqual(['Question', '.', 'includes', '(', "'weather'", ')']);
        });

        test('tokenizes nested property access', () => {
            const tokens = tokenize("SessionAttributes.preferences.theme");
            expect(tokens).toEqual([
                'SessionAttributes', '.', 'preferences', '.', 'theme'
            ]);
        });

        test('tokenizes decimal numbers', () => {
            const tokens = tokenize("Sentiment > 0.75");
            expect(tokens).toEqual(['Sentiment', '>', '0.75']);
        });

        test('tokenizes integer numbers', () => {
            const tokens = tokenize("UserInfo.age >= 18");
            expect(tokens).toEqual(['UserInfo', '.', 'age', '>=', '18']);
        });

        test('handles double quotes', () => {
            const tokens = tokenize('SessionAttributes.topic === "weather"');
            expect(tokens).toEqual(['SessionAttributes', '.', 'topic', '===', '"weather"']);
        });

        test('handles empty strings', () => {
            const tokens = tokenize("SessionAttributes.topic === ''");
            expect(tokens).toEqual(['SessionAttributes', '.', 'topic', '===', "''"]);
        });

        test('handles parentheses for grouping', () => {
            const tokens = tokenize("(Sentiment > 0.5) && (Question.length < 100)");
            expect(tokens).toEqual([
                '(', 'Sentiment', '>', '0.5', ')',
                '&&',
                '(', 'Question', '.', 'length', '<', '100', ')'
            ]);
        });

        test('handles strings with apostrophes in method calls', () => {
            const tokens = tokenize(`Question.includes("don't")`);
            expect(tokens).toEqual(['Question', '.', 'includes', '(', `"don't"`, ')']);
        });

        test('handles strings with apostrophes in comparisons', () => {
            const tokens = tokenize(`SessionAttributes.topic === "user's preference"`);
            expect(tokens).toEqual(['SessionAttributes', '.', 'topic', '===', `"user's preference"`]);
        });

        test('handles strings with multiple apostrophes', () => {
            const tokens = tokenize(`Question === "It's John's book"`);
            expect(tokens).toEqual(['Question', '===', `"It's John's book"`]);
        });
    });

    describe('validateTokens - Security Checks', () => {
        describe('blocks prototype manipulation', () => {
            test('blocks __proto__', () => {
                const tokens = tokenize('Question.__proto__');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Property '__proto__' is not allowed");
            });

            test('blocks constructor', () => {
                const tokens = tokenize('Question.constructor');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Property 'constructor' is not allowed");
            });

            test('blocks prototype', () => {
                const tokens = tokenize('SessionAttributes.prototype');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Property 'prototype' is not allowed");
            });

            test('blocks __defineGetter__', () => {
                const tokens = tokenize('Question.__defineGetter__');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Property '__defineGetter__' is not allowed");
            });

            test('blocks __defineSetter__', () => {
                const tokens = tokenize('Question.__defineSetter__');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Property '__defineSetter__' is not allowed");
            });
        });

        describe('blocks bracket notation', () => {
            test('blocks opening bracket', () => {
                const tokens = ['SessionAttributes', '[', "'topic'", ']'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Bracket notation not allowed');
            });

            test('blocks closing bracket', () => {
                const tokens = ['SessionAttributes', ']'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Bracket notation not allowed');
            });
        });

        describe('blocks assignment operators', () => {
            test('blocks assignment operator', () => {
                const tokens = tokenize('SessionAttributes.topic');
                tokens.push('=', "'new'");
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Operator '=' not allowed");
            });

            test('blocks increment operator', () => {
                const tokens = ['UserInfo', '.', 'age', '++'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Operator '++' not allowed");
            });

            test('blocks decrement operator', () => {
                const tokens = ['UserInfo', '.', 'age', '--'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Operator '--' not allowed");
            });
        });

        describe('validates method calls', () => {
            test('allows method in allowlist', () => {
                const tokens = tokenize("Question.includes('weather')");
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });

            test('blocks method not in allowlist', () => {
                const tokens = tokenize('Question.toString()');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Security violation');
            });

            test('blocks valueOf method', () => {
                const tokens = tokenize('SessionAttributes.valueOf()');
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Security violation');
            });

            test('blocks slice method (trimmed from allowlist)', () => {
                const tokens = tokenize("Question.slice(0, 5)");
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Method 'slice' is not allowed");
            });

            test('blocks substring method (trimmed from allowlist)', () => {
                const tokens = tokenize("Question.substring(0, 5)");
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Method 'substring' is not allowed");
            });

            test('blocks lastIndexOf method (trimmed from allowlist)', () => {
                const tokens = tokenize("Question.lastIndexOf('a')");
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Method 'lastIndexOf' is not allowed");
            });

            test('allows chained method calls', () => {
                const tokens = tokenize("Question.toLowerCase().includes('weather')");
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });
        });

        describe('blocks standalone function calls', () => {
            test('blocks standalone function', () => {
                const tokens = ['someFunction', '(', ')'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Standalone function calls not allowed');
            });

            test('blocks eval', () => {
                const tokens = ['eval', '(', "'code'", ')'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Standalone function calls not allowed');
            });

            test('allows method calls (not standalone)', () => {
                const tokens = tokenize('Question.includes("test")');
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });
        });

        describe('validates top-level identifiers', () => {
            test('allows context properties', () => {
                const tokens = tokenize('SessionAttributes.topic');
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });

            test('blocks unknown identifiers', () => {
                const tokens = ['unknownVariable'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Unknown identifier 'unknownVariable'");
            });

            test('allows boolean literals', () => {
                const tokens = ['true'];
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });

            test('allows null literal', () => {
                const tokens = ['null'];
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });

            test('allows undefined literal', () => {
                const tokens = ['undefined'];
                expect(() => validateTokens(tokens, mockContext)).not.toThrow();
            });
        });
    });

    describe('evaluateExpression', () => {
        test('evaluates simple comparison', () => {
            const result = evaluateExpression(
                "SessionAttributes.topic === 'weather'",
                mockContext
            );
            expect(result).toBe(true);
        });

        test('evaluates logical AND', () => {
            const result = evaluateExpression(
                "SessionAttributes.topic === 'weather' && Sentiment > 0.5",
                mockContext
            );
            expect(result).toBe(true);
        });

        test('evaluates ternary operator', () => {
            const result = evaluateExpression(
                "Sentiment > 0.5 ? 'positive' : 'negative'",
                mockContext
            );
            expect(result).toBe('positive');
        });

        test('evaluates string concatenation', () => {
            const result = evaluateExpression(
                "'Hello ' + UserInfo.userName",
                mockContext
            );
            expect(result).toBe('Hello testuser');
        });

        test('evaluates method call', () => {
            const result = evaluateExpression(
                "Question.includes('weather')",
                mockContext
            );
            expect(result).toBe(true);
        });

        test('evaluates nested property access', () => {
            const result = evaluateExpression(
                "SessionAttributes.preferences.theme === 'dark'",
                mockContext
            );
            expect(result).toBe(true);
        });

        test('evaluates chained method calls', () => {
            const result = evaluateExpression(
                "Question.toLowerCase().includes('weather')",
                mockContext
            );
            expect(result).toBe(true);
        });

        test('throws error for invalid expression', () => {
            expect(() => evaluateExpression('invalid syntax !!!', mockContext))
                .toThrow('Expression evaluation failed');
        });
    });

    describe('safeEvaluate - Integration Tests', () => {
        describe('valid expressions', () => {
            test('simple equality comparison', () => {
                expect(safeEvaluate("SessionAttributes.topic === 'weather'", mockContext))
                    .toBe(true);
            });

            test('inequality comparison', () => {
                expect(safeEvaluate("SessionAttributes.topic !== 'sports'", mockContext))
                    .toBe(true);
            });

            test('greater than comparison', () => {
                expect(safeEvaluate('Sentiment > 0.5', mockContext))
                    .toBe(true);
            });

            test('less than or equal comparison', () => {
                expect(safeEvaluate('UserInfo.age <= 30', mockContext))
                    .toBe(true);
            });

            test('logical AND', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic === 'weather' && Sentiment > 0.5",
                    mockContext
                )).toBe(true);
            });

            test('logical OR', () => {
                expect(safeEvaluate(
                    "LexOrAlexa === 'LEX' || LexOrAlexa === 'ALEXA'",
                    mockContext
                )).toBe(true);
            });

            test('logical NOT', () => {
                expect(safeEvaluate('!false', mockContext))
                    .toBe(true);
            });

            test('ternary operator - true branch', () => {
                expect(safeEvaluate(
                    "Sentiment > 0.5 ? 'positive' : 'negative'",
                    mockContext
                )).toBe('positive');
            });

            test('ternary operator - false branch', () => {
                expect(safeEvaluate(
                    "Sentiment < 0.5 ? 'positive' : 'negative'",
                    mockContext
                )).toBe('negative');
            });

            test('string concatenation', () => {
                expect(safeEvaluate(
                    "'Hello ' + UserInfo.userName",
                    mockContext
                )).toBe('Hello testuser');
            });

            test('includes method', () => {
                expect(safeEvaluate("Question.includes('weather')", mockContext))
                    .toBe(true);
            });

            test('startsWith method', () => {
                expect(safeEvaluate("Question.startsWith('What')", mockContext))
                    .toBe(true);
            });

            test('toLowerCase method', () => {
                expect(safeEvaluate("LexOrAlexa.toLowerCase()", mockContext))
                    .toBe('lex');
            });

            test('chained method calls', () => {
                expect(safeEvaluate(
                    "Question.toLowerCase().includes('weather')",
                    mockContext
                )).toBe(true);
            });

            test('nested property access', () => {
                expect(safeEvaluate(
                    "SessionAttributes.preferences.theme === 'dark'",
                    mockContext
                )).toBe(true);
            });

            test('complex expression with grouping', () => {
                expect(safeEvaluate(
                    "(Sentiment > 0.5) && (UserInfo.age >= 18)",
                    mockContext
                )).toBe(true);
            });

            test('subtraction', () => {
                expect(safeEvaluate('UserInfo.age - 5', mockContext))
                    .toBe(20);
            });

            test('addition', () => {
                expect(safeEvaluate('UserInfo.age + 5', mockContext))
                    .toBe(30);
            });
        });

        describe('security violations', () => {
            test('rejects prototype manipulation', () => {
                expect(() => safeEvaluate('Question.__proto__', mockContext))
                    .toThrow("Property '__proto__' is not allowed");
            });

            test('rejects constructor access', () => {
                expect(() => safeEvaluate('Question.constructor', mockContext))
                    .toThrow("Property 'constructor' is not allowed");
            });

            test('rejects bracket notation', () => {
                // Bracket notation requires actual bracket characters in expression
                // Our tokenizer doesn't extract [ from strings, so test with manual tokens
                const tokens = ['SessionAttributes', '[', "'topic'", ']'];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow('Bracket notation not allowed');
            });

            test('rejects assignment', () => {
                // Assignment requires = token, test with manual tokens
                const tokens = ['SessionAttributes', '.', 'topic', '=', "'new'"];
                expect(() => validateTokens(tokens, mockContext))
                    .toThrow("Operator '=' not allowed");
            });

            test('rejects non-allowed methods', () => {
                expect(() => safeEvaluate('Question.toString()', mockContext))
                    .toThrow('Security violation');
            });

            test('rejects standalone function calls', () => {
                expect(() => safeEvaluate('eval("code")', mockContext))
                    .toThrow('Standalone function calls not allowed');
            });

            test('rejects unknown identifiers', () => {
                expect(() => safeEvaluate('unknownVariable', mockContext))
                    .toThrow("Unknown identifier 'unknownVariable'");
            });
        });

        describe('edge cases', () => {
            test('handles empty string comparison', () => {
                expect(safeEvaluate("SessionAttributes.topic !== ''", mockContext))
                    .toBe(true);
            });

            test('handles null comparison', () => {
                expect(safeEvaluate('SessionAttributes.topic !== null', mockContext))
                    .toBe(true);
            });

            test('handles undefined comparison', () => {
                expect(safeEvaluate('SessionAttributes.nonExistent === undefined', mockContext))
                    .toBe(true);
            });

            test('throws error for empty expression', () => {
                expect(() => safeEvaluate('', mockContext))
                    .toThrow('Expression must be a non-empty string');
            });

            test('throws error for non-string expression', () => {
                expect(() => safeEvaluate(123, mockContext))
                    .toThrow('Expression must be a non-empty string');
            });

            test('throws error for null context', () => {
                expect(() => safeEvaluate('true', null))
                    .toThrow('Context must be an object');
            });
        });
    });

    describe('validateTokensCoverExpression - Post-tokenization validation', () => {
        const { validateTokensCoverExpression } = require('../../lib/fulfillment-event/safeExpressionEvaluator');

        test('blocks tagged template literal bypass (backticks)', () => {
            expect(() => safeEvaluate("SessionAttributes.topic.endsWith`test`", mockContext))
                .toThrow('characters not recognized by the tokenizer');
        });

        test('blocks semicolons', () => {
            expect(() => safeEvaluate("SessionAttributes.topic; malicious()", mockContext))
                .toThrow('characters not recognized by the tokenizer');
        });

        test('blocks curly braces', () => {
            expect(() => safeEvaluate("SessionAttributes.topic; {}", mockContext))
                .toThrow('characters not recognized by the tokenizer');
        });

        test('blocks backslashes', () => {
            expect(() => safeEvaluate("SessionAttributes.topic\\n", mockContext))
                .toThrow('characters not recognized by the tokenizer');
        });

        test('allows valid expressions with spaces in strings', () => {
            expect(safeEvaluate("'Hello ' + UserInfo.userName", mockContext))
                .toBe('Hello testuser');
        });

        test('allows valid expressions with tabs and newlines', () => {
            expect(safeEvaluate("SessionAttributes.topic\t===\n'weather'", mockContext))
                .toBe(true);
        });

        test('passes for simple valid expression', () => {
            expect(() => validateTokensCoverExpression(
                "SessionAttributes.topic === 'weather'",
                ['SessionAttributes', '.', 'topic', '===', "'weather'"]
            )).not.toThrow();
        });

        test('fails when backtick is dropped', () => {
            expect(() => validateTokensCoverExpression(
                "SessionAttributes.topic.endsWith`test`",
                ['SessionAttributes', '.', 'topic', '.', 'endsWith', 'test']
            )).toThrow('characters not recognized by the tokenizer');
        });
    });

    describe('constants', () => {
        test('ALLOWED_METHODS contains expected methods', () => {
            expect(ALLOWED_METHODS.has('includes')).toBe(true);
            expect(ALLOWED_METHODS.has('startsWith')).toBe(true);
            expect(ALLOWED_METHODS.has('toLowerCase')).toBe(true);
        });

        test('BLOCKED_PROPERTIES contains dangerous properties', () => {
            expect(BLOCKED_PROPERTIES.has('__proto__')).toBe(true);
            expect(BLOCKED_PROPERTIES.has('constructor')).toBe(true);
            expect(BLOCKED_PROPERTIES.has('prototype')).toBe(true);
        });

        test('BLOCKED_OPERATORS contains assignment operators', () => {
            expect(BLOCKED_OPERATORS.has('=')).toBe(true);
            expect(BLOCKED_OPERATORS.has('++')).toBe(true);
            expect(BLOCKED_OPERATORS.has('--')).toBe(true);
        });
    });

    describe('Real-World Integration Tests', () => {
        const realisticContext = {
            LexOrAlexa: 'LEX',
            UserInfo: { 
                userName: 'john_doe',
                userId: 'user123',
                preferredLanguage: 'en'
            },
            SessionAttributes: { 
                topic: 'weather',
                previousTopic: 'sports',
                userIntent: 'query',
                conversationState: 'active',
                language: 'en-US'
            },
            Slots: {
                city: 'Seattle',
                date: '2026-01-26'
            },
            Settings: {
                enableFeedback: true,
                maxRetries: 3
            },
            Question: 'What is the weather in Seattle?',
            OrigQuestion: 'weather seattle',
            PreviousQuestion: 'What sports are popular?',
            Sentiment: 0.8
        };

        describe('Topic-based routing', () => {
            test('route based on topic match', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic === 'weather' ? 'WeatherQID' : 'GeneralQID'",
                    realisticContext
                )).toBe('WeatherQID');
            });

            test('route based on multiple topic conditions', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic === 'weather' || SessionAttributes.topic === 'forecast' ? 'WeatherQID' : 'OtherQID'",
                    realisticContext
                )).toBe('WeatherQID');
            });

            test('route based on topic change detection', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic !== SessionAttributes.previousTopic",
                    realisticContext
                )).toBe(true);
            });
        });

        describe('Sentiment-based routing', () => {
            test('route based on positive sentiment', () => {
                expect(safeEvaluate(
                    "Sentiment > 0.5 ? 'PositiveResponseQID' : 'NegativeResponseQID'",
                    realisticContext
                )).toBe('PositiveResponseQID');
            });

            test('route based on sentiment thresholds', () => {
                expect(safeEvaluate(
                    "Sentiment >= 0.7 && SessionAttributes.topic === 'weather'",
                    realisticContext
                )).toBe(true);
            });

            test('route based on negative sentiment', () => {
                const negativeContext = { ...realisticContext, Sentiment: 0.2 };
                expect(safeEvaluate(
                    "Sentiment < 0.5 ? 'EscalationQID' : 'ContinueQID'",
                    negativeContext
                )).toBe('EscalationQID');
            });
        });

        describe('Platform-based routing', () => {
            test('route based on Lex vs Alexa', () => {
                expect(safeEvaluate(
                    "LexOrAlexa === 'LEX' ? 'LexSpecificQID' : 'AlexaSpecificQID'",
                    realisticContext
                )).toBe('LexSpecificQID');
            });

            test('check if platform is Alexa', () => {
                const alexaContext = { ...realisticContext, LexOrAlexa: 'ALEXA' };
                expect(safeEvaluate(
                    "LexOrAlexa === 'ALEXA'",
                    alexaContext
                )).toBe(true);
            });
        });

        describe('Question content analysis', () => {
            test('route based on question keywords', () => {
                expect(safeEvaluate(
                    "Question.toLowerCase().includes('weather')",
                    realisticContext
                )).toBe(true);
            });

            test('route based on question prefix', () => {
                expect(safeEvaluate(
                    "Question.startsWith('What') ? 'InformationalQID' : 'ActionQID'",
                    realisticContext
                )).toBe('InformationalQID');
            });

            test('route based on question length', () => {
                expect(safeEvaluate(
                    "Question.length > 10 ? 'DetailedQID' : 'SimpleQID'",
                    realisticContext
                )).toBe('DetailedQID');
            });

            test('check if question contains specific terms', () => {
                expect(safeEvaluate(
                    "Question.toLowerCase().includes('seattle') && Question.toLowerCase().includes('weather')",
                    realisticContext
                )).toBe(true);
            });
        });

        describe('Slot-based routing', () => {
            test('route based on slot value', () => {
                expect(safeEvaluate(
                    "Slots.city === 'Seattle' ? 'SeattleWeatherQID' : 'GeneralWeatherQID'",
                    realisticContext
                )).toBe('SeattleWeatherQID');
            });

            test('check if slot exists', () => {
                expect(safeEvaluate(
                    "Slots.city !== undefined && Slots.city !== null",
                    realisticContext
                )).toBe(true);
            });
        });

        describe('Language and localization routing', () => {
            test('route based on language preference', () => {
                expect(safeEvaluate(
                    "SessionAttributes.language.startsWith('en') ? 'EnglishQID' : 'OtherLanguageQID'",
                    realisticContext
                )).toBe('EnglishQID');
            });

            test('route based on user language setting', () => {
                expect(safeEvaluate(
                    "UserInfo.preferredLanguage === 'en' ? 'EnglishGreeting' : 'SpanishGreeting'",
                    realisticContext
                )).toBe('EnglishGreeting');
            });
        });

        describe('Complex multi-condition routing', () => {
            test('route based on topic, sentiment, and platform', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic === 'weather' && Sentiment > 0.5 && LexOrAlexa === 'LEX'",
                    realisticContext
                )).toBe(true);
            });

            test('nested ternary for multi-level routing', () => {
                expect(safeEvaluate(
                    "Sentiment > 0.7 ? 'VeryPositiveQID' : (Sentiment > 0.4 ? 'NeutralQID' : 'NegativeQID')",
                    realisticContext
                )).toBe('VeryPositiveQID');
            });

            test('complex boolean logic with grouping', () => {
                expect(safeEvaluate(
                    "(SessionAttributes.topic === 'weather' || SessionAttributes.topic === 'forecast') && (Sentiment > 0.5 || Question.toLowerCase().includes('urgent'))",
                    realisticContext
                )).toBe(true);
            });

            test('string building for dynamic QID names', () => {
                expect(safeEvaluate(
                    "'QID_' + SessionAttributes.topic + '_' + LexOrAlexa",
                    realisticContext
                )).toBe('QID_weather_LEX');
            });
        });

        describe('Settings and configuration routing', () => {
            test('route based on feature flag', () => {
                expect(safeEvaluate(
                    "Settings.enableFeedback === true ? 'FeedbackEnabledQID' : 'StandardQID'",
                    realisticContext
                )).toBe('FeedbackEnabledQID');
            });

            test('route based on retry count', () => {
                expect(safeEvaluate(
                    "Settings.maxRetries > 2",
                    realisticContext
                )).toBe(true);
            });
        });

        describe('Conversation state routing', () => {
            test('route based on conversation state', () => {
                expect(safeEvaluate(
                    "SessionAttributes.conversationState === 'active' ? 'ContinueQID' : 'RestartQID'",
                    realisticContext
                )).toBe('ContinueQID');
            });

            test('check if previous question exists', () => {
                expect(safeEvaluate(
                    "PreviousQuestion !== false && PreviousQuestion !== null",
                    realisticContext
                )).toBe(true);
            });

            test('route based on original vs current question', () => {
                expect(safeEvaluate(
                    "Question !== OrigQuestion",
                    realisticContext
                )).toBe(true);
            });
        });

        describe('User identification routing', () => {
            test('route based on user ID presence', () => {
                expect(safeEvaluate(
                    "UserInfo.userId !== undefined ? 'AuthenticatedQID' : 'GuestQID'",
                    realisticContext
                )).toBe('AuthenticatedQID');
            });

            test('personalized greeting with username', () => {
                expect(safeEvaluate(
                    "'Hello_' + UserInfo.userName",
                    realisticContext
                )).toBe('Hello_john_doe');
            });
        });

        describe('Edge case expressions', () => {
            test('handles null session attribute gracefully', () => {
                const contextWithNull = { 
                    ...realisticContext, 
                    SessionAttributes: { ...realisticContext.SessionAttributes, optionalField: null }
                };
                expect(safeEvaluate(
                    "SessionAttributes.optionalField === null",
                    contextWithNull
                )).toBe(true);
            });

            test('handles undefined property access', () => {
                expect(safeEvaluate(
                    "SessionAttributes.nonExistentProperty === undefined",
                    realisticContext
                )).toBe(true);
            });

            test('handles boolean negation in routing', () => {
                const contextWithFlag = {
                    ...realisticContext,
                    SessionAttributes: { ...realisticContext.SessionAttributes, optOut: false }
                };
                expect(safeEvaluate(
                    "!SessionAttributes.optOut ? 'EnabledQID' : 'DisabledQID'",
                    contextWithFlag
                )).toBe('EnabledQID');
            });

            test('handles case-insensitive comparison', () => {
                expect(safeEvaluate(
                    "SessionAttributes.language.toLowerCase() === 'en-us'",
                    realisticContext
                )).toBe(true);
            });

            test('handles whitespace trimming', () => {
                const contextWithSpaces = {
                    ...realisticContext,
                    Question: '  What is the weather?  '
                };
                expect(safeEvaluate(
                    "Question.trim().startsWith('What')",
                    contextWithSpaces
                )).toBe(true);
            });
        });

        describe('Fuzz Testing - Edge Cases', () => {
            test('handles extreme whitespace', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic     ===     'weather'",
                    realisticContext
                )).toBe(true);
            });

            test('handles tabs and newlines in expression', () => {
                expect(safeEvaluate(
                    "SessionAttributes.topic\t===\n'weather'",
                    realisticContext
                )).toBe(true);
            });

            test('handles very long string literals', () => {
                const longString = 'a'.repeat(500);
                const contextWithLong = {
                    ...realisticContext,
                    SessionAttributes: { ...realisticContext.SessionAttributes, longValue: longString }
                };
                expect(safeEvaluate(
                    `SessionAttributes.longValue.length > 400`,
                    contextWithLong
                )).toBe(true);
            });

            test('handles deeply nested property access', () => {
                const deepContext = {
                    ...realisticContext,
                    SessionAttributes: {
                        level1: {
                            level2: {
                                level3: {
                                    level4: 'deep'
                                }
                            }
                        }
                    }
                };
                expect(safeEvaluate(
                    "SessionAttributes.level1.level2.level3.level4 === 'deep'",
                    deepContext
                )).toBe(true);
            });

            test('handles multiple parentheses nesting', () => {
                expect(safeEvaluate(
                    "((Sentiment > 0.5) && (SessionAttributes.topic === 'weather'))",
                    realisticContext
                )).toBe(true);
            });

            test('handles empty string in various positions', () => {
                expect(safeEvaluate(
                    "'' + SessionAttributes.topic + ''",
                    realisticContext
                )).toBe('weather');
            });

            test('rejects malformed expression with unmatched parentheses', () => {
                expect(() => safeEvaluate(
                    "SessionAttributes.topic === 'weather')",
                    realisticContext
                )).toThrow();
            });

            test('handles comparison with zero', () => {
                const zeroContext = { ...realisticContext, Sentiment: 0 };
                expect(safeEvaluate(
                    "Sentiment === 0",
                    zeroContext
                )).toBe(true);
            });

            test('handles comparison with negative numbers (as separate tokens)', () => {
                const negContext = { ...realisticContext, Sentiment: -0.5 };
                expect(safeEvaluate(
                    "Sentiment < 0",
                    negContext
                )).toBe(true);
            });

            test('handles multiple string concatenations', () => {
                expect(safeEvaluate(
                    "'A' + 'B' + 'C' + 'D'",
                    realisticContext
                )).toBe('ABCD');
            });
        });
    });

    describe('Optional chaining security', () => {
        const ctx = { SessionAttributes: { topic: 'weather' }, Question: 'test' };

        test('blocks optional chaining call (?.()', () => {
            expect(() => safeEvaluate(
                'SessionAttributes.qnabotcontext.navigation.previous.push?.(Question.includes.call)',
                ctx
            )).toThrow('Optional chaining');
        });

        test('blocks optional chaining bind (bind?.()', () => {
            // 'call' is now in BLOCKED_PROPERTIES, so it throws before reaching the ?. check.
            // The expression 'Question.includes.call.bind?.(...)' is still correctly blocked
            // — just at an earlier check (BLOCKED_PROPERTIES fires on 'call' token first).
            expect(() => safeEvaluate(
                'Question.includes.call.bind?.(Question.includes.apply)',
                ctx
            )).toThrow('Security violation');
        });

        test('allows ternary operator (? is not optional chaining when followed by identifier)', () => {
            expect(safeEvaluate("SessionAttributes.topic === 'weather' ? 'yes' : 'no'", ctx))
                .toBe('yes');
        });

        test('allows ternary operator with parenthesized consequent (? followed by open paren)', () => {
            expect(safeEvaluate("Sentiment > 0.5 ? (Sentiment > 0.3 ? 'a' : 'b') : 'c'",
                { Sentiment: 0.8 })).toBe('a');
        });

        test('still blocks optional chaining (?. pattern)', () => {
            expect(() => safeEvaluate(
                'SessionAttributes.qnabotcontext.navigation.previous.push?.(Question.includes.call)',
                ctx
            )).toThrow('Optional chaining');
        });
    });

    describe('Prototype method property access security', () => {
        const ctx = {
            SessionAttributes: { topic: 'weather', qnabotcontext: { navigation: { previous: [] } } },
            Question: 'test',
        };

        // Fix A: call, apply, bind must be blocked as property references
        test('blocks .call as property reference', () => {
            expect(() => safeEvaluate("Question.includes.call", ctx))
                .toThrow('Security violation');
        });

        test('blocks .apply as property reference', () => {
            expect(() => safeEvaluate("Question.includes.apply", ctx))
                .toThrow('Security violation');
        });

        test('blocks .bind as property reference', () => {
            expect(() => safeEvaluate("Question.includes.bind", ctx))
                .toThrow('Security violation');
        });

        test('blocks .toString as property reference', () => {
            expect(() => safeEvaluate("Question.toString", ctx))
                .toThrow('Security violation');
        });

        test('blocks .valueOf as property reference', () => {
            expect(() => safeEvaluate("Question.valueOf", ctx))
                .toThrow('Security violation');
        });

        test('blocks .hasOwnProperty as property reference', () => {
            expect(() => safeEvaluate("SessionAttributes.hasOwnProperty", ctx))
                .toThrow('Security violation');
        });

        test('blocks .isPrototypeOf as property reference', () => {
            expect(() => safeEvaluate("SessionAttributes.isPrototypeOf", ctx))
                .toThrow('Security violation');
        });

        test('blocks .propertyIsEnumerable as property reference', () => {
            expect(() => safeEvaluate("SessionAttributes.propertyIsEnumerable", ctx))
                .toThrow('Security violation');
        });

        test('blocks .toLocaleString as property reference', () => {
            expect(() => safeEvaluate("Question.toLocaleString", ctx))
                .toThrow('Security violation');
        });

        // Fix A: parenthesis-wrapping bypass (PoC Stage 1 pattern) must now be blocked
        // Previously (push)(...) bypassed checkMethodCall because nextToken after push was ) not (
        // Now .call/.apply/.bind in BLOCKED_PROPERTIES fire before the parenthesis pattern matters
        test('blocks parenthesis-wrapping with call.bind(apply)', () => {
            expect(() => safeEvaluate(
                '(SessionAttributes.qnabotcontext.navigation.previous.push)((Question.includes.call.bind)(Question.includes.apply))',
                ctx
            )).toThrow('Security violation');
        });

        test('blocks full conditionalChaining expression using parenthesis-wrapping', () => {
            const fullExpr = [
                '(SessionAttributes.qnabotcontext.navigation.previous.push)((Question.includes.call.bind)(Question.includes.apply))',
                '(SessionAttributes.qnabotcontext.navigation.previous.push)(Question.split)',
                '(SessionAttributes.qnabotcontext.navigation.previous.push)((SessionAttributes.qnabotcontext.navigation.previous.fill.bind)(SessionAttributes.qnabotcontext.navigation.previous))',
                '(SessionAttributes.qnabotcontext.navigation.previous.push)("slot")',
                '"revenge isolated mango target"',
            ].join(' && ');
            expect(() => safeEvaluate(fullExpr, ctx)).toThrow('Security violation');
        });

        // Existing allowed methods must still work after Fix A
        test('still allows allowed methods: includes, startsWith, endsWith, toLowerCase, toUpperCase, trim, indexOf', () => {
            expect(safeEvaluate("Question.includes('test')", ctx)).toBe(true);
            expect(safeEvaluate("Question.startsWith('te')", ctx)).toBe(true);
            expect(safeEvaluate("Question.endsWith('st')", ctx)).toBe(true);
            expect(safeEvaluate("Question.toLowerCase()", ctx)).toBe('test');
            expect(safeEvaluate("Question.toUpperCase()", ctx)).toBe('TEST');
            expect(safeEvaluate("Question.trim()", ctx)).toBe('test');
            expect(safeEvaluate("Question.indexOf('es')", ctx)).toBe(1);
        });

        // Ternary operator still works (not confused with optional chaining)
        test('still allows ternary operator (? is not a blocked token)', () => {
            expect(safeEvaluate(
                "SessionAttributes.topic === 'weather' ? 'yes' : 'no'",
                ctx
            )).toBe('yes');
        });
    });

    describe('parenthesis-wrapping structural fix', () => {
        const ctx = {
            SessionAttributes: { topic: 'weather', qnabotcontext: { navigation: { previous: [] } } },
            Question: 'test',
            Sentiment: 0.75,
        };

        test('blocks (Question.split)(a) via parenthesis-wrapping — non-blocklisted method', () => {
            expect(() => safeEvaluate("(Question.split)('a')", ctx))
                .toThrow('Security violation: calling a parenthesized expression is not allowed');
        });

        test('blocks (SessionAttributes...push)(x) via parenthesis-wrapping', () => {
            expect(() => safeEvaluate(
                "(SessionAttributes.qnabotcontext.navigation.previous.push)('x')",
                ctx
            )).toThrow('Security violation: calling a parenthesized expression is not allowed');
        });

        test('regression: legitimate grouping (Sentiment > 0.5) && (Question.includes) still works', () => {
            expect(safeEvaluate(
                "(Sentiment > 0.5) && (Question.includes('test'))",
                ctx
            )).toBe(true);
        });

        test('regression: (a > b) grouping for precedence still works', () => {
            expect(safeEvaluate(
                "(Sentiment > 0.5) ? 'positive' : 'negative'",
                ctx
            )).toBe('positive');
        });
    });
});
