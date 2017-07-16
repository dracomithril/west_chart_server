/**
 * Created by Gryzli on 02.04.2017.
 */
const Spotify = require('spotify-web-api-node');
const winston = require('winston');
let request = require("request-promise-native");
const clientId = process.env.client_id;
const clientSecret = process.env.client_secret;
const redirectUri = process.env.redirect_uri || `http://localhost:${process.env.PORT || 3001}/api/callback`;
const scopes = ['user-read-private', 'user-read-email', 'user-follow-read', 'user-library-read', 'playlist-modify-private', 'playlist-modify-public'];
// configure spotify
const spotifyApi = new Spotify({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
});
const cookies_name = {
    access_token: 'wcs_sp_user_ac',
    refresh_token: 'wcs_sp_user_refresh_token',
    stateKey : 'spotify_auth_state'
};
Object.freeze(cookies_name);
winston.debug(redirectUri);

/** Generates a random string containing numbers and letters of N characters */
const generateRandomString = N => (Math.random().toString(36) + new Array(N).join('0')).slice(2, N + 2);



module.exports = function SpotifyHandlers(server) {
    server.get('/api/login', function (req, res) {
        const state = generateRandomString(16);
        res.cookie('spotify_auth_state', state).send(spotifyApi.createAuthorizeURL(scopes, state));
    });

    server.get('/api/callback', function (req, res) {
        const {code, state} = req.query;
        const storedState = req.cookies ? req.cookies[cookies_name.stateKey] : null;
        // first do state validation
        if (state === null || state !== storedState) {
            winston.error('state mismatch');
            res.redirect('/#/error/state mismatch');
            // if the state is valid, get the authorization code and pass it on to the client
        } else {
            res.clearCookie(cookies_name.stateKey);
            // Retrieve an access token and a refresh token
            spotifyApi.authorizationCodeGrant(code).then(data => {
                const {expires_in, access_token, refresh_token} = data.body;
                winston.info('The access token expires in ' + expires_in);

                // Set the access token on the API object to use it in later calls
                spotifyApi.setAccessToken(access_token);
                spotifyApi.setRefreshToken(refresh_token);
                // use the access token to access the Spotify Web API
                spotifyApi.getMe().then(({body}) => {
                    winston.info('spotify user loged: ', body.id);
                });
                res.cookie(cookies_name.access_token, access_token, {
                    maxAge: 3600000
                }).sendFile(__dirname + '/close.html');
            }).catch(err => {
                winston.error(err);
                res.redirect('/#/error/invalid_token');
            });
        }
    });

    server.get('/api/refresh_token', function (req, res) {

        // requesting access token from refresh token
        const refresh_token = req.query.refresh_token;
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))},
            form: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                const access_token = body.access_token;
                res.send({
                    'access_token': access_token
                });
            }
        });
    });
};
