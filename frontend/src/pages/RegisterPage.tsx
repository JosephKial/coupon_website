import React from 'react';
import { Container, Paper, Box, Typography } from '@mui/material';
import { RegisterForm } from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Family Coupon Manager
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" gutterBottom>
            Create Account
          </Typography>
          <RegisterForm />
        </Paper>
      </Box>
    </Container>
  );
};export defa
ult RegisterPage;