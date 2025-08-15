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

class CDNDetector {
    constructor() {
        this.cdnSignatures = {
            'akamai': {
                asns: [20940, 16625, 21342],
                domains: ['akamai.net', 'akamaized.net', 'edgesuite.net'],
                headers: ['X-Akamai-Transformed']
            },
            'cloudflare': {
                asns: [13335],
                domains: ['cloudflare.com'],
                headers: ['CF-RAY', 'CF-Cache-Status']
            },
            'fastly': {
                asns: [54113],
                domains: ['fastly.net'],
                headers: ['X-Fastly', 'X-Cache-Hit']
            },
            'cloudfront': {
                asns: [16509],
                domains: ['cloudfront.net'],
                headers: ['X-Amz-Cf-Pop', 'X-Cache']
            },
            'google': {
                asns: [15169],
                domains: ['googleusercontent.com'],
                headers: ['X-Google-Cache']
            },
            'azure': {
                asns: [8075],
                domains: ['azureedge.net'],
                headers: ['X-Azure-Ref']
            }
        };
    }

    async detectCDN(domain) {
        const results = {
            domain: domain,
            cdnDetected: false,
            cdnProvider: null,
            confidence: 0,
            evidence: [],
            ip: null,
            asn: null,
            organization: null,
            cnameChain: []
        };

        try {
            // Step 1: Get IP from DNS (following CNAME chain)
            const ip = await this.getIPFromDNS(domain);
            if (!ip) {
                results.error = 'Could not resolve IP';
                return results;
            }
            results.ip = ip;

            // Step 2: Get ASN information
            const asnInfo = await this.getASNInfo(ip);
            if (asnInfo) {
                results.asn = asnInfo.asn;
                results.organization = asnInfo.organization;

                // Check if ASN belongs to a known CDN
                for (const [provider, signatures] of Object.entries(this.cdnSignatures)) {
                    if (signatures.asns.includes(parseInt(asnInfo.asn))) {
                        results.cdnDetected = true;
                        results.cdnProvider = provider;
                        results.confidence += 40;
                        results.evidence.push(`ASN ${asnInfo.asn} matches ${provider}`);
                    }
                }
            }

            // Step 3: Get reverse DNS
            const reverseDNS = await this.getReverseDNS(ip);
            if (reverseDNS) {
                for (const [provider, signatures] of Object.entries(this.cdnSignatures)) {
                    for (const cdnDomain of signatures.domains) {
                        if (reverseDNS.includes(cdnDomain)) {
                            results.cdnDetected = true;
                            results.cdnProvider = provider;
                            results.confidence += 30;
                            results.evidence.push(`Reverse DNS contains ${cdnDomain}`);
                        }
                    }
                }
            }

            // Step 4: Check CNAME chain for CDN signatures
            const cnameChain = await this.getCNAMEChain(domain);
            if (cnameChain.length > 0) {
                results.cnameChain = cnameChain;
                
                for (const cname of cnameChain) {
                    for (const [provider, signatures] of Object.entries(this.cdnSignatures)) {
                        for (const cdnDomain of signatures.domains) {
                            if (cname.includes(cdnDomain)) {
                                results.cdnDetected = true;
                                results.cdnProvider = provider;
                                results.confidence += 25;
                                results.evidence.push(`CNAME chain contains ${cdnDomain}`);
                            }
                        }
                    }
                }
            }

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    async getIPFromDNS(domain) {
        try {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
            const data = await response.json();
            
            if (data.Answer && data.Answer.length > 0) {
                const firstAnswer = data.Answer[0];
                
                if (firstAnswer.type === 1) { // A record
                    return firstAnswer.data;
                }
                
                if (firstAnswer.type === 5) { // CNAME record
                    return await this.followCNAMEChain(firstAnswer.data);
                }
            }
            
            return null;
        } catch (error) {
            console.error('DNS lookup failed:', error);
            return null;
        }
    }

    async followCNAMEChain(cnameDomain) {
        const maxHops = 10;
        let currentDomain = cnameDomain;
        let hopCount = 0;
        
        while (hopCount < maxHops) {
            hopCount++;
            
            try {
                const response = await fetch(`https://dns.google/resolve?name=${currentDomain}&type=A`);
                const data = await response.json();
                
                if (data.Answer && data.Answer.length > 0) {
                    const firstAnswer = data.Answer[0];
                    
                    if (firstAnswer.type === 1) { // A record
                        return firstAnswer.data;
                    }
                    
                    if (firstAnswer.type === 5) { // CNAME record
                        currentDomain = firstAnswer.data;
                        continue;
                    }
                }
                
                break;
                
            } catch (error) {
                console.error(`Error following CNAME at hop ${hopCount}:`, error);
                break;
            }
        }
        
        return null;
    }

    async getCNAMEChain(domain) {
        const chain = [];
        let currentDomain = domain;
        const maxHops = 10;
        let hopCount = 0;
        
        while (hopCount < maxHops) {
            hopCount++;
            
            try {
                const response = await fetch(`https://dns.google/resolve?name=${currentDomain}&type=CNAME`);
                const data = await response.json();
                
                if (data.Answer && data.Answer.length > 0) {
                    const cnameAnswer = data.Answer[0];
                    if (cnameAnswer.type === 5) { // CNAME record
                        chain.push(cnameAnswer.data);
                        currentDomain = cnameAnswer.data;
                        continue;
                    }
                }
                
                break;
                
            } catch (error) {
                console.error(`Error getting CNAME at hop ${hopCount}:`, error);
                break;
            }
        }
        
        return chain;
    }

    async getASNInfo(ip) {
        try {
            const response = await fetch(`https://ipinfo.io/${ip}/json`);
            const data = await response.json();
            
            return {
                asn: data.org?.split(' ')[0]?.replace('AS', '') || null,
                organization: data.org || null,
                country: data.country,
                city: data.city
            };
        } catch (error) {
            console.error('ASN lookup failed:', error);
            return null;
        }
    }

    async getReverseDNS(ip) {
        try {
            const reversedIP = ip.split('.').reverse().join('.');
            const response = await fetch(`https://dns.google/resolve?name=${reversedIP}.in-addr.arpa&type=PTR`);
            const data = await response.json();
            return data.Answer ? data.Answer[0].data : null;
        } catch (error) {
            console.error('Reverse DNS lookup failed:', error);
            return null;
        }
    }
} 