const config = {
  isProduction: process.env.NODE_ENV === 'production',
  skipHttpRedirect: process.env.SKIP_HTTPS_REDIRECT,
  port: process.env.PORT || 3001,
  spotify: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUrl: this.isProduction ? process.env.REDIRECT_URI : `http://localhost:${this.port}`,
  },
};

module.exports = config;
