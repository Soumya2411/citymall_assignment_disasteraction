import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Flex, } from '@chakra-ui/react';
import { io } from 'socket.io-client';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import DisasterDetail from './pages/DisasterDetail';
import ResourcesMap from './pages/ResourcesMap';
import ReportIncident from './pages/ReportIncident';
import ImageVerification from './pages/ImageVerification';
import CreateDisaster from './pages/CreateDisaster';
import MyReports from './pages/MyReports';

// Context
import { useAuth } from './contexts/AuthContext';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const location = useLocation();
  
  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        query: { userId: user.id },
      });
      
      setSocket(newSocket);
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);
  
  // Check if we're on the login page
  const isLoginPage = location.pathname === '/login';

  return (
    <Box minH="100vh" bg="gray.50">
      
      <Flex>
        {!isLoginPage && <Sidebar />}
        
        <Box
          as="main"
          ml={!isLoginPage ? '60' : 0}
          w="full"
          >
          {!isLoginPage && <Header />}
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard socket={socket} />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/disasters/:id"
              element={
                <ProtectedRoute>
                  <DisasterDetail socket={socket} />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <ResourcesMap socket={socket} />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportIncident socket={socket} />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/verify-image"
              element={
                <ProtectedRoute>
                  <ImageVerification />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/create-disaster"
              element={
                <ProtectedRoute>
                  <CreateDisaster />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Box>
      </Flex>
    </Box>
  );
}

export default App;
