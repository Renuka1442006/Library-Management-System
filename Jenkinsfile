
stage('Deploy to Test Environment') {
    when {
        branch 'main'
    }

    steps {
        sh '''
            docker compose up -d --build
            docker compose ps
        '''
    }
}
