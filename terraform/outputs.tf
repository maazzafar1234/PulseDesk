output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    master_ip            = aws_instance.master.public_ip
    jenkins_worker_ip    = aws_instance.jenkins_worker.public_ip
    jenkins_url          = "http://${aws_instance.master.public_ip}:8080"
    sonarqube_url        = "http://${aws_instance.master.public_ip}:9000"
    vpc_id               = aws_vpc.pulsedesk.id
    security_group_id    = aws_security_group.pulsedesk.id
  }
}
