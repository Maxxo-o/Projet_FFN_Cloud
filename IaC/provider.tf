##############################################
# AWS provider (pointing to LocalStack)
##############################################

provider "aws" {
  access_key = "test"
  secret_key = "test"
  region     = var.aws_region

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sts          = var.localstack_endpoint
    iam          = var.localstack_endpoint
    s3           = var.localstack_endpoint
    lambda       = var.localstack_endpoint
    dynamodb     = var.localstack_endpoint
    sqs          = var.localstack_endpoint
    apigateway   = var.localstack_endpoint
  }

  # Configuration pour timeouts plus élevés avec LocalStack
  s3_use_path_style = true
  
  default_tags {
    tags = {
      Environment = "localstack"
    }
  }
}