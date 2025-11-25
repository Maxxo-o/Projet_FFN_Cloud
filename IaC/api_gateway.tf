##############################################
# API Gateway
##############################################

resource "aws_api_gateway_rest_api" "images_api" {
  name        = var.api_gateway_name
  description = var.api_gateway_description

  tags = var.common_tags
}

resource "aws_api_gateway_resource" "resize" {
  rest_api_id = aws_api_gateway_rest_api.images_api.id
  parent_id   = aws_api_gateway_rest_api.images_api.root_resource_id
  path_part   = var.api_resource_path
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
  stage_name  = var.api_gateway_stage_name
}