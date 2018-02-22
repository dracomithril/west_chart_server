const isProduction = process.env.NODE_ENV === 'production';
const skipHttpRedirect = process.env.SKIP_HTTPS_REDIRECT;
const port = process.env.PORT || 3001;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirecturi = process.env.REDIRECT_URI;
const config = {
  isProduction,
  skipHttpRedirect,
  port,
  spotify: {
    clientId,
    clientSecret,
    get redirectUrl() {
      return isProduction ? redirecturi : `http://localhost:${port}`;
    },
  },
};

module.exports = config;
