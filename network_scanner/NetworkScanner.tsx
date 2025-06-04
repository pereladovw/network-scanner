import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Button,
  StyleSheet,
  Switch,
  TextInput,
} from 'react-native';
import { scanLocalNetwork } from '../utils/scanner';
import LocalHost, { LocalHostsList } from '../interfaces/local_host';
import { isPortValid, MAX_PORT, MIN_PORT } from '../utils/port_validate';
import { HostItem } from './HostItem';

const NetworkScanner = () => {
  const [hosts, setHosts] = useState<LocalHostsList>({});
  const [minPort, setMinPort] = useState(1);
  const [maxPort, setMaxPort] = useState(15000);
  const [isFastScan, setIsFastScan] = useState(true);
  const [isPortsPredefined, setIsPortsPredefined] = useState(true);
  const [scanning, setScanning] = useState(false);

  const updateServices = useCallback(async (_hosts: LocalHostsList) => {
    setHosts({ ..._hosts });
  }, []);

  const scanNetwork = useCallback(
    (
      _isFastScan: boolean,
      isPortsPredefined: boolean,
      _minPort: number,
      _maxPort: number
    ) => {
      scanLocalNetwork(
        _isFastScan,
        updateServices,
        isPortsPredefined ? undefined : { minPort: _minPort, maxPort: _maxPort }
      )
        .then(() => setScanning(false))
        .catch((e) => {
          setScanning(false);
        });
    },
    [updateServices]
  );

  const onScan = useCallback(() => {
    setScanning(true);
    setHosts({});
    scanNetwork(isFastScan, isPortsPredefined, minPort, maxPort);
  }, [
    setScanning,
    minPort,
    maxPort,
    isFastScan,
    updateServices,
    isPortsPredefined,
  ]);

  const onIsFastScan = useCallback((value: boolean) => {
    setIsFastScan(value);
  }, []);

  const onIsPortsPredefined = useCallback((value: boolean) => {
    setIsPortsPredefined(value);
  }, []);

  const onMinPortChange = (value: string) => {
    const _value = Number(value);
    if (_value > maxPort) {
      setMinPort(maxPort);
      return;
    }
    setMinPort(isPortValid(_value) ? _value : MIN_PORT);
  };

  const onMaxPortChange = (value: string) => {
    const _value = Number(value);
    setMaxPort(isPortValid(_value) ? _value : MAX_PORT);
  };

  const validateMinPort = () => {
    if (minPort > maxPort) {
      setMinPort(maxPort);
      return;
    }
  };

  const validateMaxPort = () => {
    if (minPort > maxPort) {
      setMaxPort(minPort);
      return;
    }
  };

  const hostData = Object.values(hosts);

  const listItem = (item: LocalHost) => (
    <View>
      <Text>
        {item.host} {item.isChecking}
      </Text>
      {item.aliveServices.map(({ name, port }) => (
        <Text key={port}>
          {name} {port}
        </Text>
      ))}
    </View>
  );
  return (
    <View style={styles.container}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.text}>Fast Scan</Text>
        <Switch
          style={styles.switch}
          value={isFastScan}
          onValueChange={onIsFastScan}
        />
      </View>
      <Text style={[styles.text, { fontStyle: 'italic' }]}>
        {isFastScan
          ? 'Search for hosts by checking HTTP availability'
          : 'Slow services search by ports'}
      </Text>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.text}>Use predefined ports</Text>
        <Switch
          style={styles.switch}
          value={isPortsPredefined}
          onValueChange={onIsPortsPredefined}
        />
      </View>
      {!isPortsPredefined && (
        <View>
          <View style={styles.row}>
            <Text style={styles.text}>min port:</Text>
            <TextInput
              editable={!scanning}
              style={styles.portInput}
              keyboardType="number-pad"
              value={minPort.toString()}
              onChangeText={onMinPortChange}
              onBlur={validateMinPort}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.text}>max port:</Text>
            <TextInput
              editable={!scanning}
              style={styles.portInput}
              keyboardType="number-pad"
              value={maxPort.toString()}
              onChangeText={onMaxPortChange}
              onBlur={validateMaxPort}
            />
          </View>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.scanButton}>
          <Button title="Scan" onPress={onScan} disabled={scanning} />
        </View>
        {scanning && <ActivityIndicator size="large" />}
      </View>

      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        Available Devices
      </Text>
      <FlatList
        data={hostData}
        keyExtractor={(item) => item.host}
        renderItem={({ item }) => <HostItem item={item} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    flex: 1,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
  },
  scanButton: {
    width: 100,
    marginVertical: 10,
    marginRight: 20,
  },
  switch: {
    marginVertical: 15,
    marginHorizontal: 10,
  },
  portInput: {
    width: 80,
    backgroundColor: '#d1e0e0',
    borderRadius: 15,
    marginLeft: 20,
    marginVertical: 10,
    textAlign: 'center',
  },
});

export default NetworkScanner;
