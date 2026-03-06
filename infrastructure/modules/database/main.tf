# RDS MySQL Database with High Availability

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.database_subnets
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# Security Group for RDS
resource "aws_security_group" "database" {
  name        = "${var.project_name}-${var.environment}-db-sg"
  description = "Security group for RDS database"
  vpc_id      = var.vpc_id
  
  # Allow MySQL from application tier only
  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [var.app_security_group]
    description     = "MySQL from application tier"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-sg"
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}-${var.environment}-db-password"
  
  kms_key_id = var.kms_key_id
  
  tags = {
    Name = "Database Master Password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# RDS Instance - Primary
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"
  
  # Engine configuration
  engine               = "mysql"
  engine_version       = "8.0.35"
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  iops                 = 3000
  
  # Database configuration
  db_name  = "college_results"
  username = "admin"
  password = random_password.db_password.result
  port     = 3306
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false  # SECURE
  
  # High Availability
  multi_az               = var.multi_az
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  # Security
  storage_encrypted = var.storage_encrypted
  kms_key_id       = var.kms_key_id
  
  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Monitoring
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_retention_period = 7
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-primary-db"
  }
}

# Read Replicas for scaling read operations
resource "aws_db_instance" "read_replica" {
  count = var.create_read_replica ? var.read_replica_count : 0
  
  identifier             = "${var.project_name}-${var.environment}-db-replica-${count.index + 1}"
  replicate_source_db    = aws_db_instance.main.identifier
  instance_class         = var.instance_class
  
  # Can be in different AZ for better distribution
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]
  
  # Security
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  
  # Monitoring
  performance_insights_enabled = true
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-read-replica-${count.index + 1}"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-db-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Database CPU utilization is too high"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-db-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000000000"  # 10GB
  alarm_description   = "Database free storage is low"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# Outputs
output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "db_instance_id" {
  value = aws_db_instance.main.id
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}

output "read_replica_endpoints" {
  value = aws_db_instance.read_replica[*].endpoint
}