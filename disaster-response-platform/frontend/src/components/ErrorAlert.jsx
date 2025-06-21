import React from 'react';
import { Alert, AlertIcon, AlertTitle, AlertDescription, Button, Box } from '@chakra-ui/react';

const ErrorAlert = ({ title, message, onRetry }) => {
  return (
    <Alert
      status="error"
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
        {title}
      </AlertTitle>
      <AlertDescription maxWidth="sm" mb={4}>
        {message}
      </AlertDescription>
      {onRetry && (
        <Box mt={2}>
          <Button onClick={onRetry} colorScheme="red" variant="outline">
            Try Again
          </Button>
        </Box>
      )}
    </Alert>
  );
};

export default ErrorAlert;
