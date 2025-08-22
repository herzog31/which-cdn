/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CDNDetector } from './cdn-detector.js';

// UI Controller for CDN Detection App
class CDNApp {
  constructor() {
    this.detector = new CDNDetector();
    this.initializeEventListeners();
    this.loadDomainFromURL();
  }

  initializeEventListeners() {
    // Allow Enter key to trigger detection
    document.getElementById('domain').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.detectCDN();
      }
    });

    // Add click event handler to the detect button
    document.getElementById('detectBtn').addEventListener('click', () => {
      this.detectCDN();
    });
  }

  loadDomainFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const domainParam = urlParams.get('domain');
    
    if (domainParam) {
      const domainInput = document.getElementById('domain');
      domainInput.value = domainParam;
      // Automatically detect CDN for the domain from URL
      this.detectCDN();
    }
  }

  updateURLWithDomain(domain) {
    const url = new URL(window.location);
    url.searchParams.set('domain', domain);
    window.history.replaceState({}, '', url);
  }

  async detectCDN() {
    let domain = document.getElementById('domain').value.trim();

    if (!domain.includes('://')) {
      domain = 'https://' + domain;
    }

    try {
      domain = new URL(domain).hostname;
    } catch (error) {
      console.debug('Could not parse domain, very likely invalid', error);
    }

    if (!domain) {
      alert('Please enter a valid domain');
      return;
    }

    // Update URL with the domain parameter
    this.updateURLWithDomain(domain);

    // Show loading
    this.setLoadingState(true);

    try {
      const result = await this.detector.detectCDN(domain);

      // Hide loading
      this.setLoadingState(false);

      // Display results
      this.displayResults(result);
    } catch (error) {
      console.error('Detection failed:', error);
      this.setLoadingState(false);
      this.displayError('Detection failed: ' + error.message);
    }
  }

  setLoadingState(isLoading) {
    const detectBtn = document.getElementById('detectBtn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    detectBtn.disabled = isLoading;
    loading.style.display = isLoading ? 'block' : 'none';

    if (isLoading) {
      results.style.display = 'none';
    }
  }

  displayResults(result) {
    const resultsDiv = document.getElementById('results');

    if (result.error) {
      this.displayError(result.error);
      return;
    }

    let html = `
            <h3>Results for ${result.domain}</h3>
        `;

    if (result.cdnDetected) {
      html += `
                <div style="margin-top: 20px;">
                    <h2 style="color: #28a745; font-size: 2.5em; margin-bottom: 20px; text-align: center;">${result.cdnProvider}</h2>
                    <p><strong>Confidence:</strong> ${Math.round(result.confidence * 100)}%</p>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${Math.round(result.confidence * 100)}%"></div>
                    </div>
                    <p style="margin-top: 30px;"><strong>Evidence:</strong></p>
                    <ul class="evidence-list">
            `;
      result.evidence.forEach((evidence) => {
        html += `<li>${evidence.message}</li>`;
      });
      html += `</ul></div>`;
    } else {
      html += `
                <div style="margin-top: 20px;">
                    <h2 style="color: #dc3545; font-size: 2.5em; margin-bottom: 20px; text-align: center;">❌ No CDN detected</h2>
                    <p style="margin-top: 30px;">This domain doesn't appear to be using a known CDN provider.</p>
                </div>
            `;
    }

    resultsDiv.innerHTML = html;
    resultsDiv.className =
      'results ' + (result.cdnDetected ? 'success' : 'error');
    resultsDiv.style.display = 'block';
  }

  displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h3>Error</h3><p>${message}</p>`;
    resultsDiv.className = 'results error';
    resultsDiv.style.display = 'block';
  }
}

function loadAdobeRUM() {
  const script = document.createElement('script');
  script.src =
    'https://rum.hlx.page/.rum/@adobe/helix-rum-js@^2/dist/rum-standalone.js';
  script.type = 'text/javascript';
  document.head.appendChild(script);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CDNApp();
  loadAdobeRUM();
});
