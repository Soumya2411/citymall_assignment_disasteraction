import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Create context
const AuthContext = createContext();

// Mock user data
const mockUsers = {
  'netrunnerX': { id: 'netrunnerX', name: 'NetRunner X', role: 'admin' },
  'reliefAdmin': { id: 'reliefAdmin', name: 'Relief Admin', role: 'admin' },
  'contributor1': { id: 'contributor1', name: 'Contributor 1', role: 'contributor' },
  'contributor2': { id: 'contributor2', name: 'Contributor 2', role: 'contributor' },
  'citizen1': { id: 'citizen1', name: 'Citizen 1', role: 'user' },
  'citizen2': { id: 'citizen2', name: 'Citizen 2', role: 'user' },
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check if user is stored in localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('disaster_response_user');
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('disaster_response_user');
      }
    }
    
    setLoading(false);
  }, []);
  
  // Login function
  const login = (userId) => {
    if (mockUsers[userId]) {
      const userData = mockUsers[userId];
      setUser(userData);
      localStorage.setItem('disaster_response_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };
  
  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('disaster_response_user');
    navigate('/login');
  };
  
  // Check if user has permission
  const hasPermission = (requiredRole) => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Contributors have more permissions than regular users
    if (user.role === 'contributor' && requiredRole === 'user') return true;
    
    // Direct role match
    return user.role === requiredRole;
  };
  
  // Auth context value
  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
