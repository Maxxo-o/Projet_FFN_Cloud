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
    sts      = "http://localhost:4566"
    s3       = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    sqs      = "http://localhost:4566"
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

