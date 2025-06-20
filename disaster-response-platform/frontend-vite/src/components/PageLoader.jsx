import React from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
      width="100%"
    >
      <VStack spacing={4}>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="brand.500"
          size="xl"
        />
        <Text color="gray.600">{message}</Text>
      </VStack>
    </Box>
  );
};

export default PageLoader;
