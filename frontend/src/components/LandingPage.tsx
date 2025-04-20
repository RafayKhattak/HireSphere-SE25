import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Box,
    Button,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
    Fade,
    IconButton,
    Link,
    Stack
} from '@mui/material';
import {
    Work as WorkIcon,
    Search as SearchIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    ArrowForward as ArrowForwardIcon,
    LinkedIn as LinkedInIcon,
    Twitter as TwitterIcon,
    GitHub as GitHubIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const features = [
    {
        icon: <WorkIcon sx={{ fontSize: 40 }} />,
        title: 'Smart Job Matching',
        description: 'AI-powered job recommendations based on your skills and preferences'
    },
    {
        icon: <SearchIcon sx={{ fontSize: 40 }} />,
        title: 'Advanced Search',
        description: 'Find your perfect job with our intelligent search filters'
    },
    {
        icon: <BusinessIcon sx={{ fontSize: 40 }} />,
        title: 'Company Insights',
        description: 'Get detailed information about potential employers'
    },
    {
        icon: <PersonIcon sx={{ fontSize: 40 }} />,
        title: 'Career Development',
        description: 'Track your applications and manage your professional growth'
    }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isAuthenticated, user } = useAuth();

    return (
        <Box>
            {/* Hero Section */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                    color: 'white',
                    py: { xs: 8, md: 12 },
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <MotionBox
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    gutterBottom
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: { xs: '2.5rem', md: '3.5rem' }
                                    }}
                                >
                                    Find Your Dream Tech Job
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{ mb: 4, opacity: 0.9 }}
                                >
                                    Connect with top tech companies and opportunities using AI-powered job matching
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    {!isAuthenticated && (
                                        <Button
                                            variant="contained"
                                            size="large"
                                            endIcon={<ArrowForwardIcon />}
                                            onClick={() => navigate('/register')}
                                            sx={{
                                                bgcolor: 'white',
                                                color: 'primary.main',
                                                '&:hover': {
                                                    bgcolor: 'grey.100'
                                                }
                                            }}
                                        >
                                            Get Started
                                        </Button>
                                    )}
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={() => navigate('/jobs')}
                                        sx={{
                                            borderColor: 'white',
                                            color: 'white',
                                            '&:hover': {
                                                borderColor: 'white',
                                                bgcolor: 'rgba(255, 255, 255, 0.1)'
                                            }
                                        }}
                                    >
                                        Browse Jobs
                                    </Button>
                                </Stack>
                            </MotionBox>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <MotionBox
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8 }}
                            >
                                <Box
                                    component="img"
                                    src="/hero-image.svg"
                                    alt="Job Search"
                                    sx={{
                                        width: '100%',
                                        maxWidth: 500,
                                        display: { xs: 'none', md: 'block' },
                                        mx: 'auto'
                                    }}
                                />
                            </MotionBox>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Typography
                    variant="h3"
                    component="h2"
                    align="center"
                    gutterBottom
                    sx={{ mb: 6, fontWeight: 700 }}
                >
                    Why Choose HireSphere?
                </Typography>
                <Grid container spacing={4}>
                    {features.map((feature, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Fade in timeout={1000} style={{ transitionDelay: `${index * 100}ms` }}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'transform 0.3s',
                                        '&:hover': {
                                            transform: 'translateY(-8px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <Box sx={{ color: 'primary.main', mb: 2 }}>
                                            {feature.icon}
                                        </Box>
                                        <Typography variant="h6" component="h3" gutterBottom>
                                            {feature.title}
                                        </Typography>
                                        <Typography color="text.secondary">
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Fade>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Call to Action Section */}
            {!isAuthenticated && (
                <Box sx={{ py: 8, bgcolor: 'background.paper' }}>
                    <Container maxWidth="lg">
                        <Grid container spacing={4} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <Typography variant="h3" component="h2" gutterBottom>
                                    Create Your Account Today
                                </Typography>
                                <Typography variant="body1" paragraph color="text.secondary">
                                    Join thousands of professionals and companies on HireSphere. Create your profile, connect with opportunities, and take your career to the next level.
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    size="large" 
                                    onClick={() => navigate('/register')}
                                    sx={{ mt: 2 }}
                                >
                                    Sign Up Now
                                </Button>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box sx={{ position: 'relative', height: { xs: 300, md: 400 } }}>
                                    <Box
                                        component="img"
                                        src="/images/cta-image.jpg"
                                        alt="Create an account"
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 2
                                        }}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </Container>
                </Box>
            )}

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    bgcolor: 'grey.900',
                    color: 'white',
                    py: 6
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom>
                                HireSphere
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                Connecting tech talent with amazing opportunities through AI-powered job matching.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom>
                                Quick Links
                            </Typography>
                            <Stack spacing={1}>
                                <Link href="/jobs" color="inherit" underline="none">
                                    Browse Jobs
                                </Link>
                                <Link href="/about" color="inherit" underline="none">
                                    About Us
                                </Link>
                                <Link href="/contact" color="inherit" underline="none">
                                    Contact
                                </Link>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom>
                                Connect With Us
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <IconButton color="inherit">
                                    <LinkedInIcon />
                                </IconButton>
                                <IconButton color="inherit">
                                    <TwitterIcon />
                                </IconButton>
                                <IconButton color="inherit">
                                    <GitHubIcon />
                                </IconButton>
                            </Stack>
                        </Grid>
                    </Grid>
                    <Typography
                        variant="body2"
                        align="center"
                        sx={{ mt: 4, opacity: 0.7 }}
                    >
                        © {new Date().getFullYear()} HireSphere. All rights reserved.
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage; 