import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { getFirstQuestionPath } from "./-utils/module-progress";

export const NetworkingModulePage = () => {
   const navigate = useNavigate();

   const handlePlay = useCallback(() => {
      void navigate({ to: getFirstQuestionPath() });
   }, [navigate]);

   return (
      <Box
         height="100vh"
         display="flex"
         flexDirection="column"
         bg="gray.950"
         color="gray.100"
      >
         <Flex flex="1" align="center" justify="center">
            <Box textAlign="center" maxWidth="480px" px={4}>
               <Text fontSize="3xl" fontWeight="bold" mb={4}>
                  Welcome to Networking Basics
               </Text>
               <Text fontSize="md" color="gray.400" mb={2}>
                  In this module, you will learn how to:
               </Text>
               <Box as="ul" textAlign="left" color="gray.300" mb={8} pl={6}>
                  <Text as="li" mb={1}>
                     Connect computers using routers and cables
                  </Text>
                  <Text as="li" mb={1}>
                     Configure DHCP to assign IP addresses automatically
                  </Text>
                  <Text as="li" mb={1}>
                     Verify network connectivity using the ping command
                  </Text>
                  <Text as="li" mb={1}>
                     Build reliable delivery with TCP sequence numbers and ACKs
                  </Text>
                  <Text as="li" mb={1}>
                     Stream video with UDP fire-and-forget delivery
                  </Text>
                  <Text as="li" mb={1}>
                     Secure your website with HTTPS and SSL certificates
                  </Text>
               </Box>
               <Button colorPalette="green" size="lg" onClick={handlePlay}>
                  Play
               </Button>
            </Box>
         </Flex>
      </Box>
   );
};
