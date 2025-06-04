import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import LocalHost from '../interfaces/local_host';

export interface HostItemProps {
  item: LocalHost;
}

export const HostItem = ({
  item: { host, aliveServices, isChecking, osInfo },
}: HostItemProps) => {
  const [collapsed, tougleCollapsed] = useState(true);
  const opPress = useCallback(() => {
    tougleCollapsed(!collapsed);
  }, [collapsed]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={opPress}>
        <View style={[styles.row, styles.headerBox]}>
          <Text style={[styles.text, styles.bold]}>
            {collapsed ? '+' : '-'} {host}
          </Text>
          {isChecking && <ActivityIndicator size="small" />}
        </View>
        {!collapsed && (
          <View style={styles.infoBox}>
            <Text style={[styles.text, styles.bold]}>OS Details</Text>
            {!!osInfo ? (
              <Text>
                os: {osInfo.os}, version: {osInfo.version}
              </Text>
            ) : (
              <Text>Not defined</Text>
            )}

            <Text style={[styles.text, styles.bold]}>Alive Services</Text>
            {aliveServices.map(({ name, port }) => (
              <Text key={port} style={styles.text}>
                {name} - Port: {port}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e0ebeb',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
  },
  text: {
    fontSize: 16,
  },
  bold: {
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBox: {
    // paddingVertical: 15,
  },
  infoBox: {
    backgroundColor: '#f0f5f5',
    borderRadius: 15,
    marginTop: 20,
    padding: 15,
  },
});
