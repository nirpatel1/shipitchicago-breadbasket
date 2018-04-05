import { Component, NgZone } from '@angular/core';
import { HttpModule } from '@angular/http';
import { Platform, NavController, NavParams } from 'ionic-angular';
import { HTTP } from '@ionic-native/http';
import { SafariViewController } from '@ionic-native/safari-view-controller';
import { Camera, CameraOptions } from '@ionic-native/camera';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  token: string = '';
  displayName: string = '';
  userID: string = '';
  imageURL: string = '';
  shortTermArtists: any[];
  recommendedTracks: any[];
  emotion1: string = "";
  emotion2: string = "";
  picture: any;
  pictureOpts: any;

  constructor(public navCtrl: NavController,
              public platform: Platform,
              private http: HTTP,
              private ngHttp: HttpModule,
              private safariViewController: SafariViewController,
              private ngZone: NgZone,
              public navParams: NavParams,
              public camera: Camera) {

      let responseData = this.navParams.get('responseData');
      this.token = this.navParams.get('token');
      this.displayName = responseData.displayName.split(" ")[0];
      this.imageURL = responseData.imageURL;
      this.userID = responseData.userID;
      this.shortTermArtists = responseData.shortTermArtists;
      //this.recommendedTracks = responseData.recommendedTracks;


      this.platform.ready().then(() => {
          this.takePicture();

        });

  }

  takePicture() {
    const options: CameraOptions = {
      quality: 10,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true
    }

    this.camera.getPicture(options).then((imageData) => {
        let body = { 'image': imageData};
    this.http.setDataSerializer('json');
     this.http.post('http://10.51.59.161:8888/getEmotions', body, {'Content-Type': "application/json"} )
       .then(data => {
         let emotionResponse = JSON.parse(data.data);
         this.emotion1 = emotionResponse.first.emotion;
         this.emotion2 = emotionResponse.second.emotion;
         this.getMoreRecommendations();
        })
       .catch(error => {
         console.log("Error: " + error.error); // error message as string
       });
    }, (err) => {
     // Handle error
     console.log('fail',err);
    });


  }

  logout(){
    this.platform.ready().then(() => {
        this.safariViewController.isAvailable()
          .then((available: boolean) => {
              if (available) {
                this.safariViewController.show({
                  url: 'http://10.51.59.161:8888/logout',
                  hidden: false,
                  animated: false,
                  transition: 'curl',
                  enterReaderModeIfAvailable: true,
                  tintColor: '#ff0000'
                })
                .subscribe((result: any) => {
                    if(result.event === 'opened') console.log('Opened');
                  },
                  (error: any) => console.error(error)
                );

              } else { // use fallback browser, example InAppBrowser
              }
            }
          );
      });
  }



  makeAPlaylistOuttaTheseSongs(){

    var uri_array = [];
    for(var i = 0; i < this.recommendedTracks.length; i++){
      uri_array.push(this.recommendedTracks[i].uri);
    }

    this.http.setDataSerializer('json');
    this.http.post('https://api.spotify.com/v1/users/' + this.userID + '/playlists',
    {
        'name': "Inte//igo"
    },
    {
        "Authorization" : "Bearer " + this.token,
        "Accept" : "application/json"
    })
      .then(data => {
        let playlistID = JSON.parse(data.data).id;

        this.http.post('https://api.spotify.com/v1/users/' + this.userID + '/playlists/' + playlistID + '/tracks',
        {
            'uris': uri_array
        },
        {
            "Authorization" : "Bearer " + this.token,
            "Accept" : "application/json"
        })
          .then(data => {
            console.log(data.data);

            //open the playlist
            console.log(playlistID);
            this.openSpotifyUrl('https://open.spotify.com/user/'+this.userID+'/playlist/'+playlistID);


          })
          .catch(error => {
            console.log("error " + error.error); // error message as string
          });


      })
      .catch(error => {
        console.log("error " + error.error); // error message as string
      });


  }

  getMoreRecommendations(){
    this.http.get('http://10.51.59.161:8888/getMoreRecommendations/' + this.token + "/" + this.emotion1 + "/" + this.emotion2, {}, {})
      .then(data => {
        let responseData = JSON.parse(data.data);
        this.recommendedTracks = responseData;
      })
      .catch(error => {
        console.log(error.error); // error message as string
      });
  }

  openSpotifyUrl(spotifyUrl: string){
    this.platform.ready().then(() => {
        this.safariViewController.isAvailable()
          .then((available: boolean) => {
              if (available) {
                this.safariViewController.show({
                  url: spotifyUrl,
                  hidden: true,
                  transition: 'curl'
                })
                .subscribe((result: any) => { },
                  (error: any) => console.error(error)
                );
              } else { }
            }
          );
      });
  }


  handleOpenUrl(url: string) {
    if (url.startsWith('breadbasket://token#')) {
      //this.safariViewController.hide();
      this.token = url.split('breadbasket://token#')[1];

      this.http.get('http://10.51.59.161:8888/spotifyData/' + this.token + '/getUserData', {}, {})
        .then(data => {
          let responseData = JSON.parse(data.data);
          this.navCtrl.setRoot(HomePage, {
              'responseData': responseData,
              'token' : this.token
          });

        })
        .catch(error => {
          console.log("Error" + error.error); // error message as string
        });
    }
  }



}
