# Configuration AWS
aws_region = "us-east-1"
localstack_endpoint = "http://localhost:4566"

# DynamoDB
dynamodb_table_name = "Users"

# SQS
sqs_queue_name = "UserQueue"
sqs_visibility_timeout = 30

# Lambda
lambda_function_name = "resizeImage"
lambda_runtime = "nodejs18.x"
lambda_handler = "index.handler"
lambda_memory_size = 512
lambda_timeout = 30
lambda_source_dir = "../lambda/resize"
lambda_zip_output = "../lambda/resize_lambda.zip"

# Variables d'environnement Lambda
lambda_env_bucket = "ffn-nextjs-assets-bucket"
lambda_env_s3_endpoint = "http://localstack:4566"
lambda_env_node_options = "--max-old-space-size=450"

# S3 Buckets
frontend_bucket_name = "ffn-frontend-nextjs-bucket"
images_bucket_name = "ffn-images-storage-bucket"

# API Gateway
api_gateway_name = "imagesAPI"
api_gateway_description = "API pour toutes les Lambdas images"
api_gateway_stage_name = "test"
api_resource_path = "resize"

# IAM
lambda_role_name = "lambda-exec-role"

# Tags
common_tags = {
  Environment = "development"
  Project     = "FFN-Cloud"
  ManagedBy   = "Terraform"
}