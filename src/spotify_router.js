/**
 * Created by Gryzli on 02.04.2017.
 */
const Spotify = require('spotify-web-api-node');
const router = require('express').Router();
const winston = require('winston');
const config = require('./config');
const url = require('url');

const pathname = '/api/spotify/callback';
const redirectUri = url.resolve(config.redirectUrl, pathname);
const scopes = [
  'user-read-private',
  'user-read-email',
  'user-follow-read',
  'user-library-read',
  'playlist-modify-private',
  'playlist-modify-public',
];
// configure spotify
const credentials = {
  clientId: config.spotify.clientId,
  clientSecret: config.spotify.clientSecret,
  redirectUri,
};

const cookies_name = {
  access_token: 'wcs_sp_user_ac',
  refresh_token: 'wcs_sp_user_refresh_token',
  stateKey: 'spotify_auth_state',
};
Object.freeze(cookies_name);
winston.debug(redirectUri);

/** Generates a random string containing numbers and letters of N characters */
const generateRandomString = N =>
  (Math.random().toString(36) + new Array(N).join('0')).slice(2, N + 2);

/**
 * Returns spotify router
 * @returns {*}
 */
module.exports = function SpotifyHandlers() {
  router.get('/config_state', (req, res) => {
    const configState = {
      cliendId: Boolean(config.spotify.clientId),
      cliendSecret: Boolean(config.spotify.clientSecret),
      redirectUriExists: Boolean(config.spotify.redirectUrl),
      redirectUri: config.spotify.redirectUrl,
    };
    res.send(configState);
  });

  router.get('/login_r', (req, res) => {
    const state = generateRandomString(16);
    const spotifyApi = new Spotify(credentials);
    res.cookie(cookies_name.stateKey, state, { path: '/api/spotify/callback' });
    res.redirect(spotifyApi.createAuthorizeURL(scopes, state));
  });

  router.get('/callback', ({ query, cookies, headers }, res) => {
    const { code, state } = query;
    const storedState = cookies ? cookies[cookies_name.stateKey] : null;
    // first do state validation
    if (state === null || state !== storedState) {
      winston.error('state mismatch');
      res.redirect('/#/error/state mismatch');
      // if the state is valid, get the authorization code and pass it on to the client
    } else {
      res.clearCookie(cookies_name.stateKey);
      const spotifyApi = new Spotify(credentials);
      // Retrieve an access token and a refresh token
      spotifyApi
        .authorizationCodeGrant(code)
        .then(response => {
          const { body: { expires_in, access_token, refresh_token } } = response;
          winston.info(`The access token expires in ${expires_in}`);
          const cookieObtainCredentialsPath = '/api/spotify/obtain_credentials';
          res.cookie(cookies_name.access_token, access_token, {
            maxAge: expires_in * 1000,
            path: cookieObtainCredentialsPath,
          });
          res.cookie(cookies_name.refresh_token, refresh_token, {
            maxAge: 3000,
            path: cookieObtainCredentialsPath,
          });
          res.cookie('test_cookie', 'cookies');
          res.end();
        })
        .catch(err => {
          winston.error(err);
          res.redirect('/#/error/invalid_token');
        });
    }
  });
  router.get('/obtain_credentials', ({ cookies, headers }, res) => {
    winston.info('headers:', JSON.stringify(headers, null, 2));
    const atCookie = cookies[cookies_name.access_token];
    const rtCookie = cookies[cookies_name.refresh_token];
    winston.info(`cookies: ${JSON.stringify(cookies)}`);
    if (atCookie || rtCookie) {
      winston.info('credentials found.');
      res.send({
        access_token: atCookie,
        refresh_token: rtCookie,
      });
    } else {
      winston.info('No credentials found');
      res.status(404).send(new Error('No credentials found'));
    }
  });

  router.post('/refresh_token', ({ body: { refresh_token } }, res) => {
    const spotifyApi = new Spotify(credentials);
    spotifyApi.setRefreshToken(refresh_token);
    spotifyApi
      .refreshAccessToken()
      .then(({ body }) => {
        winston.info('The access token has been refreshed!');
        const { access_token, expires_in } = body;
        res.cookie(cookies_name.access_token, access_token, {
          maxAge: expires_in * 1000,
        });
        res.send(access_token);
      })
      .catch(err => {
        winston.error('Could not refresh access token', err);
        res.status(500).send(err);
      });
  });
  return router;
};
