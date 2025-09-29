import React from 'react';
import { Typography, Box, Paper, List, ListItem, ListItemText, Switch, Divider } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ mt: 3 }}>
        <List>
          <ListItem>
            <ListItemText
              primary="Email Notifications"
              secondary="Receive notifications about expiring coupons"
            />
            <Switch defaultChecked />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="Dark Mode"
              secondary="Switch between light and dark themes"
            />
            <Switch />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="Auto-delete Expired Coupons"
              secondary="Automatically remove coupons after they expire"
            />
            <Switch />
          </ListItem>
        </List>
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Additional settings features will be implemented in a future update.
        </Typography>
      </Box>
    </Box>
  );
};e
xport default SettingsPage;