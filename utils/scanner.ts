import * as Network from 'expo-network';
import TcpSocket from 'react-native-tcp-socket';
import LocalService from '../interfaces/local_service';
import LocalHost, { LocalHostsList } from '../interfaces/local_host';
import OSInfo from '../interfaces/os_info';
import PortsRange from '../interfaces/ports_range';

// List of wonted services
const KNOWN_SERVICES: LocalService[] = [
  { name: 'FTP', port: 21 },
  { name: 'SSH', port: 22 },
  { name: 'HTTP', port: 80 },
  { name: 'HTTPS', port: 443 },
  { name: 'Telnet', port: 23 },
  { name: 'SMTP', port: 25 },
  { name: 'POP3', port: 110 },
  { name: 'IMAP', port: 143 },
  { name: 'MySQL', port: 3306 },
];

// getting os from response banner (if possible)
const guessOSFromBanner = (banner: string): OSInfo | undefined => {
  if (!banner) return undefined;

  const lowerBanner = banner.toLowerCase();

  // Helper to extract version number from common patterns
  const extractVersion = (pattern: string) => {
    const match = lowerBanner.match(pattern);
    return match && match[1] ? match[1] : 'Unknown';
  };

  if (lowerBanner.includes('ubuntu')) {
    const version = extractVersion(/ubuntu[^\d]*(\d{2}\.\d{2})/); // e.g. Ubuntu 20.04
    return { os: 'Linux (Ubuntu)', version };
  }

  if (lowerBanner.includes('debian')) {
    const version = extractVersion(/debian[^\d]*(\d+)/); // e.g. Debian 10
    return { os: 'Linux (Debian)', version };
  }

  if (lowerBanner.includes('centos')) {
    const version = extractVersion(/centos[^\d]*(\d+)/); // e.g. CentOS 7
    return { os: 'Linux (CentOS)', version };
  }

  if (lowerBanner.includes('redhat')) {
    const version = extractVersion(/redhat[^\d]*(\d+)/); // e.g. RedHat 8
    return { os: 'Linux (RedHat)', version };
  }

  if (lowerBanner.includes('windows') || lowerBanner.includes('microsoft')) {
    const version =
      extractVersion(/windows[^\d]*(\d+(\.\d+)?)/) ||
      extractVersion(/iis\/(\d+(\.\d+)?)/);
    return { os: 'Windows', version };
  }

  if (lowerBanner.includes('freebsd')) {
    const version = extractVersion(/freebsd[^\d]*(\d+\.\d+)/);
    return { os: 'FreeBSD', version };
  }

  if (lowerBanner.includes('darwin') || lowerBanner.includes('macos')) {
    const version = extractVersion(/darwin[^\d]*(\d+\.\d+\.\d+)/);
    return { os: 'macOS (Darwin)', version };
  }

  // Generic Linux pattern (e.g., "Linux 5.4.0-42-generic")
  if (lowerBanner.includes('linux')) {
    const version = extractVersion(/linux[^\d]*(\d+\.\d+(\.\d+)?)/);
    return { os: 'Linux', version };
  }

  return undefined;
};

// returns array of scanning ports. Returns array of KNOWN_PORTS ports if portsRange wasn't provided
function getPorts(portsRange?: PortsRange) {
  const ports = portsRange
    ? Array.from<number, LocalService>(
        { length: portsRange.maxPort - portsRange.minPort + 1 },
        (_, index) => {
          const _port = portsRange.minPort + index;
          return { name: _port.toString(), port: _port };
        }
      )
    : KNOWN_SERVICES;

  return ports;
}

async function fetchWithTimeout(url: string, options: { timeout: number }) {
  const { timeout = 8000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    mode: 'no-cors',
    cache: 'no-store',
  });
  clearTimeout(timer);

  return response;
}

async function getLocalSubnet() {
  try {
    const state = await Network.getNetworkStateAsync();
    const ipAddress = await Network.getIpAddressAsync();
    console.log('Connection type', state.type);
    console.log('IP Address:', ipAddress);

    if (state.isConnected && ipAddress !== '0.0.0.0') {
      const subnet = ipAddress.substring(0, ipAddress.lastIndexOf('.'));
      return subnet;
    } else {
      console.log('Not connected to the internet');
      return null;
    }
  } catch (error) {
    // console.error('Error getting IP address:', error);
    return null;
  }
}

// Check if a TCP port is open on a target host
function checkPort(
  host: string,
  port: number,
  timeout = 300
): Promise<{ connected: boolean; osInfo?: OSInfo }> {
  return new Promise((resolve) => {
    let dataBuffer = '';
    let connected = false;
    let osInfo: OSInfo | undefined = undefined;
    const socket = new TcpSocket.Socket();
    socket.setTimeout(timeout);

    socket.once('connect', () => {
      console.log(`server ${host}:${port} online!`);
      connected = true;

      if (port === 80 || port === 443) {
        socket.write('HEAD / HTTP/1.0\r\n\r\n');
      }

      //give time for banner grabbing
      setTimeout(() => {
        socket.destroy();
      }, 200);
    });

    socket.on('data', (data) => {
      dataBuffer += data.toString();

      if (dataBuffer.length > 0) {
        console.log(dataBuffer);
        osInfo = guessOSFromBanner(dataBuffer);
      }

      //banner can be in parts
      setTimeout(() => {
        socket.destroy();
      }, 100);
    });

    socket.once('error', (error) => {
      // console.log(`Connection error: ${host}:${port} — ${error.message}`);
      socket.destroy();
    });

    socket.once('close', () => {
      resolve({ connected, osInfo });
    });

    socket.once('timeout', () => {
      socket.destroy();
    });

    socket.connect({ port, host });
  });
}

// Scan IP range for active devices (port 80 check)
async function scanNetwork(subnet: string, start = 1, end = 255) {
  const activeHosts: string[] = [];
  const checks = [];
  for (let i = start; i <= end; i++) {
    const host = `${subnet}.${i}`;
    // check if port 80 (HTTP) is open
    const check = new Promise<void>((resolve) => {
      fetchWithTimeout(`http://${host}:${80}`, {
        timeout: 1000,
      })
        .then((response) => {
          if (response.ok) {
            console.log(`Active IP found: ${host}`);
            activeHosts.push(host);
            resolve();
          }
        })
        .catch((e) => {
          resolve();
        });
    });
    checks.push(check);
  }

  await Promise.all(checks);
  return activeHosts;
}

//Network scan based on opened port 80
async function fastScan(
  updateHostCallback: (hostData: LocalHostsList) => Promise<void>,
  portsRange?: PortsRange
) {
  const subnet = await getLocalSubnet();
  if (!subnet) {
    return null;
  }
  const activeHosts = await scanNetwork(subnet);

  //scan for available services

  // create list of port checks grouped by hosts
  const promises: {
    [host: string]: (() => Promise<{
      isAlive: boolean;
      service: LocalService;
      osInfo?: OSInfo;
    }>)[];
  } = {};
  const activeHostsData: LocalHostsList = {};

  const searchingServices = getPorts(portsRange);

  activeHosts.forEach((host) => {
    const _hostData = new LocalHost(host, [], true);
    promises[host] = [];
    activeHostsData[host] = _hostData;
    searchingServices.forEach((service) => {
      const promise = () =>
        new Promise<{
          isAlive: boolean;
          service: LocalService;
          osInfo?: OSInfo;
        }>(async (resolve) => {
          const result = await checkPort(host, service.port);
          const isAlive = result.connected;
          resolve({ isAlive, service, osInfo: result.osInfo });
        });
      promises[host].push(promise);
    });
  });

  //show list of founded hosts
  updateHostCallback(activeHostsData);

  // resolve port checks
  // we have to do it synchronically because of tcp limitations on mobile platforms
  for (const host of activeHosts) {
    const _hostData: LocalHost = new LocalHost(host, []);
    for (const check of promises[host]) {
      const { isAlive, service, osInfo } = await check();
      if (isAlive) {
        _hostData.osInfo = osInfo || _hostData.osInfo;
        _hostData.aliveServices.push(service);
      }
    }
    activeHostsData[host] = _hostData;
    // update host alive services and checking status
    updateHostCallback(activeHostsData);
  }
}

// searching services by ports
async function portsScan(
  updateHostCallback: (hostList: LocalHostsList) => Promise<void>,
  portsRange?: PortsRange
) {
  const subnet = await getLocalSubnet();
  if (!subnet) {
    return null;
  }
  const hosts: LocalHostsList = {};
  for (let i = 1; i <= 255; i++) {
    const host = `${subnet}.${i}`;

    const _hostData = new LocalHost(host, [], true);
    const searchingServices = getPorts(portsRange);

    for (const port of searchingServices) {
      const result = await checkPort(host, port.port);
      if (result.connected) {
        const serviceName = KNOWN_SERVICES.find(
          (s) => s.port === port.port
        )?.name;
        _hostData.aliveServices.push({
          name: serviceName || port.name,
          port: port.port,
        });
        _hostData.osInfo = result.osInfo || _hostData.osInfo;
        hosts[host] = _hostData;
        updateHostCallback(hosts);
      }
    }
    if (_hostData.aliveServices.length > 0) {
      _hostData.isChecking = false;
      hosts[host] = _hostData;
      updateHostCallback(hosts);
    }
  }
}

export async function scanLocalNetwork(
  isFastScan: boolean,
  updateHostCallback: (hostData: LocalHostsList) => Promise<void>,
  portsRange?: PortsRange
) {
  if (isFastScan) {
    await fastScan(updateHostCallback, portsRange);
  } else {
    await portsScan(updateHostCallback, portsRange);
  }
}
