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

- Node.js (version 14 or higher)
- npm or yarn

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

## How It Works

The tool uses multiple detection methods:

1. **DNS Resolution**: Resolves the domain to an IP address, following CNAME chains
2. **ASN Lookup**: Queries IP geolocation APIs to get ASN information
3. **Reverse DNS**: Performs reverse DNS lookup to analyze hostnames
4. **CNAME Analysis**: Examines CNAME chains for CDN-specific domains
5. **Confidence Scoring**: Combines multiple indicators for accurate detection

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **`cdn-detector.js`**: Core CDN detection logic and API interactions
- **`app.js`**: UI controller, event handling, and result display
- **`styles.css`**: All styling and visual components
- **`index.html`**: Clean HTML structure with external resource references

This modular approach makes the code more maintainable, testable, and easier to extend with new features.

### Deployment Architecture

The project supports both local development and GitHub Pages deployment:

**Local Development:**
- Node.js Express server serves files from `public/` directory
- Access via `http://localhost:3000`

**GitHub Pages:**
- Static files served directly from repository root
- GitHub Actions automatically builds and deploys
- Access via `https://yourusername.github.io/which-cdn`

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

### Running in Development Mode

```bash
npm run dev
```

## Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js
- **APIs**: Google DNS, ipinfo.io, DNS-over-HTTPS
- **Architecture**: Modular JavaScript with separation of concerns

## Limitations

- Rate limits apply to external APIs (ipinfo.io: 50k/month, DNS APIs: variable)
- Some CDNs may not be detected if they use custom configurations
- Results depend on the accuracy of external DNS and geolocation services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## Examples

### Successful CDN Detection

**Input**: `www.adobe.com`
**Output**: 
- ✅ CDN Detected: Akamai
- Confidence: 95%
- Evidence: ASN 20940 matches akamai, Reverse DNS contains akamaized.net, CNAME chain contains edgesuite.net

### No CDN Detected

**Input**: `example.com`
**Output**: 
- ❌ No CDN Detected
- This domain doesn't appear to be using a known CDN provider 