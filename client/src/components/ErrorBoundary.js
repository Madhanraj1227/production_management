import React from 'react';
import { Alert, Container, Typography } from '@mui/material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {this.state.error && this.state.error.toString()}
                        </Typography>
                        <details style={{ whiteSpace: 'pre-wrap' }}>
                            <summary>Error Details</summary>
                            {this.state.error && this.state.error.stack}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    </Alert>
                    <button 
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        style={{ padding: '10px 20px', marginTop: '10px' }}
                    >
                        Try again
                    </button>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 