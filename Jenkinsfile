
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check Environment') {
            steps {
                bat 'node --version'
                bat 'npm --version'
                bat 'git --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Validate Code') {
            steps {
                bat 'node --check server.js'
            }
        }

        stage('Run Tests') {
            steps {
                bat 'npm test --if-present'
            }
        }
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Automated Testing') {
            steps {
                sh 'npm test'
            }
            
        }
        stage('Build Docker Image') {
            steps {
                bat 'docker --version'
                bat 'docker build -t library-management:%BUILD_NUMBER% .'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the console output.'
        }

        always {
            echo 'Jenkins pipeline execution finished.'
        }
    }
}
