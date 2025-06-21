import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Heading,
  Card,
  CardBody,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Text,
  Divider,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import LocationSearchInput from '../components/LocationSearchInput';

const CreateDisaster = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
    const [formData, setFormData] = useState({
    title: '',
    location_name: '',
    description: '',
  });
  
  const [locationData, setLocationData] = useState(null);
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Check if user has permission to create disasters
  const canCreateDisaster = user && ['admin', 'contributor'].includes(user.role);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLocationSelected = (location) => {
    setLocationData(location);
    setFormData(prev => ({
      ...prev,
      location_name: location.location_name
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags(prev => [...prev, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.trim().length > 5000) {
      newErrors.description = 'Description must be less than 5000 characters';
    }
    
    if (formData.location_name && formData.location_name.trim().length > 500) {
      newErrors.location_name = 'Location name must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
      try {
      const disasterData = {
        ...formData,
        tags: tags.length > 0 ? tags : undefined,
        // Include geocoded location data if available
        ...(locationData && {
          geography_point: locationData.geography_point,
          coordinates: locationData.coordinates,
        }),
      };
      
      const newDisaster = await apiService.createDisaster(disasterData);
      
      toast({
        title: 'Disaster Created',
        description: 'The disaster has been successfully created.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate to the new disaster's detail page
      navigate(`/disasters/${newDisaster.id}`);
      
    } catch (error) {
      console.error('Error creating disaster:', error);
      
      toast({
        title: 'Error Creating Disaster',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateDisaster) {
    return (
      <Box p={6} maxW="800px" mx="auto">
        <Alert status="error">
          <AlertIcon />
          <Box>
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to create disasters. Only administrators and contributors can create disasters.
            </AlertDescription>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="800px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Create New Disaster</Heading>
          <Text color="gray.600">
            Create a new disaster entry to coordinate response efforts.
          </Text>
        </Box>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={6} align="stretch">
                <FormControl isRequired isInvalid={!!errors.title}>
                  <FormLabel>Disaster Title</FormLabel>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Hurricane Katrina Response"
                    size="lg"
                  />
                  {errors.title && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.title}
                    </Text>
                  )}
                </FormControl>                <LocationSearchInput
                  label="Location"
                  placeholder="e.g., New Orleans, Louisiana"
                  value={formData.location_name}
                  onChange={handleInputChange}
                  onLocationSelected={handleLocationSelected}
                  helperText="Search for a location to get precise coordinates. If not provided, the location will be automatically extracted from the description using AI."
                  isInvalid={!!errors.location_name}
                  errorMessage={errors.location_name}
                />

                <FormControl isRequired isInvalid={!!errors.description}>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide detailed information about the disaster, including location, severity, affected areas, and any other relevant details..."
                    rows={6}
                    resize="vertical"
                  />
                  {errors.description && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.description}
                    </Text>
                  )}
                </FormControl>

                <Divider />

                <FormControl>
                  <FormLabel>Tags</FormLabel>
                  <HStack>
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add tags (e.g., hurricane, flood, evacuation)"
                      flex={1}
                    />
                    <Button onClick={handleAddTag} colorScheme="blue" variant="outline">
                      Add Tag
                    </Button>
                  </HStack>
                  
                  {tags.length > 0 && (
                    <Box mt={3}>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        Current tags:
                      </Text>
                      <Wrap>
                        {tags.map((tag, index) => (
                          <WrapItem key={index}>
                            <Tag size="md" colorScheme="blue" variant="solid">
                              <TagLabel>{tag}</TagLabel>
                              <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}
                </FormControl>

                <Divider />

                <HStack justify="flex-end" spacing={4}>
                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    isLoading={isSubmitting}
                    loadingText="Creating..."
                  >
                    Create Disaster
                  </Button>
                </HStack>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default CreateDisaster;
