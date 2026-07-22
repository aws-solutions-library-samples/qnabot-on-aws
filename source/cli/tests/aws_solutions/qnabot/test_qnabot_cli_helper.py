######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#  SPDX-License-Identifier: Apache-2.0                                                                               #
######################################################################################################################

import os
import threading
import datetime
from pathlib import Path
import pytest
import pandas as pd
import json

from aws_solutions.core.logging import get_logger
from aws_solutions.qnabot.cli import qnabot_cli_helper
from tests.aws_solutions.qnabot.fixtures.cloudformation_fixtures import (  # NOSONAR 
    cloudformation_stacks_fixture,
)
from tests.aws_solutions.qnabot.fixtures.s3_fixtures import (
    mock_export_event,
    mock_import_event,
)
from unittest.mock import patch

logger = get_logger(__name__)

@pytest.mark.filterwarnings("ignore::pytest.PytestUnraisableExceptionWarning")
def test_qna_import_json(  # NOSONAR 
    cloudformation_stacks_fixture,
):
    cloudformation_stack_name = "test_stack"
    file_name = "blog-samples.json"
    base_dir = Path(__file__).parent.parent.parent.parent.parent.parent
    source_filename = str((base_dir / "source" / "assets" / "examples" / "documents" / file_name).absolute())
    file_format = "JSON"
    delete_existing_content = True

    content_designer_output_bucket_name = qnabot_cli_helper.get_bucket_name(
        cloudformation_stack_name, qnabot_cli_helper.BucketType.CONTENT_BUCKET
    )
    assert isinstance(content_designer_output_bucket_name, str)
    logger.debug(f"test_qna_import: {content_designer_output_bucket_name=}")

    timer = threading.Timer(3, mock_import_event, [content_designer_output_bucket_name])
    timer.start()
    response = qnabot_cli_helper.initiate_import(
        cloudformation_stack_name=cloudformation_stack_name,
        source_filename=source_filename,
        file_format=file_format,
        delete_existing_content=delete_existing_content,
    )
    assert response
    logger.debug(f"{response=}")


def test_qna_import_xlsx(cloudformation_stacks_fixture, caplog):
    cloudformation_stack_name = "test_stack"
    source_filename = "test_questions.xlsx"
    file_format = "XLSX"
    delete_existing_content = True

    mock_data = {
        'qid': ['QID1', 'QID2', None, 'QID 4', 'QID5', 'QID6', 'QID7'],
        'question1': ['Test Question 1.1', 'Test Question 2.1', 'Test Question 3', 'Test Question 4', '', 'Test Question 6', 'Test Question 7'],
        'question2': ['Test Question 1.2', None, None, None, None, None, None],
        'answer': ['Test Answer 1', 'Test Answer 2', 'Test Answer 3', 'Test Answer 4', 'Test Answer 5', '', complex(1, 2)  ],
        'cardtitle': ['test_title', None, None, None, None, None, None],
        'imageurl': ["test_url", None, None, None, None, None, None],
        'cardsubtitle': ["test_subtitle", None, None, None, None, None, None],
        'args.0': ["arg1", None, None, None, None, None, None],
        'args.1': ["arg2", None, None, None, None, None, None],
        'botRouting.specialty_bot': ["test_bot", None, None, None, None, None, None]
    }
    mock_df = pd.DataFrame(mock_data)
    expected_response = {
        "number_of_qids_imported": 2,
        "number_of_qids_failed_to_import": "0",
        "import_starttime": "mock",
        "import_endtime": "mock",
        "status": "Complete",
        "error_code": "none"
    }
    with patch('pandas.ExcelFile') as mock_excel_file, \
         patch('pandas.read_excel', return_value=mock_df) as mock_read_excel:
        mock_excel_file.return_value.sheet_names = ['Sheet1']
        content_designer_output_bucket_name = qnabot_cli_helper.get_bucket_name(
            cloudformation_stack_name, 
            qnabot_cli_helper.BucketType.CONTENT_BUCKET
        )
        assert isinstance(content_designer_output_bucket_name, str)
        timer = threading.Timer(3, mock_import_event, [content_designer_output_bucket_name])
        timer.start()
        try:
            response = qnabot_cli_helper.initiate_import(
                cloudformation_stack_name=cloudformation_stack_name,
                source_filename=source_filename,
                file_format=file_format,
                delete_existing_content=delete_existing_content,
            )

            assert json.loads(response) == expected_response
            mock_excel_file.assert_called_once_with(source_filename)
            mock_read_excel.assert_called_once_with(source_filename, sheet_name='Sheet1')
            assert 'Warning: No QID found for line 4. Skipping.' in caplog.text
            assert 'Warning: QID in line 5 must have no spaces. Skipping.' in caplog.text
            assert 'Warning: No questions found for QID: QID5. Skipping.' in caplog.text
            assert 'Warning: No answer found for QID: QID6. Skipping.' in caplog.text
            assert 'Error processing row 8: Object of type complex is not JSON serializable' in caplog.text
        finally:
            timer.cancel()


def test_qna_import_xlsx_file_not_found(cloudformation_stacks_fixture, capfd):
    source_filename = "non_existent.xlsx"
    cloudformation_stack_name = "test_stack"
    file_format = "XLSX"
    delete_existing_content = True
    with patch('pandas.ExcelFile') as mock_excel_file:
        mock_excel_file.side_effect = FileNotFoundError(
            f"No such file or directory: '{source_filename}'"
        )
        with pytest.raises(SystemExit) as exc_info:
            qnabot_cli_helper.initiate_import(
                    cloudformation_stack_name=cloudformation_stack_name,
                    source_filename=source_filename,
                    file_format=file_format,
                    delete_existing_content=delete_existing_content,
                )
        assert exc_info.value.code == 1
        captured = capfd.readouterr()
        assert "No such file or directory: 'non_existent.xlsx'" in captured.out

def test_qna_import_xlsx_exception(cloudformation_stacks_fixture, capfd):
    source_filename = "non_existent.xlsx"
    cloudformation_stack_name = "test_stack"
    file_format = "XLSX"
    delete_existing_content = True
    with patch('pandas.ExcelFile') as mock_excel_file:
        mock_excel_file.side_effect = Exception("Invalid Excel format")
        with pytest.raises(SystemExit) as exc_info:
            qnabot_cli_helper.initiate_import(
                    cloudformation_stack_name=cloudformation_stack_name,
                    source_filename=source_filename,
                    file_format=file_format,
                    delete_existing_content=delete_existing_content,
                )
        assert exc_info.value.code == 1
        captured = capfd.readouterr()
        assert "Invalid Excel format" in captured.out

@pytest.mark.filterwarnings("ignore::pytest.PytestUnhandledThreadExceptionWarning")
def test_qna_export_json(  # NOSONAR 
    cloudformation_stacks_fixture,
):
    cloudformation_stack_name = "test_stack"
    base_dir = Path(__file__).parent.parent.parent.parent.parent
    file_name = "sample.json"
    export_filename = str((base_dir / "source" / "tests" / file_name).absolute())
    file_format = "JSON"
    export_filter = "some_filter"
    content_designer_output_bucket_name = qnabot_cli_helper.get_bucket_name(
        cloudformation_stack_name, qnabot_cli_helper.BucketType.CONTENT_BUCKET
    )

    assert isinstance(content_designer_output_bucket_name, str)
    logger.debug(f"test_qna_content_designer_output: {content_designer_output_bucket_name=}")

    timer_export = threading.Timer(3, mock_export_event, [content_designer_output_bucket_name])
    timer_export.start()

    response = qnabot_cli_helper.initiate_export(
        cloudformation_stack_name=cloudformation_stack_name,
        export_filename=export_filename,
        file_format=file_format,
        export_filter=export_filter,
    )
    assert response
    logger.debug(f"{response=}")
    assert Path(export_filename).is_file()
    os.remove(export_filename)

@pytest.mark.filterwarnings("ignore::pytest.PytestUnhandledThreadExceptionWarning")
def test_qna_import_invalid_stack(  # NOSONAR 
    cloudformation_stacks_fixture,
):
    cloudformation_stack_name = "non-existing-stack"
    with pytest.raises(SystemExit) as exception_info:
        response = qnabot_cli_helper.get_bucket_name(
            cloudformation_stack_name, qnabot_cli_helper.BucketType.IMPORT_BUCKET
        )
        # we don't expect to reach here
        logger.debug(f"test_qna_import_invalid_stack: {response=}")

    assert exception_info.value.code == 1
