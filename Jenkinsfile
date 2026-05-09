pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'  // Configure this name in Jenkins Global Tool Configuration
    }

    environment {
        CI = 'true'
        // Store these in Jenkins Credentials Manager
        DATABASE_URL = credentials('database-url')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Building branch: ${env.BRANCH_NAME ?: 'main'}"
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh 'npm ci'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                echo 'Generating Prisma client...'
                sh 'npx prisma generate'
            }
        }

        stage('Lint') {
            steps {
                echo 'Running type check...'
                sh 'npm run build'
                echo 'Type check passed'
            }
        }

        stage('Build') {
            steps {
                echo 'Building TypeScript...'
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests with coverage...'
                sh 'npm run test:coverage'
            }
            post {
                always {
                    // Publish JUnit test results
                    junit allowEmptyResults: true, testResults: 'coverage/junit.xml'
                    
                    // Publish HTML coverage report
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report',
                        reportTitles: 'Code Coverage'
                    ])
                }
            }
        }

        stage('Security Audit') {
            steps {
                echo 'Running npm security audit...'
                sh 'npm audit --audit-level=high || true'
            }
        }
    }

    post {
        success {
            echo '✅ Build succeeded!'
            // Uncomment to add Slack/Email notifications
            // slackSend(color: 'good', message: "Build succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
        }
        failure {
            echo '❌ Build failed!'
            // slackSend(color: 'danger', message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
        }
        unstable {
            echo '⚠️ Build unstable - check test results'
        }
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}
