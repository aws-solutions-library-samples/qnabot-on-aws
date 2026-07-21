/** ************************************************************************************************
*   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                             *
*   SPDX-License-Identifier: Apache-2.0                                                            *
 ************************************************************************************************ */

const fs = require('fs');
const _ = require('lodash');

const js_example = fs.readdirSync(`${__dirname}/examples/js`)
    .filter((x) => !x.match(/(.*).(test|fixtures).js/)) // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
    .filter((x) => x.match(/(.*).js/)) // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
    .map((file) => {
        const name = file.match(/(.*).js/)[1]; // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
        return `ExampleJSLambda${name}`;
    });
const py_example = fs.readdirSync(`${__dirname}/examples/py`, { withFileTypes: true })
    .filter((x) => x.isFile())
    .map((x) => x.name)
    .filter((x) => x.match(/(.*).py/)) // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
    .map((file) => {
        const name = file.match(/(.*).py/)[1]; // NOSONAR - javascript:S5852 - Cannot expose DOS attacks since this regex is only used during deployment
        return `ExamplePYTHONLambda${name}`;
    });

const js_ext = fs.readdirSync(`${__dirname}/extensions/js_lambda_hooks`)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => fs.existsSync(`${__dirname}/extensions/js_lambda_hooks/${name}/${name}.js`))
    .map((name) => `EXT${name}`);

const py_ext = fs.readdirSync(`${__dirname}/extensions/py_lambda_hooks`)
    .filter((name) => !name.startsWith('.'))
    .map((name) => `EXT${name}`);

exports.names = js_example.concat(py_example).concat(js_ext).concat(py_ext).sort((a, b) => a.localeCompare(b));

const out = _.fromPairs(exports.names.map((x) => [x, { Value: { 'Fn::GetAtt': [x, 'Arn'] } }]));

exports.outputs = out;
