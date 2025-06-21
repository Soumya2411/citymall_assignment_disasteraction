import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  Heading,
  Text,
  Container,
  VStack,
  useToast,
  Flex,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Mock users for the select dropdown
const mockUsers = [
  { id: 'netrunnerX', name: 'NetRunner X (Admin)' },
  { id: 'reliefAdmin', name: 'Relief Admin (Admin)' },
  { id: 'contributor1', name: 'Contributor 1 (Contributor)' },
  { id: 'contributor2', name: 'Contributor 2 (Contributor)' },
  { id: 'citizen1', name: 'Citizen 1 (User)' },
  { id: 'citizen2', name: 'Citizen 2 (User)' },
];

const Login = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast({
        title: 'Please select a user',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call with a small delay
    setTimeout(() => {
      const success = login(selectedUser);
      
      if (success) {
        navigate('/');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid user ID',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
      
      setIsLoading(false);
    }, 1000);
  };
  
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="lg" py={{ base: 12, md: 24 }}>
        <Flex direction="column" align="center" justify="center">
          <Box
            bg="white"
            p={8}
            borderRadius="xl"
            boxShadow="lg"
            w="full"
          >
            <VStack spacing={6} align="center" mb={8}>
              <Heading as="h1" size="xl" color="brand.600">
                Disaster Response Platform
              </Heading>
              <Text fontSize="lg" color="gray.600">
                Select a user to login
              </Text>
            </VStack>
            
            <form onSubmit={handleLogin}>
              <VStack spacing={6}>
                <FormControl id="userId" isRequired>
                  <FormLabel>User</FormLabel>
                  <Select
                    placeholder="Select user"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    {mockUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                >
                  Login
                </Button>
              </VStack>
            </form>
            
            <Text mt={8} fontSize="sm" color="gray.500" textAlign="center">
              This is a demo application with mock authentication.
              <br />
              Select any user to continue.
            </Text>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default Login;
