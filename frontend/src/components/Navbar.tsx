import React from 'react';
import { Link } from 'react-router-dom';
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WorkIcon from '@mui/icons-material/Work';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessIcon from '@mui/icons-material/Business';

const Navbar = () => {
  const user = { type: 'employer' }; // Replace with actual user data

  return (
    <div>
      {user?.type === 'employer' && (
        <>
          <ListItem component={Link} to="/dashboard" button>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem component={Link} to="/jobs/manage" button>
            <ListItemIcon>
              <WorkIcon />
            </ListItemIcon>
            <ListItemText primary="Manage Jobs" />
          </ListItem>
          <ListItem component={Link} to="/applications/employer" button>
            <ListItemIcon>
              <AssignmentIcon />
            </ListItemIcon>
            <ListItemText primary="Applications" />
          </ListItem>
          <ListItem component={Link} to="/employer/candidates" button>
            <ListItemIcon>
              <PersonSearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find Candidates" />
          </ListItem>
          <ListItem component={Link} to="/employer/profile" button>
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText primary="Company Profile" />
          </ListItem>
        </>
      )}
    </div>
  );
};

export default Navbar; 