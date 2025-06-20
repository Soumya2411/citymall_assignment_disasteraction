import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@chakra-ui/react';
import apiService from '../services/apiService';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../contexts/AuthContext';

const DisasterDetail = ({ socket }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const [disaster, setDisaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [socialMedia, setSocialMedia] = useState([]);
  const [resources, setResources] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [reports, setReports] = useState([]);
  const toast = useToast();

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
  // Handle report update
  const handleUpdateReport = async (reportId) => {
    // For now, just show a toast - in a real app, this would open an edit form
    toast({
      title: 'Update Report',
      description: `Update functionality for report ${reportId} would open an edit form here`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle report deletion
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteReport(reportId);
      
      // Remove from local state
      setReports(prev => prev.filter(report => report.id !== reportId));
      
      toast({
        title: 'Report Deleted',
        description: 'Report has been successfully deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle create report

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
        </HStack>

        <Heading as="h1" size="xl">
          {disaster.title}
        </Heading>

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
                          
                          {/* Admin-only controls */}
                          {user.role === 'admin' && (
                            <HStack spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={() => handleUpdateReport(report.id)}
                              >
                                Update
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => handleDeleteReport(report.id)}
                              >
                                Delete
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
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default DisasterDetail;
