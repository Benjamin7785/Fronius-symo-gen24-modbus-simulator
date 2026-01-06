import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import SimulatorControl from './components/SimulatorControl';
import RegisterBrowser from './components/RegisterBrowser';
import { connectWebSocket, disconnectWebSocket } from './services/websocket';

const App = () => {
  const [darkMode, setDarkMode] = useState(true);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  useEffect(() => {
    // Connect to WebSocket on mount
    connectWebSocket();

    return () => {
      // Disconnect on unmount
      disconnectWebSocket();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Fronius Gen24 Plus Modbus Simulator
            </Typography>
            <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <SimulatorControl />
          <Box sx={{ mt: 4 }}>
            <RegisterBrowser />
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;


