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

// UI Controller for CDN Detection App
class CDNApp {
    constructor() {
        this.detector = new CDNDetector();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Allow Enter key to trigger detection
        document.getElementById('domain').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.detectCDN();
            }
        });
    }

    async detectCDN() {
        const domain = document.getElementById('domain').value.trim();
        const detectBtn = document.getElementById('detectBtn');
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');

        if (!domain) {
            alert('Please enter a domain');
            return;
        }

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
            <p><strong>IP Address:</strong> ${result.ip || 'Unknown'}</p>
            <p><strong>ASN:</strong> ${result.asn || 'Unknown'}</p>
            <p><strong>Organization:</strong> ${result.organization || 'Unknown'}</p>
        `;

        if (result.cnameChain.length > 0) {
            html += `<p><strong>CNAME Chain:</strong></p><ul>`;
            result.cnameChain.forEach(cname => {
                html += `<li>${cname}</li>`;
            });
            html += `</ul>`;
        }

        if (result.cdnDetected) {
            html += `
                <div style="margin-top: 20px;">
                    <h4 style="color: #28a745;">✅ CDN Detected: ${result.cdnProvider}</h4>
                    <p><strong>Confidence:</strong> ${result.confidence}%</p>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${result.confidence}%"></div>
                    </div>
                    <p><strong>Evidence:</strong></p>
                    <ul class="evidence-list">
            `;
            result.evidence.forEach(evidence => {
                html += `<li>${evidence}</li>`;
            });
            html += `</ul></div>`;
        } else {
            html += `
                <div style="margin-top: 20px;">
                    <h4 style="color: #dc3545;">❌ No CDN Detected</h4>
                    <p>This domain doesn't appear to be using a known CDN provider.</p>
                </div>
            `;
        }

        resultsDiv.innerHTML = html;
        resultsDiv.className = 'results ' + (result.cdnDetected ? 'success' : 'error');
        resultsDiv.style.display = 'block';
    }

    displayError(message) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `<h3>Error</h3><p>${message}</p>`;
        resultsDiv.className = 'results error';
        resultsDiv.style.display = 'block';
    }
}

// Global function for the onclick handler
function detectCDN() {
    if (!window.cdnApp) {
        window.cdnApp = new CDNApp();
    }
    window.cdnApp.detectCDN();
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cdnApp = new CDNApp();
}); 