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

  s3_use_path_style           = true
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
# S3 Bucket for Images
##############################################

resource "aws_s3_bucket" "images" {
  bucket = "ffn-images-bucket"
}

resource "aws_s3_bucket_policy" "images_policy" {
  bucket = aws_s3_bucket.images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })
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



##TEST##
resource "aws_lambda_function" "upload_file" {
  function_name = "uploadFile"
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  filename         = "${path.module}/lambdas/upload/upload.zip"
  source_code_hash = filebase64sha256("${path.module}/lambdas/upload/upload.zip")

  environment {
    variables = {
      BUCKET_IMAGES = aws_s3_bucket.images.bucket
      S3_ENDPOINT   = "http://s3.localhost.localstack.cloud:4566"
      S3_PUBLIC_URL = "http://localhost:4566/${aws_s3_bucket.images.bucket}"
    }
  }

  role = aws_iam_role.lambda_exec.arn
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda-upload-exec"

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

resource "aws_iam_policy" "lambda_s3_policy" {
  name        = "lambda-upload-s3"
  description = "Allow lambda to upload to S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:PutObjectAcl"]
      Resource = "${aws_s3_bucket.images.arn}/*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_s3_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_s3_policy.arn
}


resource "aws_api_gateway_rest_api" "api" {
  name = "uploadApi"
}

resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "upload"
}

resource "aws_api_gateway_method" "upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "upload_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.upload.id
  http_method = aws_api_gateway_method.upload_post.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.upload_file.invoke_arn
  integration_http_method = "POST"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_file.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.upload_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = "prod"
}

# Outputs
output "upload_endpoint" {
  description = "API Gateway endpoint for upload"
  value       = "http://localhost:4566/restapis/${aws_api_gateway_rest_api.api.id}/prod/_user_request_/upload"
}

output "s3_bucket_name" {
  description = "S3 bucket name for images"
  value       = aws_s3_bucket.images.bucket
}

output "s3_public_url" {
  description = "S3 public URL for images"
  value       = "http://localhost:4566/${aws_s3_bucket.images.bucket}"
}

output "api_gateway_url" {
  description = "API Gateway base URL"
  value       = "http://localhost:4566/restapis/${aws_api_gateway_rest_api.api.id}/prod/_user_request_"
}

