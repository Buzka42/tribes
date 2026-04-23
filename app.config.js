// Dynamic config — reads secrets from environment at build time (EAS Build / local)
const base = require('./app.json');

module.exports = () => ({
  ...base.expo,
  plugins: [
    [
      '@rnmapbox/maps',
      {
        // EAS secret MAPBOX_DOWNLOADS_TOKEN is injected as an env var during build.
        // Locally: set it in your shell or a .env.local file (git-ignored).
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN || '',
      },
    ],
    '@react-native-community/datetimepicker',
  ],
});
