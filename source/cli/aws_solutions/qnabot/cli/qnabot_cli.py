######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#  SPDX-License-Identifier: Apache-2.0                                                                               #
######################################################################################################################

import sys
import os
import click
from aws_solutions.qnabot.cli import qnabot_cli_helper

CONTEXT_SETTINGS = dict(help_option_names=["-h", "--help"])


@click.group(context_settings=CONTEXT_SETTINGS)
@click.pass_context
def cli(ctx) -> None:
    os.environ["SOLUTION_ID"] = "SO0189"
    os.environ["SOLUTION_VERSION"] = "v7.4.3"


@cli.command("import")
@click.option(
    "-s",
    "--cloudformation-stack-name",
    type=click.STRING,
    help="Provide the name of the CloudFormation stack of your AWS QnABot deployment",
    required=True,
)
@click.option(
    "-f",
    "--source-filename",
    type=click.STRING,
    help="Provide the filename along with path where the file to be imported is located",
    required=True,
)
@click.option(
    "-fmt",
    "--file-format",
    type=click.Choice(["JSON", "JSONL", "XLSX"], case_sensitive=False),
    help="Provide the file format to use for import",
    required=False,
    default="JSON",
    show_default=True,
)
@click.option(
    "-d",
    "--delete-existing-content",
    type=click.BOOL,
    help="Use this parameter if all existing QnABot {qids} "
    + "in your QnABot deployment should be deleted before the import process.",
    required=False,
    default=False,
    show_default=True,
)
@click.pass_context
def qna_import(
    ctx,
    cloudformation_stack_name: str,
    source_filename: str,
    file_format: str,
    delete_existing_content: bool,
):
    """
    Import QnABot questions and answers to your QnABot setup.\n
    This command requires two (2) parameters: <cloudformation-stack-name>, <source-filename>.
    The cloudformation-stack-name parameter is used to know the AWS QnABot deployment
    to use to support the import process. \n
    More information: https://github.com/aws-solutions/qnabot-on-aws/tree/main/source/docs/qnabot_cli/README.md
    """
    try:
        response = qnabot_cli_helper.initiate_import(
            cloudformation_stack_name=cloudformation_stack_name,
            source_filename=source_filename,
            file_format=file_format,
            delete_existing_content=delete_existing_content,
        )  # proceed with upload file to Amazon S3
        click.echo(response)
        sys.exit(0)
    except OSError as err_exception:
        qnabot_cli_helper.error_response(
            error_code=err_exception.errno,
            message=err_exception.strerror,
            comments=source_filename + " not found. Check the path and try again.",
            status="Error",
            show_error=True,
        )


@cli.command("export")
@click.option(
    "-s",
    "--cloudformation-stack-name",
    type=click.STRING,
    help="Provide the name of the CloudFormation stack of your AWS QnABot deployment",
    required=True,
)
@click.option(
    "-f",
    "--export-filename",
    type=click.STRING,
    help="Provide the filename along with path where the exported file should be downloaded to",
    required=True,
)
@click.option(
    "-qids",
    "--export-filter",
    help="Export {qids} that start with this filter string. Exclude this option to export all {qids} ",
    required=False,
    default="",
)
@click.option(
    "-fmt",
    "--file-format",
    type=click.Choice(["JSON", "JSONL"], case_sensitive=False),
    help="Provide the file format to use for export",
    required=False,
    default="JSON",
    show_default=True,
)
@click.pass_context
def qna_export(
    ctx,
    cloudformation_stack_name: str,
    export_filename: str,
    export_filter: str,
    file_format: str,
):
    """
    Export QnABot questions and answers from your QnABot setup.\n
    This command requires two (2) parameters: <cloudformation-stack-name>, and <export-filename>.
    The cloudformation-stack-name parameter is used to know the AWS QnABot deployment
    to use to support the export process. \n
    More information: https://github.com/aws-solutions/qnabot-on-aws/tree/main/source/docs/qnabot_cli/README.md
    """
    try:
        response = qnabot_cli_helper.initiate_export(
            cloudformation_stack_name=cloudformation_stack_name,
            export_filename=export_filename,
            export_filter=export_filter,
            file_format=file_format,
        )  # proceed with initiating the export process
        click.echo(response)
        sys.exit(0)
    except OSError as err_exception:
        qnabot_cli_helper.error_response(
            error_code=err_exception.errno,
            message=err_exception.strerror,
            comments="There was an issue using: "
            + export_filename
            + " Check the path and try again.",
            status="Error",
            show_error=True,
        )


if __name__ == "__main__":
    cli()
