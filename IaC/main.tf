##############################################
# Terraform configuration
##############################################

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source = "hashicorp/archive"
    }
  }
}

##############################################
# AWS provider (pointing to LocalStack)
##############################################

provider "aws" {
  access_key = "test"
  secret_key = "test"
  region     = "us-east-1"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sts          = "http://localhost:4566"
    iam          = "http://localhost:4566"
    s3           = "http://localhost:4566"
    lambda       = "http://localhost:4566"
    dynamodb     = "http://localhost:4566"
    sqs          = "http://localhost:4566"
    apigateway   = "http://localhost:4566"
  }
}

##############################################
# DynamoDB Table
##############################################

resource "aws_dynamodb_table" "users" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "Id"

  attribute {
    name = "Id"
    type = "S"
  }
}

##############################################
# SQS Queue
##############################################

resource "aws_sqs_queue" "user_queue" {
  name                      = "UserQueue"
  visibility_timeout_seconds = 30
}


##############################################
# Lambda ZIP
##############################################

data "archive_file" "resize_lambda_zip" {
  type        = "zip"
  source_dir  = "../lambda/resize"
  output_path = "../lambda/resize_lambda.zip"
}

##############################################
# Lambda IAM Role
##############################################

resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

##############################################
# Lambda Function
##############################################

resource "aws_lambda_function" "resize_image" {
  function_name = "resizeImage"
  runtime = "python3.11"
  handler = "main.lambda_handler"

  filename         = data.archive_file.lambda_resize_zip.output_path
  source_code_hash = data.archive_file.lambda_resize_zip.output_base64sha256

  role = aws_iam_role.lambda_exec_role.arn

  memory_size = 512
  timeout     = 30

  environment {
    variables = {
      BUCKET = "nextjs-assets"
      S3_ENDPOINT = "http://localstack:4566"
      NODE_OPTIONS = "--max-old-space-size=450"
    }
  }
}

##############################################
# API Gateway
##############################################

resource "aws_api_gateway_rest_api" "images_api" {
  name        = "imagesAPI"
  description = "API pour toutes les Lambdas images"
}

resource "aws_api_gateway_resource" "resize" {
  rest_api_id = aws_api_gateway_rest_api.images_api.id
  parent_id   = aws_api_gateway_rest_api.images_api.root_resource_id
  path_part   = "resize"
}

resource "aws_api_gateway_method" "post_resize" {
  rest_api_id   = aws_api_gateway_rest_api.images_api.id
  resource_id   = aws_api_gateway_resource.resize.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "resize_integration" {
  rest_api_id = aws_api_gateway_rest_api.images_api.id
  resource_id = aws_api_gateway_resource.resize.id
  http_method = aws_api_gateway_method.post_resize.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.resize_image.invoke_arn
}

##############################################
# Autorisation API Gateway → Lambda
##############################################

resource "aws_lambda_permission" "resize_apigw" {
  statement_id  = "AllowExecutionFromAPIGatewayResize"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resize_image.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.images_api.execution_arn}/*/*"
}

##############################################
# API Deployment
##############################################

resource "aws_api_gateway_deployment" "images_deploy" {
  depends_on = [
    aws_api_gateway_integration.resize_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.images_api.id
  stage_name  = "test"
}