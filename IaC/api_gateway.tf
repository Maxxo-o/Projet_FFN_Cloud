##############################################
# Unified API Gateway
##############################################
# Toutes les ressources sont maintenant consolidées dans aws_api_gateway_rest_api.api
##############################################
# Upload API Gateway Resources
##############################################

resource "aws_api_gateway_rest_api" "api" {
  name = "uploadApi"
}

# Resource pour upload
resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "upload"
}

# Resource pour resize
resource "aws_api_gateway_resource" "resize" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "resize"
}

# Resource pour delete
resource "aws_api_gateway_resource" "delete" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "delete"
}

resource "aws_api_gateway_method" "upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "POST"
  authorization = "NONE"
}

# Méthode pour resize
resource "aws_api_gateway_method" "resize_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.resize.id
  http_method   = "POST"
  authorization = "NONE"
}

# Méthode pour delete
resource "aws_api_gateway_method" "delete_delete" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.delete.id
  http_method   = "DELETE"
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

# Intégration pour resize
resource "aws_api_gateway_integration" "resize_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.resize.id
  http_method = aws_api_gateway_method.resize_post.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.resize_image.invoke_arn
  integration_http_method = "POST"
}

# Intégration pour delete
resource "aws_api_gateway_integration" "delete_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.delete.id
  http_method = aws_api_gateway_method.delete_delete.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.delete_file.invoke_arn
  integration_http_method = "POST"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_file.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# Permission pour resize
resource "aws_lambda_permission" "resize_apigw" {
  statement_id  = "AllowExecutionFromAPIGatewayResize"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resize_image.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# Permission pour delete
resource "aws_lambda_permission" "delete_apigw" {
  statement_id  = "AllowExecutionFromAPIGatewayDelete"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_file.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.upload_integration,
    aws_api_gateway_integration.resize_integration,
    aws_api_gateway_integration.delete_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = "prod"
  
  # Force un nouveau déploiement quand les intégrations changent
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.upload_integration.id,
      aws_api_gateway_integration.resize_integration.id,
      aws_api_gateway_integration.delete_integration.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}
