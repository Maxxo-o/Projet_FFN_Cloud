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

##############################################
# IAM Role for Lambda
##############################################

resource "aws_iam_role" "lambda_role" {
  name = "lambda_dynamodb_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda_dynamodb_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.materials.arn,
          "${aws_dynamodb_table.materials.arn}/index/*",
          aws_dynamodb_table.loans.arn,
          "${aws_dynamodb_table.loans.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

##############################################
# Lambda Functions - Materials
##############################################

data "archive_file" "materials_lambda" {
  type        = "zip"
  source_dir  = "../lambda/materials"
  output_path = "../lambda_materials.zip"
}

resource "aws_lambda_function" "materials" {
  filename         = data.archive_file.materials_lambda.output_path
  function_name    = "materials-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.materials_lambda.output_base64sha256
  runtime         = "nodejs20.x"

  environment {
    variables = {
      MATERIALS_TABLE    = aws_dynamodb_table.materials.name
      AWS_REGION        = "us-east-1"
      DYNAMODB_ENDPOINT = "http://172.20.0.2:4566"
    }
  }
}

##############################################
# Lambda Functions - Loans
##############################################

data "archive_file" "loans_lambda" {
  type        = "zip"
  source_dir  = "../lambda/loans"
  output_path = "../lambda_loans.zip"
}

resource "aws_lambda_function" "loans" {
  filename         = data.archive_file.loans_lambda.output_path
  function_name    = "loans-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.loans_lambda.output_base64sha256
  runtime         = "nodejs20.x"

  environment {
    variables = {
      LOANS_TABLE       = aws_dynamodb_table.loans.name
      AWS_REGION        = "us-east-1"
      DYNAMODB_ENDPOINT = "http://172.20.0.2:4566"
    }
  }
}