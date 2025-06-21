import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Container,
  Flex,
  Image,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Divider,
  Spinner,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';
import ErrorAlert from '../components/ErrorAlert';

const ReportIncident = ({ socket }) => {
  const [disasters, setDisasters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    disaster_id: '',
    content: '',
    image_url: '',
  });

  // Load disasters for dropdown
  useEffect(() => {
    const fetchDisasters = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getAllDisasters();
        setDisasters(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching disasters:', err);
        setError('Failed to load disasters. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisasters();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear verification result when image URL changes
    if (name === 'image_url') {
      setVerificationResult(null);
    }
  };

  // Verify image before submission
  const verifyImage = async () => {
    if (!formData.image_url) {
      toast({
        title: 'Verification Error',
        description: 'Please provide an image URL to verify',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsVerifying(true);
    try {
      const data = await apiService.verifyImage({
        disaster_id: formData.disaster_id,
        image_url: formData.image_url,
      });
      
      setVerificationResult(data.verification_result);
      
      toast({
        title: data.verification_result.authentic ? 'Image Verified' : 'Image Verification Failed',
        description: data.verification_result.message,
        status: data.verification_result.authentic ? 'success' : 'warning',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error verifying image:', err);
      toast({
        title: 'Verification Error',
        description: 'Failed to verify image. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.disaster_id || !formData.content) {
      toast({
        title: 'Validation Error',
        description: 'Please select a disaster and provide a description',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiService.createReport(formData);
      
      // Success
      toast({
        title: 'Report Submitted',
        description: 'Your incident report has been submitted successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setFormData({
        disaster_id: '',
        content: '',
        image_url: '',
      });
      
      // Navigate to disaster detail
      navigate(`/disasters/${formData.disaster_id}`);
    } catch (err) {
      console.error('Error submitting report:', err);
      toast({
        title: 'Submission Error',
        description: 'Failed to submit report. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading disasters..." />;
  }

  if (error) {
    return (
      <ErrorAlert
        title="Failed to Load"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Report Incident
        </Heading>
        
        <Text fontSize="md" textAlign="center" color="gray.600">
          Submit a report about a disaster incident. Your report will help coordinate response efforts.
        </Text>
        
        <Card variant="outline">
          <CardHeader>
            <Heading size="md">Submit Report</Heading>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={6} as="form" onSubmit={handleSubmit}>
              <FormControl isRequired>
                <FormLabel>Disaster</FormLabel>
                <Select
                  name="disaster_id"
                  value={formData.disaster_id}
                  onChange={handleInputChange}
                  placeholder="Select disaster"
                >
                  {disasters.map((disaster) => (
                    <option key={disaster.id} value={disaster.id}>
                      {disaster.title} - {disaster.location_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Describe the incident, needs, or situation"
                  rows={5}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>
                  Image URL 
                  <Badge ml={2} colorScheme="blue">Optional</Badge>
                </FormLabel>
                <Input
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="URL to an image of the incident"
                />
                <Flex mt={2} justifyContent="flex-end">
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={verifyImage}
                    isLoading={isVerifying}
                    loadingText="Verifying"
                    isDisabled={!formData.image_url}
                  >
                    Verify Image
                  </Button>
                </Flex>
              </FormControl>
              
              {verificationResult && (
                <Alert
                  status={verificationResult.authentic ? 'success' : 'warning'}
                  variant="subtle"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  borderRadius="md"
                  p={4}
                >
                  <AlertIcon boxSize="40px" mr={0} />
                  <AlertTitle mt={4} mb={1} fontSize="lg">
                    {verificationResult.authentic ? 'Image Verified' : 'Verification Warning'}
                  </AlertTitle>
                  <AlertDescription maxWidth="sm">
                    {verificationResult.message}
                    {verificationResult.confidence && (
                      <Text mt={2} fontWeight="bold">
                        Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
                      </Text>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {formData.image_url && (
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden" mt={4}>
                  <Image
                    src={formData.image_url}
                    alt="Incident image"
                    fallback={<Box p={8} textAlign="center">
                      <Text>Image preview not available</Text>
                    </Box>}
                  />
                </Box>
              )}
              
              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="full"
                mt={8}
                isLoading={isSubmitting}
                loadingText="Submitting"
              >
                Submit Report
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default ReportIncident;
