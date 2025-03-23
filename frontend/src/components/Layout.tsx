import React from 'react';
import { Box, Container } from '@mui/material';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.default'
            }}
        >
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    py: { xs: 3, md: 4 },
                    px: { xs: 2, md: 3 }
                }}
            >
                <Container maxWidth="lg">
                    {children}
                </Container>
            </Box>
        </Box>
    );
};

export default Layout; 