/**
 * Created by Gryzli on 02.04.2017.
 */

//const querystring= require('querystring');
let Promise = require("bluebird");
const Spotify = require('spotify-web-api-node');
let request = Promise.promisifyAll(require("request"));
const clientId = process.env.client_id;
const clientSecret = process.env.client_secret;

const redirectUri = process.env.redirect_uri || `http://localhost:${process.env.PORT||3001}/api/callback`;
const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-private', 'playlist-modify-public'];
// configure spotify
const spotifyApi = new Spotify({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
});
console.log(redirectUri);

/** Generates a random string containing numbers and letters of N characters */
const generateRandomString = N => (Math.random().toString(36) + Array(N).join('0')).slice(2, N + 2);

const stateKey = 'spotify_auth_state';


module.exports = function SpotifyHandlers(server) {
    server.get('/api/login', function (req, res) {
        const state = generateRandomString(16);
        res.cookie(stateKey, state);
        res.redirect(spotifyApi.createAuthorizeURL(scopes, state));
    });

    server.get('/api/callback', function (req, res) {
        const {code, state} = req.query;
        const storedState = req.cookies ? req.cookies[stateKey] : null;
        // first do state validation
        if (state === null || state !== storedState) {
            console.error('state mismatch')
            //res.redirect('/#/error/state mismatch');
            // if the state is valid, get the authorization code and pass it on to the client
        } else {
            res.clearCookie(stateKey);
            // Retrieve an access token and a refresh token
            spotifyApi.authorizationCodeGrant(code).then(data => {
                const {expires_in, access_token, refresh_token} = data.body;
                console.log('The access token expires in ' + expires_in);

                // Set the access token on the API object to use it in later calls
                spotifyApi.setAccessToken(access_token);
                spotifyApi.setRefreshToken(refresh_token);
                // use the access token to access the Spotify Web API
                spotifyApi.getMe().then(({body}) => {
                    console.log('spotify user loged: ',body.id);
                });
                // we can also pass the token to the browser to make requests from there

                res.redirect(`http://localhost:3000/#/user/${access_token}/${refresh_token}`);
            }).catch(err => {
                console.log(err);
                 res.redirect('/#/error/invalid token');
            });
        }
    });

    server.get('/refresh_token', function (req, res) {

        // requesting access token from refresh token
        var refresh_token = req.query.refresh_token;
        var authOptions = {
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
                var access_token = body.access_token;
                res.send({
                    'access_token': access_token
                });
            }
        });
    });
}
