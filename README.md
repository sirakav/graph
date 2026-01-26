# Graph Visualization

An interactive graph visualization application built with Next.js, React Flow, and TypeScript. This project provides a powerful interface for visualizing and exploring graph data structures with support for custom layouts, node grouping, and interactive editing.

## Features

- **Interactive Graph Canvas**: Visualize graphs using React Flow with drag-and-drop functionality
- **Custom Layout Engine**: Automatic graph layout using Dagre algorithm
- **Node Grouping**: Organize nodes into collapsible groups
- **Schema Support**: Define and visualize graph schemas with typed nodes and edges
- **Import/Export**: Load and save graph data in JSON format
- **Responsive UI**: Modern interface built with Radix UI and Tailwind CSS

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build

To build the production version:

```bash
npm run build
npm start
```

## Project Structure

- `app/` - Next.js app router pages and layouts
- `components/` - React components including graph canvas, nodes, and UI elements
- `lib/` - Core libraries for graph parsing, layout engine, and state management
- `docs/` - Project documentation and schema definitions
- `public/` - Static assets and demo graph data

## Technologies

- [Next.js](https://nextjs.org) - React framework
- [React Flow](https://reactflow.dev) - Graph visualization library
- [Dagre](https://github.com/dagrejs/dagre) - Graph layout algorithm
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Radix UI](https://www.radix-ui.com) - UI component primitives
- [Tailwind CSS](https://tailwindcss.com) - Styling
