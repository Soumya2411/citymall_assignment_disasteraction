import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Spinner,
  Image,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useDisclosure,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import apiService from '../services/apiService';
import ErrorAlert from '../components/ErrorAlert';
import LocationSearchInput from '../components/LocationSearchInput';
import { useAuth } from '../contexts/AuthContext';

const DisasterDetail = ({ socket }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disaster, setDisaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [socialMedia, setSocialMedia] = useState([]);
  const [resources, setResources] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [reports, setReports] = useState([]);
  const toast = useToast();
  
  // Edit disaster modal state
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editFormData, setEditFormData] = useState({
    title: '',    location_name: '',
    description: '',
  });  const [editTags, setEditTags] = useState([]);
  const [currentEditTag, setCurrentEditTag] = useState('');
  const [editLocationData, setEditLocationData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get severity color
  const getSeverityColor = (level) => {
    switch (level) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'yellow';
      default:
        return 'gray';
    }
  };
  // Get status color
  const getStatusColor = (statusValue) => {
    switch (statusValue) {
      case 'active':
        return 'red';
      case 'contained':
        return 'orange';
      case 'resolved':
        return 'green';
      default:
        return 'gray';
    }
  };

  // Get verification status color
  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified':
        return 'green';
      case 'rejected':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  // Handle report verification
  const handleVerifyReport = async (reportId, newStatus) => {
    try {
      await apiService.updateReportVerification(id, reportId, newStatus);
      
      // Update the local state
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, verification_status: newStatus }
            : report
        )
      );
      
      toast({
        title: 'Report Updated',
        description: `Report has been ${newStatus}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error updating report verification:', err);
      toast({
        title: 'Error',
        description: 'Failed to update report verification',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };


  // Delete disaster function
  const handleDeleteDisaster = async () => {
    if (!window.confirm('Are you sure you want to delete this disaster? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteDisaster(id);
      
      toast({
        title: 'Disaster Deleted',
        description: 'The disaster has been successfully deleted.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate back to dashboard
      navigate('/');
    } catch (error) {
      console.error('Error deleting disaster:', error);
      
      toast({
        title: 'Error Deleting Disaster',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    }
  };

  // Check if user can delete disaster (admin or owner)
  const canDeleteDisaster = user && (user.role === 'admin' || user.id === disaster?.owner_id);
  
  // Check if user can edit disaster (admin or owner)
  const canEditDisaster = user && (user.role === 'admin' || user.id === disaster?.owner_id);    // Handle opening edit modal
  const handleEditDisaster = () => {
    if (disaster) {
      setEditFormData({
        title: disaster.title,
        location_name: disaster.location_name,
        description: disaster.description,
      });
      setEditTags(disaster.tags || []);
      
      // Pre-populate location data if disaster has coordinates
      if (disaster.coordinates && disaster.location_name) {
        setEditLocationData({
          location_name: disaster.location_name,
          coordinates: disaster.coordinates,
          geography_point: disaster.geography_point,
        });
      } else {
        setEditLocationData(null); // Clear location data
      }
      
      onEditOpen();
    }
  };
  // Handle edit form input change
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (editErrors[name]) {
      setEditErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle location selection for edit disaster
  const handleEditLocationSelected = (location) => {
    setEditLocationData(location);
    setEditFormData(prev => ({
      ...prev,
      location_name: location.location_name
    }));
  };
  // Validate edit disaster form
  const validateEditForm = () => {
    const errors = {};
    
    if (!editFormData.title || !editFormData.title.trim()) {
      errors.title = 'Title is required';
    } else if (editFormData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long';
    } else if (editFormData.title.trim().length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }
    
    if (!editFormData.description || !editFormData.description.trim()) {
      errors.description = 'Description is required';
    } else if (editFormData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    } else if (editFormData.description.trim().length > 5000) {
      errors.description = 'Description must be less than 5000 characters';
    }
    
    // Validate location selection requirement
    if (!editFormData.location_name || !editFormData.location_name.trim()) {
      errors.location_name = 'Location is required';
    } else if (!editLocationData) {
      errors.location_name = 'Please select a location from the search results';
    } else if (editFormData.location_name.trim().length > 500) {
      errors.location_name = 'Location name must be less than 500 characters';
    }
    
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle adding tag in edit modal
  const handleAddEditTag = () => {
    if (currentEditTag.trim() && !editTags.includes(currentEditTag.trim())) {
      setEditTags(prev => [...prev, currentEditTag.trim()]);
      setCurrentEditTag('');
    }
  };
  
  // Handle removing tag in edit modal
  const handleRemoveEditTag = (tagToRemove) => {
    setEditTags(prev => prev.filter(tag => tag !== tagToRemove));
  };
    // Handle edit form submission
  const handleUpdateDisaster = async () => {
    if (!validateEditForm()) {
      return;
    }
    
    setIsUpdating(true);
      try {
      const updateData = {
        ...editFormData,
        tags: editTags.length > 0 ? editTags : undefined,
        // Include geocoded location data if available
        ...(editLocationData && {
          geography_point: editLocationData.geography_point,
          coordinates: editLocationData.coordinates,
        }),
      };
      
      const updatedDisaster = await apiService.updateDisaster(id, updateData);
      setDisaster(updatedDisaster);
      onEditClose();
      
      toast({
        title: 'Disaster Updated',
        description: 'The disaster has been successfully updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating disaster:', error);
      
      toast({
        title: 'Error Updating Disaster',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch disaster details
  useEffect(() => {
    const fetchDisasterDetails = async () => {
      setLoading(true);
      try {
        // Fetch disaster details
        const disasterData = await apiService.getDisasterById(id);
        setDisaster(disasterData);
          // Fetch related data
        const [socialMediaData, resourcesData, updatesData, reportsData] = await Promise.allSettled([
          apiService.getSocialMediaByDisasterId(id),
          apiService.getResourcesByDisasterId(id),
          apiService.getOfficialUpdatesByDisasterId(id),
          apiService.getReportsByDisasterId(id),
        ]);
        
        if (socialMediaData.status === 'fulfilled') {
          setSocialMedia(socialMediaData.value);
        }
        
        if (resourcesData.status === 'fulfilled') {
          setResources(resourcesData.value);
        }
        
        if (updatesData.status === 'fulfilled') {
          setUpdates(updatesData.value);
        }
        
        if (reportsData.status === 'fulfilled') {
          setReports(reportsData.value);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching disaster details:', err);
        setError('Failed to load disaster details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDisasterDetails();
  }, [id]);

  // Setup socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for social media updates
    socket.on('social_media_updated', (data) => {
      if (data.disaster_id === id) {
        setSocialMedia((prev) => {
          // Handle create, update, or delete actions
          if (data.action === 'create') {
            toast({
              title: 'New social media post',
              description: 'A new social media post has been added',
              status: 'info',
              duration: 3000,
              isClosable: true,
            });
            return [...prev, data.post];
          } else if (data.action === 'update') {
            return prev.map((post) => (post.id === data.post.id ? data.post : post));
          } else if (data.action === 'delete') {
            return prev.filter((post) => post.id !== data.post_id);
          }
          return prev;
        });
      }
    });

    // Listen for resource updates
    socket.on('resources_updated', (data) => {
      if (data.disaster_id === id) {
        setResources((prev) => {
          // Handle create, update, or delete actions
          if (data.action === 'create') {
            toast({
              title: 'New resource',
              description: 'A new resource has been added',
              status: 'info',
              duration: 3000,
              isClosable: true,
            });
            return [...prev, data.resource];
          } else if (data.action === 'update') {
            return prev.map((resource) => (resource.id === data.resource.id ? data.resource : resource));
          } else if (data.action === 'delete') {
            return prev.filter((resource) => resource.id !== data.resource_id);
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off('social_media_updated');
      socket.off('resources_updated');
    };
  }, [socket, id, toast]);

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading disaster details...</Text>
      </Box>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!disaster) {
    return (
      <Box textAlign="center" py={10}>
        <Text>Disaster not found</Text>
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py={5}>
      <VStack align="stretch" spacing={6}>
        {disaster.image_url && (
          <Image
            src={disaster.image_url}
            alt={disaster.title}
            height="300px"
            width="100%"
            objectFit="cover"
            borderRadius="md"
            fallbackSrc="https://via.placeholder.com/1200x300?text=No+Image"
          />
        )}

        <HStack spacing={2}>
          {disaster.severity && (
            <Badge colorScheme={getSeverityColor(disaster.severity)} variant="solid">
              {disaster.severity.toUpperCase()}
            </Badge>
          )}
          {disaster.status && (
            <Badge colorScheme={getStatusColor(disaster.status)}>
              {disaster.status.toUpperCase()}
            </Badge>
          )}
          {disaster.tags && disaster.tags.map((tag) => (
            <Badge key={tag} colorScheme="blue" variant="outline">
              {tag}
            </Badge>
          ))}
        </HStack>        <HStack justify="space-between" align="center" w="full">
          <Heading as="h1" size="xl">
            {disaster.title}
          </Heading>
          
          <HStack spacing={2}>
            {canEditDisaster && (
              <Button
                colorScheme="blue"
                variant="outline"
                size="sm"
                onClick={handleEditDisaster}
              >
                Edit Disaster
              </Button>
            )}
            
            {canDeleteDisaster && (
              <Button
                colorScheme="red"
                variant="outline"
                size="sm"
                onClick={handleDeleteDisaster}
              >
                Delete Disaster
              </Button>
            )}
          </HStack>
        </HStack>

        <Text fontSize="lg" fontWeight="bold">
          Location: {disaster.location_name}
        </Text>

        <Box bg="white" p={5} borderRadius="md" shadow="md">
          <Heading as="h3" size="md" mb={2}>
            Description
          </Heading>
          <Text>{disaster.description}</Text>
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600">
            Created by {disaster.owner_id} on {formatDate(disaster.created_at)}
          </Text>
          {disaster.updated_at !== disaster.created_at && (
            <Text fontSize="sm" color="gray.600">
              Last updated: {formatDate(disaster.updated_at)}
            </Text>
          )}
        </Box>

        <Divider />

        <Tabs variant="enclosed" colorScheme="blue" isLazy>          <TabList>
            <Tab>Resources ({resources.length})</Tab>
            <Tab>Reports ({reports.length})</Tab>
            <Tab>Social Media ({socialMedia.length})</Tab>
            <Tab>Official Updates ({updates.length})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {resources.length === 0 ? (
                <Text>No resources available for this disaster.</Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {resources.map((resource) => (
                    <Box key={resource.id} p={4} borderWidth="1px" borderRadius="md" bg="white">
                      <Heading as="h4" size="md">
                        {resource.name}
                      </Heading>
                      <Text>Location: {resource.location_name}</Text>
                      <Text>Type: {resource.type}</Text>
                      <Text fontSize="sm" color="gray.500">
                        Added: {formatDate(resource.created_at)}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>            <TabPanel>
              
         
              {reports.length === 0 ? (
                <Text>No incident reports available for this disaster.</Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {reports.map((report) => (
                    <Box key={report.id} p={4} borderWidth="1px" borderRadius="md" bg="white">
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Text fontWeight="bold">Report #{report.id}</Text>
                          <Badge colorScheme={getVerificationColor(report.verification_status)}>
                            {report.verification_status?.toUpperCase() || 'PENDING'}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {formatDate(report.created_at)}
                        </Text>
                      </HStack>
                      
                      <Text mb={3}>{report.content}</Text>
                      
                      {report.image_url && (
                        <Image
                          src={report.image_url}
                          alt="Report evidence"
                          maxH="200px"
                          objectFit="cover"
                          borderRadius="md"
                          mb={3}
                        />
                      )}
                      
                      <Text fontSize="sm" color="gray.500" mb={3}>
                        Reported by: User {report.user_id}
                      </Text>
                        {/* Admin and Contributor controls */}
                      {user && (user.role === 'admin' || user.role === 'contributor') && (
                        <VStack align="stretch" spacing={2}>
                          {/* Verification controls - for pending reports */}
                          {report.verification_status === 'pending' && (
                            <HStack spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="green"
                                onClick={() => handleVerifyReport(report.id, 'verified')}
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="red"
                                onClick={() => handleVerifyReport(report.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </HStack>
                          )}
                          
              
                        
                        </VStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>

            <TabPanel>
              {socialMedia.length === 0 ? (
                <Text>No social media posts available for this disaster.</Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {socialMedia.map((post) => (
                    <Box key={post.id} p={4} borderWidth="1px" borderRadius="md" bg="white">
                      <HStack mb={2}>
                        <Text fontWeight="light">@{post.user.id }</Text>                        
                        <Text fontWeight="semibold" textTransform="capitalize">{post.user.username }</Text>                        
                        <Text fontSize="sm" color="gray.500">
                          {formatDate(post.timestamp)}
                        </Text>
                      </HStack>
                      <Text>{post.content}</Text>
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>

            <TabPanel>
              {updates.length === 0 ? (
                <Text>No official updates available for this disaster.</Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {updates.map((update) => (
                    <Box key={update.id} p={4} borderWidth="1px" borderRadius="md" bg="white">
                      <Heading as="h4" size="md">
                        {update.title}
                      </Heading>
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Source: {update.source} - {formatDate(update.published_at)}
                      </Text>
                      <Text>{update.content}</Text>
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>          </TabPanels>
        </Tabs>
      </VStack>
      
      {/* Edit Disaster Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Disaster</ModalHeader>
          <ModalCloseButton />          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={!!editErrors.title}>
                <FormLabel>Disaster Title</FormLabel>
                <Input
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  placeholder="e.g., Hurricane Katrina Response"
                />
                {editErrors.title && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {editErrors.title}
                  </Text>
                )}
              </FormControl>              <Box>
                <LocationSearchInput
                  label="Location"
                  placeholder="e.g., New Orleans, Louisiana"
                  value={editFormData.location_name}
                  onChange={handleEditInputChange}
                  onLocationSelected={handleEditLocationSelected}
                  helperText="Search for and select a location to get precise coordinates."
                  size="md"
                  isRequired={true}
                  isInvalid={!!editErrors.location_name}
                  errorMessage={editErrors.location_name}
                  requireSelection={true}
                />
              </Box>

              <FormControl isRequired isInvalid={!!editErrors.description}>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  placeholder="Provide detailed information about the disaster..."
                  rows={4}
                  resize="vertical"
                />                {editErrors.description && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {editErrors.description}
                  </Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <HStack>
                  <Input
                    value={currentEditTag}
                    onChange={(e) => setCurrentEditTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEditTag())}
                    placeholder="Add tags (e.g., hurricane, flood, evacuation)"
                    flex={1}
                  />
                  <Button onClick={handleAddEditTag} colorScheme="blue" variant="outline">
                    Add Tag
                  </Button>
                </HStack>
                
                {editTags.length > 0 && (
                  <Box mt={3}>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Current tags:
                    </Text>
                    <Wrap>
                      {editTags.map((tag, index) => (
                        <WrapItem key={index}>
                          <Tag size="md" colorScheme="blue" variant="solid">
                            <TagLabel>{tag}</TagLabel>
                            <TagCloseButton onClick={() => handleRemoveEditTag(tag)} />
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdateDisaster}
              isLoading={isUpdating}
              loadingText="Updating..."
            >
              Update Disaster
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default DisasterDetail;
