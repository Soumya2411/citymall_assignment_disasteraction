import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Button,
  Select,
  Input,
  Flex,
  Spacer,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

// Components
import DisasterCard from '../components/DisasterCard';
import PageLoader from '../components/PageLoader';
import ErrorAlert from '../components/ErrorAlert';

const Dashboard = ({ socket }) => {
  const [disasters, setDisasters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const toast = useToast();
  
  // Load disasters
  const loadDisasters = async () => {
    try {
      setIsLoading(true);
      
      // Prepare filter params
      const params = {};
      if (tagFilter) params.tag = tagFilter;
      
      const data = await apiService.getDisasters(params);
      
      // Apply client-side search filtering if query exists
      let filteredData = data;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = data.filter(
          (disaster) =>
            disaster.title.toLowerCase().includes(query) ||
            disaster.description.toLowerCase().includes(query) ||
            disaster.location_name.toLowerCase().includes(query)
        );
      }
      
      setDisasters(filteredData);
      setError(null);
    } catch (err) {
      console.error('Error loading disasters:', err);
      setError('Failed to load disasters. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load disasters.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadDisasters();
  }, [tagFilter]); // Reload when tag filter changes
  
  // Handle search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadDisasters();
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);
  
  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('disaster_updated', (data) => {
        if (data.action === 'create') {
          setDisasters((prev) => [data.disaster, ...prev]);
          toast({
            title: 'New Disaster',
            description: `${data.disaster.title} has been added.`,
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
        } else if (data.action === 'update') {
          setDisasters((prev) =>
            prev.map((disaster) =>
              disaster.id === data.disaster.id ? data.disaster : disaster
            )
          );
        } else if (data.action === 'delete') {
          setDisasters((prev) =>
            prev.filter((disaster) => disaster.id !== data.disaster.id)
          );
        }
      });
      
      return () => {
        socket.off('disaster_updated');
      };
    }
  }, [socket, toast]);
  
  return (
    <Box p={4} >
      <Flex align="center" m={6}>
        <Heading size="lg">Active Disasters</Heading>
        <Spacer />
        {(user?.role === 'admin' || user?.role === 'contributor') && (
          <Button
            as={RouterLink}
            to="/disasters/create"
            colorScheme="brand"
            size="sm"
          >
            Add Disaster
          </Button>
        )}
      </Flex>
      
      <Flex mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>
        <Input
          placeholder="Search disasters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          flex={1}
        />
        <Select
          placeholder="Filter by tag"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          width={{ base: 'full', md: '200px' }}
        >
          <option value="flood">Flood</option>
          <option value="fire">Fire</option>
          <option value="wildfire">Wildfire</option>
          <option value="earthquake">Earthquake</option>
          <option value="hurricane">Hurricane</option>
          <option value="storm">Storm</option>
          <option value="urgent">Urgent</option>
        </Select>
      </Flex>
        {isLoading ? (
        <PageLoader message="Loading disasters..." />
      ) : error ? (
        <ErrorAlert
          title="Failed to Load"
          message={error}
          onRetry={loadDisasters}
        />
      ) : disasters.length === 0 ? (
        <Box textAlign="center" p={8}>
          <Text>No disasters found.</Text>
          {tagFilter && (
            <Button mt={4} onClick={() => setTagFilter('')} variant="outline">
              Clear Filter
            </Button>
          )}
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {disasters.map((disaster) => (
            <DisasterCard key={disaster.id} disaster={disaster} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default Dashboard;
