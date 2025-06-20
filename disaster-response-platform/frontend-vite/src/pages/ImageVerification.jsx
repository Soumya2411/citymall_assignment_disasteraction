import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Container,
  Card,
  CardBody,
  CardHeader,
  Image,
  Badge,
  Flex,
  Divider,
  Spinner,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import apiService from '../services/apiService';
import PageLoader from '../components/PageLoader';
import ErrorAlert from '../components/ErrorAlert';

const ImageVerification = () => {
  const [disasters, setDisasters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);  const [verificationResult, setVerificationResult] = useState(null);
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    disaster_id: '',
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

  // Verify image
  const verifyImage = async (e) => {
    e.preventDefault();
    
    if (!formData.image_url) {
      toast({
        title: 'Validation Error',
        description: 'Please provide an image URL to verify',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!formData.disaster_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a disaster for context',
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
        title: data.verification_result.authentic ? 'Image Verified' : 'Image Verification Warning',
        description: data.verification_result.analysis,
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
          Image Verification
        </Heading>
        
        <Text fontSize="md" textAlign="center" color="gray.600">
          Verify the authenticity of disaster-related images using AI analysis
        </Text>
        
        <Card variant="outline">
          <CardHeader>
            <Heading size="md">Verify Image</Heading>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={6} as="form" onSubmit={verifyImage}>
              <FormControl isRequired>
                <FormLabel>Disaster Context</FormLabel>
                <Select
                  name="disaster_id"
                  value={formData.disaster_id}
                  onChange={handleInputChange}
                  placeholder="Select disaster for context"
                >
                  {disasters.map((disaster) => (
                    <option key={disaster.id} value={disaster.id}>
                      {disaster.title} - {disaster.location_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>
                  Image URL
                  <Badge ml={2} colorScheme="blue">Required</Badge>
                </FormLabel>
                <Input
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="Enter URL of the image to verify"
                />
              </FormControl>
                <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="full"
                isLoading={isVerifying}
                loadingText="Analyzing Image..."
                leftIcon={!isVerifying ? <CheckIcon /> : <Spinner size="sm" />}
              >
                Verify Image
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Verification Results */}
        {verificationResult && (
          <Card variant="outline">
            <CardHeader>
              <Heading size="md">Verification Results</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Alert
                  status={verificationResult.authentic ? 'success' : 'warning'}
                  variant="subtle"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  borderRadius="md"
                  p={6}
                >
                  <AlertIcon boxSize="40px" mr={0} />
                  <AlertTitle mt={4} mb={1} fontSize="lg">
                    {verificationResult.authentic ? 'Image Appears Authentic' : 'Verification Warning'}
                  </AlertTitle>
                  <AlertDescription maxWidth="sm">
                    <Text mb={2}>{verificationResult.analysis}</Text>
                    {verificationResult.confidence && (
                      <Badge 
                        colorScheme={verificationResult.confidence > 70 ? 'green' : 'yellow'}
                        fontSize="md"
                        p={2}
                      >
                        Confidence: {verificationResult.confidence}%
                      </Badge>
                    )}
                  </AlertDescription>
                </Alert>

                {verificationResult.issues && verificationResult.issues.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Heading size="sm" mb={2}>Issues Detected:</Heading>
                      <VStack align="start" spacing={1}>
                        {verificationResult.issues.map((issue, index) => (
                          <Text key={index} fontSize="sm" color="red.600">
                            • {issue}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Image Preview */}
        {formData.image_url && (
          <Card variant="outline">
            <CardHeader>
              <Heading size="md">Image Preview</Heading>
            </CardHeader>
            <CardBody>
              <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Image
                  src={formData.image_url}
                  alt="Image to verify"
                  width="100%"
                  maxH="400px"
                  objectFit="contain"
                  fallback={
                    <Box p={8} textAlign="center">
                      <Text>Unable to load image preview</Text>
                      <Text fontSize="sm" color="gray.500" mt={2}>
                        The image will still be analyzed when you click "Verify Image"
                      </Text>
                    </Box>
                  }
                />
              </Box>
            </CardBody>
          </Card>
        )}

        {/* Information Card */}
        <Card variant="outline" bg="blue.50">
          <CardBody>
            <VStack spacing={3} align="start">
              <Heading size="sm" color="blue.700">
                How Image Verification Works
              </Heading>
              <Text fontSize="sm" color="blue.600">
                • Our AI analyzes images for signs of manipulation, doctoring, or misrepresentation
              </Text>
              <Text fontSize="sm" color="blue.600">
                • The system checks for digital artifacts, inconsistencies, and contextual accuracy
              </Text>
              <Text fontSize="sm" color="blue.600">
                • Results include confidence scores and specific issues if detected
              </Text>
              <Text fontSize="sm" color="blue.600">
                • This tool helps verify the authenticity of disaster-related imagery
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default ImageVerification;
