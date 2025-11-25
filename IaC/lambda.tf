##############################################
# Lambda ZIP
##############################################

data "archive_file" "resize_lambda_zip" {
  type        = "zip"
  source_dir  = var.lambda_source_dir
  output_path = var.lambda_zip_output
}

##############################################
# Lambda Function
##############################################

resource "aws_lambda_function" "resize_image" {
  function_name = var.lambda_function_name
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