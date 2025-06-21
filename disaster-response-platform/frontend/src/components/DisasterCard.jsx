import React from 'react';
import {
  Box,
  Badge,
  Heading,
  Text,
  Stack,
  HStack,
  Image,
  Link,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const DisasterCard = ({ disaster }) => {
  const {
    id,
    title,
    location_name,
    description,
    severity,
    status,
    tag,
    created_at,
    updated_at,
    image_url,
  } = disaster;

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
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

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={useColorModeValue('white', 'gray.700')}
      boxShadow="md"
      transition="transform 0.2s"
      _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg' }}
    >
      {image_url && (
        <Image
          src={image_url}
          alt={title}
          height="180px"
          width="100%"
          objectFit="cover"
          fallbackSrc="https://via.placeholder.com/640x360?text=No+Image"
        />
      )}      <Box p={5}>
        <Stack spacing={2}>
          <HStack>
            {severity && (
              <Badge colorScheme={getSeverityColor(severity)} variant="solid">
                {severity.toUpperCase()}
              </Badge>
            )}
            {status && (
              <Badge colorScheme={getStatusColor(status)}>
                {status.toUpperCase()}
              </Badge>
            )}
            {tag && (
              <Badge colorScheme="blue" variant="outline">
                {tag}
              </Badge>
            )}
          </HStack>

          <Heading as="h3" size="md" my={2}>
            <Link
              as={RouterLink}
              to={`/disasters/${id}`}
              color="brand.600"
              _hover={{ textDecoration: 'none', color: 'brand.500' }}
            >
              {title}
            </Link>
          </Heading>

          <Text fontSize="sm" color="gray.500">
            {location_name}
          </Text>

          <Text noOfLines={3} color="gray.600" fontSize="sm">
            {description}
          </Text>

          <Divider my={2} />

          <Text fontSize="xs" color="gray.500">
            Created: {formatDate(created_at)}
            {updated_at !== created_at && ` • Updated: ${formatDate(updated_at)}`}
          </Text>
        </Stack>
      </Box>
    </Box>
  );
};

export default DisasterCard;
