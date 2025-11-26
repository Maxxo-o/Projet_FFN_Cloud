##############################################
# Variables Terraform
##############################################

# Région AWS
variable "aws_region" {
  description = "Région AWS à utiliser"
  type        = string
  default     = "us-east-1"
}

# Configuration LocalStack
variable "localstack_endpoint" {
  description = "Endpoint LocalStack"
  type        = string
  default     = "http://localhost:4566"
}

# DynamoDB
variable "dynamodb_table_name" {
  description = "Nom de la table DynamoDB"
  type        = string
  default     = "Users"
}

# SQS
variable "sqs_queue_name" {
  description = "Nom de la queue SQS"
  type        = string
  default     = "UserQueue"
}

variable "sqs_visibility_timeout" {
  description = "Timeout de visibilité SQS en secondes"
  type        = number
  default     = 30
}

# Lambda
variable "lambda_resize_function_name" {
  description = "Nom de la fonction Lambda"
  type        = string
  default     = "resizeImage"
}

variable "lambda_upload_function_name" {
  description = "Nom de la fonction Lambda pour l'upload"
  type        = string
  default     = "uploadFile"
}

variable "lambda_runtime" {
  description = "Runtime de la fonction Lambda"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_handler" {
  description = "Handler de la fonction Lambda"
  type        = string
  default     = "index.handler"
}

variable "lambda_memory_size" {
  description = "Mémoire allouée à la fonction Lambda en MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Timeout de la fonction Lambda en secondes"
  type        = number
  default     = 30
}

variable "lambda_resize_source_dir" {
  description = "Répertoire source de la fonction Lambda"
  type        = string
  default     = "../lambda/resize"
}

variable "lambda_resize_zip_output" {
  description = "Chemin de sortie du ZIP Lambda"
  type        = string
  default     = "../lambda/resize_lambda.zip"
}

variable "lambda_upload_source_dir" {
  description = "Répertoire source de la fonction Lambda d'upload"
  type        = string
  default     = "../lambda/upload"
}

variable "lambda_upload_zip_output" {
  description = "Chemin de sortie du ZIP Lambda d'upload"
  type        = string
  default     = "../lambda/upload_lambda.zip"
}

# Variables d'environnement Lambda
variable "lambda_env_bucket" {
  description = "Nom du bucket S3 pour Lambda"
  type        = string
  default     = "nextjs-assets"
}

variable "lambda_env_s3_endpoint" {
  description = "Endpoint S3 pour Lambda"
  type        = string
  default     = "http://localstack:4566"
}

variable "lambda_env_node_options" {
  description = "Options Node.js pour Lambda"
  type        = string
  default     = "--max-old-space-size=450"
}

# API Gateway
variable "api_gateway_name" {
  description = "Nom de l'API Gateway"
  type        = string
  default     = "imagesAPI"
}

variable "api_gateway_description" {
  description = "Description de l'API Gateway"
  type        = string
  default     = "API pour toutes les Lambdas images"
}

variable "api_gateway_stage_name" {
  description = "Nom du stage API Gateway"
  type        = string
  default     = "test"
}

variable "api_resource_path" {
  description = "Chemin de la ressource API"
  type        = string
  default     = "resize"
}

# IAM
variable "lambda_role_name" {
  description = "Nom du rôle IAM pour Lambda"
  type        = string
  default     = "lambda-exec-role"
}

# Tags
variable "common_tags" {
  description = "Tags communs à appliquer aux ressources"
  type        = map(string)
  default = {
    Environment = "development"
    Project     = "FFN-Cloud"
    ManagedBy   = "Terraform"
  }
}

# S3 Buckets
variable "frontend_bucket_name" {
  description = "Nom du bucket S3 pour le frontend Next.js"
  type        = string
  default     = "my-next"
}

variable "images_bucket_name" {
  description = "Nom du bucket S3 pour les images"
  type        = string
  default     = "images"
}