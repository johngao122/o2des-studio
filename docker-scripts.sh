#!/bin/bash

# Helper script for Docker operations

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display help message
show_help() {
  echo -e "${YELLOW}O2DES Studio Docker Helper${NC}"
  echo -e "Usage: ./docker-scripts.sh [command]"
  echo ""
  echo "Commands:"
  echo "  dev          Start development environment"
  echo "  prod         Start production environment"
  echo "  build        Build Docker images"
  echo "  build-multi  Build multi-platform Docker images (AMD64 & ARM64)"
  echo "  push-multi   Build and push multi-platform Docker images"
  echo "  clean        Clean Docker resources (containers, images)"
  echo "  logs         Show logs"
  echo "  help         Show this help message"
}

# Start development environment
start_dev() {
  echo -e "${GREEN}Starting development environment...${NC}"
  docker compose up -d dev
  echo -e "${GREEN}Development server started at http://localhost:3000${NC}"
}

# Start production environment
start_prod() {
  echo -e "${GREEN}Starting production environment...${NC}"
  docker compose up -d app
  echo -e "${GREEN}Production server started at http://localhost:3000${NC}"
}

# Build Docker images
build() {
  echo -e "${GREEN}Building Docker images...${NC}"
  docker compose build
}

# Build multi-platform Docker images
build_multi() {
  echo -e "${GREEN}Building multi-platform Docker images...${NC}"
  ./build-multiplatform.sh "$@"
}

# Build and push multi-platform Docker images
push_multi() {
  echo -e "${GREEN}Building and pushing multi-platform Docker images...${NC}"
  ./build-multiplatform.sh -p "$@"
}

# Clean Docker resources
clean() {
  echo -e "${YELLOW}Stopping containers...${NC}"
  docker compose down
  
  echo -e "${YELLOW}Removing O2DES Studio images...${NC}"
  docker rmi $(docker images | grep 'o2des-studio' | awk '{print $3}') 2>/dev/null || echo -e "${RED}No images to remove${NC}"
  
  echo -e "${YELLOW}Cleaning up unused Docker resources...${NC}"
  docker system prune -f
  
  echo -e "${GREEN}Clean completed${NC}"
}

# Show logs
show_logs() {
  if [[ "$1" == "dev" ]]; then
    docker compose logs -f dev
  else
    docker compose logs -f app
  fi
}

# Main script logic
case "$1" in
  dev)
    start_dev
    ;;
  prod)
    start_prod
    ;;
  build)
    build
    ;;
  build-multi)
    shift
    build_multi "$@"
    ;;
  push-multi)
    shift
    push_multi "$@"
    ;;
  clean)
    clean
    ;;
  logs)
    show_logs $2
    ;;
  help|*)
    show_help
    ;;
esac 