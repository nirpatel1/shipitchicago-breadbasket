import { Component, NgZone } from '@angular/core';
import { Platform, NavController } from 'ionic-angular';
import { HTTP } from '@ionic-native/http';
import { SafariViewController } from '@ionic-native/safari-view-controller';

import { HomePage } from '../home/home';

/**
 * Generated class for the LoginPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  token: string = "";

  constructor(public navCtrl: NavController,
              public platform: Platform,
              private safariViewController: SafariViewController,
              private ngZone: NgZone,
              private http: HTTP) {

        (window as any).handleOpenURL = (url: string) => {
           setTimeout(() => {
             this.ngZone.run(() => {
                this.handleOpenUrl(url);
             });
           }, 0);
         };

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

  login(){

          this.platform.ready().then(() => {
              this.safariViewController.isAvailable()
                .then((available: boolean) => {
                    if (available) {
                      this.safariViewController.show({
                        url: 'http://10.51.59.161:8888/login',
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

}
