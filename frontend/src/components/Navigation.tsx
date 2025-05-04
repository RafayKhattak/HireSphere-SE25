import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Box,
    Toolbar,
    IconButton,
    Typography,
    Menu,
    Container,
    Avatar,
    Button,
    Tooltip,
    MenuItem,
    useTheme,
    useMediaQuery,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Link
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import WorkIcon from '@mui/icons-material/Work';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ReportIcon from '@mui/icons-material/Report';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';

const Navigation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, logout } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
        handleCloseUserMenu();
    };

    const handleLogout = () => {
        logout();
        navigate('/');
        if (isMobile) {
            setMobileOpen(false);
        }
        handleCloseUserMenu();
    };

    const menuItems = isAuthenticated ? [
        { text: 'Jobs', icon: <WorkIcon />, path: '/jobs' },
        ...(user?.type === 'jobseeker' ? [
            { text: 'Recommendations', icon: <WorkIcon />, path: '/recommendations' },
            { text: 'Job Alerts', icon: <WorkIcon />, path: '/job-alerts' },
            { text: 'Skill Assessments', icon: <AssessmentIcon />, path: '/assessments' },
            { text: 'Salary Insights', icon: <MonetizationOnIcon />, path: '/jobseeker/salary-insights' },
            { text: 'My Applications', icon: <PersonIcon />, path: '/applications' },
            { text: 'My Interviews', icon: <VideoCameraFrontIcon />, path: '/jobseeker/interviews' },
            { text: 'Bookmarks', icon: <BookmarkIcon />, path: '/jobs/bookmarks' },
            { text: 'Messages', icon: <PersonIcon />, path: '/messages' }
        ] : []),
        ...(user?.type === 'employer' ? [
            { text: 'Company Profile', icon: <BusinessIcon />, path: '/employer/profile' },
            { text: 'Post Job', icon: <WorkIcon />, path: '/jobs/post' },
            { text: 'Manage Jobs', icon: <WorkIcon />, path: '/jobs/manage' },
            { text: 'Manage Interviews', icon: <VideoCameraFrontIcon />, path: '/employer/interviews' },
            { text: 'Find Candidates', icon: <PersonIcon />, path: '/employer/candidates' },
            { text: 'Messages', icon: <PersonIcon />, path: '/messages' }
        ] : []),
        ...(user?.type === 'admin' ? [
            { text: 'Manage Reports', icon: <ReportIcon />, path: '/admin/reports' },
            { text: 'Admin Dashboard', icon: <AdminPanelSettingsIcon />, path: '/admin/dashboard' }
        ] : [])
    ] : [
        { text: 'About Us', icon: <InfoIcon />, path: '/about' }
    ];

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                HireSphere
            </Typography>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItemButton
                        key={item.text}
                        onClick={() => handleNavigation(item.path)}
                        selected={location.pathname === item.path}
                    >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                    </ListItemButton>
                ))}
                {isAuthenticated && (
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon><ExitToAppIcon /></ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                )}
            </List>
        </Box>
    );

    return (
        <AppBar position="sticky" sx={{ bgcolor: 'white', boxShadow: 1 }}>
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    {isMobile && (
                        <IconButton
                            color="primary"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Typography
                        variant="h6"
                        noWrap
                        component={RouterLink}
                        to="/"
                        sx={{
                            flexGrow: 1,
                            display: { xs: 'none', md: 'flex' },
                            color: 'primary.main',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        HireSphere
                    </Typography>

                    {!isMobile && (
                        <Box sx={{ flexGrow: 0, display: 'flex', gap: 2, alignItems: 'center' }}>
                            {isAuthenticated ? (
                                <>
                                    {menuItems.map((item) => (
                                        <Button
                                            key={item.text}
                                            startIcon={item.icon}
                                            onClick={() => handleNavigation(item.path)}
                                            color={location.pathname === item.path ? 'primary' : 'inherit'}
                                            sx={{
                                                color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                                                '&:hover': {
                                                    bgcolor: 'transparent',
                                                    color: 'primary.main'
                                                }
                                            }}
                                        >
                                            {item.text}
                                        </Button>
                                    ))}
                                    <Tooltip title="Open settings">
                                        <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                            <Avatar 
                                                alt={user?.name} 
                                                src={user?.profileImage || ''}
                                                sx={{ 
                                                    width: 40, 
                                                    height: 40,
                                                    bgcolor: 'primary.main' 
                                                }}
                                            >
                                                {!user?.profileImage && (user?.name?.charAt(0) || 'U')}
                                            </Avatar>
                                        </IconButton>
                                    </Tooltip>
                                    <Menu
                                        sx={{ mt: '45px' }}
                                        id="menu-appbar"
                                        anchorEl={anchorElUser}
                                        anchorOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        keepMounted
                                        transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        open={Boolean(anchorElUser)}
                                        onClose={handleCloseUserMenu}
                                    >
                                        <MenuItem onClick={() => handleNavigation('/profile')}>
                                            <Typography textAlign="center">Profile</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={handleLogout}>
                                            <Typography textAlign="center">Logout</Typography>
                                        </MenuItem>
                                    </Menu>
                                </>
                            ) : (
                                <>
                                    <Button
                                        startIcon={<InfoIcon />}
                                        onClick={() => handleNavigation('/about')}
                                        color="inherit"
                                        sx={{
                                            color: 'text.primary',
                                            '&:hover': {
                                                bgcolor: 'transparent',
                                                color: 'primary.main'
                                            }
                                        }}
                                    >
                                        About Us
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => handleNavigation('/login')}
                                        sx={{
                                            borderColor: 'primary.main',
                                            color: 'primary.main',
                                            '&:hover': {
                                                borderColor: 'primary.dark',
                                                bgcolor: 'transparent'
                                            }
                                        }}
                                    >
                                        Login
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => handleNavigation('/register')}
                                        sx={{
                                            bgcolor: 'primary.main',
                                            '&:hover': {
                                                bgcolor: 'primary.dark'
                                            }
                                        }}
                                    >
                                        Register
                                    </Button>
                                </>
                            )}
                        </Box>
                    )}
                </Toolbar>
            </Container>
            <Drawer
                variant="temporary"
                anchor="left"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
                }}
            >
                {drawer}
            </Drawer>
        </AppBar>
    );
};

export default Navigation; 