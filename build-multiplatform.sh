#!/bin/bash

# Script to build and push multi-platform Docker images

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
REGISTRY=${REGISTRY:-"docker.io"}
NAMESPACE=${NAMESPACE:-"yourusername"}
IMAGE_NAME=${IMAGE_NAME:-"o2des-studio"}
TAG=${TAG:-"latest"}

# Function to display help message
show_help() {
  echo -e "${YELLOW}O2DES Studio Multi-Platform Docker Builder${NC}"
  echo -e "Usage: ./build-multiplatform.sh [options]"
  echo ""
  echo "Options:"
  echo "  -r, --registry REGISTRY    Docker registry (default: docker.io)"
  echo "  -n, --namespace NAMESPACE  Docker namespace (default: yourusername)"
  echo "  -i, --image IMAGE_NAME     Image name (default: o2des-studio)"
  echo "  -t, --tag TAG              Image tag (default: latest)"
  echo "  -p, --push                 Push images after building"
  echo "  -h, --help                 Show this help message"
}

# Parse command line arguments
PUSH=false
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -r|--registry) REGISTRY="$2"; shift ;;
    -n|--namespace) NAMESPACE="$2"; shift ;;
    -i|--image) IMAGE_NAME="$2"; shift ;;
    -t|--tag) TAG="$2"; shift ;;
    -p|--push) PUSH=true ;;
    -h|--help) show_help; exit 0 ;;
    *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
  esac
  shift
done

# Check if Docker BuildX is installed
if ! docker buildx version > /dev/null 2>&1; then
  echo -e "${RED}Docker BuildX is not installed. Please install it first.${NC}"
  exit 1
fi

# Create a new builder instance if it doesn't exist
if ! docker buildx inspect multiplatform-builder > /dev/null 2>&1; then
  echo -e "${YELLOW}Creating a new BuildX builder instance...${NC}"
  docker buildx create --name multiplatform-builder --driver docker-container --bootstrap
fi

# Use the builder
docker buildx use multiplatform-builder

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

# Build command
BUILD_CMD="docker buildx build --platform linux/amd64,linux/arm64 -t ${FULL_IMAGE_NAME} -f Dockerfile ."

# Add push flag if needed
if [ "$PUSH" = true ]; then
  BUILD_CMD="${BUILD_CMD} --push"
  echo -e "${GREEN}Building and pushing multi-platform image: ${FULL_IMAGE_NAME}${NC}"
else
  BUILD_CMD="${BUILD_CMD} --load"
  echo -e "${GREEN}Building multi-platform image: ${FULL_IMAGE_NAME}${NC}"
fi

# Execute the build command
echo -e "${YELLOW}Executing: ${BUILD_CMD}${NC}"
eval $BUILD_CMD

# Check if the build was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Build completed successfully!${NC}"
  
  if [ "$PUSH" = true ]; then
    echo -e "${GREEN}Image pushed to registry: ${FULL_IMAGE_NAME}${NC}"
  else
    echo -e "${YELLOW}Image built locally. To push it, run:${NC}"
    echo -e "docker push ${FULL_IMAGE_NAME}"
  fi
else
  echo -e "${RED}Build failed!${NC}"
  exit 1
fi 