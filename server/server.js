/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
const vision = require('@google-cloud/vision');
var fs = require('fs');
var http = require('http');
var url = require('url');
var async = require('async');

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');

var client_id = "3afbc120cb9645d0a53f1d6ea76fee21";
var client_secret = "c2d7a415d61b492b85bcbbc10b0d7443";
var redirect_uri = 'http://10.51.59.161:8888/callback'; // Your redirect uri


const dict = {
    UNKNOWN: 0,
    VERY_UNLIKELY: 1,
    UNLIKELY: 2,
    POSSIBLE: 3,
    LIKELY: 4,
    VERY_LIKELY: 5
};

// Creates a client
const client = new vision.ImageAnnotatorClient({
    keyFilename: './resources/Google Vision-86efc450a6b2.json'
});

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname ))
   .use(cors())
   .use(cookieParser())
   .use(bodyParser({limit: '50mb'}))
   .use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
      });


app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-top-read playlist-modify-public playlist-modify-private user-modify-playback-state user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/logout', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-top-read playlist-modify-public playlist-modify-private user-modify-playback-state user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog : true
    }));
});


app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        res.redirect('breadbasket://token#' + access_token);
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.post('/getEmotions', function(req, res) {

  const request = {
      image: { content: req.body.image },
      features: [{ type: 'FACE_DETECTION' }]
  };
  client
      .annotateImage(request)
      .then(responses => {
          const faces = responses[0].faceAnnotations;
          var results = [];


          var face = faces[0];
          results.push({ emotion: 'anger', value: dict[face.angerLikelihood] });
          results.push({ emotion: 'joy', value: dict[face.joyLikelihood] });
          results.push({ emotion: 'sorrow', value: dict[face.sorrowLikelihood] });
          results.push({ emotion: 'surprise', value: dict[face.surpriseLikelihood] });

          var finalEmotions = topTwoEmotions(results);

          console.log('sorted results: ' + JSON.stringify(finalEmotions));

          // returned array is [{"emotion":"joy","value":5},{"emotion":"anger","value":1}]
          res.send({first: finalEmotions[0], second: finalEmotions[1]});

      })
      .catch(err => {
          console.error('ERROR:', err);
          return null;
      });





});

function topTwoEmotions(listOfEmotions) {
    listOfEmotions.sort(function(a, b) { return b.value - a.value })
    var topTwo = [listOfEmotions[0], listOfEmotions[1]];
    return topTwo;
}

app.get('/spotifyData/:accessToken/getUserData', function(req, res) {
	function httpGet(url, callback) {
	  const options = {
		url :  url,
		headers : {
				"Authorization" : "Bearer " + req.params.accessToken,
				"Accept" : "application/json"
			},
		json : true
	  };
	  request(options,
		function(err, res, body) {
		  callback(err, body);
		}
	  );
	}

	//these are the urls we gotta hit in no particular order to find the users top artists/tracks
	//for long and short time ranges. and the last one is to get profile data such as your image URL
	const urls= [
	  "https://api.spotify.com/v1/me/top/artists?limit=50&time_range=short_term",
	  "https://api.spotify.com/v1/me"
	];

	async.map(urls, httpGet, function (err, response){
		if (err || response[0].error){
			//console.log(response[0].error);
			return res.status(404).send("OMG NO :(");
		}
		var shortTermArtistIDs = [];
		var shortTermArtists = response[0];

		for(var i = 0; i < shortTermArtists.items.length; i++){
			shortTermArtistIDs.push(shortTermArtists.items[i].id);
		}

		const recommendationUrls= [
		    "https://api.spotify.com/v1/recommendations?seed_artists="
				+ shortTermArtistIDs[Math.floor(Math.random() * shortTermArtistIDs.length)] + ","
				+ shortTermArtistIDs[Math.floor(Math.random() * shortTermArtistIDs.length)] + ","
        + shortTermArtistIDs[Math.floor(Math.random() * shortTermArtistIDs.length)] + ","
        + shortTermArtistIDs[Math.floor(Math.random() * shortTermArtistIDs.length)] //+ ","
			//	+ "&max_popularity=55" + "&min_popularity=35" + "&limit=40"
		];



		async.map(recommendationUrls, httpGet, function (err, recommendationsResponse){
			if (err || recommendationsResponse[0].error){
				console.log("we dun goofed: " + err);
			}

      var responseToTheFrontEnd = {
  						'displayName':response[1].display_name,
  						'userID':response[1].id,
  						'imageURL':response[1].images[0].url,
  						'shortTermArtists':shortTermArtists,
  						'recommendedTracks':recommendationsResponse[0].tracks
  					};

			res.send(responseToTheFrontEnd);

		});

	});

});

app.get('/getMoreRecommendations/:accessToken/:emotion1/:emotion2', function(req, res) {
  function httpGet(url, callback) {
	  const options = {
		url :  url,
		headers : {
				"Authorization" : "Bearer " + req.params.accessToken,
				"Accept" : "application/json"
			},
		json : true
	  };
	  request(options,
		function(err, res, body) {
		  callback(err, body);
		}
	  );
	}

  const urls= [
	  "https://api.spotify.com/v1/me/top/artists?limit=50&time_range=short_term"
	];

	async.map(urls, httpGet, function (err, response){
		if (err || response[0].error){
			//console.log(response[0].error);
			return res.status(404).send("OMG NO :(");
		}
		var shortTermArtistIDs = [];
		var shortTermArtists = response[0];

		for(var i = 0; i < shortTermArtists.items.length; i++){
			shortTermArtistIDs.push(shortTermArtists.items[i].id);
		}

    let valenceValue = 1;
    let danceabilityValue = 1;

    switch(req.params.emotion1){
      case "joy":
        valenceValue = 99;
        danceabilityValue = 99;
        break;
    }

		const recommendationUrls= [
		    "https://api.spotify.com/v1/recommendations?seed_artists="
				+ shortTermArtistIDs[Math.floor(Math.random() * shortTermArtistIDs.length)] + ","
				+ shortTermArtistIDs[Math.floor(Math.random() * shortTermArtistIDs.length)] + ","
				+ "&target_valence=" + valenceValue + "&target_danceability=" + danceabilityValue + "&limit=15"
		];

		async.map(recommendationUrls, httpGet, function (err, recommendationsResponse){
			if (err || recommendationsResponse[0].error){
				console.log("we dun goofed: " + err);
			}

			res.send(recommendationsResponse[0].tracks);

		});

	});

});



console.log('Listening on 8888');
app.listen(8888, '0.0.0.0');
