# O2DES Studio

A modern web-based IDE for O2DES (Object-Oriented Discrete Event Simulation) framework, enabling visual modeling and simulation of discrete event systems. Currently in active development.

## 🚀 Features (In Progress)

-   📊 Visual modeling interface for O2DES components
-   🛠 Component-based architecture editor
-   🔌 Extensible plugin system
-   🎨 Modern, responsive UI built with Next.js

## 🏗 Project Status

This project is currently under active development. We're working on:

-   [ ] Core modeling interface
-   [ ] Simulation engine integration
-   [ ] Component library
-   [ ] Visual editor
-   [ ] Documentation system

## 🐛 Known Bugs

-   Node dragging causes website crash when moved excessively (under investigation)
-   Event graph edges are limited to straight lines due to rendering constraints (under investigation)

## 🚀 Getting Started

### Using npm

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Using Docker

#### Development

```bash
# Start the development environment
docker compose up dev

# Or build and start in detached mode
docker compose up -d dev
```

#### Production

```bash
# Build and start the production environment
docker compose up app

# Or build and start in detached mode
docker compose up -d app
```

#### Multi-Platform Builds (AMD64 & ARM)

The project supports building for multiple architectures (AMD64 and ARM64) using Docker BuildX:

```bash
# Build multi-platform image
./build-multiplatform.sh -n your-username -i o2des-studio -t latest

# Build and push to Docker Hub
./build-multiplatform.sh -n your-username -i o2des-studio -t latest -p
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🛠 Tech Stack

-   **Frontend**: Next.js, React, TypeScript
-   **UI Components**: Tailwind CSS, Shadcn/ui
-   **State Management**: Zustand
-   **Simulation Engine**: Not confirmed

## 📚 Documentation

Documentation is being developed alongside the project. Key areas will include:

-   User Guide
-   API Reference
-   Component Library
-   Development Guide

## 🤝 Contributing

This project is currently in early development. Contribution guidelines will be added soon.
