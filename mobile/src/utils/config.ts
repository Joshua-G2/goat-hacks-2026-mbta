import Constants from 'expo-constants';

const ENV = {
  MBTA_API_KEY: Constants.expoConfig?.extra?.MBTA_API_KEY || 'e6d82008f5c44c6c9906ca613361e366',
  MBTA_API_BASE_URL: Constants.expoConfig?.extra?.MBTA_API_BASE_URL || 'https://api-v3.mbta.com',
};

export default ENV;
