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
import {
    Menu as MenuIcon,
    Work as WorkIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    Bookmark as BookmarkIcon,
    ExitToApp as LogoutIcon,
    Info as InfoIcon
} from '@mui/icons-material';
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
            { text: 'My Applications', icon: <PersonIcon />, path: '/applications' },
            { text: 'Bookmarks', icon: <BookmarkIcon />, path: '/jobs/bookmarks' }
        ] : []),
        ...(user?.type === 'employer' ? [
            { text: 'My Company', icon: <BusinessIcon />, path: '/company' },
            { text: 'Post Job', icon: <WorkIcon />, path: '/jobs/post' },
            { text: 'Manage Jobs', icon: <WorkIcon />, path: '/jobs/manage' }
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
                        <ListItemIcon><LogoutIcon /></ListItemIcon>
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
                                            <Avatar alt={user?.name} src="/static/images/avatar/2.jpg" />
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