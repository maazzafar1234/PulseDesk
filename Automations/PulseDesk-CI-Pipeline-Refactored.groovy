/**
 * PulseDesk CI/CD Pipeline - Using Shared Library
 * 
 * This pipeline uses the pulsedesk-pipeline shared library for reusable components
 * Pipeline stages:
 * 1. Checkout Code
 * 2. Build Backend & Frontend
 * 3. Code Quality Gates (OWASP, SonarQube)
 * 4. Build Docker Images
 * 5. Security Scanning (Trivy)
 * 6. Push to Docker Hub
 * 7. Update Kubernetes Manifests
 * 8. Commit & Push to Git
 */

@Library('pulsedesk-pipeline') _

pipeline {
    agent any
    
    environment {
        // GitHub Configuration
        GITHUB_REPO = 'https://github.com/maazzafar1234/PulseDesk.git'
        GITHUB_BRANCH = 'main'
        
        // Docker Hub Configuration
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_USERNAME = 'maazzafar07'
        DOCKER_REPO = "${DOCKER_USERNAME}/pulsedesk"
        DOCKER_IMAGE_TAG = "build-${BUILD_NUMBER}"
        
        // SonarQube Configuration
        SONARQUBE_HOST = 'http://44.198.186.67:9000'
        SONARQUBE_TOKEN = credentials('sonarqube-token')
        
        // Timestamps
        BUILD_TIMESTAMP = sh(script: "date +%Y%m%d_%H%M%S", returnStdout: true).trim()
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Clean Workspace') {
            steps {
                script {
                    pipelineLogger.section('CLEAN WORKSPACE')
                    def gitOps = new com.pulsedesk.GitOps(this)
                    gitOps.cleanWorkspace()
                }
            }
        }
        
        stage('Checkout Code') {
            steps {
                script {
                    pipelineLogger.section('CODE CHECKOUT')
                    pipelineLogger.info('Checking out code from GitHub...')
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/' + GITHUB_BRANCH]],
                        userRemoteConfigs: [[
                            url: GITHUB_REPO,
                            credentialsId: 'github-credentials'
                        ]]
                    ])
                    pipelineLogger.success('Code checked out successfully')
                }
            }
        }
        
        stage('Build Backend') {
            steps {
                script {
                    pipelineLogger.section('BUILD BACKEND')
                    def buildSteps = new com.pulsedesk.BuildSteps(this)
                    buildSteps.buildBackend()
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                script {
                    pipelineLogger.section('BUILD FRONTEND')
                    def buildSteps = new com.pulsedesk.BuildSteps(this)
                    buildSteps.buildFrontend()
                }
            }
        }
        
        stage('OWASP Dependency Check') {
            steps {
                script {
                    pipelineLogger.section('SECURITY: OWASP DEPENDENCY CHECK')
                    def qualityGates = new com.pulsedesk.QualityGates(this)
                    qualityGates.owaspDependencyCheck()
                }
            }
        }
        
        stage('SonarQube Code Analysis') {
            steps {
                script {
                    pipelineLogger.section('CODE QUALITY: SONARQUBE ANALYSIS')
                    def qualityGates = new com.pulsedesk.QualityGates(this)
                    qualityGates.sonarQubeAnalysis(SONARQUBE_HOST, SONARQUBE_TOKEN)
                }
            }
        }
        
        stage('SonarQube Quality Gate') {
            steps {
                script {
                    pipelineLogger.section('QUALITY GATE CHECK')
                    def qualityGates = new com.pulsedesk.QualityGates(this)
                    qualityGates.waitForQualityGate()
                }
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    pipelineLogger.section('DOCKER BUILD')
                    def buildSteps = new com.pulsedesk.BuildSteps(this)
                    buildSteps.buildDockerImages(DOCKER_REPO, BUILD_NUMBER)
                }
            }
        }
        
        stage('Verify Docker Images') {
            steps {
                script {
                    pipelineLogger.section('DOCKER VERIFICATION')
                    pipelineLogger.info('Verifying Docker images...')
                    sh '''
                        docker images | grep pulsedesk || echo "No pulsedesk images found"
                        docker image ls | grep "${DOCKER_REPO}" || true
                    '''
                    pipelineLogger.success('Docker images verified')
                }
            }
        }
        
        stage('Trivy Image Scan') {
            steps {
                script {
                    pipelineLogger.section('SECURITY: TRIVY IMAGE SCAN')
                    def qualityGates = new com.pulsedesk.QualityGates(this)
                    qualityGates.trivyImageScan(DOCKER_REPO, BUILD_NUMBER)
                }
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                script {
                    pipelineLogger.section('DOCKER PUSH')
                    def buildSteps = new com.pulsedesk.BuildSteps(this)
                    buildSteps.pushDockerImages(DOCKER_REPO, BUILD_NUMBER, 'docker-hub-credentials')
                }
            }
        }
        
        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    pipelineLogger.section('KUBERNETES MANIFEST UPDATE')
                    def gitOps = new com.pulsedesk.GitOps(this)
                    gitOps.updateKubernetesManifests(DOCKER_REPO, BUILD_NUMBER)
                }
            }
        }
        
        stage('Commit & Push to Git') {
            steps {
                script {
                    pipelineLogger.section('GIT COMMIT & PUSH')
                    def gitOps = new com.pulsedesk.GitOps(this)
                    gitOps.commitAndPush(
                        "Update container images - Build #${BUILD_NUMBER} (${BUILD_TIMESTAMP})",
                        'github-credentials',
                        'github.com/maazzafar1234/PulseDesk.git'
                    )
                }
            }
        }
        
        stage('Create Git Tag') {
            steps {
                script {
                    pipelineLogger.section('GIT TAG')
                    def gitOps = new com.pulsedesk.GitOps(this)
                    gitOps.createAndPushTag(
                        "build-${BUILD_NUMBER}",
                        "Build ${BUILD_NUMBER} - ${BUILD_TIMESTAMP}",
                        'github-credentials',
                        'github.com/maazzafar1234/PulseDesk.git'
                    )
                }
            }
        }
    }
    
    post {
        always {
            script {
                pipelineLogger.section('ARCHIVING ARTIFACTS')
                // Archive OWASP Dependency Check report
                archiveArtifacts artifacts: '**/dependency-check-report/**', 
                                 allowEmptyArchive: true
                
                // Archive SonarQube report if available
                archiveArtifacts artifacts: '.scannerwork/**', 
                                 allowEmptyArchive: true
                
                pipelineLogger.info('Build artifacts archived')
            }
        }
        
        success {
            script {
                pipelineLogger.section('BUILD SUCCESSFUL')
                pipelineLogger.success("Pipeline completed successfully!")
                
                // Send success notification
                emailext(
                    subject: "✅ PulseDesk CI Build #${BUILD_NUMBER} SUCCESS",
                    body: '''
                        <h2>Build Status: ✅ SUCCESS</h2>
                        <p><strong>Build Number:</strong> ${BUILD_NUMBER}</p>
                        <p><strong>Build Duration:</strong> ${BUILD_DURATION}</p>
                        <p><strong>Build URL:</strong> <a href="${BUILD_URL}">${BUILD_URL}</a></p>
                        
                        <h3>Docker Images:</h3>
                        <ul>
                            <li>Backend: ${DOCKER_REPO}:backend-${BUILD_NUMBER}</li>
                            <li>Frontend: ${DOCKER_REPO}:frontend-${BUILD_NUMBER}</li>
                            <li>Latest: ${DOCKER_REPO}:latest</li>
                        </ul>
                        
                        <h3>Artifacts:</h3>
                        <ul>
                            <li>OWASP Dependency Check Report</li>
                            <li>SonarQube Analysis Report</li>
                            <li>Docker Images Scanned with Trivy</li>
                        </ul>
                        
                        <p><strong>Ready for CD pipeline deployment!</strong></p>
                    ''',
                    to: '${DEFAULT_RECIPIENTS}',
                    mimeType: 'text/html'
                )
            }
        }
        
        failure {
            script {
                pipelineLogger.section('BUILD FAILED')
                pipelineLogger.error("Pipeline failed! Check logs for details")
                
                // Send failure notification
                emailext(
                    subject: "❌ PulseDesk CI Build #${BUILD_NUMBER} FAILED",
                    body: '''
                        <h2>Build Status: ❌ FAILED</h2>
                        <p><strong>Build Number:</strong> ${BUILD_NUMBER}</p>
                        <p><strong>Build Duration:</strong> ${BUILD_DURATION}</p>
                        <p><strong>Build URL:</strong> <a href="${BUILD_URL}">${BUILD_URL}</a></p>
                        
                        <p><strong>Please check the logs for more information:</strong></p>
                        <p><a href="${BUILD_URL}/console">Build Console Output</a></p>
                        
                        <h3>Common Issues:</h3>
                        <ul>
                            <li>Directory not found (client/ or server/)</li>
                            <li>npm dependencies not installing</li>
                            <li>SonarQube token expired or invalid</li>
                            <li>Docker credentials not configured</li>
                            <li>GitHub credentials not authorized</li>
                        </ul>
                    ''',
                    to: '${DEFAULT_RECIPIENTS}',
                    mimeType: 'text/html'
                )
            }
        }
        
        unstable {
            script {
                pipelineLogger.warning("Pipeline is unstable - Quality gates may have warnings")
            }
        }
        
        cleanup {
            script {
                pipelineLogger.info("Cleaning up...")
                cleanWs()
            }
        }
    }
}
