# Which CDN? - CDN Detection Tool

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A web-based tool to detect CDN (Content Delivery Network) providers for any website using DNS analysis, ASN lookup, and reverse DNS resolution.

## Features

- 🔍 **DNS Analysis**: Follows CNAME chains to find the actual IP address
- 🌐 **ASN Lookup**: Identifies CDN providers through Autonomous System Numbers
- 🔄 **Reverse DNS**: Analyzes hostnames for CDN signatures
- 📊 **Confidence Scoring**: Provides confidence levels based on multiple indicators
- 🎨 **Modern UI**: Clean, responsive design with real-time feedback

## Supported CDN Providers

- **Akamai** (AS20940, AS16625, AS21342)
- **Cloudflare** (AS13335)
- **Fastly** (AS54113)
- **AWS CloudFront** (AS16509)
- **Google Cloud CDN** (AS15169)
- **Azure CDN** (AS8075)

## Quick Start

### Prerequisites

- Node.js (version 22 or higher)
- npm

### Local Development

1. Clone the repository:

```bash
git clone <repository-url>
cd which-cdn
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open your browser and navigate to:

```
http://localhost:3000
```

### GitHub Pages Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions.

**Automatic Deployment:**

- Push to the `main` branch
- GitHub Actions will automatically build and deploy
- Site will be available at: `https://yourusername.github.io/which-cdn`

## Usage

1. Enter a domain name in the input field (e.g., `www.adobe.com`)
2. Click "Detect CDN" or press Enter
3. View the results showing:
   - IP address
   - ASN information
   - CNAME chain
   - CDN detection results
   - Confidence level
   - Supporting evidence

### Deployment Architecture

The project supports both local development and GitHub Pages deployment:

**Local Development:**

- Node.js Express server serves files from `public/` directory
- Access via `http://localhost:3000`

**Build Process:**

- GitHub Actions copies files from `public/` to root directory
- Excludes server files and dependencies
- Deploys only static assets needed for the web app

## API Endpoints

- `GET /` - Main application page
- `GET /health` - Health check endpoint

## Development

### Project Structure

```
which-cdn/
├── public/
│   ├── index.html          # Main application
│   ├── css/
│   │   └── styles.css      # Application styles
│   └── js/
│       ├── cdn-detector.js # CDN detection logic
│       └── app.js          # UI controller and event handlers
├── server.js               # Express server
├── package.json            # Dependencies
└── README.md              # This file
```

### Code Quality

This project uses ESLint and Prettier for code quality and consistent formatting.

#### Linting

**Run ESLint:**

```bash
npm run lint
```

**Fix ESLint issues automatically:**

```bash
npm run lint:fix
```

#### Formatting

**Check formatting:**

```bash
npm run format
```

**Fix formatting automatically:**

```bash
npm run format:fix
```

#### Combined Checks

**Run all quality checks:**

```bash
npm test
```

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.
