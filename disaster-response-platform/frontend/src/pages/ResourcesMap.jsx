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
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Badge,
  Divider,
  Link,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';
import ErrorAlert from '../components/ErrorAlert';
import LocationSearchInput from '../components/LocationSearchInput';
import '../utils/leafletIcons';
import { FaMapMarkerAlt } from 'react-icons/fa';
import L from 'leaflet';

// Define a custom icon using SVG
const customIcon = new L.DivIcon({
  html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M12 0C5.373 0 0 5.373 0 12C0 20.25 12 32 12 32S24 20.25 24 12C24 5.373 18.627 0 12 0ZM12 16C9.791 16 8 14.209 8 12C8 9.791 9.791 8 12 8C14.209 8 16 9.791 16 12C16 14.209 14.209 16 12 16Z" fill="#DC2626"/>
         </svg>`,
  className: 'custom-div-icon',
  iconSize: [24, 32],
  iconAnchor: [12, 32],
  popupAnchor: [0, -32],
});

// Helper function to extract coordinates from resource data
const getResourceCoordinates = (resource) => {
  // First check if we have direct latitude/longitude fields from the RPC function
  if (resource.latitude !== undefined && resource.longitude !== undefined) {
    return {
      lat: resource.latitude,
      lng: resource.longitude
    };
  }
  
  // Fallback: try to parse location_text field if available
  if (resource.location_text && typeof resource.location_text === 'string') {
    const pointMatch = resource.location_text.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (pointMatch) {
      return {
        lat: parseFloat(pointMatch[2]), // Y coordinate (latitude)
        lng: parseFloat(pointMatch[1])  // X coordinate (longitude)
      };
    }
  }
  
  // Legacy fallback: try to parse the old location field format
  if (resource.location && typeof resource.location === 'string' && resource.location.includes('POINT')) {
    const pointString = resource.location.replace('SRID=4326;', '');
    const coords = pointString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (coords) {
      return {
        lat: parseFloat(coords[2]), // Y coordinate (latitude)
        lng: parseFloat(coords[1])  // X coordinate (longitude)
      };
    }
  }
  
  return null;
};

// Component to automatically adjust map bounds based on resources
const MapBounds = ({ resources }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (resources && resources.length > 0) {
      const validCoords = resources
        .map(resource => getResourceCoordinates(resource))
        .filter(coords => coords !== null);
      
      if (validCoords.length > 0) {
        if (validCoords.length === 1) {
          // If only one resource, center on it
          const { lat, lng } = validCoords[0];
          map.setView([lat, lng], 13);
        } else {
          // If multiple resources, fit bounds to show all
          const bounds = L.latLngBounds(validCoords.map(coord => [coord.lat, coord.lng]));
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      }
    }
  }, [resources, map]);
  
  return null;
};

const ResourcesMap = ({ socket }) => {  const [resources, setResources] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceType, setResourceType] = useState('');  const [searchLocation, setSearchLocation] = useState('');
  const [searchRadius, setSearchRadius] = useState(10);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'disaster'
  const [innerTabIndex, setInnerTabIndex] = useState(0); // 0 for Map View, 1 for List View
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDetailOpen, 
    onOpen: onDetailOpen, 
    onClose: onDetailClose 
  } = useDisclosure();
  const { 
    isOpen: isEditOpen, 
    onOpen: onEditOpen, 
    onClose: onEditClose 
  } = useDisclosure();
  const [selectedResource, setSelectedResource] = useState(null);
  const { user } = useAuth();
  const toast = useToast();
  // Form state for creating new resource
  const [newResource, setNewResource] = useState({
    name: '',
    location_name: '',
    type: 'shelter', // Default value
    description: '',
    availability_status: 'available',
    contact_info: '',
    capacity: '',
  });
  const [newResourceLocationData, setNewResourceLocationData] = useState(null);
  
  // Form state for editing resource
  const [editResource, setEditResource] = useState({
    name: '',
    location_name: '',
    type: 'shelter',
    description: '',
    availability_status: 'available',
    contact_info: '',
    capacity: '',
  });  const [editResourceLocationData, setEditResourceLocationData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Validation errors state
  const [newResourceErrors, setNewResourceErrors] = useState({});
  const [editResourceErrors, setEditResourceErrors] = useState({});

  // Load disasters for the dropdown and initial resources
  useEffect(() => {
    const loadDisasters = async () => {
      try {
        const data = await apiService.getAllDisasters();
        setDisasters(data);
        
        // Set first disaster as default if available and we're in disaster mode
        if (data.length > 0 && !selectedDisaster && viewMode === 'disaster') {
          setSelectedDisaster(data[0].id);
        }
      } catch (err) {
        console.error('Error loading disasters:', err);
        toast({
          title: 'Error',
          description: 'Failed to load disasters.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };
    
    loadDisasters();
    
    // Load initial resources
    loadResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]); // Added viewMode dependency
  // Load resources based on view mode
  const loadResources = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      let data;
      
      if (viewMode === 'disaster' && selectedDisaster) {
        // Load resources near a specific disaster
        data = await apiService.getResourcesByDisasterId(
          selectedDisaster, 
          searchRadius, 
          resourceType || undefined
        );
      } else {
        // Load all resources with optional location filtering
        let coords = null;
        if (searchLocation) {
          try {
            coords = await apiService.geocodeLocation(searchLocation);
          } catch (err) {
            console.warn('Could not geocode search location:', err);
          }
        }
        
        data = await apiService.getAllResources(
          coords?.lat, 
          coords?.lng, 
          searchRadius, 
          resourceType || undefined
        );
      }
      
      // Apply client-side search filtering if query exists
      let filteredData = data;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = data.filter(
          (resource) =>
            resource.name.toLowerCase().includes(query) ||
            resource.location_name.toLowerCase().includes(query) ||
            resource.type.toLowerCase().includes(query) ||
            (resource.description && resource.description.toLowerCase().includes(query))
        );
      }
      
      setResources(filteredData);
      setError(null);
    } catch (err) {
      console.error('Error loading resources:', err);
      setError('Failed to load resources. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDisaster, resourceType, searchQuery, searchLocation, searchRadius, viewMode]);

  // Load resources when disaster or resource type changes
  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // Handle search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadResources();
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [loadResources]);
  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('resources_updated', (data) => {
        // Update resources for all view modes since resources are now independent
        if (data.action === 'create') {
          setResources((prev) => [...prev, data.resource]);
          toast({
            title: 'New Resource',
            description: `${data.resource.name} has been added.`,
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
        } else if (data.action === 'update') {
          setResources((prev) =>
            prev.map((resource) =>
              resource.id === data.resource.id ? data.resource : resource
            )
          );
        } else if (data.action === 'delete') {
          setResources((prev) =>
            prev.filter((resource) => resource.id !== data.resource_id)
          );
        }
      });
      
      return () => {
        socket.off('resources_updated');
      };
    }
  }, [socket, toast]);  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewResource((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (newResourceErrors[name]) {
      setNewResourceErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle edit form input change
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditResource((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (editResourceErrors[name]) {
      setEditResourceErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate new resource form
  const validateNewResourceForm = () => {
    const errors = {};
    
    if (!newResource.name || !newResource.name.trim()) {
      errors.name = 'Resource name is required';
    } else if (newResource.name.trim().length < 2) {
      errors.name = 'Resource name must be at least 2 characters long';
    } else if (newResource.name.trim().length > 200) {
      errors.name = 'Resource name must be less than 200 characters';
    }
    
    if (!newResource.location_name || !newResource.location_name.trim()) {
      errors.location_name = 'Location is required';
    } else if (newResource.location_name.trim().length > 500) {
      errors.location_name = 'Location must be less than 500 characters';
    }
    
    if (!newResource.type) {
      errors.type = 'Resource type is required';
    }
    
    if (newResource.description && newResource.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    if (newResource.capacity && (isNaN(newResource.capacity) || newResource.capacity < 0)) {
      errors.capacity = 'Capacity must be a valid positive number';
    }
    
    if (newResource.contact_info && newResource.contact_info.length > 500) {
      errors.contact_info = 'Contact info must be less than 500 characters';
    }
    
    setNewResourceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate edit resource form
  const validateEditResourceForm = () => {
    const errors = {};
    
    if (!editResource.name || !editResource.name.trim()) {
      errors.name = 'Resource name is required';
    } else if (editResource.name.trim().length < 2) {
      errors.name = 'Resource name must be at least 2 characters long';
    } else if (editResource.name.trim().length > 200) {
      errors.name = 'Resource name must be less than 200 characters';
    }
    
    if (!editResource.location_name || !editResource.location_name.trim()) {
      errors.location_name = 'Location is required';
    } else if (editResource.location_name.trim().length > 500) {
      errors.location_name = 'Location must be less than 500 characters';
    }
    
    if (!editResource.type) {
      errors.type = 'Resource type is required';
    }
    
    if (editResource.description && editResource.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    if (editResource.capacity && (isNaN(editResource.capacity) || editResource.capacity < 0)) {
      errors.capacity = 'Capacity must be a valid positive number';
    }
    
    if (editResource.contact_info && editResource.contact_info.length > 500) {
      errors.contact_info = 'Contact info must be less than 500 characters';
    }
    
    setEditResourceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle location selection for new resource
  const handleNewResourceLocationSelected = (location) => {
    setNewResourceLocationData(location);
    setNewResource(prev => ({
      ...prev,
      location_name: location.location_name
    }));
  };

  // Handle location selection for edit resource
  const handleEditResourceLocationSelected = (location) => {
    setEditResourceLocationData(location);
    setEditResource(prev => ({
      ...prev,
      location_name: location.location_name
    }));
  };  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate form
      if (!validateNewResourceForm()) {
        return;
      }
        // Prepare resource data
      const resourceData = {
        name: newResource.name,
        location_name: newResource.location_name,
        type: newResource.type,
        // Include geocoded location data if available
        ...(newResourceLocationData && {
          geography_point: newResourceLocationData.geography_point,
          coordinates: newResourceLocationData.coordinates,
        }),
      };
      
      // Add optional fields if provided
      if (newResource.description) resourceData.description = newResource.description;
      if (newResource.availability_status) resourceData.availability_status = newResource.availability_status;
      if (newResource.contact_info) resourceData.contact_info = newResource.contact_info;
      if (newResource.capacity && !isNaN(newResource.capacity)) {
        resourceData.capacity = parseInt(newResource.capacity);
      }
      
      // Submit resource using independent endpoint
      await apiService.createResourceIndependent(resourceData);
        // Reset form and close modal
      setNewResource({
        name: '',
        location_name: '',
        type: 'shelter',
        description: '',
        availability_status: 'available',
        contact_info: '',
        capacity: '',
      });
      setNewResourceLocationData(null);
      onClose();
      
      toast({
        title: 'Success',
        description: 'Resource created successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reload resources to include the new one
      loadResources();
    } catch (err) {
      console.error('Error creating resource:', err);
      toast({
        title: 'Error',
        description: 'Failed to create resource.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
    // Handle edit resource
  const handleEditResource = (resource) => {
    setSelectedResource(resource);
    setEditResource({
      name: resource.name || '',
      location_name: resource.location_name || '',
      type: resource.type || 'shelter',
      description: resource.description || '',
      availability_status: resource.availability_status || 'available',
      contact_info: resource.contact_info || '',
      capacity: resource.capacity || '',    });
    setEditResourceLocationData(null); // Clear location data
    onEditOpen();
  };
  
  // Handle edit form submission
  const handleUpdateResource = async () => {
    try {
      // Validate form
      if (!validateEditResourceForm()) {
        return;
      }
      
      setIsUpdating(true);
        // Prepare resource data
      const resourceData = {
        name: editResource.name,
        location_name: editResource.location_name,
        type: editResource.type,
        // Include geocoded location data if available
        ...(editResourceLocationData && {
          geography_point: editResourceLocationData.geography_point,
          coordinates: editResourceLocationData.coordinates,
        }),
      };
      
      // Add optional fields if provided
      if (editResource.description) resourceData.description = editResource.description;
      if (editResource.availability_status) resourceData.availability_status = editResource.availability_status;
      if (editResource.contact_info) resourceData.contact_info = editResource.contact_info;
      if (editResource.capacity && !isNaN(editResource.capacity)) {
        resourceData.capacity = parseInt(editResource.capacity);
      }
      
      // Update resource
      const updatedResource = await apiService.updateResourceIndependent(selectedResource.id, resourceData);
      
      // Update resource in the list
      setResources(prev => 
        prev.map(resource => 
          resource.id === selectedResource.id ? updatedResource : resource
        )
      );
      
      onEditClose();
      
      toast({
        title: 'Success',
        description: 'Resource updated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error updating resource:', err);
      toast({
        title: 'Error',
        description: 'Failed to update resource.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ...existing code...
  return (
    <Box p={4}>
      <Flex align="center" m={6}>
        <Heading size="lg">Resources Map</Heading>
        <Spacer />
        {(user?.role === 'admin' || user?.role === 'contributor') && (
          <Button
            onClick={onOpen}
            colorScheme="brand"
            size="sm"
          >
            Add Resource
          </Button>
        )}
      </Flex>
        <Flex mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>        <Tabs 
          index={viewMode === 'all' ? 0 : 1} 
          onChange={(index) => setViewMode(index === 0 ? 'all' : 'disaster')}
          variant="enclosed"
          size="sm"
          width="100%"
        >
          <TabList>
            <Tab>All Resources</Tab>
            <Tab>Near Disaster</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel px={0}>
              <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                <Input
                  placeholder="Search by location (e.g., 'New York, NY')..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  flex={1}
                  hidden={true}
                />
                
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  flex={1}
                />
                
                <Select
                  placeholder="Filter by type"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  width={{ base: 'full', md: '200px' }}
                >
                  <option value="shelter">Shelter</option>
                  <option value="medical">Medical</option>
                  <option value="supplies">Supplies</option>
                  <option value="command">Command</option>
                  <option value="food">Food</option>
                  <option value="water">Water</option>
                  <option value="power">Power</option>
                  <option value="evacuation">Evacuation</option>
                </Select>
                
                <Input
                  type="number"
                  placeholder="Radius (km)"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value) || 10)}
                  width={{ base: 'full', md: '120px' }}
                  min={1}
                  max={100}
                />
              </Flex>
            </TabPanel>
            
            <TabPanel px={0}>
              <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                <Select
                  placeholder="Select Disaster"
                  value={selectedDisaster}
                  onChange={(e) => setSelectedDisaster(e.target.value)}
                  flex={1}
                >
                  {disasters.map((disaster) => (
                    <option key={disaster.id} value={disaster.id}>
                      {disaster.title} - {disaster.location_name}
                    </option>
                  ))}
                </Select>
                
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  flex={1}
                />
                
                <Select
                  placeholder="Filter by type"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  width={{ base: 'full', md: '200px' }}
                >
                  <option value="shelter">Shelter</option>
                  <option value="medical">Medical</option>
                  <option value="supplies">Supplies</option>
                  <option value="command">Command</option>
                  <option value="food">Food</option>
                  <option value="water">Water</option>
                  <option value="power">Power</option>
                  <option value="evacuation">Evacuation</option>
                </Select>
                
                <Input
                  type="number"
                  placeholder="Radius (km)"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value) || 10)}
                  width={{ base: 'full', md: '120px' }}
                  min={1}
                  max={100}
                />
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
      
      {isLoading ? (
        <PageLoader message="Loading resources..." />
      ) : error ? (
        <ErrorAlert
          title="Failed to Load"
          message={error}
          onRetry={loadResources}
        />      ) : viewMode === 'disaster' && !selectedDisaster ? (
        <Box textAlign="center" p={8}>
          <Text>Please select a disaster to view resources.</Text>
        </Box>
      ) : (
        <Tabs variant="enclosed" colorScheme="blue" mb={6} index={innerTabIndex} onChange={setInnerTabIndex}>
          <TabList>
            <Tab>Map View</Tab>
            <Tab>List View</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel p={0} pt={4}>
              {resources.length === 0 ? (
                <Box textAlign="center" p={8}>
                  <Text>No resources found for this disaster.</Text>
                  {resourceType && (
                    <Button mt={4} onClick={() => setResourceType('')} variant="outline">
                      Clear Filter
                    </Button>
                  )}
                </Box>
              ) : (
                <Box border="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" h="600px">                  <MapContainer 
                    center={[40.7128, -74.0060]} // Default to NYC 
                    zoom={10} 
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapBounds resources={resources} />{resources.map((resource) => {
                      // Extract coordinates using the new helper function
                      const coords = getResourceCoordinates(resource);
                      
                      if (!coords) {
                        console.log('Could not extract coordinates for resource:', resource.id);
                        return null;
                      }
                      
                      const { lat, lng } = coords;
                      console.log('Resource coordinates:', { lat, lng });

                      return (
                        <Marker key={resource.id} position={[lat, lng]} icon={customIcon}>
                          <Popup>
                            <div>
                              <strong>{resource.name}</strong><br />
                              Type: {resource.type}<br />
                              Location: {resource.location_name}<br />
                              Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}<br />
                              <Button 
                                size="xs" 
                                colorScheme="blue" 
                                mt={2}
                                onClick={() => {
                                  setSelectedResource(resource);
                                  onDetailOpen();
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                    
                    <MapBounds resources={resources} />
                  </MapContainer>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel p={0} pt={4}>
              {resources.length === 0 ? (
                <Box textAlign="center" p={8}>
                  <Text>No resources found for this disaster.</Text>
                  {resourceType && (
                    <Button mt={4} onClick={() => setResourceType('')} variant="outline">
                      Clear Filter
                    </Button>
                  )}
                </Box>
              ) : (                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {resources.map((resource) => {
                    // Extract coordinates from the resource data
                    const coords = getResourceCoordinates(resource);
                    
                    return (
                      <Box
                        key={resource.id}
                        p={5}
                        borderWidth="1px"
                        borderRadius="lg"
                        boxShadow="md"
                        bg="white"
                        cursor="pointer"
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                        transition="all 0.2s"
                        onClick={() => {
                          setSelectedResource(resource);
                          onDetailOpen();
                        }}
                      >
                        <Heading as="h3" size="md" mb={2}>
                          {resource.name}
                        </Heading>
                        <Text>
                          <strong>Location:</strong> {resource.location_name}
                        </Text>
                        <Text>
                          <strong>Type:</strong> {resource.type}
                        </Text>
                        {coords && (
                          <Text>
                            <strong>Coordinates:</strong> {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                          </Text>
                        )}
                        <Text fontSize="sm" color="gray.500" mt={2}>
                          Added: {new Date(resource.created_at).toLocaleDateString()}
                        </Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
      
      {/* Modal for adding new resource */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Resource</ModalHeader>
          <ModalCloseButton />          <ModalBody>
            <FormControl mb={4} isRequired isInvalid={!!newResourceErrors.name}>
              <FormLabel>Resource Name</FormLabel>
              <Input
                name="name"
                value={newResource.name}
                onChange={handleInputChange}
                placeholder="E.g., Red Cross Shelter"
              />
              {newResourceErrors.name && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {newResourceErrors.name}
                </Text>
              )}
            </FormControl>
              <Box mb={4}>
              <LocationSearchInput
                label="Location"
                placeholder="E.g., 123 Main St, New York, NY"
                value={newResource.location_name}
                onChange={handleInputChange}
                onLocationSelected={handleNewResourceLocationSelected}
                isRequired={true}
                helperText="Search for a location to get precise coordinates for mapping."
                size="md"
                isInvalid={!!newResourceErrors.location_name}
                errorMessage={newResourceErrors.location_name}
              />
            </Box>
              <FormControl mb={4} isRequired isInvalid={!!newResourceErrors.type}>
              <FormLabel>Type</FormLabel>
              <Select
                name="type"
                value={newResource.type}
                onChange={handleInputChange}
              >
                <option value="">Select type...</option>
                <option value="shelter">Shelter</option>
                <option value="medical">Medical</option>
                <option value="supplies">Supplies</option>
                <option value="command">Command</option>
                <option value="food">Food</option>
                <option value="water">Water</option>
                <option value="power">Power</option>
                <option value="evacuation">Evacuation</option>
              </Select>
              {newResourceErrors.type && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {newResourceErrors.type}
                </Text>
              )}
            </FormControl>
            
            <FormControl mb={4} isInvalid={!!newResourceErrors.description}>
              <FormLabel>Description</FormLabel>
              <Input
                name="description"
                value={newResource.description}
                onChange={handleInputChange}
                placeholder="Brief description of the resource..."
              />
              {newResourceErrors.description && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {newResourceErrors.description}
                </Text>
              )}
            </FormControl>
              <FormControl mb={4}>
              <FormLabel>Availability Status</FormLabel>
              <Select
                name="availability_status"
                value={newResource.availability_status}
                onChange={handleInputChange}
              >
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </FormControl>
            
            <FormControl mb={4} isInvalid={!!newResourceErrors.contact_info}>
              <FormLabel>Contact Info</FormLabel>
              <Input
                name="contact_info"
                value={newResource.contact_info}
                onChange={handleInputChange}
                placeholder='E.g., {"phone": "555-0123", "email": "contact@example.com"}'
              />
              {newResourceErrors.contact_info && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {newResourceErrors.contact_info}
                </Text>
              )}
            </FormControl>
            
            <FormControl mb={4} isInvalid={!!newResourceErrors.capacity}>
              <FormLabel>Capacity</FormLabel>
              <Input
                name="capacity"
                type="number"
                value={newResource.capacity}
                onChange={handleInputChange}
                placeholder="Maximum capacity (number of people/items)"
              />
              {newResourceErrors.capacity && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {newResourceErrors.capacity}
                </Text>
              )}
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit}>
              Add Resource
            </Button>          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Resource Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Resource Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedResource && (
              <Box>
                <Heading as="h2" size="lg" mb={2}>
                  {selectedResource.name}
                </Heading>
                <Badge colorScheme="blue" mb={4}>
                  {selectedResource.type}
                </Badge>
                
                <Divider my={4} />
                
                <Text fontSize="md" fontWeight="bold" mb={1}>
                  Location
                </Text>
                <Text mb={4}>{selectedResource.location_name}</Text>
                  {selectedResource && (getResourceCoordinates(selectedResource)) && (
                  <>
                    <Text fontSize="md" fontWeight="bold" mb={1}>
                      Coordinates
                    </Text>
                    <Text mb={4} fontFamily="monospace">
                      {(() => {
                        const coords = getResourceCoordinates(selectedResource);
                        if (coords) {
                          return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
                        }
                        return 'Not available';
                      })()}
                    </Text>
                  </>
                )}
                  <Text fontSize="md" fontWeight="bold" mb={1}>
                  Added On
                </Text>
                <Text mb={4}>
                  {new Date(selectedResource.created_at).toLocaleString()}
                </Text>
                
                {selectedResource.description && (
                  <>
                    <Text fontSize="md" fontWeight="bold" mb={1}>
                      Description
                    </Text>
                    <Text mb={4}>
                      {selectedResource.description}
                    </Text>
                  </>
                )}
                
                {selectedResource.availability_status && (
                  <>
                    <Text fontSize="md" fontWeight="bold" mb={1}>
                      Availability Status
                    </Text>
                    <Badge 
                      colorScheme={
                        selectedResource.availability_status === 'available' ? 'green' :
                        selectedResource.availability_status === 'limited' ? 'yellow' : 'red'
                      }
                      mb={4}
                    >
                      {selectedResource.availability_status}
                    </Badge>
                  </>
                )}
                
                {selectedResource.capacity && (
                  <>
                    <Text fontSize="md" fontWeight="bold" mb={1}>
                      Capacity
                    </Text>
                    <Text mb={4}>
                      {selectedResource.capacity}
                    </Text>
                  </>
                )}
                
                {selectedResource.contact_info && (
                  <>
                    <Text fontSize="md" fontWeight="bold" mb={1}>
                      Contact Information
                    </Text>
                    <Text mb={4} fontFamily="monospace" fontSize="sm">
                      {typeof selectedResource.contact_info === 'object' 
                        ? JSON.stringify(selectedResource.contact_info, null, 2)
                        : selectedResource.contact_info
                      }
                    </Text>
                  </>
                )}
                
                <Text fontSize="md" fontWeight="bold" mb={1}>
                  Resource ID
                </Text>
                <Text mb={4} fontFamily="monospace">
                  {selectedResource.id}
                </Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onDetailClose}>
              Close
            </Button>            
            {user?.role === 'admin' || user?.role=='contributor' && (
              <>
                <Button 
                  variant="outline" 
                  colorScheme="blue"
                  mr={3}
                  onClick={() => {
                    onDetailClose();
                    handleEditResource(selectedResource);
                  }}
                >
                  Edit Resource
                </Button>
                {user?.role === 'admin' &&(
                <Button 
                  variant="outline" 
                  colorScheme="red"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this resource?')) {
                      console.log(selectedResource);
                      apiService.deleteResource(selectedResource.id)
                        .then(() => {
                          toast({
                            title: 'Resource Deleted',
                            description: 'The resource has been successfully deleted.',
                            status: 'success',
                            duration: 5000,
                            isClosable: true,
                          });
                          onDetailClose();
                          // Resources will be updated via socket
                        })
                        .catch(err => {
                          console.error('Error deleting resource:', err);
                          toast({
                            title: 'Error',
                            description: 'Failed to delete resource.',
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                          });
                        });
                    }
                  }}
                >
                  Delete Resource
                </Button>
                )}
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for editing resource */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Resource</ModalHeader>
          <ModalCloseButton />
          <ModalBody>            {selectedResource && (
              <Box>
                <FormControl mb={4} isRequired isInvalid={!!editResourceErrors.name}>
                  <FormLabel>Resource Name</FormLabel>
                  <Input
                    name="name"
                    value={editResource.name}
                    onChange={handleEditInputChange}
                    placeholder="E.g., Red Cross Shelter"
                  />
                  {editResourceErrors.name && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {editResourceErrors.name}
                    </Text>
                  )}
                </FormControl>
                  <Box mb={4}>
                  <LocationSearchInput
                    label="Location"
                    placeholder="E.g., 123 Main St, New York, NY"
                    value={editResource.location_name}
                    onChange={handleEditInputChange}
                    onLocationSelected={handleEditResourceLocationSelected}
                    isRequired={true}
                    helperText="Search for a location to get precise coordinates for mapping."
                    size="md"
                    isInvalid={!!editResourceErrors.location_name}
                    errorMessage={editResourceErrors.location_name}
                  />
                </Box>
                  <FormControl mb={4} isRequired isInvalid={!!editResourceErrors.type}>
                  <FormLabel>Type</FormLabel>
                  <Select
                    name="type"
                    value={editResource.type}
                    onChange={handleEditInputChange}
                  >
                    <option value="">Select type...</option>
                    <option value="shelter">Shelter</option>
                    <option value="medical">Medical</option>
                    <option value="supplies">Supplies</option>
                    <option value="command">Command</option>
                    <option value="food">Food</option>
                    <option value="water">Water</option>
                    <option value="power">Power</option>
                    <option value="evacuation">Evacuation</option>
                  </Select>
                  {editResourceErrors.type && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {editResourceErrors.type}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl mb={4} isInvalid={!!editResourceErrors.description}>
                  <FormLabel>Description</FormLabel>
                  <Input
                    name="description"
                    value={editResource.description}
                    onChange={handleEditInputChange}
                    placeholder="Brief description of the resource..."
                  />
                  {editResourceErrors.description && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {editResourceErrors.description}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl mb={4}>
                  <FormLabel>Availability Status</FormLabel>
                  <Select
                    name="availability_status"
                    value={editResource.availability_status}
                    onChange={handleEditInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="unavailable">Unavailable</option>
                  </Select>
                </FormControl>
                  <FormControl mb={4} isInvalid={!!editResourceErrors.contact_info}>
                  <FormLabel>Contact Info</FormLabel>
                  <Input
                    name="contact_info"
                    value={editResource.contact_info}
                    onChange={handleEditInputChange}
                    placeholder='E.g., {"phone": "555-0123", "email": "contact@example.com"}'
                  />
                  {editResourceErrors.contact_info && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {editResourceErrors.contact_info}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl mb={4} isInvalid={!!editResourceErrors.capacity}>
                  <FormLabel>Capacity</FormLabel>
                  <Input
                    name="capacity"
                    type="number"
                    value={editResource.capacity}
                    onChange={handleEditInputChange}
                    placeholder="Maximum capacity (number of people/items)"
                  />
                  {editResourceErrors.capacity && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {editResourceErrors.capacity}
                    </Text>
                  )}
                </FormControl>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdateResource} isLoading={isUpdating}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ResourcesMap;
