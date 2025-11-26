##############################################
# Lambda ZIP
##############################################

data "archive_file" "resize_lambda_zip" {
  type        = "zip"
  source_dir  = var.lambda_resize_source_dir
  output_path = var.lambda_resize_zip_output
}

data "archive_file" "upload_lambda_zip" {
  type        = "zip"
  source_dir  = var.lambda_upload_source_dir
  output_path = var.lambda_upload_zip_output
}

data "archive_file" "delete_lambda_zip" {
  type        = "zip"
  source_dir  = var.lambda_delete_source_dir
  output_path = var.lambda_delete_zip_output
}

##############################################
# Lambda Functions
##############################################

resource "aws_lambda_function" "upload_file" {
  function_name = var.lambda_upload_function_name
  runtime = var.lambda_runtime
  handler = var.lambda_handler

  filename         = data.archive_file.upload_lambda_zip.output_path
  source_code_hash = data.archive_file.upload_lambda_zip.output_base64sha256

  environment {
    variables = {
      BUCKET = var.lambda_env_bucket
      S3_ENDPOINT = var.lambda_env_s3_endpoint
      NODE_OPTIONS = var.lambda_env_node_options
      S3_PUBLIC_URL = "http://localhost:4566/${aws_s3_bucket.images.bucket}"
    }
  }

  role = aws_iam_role.lambda_exec.arn
}

resource "aws_lambda_function" "resize_image" {
  function_name = var.lambda_resize_function_name
  runtime = var.lambda_runtime
  handler = var.lambda_handler

  filename         = data.archive_file.resize_lambda_zip.output_path
  source_code_hash = data.archive_file.resize_lambda_zip.output_base64sha256

  role = aws_iam_role.lambda_exec_role.arn

  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  environment {
    variables = {
      BUCKET = var.lambda_env_bucket
      S3_ENDPOINT = var.lambda_env_s3_endpoint
      NODE_OPTIONS = var.lambda_env_node_options
    }
  }

  tags = var.common_tags
}

resource "aws_lambda_function" "delete_file" {
  function_name = var.lambda_delete_function_name
  runtime = var.lambda_runtime
  handler = var.lambda_handler

  filename         = data.archive_file.delete_lambda_zip.output_path
  source_code_hash = data.archive_file.delete_lambda_zip.output_base64sha256

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      BUCKET = var.lambda_env_bucket
      S3_ENDPOINT = var.lambda_env_s3_endpoint
      NODE_OPTIONS = var.lambda_env_node_options
    }
  }

  tags = var.common_tags
}