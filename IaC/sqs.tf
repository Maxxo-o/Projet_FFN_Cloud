##############################################
# SQS Queue
##############################################

resource "aws_sqs_queue" "user_queue" {
  name                      = "UserQueue"
  visibility_timeout_seconds = 30
}

