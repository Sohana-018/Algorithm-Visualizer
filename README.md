# Algorithm Visualizer

A stunning, interactive algorithm visualization tool built with React, TypeScript, and Framer Motion. This application brings complex algorithms to life through high-fidelity, physics-based animations, step-by-step playback controls, and real-time execution tracking.

## ✨ Features

- **7 Core Algorithms**: Visualized across diverse data structures (Arrays, Graphs, Trees, and Chessboards).
- **Physics-Based Animations**: Smooth, highly-polished transitions powered by Framer Motion.
- **Granular Playback Controls**: Play, pause, step forward, step backward, and adjust execution speed on the fly.
- **Live Action Tracking**: Real-time code execution highlights mapping directly to the visualizer state.
- **Complexity Analysis**: Deep-dive narratives explaining Time and Space complexities, including pruning impacts.
- **Dynamic Inputs**: Supply custom arrays, modify graph nodes, adjust tree capacities, or resize boards in real time.
- **Fully Responsive Layout**: Built with Tailwind CSS, featuring collapsible sidebars, floating control modules, and glassmorphic aesthetics that look beautiful on both desktop and mobile.

## 🚀 Supported Algorithms

1. **Bubble Sort**: Watch the classic sorting algorithm bubble the largest elements to the top via continuous swaps.
2. **Merge Sort**: Visualize the divide-and-conquer strategy natively via a dynamic, scalable Recursion Tree!
3. **Binary Search**: Features an interactive toggle between **Iterative** (Array pointer view) and **Recursive** (Physical Call Stack visualization) modes.
4. **Breadth-First Search (BFS)**: Watch the algorithm ripple through graph nodes, tracking queues and discovered paths.
5. **Depth-First Search (DFS)**: Follow the deep dive into paths before backtracking, visualizing the call stack's traversal footprint.
6. **0/1 Knapsack (Branch & Bound)**: Unravel the complex backtracking decision tree, featuring live active/pruned node coloring and real-time optimal value tracking.
7. **N-Queens**: A beautiful Chessboard visualizer for the backtracking classic. Features:
    - Adjustable board sizes (4x4 to 10x10).
    - Explicit conflict rendering (Math breakdown of column and diagonal threats).
    - **All Solutions Mode**: Let the algorithm discover every valid board state and browse through them once complete.

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Zoom & Pan**: `react-zoom-pan-pinch` (for complex tree architectures)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 💻 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Sohana-018/Algorithm-Visualizer.git
```

2. Navigate to the project directory:
```bash
cd Algorithm-Visualizer
```

3. Install the dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and visit:
```text
http://localhost:5173
```

## 🏗️ Building for Production

To create a production-ready build, run:
```bash
npm run build
```
This command bundles the app using Vite, optimizing the React components and tree-shaking the dependencies into the `dist/` directory.
