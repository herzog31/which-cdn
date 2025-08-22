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

export class CDNDetector {
  constructor() {
    this.cdnSignatures = {
      Alibaba: {
        asns: [24429, 37963],
        domains: ['alicdn.com', 'yundunwaf3.com'],
        headers: ['X-Alibaba-Cloud-Cache'],
        servers: [],
      },
      Akamai: {
        asns: [20940, 16625, 21342],
        domains: [
          'akamai.net',
          'akamaized.net',
          'edgesuite.net',
          'akamaitechnologies.com',
          'akamaiedge.net',
        ],
        headers: ['X-Akamai-Transformed'],
        servers: ['AkamaiGHost'],
      },
      Cloudflare: {
        asns: [13335],
        domains: ['cloudflare.com'],
        headers: ['CF-RAY', 'CF-Cache-Status'],
        servers: ['cloudflare'],
      },
      Fastly: {
        asns: [54113],
        domains: ['fastly.net'],
        headers: ['X-Fastly', 'X-Cache-Hit'],
        servers: ['fastly'],
      },
      CloudFront: {
        asns: [16509],
        domains: ['cloudfront.net', 'cloudfront.net.s3.amazonaws.com'],
        headers: ['X-Amz-Cf-Pop'],
        servers: [],
      },
      Google: {
        asns: [15169],
        domains: ['googleusercontent.com'],
        headers: ['X-Google-Cache'],
        servers: [],
      },
      Azure: {
        asns: [8075],
        domains: ['azureedge.net'],
        headers: ['X-Azure-Ref'],
        servers: [],
      },
    };
  }

  async fetchWithTimeout(url, options = {}) {
    const timeout = 5000; // 5 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  async detectCDN(domain) {
    const results = {
      domain: domain,
      cdnDetected: false,
      cdnProvider: null,
      confidence: 0,
      evidence: [],
    };

    // Step 1: Data collection phase
    const data = {
      headers: {},
      cnameChain: [],
      ips: [],
      asns: [],
      reverseDNS: [],
    };

    // Get response headers
    try {
      const headers = await this.getHeaders(domain);
      data.headers = headers;
    } catch (error) {
      console.error('Could not get headers', error);
    }

    // Get IPs and CNAME chain from DNS
    try {
      const result = await this.getIPsFromDNS(domain);
      if (!result || result[0].size === 0) {
        throw new Error('Could not resolve IP');
      }
      const [ips, cNameChain] = result;
      data.ips = Array.from(ips);
      data.cnameChain = Array.from(cNameChain);
    } catch (error) {
      console.error('Could not get IPs and CNAME from DNS', error);
    }

    // Get ASN information and reverse DNS in parallel
    const asnPromises = data.ips.map(ip => this.getASNInfo(ip));
    const reverseDNSPromises = data.ips.map(ip => this.getReverseDNS(ip));
    const [asnResults, reverseDNSResults] = await Promise.allSettled([
      Promise.all(asnPromises),
      Promise.all(reverseDNSPromises)
    ]);

    // Process ASN results
    if (asnResults.status === 'fulfilled') {
      for (const asn of asnResults.value) {
        if (asn && !data.asns.find((a) => a.asn === asn.asn)) {
          data.asns.push(asn);
        }
      }
    } else {
      console.error('Could not get ASN information:', asnResults.reason);
    }

    // Process reverse DNS results
    if (reverseDNSResults.status === 'fulfilled') {
      const result = new Set();
      for (const reverseDNS of reverseDNSResults.value) {
        if (reverseDNS) {
          result.add(reverseDNS);
        }
      }
      data.reverseDNS = Array.from(result);
    } else {
      console.error('Could not get reverse DNS information:', reverseDNSResults.reason);
    }

    // Step 2: Data analysis phase
    for (const [provider, signatures] of Object.entries(this.cdnSignatures)) {
      // Check ASN
      for (const asn of signatures.asns) {
        for (const asnData of data.asns) {
          if (asnData.asn === asn) {
            results.evidence.push({
              provider,
              weight: 100,
              message: `ASN ${asn} matches ${provider}`,
            });
          }
        }
      }

      // Check CNAME and reverse DNS
      for (const domain of signatures.domains) {
        for (const cname of data.cnameChain) {
          if (cname.includes(domain)) {
            results.evidence.push({
              provider,
              weight: 50,
              message: `CNAME ${cname} matches ${provider}`,
            });
          }
        }
        for (const reverseDNS of data.reverseDNS) {
          if (reverseDNS.includes(domain)) {
            results.evidence.push({
              provider,
              weight: 50,
              message: `Reverse DNS ${reverseDNS} matches ${provider}`,
            });
          }
        }
      }

      // Check general headers
      for (const header of signatures.headers) {
        if (data.headers[header]) {
          results.evidence.push({
            provider,
            weight: 30,
            message: `Header ${header} matches ${provider}`,
          });
        }
      }

      // Check server headers
      for (const server of signatures.servers) {
        if (
          'server' in data.headers &&
          data.headers['server'].includes(server)
        ) {
          results.evidence.push({
            provider,
            weight: 30,
            message: `Server header ${server} matches ${provider}`,
          });
        }
      }
    }

    // Classify based on evidence
    if (results.evidence.length > 0) {
      results.cdnDetected = true;

      const providerAndWeights = {};
      let sumWeights = 0;
      for (const evidence of results.evidence) {
        sumWeights += evidence.weight;
        if (!providerAndWeights[evidence.provider]) {
          providerAndWeights[evidence.provider] = 0;
        }
        providerAndWeights[evidence.provider] += evidence.weight;
      }

      const maxWeight = Math.max(...Object.values(providerAndWeights));
      const maxProvider = Object.keys(providerAndWeights).find(
        (provider) => providerAndWeights[provider] === maxWeight,
      );

      results.cdnProvider = maxProvider;
      results.confidence = maxWeight / sumWeights;
    }

    console.log(results);

    results.data = data;

    return results;
  }

  async doDNSLookup(domain) {
    const response = await this.fetchWithTimeout(
      `https://dns.google/resolve?name=${domain}&type=A`,
    );
    const data = await response.json();

    if (!data.Answer || data.Answer.length === 0) {
      return [new Set(), new Set()];
    }

    const ipAnswers = data.Answer.filter((answer) => answer.type === 1); // A record
    const cnameAnswers = data.Answer.filter((answer) => answer.type === 5); // CNAME record

    const ips = new Set(ipAnswers.map((answer) => answer.data));
    const cNameChain = new Set(cnameAnswers.map((answer) => answer.data));

    return [ips, cNameChain];
  }

  async getIPsFromDNS(domain) {
    const ips = new Set();
    const cNameChain = new Set();
    const maxRequests = 10;

    const domainsToFollow = [domain];
    if (domain.startsWith('www.')) {
      domainsToFollow.push(domain.substring(4));
    } else {
      domainsToFollow.push('www.' + domain);
    }

    let requestCount = 0;
    while (domainsToFollow.length > 0 && requestCount < maxRequests) {
      const domainToFollow = domainsToFollow.shift();
      const [recIps, recCNameChain] = await this.doDNSLookup(domainToFollow);
      requestCount++;
      cNameChain.add(domainToFollow);
      for (const ip of recIps) {
        ips.add(ip);
      }

      for (const cname of recCNameChain) {
        if (!cNameChain.has(cname) && !domainsToFollow.includes(cname)) {
          domainsToFollow.push(cname);
        }
      }
    }

    return [ips, cNameChain];
  }

  async followCNAMEChain(cnameDomain) {
    const maxHops = 10;
    let currentDomain = cnameDomain;
    let hopCount = 0;

    while (hopCount < maxHops) {
      hopCount++;

      try {
        const response = await this.fetchWithTimeout(
          `https://dns.google/resolve?name=${currentDomain}&type=A`,
        );
        const data = await response.json();

        if (data.Answer && data.Answer.length > 0) {
          const firstAnswer = data.Answer[0];

          if (firstAnswer.type === 1) {
            // A record
            return firstAnswer.data;
          }

          if (firstAnswer.type === 5) {
            // CNAME record
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
        const response = await this.fetchWithTimeout(
          `https://dns.google/resolve?name=${currentDomain}&type=CNAME`,
        );
        const data = await response.json();

        if (data.Answer && data.Answer.length > 0) {
          const cnameAnswer = data.Answer[0];
          if (cnameAnswer.type === 5) {
            // CNAME record
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
      const response = await this.fetchWithTimeout(`https://ipinfo.io/${ip}/json`);
      const data = await response.json();

      return {
        asn: parseInt(data.org?.split(' ')[0]?.replace('AS', '') || null, 10),
        organization: data.org || null,
        country: data.country,
        city: data.city,
      };
    } catch (error) {
      console.error('ASN lookup failed:', error);
      return null;
    }
  }

  async getReverseDNS(ip) {
    try {
      const reversedIP = ip.split('.').reverse().join('.');
      const response = await this.fetchWithTimeout(
        `https://dns.google/resolve?name=${reversedIP}.in-addr.arpa&type=PTR`,
      );
      const data = await response.json();
      return data.Answer ? data.Answer[0].data : null;
    } catch (error) {
      console.error('Reverse DNS lookup failed:', error);
      return null;
    }
  }

  async getHeaders(domain) {
    const endpoint = `https://api.hackertarget.com/httpheaders/?q=${encodeURIComponent(domain)}`;
    const resp = await this.fetchWithTimeout(endpoint);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const text = await resp.text();

    const headers = {};
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.trim() || line.startsWith('HTTP/')) {
        continue;
      }

      const idx = line.indexOf(':');
      if (idx === -1) {
        continue;
      }

      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();

      headers[key] = value;
    }
    return headers;
  }
}
