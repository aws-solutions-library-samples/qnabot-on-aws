/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

function create() {
    const file = `${__dirname}/`;
    return require(file);
}

it('renders examples template correctly', () => {
    const template = create();
    expect(template).toMatchSnapshot({
        Resources: {
            CodeVersionCreateRecentTopicsResponse: {
                Properties: {
                    BuildDate: expect.any(String),
                },
            },
            CodeVersionCustomJSHook: {
                Properties: {
                    BuildDate: expect.any(String),
                },
            },
            CodeVersionCustomPYHook: {
                Properties: {
                    BuildDate: expect.any(String),
                },
            },
            EXTUiImportVersion: {
                Properties: {
                    BuildDate: expect.any(String),
                },
            },
            ExampleCodeVersion: {
                Properties: {
                    BuildDate: expect.any(String),
                },
            },
            JsLambdaHookSDKLambdaLayerCodeVersion: {
                Properties: {
                    BuildDate: expect.any(String),
                },
            },
        },
    });
});

it('excludes js_lambda_hooks entries without a matching handler file', () => {
    jest.isolateModules(() => {
        jest.doMock('fs', () => {
            const actual = jest.requireActual('fs');
            return {
                ...actual,
                readdirSync: (dir, options) => {
                    if (!options && dir.endsWith('js_lambda_hooks')) return ['CustomJSHook', 'MissingHandler'];
                    return actual.readdirSync(dir, options);
                },
                existsSync: (filePath) => {
                    if (filePath.includes('MissingHandler')) return false;
                    return actual.existsSync(filePath);
                },
            };
        });
        const template = require(`${__dirname}/`);
        expect(Object.keys(template.Resources)).not.toContain('EXTMissingHandler');
    });
});
