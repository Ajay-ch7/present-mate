pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                checkout scm
            }
        }

        stage('Check Tools') {
            steps {
                bat '''
                    "C:\\Users\\D.Navaneeth\\anaconda3\\python.exe" --version
                    "C:\\Program Files\\nodejs\\node.exe" --version
                    "C:\\Program Files\\nodejs\\npm.cmd" --version
                '''
            }
        }

        stage('Backend Setup') {
            steps {
                bat '''
                    cd backend
                    "C:\\Users\\D.Navaneeth\\anaconda3\\python.exe" -m pip install -r requirements.txt
                '''
            }
        }

        stage('Frontend Setup') {
            steps {
                bat '''
                    cd frontend
                    "C:\\Program Files\\nodejs\\npm.cmd" install
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    cd frontend
                    "C:\\Program Files\\nodejs\\npm.cmd" run build
                '''
            }
        }
    }

    post {
        success {
            
            echo ' PRESENTMATE BUILD SUCCESSFUL!'
            
        }

        failure {
            echo 'PRESENTMATE BUILD FAILED!'
        }
    }
}
