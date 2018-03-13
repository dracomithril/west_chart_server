const url = require('url');

const isProduction = process.env.NODE_ENV === 'production';
const skipHttpRedirect = process.env.SKIP_HTTPS_REDIRECT;
const port = process.env.PORT || 3001;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const appUrl = process.env.REDIRECT_URI;
const client = process.env.WEB_CLIENT_NAME || 'wcs-web32';
const redirectPath = '/api/spotify/callback';
// TODO validate if all env provided
const config = {
  isProduction,
  skipHttpRedirect,
  port,
  hostname: appUrl,
  get redirectCallbackUrl() {
    return url.resolve(`${isProduction ? appUrl : `http://localhost:${port}`}`, redirectPath);
  },
  get redirectLoginUrl() {
    return url.resolve(
      `${isProduction ? `https://${client}.herokuapp.com` : ``}`,
      '/login/getCredentials',
    );
  },
  spotify: {
    clientId,
    clientSecret,
  },
  client,
};

module.exports = config;
