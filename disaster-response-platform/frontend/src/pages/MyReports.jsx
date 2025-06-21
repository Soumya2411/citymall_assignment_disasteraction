import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  useToast,
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
  Select,
  useDisclosure,
  Spinner,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import PageLoader from '../components/PageLoader';
import ErrorAlert from '../components/ErrorAlert';

const MyReports = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit modal state
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [selectedReport, setSelectedReport] = useState(null);  const [editFormData, setEditFormData] = useState({
    disaster_id: '',
    content: '',
    image_url: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  // Load user's reports
  const loadMyReports = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const data = await apiService.getReportsByUser(user.id);
            console.log(data)

      setReports(data);
      setError(null);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Failed to load your reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load disasters for dropdown
  const loadDisasters = async () => {
    try {
      const data = await apiService.getAllDisasters();
      setDisasters(data);
    } catch (err) {
      console.error('Error loading disasters:', err);
    }
  };
  useEffect(() => {
    loadMyReports();
    loadDisasters();
  }, [loadMyReports]);
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get verification status color
  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified':
        return 'green';
      case 'rejected':
        return 'red';
      case 'pending':
        return 'orange';
      default:
        return 'gray';
    }
  };
  // Handle edit report
  const handleEditReport = (report) => {
    setSelectedReport(report);
    setEditFormData({
      disaster_id: report.disaster_id || '',
      content: report.content || '',
      image_url: report.image_url || '',
    });
    onEditOpen();
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle update report
  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    setIsUpdating(true);
    
    try {
      const updatedReport = await apiService.updateReport(selectedReport.id, editFormData);
      
      // Update the report in the list
      setReports(prev => 
        prev.map(report => 
          report.id === selectedReport.id ? updatedReport : report
        )
      );
      
      onEditClose();
      
      toast({
        title: 'Report Updated',
        description: 'Your report has been successfully updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating report:', error);
      
      toast({
        title: 'Error Updating Report',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteReport(reportId);
      
      // Remove the report from the list
      setReports(prev => prev.filter(report => report.id !== reportId));
      
      toast({
        title: 'Report Deleted',
        description: 'Your report has been successfully deleted.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      
      toast({
        title: 'Error Deleting Report',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading your reports..." />;
  }

  if (error) {
    return (
      <ErrorAlert
        title="Failed to Load Reports"
        message={error}
        onRetry={loadMyReports}
      />
    );
  }

  return (
    <Box p={6}>
      <Flex align="center" mb={6}>
        <Heading size="lg">My Reports</Heading>
        <Spacer />
        <Text color="gray.600">
          Total Reports: {reports.length}
        </Text>
      </Flex>

      {reports.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text fontSize="lg" color="gray.500" mb={4}>
            You haven't submitted any reports yet.
          </Text>
          <Text color="gray.400">
            Start reporting incidents to help with disaster response coordination.
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {reports.map((report) => (
            <Card key={report.id} variant="outline">              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Badge colorScheme="blue" variant="outline">
                    Report #{report.id.substring(0, 8)}
                  </Badge>
                  <Badge colorScheme={getVerificationColor(report.verification_status)}>
                    {report.verification_status || 'pending'}
                  </Badge>
                </HStack>
              </CardHeader>
                <CardBody pt={0}>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="sm" noOfLines={3}>
                    {report.content}
                  </Text>
                  
                  <Text fontSize="xs" color="gray.500">
                    Reported: {formatDate(report.created_at)}
                  </Text>
                  
                  {report.image_url && (
                    <Text fontSize="xs" color="blue.500">
                      📷 Image attached
                    </Text>
                  )}
                  
                  <HStack spacing={2} pt={2}>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleEditReport(report)}
                    >
                      Edit
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
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Edit Report Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Disaster</FormLabel>
                <Select
                  name="disaster_id"
                  value={editFormData.disaster_id}
                  onChange={handleInputChange}
                  placeholder="Select disaster (optional)"
                >
                  {disasters.map((disaster) => (
                    <option key={disaster.id} value={disaster.id}>
                      {disaster.title} - {disaster.location_name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Report Content</FormLabel>
                <Textarea
                  name="content"
                  value={editFormData.content}
                  onChange={handleInputChange}
                  placeholder="Describe the incident in detail..."
                  rows={4}
                  resize="vertical"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Image URL</FormLabel>
                <Input
                  name="image_url"
                  value={editFormData.image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdateReport}
              isLoading={isUpdating}
              loadingText="Updating..."
            >
              Update Report
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MyReports;
