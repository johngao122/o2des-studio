#!/bin/bash

# Script to verify Docker image architecture compatibility

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
IMAGE=${1:-""}

# Check if image name is provided
if [ -z "$IMAGE" ]; then
  echo -e "${RED}Error: Please provide an image name.${NC}"
  echo -e "Usage: ./verify-docker-image.sh [image:tag]"
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed.${NC}"
  exit 1
fi

# Get host architecture
HOST_ARCH=$(uname -m)
case "$HOST_ARCH" in
  x86_64)
    HOST_ARCH="amd64"
    ;;
  aarch64|arm64)
    HOST_ARCH="arm64"
    ;;
  armv7l)
    HOST_ARCH="arm/v7"
    ;;
  *)
    echo -e "${YELLOW}Warning: Unknown architecture: $HOST_ARCH${NC}"
    ;;
esac

echo -e "${GREEN}Host architecture: $HOST_ARCH${NC}"

# Get image architecture
echo -e "${YELLOW}Checking image architecture for $IMAGE...${NC}"
IMAGE_INSPECT=$(docker inspect --format='{{.Architecture}}' "$IMAGE" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to inspect image. Make sure the image exists locally.${NC}"
  echo -e "${YELLOW}Trying to pull the image...${NC}"
  
  docker pull "$IMAGE"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to pull image.${NC}"
    exit 1
  fi
  
  IMAGE_INSPECT=$(docker inspect --format='{{.Architecture}}' "$IMAGE")
fi

echo -e "${GREEN}Image architecture: $IMAGE_INSPECT${NC}"

# Check if image supports multiple architectures
echo -e "${YELLOW}Checking if image supports multiple architectures...${NC}"
MANIFEST_INSPECT=$(docker manifest inspect "$IMAGE" 2>/dev/null)

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Image has a manifest list. Checking supported architectures...${NC}"
  SUPPORTED_ARCHS=$(echo "$MANIFEST_INSPECT" | grep -o '"architecture": "[^"]*' | grep -o '[^"]*$' | sort | uniq)
  
  echo -e "${GREEN}Supported architectures:${NC}"
  echo "$SUPPORTED_ARCHS"
  
  if echo "$SUPPORTED_ARCHS" | grep -q "$HOST_ARCH"; then
    echo -e "${GREEN}✅ The image supports your host architecture ($HOST_ARCH).${NC}"
  else
    echo -e "${RED}❌ The image does not support your host architecture ($HOST_ARCH).${NC}"
    echo -e "${YELLOW}This is likely causing the 'exec format error'.${NC}"
  fi
else
  echo -e "${YELLOW}Image does not have a manifest list or is not available in the registry.${NC}"
  
  if [ "$IMAGE_INSPECT" = "$HOST_ARCH" ]; then
    echo -e "${GREEN}✅ The image architecture ($IMAGE_INSPECT) matches your host architecture ($HOST_ARCH).${NC}"
  else
    echo -e "${RED}❌ The image architecture ($IMAGE_INSPECT) does not match your host architecture ($HOST_ARCH).${NC}"
    echo -e "${YELLOW}This is likely causing the 'exec format error'.${NC}"
  fi
fi

# Provide recommendations
echo -e "\n${GREEN}Recommendations:${NC}"
echo -e "1. Make sure you build the image with: ./build-multiplatform.sh -n <namespace> -i <image> -t <tag> -p"
echo -e "2. The -p flag is crucial for multi-platform builds"
echo -e "3. Verify the image supports multiple architectures with: docker buildx imagetools inspect <image>"
echo -e "4. When running on the server, use: docker run --platform $HOST_ARCH <image>" 