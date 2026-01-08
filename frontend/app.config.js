export default ({ config }) => {
    return {
        ...config,
        android: {
            ...config.android,
            config: {
                ...config.android?.config,
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY,
                },
            },
        },
        build:{
            env:{
                EXPO_PUBLIC_USER_POOL_ID: process.env.EXPO_PUBLIC_USER_POOL_ID,
                EXPO_PUBLIC_USER_POOL_CLIENT_ID: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID,
                EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
            }
        }
    };
};
