## Overview

The application has two scanning modes:

1. **Fast HTTP Host Scan**
   Scans for HTTP hosts and checks available services. This mode is faster, because it allows to ignore the limitations on simultaneous TCP connections on first step.

2. **Full IP/Port Scan**
   Searches services for each IP in the subnet within provided port ranges.

The app includes a predefined list of well-known services, but it also allows searching by a custom range of ports.

OS determination is limited without native modules implementation due to React Native incapability.

### Search Logic

The search logic is implemented in `utils/scanner.ts`, which contains:

- **`KNOWN_SERVICES`** — a list of known services.
- **`guessOSFromBanner`** — attempts to determine the OS from the response banner (if possible).
- **`fetchWithTimeout`** — a simple fetch request with timeout, used to discover available hosts quickly.
- **`checkPort`** — checks if a service is available on a given host and port.
- **`scanNetwork`** — a method for fast scanning of hosts (by checking port 80).
- **`fastScan`** — performs scanning based on open port 80, then verifies live services via TCP connections.
- **`portsScan`** — a slower, thorough scan that checks all IPs and ports in the provided range.

TCP connection is limited by number of available simultaneous connections, that's why the ports scan isn't resolved asynchronously.

During scanning, discovered hosts and services are updated through a callback function.

The user interface is minimalistic because there were no specific requirements for UI design.

Since it wasn’t necessary, no state management libraries were used.

## Technologies Used

- **expo-network** — to retrieve network status and IP address.
- **react-native-tcp-socket** — to find available services via TCP.

The Android build is located in the `builds` folder.
