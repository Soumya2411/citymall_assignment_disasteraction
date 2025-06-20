import React from 'react';
import { Box, Flex, Heading, Button, HStack, Avatar, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  
  return (
    <Box as="header" bg="brand.600" color="white" px={4} py={2} m={0}>
      <Flex justify="space-between" align="center">
        <Heading as={RouterLink} to="/" size="md" letterSpacing="tight">
          Disaster Response Platform
        </Heading>
        
        <HStack spacing={4}>
          {user?.role === 'admin' || user?.role === 'contributor' ? (
            <Button 
              as={RouterLink} 
              to="/disasters/create" 
              colorScheme="whiteAlpha" 
              size="sm"
            >
              Create Disaster
            </Button>
          ) : null}
          
          <Menu>
            <MenuButton
              as={Button}
              rounded="full"
              variant="link"
              cursor="pointer"
              minW={0}
            >
              <HStack>
                <Avatar size="sm" name={user?.name || 'User'} />
                <ChevronDownIcon />
              </HStack>
            </MenuButton>
            <MenuList color="gray.800">
              <MenuItem as={RouterLink} to="/profile">Profile</MenuItem>
              <MenuDivider />
              <MenuItem onClick={logout}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;
