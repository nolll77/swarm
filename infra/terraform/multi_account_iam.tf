# --- IAM Multi-Account Strategy ---
# Ce fichier définit comment le compte "Orchestrateur" accède aux comptes "Clients"

resource "aws_iam_role" "cross_account_assumable_role" {
  name = "AI-Dev-CrossAccountRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = var.orchestrator_account_arn
        }
      }
    ]
  })
}

resource "aws_iam_policy" "agent_execution_policy" {
  name        = "AI-Dev-AgentExecutionPolicy"
  description = "Permissions minimales pour qu'un agent travaille dans ce compte"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecs:RunTask",
          "ecs:DescribeTasks",
          "s3:PutObject",
          "s3:GetObject"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "agent_policy_attach" {
  role       = aws_iam_role.cross_account_assumable_role.name
  policy_arn = aws_iam_policy.agent_execution_policy.arn
}

output "cross_account_role_arn" {
  value = aws_iam_role.cross_account_assumable_role.arn
}
