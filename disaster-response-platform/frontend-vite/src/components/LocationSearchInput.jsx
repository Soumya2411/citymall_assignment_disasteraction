import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  List,
  ListItem,
  Badge,
  useToast,
  FormControl,
  FormLabel,
  FormHelperText,
} from '@chakra-ui/react';
import { SearchIcon, CheckIcon } from '@chakra-ui/icons';
import apiService from '../services/apiService';

const LocationSearchInput = ({
  label = "Location",
  placeholder = "Enter location name or address",
  value = '',
  onChange,
  onLocationSelected,
  isRequired = false,
  helperText,
  size = 'md',
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState('');
  const searchTimeoutRef = useRef(null);
  const toast = useToast();

  // Update search query when value prop changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Clear results when input is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedLocation(null);
      setError('');
    }
  }, [searchQuery]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    
    // Call onChange prop to update parent component
    if (onChange) {
      onChange(e);
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Clear selection if user is typing
    if (selectedLocation) {
      setSelectedLocation(null);
    }
    
    setError('');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResults([]);

    try {
      const result = await apiService.geocodeLocation(searchQuery.trim());
      
      if (result) {
        setSearchResults([result]);
      } else {
        setError('No location found for this search');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setError('Failed to search for location. Please try again.');
      
      toast({
        title: 'Search Error',
        description: error.message || 'Failed to search for location',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (locationResult) => {
    setSelectedLocation(locationResult);
    setSearchQuery(locationResult.display_name || locationResult.location_name);
    setSearchResults([]);
    
    // Update parent component with selected location
    if (onChange) {
      onChange({
        target: {
          name: 'location_name',
          value: locationResult.display_name || locationResult.location_name,
        }
      });
    }
    
    // Notify parent component about the full location data
    if (onLocationSelected) {
      onLocationSelected({
        location_name: locationResult.display_name || locationResult.location_name,
        coordinates: locationResult.coordinates,
        geography_point: locationResult.geography_point,
      });
    }

    toast({
      title: 'Location Selected',
      description: `Selected: ${locationResult.display_name || locationResult.location_name}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <FormControl isRequired={isRequired}>
      <FormLabel>{label}</FormLabel>
      
      <VStack align="stretch" spacing={3}>
        <HStack>
          <Input
            value={searchQuery}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            size={size}
            disabled={disabled}
            pr="4.5rem"
          />
          <Button
            onClick={handleSearch}
            isLoading={isSearching}
            loadingText="Searching..."
            leftIcon={<SearchIcon />}
            colorScheme="blue"
            variant="outline"
            size={size}
            disabled={disabled || !searchQuery.trim()}
          >
            Search
          </Button>
        </HStack>

        {selectedLocation && (
          <Box p={3} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
            <HStack>
              <CheckIcon color="green.500" />
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="bold" color="green.700">
                  Location Confirmed
                </Text>
                <Text fontSize="sm" color="green.600">
                  {selectedLocation.display_name || selectedLocation.location_name}
                </Text>
                {selectedLocation.coordinates && (
                  <Text fontSize="xs" color="green.500">
                    Coordinates: {selectedLocation.coordinates.lat.toFixed(4)}, {selectedLocation.coordinates.lng.toFixed(4)}
                  </Text>
                )}
              </Box>
            </HStack>
          </Box>
        )}

        {error && (
          <Alert status="error" size="sm">
            <AlertIcon />
            <Text fontSize="sm">{error}</Text>
          </Alert>
        )}

        {searchResults.length > 0 && (
          <Box border="1px" borderColor="gray.200" borderRadius="md" maxH="200px" overflowY="auto">
            <List spacing={0}>
              {searchResults.map((result, index) => (
                <ListItem
                  key={index}
                  p={3}
                  cursor="pointer"
                  _hover={{ bg: 'gray.50' }}
                  borderBottom={index < searchResults.length - 1 ? '1px' : 'none'}
                  borderColor="gray.100"
                  onClick={() => handleSelectLocation(result)}
                >
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="medium" fontSize="sm">
                      {result.display_name || result.location_name}
                    </Text>
                    {result.coordinates && (
                      <HStack spacing={2}>
                        <Badge colorScheme="blue" fontSize="xs">
                          Lat: {result.coordinates.lat.toFixed(4)}
                        </Badge>
                        <Badge colorScheme="green" fontSize="xs">
                          Lng: {result.coordinates.lng.toFixed(4)}
                        </Badge>
                      </HStack>
                    )}
                  </VStack>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </VStack>

      {helperText && (
        <FormHelperText>{helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default LocationSearchInput;
