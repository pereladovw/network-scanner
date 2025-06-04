import LocalService from './local_service';
import OSInfo from './os_info';

export default class LocalHost {
  host: string;
  aliveServices: LocalService[];
  isChecking: boolean;
  osInfo?: OSInfo;

  constructor(
    host = '',
    aliveServices: LocalService[] = [],
    isChecking = false
  ) {
    this.host = host;
    this.aliveServices = aliveServices;
    this.isChecking = isChecking;
  }
}

export interface LocalHostsList {
  [key: string]: LocalHost;
}
