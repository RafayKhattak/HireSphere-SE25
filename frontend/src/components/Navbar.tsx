import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { ListItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WorkIcon from '@mui/icons-material/Work';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessIcon from '@mui/icons-material/Business';

// Create a LinkComponent for use with Material UI
const LinkComponent = React.forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => (
  <Link ref={ref} {...props} />
));

const Navbar = () => {
  const user = { type: 'employer' }; // Replace with actual user data

  return (
    <div>
      {user?.type === 'employer' && (
        <>
          <ListItem disablePadding>
            <ListItemButton component={LinkComponent} to="/dashboard">
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={LinkComponent} to="/jobs/manage">
              <ListItemIcon>
                <WorkIcon />
              </ListItemIcon>
              <ListItemText primary="Manage Jobs" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={LinkComponent} to="/applications/employer">
              <ListItemIcon>
                <AssignmentIcon />
              </ListItemIcon>
              <ListItemText primary="Applications" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={LinkComponent} to="/employer/candidates">
              <ListItemIcon>
                <PersonSearchIcon />
              </ListItemIcon>
              <ListItemText primary="Find Candidates" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={LinkComponent} to="/employer/profile">
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText primary="Company Profile" />
            </ListItemButton>
          </ListItem>
        </>
      )}
    </div>
  );
};

export default Navbar; 