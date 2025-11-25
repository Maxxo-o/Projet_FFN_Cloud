##############################################
# SQS Queue
##############################################

resource "aws_sqs_queue" "user_queue" {
  name                      = var.sqs_queue_name
  visibility_timeout_seconds = var.sqs_visibility_timeout

  tags = var.common_tags
}