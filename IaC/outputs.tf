##############################################
# Outputs
##############################################

output "api_gateway_url" {
  description = "URL de base de l'API Gateway"
  value       = "http://localhost:4566/restapis/${aws_api_gateway_rest_api.images_api.id}/test/_user_request_/resize"
}

output "dynamodb_table_name" {
  description = "Nom de la table DynamoDB"
  value       = aws_dynamodb_table.users.name
}

output "sqs_queue_url" {
  description = "URL de la queue SQS"
  value       = aws_sqs_queue.user_queue.id
}

output "lambda_function_name" {
  description = "Nom de la fonction Lambda"
  value       = aws_lambda_function.resize_image.function_name
}

output "frontend_bucket_name" {
  description = "Nom du bucket S3 pour le frontend"
  value       = aws_s3_bucket.frontend_bucket.bucket
}

output "images_bucket_name" {
  description = "Nom du bucket S3 pour les images"
  value       = aws_s3_bucket.images_bucket.bucket
}

output "assets_bucket_name" {
  description = "Nom du bucket S3 pour les assets (Lambda)"
  value       = aws_s3_bucket.assets_bucket.bucket
}

output "frontend_website_url" {
  description = "URL du site frontend hébergé sur S3"
  value       = "http://localhost:4566/${aws_s3_bucket.frontend_bucket.bucket}/index.html"
}
##############################################
# Upload API Outputs
##############################################

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

output "api_gateway_upload_url" {
  description = "API Gateway base URL for upload"
  value       = "http://localhost:4566/restapis/${aws_api_gateway_rest_api.api.id}/prod/_user_request_"
}
