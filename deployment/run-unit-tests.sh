#!/bin/bash
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      			 #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################


# This script runs all tests for the root CDK project, as well as any microservices, Lambda functions, or dependency
# source code packages. These include unit tests, integration tests, and snapshot tests.
#
# This script is called by the ../initialize-repo.sh file and the buildspec.yml file. It is important that this script
# be tested and validated to ensure that all available test fixtures are run.
#
# The if/then blocks are for error handling. They will cause the script to stop executing if an error is thrown from the
# node process running the test case(s). Removing them or not using them for additional calls with result in the
# script continuing to execute despite an error being thrown.

[ "$DEBUG" == 'true' ] && set -x
set -e

if command -v poetry >/dev/null 2>&1; then
    POETRY_COMMAND="poetry"
elif [ -n "$POETRY_HOME" ] && [ -x "$POETRY_HOME/bin/poetry" ]; then
    POETRY_COMMAND="$POETRY_HOME/bin/poetry"
else
    echo "Poetry is not available. Aborting script." >&2
    exit 1
fi

run_python_unit_test() {
	directory=$1
	description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Python : $directory, $description"
	echo "------------------------------------------------------------------------------"

	"$POETRY_COMMAND" install
	source $("$POETRY_COMMAND" env info --path)/bin/activate

	# setup coverage report path
	mkdir -p $source_dir/test/coverage-reports
	coverage_report_path=$source_dir/test/coverage-reports/$directory.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use -vv for debugging
	python3 -m pytest --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"
	if [ "$?" = "1" ]; then
		echo "(deployment/run-unit-tests.sh) ERROR: there is likely output above." 1>&2
		deactivate
		exit 1
	fi
	echo "source dir is $source_dir"
	sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path
	echo "deactivate virtual environment"
	deactivate

	if [ "${CLEAN:-true}" = "true" ]; then
		# Note: leaving $source_dir/test/coverage-reports to allow further processing of coverage reports
		rm -fr coverage
		rm .coverage
	fi
}

run_javascript_lambda_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Javascript Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && npm run clean
	npm ci
	npm test
	if [ "$?" = "1" ]; then
		echo "(source/run-unit-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
    [ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
    mkdir -p $source_dir/test/coverage-reports/jest/$lambda_name
    coverage_report_path=$source_dir/test/coverage-reports/jest/$lambda_name
    rm -fr $coverage_report_path
    mv coverage $coverage_report_path
}

run_templates_test() {

	echo "------------------------------------------------------------------------------"
	echo "[Test] Templates Directory"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/templates

	npm ci

	if [ "${UPDATE_SNAPSHOTS:-false}" = "true" ]; then
		echo "Updating snapshots"
		npm run test:update:snapshot
	else
		npm test
	fi

	if [ "$?" = "1" ]; then
		echo "(run-unit-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
    [ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
    mkdir -p $source_dir/test/coverage-reports/jest/templates
    coverage_report_path=$source_dir/test/coverage-reports/jest/templates
    rm -fr $coverage_report_path
    mv coverage $coverage_report_path
}

run_website_tests() {

	echo "------------------------------------------------------------------------------"
	echo "[Test] Website Directory"
	echo "------------------------------------------------------------------------------"
	cd $source_dir
	npm run test:website

    # Vitest is configured to output coverage directly to the correct location
    # via reportsDirectory in vitest.config.mjs, so no need to move files
	coverage_report_path=$source_dir/test/coverage-reports/jest/website
    
    # Fix paths in lcov.info for SonarQube (make them relative to project root)
    if [ -f "$coverage_report_path/lcov.info" ]; then
        # Use different sed syntax for Linux vs macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i.bak "s|^SF:|SF:source/website/|g" "$coverage_report_path/lcov.info"
            rm -f "$coverage_report_path/lcov.info.bak"
        else
            sed -i "s|^SF:|SF:source/website/|g" "$coverage_report_path/lcov.info"
        fi
        echo "Fixed paths in lcov.info for SonarQube"
    else
        echo "WARNING: lcov.info not found at $coverage_report_path/lcov.info"
    fi
}

# Save the current working directory and set source directory
starting_dir=$PWD
cd ../source
source_dir=$PWD

# Regenerate sanitizeOutput.js in es-proxy-layer/website from sanitizeAllowlist.js
# before their tests run (this script bypasses the Makefile's own sync step).
node bin/sync-sanitize-allowlist.js

# Option to clean or not clean the unit test environment before and after running tests.
# The environment variable CLEAN has default of 'true' and can be overwritten by caller
# by setting it to 'false'. Particularly,
#    $ CLEAN=false ./run-unit-tests.sh
#
CLEAN="${CLEAN:-true}"

# Option to replace existing snapshots while running tests.
# Snapshots should only be updated when making intentional changes to the templates or website.
# Making unintenional or untested changes to the templates or website may result in breaking changes or change the website layout.
# The environment variable UPDATE_SNAPSHOTS has default of 'false' and can be overwritten by caller
# by setting it to 'true'.
#    $ UPDATE_SNAPSHOTS=true ./run-unit-tests.sh
UPDATE_SNAPSHOTS="${UPDATE_SNAPSHOTS:-false}"

# Test the Lambda functions
cd $source_dir/lambda
# run_python_lambda_test lexv2-build
# run_python_lambda_test kendra-webcrawler-schedule-updater

echo "Running Python Lambda unit tests"
for folder in */ ; do
    cd "$folder"
    function_name=${PWD##*/}

    if [ -e "pyproject.toml" ]; then
        run_python_unit_test $function_name
    fi

    cd ..
done

## Running npm install for aws-sdk-layer
cd $source_dir/lambda/aws-sdk-layer
npm ci

echo "Running Javascript Lambda unit tests"
run_javascript_lambda_test connect "Connect Lambda Unit Tests"
run_javascript_lambda_test genesys "Genesys Lambda Unit Tests"
run_javascript_lambda_test js_lambda_hook_sdk "JS Lambda Hook SDK Unit Tests"
run_javascript_lambda_test qnabot-common-layer "QnaBot Common Layer Lambda Unit Tests"
run_javascript_lambda_test schema "Schema Lambda Unit Tests"
run_javascript_lambda_test translate "Translate Lambda Unit Tests"
run_javascript_lambda_test es-proxy-layer "ES Proxy Layer Unit Tests"
run_javascript_lambda_test fulfillment "Fulfillment Lambda Unit Tests"
run_javascript_lambda_test cfn "CFN Lambda Unit Tests"
run_javascript_lambda_test lex-build "Lex Build unit tests"
run_javascript_lambda_test testall "Testall Lambda Unit Tests"
run_javascript_lambda_test export "Export Lambdas Unit Tests"
run_javascript_lambda_test import "Import Lambdas Unit Tests"

echo "Running CLI unit tests"
cd $source_dir/cli
run_python_unit_test cli "QnABot CLI"

echo "Starting Templates unit tests"
run_templates_test

echo "Running Templates Python unit tests"
 
python_directories=("$source_dir/templates/examples/examples/py" "$source_dir/templates/examples/extensions/py_lambda_hooks/CustomPYHook")
for folder in "${python_directories[@]}" ; do
cd "$folder"
function_name=${PWD##*/}
run_python_unit_test $function_name
done

echo "Running website unit tests"
run_website_tests

# Return to the source/ level where we started
cd $starting_dir
