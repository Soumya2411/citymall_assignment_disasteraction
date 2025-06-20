import React from 'react';
import { Box, Flex, Icon, Link, Text, VStack, HStack, Divider, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { FiHome, FiMap, FiFileText, FiImage, FiUser, FiPlus, FiList } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const MenuItem = ({ icon, label, to, isActive }) => {
  const activeColor = useColorModeValue('brand.600', 'brand.300');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const activeBg = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Link
      as={RouterLink}
      to={to}
      textDecoration="none"
      _hover={{ textDecoration: 'none' }}
      width="100%"
    >
      <Flex
        align="center"
        p={3}
        borderRadius="md"
        role="group"
        cursor="pointer"
        color={isActive ? activeColor : 'inherit'}
        fontWeight={isActive ? 'bold' : 'normal'}
        bg={isActive ? activeBg : 'transparent'}
        _hover={{
          bg: hoverBg,
        }}
      >
        <Icon
          mr={4}
          fontSize="16"
          as={icon}
          color={isActive ? activeColor : 'gray.500'}
        />
        <Text>{label}</Text>
      </Flex>
    </Link>
  );
};

const Sidebar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
    const menuItems = [
    { icon: FiHome, label: 'Dashboard', to: '/' },
    { icon: FiMap, label: 'Resources Map', to: '/resources' },
    { icon: FiFileText, label: 'Report Incident', to: '/report' },
    { icon: FiList, label: 'My Reports', to: '/my-reports' },
    { icon: FiImage, label: 'Image Verification', to: '/verify-image' },
  ];
  
  // Add Create Disaster option for admin and contributor users

  
  return (
    <Box
      as="nav"
      pos="fixed"
      top="0"
      left="0"
      h="full"
      pb="10"
      overflowX="hidden"
      overflowY="auto"
      bg={useColorModeValue('white', 'gray.800')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w="60"
      pt="20"
      px={4}
    >
      <VStack spacing={1} align="stretch">
        {menuItems.map((item) => (
          <MenuItem 
            key={item.to}
            icon={item.icon}
            label={item.label}
            to={item.to}
            isActive={pathname === item.to}
          />
        ))}
      </VStack>
      
      {user && (
        <>
          <Divider my={6} />
          <HStack px={3} fontSize="sm" color="gray.500">
            <Text>Logged in as:</Text>
            <Text fontWeight="bold" color="brand.500">
              {user.name}
            </Text>
          </HStack>
          <Text px={3} fontSize="xs" color="gray.500">
            Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Text>
        </>
      )}
    </Box>
  );
};

export default Sidebar;
